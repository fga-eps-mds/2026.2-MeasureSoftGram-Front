import { ApiHandlers } from '../../support/api';
import { PRODUCT_API, PRODUCT_PATH, releases } from '../common';
import historicalValues from './historical-values.json';
import releaseHistory from './release-history.json';

/** A Visão Geral do produto, onde fica o gráfico de pulso. */
export const PRODUTO_PATH = `${PRODUCT_PATH}/`;

/** Os endpoints do pulso (usePulseChartData), a partir do produto; os ids dos repositórios são os mesmos nos dois. */
export const PRODUTO_API = {
  historicalValues: `${PRODUCT_API}/repositories-tsqmi-historical-values/`,
  releaseHistory: `${PRODUCT_API}/repositories-tsqmi-release-history/`
};

/** O histórico por release com R1 e R2 do common: o indicador consolidado de cada repositório em cada release. */
export const releaseHistoryComDados = {
  releases: releases.map((release) => ({
    id: release.id,
    release_name: release.release_name,
    start_at: release.start_at,
    end_at: release.end_at
  })),
  repositories: releaseHistory.repositories
};

/** Dois repositórios com várias medições em R1 e em R2; R1 sem base anterior e R2 com variação (CA1 a CA3, CA7). */
export const comDados: ApiHandlers = {
  [PRODUTO_API.historicalValues]: historicalValues,
  [PRODUTO_API.releaseHistory]: releaseHistoryComDados
};

/** Sem a medição de 0,76, o indicador do Service passa de B para A uma vez só e não volta (a falha do CA1). */
export const umaTrocaDeFaixa: ApiHandlers = {
  ...comDados,
  [PRODUTO_API.historicalValues]: {
    ...historicalValues,
    results: historicalValues.results.map((repo) => ({
      ...repo,
      history: repo.history.filter((measurement) => measurement.value !== 0.76)
    }))
  }
};

/** Os mesmos repositórios medidos, mas o produto não tem release cadastrada (CA6 e o começo do CA7). */
export const semReleases: ApiHandlers = {
  [PRODUTO_API.historicalValues]: historicalValues,
  [PRODUTO_API.releaseHistory]: { releases: [], repositories: [] }
};
