
export type CatastroData = {
  ref: string;
  address: string;
  municipality: string | null;
  province: string | null;
  postalCode: string | null;
  constructionYear: string | null;
  ineCode: string | null;
  municipalityIneCode: string | null;
  latitude: number;
  longitude: number;
  altitude: number;
  ignAddress?: string | null;
  climaticZone?: string | null;
  climaticZoneRule?: string | null;
  alternativeClimaticZone?: string | null;
  alternativeClimaticZoneMunicipality?: string | null;
  alternativeClimaticZoneReference?: string | null;
};

export type ActionState = {
  data: CatastroData | null;
  error: string | null;
};
