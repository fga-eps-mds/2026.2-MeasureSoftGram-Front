import { ApiHandlers } from '../../support/api';
import { page, PRODUCT_API, PRODUCT_PATH } from '../common';
import releaseConfig from '../../../src/mocks/fixtures/releaseConfig.json';

const { characteristics } = releaseConfig.data;

/** A configuração do modo mock no formato do contrato: as medidas levam os limites. */
const defaultPreConfig = {
  characteristics: characteristics.map((characteristic) => ({
    ...characteristic,
    subcharacteristics: characteristic.subcharacteristics.map((sub) => ({
      ...sub,
      measures: sub.measures.map((measure) => ({ ...measure, min_threshold: 0, max_threshold: 1 }))
    }))
  }))
};

/** A árvore de entidades com os nomes, como o Service devolve. */
const entityTree = characteristics.map(({ key, subcharacteristics }) => ({
  key,
  name: key,
  subcharacteristics: subcharacteristics.map((sub) => ({
    key: sub.key,
    name: sub.key,
    measures: sub.measures.map((measure) => ({ key: measure.key, name: measure.key }))
  }))
}));

export const RELEASE_CREATE_PATH = `${PRODUCT_PATH}/releases/create/`;

/** Dois repositórios no produto, para marcar e desmarcar um de cada vez. */
export const REPOSITORIOS = [
  { id: 1, name: 'msg-front', description: 'Interface web' },
  { id: 2, name: 'msg-service', description: null }
];

/**
 * O que o planejamento pede ao abrir (ReleaseCreation.tsx): os repositórios do produto, a árvore de entidades, a meta e
 * as configurações atual e padrão (as do modo mock, src/mocks/handlers.ts, no formato do contrato) e a matriz de balanceamento.
 */
export const comRepositorios: ApiHandlers = {
  [`${PRODUCT_API}/repositories/`]: page(
    REPOSITORIOS.map((repo) => ({
      ...repo,
      url: `https://github.com/exemplo/${repo.name}`,
      platform: 'github',
      imported: true,
      latest_values: {}
    }))
  ),
  [`${PRODUCT_API}/entity-relationship-tree/`]: entityTree,
  [`${PRODUCT_API}/current/goal/`]: { id: 1, created_at: '2026-02-01T12:00:00Z', data: {}, allow_dynamic: false },
  [`${PRODUCT_API}/default/pre-config/`]: defaultPreConfig,
  '/v1/balance-matrix/': page([])
};
