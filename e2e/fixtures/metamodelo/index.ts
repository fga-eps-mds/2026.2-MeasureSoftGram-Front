import { ApiHandlers, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH, RELEASES_API, releases } from '../common';
import arvoreR1 from './arvore-r1.json';
import arvoreR2 from './arvore-r2.json';

export const METAMODELO_PATH = `${PRODUCT_PATH}/dashboards/metamodelo/`;

/** Os endpoints da página (useMetamodelo), a partir do produto. */
export const METAMODELO_API = {
  releases: RELEASES_API,
  tree: `${PRODUCT_API}/quality-model-tree/`
};

/** Uma árvore por release pedida (?release_id=): R1 só com Maintainability; R2 com as duas características. */
const arvorePorRelease = (url: URL) => (url.searchParams.get('release_id') === '1' ? arvoreR1 : arvoreR2);

/**
 * R2 (atual): Reliability 60% e Maintainability 40%, uma subcaracterística em cada, quatro medidas com valores de
 * referência e a métrica total_builds usada por duas medidas (CI Feedback Time e Build Stability).
 */
export const comDados: ApiHandlers = {
  [METAMODELO_API.releases]: releases,
  [METAMODELO_API.tree]: arvorePorRelease
};

/** Produto sem release: a página só pede a lista de releases. */
export const semRelease: ApiHandlers = {
  [METAMODELO_API.releases]: []
};

/** A árvore falha com 500; a lista de releases carrega. */
export const erro500: ApiHandlers = {
  ...comDados,
  [METAMODELO_API.tree]: serverError
};

export { arvorePorRelease };
