import { ApiHandlers, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH } from '../common';
import { QUALITY_BANDS } from '../../../src/shared/utils/qualityBands';

export const SETTINGS_PATH = `${PRODUCT_PATH}/settings/`;
export const QUALITY_BANDS_API = `${PRODUCT_API}/quality-bands/`;

/** A régua no formato do Service (`quality-bands/`) a partir dos 4 limites: o fim das faixas E, D, C e B. */
function regua(limits: number[], { isDefault = false, canEdit = true } = {}) {
  const edges = [0, ...limits, 1];
  return {
    is_default: isDefault,
    can_edit: canEdit,
    bands: QUALITY_BANDS.map(({ grade }, index) => ({ key: grade, min: edges[index], max: edges[index + 1] }))
  };
}

/** A régua de um produto que nunca alterou as faixas (a mesma do common). */
export const reguaPadrao = regua([0.2, 0.4, 0.6, 0.8], { isDefault: true });
/** O exemplo dos critérios da US30.02 e da US30.03: a faixa A a partir de 0,85, e a B de 0,60 a 0,85. */
export const reguaA085 = regua([0.2, 0.4, 0.6, 0.85]);
/** O exemplo do protótipo da US30.02: Bom (C) vai até 0,70, então um indicador de 0,62 fica em C, e não em B. */
export const reguaBomAte070 = regua([0.2, 0.4, 0.7, 0.85]);

/** O produto com a faixa A a partir de 0,85 e o usuário administrador. */
export const faixaA085: ApiHandlers = { [QUALITY_BANDS_API]: reguaA085 };
/** O produto com Bom (C) até 0,70. */
export const bomAte070: ApiHandlers = { [QUALITY_BANDS_API]: reguaBomAte070 };
/** A régua alterada, vista por um membro que não é administrador da organização (US30.01, CA5). */
export const somenteLeitura: ApiHandlers = { [QUALITY_BANDS_API]: { ...reguaA085, can_edit: false } };
/** As faixas do produto não carregam: os gráficos ficam com a régua padrão e o aviso (US30.02, CA4). */
export const faixasIndisponiveis: ApiHandlers = { [QUALITY_BANDS_API]: serverError };
