'use server';

import type { ActionState, CatastroData, IEEData, CEEData, CEEItem } from '@/lib/types';
import { getIneCode, getClimaticZone, getAlternativeClimaticZone } from '@/lib/provinces';

const CATASTRO_COORDS_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC';
const CATASTRO_DATA_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC';
const CATASTRO_RC_BY_COORDS_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR';
const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation';
const CARTOCIUDAD_API_URL = 'https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode';

// GVA WFS Services
const GVA_IEE_WFS = 'https://terramapas.icv.gva.es/0801_GESIEE';
const GVA_CEE_WFS = 'https://terramapas.icv.gva.es/26_GCEE';

const parseXmlValue = (xml: string, tag: string): string | null => {
  const regex = new RegExp(`<([^/>]*?:)?${tag}[^>]*>([\\s\\S]*?)<\\/([^>]*?:)?${tag}>`, 'i');
  const match = xml.match(regex);
  if (match && match[2]) {
    return match[2].trim()
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  }
  return null;
};

async function consultarIEE_GVA(rc14: string): Promise<IEEData | null> {
  try {
    const filter = `<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:PropertyIsLike wildCard="*" singleChar="?" escapeChar="!"><ogc:PropertyName>inf_refcatastral</ogc:PropertyName><ogc:Literal>${rc14}*</ogc:Literal></ogc:PropertyIsLike></ogc:Filter>`;
    const params = new URLSearchParams({
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typeName: "ms:GESIEE.Informes",
      maxFeatures: "1",
      FILTER: filter
    });
    
    const response = await fetch(`${GVA_IEE_WFS}?${params.toString()}`);
    if (!response.ok) return null;
    const xml = await response.text();
    
    if (!xml.includes('featureMember')) return { found: false };

    return {
      found: true,
      numiee: parseXmlValue(xml, 'inf_numieevcv') || undefined,
      urlgesie: parseXmlValue(xml, 'urlgesie') || undefined,
      evaluado: parseXmlValue(xml, 'evaluado') || undefined,
      caducidad: parseXmlValue(xml, 'fecha_caducidad')?.replace(" AD", "") || undefined,
      count_intu: parseInt(parseXmlValue(xml, 'count_intu') || '0'),
      count_intm: parseInt(parseXmlValue(xml, 'count_intm') || '0'),
      emisiones: parseXmlValue(xml, 'emisionesletra') || undefined,
      consumo: parseXmlValue(xml, 'consumoletra') || undefined,
    };
  } catch (e) {
    return null;
  }
}

async function consultarCEE_GVA(rc14: string, rc20: string): Promise<CEEData | null> {
  try {
    const filter = `<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:PropertyIsLike wildCard="*" singleChar="?" escapeChar="!"><ogc:PropertyName>ref_referencia</ogc:PropertyName><ogc:Literal>${rc14}*</ogc:Literal></ogc:PropertyIsLike></ogc:Filter>`;
    const params = new URLSearchParams({
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typeName: "CEEEdificios",
      maxFeatures: "50",
      FILTER: filter
    });

    const response = await fetch(`${GVA_CEE_WFS}?${params.toString()}`);
    if (!response.ok) return null;
    const xml = await response.text();
    
    const featureRegex = /<[^>]*?featureMember[^>]*>([\s\S]*?)<\/[^>]*?featureMember>/gi;
    const members = xml.match(featureRegex) || [];
    
    if (members.length === 0) return { found: false, others: [], total: 0 };

    const items: CEEItem[] = members.map(m => ({
      ref: parseXmlValue(m, 'ref_referencia') || '',
      emicalif: parseXmlValue(m, 'cer_emicalificacion') || '',
      emitotal: parseXmlValue(m, 'cer_emitotal') || undefined,
      concalif: parseXmlValue(m, 'cer_concalificacion') || '',
      contotal: parseXmlValue(m, 'cer_contotal') || undefined,
      validohasta: parseXmlValue(m, 'validohasta') || undefined,
      direccion: parseXmlValue(m, 'exp_direccion') || undefined,
      url: parseXmlValue(m, 'url_castellano') || undefined,
    }));

    const exactMatch = items.find(i => i.ref === rc20);
    const others = items.filter(i => i.ref !== rc20);

    return {
      found: true,
      exactMatch,
      others,
      total: items.length
    };
  } catch (e) {
    return null;
  }
}

