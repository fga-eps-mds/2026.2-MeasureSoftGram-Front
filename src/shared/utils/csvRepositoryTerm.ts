import type { AnyCsvChart } from '@utils/exportCsv';
import i18n from '../i18n/i18n';

/** Título que as colunas de repositório têm nos formatadores dos dashboards (termo do GitHub). */

/**
 * Troca o título "Repositório" das colunas pelo termo do provedor da sessão (ex.: "Projeto" no GitLab). Fica fora de
 * exportCsv para os testes que simulam o download (jest.mock de @utils/exportCsv) continuarem valendo.
 */
export function withRepositoryTerm<Chart extends AnyCsvChart>(chart: Chart, repositoryTerm: string): Chart {
  return {
    ...chart,
    columns: chart.columns.map((column) =>
      column.title === i18n.t('csv.repository') ? { ...column, title: repositoryTerm } : column
    )
  };
}
