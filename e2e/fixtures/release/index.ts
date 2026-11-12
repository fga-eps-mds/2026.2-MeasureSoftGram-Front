import { ApiHandlers } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH } from '../common';
import analysisData from './analysis-data.json';

export const RELEASE_ID = analysisData.release.id;
export const RELEASE_PATH = `${PRODUCT_PATH}/releases/${RELEASE_ID}/`;

/** O único endpoint da página (Release.tsx), a partir do produto; o service pede sem a barra final. */
export const RELEASE_API = { analysisData: `${PRODUCT_API}/release/${RELEASE_ID}/analysis_data` };

/**
 * R2 com quatro características planejadas e dois repositórios. No primeiro, o realizado fica acima, igual e abaixo
 * do planejado; no segundo, falta o valor de Manutenibilidade (CA12 e CA13).
 */
export const comDados: ApiHandlers = { [RELEASE_API.analysisData]: analysisData };

/** Release planejada e sem análise: nenhum repositório com realizado (CA10). */
export const semAnalise: ApiHandlers = { [RELEASE_API.analysisData]: { ...analysisData, accomplished: [] } };

/** Release sem planejamento (CA11). */
export const semPlanejamento: ApiHandlers = { [RELEASE_API.analysisData]: { ...analysisData, planned: [] } };

/** Só duas características planejadas, para ver as proporções do equalizador (CA9). */
export const duasCaracteristicas: ApiHandlers = {
  [RELEASE_API.analysisData]: {
    ...analysisData,
    planned: analysisData.planned.slice(0, 2),
    accomplished: analysisData.accomplished.map((repository) => ({
      ...repository,
      characteristics: repository.characteristics.filter((item) =>
        ['reliability', 'maintainability'].includes(item.name)
      )
    }))
  }
};
