import { ApiHandlers, Handler } from '../../support/api';
import { EMPTY_PAGE, ORGANIZATION_ID, page, PRODUCT_API, PRODUCT_ID } from '../common';
import user from '../../../src/mocks/fixtures/user.json';
import organizations from '../../../src/mocks/fixtures/organizations.json';
import products from '../../../src/mocks/fixtures/products.json';

/**
 * Fluxos legados do Front (organizações, produtos, repositórios e releases), sem US de origem: os critérios são os do
 * comportamento atual (TASK 1.2 do épico #90). Cada gravação (POST/PUT) responde conforme o cenário do teste.
 */

/** Responde à gravação (método) e deixa o GET da mesma rota com `get`; outro método conta como rota sem handler. */
export const onWrite =
  (method: string, reply: unknown, get?: unknown): Handler =>
  (_url: URL, requestMethod: string) => {
    if (requestMethod === method) return reply;
    return get;
  };

const duplicate = (field: string, message: string) => ({ status: 400, json: { [field]: [message] } });

// ---------- Organizações ----------
export const ORGANIZATIONS_PATH = '/organizations/';
const [organization] = organizations.results;
const OTHER_USER = { ...user, id: 2, username: 'maria', first_name: 'Maria', last_name: 'Souza', key: 'k2' };
export const USERS = [user, OTHER_USER];
const NEW_ORGANIZATION = { ...organization, id: 2, name: 'Squad Qualidade', key: 'squad-qualidade', members: [2] };

const organizationBase: ApiHandlers = { '/v1/accounts/users/': page(USERS) };

/** O Service cria a organização (201) e devolve a nova (CA1). */
export const criaOrganizacao: ApiHandlers = {
  ...organizationBase,
  '/v1/organizations/': onWrite('POST', { status: 201, json: NEW_ORGANIZATION }, organizations),
  // a organização nova vira a atual: a Home pede os produtos dela
  [`/v1/organizations/${NEW_ORGANIZATION.id}/products/`]: EMPTY_PAGE
};

/** O Service recusa o nome já usado (CA2). */
export const organizacaoNomeRepetido: ApiHandlers = {
  ...organizationBase,
  '/v1/organizations/': onWrite('POST', duplicate('name', 'Organization with this name already exists.'), organizations)
};

/** O Service falha com 500 ao criar (CA2). */
export const organizacaoErro500: ApiHandlers = {
  ...organizationBase,
  '/v1/organizations/': onWrite('POST', { status: 500, json: { detail: 'Erro interno do servidor.' } }, organizations)
};

/** A organização existente com a edição aceita (CA3). */
export const editaOrganizacao: ApiHandlers = {
  ...organizationBase,
  [`/v1/organizations/${ORGANIZATION_ID}/`]: onWrite('PUT', organization, organization)
};

// ---------- Produtos ----------
export const PRODUCTS_PATH = '/products/';
export const PRODUCT_CREATE_PATH = `/products/create/?id_organization=${ORGANIZATION_ID}`;
export const PRODUCT_EDIT_PATH = `/products/create/?id_organization=${ORGANIZATION_ID}&id_product=${PRODUCT_ID}`;
const [product] = products.results;
const PRODUCTS_API = `/v1/organizations/${ORGANIZATION_ID}/products/`;
const NEW_PRODUCT = { ...product, id: 2, name: 'Novo Produto' };

/** A tela de produtos (para onde o cadastro volta) lista as organizações do GitHub da sessão para importar. */
const productsBase: ApiHandlers = { '/v1/accounts/github-organizations/': [] };

/** O Service cria o produto (CA2). */
export const criaProduto: ApiHandlers = {
  ...productsBase,
  [PRODUCTS_API]: onWrite('POST', { status: 201, json: NEW_PRODUCT }, products)
};

/** O Service recusa o nome já usado (CA3). */
export const produtoNomeRepetido: ApiHandlers = {
  ...productsBase,
  [PRODUCTS_API]: onWrite('POST', duplicate('name', 'Product with this name already exists.'), products)
};

/** O Service falha com 500 ao criar (CA3). */
export const produtoErro500: ApiHandlers = {
  ...productsBase,
  [PRODUCTS_API]: onWrite('POST', { status: 500, json: { detail: 'Erro interno do servidor.' } }, products)
};

/** O produto existente com a edição aceita (CA5). */
export const editaProduto: ApiHandlers = { ...productsBase, [`${PRODUCT_API}/`]: onWrite('PUT', product, product) };

/** A tela de produtos sem gravação (CA1 e CA4). */
export const telaDeProdutos: ApiHandlers = productsBase;

// ---------- Repositórios ----------
export const REPOSITORIES_PATH = `/products/${ORGANIZATION_ID}-${PRODUCT_ID}-MeasureSoftGram/repositories/`;
export const REPOSITORY_FORM_PATH = `${REPOSITORIES_PATH}manage-repository/`;
const REPOSITORIES_API = `${PRODUCT_API}/repositories/`;
/** Um repositório cadastrado à mão (editável) e um importado do provedor (só leitura). */
export const MANUAL = {
  id: 7,
  name: 'msg-manual',
  description: 'Cadastrado à mão',
  url: 'https://github.com/exemplo/msg-manual',
  platform: 'github',
  imported: false,
  latest_values: {}
};
export const IMPORTED = { ...MANUAL, id: 8, name: 'msg-importado', description: 'Veio do GitHub', imported: true };
const repositoryApi = (id: number) => `${REPOSITORIES_API}${id}/`;

const repositoriesBase: ApiHandlers = {
  [REPOSITORIES_API]: onWrite(
    'POST',
    { status: 201, json: { ...MANUAL, id: 9, name: 'msg-novo' } },
    page([MANUAL, IMPORTED])
  ),
  [repositoryApi(IMPORTED.id)]: IMPORTED
};

/** A edição do repositório manual é aceita (CA1 e CA2); o cadastro novo também (CA5). */
export const editaRepositorio: ApiHandlers = {
  ...repositoriesBase,
  [repositoryApi(MANUAL.id)]: onWrite('PUT', MANUAL, MANUAL)
};

/** O Service recusa o nome já usado no produto (CA4). */
export const repositorioNomeRepetido: ApiHandlers = {
  ...repositoriesBase,
  [repositoryApi(MANUAL.id)]: onWrite(
    'PUT',
    { status: 400, json: { non_field_errors: ['Repository with this name already exists.'] } },
    MANUAL
  )
};

/** O Service recusa a URL sem http(s) (CA4). */
export const repositorioUrlInvalida: ApiHandlers = {
  ...repositoriesBase,
  [repositoryApi(MANUAL.id)]: onWrite(
    'PUT',
    { status: 400, json: { url: ['The URL must start with http or https.'] } },
    MANUAL
  )
};

// ---------- Releases ----------
export const RELEASES_PATH = `/products/${ORGANIZATION_ID}-${PRODUCT_ID}-MeasureSoftGram/releases/`;
/** 12 releases mensais de 2026 (R01 a R12), do dia 1 ao dia 20; a R02 é a release da página de detalhes (id 2). */
export const RELEASES = Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, '0');
  return {
    id: index + 1,
    release_name: `R${month}`,
    start_at: `2026-${month}-01T12:00:00Z`,
    end_at: `2026-${month}-20T12:00:00Z`,
    created_by: 1,
    product: PRODUCT_ID,
    description: `Release de ${month}/2026`,
    goal: 70,
    repositories_ids: []
  };
});

/** As 12 releases do produto (CA1 a CA4). */
export const dozeReleases: ApiHandlers = { [`${PRODUCT_API}/release/`]: page(RELEASES) };
