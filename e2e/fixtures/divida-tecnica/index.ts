import { ApiHandlers } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH, RELEASES_API, releases } from '../common';
import tree from './quality-model-tree.json';
import repositories from './repositories.json';
import matrixMeasure from './entity-matrix-measure.json';
import matrixSubcharacteristic from './entity-matrix-subcharacteristic.json';
import modifiability from './entity-analysis-modifiability.json';
import characteristics from './historical-values-characteristics.json';
import subcharacteristics from './historical-values-subcharacteristics.json';
import measures from './historical-values-measures.json';

export const ENTIDADE_PATH = `${PRODUCT_PATH}/dashboards/entidade/`;
export const TEMPORAL_PATH = `${PRODUCT_PATH}/dashboards/temporal/`;

const REPOSITORY_ID = repositories.results[0].id;
const HISTORY_API = `${PRODUCT_API}/repositories/${REPOSITORY_ID}/historical-values`;

/** Os endpoints das duas telas, a partir do produto. */
export const DIVIDA_API = {
  releases: RELEASES_API,
  matrix: `${PRODUCT_API}/entity-analysis/matrix/`,
  analysis: `${PRODUCT_API}/entity-analysis/`,
  repositories: `${PRODUCT_API}/repositories/`,
  tree: `${PRODUCT_API}/quality-model-tree/`,
  characteristics: `${HISTORY_API}/characteristics/`,
  subcharacteristics: `${HISTORY_API}/subcharacteristics/`,
  measures: `${HISTORY_API}/measures/`,
  metrics: `${HISTORY_API}/metrics/`
};

const matrices: Record<string, unknown> = {
  measure: matrixMeasure,
  subcharacteristic: matrixSubcharacteristic
};

/**
 * Análise por Entidade na R2 (atual), com três repositórios: a medida Technical Debt Ratio fica em Maintainability ›
 * Modifiability, e no MeasureSoftGram-Front ela não foi calculada (CA1, CA2 e CA5). O diálogo só tem os filhos de
 * Modifiability no nível subcaracterística.
 */
export const entidade: ApiHandlers = {
  [DIVIDA_API.releases]: releases,
  [DIVIDA_API.matrix]: (url: URL) => matrices[url.searchParams.get('level') ?? ''],
  [DIVIDA_API.analysis]: (url: URL) =>
    url.searchParams.get('level') === 'subcharacteristic' && url.searchParams.get('key') === 'modifiability'
      ? modifiability
      : undefined
};

/**
 * Evolução Temporal de um repositório (id numérico, como o Service manda) com a medida em três datas, uma na R1 e duas
 * na R2 (CA3 e CA4). Sem métricas do repositório inteiro: o card de Métricas fica vazio.
 */
export const temporal: ApiHandlers = {
  [DIVIDA_API.repositories]: repositories,
  [DIVIDA_API.tree]: tree,
  [DIVIDA_API.characteristics]: characteristics,
  [DIVIDA_API.subcharacteristics]: subcharacteristics,
  [DIVIDA_API.measures]: measures,
  [DIVIDA_API.metrics]: { results: [] }
};

/** A mesma Evolução Temporal, com a dívida técnica sem nenhuma medição no repositório (CA5). */
export const temporalSemDivida: ApiHandlers = {
  ...temporal,
  [DIVIDA_API.measures]: {
    results: measures.results.map((item) => (item.key === 'technical_debt_ratio' ? { ...item, history: [] } : item))
  }
};
