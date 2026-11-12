import { ApiHandlers, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH } from '../common';
import repositories from './repositories.json';
import characteristic from './correlation-characteristic.json';
import subcharacteristic from './correlation-subcharacteristic.json';

export const CORRELATION_PATH = `${PRODUCT_PATH}/dashboards/relacoes/`;

/** Os endpoints da página (useCorrelationDashboard), a partir do produto; ela não pede a lista de releases. */
export const CORRELATION_API = {
  repositories: `${PRODUCT_API}/repositories/`,
  correlation: `${PRODUCT_API}/correlation/`
};

/** Uma resposta por nível (?level=), com o repositório pedido (?repository_id=), como o Service devolve. */
function correlationOf(url: URL, body: object = {}) {
  const level = url.searchParams.get('level') === 'subcharacteristic' ? subcharacteristic : characteristic;
  const repository = repositories.results.find((item) => item.id === Number(url.searchParams.get('repository_id')));
  return {
    ...level,
    ...body,
    repository: repository ? { id: repository.id, name: repository.name } : level.repository
  };
}

/** A resposta com dados, para o "Tentar novamente" depois do erro. */
export const correlationHandler = (url: URL) => correlationOf(url);

/**
 * Dois repositórios com id numérico (o mock comum tem id "1" em texto, e a página compara com ===). A RD de cada nível
 * está em `release_values` (20 releases usadas e 2 sem valor), e os pares, os p-valores e a normalidade são os que o
 * f_σ do Core (Shapiro-Wilk e Spearman do scipy) calcula sobre ela. Na característica, C1, C3 e C6 do Exemplo 7, com
 * Functional Suitability em 0,65 (no lugar de 0,45) em R3, R4 e R19 a R22, para ter um par não significativo e negativo;
 * na subcaracterística, uma entidade que não variou (pares sem correlação) e Modifiability com distribuição normal.
 */
export const comDados: ApiHandlers = {
  [CORRELATION_API.repositories]: repositories,
  [CORRELATION_API.correlation]: correlationHandler
};

/** Sem pares calculados: o Service não chega a aplicar f_σ. */
const SEM_PARES = { method: null, non_normal: null, critical_value: null, pairs: [] };

/** Só 2 releases com valor para todas as características: faltam releases. */
export const poucasReleases: ApiHandlers = {
  ...comDados,
  [CORRELATION_API.correlation]: (url: URL) =>
    correlationOf(url, {
      ...SEM_PARES,
      releases: characteristic.releases.slice(0, 2),
      excluded_releases: 18,
      reason: 'insufficient_releases'
    })
};

/** O repositório não tem análise em nenhuma das releases do produto. */
export const semAnalise: ApiHandlers = {
  ...comDados,
  [CORRELATION_API.correlation]: (url: URL) =>
    correlationOf(url, { ...SEM_PARES, releases: [], excluded_releases: 20, reason: 'insufficient_releases' })
};

/** Produto sem release: sem configuração do modelo, sem entidades e sem releases. */
export const semRelease: ApiHandlers = {
  ...comDados,
  [CORRELATION_API.correlation]: (url: URL) =>
    correlationOf(url, {
      ...SEM_PARES,
      entities: [],
      releases: [],
      excluded_releases: 0,
      reason: 'insufficient_entities'
    })
};

/** A correlação falha com 500; a lista de repositórios, que também alimenta o layout, carrega. */
export const erro500: ApiHandlers = {
  ...comDados,
  [CORRELATION_API.correlation]: serverError
};
