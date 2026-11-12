import type { AnyCsvChart } from '@utils/exportCsv';

/** Título que as colunas de repositório têm nos formatadores dos dashboards (termo do GitHub). */
const REPOSITORY_COLUMN_TITLE = 'Repositório';

/**
 * Troca o título "Repositório" das colunas pelo termo do provedor da sessão (ex.: "Projeto" no GitLab). Fica fora de
 * exportCsv para os testes que simulam o download (jest.mock de @utils/exportCsv) continuarem valendo.
 */
export function withRepositoryTerm<Chart extends AnyCsvChart>(chart: Chart, repositoryTerm: string): Chart {
  return {
    ...chart,
    columns: chart.columns.map((column) =>
      column.title === REPOSITORY_COLUMN_TITLE ? { ...column, title: repositoryTerm } : column
    )
  };
}
