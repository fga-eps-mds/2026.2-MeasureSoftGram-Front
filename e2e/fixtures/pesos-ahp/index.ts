import { Page, Request } from '@playwright/test';
import { ApiHandlers } from '../../support/api';
import { page as paged, PRODUCT_API, PRODUCT_PATH } from '../common';
import { onWrite, RELEASES } from '../legados';
import { REPOSITORIOS, RELEASE_CREATE_PATH } from '../planejamento-release';

export { RELEASE_CREATE_PATH };
export const RELEASES_LIST_PATH = `${PRODUCT_PATH}/releases/`;

type Measure = { key: string; weight: number; min_threshold: number; max_threshold: number };
type Sub = { key: string; weight: number; measures: Measure[] };
type Characteristic = { key: string; weight: number; subcharacteristics: Sub[] };

const measure = (key: string, weight: number, min_threshold = 0, max_threshold = 100): Measure => ({
  key,
  weight,
  min_threshold,
  max_threshold
});

/**
 * O modelo padrão do Service (`DEFAULT_PRE_CONFIG`): 3 características, 4 subcaracterísticas e 9 medidas, com os pesos
 * divididos igualmente em cada grupo. São os grupos das telas do protótipo da US13.01 (8 grupos, 4 de peso único).
 */
export const DEFAULT_CONFIG: { characteristics: Characteristic[] } = {
  characteristics: [
    {
      key: 'reliability',
      weight: 34,
      subcharacteristics: [
        {
          key: 'testing_status',
          weight: 50,
          measures: [
            measure('passed_tests', 33, 0, 1),
            measure('test_builds', 33, 0, 300000),
            measure('test_coverage', 34, 60)
          ]
        },
        { key: 'maturity', weight: 50, measures: [measure('ci_feedback_time', 100, 1, 900)] }
      ]
    },
    {
      key: 'maintainability',
      weight: 33,
      subcharacteristics: [
        {
          key: 'modifiability',
          weight: 100,
          measures: [
            measure('non_complex_file_density', 25, 0, 10),
            measure('commented_file_density', 25, 10, 30),
            measure('duplication_absense', 25, 0, 5),
            measure('technical_debt_ratio', 25, 0, 20)
          ]
        }
      ]
    },
    {
      key: 'functional_suitability',
      weight: 33,
      subcharacteristics: [
        { key: 'functional_completeness', weight: 100, measures: [measure('team_throughput', 100, 45)] }
      ]
    }
  ]
};

/** A configuração atual do produto (a "Última configuração"), com os pesos das telas 12a/10 do protótipo. */
const lastData = structuredClone(DEFAULT_CONFIG);
lastData.characteristics[0].weight = 43;
lastData.characteristics[1].weight = 43;
lastData.characteristics[2].weight = 14;
lastData.characteristics[0].subcharacteristics[0].weight = 75;
lastData.characteristics[0].subcharacteristics[1].weight = 25;

export const LAST_CONFIG = { id: 7, name: 'MeasureSoftGram', created_at: '2026-11-30T15:00:00Z', data: lastData };

const entityTree = DEFAULT_CONFIG.characteristics.map(({ key, subcharacteristics }) => ({
  key,
  name: key,
  subcharacteristics: subcharacteristics.map((sub) => ({
    key: sub.key,
    name: sub.key,
    measures: sub.measures.map((m) => ({ key: m.key, name: m.key }))
  }))
}));

const SAATY_SCALE = {
  scale: { igual: 1, moderadamente: 3, fortemente: 5, muito_fortemente: 7, extremamente: 9 },
  phrases: {
    igual: 'igualmente importante',
    moderadamente: 'moderadamente mais importante',
    fortemente: 'fortemente mais importante',
    muito_fortemente: 'muito fortemente mais importante',
    extremamente: 'extremamente mais importante'
  },
  cr_threshold: 0.1
};

const NEW_RELEASE = {
  id: 13,
  release_name: 'Release 2026.3 — Sprint 5',
  start_at: '2026-12-01T00:00:00Z',
  end_at: '2026-12-15T00:00:00Z',
  goal: 1,
  description: '',
  repositories_ids: REPOSITORIOS.map((repo) => repo.id)
};

/**
 * Tudo o que o planejamento pede, do primeiro passo ao "Finalizar", e a lista de releases para onde ele leva depois
 * (ou para onde o menu leva no "Sair sem salvar").
 */
