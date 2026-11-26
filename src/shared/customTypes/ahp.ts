/** Chaves da escala de Saaty no Core (`core.ahp.SAATY_SCALE`). */
export type SaatyIntensity = 'igual' | 'moderadamente' | 'fortemente' | 'muito_fortemente' | 'extremamente';

/** Resposta de um par no formato do Core: "igualmente" é preferred null com intensity "igual". */
export interface AHPAnswer {
  a: string;
  b: string;
  preferred: string | null;
  intensity: SaatyIntensity;
}

/** GET .../ahp/scale/ */
export interface AHPScale {
  scale: Record<SaatyIntensity, number>;
  phrases: Record<SaatyIntensity, string>;
  cr_threshold: number;
}

/** POST .../ahp/calculate/ (prévia, nada é gravado) */
export interface AHPCalculateRequest {
  entities: string[];
  answers: AHPAnswer[];
}

export interface AHPConflict {
  a: string;
  b: string;
  answer: AHPAnswer;
  suggested: AHPAnswer;
  suggested_ratio: number;
}

export interface AHPCalculateResponse {
  priorities: Record<string, number>;
  weights: Record<string, number>;
  /** null em grupos de 2 ou menos entidades. */
  consistency_ratio: number | null;
  consistent: boolean;
  cr_threshold: number;
  conflict: AHPConflict | null;
}
