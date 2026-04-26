
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

const CATASTRO_ADDRESS_URL = 'http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC';
const CATASTRO_COORDS_URL = 'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC';
const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation';

const parseXml = <T>(xml: string, tag: string): T | null => {
  const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
  return match ? (match[1] as T) : null;
};

const getErrorDescription = (xml: string): string | null => {
  const errorMatch = xml.match(/<des>(.*?)<\/des>/);
  return errorMatch ? errorMatch[1] : "Error desconocido al contactar el servicio del Catastro.";
};

export async function searchCatastro(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = FormSchema.safeParse({ ref: formData.get('ref') });

  if (!validatedFields.success) {
    return { data: null, error: validatedFields.error.flatten().fieldErrors.ref?.join(', ') ?? 'Entrada inválida.' };
  }

  const ref = validatedFields.data.ref;

  try {
    const [addressResponse, coordsResponse] = await Promise.all([
      fetch(`${CATASTRO_ADDRESS_URL}?RC=${ref}`),
      fetch(`${CATASTRO_COORDS_URL}?SRS=EPSG:4326&RC=${ref}`)
    ]);

    if (!addressResponse.ok || !coordsResponse.ok) {
      return { data: null, error: "No se pudo contactar con los servicios del Catastro. Inténtelo más tarde." };
    }

    const [addressXml, coordsXml] = await Promise.all([
      addressResponse.text(),
      coordsResponse.text(),
    ]);

    if (coordsXml.includes('<err>')) {
        const errorMessage = getErrorDescription(coordsXml);
        return { data: null, error: `Error del Catastro: ${errorMessage}` };
    }
    
    if (addressXml.includes('<err>')) {
        const errorMessage = getErrorDescription(addressXml);
        return { data: null, error: `Error del Catastro: ${errorMessage}` };
    }

    const address = parseXml<string>(addressXml, 'ldt');
    const longitudeStr = parseXml<string>(coordsXml, 'xcen');
    const latitudeStr = parseXml<string>(coordsXml, 'ycen');

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

  } catch (e) {
    console.error(e);
    return { data: null, error: "Ocurrió un error inesperado durante la búsqueda. Por favor, revise la consola para más detalles." };
  }
}
