export type IEEData = {
  numiee?: string;
  urlgesie?: string;
  evaluado?: string;
  caducidad?: string;
  count_intu?: number;
  count_intm?: number;
  emisiones?: string;
  consumo?: string;
  found: boolean;
};

export type CEEItem = {
  ref: string;
  emicalif: string;
  emitotal?: string;
  concalif: string;
  contotal?: string;
  validohasta?: string;
  direccion?: string;
  url?: string;
};

export type CEEData = {
  exactMatch?: CEEItem;
  others: CEEItem[];
  total: number;
  found: boolean;
};

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
  ceeRegistry?: {
    name: string;
    url: string;
    description: string;
    visorUrl?: string;
  } | null;
  ieeGva?: IEEData | null;
  ceeGva?: CEEData | null;
};

export type ActionState = {
  data: CatastroData | null;
  error: string | null;
};
