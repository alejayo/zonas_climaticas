'use server';
/**
 * @fileOverview This file provides a Genkit flow for generating a brief contextual description of a geographic location based on its latitude and longitude.
 *
 * - geographicContextDescription - A function that handles the generation of the geographic context description.
 * - GeographicContextDescriptionInput - The input type for the geographicContextDescription function.
 * - GeographicContextDescriptionOutput - The return type for the geographicContextDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeographicContextDescriptionInputSchema = z.object({
  latitude: z.number().describe('The decimal latitude of the geographic location.'),
  longitude: z.number().describe('The decimal longitude of the geographic location.'),
});
export type GeographicContextDescriptionInput = z.infer<
  typeof GeographicContextDescriptionInputSchema
>;

const GeographicContextDescriptionOutputSchema = z.object({
  description: z.string().describe('A brief contextual description of the geographic location.'),
});
export type GeographicContextDescriptionOutput = z.infer<
  typeof GeographicContextDescriptionOutputSchema
>;

export async function geographicContextDescription(
  input: GeographicContextDescriptionInput
): Promise<GeographicContextDescriptionOutput> {
  return geographicContextDescriptionFlow(input);
}

const geographicContextDescriptionPrompt = ai.definePrompt({
  name: 'geographicContextDescriptionPrompt',
  input: {schema: GeographicContextDescriptionInputSchema},
  output: {schema: GeographicContextDescriptionOutputSchema},
  prompt: `Genera una breve descripción o información contextual sobre la ubicación geográfica de la propiedad. La descripción debe tener entre 50 y 100 palabras. Enfócate en las características geográficas, el tipo de paisaje, si está cerca de la costa, montañas, ciudades importantes, etc.

Latitud: {{{latitude}}}
Longitud: {{{longitude}}}`,
});

const geographicContextDescriptionFlow = ai.defineFlow(
  {
    name: 'geographicContextDescriptionFlow',
    inputSchema: GeographicContextDescriptionInputSchema,
    outputSchema: GeographicContextDescriptionOutputSchema,
  },
  async input => {
    const {output} = await geographicContextDescriptionPrompt(input);
    return output!;
  }
);
