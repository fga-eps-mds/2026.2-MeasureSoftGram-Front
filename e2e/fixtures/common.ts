import { ApiHandlers } from '../support/api';
import user from '../../src/mocks/fixtures/user.json';
import organizations from '../../src/mocks/fixtures/organizations.json';
import products from '../../src/mocks/fixtures/products.json';
import repositories from '../../src/mocks/fixtures/repositories.json';
import releaseConfig from '../../src/mocks/fixtures/releaseConfig.json';
import releaseList from './releases.json';
import { QUALITY_BANDS } from '../../src/shared/utils/qualityBands';

/** Organização e produto das fixtures de src/mocks: a URL das páginas do produto é /products/{org}-{produto}-{nome}/. */
export const ORGANIZATION_ID = 1;
export const PRODUCT_ID = 1;
export const PRODUCT_PATH = `/products/${ORGANIZATION_ID}-${PRODUCT_ID}-MeasureSoftGram`;
export const PRODUCT_API = `/v1/organizations/${ORGANIZATION_ID}/products/${PRODUCT_ID}`;

export const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

/** Releases do produto usadas pelos dashboards: R1 (encerrada) e R2 (atual). */
export const RELEASES_API = `${PRODUCT_API}/release/`;
export const releases = releaseList;

/** O que o layout, o AuthContext e os providers pedem em qualquer página do produto. */
export const common: ApiHandlers = {
  '/v1/accounts/': user,
  '/v1/organizations/': organizations,
  [`/v1/organizations/${ORGANIZATION_ID}/`]: organizations.results[0],
  [`/v1/organizations/${ORGANIZATION_ID}/products/`]: products,
  [`${PRODUCT_API}/`]: products.results[0],
  [`${PRODUCT_API}/repositories/`]: repositories,
  [`${PRODUCT_API}/repositories-tsqmi-latest-values/`]: EMPTY_PAGE,
  [`${PRODUCT_API}/current/release-config/`]: releaseConfig,
  // a Visão Geral do produto, de onde o menu leva aos dashboards
  [`${PRODUCT_API}/repositories-tsqmi-historical-values/`]: EMPTY_PAGE,
  [`${PRODUCT_API}/repositories-tsqmi-release-history/`]: { releases: [], repositories: [] },
  // as faixas do produto (US30.02), que o pulso e os dashboards pedem; aqui, as padrão
  [`${PRODUCT_API}/quality-bands/`]: {
    is_default: true,
    can_edit: true,
    bands: QUALITY_BANDS.map(({ grade, min, max }) => ({ key: grade, min, max }))
  }
};

/** Organização sem produto: o menu lateral fica sem os itens do produto. */
export const semProduto: ApiHandlers = {
  [`/v1/organizations/${ORGANIZATION_ID}/products/`]: EMPTY_PAGE
};
