import { ApiHandlers, serverError } from '../../support/api';
import { EMPTY_PAGE, PRODUCT_API } from '../common';
import { comDados, DISTRIBUTION_API } from '../distribuicao';
import releaseRepositories from '../distribuicao/release-repositories.json';
import organizations from '../../../src/mocks/fixtures/organizations.json';
import repositories from '../../../src/mocks/fixtures/repositories.json';
import user from '../../../src/mocks/fixtures/user.json';

/** Um grupo do GitLab e uma organização do GitHub para a tela de importação listar. */
const gitlabNamespaces = [
  { id: 10, name: 'fga-eps-mds', full_path: 'fga-eps-mds', avatar_url: '', description: '', kind: 'group' }
];
const githubOrganizations = [{ github_org_id: 10, github_org_name: 'fga-eps-mds', avatar_url: '', description: '' }];

/** Endpoints de dados das telas que, aqui, respondem 500 (a mensagem de erro de cada tela também leva os termos). */
const DADOS_COM_ERRO = [
  'repositories/1/historical-values/characteristics',
  'repositories/1/historical-values/subcharacteristics',
  'repositories/1/historical-values/measures',
  'repositories/1/historical-values/metrics',
  'repositories/1/latest-values/tsqmi',
  'release-dashboard/summary',
  'release/2/analysis_data',
  'entity-analysis/matrix',
  'correlation',
  'entity-relationship-tree',
  'current/goal',
  'default/pre-config'
];

/**
 * O que as telas do produto pedem além do comum (conta, organização, produto, repositórios): os dashboards, a lista de
 * releases, a importação do provedor e a badge do repositório. Os dados são os da Distribuição; o que importa aqui é o
 * texto de cada tela.
 */
export const comTelas: ApiHandlers = {
  ...comDados,
  // a descrição do repositório de exemplo do modo mock fala em "Repositorio": dado da fixture, não texto da tela
  [`${PRODUCT_API}/repositories/`]: {
    ...repositories,
    results: repositories.results.map((item) => ({ ...item, description: 'Exemplo do modo mock.' }))
  },
  '/v1/balance-matrix': serverError,
  '/v1/accounts/users/': { ...EMPTY_PAGE, results: [user] },
  '/v1/accounts/github-organizations/': githubOrganizations,
  '/v1/accounts/gitlab-namespaces/': gitlabNamespaces,
  // a importação sincroniza o grupo do GitLab escolhido com a organização do MeasureSoftGram (US12.01, #113)
  '/v1/organizations/import-gitlab/': organizations.results[0],
  [`${PRODUCT_API}/repositories/1/latest-values/tsqmi/badge`]: null,
  // a tela do repositório e os dashboards de dados, no estado de erro: é onde as mensagens citam o repositório
  [`${PRODUCT_API}/repositories/1/`]: { ...repositories.results[0], description: 'Exemplo do modo mock.' },
  ...Object.fromEntries(DADOS_COM_ERRO.map((path) => [`${PRODUCT_API}/${path}`, serverError]))
};

/** Release sem nenhum repositório: a Distribuição mostra a mensagem de produto sem repositórios do provedor. */
export const semRepositorios: ApiHandlers = {
  ...comTelas,
  [DISTRIBUTION_API.repositories]: { ...releaseRepositories, repositories: [] }
};

/** A importação não consegue listar os grupos (GitLab) nem as organizações (GitHub). */
export const importacaoComErro: ApiHandlers = {
  ...comTelas,
  '/v1/accounts/github-organizations/': serverError,
  '/v1/accounts/gitlab-namespaces/': serverError
};
