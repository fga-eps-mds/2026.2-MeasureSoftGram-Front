import type { QualityGrade } from '@utils/qualityBands';

/** Uma faixa de qualidade do produto, como o Service devolve (US30.01). */
export interface ProductQualityBand {
  key: QualityGrade;
  min: number;
  max: number;
}

/** Régua do produto em `quality-bands/`: as 5 faixas de E a A. */
export interface ProductQualityBands {
  /** O produto nunca alterou as faixas e usa os valores padrão. */
  is_default: boolean;
  /** O usuário é o administrador da organização e pode alterar as faixas. */
  can_edit: boolean;
  bands: ProductQualityBand[];
}
