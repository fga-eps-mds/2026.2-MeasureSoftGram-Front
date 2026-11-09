import { ApiHandlers, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH } from '../common';
import releases from './releases.json';
import releaseRepositories from './release-repositories.json';
import tree from './quality-model-tree.json';
import entities from './entity-analysis-entities.json';
import tsqmi from './analysis-distribution-tsqmi.json';
import passedTests from './analysis-distribution-measure-passed_tests.json';
import totalBuilds from './analysis-distribution-metric-total_builds.json';
import semAnaliseTsqmi from './analysis-distribution-sem-analise.json';

export const DISTRIBUTION_PATH = `${PRODUCT_PATH}/dashboards/distribuicao/`;

/** Os endpoints da página (useDistributionDashboard), a partir do produto. */
export const DISTRIBUTION_API = {
  releases: `${PRODUCT_API}/release/`,
  repositories: `${PRODUCT_API}/release-dashboard/characteristics/`,
  tree: `${PRODUCT_API}/quality-model-tree/`,
  entities: `${PRODUCT_API}/entity-analysis/entities/`,
  distribution: `${PRODUCT_API}/analysis-distribution/`
};

/** Uma resposta por nível e chave pedidos (?level=&key=); no TSQMI a chave não vai na URL. */
const distributions: Record<string, unknown> = {
  'tsqmi:tsqmi': tsqmi,
  'measure:passed_tests': passedTests,
  'metric:total_builds': totalBuilds
};

/** Release R2 com três repositórios: o Service tem TSQMI (régua A–E), uma medida com faixa de referência e uma métrica com discrepante. */
export const comDados: ApiHandlers = {
  [DISTRIBUTION_API.releases]: releases,
  [DISTRIBUTION_API.repositories]: releaseRepositories,
  [DISTRIBUTION_API.tree]: tree,
  [DISTRIBUTION_API.entities]: entities,
  [DISTRIBUTION_API.distribution]: (url: URL) =>
    distributions[`${url.searchParams.get('level')}:${url.searchParams.get('key') ?? 'tsqmi'}`]
};

/** Nenhum repositório tem análise na release: a página abre no primeiro e mostra o estado "Sem análise". */
export const semAnalise: ApiHandlers = {
  ...comDados,
  [DISTRIBUTION_API.repositories]: {
    ...releaseRepositories,
    repositories: releaseRepositories.repositories.map((item) => ({
      ...item,
      tsqmi: { value: null, created_at: null }
    }))
  },
  [DISTRIBUTION_API.distribution]: semAnaliseTsqmi
};

/** Produto sem release: a página só pede a lista de releases. */
export const semRelease: ApiHandlers = {
  [DISTRIBUTION_API.releases]: []
};

/** A distribuição falha com 500; os seletores carregam. */
export const erro500: ApiHandlers = {
  ...comDados,
  [DISTRIBUTION_API.distribution]: serverError
};
