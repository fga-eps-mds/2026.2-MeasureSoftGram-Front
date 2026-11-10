import { ApiHandlers, Handler, serverError } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH, RELEASES_API, releases } from '../common';
import releaseRepositories from '../distribuicao/release-repositories.json';
import summary from './summary.json';
import analysisData from './analysis-data.json';

export const OVERVIEW_PATH = `${PRODUCT_PATH}/dashboards/overview/`;

/** Os endpoints da página (useOverviewDashboard), a partir do produto. */
export const OVERVIEW_API = {
  releases: RELEASES_API,
  summary: `${PRODUCT_API}/release-dashboard/summary/`,
  characteristics: `${PRODUCT_API}/release-dashboard/characteristics/`,
  analysis: (releaseId: number) => `${PRODUCT_API}/release/${releaseId}/analysis_data/`
};

const [r1] = releases;
const releaseOf = (release: typeof r1) => ({
  id: release.id,
  release_name: release.release_name,
  start_at: release.start_at,
  end_at: release.end_at
});

/** R1, a release anterior: outros totais, outro indicador e outro realizado, para ver a troca de release. */
const summaryR1 = { release: releaseOf(r1), totals: { ...summary.totals, repositories: 1, files: 312 } };
const characteristicsR1 = {
  release: releaseOf(r1),
  repositories: [
    { id: 7, name: 'MeasureSoftGram-Service', tsqmi: { value: 0.45, created_at: '2026-08-10T18:40:00-03:00' } },
    { id: 9, name: 'MeasureSoftGram-Front', tsqmi: { value: 0.81, created_at: '2026-08-10T18:40:00-03:00' } }
  ]
};
const analysisR1 = {
  ...analysisData,
  release: { ...analysisData.release, ...r1 },
  accomplished: [
    {
      repository_name: 'MeasureSoftGram-Service',
      characteristics: [
        { name: 'reliability', value: 0.5 },
        { name: 'maintainability', value: 0.45 }
      ],
      norm_diff: 0.12
    }
  ]
};

/** A resposta da release pedida na query (?release_id=); a página pede a atual (R2) e a anterior (R1). */
const byRelease = (bodyR1: unknown, bodyR2: unknown) => (url: URL) =>
  ({ '1': bodyR1, '2': bodyR2 }[url.searchParams.get('release_id') ?? '']);

/**
 * R2 (atual) e R1. Na R2, o indicador do Service (0,62, B) e do Front (0,58, C), com o Action sem análise; no
 * planejado × realizado, o Action vem primeiro e sem realizado, o Service com as duas características e o Front sem
 * Manutenibilidade.
 */
export const comDados: ApiHandlers = {
  [OVERVIEW_API.releases]: releases,
  [OVERVIEW_API.summary]: byRelease(summaryR1, summary),
  [OVERVIEW_API.characteristics]: byRelease(characteristicsR1, releaseRepositories),
  [OVERVIEW_API.analysis(1)]: analysisR1,
  [OVERVIEW_API.analysis(2)]: analysisData
};

const slow = (handler: Handler) => (url: URL) => {
  const json = typeof handler === 'function' ? handler(url) : handler;
  return json === undefined ? undefined : { status: 200, json, delayMs: 2000 };
};

/** Os três pedidos dos cards demoram 2 s, para ver o estado "Carregando" (CA4). */
export const carregando: ApiHandlers = {
  ...comDados,
  [OVERVIEW_API.summary]: slow(comDados[OVERVIEW_API.summary]),
  [OVERVIEW_API.characteristics]: slow(comDados[OVERVIEW_API.characteristics]),
  [OVERVIEW_API.analysis(2)]: slow(analysisData)
};

/** Nenhum repositório tem análise na R2: sem indicador e sem realizado (CA4). */
export const semAnalise: ApiHandlers = {
  ...comDados,
  [OVERVIEW_API.characteristics]: {
    ...releaseRepositories,
    repositories: releaseRepositories.repositories.map((item) => ({
      ...item,
      tsqmi: { value: null, created_at: null }
    }))
  },
  [OVERVIEW_API.analysis(2)]: { ...analysisData, accomplished: [] }
};

/** A R2 sem modelo de qualidade configurado: o Service devolve 0 nos quatro níveis do modelo (CA4). */
export const semModelo: ApiHandlers = {
  ...comDados,
  [OVERVIEW_API.summary]: {
    ...summary,
    totals: { ...summary.totals, characteristics: 0, subcharacteristics: 0, measures: 0, metrics: 0 }
  }
};

/** Os três cards falham com 500; a lista de releases carrega (CA4). */
export const erro500: ApiHandlers = {
  ...comDados,
  [OVERVIEW_API.summary]: serverError,
  [OVERVIEW_API.characteristics]: serverError,
  [OVERVIEW_API.analysis(2)]: serverError
};

/** A lista de releases falha com 500; os cards respondem depois da nova tentativa (CA4). */
export const erroReleases: ApiHandlers = { ...comDados, [OVERVIEW_API.releases]: serverError };

/** Produto sem release: a página só pede a lista de releases (CA4). */
export const semRelease: ApiHandlers = { [OVERVIEW_API.releases]: [] };
