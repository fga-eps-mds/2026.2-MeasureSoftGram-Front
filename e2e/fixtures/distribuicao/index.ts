import { ApiHandlers, serverError } from '../../support/api';
import { EMPTY_PAGE, ORGANIZATION_ID, PRODUCT_API, PRODUCT_PATH, RELEASES_API, releases } from '../common';
import releaseRepositories from './release-repositories.json';
import tree from './quality-model-tree.json';
import entities from './entity-analysis-entities.json';
import tsqmi from './analysis-distribution-tsqmi.json';
import reliability from './analysis-distribution-characteristic-reliability.json';
import passedTests from './analysis-distribution-measure-passed_tests.json';
import totalBuilds from './analysis-distribution-metric-total_builds.json';
import ciFeedbackTimes from './analysis-distribution-metric-sum_ci_feedback_times.json';
import poucasAnalisesTsqmi from './analysis-distribution-poucas-analises.json';
import semAnaliseTsqmi from './analysis-distribution-sem-analise.json';

export const DISTRIBUTION_PATH = `${PRODUCT_PATH}/dashboards/distribuicao/`;

/** Os endpoints da página (useDistributionDashboard), a partir do produto. */
export const DISTRIBUTION_API = {
  releases: RELEASES_API,
  repositories: `${PRODUCT_API}/release-dashboard/characteristics/`,
  tree: `${PRODUCT_API}/quality-model-tree/`,
  entities: `${PRODUCT_API}/entity-analysis/entities/`,
  distribution: `${PRODUCT_API}/analysis-distribution/`
};

type Distribution = typeof tsqmi;

/** Uma resposta por nível e chave pedidos (?level=&key=); no TSQMI a chave não vai na URL. */
const distributions: Record<string, Distribution> = {
  'tsqmi:tsqmi': tsqmi,
  'characteristic:reliability': reliability,
  'measure:passed_tests': passedTests,
  'metric:total_builds': totalBuilds,
  'metric:sum_ci_feedback_times': ciFeedbackTimes
};

/** A release e o repositório pedidos na query, como o Service devolve; sem eles na lista, os da fixture. */
function withRequested(distribution: Distribution, url: URL): Distribution {
  const releaseId = Number(url.searchParams.get('release_id'));
  const repositoryId = Number(url.searchParams.get('repository_id'));
  const release = releases.find((item) => item.id === releaseId);
  const repository = releaseRepositories.repositories.find((item) => item.id === repositoryId);
  return {
    ...distribution,
    release: release
      ? { id: release.id, release_name: release.release_name, start_at: release.start_at, end_at: release.end_at }
      : distribution.release,
    repository: repository ? { id: repository.id, name: repository.name } : distribution.repository
  };
}

/** A lista de repositórios da release pedida (?release_id=), para a troca de release na tela. */
function repositoriesOf(url: URL) {
  const release = releases.find((item) => item.id === Number(url.searchParams.get('release_id')));
  return release
    ? {
        ...releaseRepositories,
        release: {
          id: release.id,
          release_name: release.release_name,
          start_at: release.start_at,
          end_at: release.end_at
        }
      }
    : releaseRepositories;
}

/**
 * Release R2 (atual) com três repositórios: o Service tem TSQMI (régua A–E, dois discrepantes), uma característica com
 * a subcaracterística dela, uma medida com faixa de referência e duas métricas do GitHub (uma inteira com discrepante).
 * A mesma distribuição vale para qualquer release ou repositório escolhido.
 */
export const comDados: ApiHandlers = {
  [DISTRIBUTION_API.releases]: releases,
  [DISTRIBUTION_API.repositories]: repositoriesOf,
  [DISTRIBUTION_API.tree]: tree,
  [DISTRIBUTION_API.entities]: entities,
  [DISTRIBUTION_API.distribution]: (url: URL) => {
    const body = distributions[`${url.searchParams.get('level')}:${url.searchParams.get('key') ?? 'tsqmi'}`];
    return body && withRequested(body, url);
  }
};

/** Só duas análises na release: sem curva de densidade nem assimetria. */
export const poucasAnalises: ApiHandlers = {
  ...comDados,
  [DISTRIBUTION_API.distribution]: (url: URL) => withRequested(poucasAnalisesTsqmi, url)
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

/** Organização sem produto: o menu lateral fica sem os itens do produto. */
export const semProduto: ApiHandlers = {
  [`/v1/organizations/${ORGANIZATION_ID}/products/`]: EMPTY_PAGE
};
