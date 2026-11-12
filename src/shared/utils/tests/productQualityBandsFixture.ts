import type { ProductQualityBands } from '@customTypes/qualityBands';
import { QUALITY_BANDS, QualityBand } from '@utils/qualityBands';

/**
 * Régua configurada num produto (US30.02), do jeito que o hook a devolve: os graus, as cores e os rótulos continuam
 * sendo os do guia de IDV, e o que muda são os limites. Aqui o A só começa em 0,85 e o E vai até 0,25, então um valor
 * como 0,81 muda de grau em relação à régua padrão — é o que os testes dos gráficos e dos CSVs usam para mostrar que a
 * tela seguiu a régua do produto, e não a padrão.
 */
export const PRODUCT_BANDS: QualityBand[] = [
  { ...QUALITY_BANDS[0], min: 0, max: 0.25 },
  { ...QUALITY_BANDS[1], min: 0.25, max: 0.45 },
  { ...QUALITY_BANDS[2], min: 0.45, max: 0.65 },
  { ...QUALITY_BANDS[3], min: 0.65, max: 0.85 },
  { ...QUALITY_BANDS[4], min: 0.85, max: 1 }
];

/** A mesma régua como a resposta do Service, para os testes que passam pelo hook. */
export const PRODUCT_BANDS_RESPONSE: ProductQualityBands = {
  is_default: false,
  can_edit: true,
  bands: PRODUCT_BANDS.map(({ grade, min, max }) => ({ key: grade, min, max }))
};
