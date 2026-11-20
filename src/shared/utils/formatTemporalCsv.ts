import { format } from 'date-fns';
import { CsvChart, CsvColumn } from '@utils/exportCsv';
import { TimeGranularity, TimeSeries } from '@utils/historicalValues';
import i18n from '../i18n/i18n';

/** Nome do dashboard e de cada gráfico nos arquivos exportados: `msgram-temporal-<grafico>-<data>.csv`. */
export const TEMPORAL_CSV = {
  dashboard: 'temporal',
  characteristics: 'caracteristicas',
  subcharacteristics: 'subcaracteristicas',
  measures: 'medidas',
  metrics: 'metricas'
} as const;

export type TemporalCsvLevel = Exclude<keyof typeof TEMPORAL_CSV, 'dashboard'>;

export type TemporalCsvRow = { repository: string; entity: string; date: string; value: number };

const temporalCsvColumns = (): CsvColumn<TemporalCsvRow>[] => [
  { key: 'repository', title: i18n.t('csv.repository') },
  { key: 'entity', title: i18n.t('csv.entity') },
  { key: 'date', title: i18n.t('csv.date') },
  { key: 'value', title: i18n.t('csv.value') }
];

const DATE_FORMATS: Record<TimeGranularity, string> = { day: 'yyyy-MM-dd', month: 'yyyy-MM' };

/**
 * CSV de um gráfico da Evolução Temporal: uma linha por ponto das entidades filtradas, na data do eixo da tela
 * (dia ou mês) e com o valor sem arredondar.
 */
export function formatTemporalCsv(
  level: TemporalCsvLevel,
  repositoryName: string,
  series: TimeSeries[],
  granularity: TimeGranularity
): CsvChart<TemporalCsvRow> {
  return {
    name: TEMPORAL_CSV[level],
    columns: temporalCsvColumns(),
    rows: series.flatMap(({ name, points }) =>
      points.map(([time, value]) => ({
        repository: repositoryName,
        entity: name,
        date: format(time, DATE_FORMATS[granularity]),
        value
      }))
    )
  };
}
