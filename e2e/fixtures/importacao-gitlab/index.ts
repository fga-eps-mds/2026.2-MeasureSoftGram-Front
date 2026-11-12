import { ApiHandlers, Reply, serverError } from '../../support/api';
import { EMPTY_PAGE, ORGANIZATION_ID, PRODUCT_API } from '../common';
import organizations from '../../../src/mocks/fixtures/organizations.json';
import products from '../../../src/mocks/fixtures/products.json';
import namespaces from './gitlab-namespaces.json';
import projects from './gitlab-projects.json';
import squadProjects from './gitlab-projects-squad-01.json';

/** A tela de importação (Products.tsx) e a lista de projetos do produto. */
export const IMPORT_PATH = '/products/';

/** A conta pessoal, o grupo fga-eps-mds (o mesmo nome da organização 1 do common) e o subgrupo squad-01. */
export const [PERSONAL, GROUP, SUBGROUP] = namespaces;

/** O projeto que os testes importam e o que o produto já tem importado. */
export const PARSER = projects[3];

/** O subgrupo vira a organização 2 do MeasureSoftGram, com um produto sem projetos. */
export const SQUAD_ORGANIZATION = {
  ...organizations.results[0],
  id: '2',
  url: 'http://localhost:8080/api/v1/organizations/2/',
  name: 'squad-01',
  key: 'squad-01',
  description: 'Subgrupo do squad 01.',
  products: ['Squad 01']
};

/** A organização que o POST de import-gitlab devolve para cada grupo; o teste do subgrupo escolhe pelo corpo. */
export const ORGANIZATION_OF: Record<number, typeof SQUAD_ORGANIZATION> = {
  [GROUP.id]: organizations.results[0],
  [SUBGROUP.id]: SQUAD_ORGANIZATION
};
const SQUAD_PRODUCT = { ...products.results[0], id: '2', name: 'Squad 01' };

export const IMPORT_API = {
  namespaces: '/v1/accounts/gitlab-namespaces/',
  importGroup: '/v1/organizations/import-gitlab/',
  projects: `/v1/organizations/${ORGANIZATION_ID}/gitlab-projects/`,
  repositories: `${PRODUCT_API}/repositories/`,
  repository: `${PRODUCT_API}/repositories/1/`,
  squadProjects: `/v1/organizations/${SQUAD_ORGANIZATION.id}/gitlab-projects/`
};

const PER_PAGE = 10;

/**
 * Os projetos como o Service devolve: filtrados pelo nome (?search=), dez por página (?page=) e o total de páginas nos
 * cabeçalhos X-Total-Pages e X-Next-Page.
 */
const pagesOf =
  (list: typeof projects) =>
  (url: URL): Reply => {
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const found = list.filter((project) => project.name.toLowerCase().includes(search));
    const page = Number(url.searchParams.get('page') ?? 1);
    const totalPages = Math.max(Math.ceil(found.length / PER_PAGE), 1);
    return {
      status: 200,
      json: found.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      headers: {
        'x-total-pages': String(totalPages),
        ...(page < totalPages ? { 'x-next-page': String(page + 1) } : {})
      }
    };
  };

/** O parser já importado no produto, como a lista de repositórios do produto devolve. */
export const PARSER_REPOSITORY = {
  id: 1,
  name: PARSER.name,
  description: PARSER.description,
  url: PARSER.url,
  platform: 'gitlab',
  imported: true,
  gitlab_project_id: PARSER.gitlab_project_id,
  gitlab_path_with_namespace: PARSER.gitlab_path_with_namespace,
  latest_values: []
};
export const WITH_PARSER = { count: 1, next: null, previous: null, results: [PARSER_REPOSITORY] };

/** Conta do GitLab com três namespaces e doze projetos no grupo (duas páginas); o produto ainda não tem projetos. */
export const comProjetos: ApiHandlers = {
  [IMPORT_API.namespaces]: namespaces,
  // o grupo escolhido vira (ou já é) a organização 1
  [IMPORT_API.importGroup]: organizations.results[0],
  [IMPORT_API.projects]: pagesOf(projects),
  [IMPORT_API.repositories]: EMPTY_PAGE
};

/** O subgrupo squad-01 tem a própria organização (2), com um produto e dois projetos (CA2). */
export const comSubgrupo: ApiHandlers = {
  ...comProjetos,
  '/v1/organizations/': { ...organizations, count: 2, results: [organizations.results[0], SQUAD_ORGANIZATION] },
  [`/v1/organizations/${SQUAD_ORGANIZATION.id}/`]: SQUAD_ORGANIZATION,
  [`/v1/organizations/${SQUAD_ORGANIZATION.id}/products/`]: { ...products, results: [SQUAD_PRODUCT] },
  [`/v1/organizations/${SQUAD_ORGANIZATION.id}/products/${SQUAD_PRODUCT.id}/repositories/`]: EMPTY_PAGE,
  // na troca, o menu lateral pede por um instante o produto anterior (1) na organização nova
  [`/v1/organizations/${SQUAD_ORGANIZATION.id}/products/1/repositories/`]: EMPTY_PAGE,
  [IMPORT_API.squadProjects]: pagesOf(squadProjects)
};

