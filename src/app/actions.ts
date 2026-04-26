'use server';

import { z } from 'zod';
import type { ActionState, CatastroData } from '@/lib/types';
import { getIneCode, getClimaticZone } from '@/lib/provinces';

const FormSchema = z.object({
  ref: z.string({invalid_type_error: "La referencia catastral debe ser un texto."})
    .trim()
    .min(14, "La referencia catastral es demasiado corta.")
    .max(20, "La referencia catastral es demasiado larga.")
    .regex(/^[A-Z0-9]+$/, "La referencia catastral solo puede contener letras mayúsculas y números."),
});

const CATASTRO_COORDS_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC';
const CATASTRO_DATA_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC';
const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation';

const parseXmlTag = (xml: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
  const match = xml.match(regex);
  if (match && match[1]) {
      return match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return null;
};

const getErrorDescription = (xml: string): string => {
    const errorMatch = xml.match(/<des>(.*?)<\/des>/);
    return errorMatch ? errorMatch[1] : "Error desconocido al procesar la respuesta del Catastro.";
};

export async function searchCatastro(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = FormSchema.safeParse({ ref: formData.get('ref') });

  if (!validatedFields.success) {
    return { data: null, error: validatedFields.error.flatten().fieldErrors.ref?.join(', ') ?? 'Entrada inválida.' };
  }

  const ref = validatedFields.data.ref;

  try {
    const fetchOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        }
    };
    
    const coordsUrl = `${CATASTRO_COORDS_URL}?Provincia=&Municipio=&SRS=EPSG:4326&RC=${ref.substring(0, 14)}`;
    const dataUrl = `${CATASTRO_DATA_URL}?Provincia=&Municipio=&RC=${ref}`;

    const [coordsResponse, dataResponse] = await Promise.all([
      fetch(coordsUrl, fetchOptions),
      fetch(dataUrl, fetchOptions)
    ]);

    if (!coordsResponse.ok || !dataResponse.ok) {
      console.error('Catastro service response not OK', { 
          coordsStatus: coordsResponse.status, 
          dataStatus: dataResponse.status 
      });
      return { data: null, error: "No se pudo contactar con los servicios del Catastro. Inténtelo más tarde." };
    }

    const [coordsXml, dataXml] = await Promise.all([
        coordsResponse.text(),
        dataResponse.text(),
    ]);
    
    if (coordsXml.includes('<err>')) {
        const errorMessage = getErrorDescription(coordsXml);
        return { data: null, error: `Error del Catastro (coordenadas): ${errorMessage}` };
    }
    if (dataXml.includes('<err>')) {
        const errorMessage = getErrorDescription(dataXml);
        return { data: null, error: `Error del Catastro (dirección): ${errorMessage}` };
    }

    const longitudeStr = parseXmlTag(coordsXml, 'xcen');
    const latitudeStr = parseXmlTag(coordsXml, 'ycen');
    
    const address = parseXmlTag(dataXml, 'ldt');
    const municipality = parseXmlTag(dataXml, 'nm');
    const province = parseXmlTag(dataXml, 'np');
    const postalCode = parseXmlTag(dataXml, 'dp');
    const constructionYear = parseXmlTag(dataXml, 'ant');
    const provinceCode = parseXmlTag(dataXml, 'cp');
    const municipalityCode = parseXmlTag(dataXml, 'cm');

    if (!address || !longitudeStr || !latitudeStr) {
      return { data: null, error: "No se encontraron datos completos para la referencia catastral proporcionada." };
    }
    
    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);

    if (isNaN(latitude) || isNaN(longitude)) {
        return { data: null, error: "Las coordenadas recibidas del Catastro no son válidas." };
    }

    const elevationResponse = await fetch(`${ELEVATION_API_URL}?latitude=${latitude}&longitude=${longitude}`);

    if (!elevationResponse.ok) {
        console.warn("Could not fetch elevation data.");
    }
    
    const elevationData = elevationResponse.ok ? await elevationResponse.json() : { elevation: [0] };
    const altitude = elevationData.elevation?.[0] ?? 0;

    const provinceIneCode = province ? getIneCode(province) : null;
    const municipalityIneCode = provinceCode && municipalityCode ? `${provinceCode}${municipalityCode}` : null;
    const climaticZoneInfo = province ? getClimaticZone(province, altitude) : null;

    const result: CatastroData = {
        address,
        municipality,
        province,
        postalCode,
        constructionYear,
        ineCode: provinceIneCode,
        municipalityIneCode,
        latitude,
        longitude,
        altitude,
        climaticZone: climaticZoneInfo?.zone,
        climaticZoneRule: climaticZoneInfo?.rule,
    };
    
    return { data: result, error: null };

  } catch (e: any) {
    console.error("An unexpected error occurred during the search:", e);
    return { data: null, error: `Ocurrió un error inesperado al contactar servicios externos.` };
  }
}
