export type CatastroData = {
  address: string;
  latitude: number;
  longitude: number;
  altitude: number;
  aiDescription: string;
};

export type ActionState = {
  data: CatastroData | null;
  error: string | null;
};
