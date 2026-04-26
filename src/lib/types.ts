export type CatastroData = {
  address: string;
  municipality: string | null;
  province: string | null;
  postalCode: string | null;
  constructionYear: string | null;
  ineCode: string | null;
  latitude: number;
  longitude: number;
  altitude: number;
  aiDescription: string;
  climaticZone?: string | null;
  climaticZoneRule?: string | null;
};

export type ActionState = {
  data: CatastroData | null;
  error: string | null;
};