const getCEERegistry = (province: string | null): CatastroData['ceeRegistry'] => {
  if (!province) return null;
  const p = province.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const registries: Record<string, CatastroData['ceeRegistry']> = {
    'VALENCIA': {
      name: 'IVACE Energía (C. Valenciana)',
      url: 'https://cee.ivace.es/cee/publico/consultar-certificados.jsf',
      visorUrl: 'https://visor.gva.es/visor/?capasids=26_GCEE;&nodoDesplegado=26_GCEE',
      description: 'Consulta pública de certificados energéticos de la Comunidad Valenciana.'
    },
    'ALICANTE': {
      name: 'IVACE Energía (C. Valenciana)',
      url: 'https://cee.ivace.es/cee/publico/consultar-certificados.jsf',
      visorUrl: 'https://visor.gva.es/visor/?capasids=26_GCEE;&nodoDesplegado=26_GCEE',
      description: 'Consulta pública de certificados energéticos de la Comunidad Valenciana.'
    },
    'CASTELLON': {
      name: 'IVACE Energía (C. Valenciana)',
      url: 'https://cee.ivace.es/cee/publico/consultar-certificados.jsf',
      visorUrl: 'https://visor.gva.es/visor/?capasids=26_GCEE;&nodoDesplegado=26_GCEE',
      description: 'Consulta pública de certificados energéticos de la Comunidad Valenciana.'
    }
  };

  for (const key in registries) {
    if (p.includes(key)) return registries[key];
  }

  return {
    name: 'Registro Regional CEE',
    url: 'https://www.codigotecnico.org/RegistroCTE/RegistrosCCAA.html',
    description: 'Accede al listado oficial de registros por Comunidad Autónoma.'
  };
};

async function getFullData(displayRef: string, latitude: number, longitude: number): Promise<CatastroData | string> {
    const fetchOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        }
    };

    const motherRef = displayRef.substring(0, 14);
    const motherDataUrl = `${CATASTRO_DATA_URL}?Provincia=&Municipio=&RC=${motherRef}`;
    const [motherDataRes, elevationRes, ignRes] = await Promise.all([
        fetch(motherDataUrl, fetchOptions),
        fetch(`${ELEVATION_API_URL}?latitude=${latitude}&longitude=${longitude}`),
        fetch(`${CARTOCIUDAD_API_URL}?lon=${longitude}&lat=${latitude}`)
    ]);

    if (!motherDataRes.ok) return "No se pudo contactar con el Catastro.";
    const motherDataXml = await motherDataRes.text();
    
    let address = parseXmlValue(motherDataXml, 'ldt');
    let constructionYear = parseXmlValue(motherDataXml, 'ant');
    const municipality = parseXmlValue(motherDataXml, 'nm');
    const province = parseXmlValue(motherDataXml, 'np');
    const postalCode = parseXmlValue(motherDataXml, 'dp');
    const provinceCode = parseXmlValue(motherDataXml, 'cp');
    const municipalityCode = parseXmlValue(motherDataXml, 'cm');

    let finalRef = displayRef;

    const rcCoordsUrl = `${CATASTRO_RC_BY_COORDS_URL}?SRS=EPSG:4326&Coordenada_X=${longitude}&Coordenada_Y=${latitude}`;
    const rcCoordsRes = await fetch(rcCoordsUrl, fetchOptions);
    if (rcCoordsRes.ok) {
        const rcCoordsXml = await rcCoordsRes.text();
        const pc1 = parseXmlValue(rcCoordsXml, 'pc1');
        const pc2 = parseXmlValue(rcCoordsXml, 'pc2');
        
        if (pc1 && pc2) {
            const childRef14 = pc1 + pc2;
            const childDataUrl = `${CATASTRO_DATA_URL}?Provincia=&Municipio=&RC=${childRef14}`;
            const childDataRes = await fetch(childDataUrl, fetchOptions);
            if (childDataRes.ok) {
                const childXml = await childDataRes.text();
                const firstRcMatch = childXml.match(/<rc>(.*?)<\/rc>/s);
                if (firstRcMatch) {
                    const firstPc1 = parseXmlValue(firstRcMatch[0], 'pc1');
                    const firstPc2 = parseXmlValue(firstRcMatch[0], 'pc2');
                    const firstCar = parseXmlValue(firstRcMatch[0], 'car');
                    const firstCc1 = parseXmlValue(firstRcMatch[0], 'cc1');
                    const firstCc2 = parseXmlValue(firstRcMatch[0], 'cc2');
                    
                    if (firstPc1 && firstPc2 && firstCar && firstCc1 && firstCc2) {
                        const candidateRef = firstPc1 + firstPc2 + firstCar + firstCc1 + firstCc2;
                        if (finalRef.length < 20) finalRef = candidateRef;
                        
                        const specificDataUrl = `${CATASTRO_DATA_URL}?Provincia=&Municipio=&RC=${finalRef}`;
                        const specificRes = await fetch(specificDataUrl, fetchOptions);
                        if (specificRes.ok) {
                            const specificXml = await specificRes.text();
                            address = parseXmlValue(specificXml, 'ldt') || address;
                            constructionYear = parseXmlValue(specificXml, 'ant') || constructionYear;
                        }
                    }
                }
            }
        }
    }

    const elevationData = elevationRes.ok ? await elevationRes.json() : { elevation: [0] };
    const altitude = elevationData.elevation?.[0] ?? 0;

    let ignAddress = null;
    if (ignRes.ok) {
        const ignData = await ignRes.json();
        const parts = [];
        if (ignData.tip_via && ignData.address) parts.push(`${ignData.tip_via} ${ignData.address}`);
        else if (ignData.address) parts.push(ignData.address);
        if (ignData.portalNumber) parts.push(ignData.portalNumber);
        if (ignData.muni) parts.push(ignData.muni);
        if (ignData.province) parts.push(ignData.province);
        ignAddress = parts.join(', ');
    }

    const provinceIneCode = province ? getIneCode(province) : null;
    const municipalityIneCode = provinceCode && municipalityCode ? `${provinceCode}${municipalityCode}` : null;
    const climaticZoneInfo = province ? getClimaticZone(province, altitude) : null;
    const alternativeZoneInfo = getAlternativeClimaticZone(municipalityIneCode);

    let ieeGva = null;
    let ceeGva = null;
    const isCV = province && ['ALICANTE', 'ALACANT', 'CASTELLON', 'CASTELLO', 'VALENCIA', 'VALÈNCIA'].some(v => province.toUpperCase().includes(v));
    
    if (isCV) {
      const [ieeRes, ceeRes] = await Promise.all([
        consultarIEE_GVA(motherRef),
        consultarCEE_GVA(motherRef, finalRef)
      ]);
      ieeGva = ieeRes;
      ceeGva = ceeRes;
    }

    return {
        ref: finalRef, 
        address: address || 'No disponible',
        municipality,
        province,
        postalCode,
        constructionYear: constructionYear || 'No disponible',
        ineCode: provinceIneCode,
        municipalityIneCode,
        latitude,
        longitude,
        altitude,
        ignAddress,
        climaticZone: climaticZoneInfo?.zone,
        climaticZoneRule: climaticZoneInfo?.rule,
        alternativeClimaticZone: alternativeZoneInfo?.zone,
        alternativeClimaticZoneMunicipality: alternativeZoneInfo?.municipality,
        alternativeClimaticZoneReference: alternativeZoneInfo?.reference,
        ceeRegistry: getCEERegistry(province),
        ieeGva,
        ceeGva
    };
}

