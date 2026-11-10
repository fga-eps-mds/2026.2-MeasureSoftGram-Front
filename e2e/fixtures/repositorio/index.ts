import { ApiHandlers, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH, RELEASES_API, releases } from '../common';
import repositories from '../temporal/repositories.json';
import characteristics from '../temporal/historical-characteristics.json';

const [service] = repositories.results;
export const REPOSITORY_PATH = `${PRODUCT_PATH}/repositories/${service.id}`;

const REPOSITORY_API_BASE = `${PRODUCT_API}/repositories/${service.id}`;

/** Os endpoints da tela do repositório (useQuery e useRepositoryPulse), a partir do produto. */
export const REPOSITORY_API = {
  repositories: `${PRODUCT_API}/repositories/`,
  repository: `${REPOSITORY_API_BASE}/`,
  tsqmi: `${REPOSITORY_API_BASE}/latest-values/tsqmi/`,
  // o <img> do badge também passa pelo page.route
  badge: `${REPOSITORY_API_BASE}/latest-values/tsqmi/badge/`,
  characteristics: `${REPOSITORY_API_BASE}/historical-values/characteristics/`,
  releases: RELEASES_API
};

/**
 * O Service com as medições de Reliability (julho a outubro, C → B → C, último valor 0,58) e de Maintainability
 * (A → B → D, último 0,30 depois do fim da R2); Functional Suitability não tem medição. As releases R1 e R2 valem para todos os
 * repositórios do produto.
 */
export const comDados: ApiHandlers = {
  [REPOSITORY_API.repositories]: repositories,
  [REPOSITORY_API.repository]: service,
  [REPOSITORY_API.tsqmi]: { id: 1, value: 0.62, created_at: '2026-10-10T12:00:00-03:00' },
  [REPOSITORY_API.badge]: {},
  [REPOSITORY_API.characteristics]: characteristics,
  [REPOSITORY_API.releases]: releases
};

/** Reliability só passa de C (0,55) para B (0,62 e 0,66): uma única troca de faixa, que quebra o pulso (CA3, fixme). */
export const umaTrocaDeFaixa: ApiHandlers = {
  ...comDados,
  [REPOSITORY_API.characteristics]: {
    results: [{ ...characteristics.results[0], history: characteristics.results[0].history.slice(1, 4) }]
  }
};

/** O repositório ainda não foi analisado: nenhuma característica tem medição (CA4). */
export const semMedicoes: ApiHandlers = {
  ...comDados,
  [REPOSITORY_API.characteristics]: {
    results: characteristics.results.map((item) => ({ ...item, history: [] }))
  }
};

/** O histórico das características falha com 500 (CA4). */
export const erro500: ApiHandlers = { ...comDados, [REPOSITORY_API.characteristics]: serverError };

/** O provedor não libera o repositório para o usuário: o Service responde 404 (CA4). */
export const semAcesso: ApiHandlers = {
  ...comDados,
  [REPOSITORY_API.repository]: { status: 404, json: { detail: 'Não encontrado.' } }
};
