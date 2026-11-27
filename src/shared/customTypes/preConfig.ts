export interface Metrics {
  key: string;
  weight: number;
}

export interface Measure {
  key: string;
  weight: number;
  metrics: Metrics[];
  min_threshold?: number;
  max_threshold?: number;
  active?: boolean;
}

export interface Subcharacteristic {
  key: string;
  weight: number;
  measures: Measure[];
  active?: boolean;
}

export interface Characteristic {
  key: string;
  weight: number;
  subcharacteristics: Subcharacteristic[];
  goal: number;
  active?: boolean;
}

export interface PreConfigData {
  characteristics: Characteristic[];
}

export interface PreConfigRelease {
  release_name: string;
  start_at: string;
  end_at: string;
}

export interface PreConfigRoot {
  id: number;
  name: string;
  created_at: Date;
  data: PreConfigData;
  // Campos opcionais: o Service ainda não os devolve (US13.01). Sem eles, o cartão
  // "Última configuração" mostra só a data e o selo de pesos definidos manualmente.
  created_by?: string | null;
  has_ahp?: boolean;
  release?: PreConfigRelease | null;
}

export type PreConfigMeta = Omit<PreConfigRoot, 'data'>;

export interface ReleaseInfoForm {
  release_name: string;
  description: string;
  start_at: string;
  end_at: string;
  goal: number;
  repositories_ids: number[];
}

export type PreConfigAttribute = Measure | Subcharacteristic | Characteristic;
