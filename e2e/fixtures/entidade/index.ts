import { ApiHandlers, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH, RELEASES_API, releases } from '../common';
import characteristicR2 from './matrix-characteristic-r2.json';
import subcharacteristicR2 from './matrix-subcharacteristic-r2.json';
import measureR2 from './matrix-measure-r2.json';
import measureR1 from './matrix-measure-r1.json';
import reliability from './entity-analysis-reliability.json';

export const ENTITY_PATH = `${PRODUCT_PATH}/dashboards/entidade/`;

/** Os endpoints da página (useEntityAnalysis e RepositoryDetailDialog), a partir do produto. */
export const ENTITY_API = {
  releases: RELEASES_API,
  matrix: `${PRODUCT_API}/entity-analysis/matrix/`,
  analysis: `${PRODUCT_API}/entity-analysis/`
};

/** Uma matriz por release e nível pedidos (?release_id=&level=); a R1 só no nível medida, o padrão da página. */
const matrices: Record<string, unknown> = {
  '2:characteristic': characteristicR2,
  '2:subcharacteristic': subcharacteristicR2,
  '2:measure': measureR2,
  '1:measure': measureR1
};

const matrixOf = (url: URL) => matrices[`${url.searchParams.get('release_id')}:${url.searchParams.get('level')}`];

/** A composição só de Reliability na R2, a célula que o protótipo abre no nível característica. */
const analysisOf = (url: URL) =>
  url.searchParams.get('release_id') === '2' &&
  url.searchParams.get('level') === 'characteristic' &&
  url.searchParams.get('key') === 'reliability'
    ? reliability
    : undefined;

/**
 * R2 (atual, com a R1 como anterior) e três repositórios: no nível medida, quatro medidas com valores nas cinco faixas,
 * sete contribuições negativas entre as dez e a célula Front × CI Feedback Time sem valor. A R1 é a primeira release.
 */
export const comDados: ApiHandlers = {
  [ENTITY_API.releases]: releases,
  [ENTITY_API.matrix]: matrixOf,
  [ENTITY_API.analysis]: analysisOf
};

/** Produto sem release: a página só pede a lista de releases. */
export const semRelease: ApiHandlers = {
  [ENTITY_API.releases]: []
};

/** A R2 sem nenhuma análise: as colunas e os repositórios vêm, mas todos os valores são null. */
export const semAnalise: ApiHandlers = {
  [ENTITY_API.releases]: releases,
  [ENTITY_API.matrix]: {
    ...measureR2,
    repositories: measureR2.repositories.map((repository) => ({
      ...repository,
      tsqmi: { value: null, previous_value: null },
      cells: repository.cells.map((cell) => ({ ...cell, value: null, previous_value: null, contribution: null }))
    }))
  }
};

/** A matriz falha com 500; a lista de releases carrega. */
export const erro500: ApiHandlers = {
  ...comDados,
  [ENTITY_API.matrix]: serverError
};

/** O mapa carrega, mas a composição da célula falha com 500. */
export const erroComposicao: ApiHandlers = {
  ...comDados,
  [ENTITY_API.analysis]: serverError
};

export { matrixOf };