export async function searchCatastro(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const ref = formData.get('ref')?.toString().trim().toUpperCase() || '';
    if (ref.length < 14) return { data: null, error: "La referencia debe tener al menos 14 caracteres." };

    try {
        const motherRef = ref.substring(0, 14);
        const coordsUrl = `${CATASTRO_COORDS_URL}?Provincia=&Municipio=&SRS=EPSG:4326&RC=${motherRef}`;
        const coordsResponse = await fetch(coordsUrl);
        const coordsXml = await coordsResponse.text();

        if (coordsXml.includes('<err>')) {
           const errorMatch = coordsXml.match(/<des>(.*?)<\/des>/);
           return { data: null, error: errorMatch ? errorMatch[1] : "Referencia no encontrada." };
        }

        const lat = parseFloat(parseXmlValue(coordsXml, 'ycen') || '0');
        const lng = parseFloat(parseXmlValue(coordsXml, 'xcen') || '0');

        if (!lat || !lng) return { data: null, error: "No se pudieron obtener coordenadas para esta referencia." };

        const result = await getFullData(ref, lat, lng);
        if (typeof result === 'string') return { data: null, error: result };
        return { data: result, error: null };
    } catch (e) {
        return { data: null, error: "Error de conexión con los servicios del Catastro." };
    }
}

export async function searchByCoords(lat: number, lng: number): Promise<ActionState> {
    try {
        const url = `${CATASTRO_RC_BY_COORDS_URL}?SRS=EPSG:4326&Coordenada_X=${lng}&Coordenada_Y=${lat}`;
        const response = await fetch(url);
        const xml = await response.text();
        
        const pc1 = parseXmlValue(xml, 'pc1');
        const pc2 = parseXmlValue(xml, 'pc2');
        
        if (!pc1 || !pc2) return { data: null, error: "No se encontró una referencia catastral en este punto." };
        
        const motherRef = (pc1 + pc2).substring(0, 14);
        const result = await getFullData(motherRef, lat, lng);
        if (typeof result === 'string') return { data: null, error: result };
        return { data: result, error: null };
    } catch (e) {
        return { data: null, error: "Error al consultar las coordenadas en el Catastro." };
    }
}
