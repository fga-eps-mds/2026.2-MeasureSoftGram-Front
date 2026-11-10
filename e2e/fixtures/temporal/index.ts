import { ApiHandlers, serverError } from '../../support/api';
import { EMPTY_PAGE, PRODUCT_API, PRODUCT_PATH } from '../common';
import tree from '../distribuicao/quality-model-tree.json';
import repositories from './repositories.json';
import characteristics from './historical-characteristics.json';
import subcharacteristics from './historical-subcharacteristics.json';
import measures from './historical-measures.json';
import metrics from './historical-metrics.json';

export const TEMPORAL_PATH = `${PRODUCT_PATH}/dashboards/temporal/`;

export type Level = 'characteristics' | 'subcharacteristics' | 'measures' | 'metrics';
export const LEVELS: Level[] = ['characteristics', 'subcharacteristics', 'measures', 'metrics'];

/** Os endpoints da página (useTemporalEvolution), a partir do produto. */
export const TEMPORAL_API = {
  repositories: `${PRODUCT_API}/repositories/`,
  tree: `${PRODUCT_API}/quality-model-tree/`,
  history: (repositoryId: number, level: Level) =>
    `${PRODUCT_API}/repositories/${repositoryId}/historical-values/${level}/`
};

type History = typeof characteristics;

/** Os quatro históricos de um repositório; o de métricas só responde ao pedido do repositório inteiro (?qualifier=TRK). */
function historiesOf(repositoryId: number, bodies: Record<Level, History>): ApiHandlers {
  return Object.fromEntries(
    LEVELS.map((level) => [
      TEMPORAL_API.history(repositoryId, level),
      level === 'metrics'
        ? (url: URL) => (url.searchParams.get('qualifier') === 'TRK' ? bodies[level] : undefined)
        : bodies[level]
    ])
  );
}

const service = { characteristics, subcharacteristics, measures, metrics };
/** O Front só tem a última medição de cada característica, para a troca de repositório mudar o gráfico. */
const front = {
  ...service,
  characteristics: {
    results: characteristics.results.map((item) => ({ ...item, history: item.history.slice(-1) }))
  }
};

/**
 * Dois repositórios de id numérico (7, Service, e 9, Front) e a árvore do modelo da Distribuição: Reliability com
 * Testing Status e duas medidas, Maintainability com Modifiability e uma medida. As medições vão de julho a outubro;
 * tests e complexity só têm valor por arquivo, então o histórico de métricas do repositório inteiro vem vazio para elas.
 */
export const comDados: ApiHandlers = {
  [TEMPORAL_API.repositories]: repositories,
  [TEMPORAL_API.tree]: tree,
  ...historiesOf(7, service),
  ...historiesOf(9, front)
};

/** Os históricos do Service demoram 2 s, para ver o estado "Carregando" (CA4). */
export const carregando: ApiHandlers = {
  ...comDados,
  ...Object.fromEntries(
    LEVELS.map((level) => [TEMPORAL_API.history(7, level), { status: 200, json: service[level], delayMs: 2000 }])
  )
};

/** O Service ainda não foi analisado: os quatro históricos vêm vazios (CA4). */
export const semMedicoes: ApiHandlers = {
  ...comDados,
  ...historiesOf(7, {
    characteristics: { results: [] },
    subcharacteristics: { results: [] },
    measures: { results: [] },
    metrics: { results: [] }
  })
};

/** Os quatro históricos do Service falham com 500; a lista de repositórios e a árvore carregam (CA4). */
export const erro500: ApiHandlers = {
  ...comDados,
  ...Object.fromEntries(LEVELS.map((level) => [TEMPORAL_API.history(7, level), serverError]))
};

/** Produto sem repositório: a página só pede a lista e a árvore (CA4). */
export const semRepositorios: ApiHandlers = { [TEMPORAL_API.repositories]: EMPTY_PAGE, [TEMPORAL_API.tree]: tree };

/** A lista de repositórios falha com 500 (CA4). */
export const erroRepositorios: ApiHandlers = { [TEMPORAL_API.repositories]: serverError, [TEMPORAL_API.tree]: tree };
