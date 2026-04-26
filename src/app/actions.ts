'use server';

import type { ActionState, CatastroData } from '@/lib/types';
import { getIneCode, getClimaticZone } from '@/lib/provinces';

const CATASTRO_COORDS_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC';
const CATASTRO_DATA_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC';
const CATASTRO_RC_BY_COORDS_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR';
const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation';
const CARTOCIUDAD_API_URL = 'https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode';

const parseXmlTag = (xml: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
  const match = xml.match(regex);
  if (match && match[1]) {
      return match[1].trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return null;
};

const getErrorDescription = (xml: string): string => {
    const errorMatch = xml.match(/<des>(.*?)<\/des>/);
    return errorMatch ? errorMatch[1] : "Error desconocido al procesar la respuesta del Catastro.";
};

async function getFullData(displayRef: string, latitude: number, longitude: number): Promise<CatastroData | string> {
    const fetchOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        }
    };

    // 1. Obtener datos de la referencia madre (municipio, provincia, etc.)
    const motherDataUrl = `${CATASTRO_DATA_URL}?Provincia=&Municipio=&RC=${displayRef.substring(0, 14)}`;
    const [motherDataRes, elevationRes, ignRes] = await Promise.all([
        fetch(motherDataUrl, fetchOptions),
        fetch(`${ELEVATION_API_URL}?latitude=${latitude}&longitude=${longitude}`),
        fetch(`${CARTOCIUDAD_API_URL}?lon=${longitude}&lat=${latitude}`)
    ]);

    if (!motherDataRes.ok) return "No se pudo contactar con el Catastro.";
    const motherDataXml = await motherDataRes.text();
    
    // Datos base de la madre
    let address = parseXmlTag(motherDataXml, 'ldt');
    let constructionYear = parseXmlTag(motherDataXml, 'ant');
    const municipality = parseXmlTag(motherDataXml, 'nm');
    const province = parseXmlTag(motherDataXml, 'np');
    const postalCode = parseXmlTag(motherDataXml, 'dp');
    const provinceCode = parseXmlTag(motherDataXml, 'cp');
    const municipalityCode = parseXmlTag(motherDataXml, 'cm');

    // 2. BUSQUEDA INTERNA DE HIJA (20 caracteres) para Dirección y Año precisos
    const rcCoordsUrl = `${CATASTRO_RC_BY_COORDS_URL}?SRS=EPSG:4326&Coordenada_X=${longitude}&Coordenada_Y=${latitude}`;
    const rcCoordsRes = await fetch(rcCoordsUrl, fetchOptions);
    if (rcCoordsRes.ok) {
        const rcCoordsXml = await rcCoordsRes.text();
        const pc1 = parseXmlTag(rcCoordsXml, 'pc1');
        const pc2 = parseXmlTag(rcCoordsXml, 'pc2');
        if (pc1 && pc2) {
            const childRef = pc1 + pc2;
            const childDataUrl = `${CATASTRO_DATA_URL}?Provincia=&Municipio=&RC=${childRef}`;
            const childDataRes = await fetch(childDataUrl, fetchOptions);
            if (childDataRes.ok) {
                const childXml = await childDataRes.text();
                // Preferimos los datos de la hija para dirección y año
                const childAddress = parseXmlTag(childXml, 'ldt');
                const childYear = parseXmlTag(childXml, 'ant');
                if (childAddress) address = childAddress;
                if (childYear) constructionYear = childYear;
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

    return {
        ref: displayRef.substring(0, 14), // Siempre mostramos la de 14 como principal
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

        if (coordsXml.includes('<err>')) return { data: null, error: getErrorDescription(coordsXml) };

        const lat = parseFloat(parseXmlTag(coordsXml, 'ycen') || '0');
        const lng = parseFloat(parseXmlTag(coordsXml, 'xcen') || '0');

        if (!lat || !lng) return { data: null, error: "No se pudieron obtener coordenadas para esta referencia." };

        const result = await getFullData(motherRef, lat, lng);
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
        
        const pc1 = parseXmlTag(xml, 'pc1');
        const pc2 = parseXmlTag(xml, 'pc2');
        
        if (!pc1 || !pc2) return { data: null, error: "No se encontró una referencia catastral en este punto." };
        
        const motherRef = (pc1 + pc2).substring(0, 14);
        const result = await getFullData(motherRef, lat, lng);
        if (typeof result === 'string') return { data: null, error: result };
        return { data: result, error: null };
    } catch (e) {
        return { data: null, error: "Error al consultar las coordenadas en el Catastro." };
    }
}
