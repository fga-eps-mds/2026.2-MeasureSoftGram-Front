/**
 * Handlers REST do modo mock (MSW). Cobrem os endpoints que as telas
 * autenticadas principais consomem, para que o Front rode sem nenhum backend.
 *
 * Os padroes usam curinga ("*") no inicio porque o axios (src/shared/services/api.ts)
 * monta URLs absolutas a partir de NEXT_PUBLIC_API_URL/SERVICE_URL. Assim os
 * handlers casam independentemente do host configurado, contanto que o caminho
 * comece em "/v1/...".
 */
import { rest } from 'msw';

import user from './fixtures/user.json';
import organizations from './fixtures/organizations.json';
import products from './fixtures/products.json';
import repositories from './fixtures/repositories.json';
import releaseConfig from './fixtures/releaseConfig.json';
import characteristicsLatestValues from './fixtures/characteristicsLatestValues.json';

// Token fake devolvido pelos fluxos de autenticacao do modo mock.
export const MOCK_TOKEN = 'mock-token-msg';

// Faixas de qualidade do produto (US30.01): o modo mock guarda em memoria o que foi salvo, como o Service.
const DEFAULT_QUALITY_BANDS = [
  { key: 'E', min: 0, max: 0.2 },
  { key: 'D', min: 0.2, max: 0.4 },
  { key: 'C', min: 0.4, max: 0.6 },
  { key: 'B', min: 0.6, max: 0.8 },
  { key: 'A', min: 0.8, max: 1 }
];
let mockQualityBands: typeof DEFAULT_QUALITY_BANDS | null = null;
const qualityBandsResponse = () => ({
  is_default: mockQualityBands === null,
  can_edit: true,
  bands: mockQualityBands ?? DEFAULT_QUALITY_BANDS
});

export const handlers = [
  // ----- Autenticacao -----
  rest.post('*/v1/accounts/login/', (_req, res, ctx) => res(ctx.status(200), ctx.json({ key: MOCK_TOKEN }))),
  rest.post('*/v1/accounts/github/login/', (_req, res, ctx) => res(ctx.status(200), ctx.json({ key: MOCK_TOKEN }))),
  rest.post('*/v1/accounts/gitlab/login/', (_req, res, ctx) => res(ctx.status(200), ctx.json({ key: MOCK_TOKEN }))),
  rest.post('*/v1/accounts/github/validate/', (_req, res, ctx) => res(ctx.status(200), ctx.json({ valid: true }))),
  rest.post('*/v1/accounts/gitlab/validate/', (_req, res, ctx) => res(ctx.status(200), ctx.json({ valid: true }))),
  rest.post('*/v1/accounts/signin/', (_req, res, ctx) => res(ctx.status(201), ctx.json({}))),
  rest.delete('*/v1/accounts/logout/', (_req, res, ctx) => res(ctx.status(200), ctx.json({}))),
  rest.get('*/v1/accounts/access-token', (_req, res, ctx) => res(ctx.status(200), ctx.json({ ...user, key: MOCK_TOKEN }))),
  rest.get('*/v1/accounts/users/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({ count: 1, next: null, previous: null, results: [user] }))
  ),
  rest.get('*/v1/accounts/github-organizations/', (_req, res, ctx) => res(ctx.status(200), ctx.json([]))),
  rest.get('*/v1/accounts/gitlab-namespaces/', (_req, res, ctx) => res(ctx.status(200), ctx.json([]))),
  rest.get('*/v1/accounts/user-repos', (_req, res, ctx) => res(ctx.status(200), ctx.json({ total_count: 0, items: [] }))),
  // getUserInfo: GET /v1/accounts/ (mantido apos os demais /accounts/ para nao capturar as rotas acima).
  rest.get('*/v1/accounts/', (_req, res, ctx) => res(ctx.status(200), ctx.json(user))),

  // ----- Organizacoes -----
  rest.get('*/v1/organizations/', (_req, res, ctx) => res(ctx.status(200), ctx.json(organizations))),
  rest.post('*/v1/organizations/', (_req, res, ctx) => res(ctx.status(201), ctx.json(organizations.results[0]))),
  rest.post('*/v1/organizations/import/', (_req, res, ctx) => res(ctx.status(201), ctx.json(organizations.results[0]))),
  rest.get('*/v1/organizations/:orgId/github-repos/', (_req, res, ctx) => res(ctx.status(200), ctx.json([]))),
  rest.get('*/v1/organizations/:orgId/gitlab-projects/', (_req, res, ctx) => res(ctx.status(200), ctx.json([]))),
  rest.get('*/gitlab-projects/', (_req, res, ctx) => res(ctx.status(200), ctx.json([]))),
  rest.get('*/v1/organizations/:orgId/', (_req, res, ctx) => res(ctx.status(200), ctx.json(organizations.results[0]))),

  // ----- Produtos -----
  rest.get('*/v1/organizations/:orgId/products/', (_req, res, ctx) => res(ctx.status(200), ctx.json(products))),
  rest.post('*/v1/organizations/:orgId/products/', (_req, res, ctx) => res(ctx.status(201), ctx.json(products.results[0]))),
  rest.get('*/v1/organizations/:orgId/products/:productId/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(products.results[0]))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/repositories', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(repositories))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/current/release-config/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(releaseConfig))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/default/pre-config/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(releaseConfig.data))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/entity-relationship-tree/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(releaseConfig.data.characteristics))
  ),
  rest.get(
    '*/v1/organizations/:orgId/products/:productId/repositories/:repositoryId/latest-values/characteristics/',
    (_req, res, ctx) => res(ctx.status(200), ctx.json(characteristicsLatestValues))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/current/goal/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({ id: 1, created_at: '2026-02-01T12:00:00Z', data: {}, allow_dynamic: false }))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/all/goal/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json([]))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/release/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json([]))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/quality-model-tree/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json([]))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/repositories-tsqmi-historical-values/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({ count: 0, next: null, previous: null, results: [] }))
  ),
  // Sem release cadastrada (como em release/ acima): a tela mostra o empty state do histórico por release.
  rest.get('*/v1/organizations/:orgId/products/:productId/repositories-tsqmi-release-history/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({ releases: [], repositories: [] }))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/repositories-tsqmi-latest-values/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({ count: 0, next: null, previous: null, results: [] }))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/repositories/:repositoryId/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(repositories.results[0]))
  ),
  rest.get('*/v1/organizations/:orgId/products/:productId/quality-bands/', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(qualityBandsResponse()))
  ),
  rest.put('*/v1/organizations/:orgId/products/:productId/quality-bands/', async (req, res, ctx) => {
    const { bands } = await req.json();
    mockQualityBands = bands;
    return res(ctx.status(200), ctx.json(qualityBandsResponse()));
  }),
  rest.delete('*/v1/organizations/:orgId/products/:productId/quality-bands/', (_req, res, ctx) => {
    mockQualityBands = null;
    return res(ctx.status(200), ctx.json(qualityBandsResponse()));
  }),

  // ----- Fallback -----
  // Qualquer outro GET sob /v1/.../latest-values|historical-values devolve lista vazia,
  // evitando erro de rede em telas secundarias ainda nao mapeadas.
  rest.get('*/v1/*latest-values*', (_req, res, ctx) => res(ctx.status(200), ctx.json([]))),
  rest.get('*/v1/*historical-values*', (_req, res, ctx) => res(ctx.status(200), ctx.json({ results: [] })))
];