export const planejamentoComPesos: ApiHandlers = {
  [`${PRODUCT_API}/repositories/`]: paged(
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
  [`${PRODUCT_API}/default/pre-config/`]: DEFAULT_CONFIG,
  [`${PRODUCT_API}/current/release-config/`]: LAST_CONFIG,
  // O Service devolve a matriz em `result` (é o que o Front lê), mas o schema documenta uma página com `results`:
  // a resposta leva os dois, como a página real (count/next/previous) mais o campo do schema.
  '/v1/balance-matrix/': {
    ...paged([]),
    result: {
      reliability: { '+': ['functional_suitability', 'maintainability'], '-': [] },
      maintainability: { '+': ['functional_suitability', 'reliability'], '-': [] },
      functional_suitability: { '+': ['reliability', 'maintainability'], '-': [] }
    }
  },
  // O Service responde `{message}`; o schema documenta uma página. O Front só olha o status.
  [`${PRODUCT_API}/release/is-valid/`]: { ...paged([]), message: 'Parametros válidos para criação de Release' },
  [`${PRODUCT_API}/ahp/scale/`]: SAATY_SCALE,
  [`${PRODUCT_API}/create/release-config/`]: onWrite('POST', {
    id: 8,
    name: 'MeasureSoftGram',
    data: DEFAULT_CONFIG,
    created_at: '2026-12-01T12:00:00Z',
    created_config: true
  }),
  [`${PRODUCT_API}/create/goal/`]: onWrite('POST', { id: 2, changes: [], data: {}, allow_dynamic: false }),
  [`${PRODUCT_API}/release/`]: onWrite('POST', NEW_RELEASE, paged(RELEASES))
};

type Answer = { a: string; b: string; preferred: string | null; intensity: string };
type CalculateBody = { entities: string[]; answers: Answer[] };

const sameKeys = (x: string[], y: string[]) => x.length === y.length && x.every((key, i) => key === y[i]);

/** Pesos inteiros iguais que somam 100, os primeiros com a sobra (como o arredondamento do Core). */
function equalWeights(entities: string[]): Record<string, number> {
  const base = Math.floor(100 / entities.length);
  const rest = 100 - base * entities.length;
  return Object.fromEntries(entities.map((entity, index) => [entity, base + (index < rest ? 1 : 0)]));
}

/**
 * O cálculo é do Core (via Service); aqui só os vetores de referência da US13.02, conferidos no Service:
 * características 43/43/14 com CR 0, as medidas de Status de Teste em círculo com CR 4,95, e pesos iguais no resto.
 */
function calculate({ entities, answers }: CalculateBody) {
  const crFor = (consistent: boolean) => (entities.length > 2 ? (consistent ? 0 : 4.94505495) : null);
  const circular =
    answers.length === 3 &&
    answers.every((answer) => answer.intensity === 'muito_fortemente') &&
    sameKeys(entities, ['passed_tests', 'test_builds', 'test_coverage']);

  if (circular) {
    return {
      priorities: {},
      weights: { passed_tests: 34, test_builds: 33, test_coverage: 33 },
      consistency_ratio: crFor(false),
      consistent: false,
      cr_threshold: 0.1,
      conflict: null
    };
  }

  const referenceVector =
    sameKeys(entities, ['reliability', 'maintainability', 'functional_suitability']) &&
    answers.some((answer) => answer.intensity === 'moderadamente');
  const weights = referenceVector
    ? { reliability: 43, maintainability: 43, functional_suitability: 14 }
    : equalWeights(entities);

  return {
    priorities: {},
    weights,
    consistency_ratio: crFor(true),
    consistent: true,
    cr_threshold: 0.1,
    conflict: null
  };
}

/**
 * Responde à prévia (POST ahp/calculate/) lendo o corpo do pedido, o que o mock por caminho não faz. Registrada depois
 * do mock da fixture, tem prioridade sobre ele. Devolve os corpos recebidos.
 */
export async function simulaPrevia(page: Page): Promise<CalculateBody[]> {
  const bodies: CalculateBody[] = [];
  await page.route(`**/bff${PRODUCT_API}/ahp/calculate/`, async (route) => {
    const body = route.request().postDataJSON() as CalculateBody;
    bodies.push(body);
    await route.fulfill({ status: 200, json: calculate(body) });
  });
  return bodies;
}

/** Os POST de gravação do planejamento, com o corpo, na ordem em que saíram. */
export function gravacoes(page: Page): { path: string; body: any }[] {
  const writes: { path: string; body: any }[] = [];
  page.on('request', (request: Request) => {
    if (request.method() !== 'POST' || !request.url().includes('/bff/')) return;
    const { pathname } = new URL(request.url());
    if (pathname.endsWith('/ahp/calculate/')) return;
    writes.push({ path: pathname.replace(/^.*\/v1\//, '/v1/'), body: request.postDataJSON() });
  });
  return writes;
}

export const CONFIG_API = `${PRODUCT_API}/create/release-config/`;
