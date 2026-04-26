export type CatastroData = {
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
  climaticZone?: string | null;
  climaticZoneRule?: string | null;
};

export type ActionState = {
  data: CatastroData | null;
  error: string | null;
};