/** O produto já tem o parser importado (CA5, CA6); a edição dele vem do Service com platform e imported. */
export const jaImportado: ApiHandlers = {
  ...comProjetos,
  [IMPORT_API.repositories]: WITH_PARSER,
  [IMPORT_API.repository]: PARSER_REPOSITORY,
  [`${IMPORT_API.repository}latest-values/tsqmi/badge`]: null
};

/** A lista de projetos do GitLab falha com 500 (CA7). */
export const erro500: ApiHandlers = { ...comProjetos, [IMPORT_API.projects]: serverError };

/** O token do GitLab expirou: o Service responde 409 ao listar os projetos (CA7). */
export const token409: ApiHandlers = {
  ...comProjetos,
  [IMPORT_API.projects]: { status: 409, json: { error: 'gitlab_token_invalid' } }
};

/** O token expirou antes de listar os grupos: 409 nos namespaces (CA7). */
export const token409Grupos: ApiHandlers = {
  ...comProjetos,
  [IMPORT_API.namespaces]: { status: 409, json: { error: 'gitlab_token_invalid' } }
};

/** Conta do GitHub: a organização fga-eps-mds e os repositórios dela; o produto tem o repositório do common (CA1). */
export const github: ApiHandlers = {
  '/v1/accounts/github-organizations/': [
    { github_org_id: 10, github_org_name: 'fga-eps-mds', avatar_url: '', description: 'Organização da disciplina' }
  ],
  [`/v1/organizations/${ORGANIZATION_ID}/github-repos/`]: [
    {
      github_repo_id: 501,
      github_full_name: 'fga-eps-mds/2026.1-MeasureSoftGram-Service',
      name: '2026.1-MeasureSoftGram-Service',
      description: 'Repositorio de exemplo do modo mock.',
      url: 'https://github.com/fga-eps-mds/2026.1-MeasureSoftGram-Service'
    }
  ]
};

/** BUG12.01: o usuário `joao` é membro do grupo `joao`; os dois namespaces têm o mesmo nome. */
export const JOAO_USER = { id: 11, name: 'joao', full_path: 'joao', avatar_url: '', description: '', kind: 'user' };
export const JOAO_GROUP = {
  id: 201,
  name: 'joao',
  full_path: 'joao-grupo',
  avatar_url: '',
  description: 'Grupo do joao',
  kind: 'group'
};

/** A organização do grupo é a 1 (a do common); a do namespace pessoal é a 3. As duas se chamam joao. */
export const JOAO_GROUP_ORGANIZATION = {
  ...organizations.results[0],
  name: 'joao',
  key: 'joao',
  description: 'Organização do grupo joao.',
  gitlab_group_id: JOAO_GROUP.id
};
export const JOAO_PERSONAL_ORGANIZATION = {
  ...organizations.results[0],
  id: '3',
  url: 'http://localhost:8080/api/v1/organizations/3/',
  name: 'joao',
  key: 'joao-pessoal',
  description: 'Organização do namespace pessoal de joao.',
  products: [],
  gitlab_user_id: JOAO_USER.id
};
const JOAO_PERSONAL_API = `/v1/organizations/${JOAO_PERSONAL_ORGANIZATION.id}`;

/** Usuário e grupo com o mesmo nome, cada um com a sua organização no MeasureSoftGram (BUG12.01). */
export const grupoComNomeDoUsuario: ApiHandlers = {
  ...comProjetos,
  [IMPORT_API.namespaces]: [JOAO_USER, JOAO_GROUP],
  '/v1/organizations/': {
    ...organizations,
    count: 2,
    results: [JOAO_GROUP_ORGANIZATION, JOAO_PERSONAL_ORGANIZATION]
  },
  [`/v1/organizations/${ORGANIZATION_ID}/`]: JOAO_GROUP_ORGANIZATION,
  [IMPORT_API.importGroup]: JOAO_GROUP_ORGANIZATION,
  '/v1/organizations/import-gitlab-user/': JOAO_PERSONAL_ORGANIZATION,
  [`${JOAO_PERSONAL_API}/`]: JOAO_PERSONAL_ORGANIZATION,
  [`${JOAO_PERSONAL_API}/products/`]: EMPTY_PAGE,
  [`${JOAO_PERSONAL_API}/gitlab-projects/`]: pagesOf([])
};
