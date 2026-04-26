'use server';

import { z } from 'zod';
import type { ActionState, CatastroData } from '@/lib/types';
import { geographicContextDescription } from '@/ai/flows/geographic-context-description';

const FormSchema = z.object({
  ref: z.string({invalid_type_error: "La referencia catastral debe ser un texto."})
    .trim()
    .min(14, "La referencia catastral es demasiado corta.")
    .max(20, "La referencia catastral es demasiado larga.")
    .regex(/^[A-Z0-9]+$/, "La referencia catastral solo puede contener letras mayúsculas y números."),
});

// Endpoints correctos basados en el ejemplo funcional del usuario
const CATASTRO_COORDS_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC';
const CATASTRO_DATA_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC';
const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation';

const parseXmlTag = (xml: string, tag: string): string | null => {
  // Coincidencia no codiciosa para el contenido dentro de una etiqueta
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
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
    // Es necesario simular una petición de navegador
    const fetchOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        }
    };

    const coordsUrl = `${CATASTRO_COORDS_URL}?SRS=EPSG:4326&RC=${ref.substring(0, 14)}`;
    const dataUrl = `${CATASTRO_DATA_URL}?RC=${ref}`;

    // Realizar ambas peticiones en paralelo para mayor eficiencia
    const [coordsResponse, dataResponse] = await Promise.all([
      fetch(coordsUrl, fetchOptions),
      fetch(dataUrl, fetchOptions)
    ]);

    if (!coordsResponse.ok) {
        return { data: null, error: "No se pudo contactar con los servicios del Catastro. Inténtelo más tarde." };
    }
     if (!dataResponse.ok) {
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

    if (!address || !longitudeStr || !latitudeStr) {
      return { data: null, error: "No se encontraron datos completos para la referencia catastral proporcionada." };
    }
    
    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);

    if (isNaN(latitude) || isNaN(longitude)) {
        return { data: null, error: "Las coordenadas recibidas del Catastro no son válidas." };
    }

    const [elevationResponse, aiDescriptionResponse] = await Promise.all([
        fetch(`${ELEVATION_API_URL}?latitude=${latitude}&longitude=${longitude}`),
        geographicContextDescription({ latitude, longitude })
    ]);

    if (!elevationResponse.ok) {
        console.warn("Could not fetch elevation data.");
    }
    
    const elevationData = elevationResponse.ok ? await elevationResponse.json() : { elevation: [0] };
    const altitude = elevationData.elevation?.[0] ?? 0;
    const aiDescription = aiDescriptionResponse.description;

    const result: CatastroData = {
        address,
        latitude,
        longitude,
        altitude,
        aiDescription,
    };
    
    return { data: result, error: null };

  } catch (e: any) {
    console.error("An unexpected error occurred during the search:", e);
    if (e.message.includes('fetch')) {
         return { data: null, error: "No se pudo contactar con los servicios del Catastro. Inténtelo más tarde." };
    }
    return { data: null, error: `Ocurrió un error inesperado: ${e.message}.` };
  }
}
