import { AnalysisDistribution, DistributionEntity } from '@customTypes/product';
import { DISTRIBUTION_LEVEL_LABELS } from '@utils/distributionCascade';
import { buildDensity } from '@utils/distributionDensity';
import { buildHistogram, Histogram } from '@utils/distributionHistogram';
import { SUMMARY_STATISTICS } from '@utils/distributionSummary';
import { CsvChart, CsvColumn } from '@utils/exportCsv';
import { getLevelBoxplotRows } from '@utils/formatDistributionCharts';
import i18n from '../i18n/i18n';
import { translatedColumns } from '../i18n/translatedRecord';

/** Nome do dashboard e de cada quadro nos arquivos exportados: `msgram-distribuicao-<quadro>-<data>.csv`. */
export const DISTRIBUTION_CSV = {
  dashboard: 'distribuicao',
  histogram: 'histograma',
  density: 'densidade',
  boxplot: 'boxplot',
  scatter: 'dispersao',
  summary: 'resumo'
};

/** Os filtros da tela, no começo de toda linha: a release, o repositório, o nível e a entidade. */
type FilterFields = { release: string; repository: string; level: string; entity: string };

const FILTER_COLUMNS: [keyof FilterFields, string][] = [
  ['release', 'csv.release'],
  ['repository', 'csv.repository'],
  ['level', 'csv.level'],
  ['entity', 'csv.entity']
];

/** No boxplot, cada linha é uma entidade da tela (a escolhida ou um filho), com o nível dela. */
function filterFields(distribution: AnalysisDistribution, entity = distribution.entity): FilterFields {
  return {
    release: distribution.release.release_name,
    repository: distribution.repository.name,
    level: DISTRIBUTION_LEVEL_LABELS[entity.level],
    entity: entity.name
  };
}

function entityValues(entity: DistributionEntity): number[] {
  return entity.analyses.map((analysis) => analysis.value);
}

/** O mesmo eixo e as mesmas faixas do histograma da tela. */
function entityHistogram(entity: DistributionEntity): Histogram {
  return buildHistogram(entityValues(entity), entity.level, entity.metric_type);
}

export type HistogramCsvRow = FilterFields & { start: number; end: number; count: number };

const HISTOGRAM_CSV_COLUMNS: CsvColumn<HistogramCsvRow>[] = translatedColumns<HistogramCsvRow>([
  ...FILTER_COLUMNS,
  ['start', 'csv.range-start'],
  ['end', 'csv.range-end'],
  ['count', 'csv.analyses-count']
]);

/** CSV do histograma: uma linha por faixa da tela, inclusive as vazias, com o início, o fim e a quantidade de análises. */
export function formatHistogramCsv(distribution: AnalysisDistribution): CsvChart<HistogramCsvRow> {
  const filters = filterFields(distribution);
  return {
    name: DISTRIBUTION_CSV.histogram,
    columns: HISTOGRAM_CSV_COLUMNS,
    rows: entityHistogram(distribution.entity).bins.map((bin) => ({
      ...filters,
      start: bin.start,
      end: bin.end,
      count: bin.count
    }))
  };
}

export type DensityCsvRow = FilterFields & { value: number; density: number };

const DENSITY_CSV_COLUMNS: CsvColumn<DensityCsvRow>[] = translatedColumns<DensityCsvRow>([
  ...FILTER_COLUMNS,
  ['value', 'csv.value'],
  ['density', 'csv.density']
]);

/** CSV da curva de densidade: os pontos da curva desenhada; sem linhas quando não há curva (menos de 3 análises). */
export function formatDensityCsv(distribution: AnalysisDistribution): CsvChart<DensityCsvRow> {
  const { entity } = distribution;
  const filters = filterFields(distribution);
  const { min, max } = entityHistogram(entity);
  const points = buildDensity(entityValues(entity), { min, max, iqr: entity.summary.iqr }) ?? [];
  return {
    name: DISTRIBUTION_CSV.density,
    columns: DENSITY_CSV_COLUMNS,
    rows: points.map((point) => ({ ...filters, value: point.x, density: point.y }))
  };
}

export type BoxplotCsvRow = FilterFields & {
  p10: number | null;
  q1: number | null;
  median: number | null;
  q3: number | null;
  p90: number | null;
  iqr: number | null;
  lower_limit: number | null;
  upper_limit: number | null;
  outliers: number;
};

const BOXPLOT_CSV_COLUMNS: CsvColumn<BoxplotCsvRow>[] = translatedColumns<BoxplotCsvRow>([
  ...FILTER_COLUMNS,
  ['p10', 'csv.p10'],
  ['q1', 'csv.q1'],
  ['median', 'csv.median'],
  ['q3', 'csv.q3'],
  ['p90', 'csv.p90'],
  ['iqr', 'csv.iqr'],
  ['lower_limit', 'csv.lower-limit'],
  ['upper_limit', 'csv.upper-limit'],
  ['outliers', 'csv.outliers-count']
]);

/**
 * CSV do boxplot do nível: uma linha por entidade da tela (a escolhida e os filhos que aparecem), com os percentis,
 * os limites e a quantidade de discrepantes do resumo do Service. No nível medida, só a linha da medida, como na tela.
 */
export function formatBoxplotCsv(distribution: AnalysisDistribution): CsvChart<BoxplotCsvRow> {
  return {
    name: DISTRIBUTION_CSV.boxplot,
    columns: BOXPLOT_CSV_COLUMNS,
    rows: getLevelBoxplotRows(distribution.entity, distribution.children).map(({ entity }) => {
      const { summary } = entity;
      return {
        ...filterFields(distribution, entity),
        p10: summary.p10,
        q1: summary.q1,
        median: summary.median,
        q3: summary.q3,
        p90: summary.p90,
        iqr: summary.iqr,
        lower_limit: summary.lower_limit,
        upper_limit: summary.upper_limit,
        outliers: summary.outliers
      };
    })
  };
}

export type ScatterCsvRow = FilterFields & { date: string; value: number; outlier: string };

const SCATTER_CSV_COLUMNS: CsvColumn<ScatterCsvRow>[] = translatedColumns<ScatterCsvRow>([
  ...FILTER_COLUMNS,
  ['date', 'csv.analysis-date'],
  ['value', 'csv.value'],
  ['outlier', 'csv.outlier']
]);

/** CSV da dispersão no tempo: uma linha por análise, na ordem de data, com a data como o Service devolve. */
export function formatScatterCsv(distribution: AnalysisDistribution): CsvChart<ScatterCsvRow> {
  const filters = filterFields(distribution);
  return {
    name: DISTRIBUTION_CSV.scatter,
    columns: SCATTER_CSV_COLUMNS,
    rows: distribution.entity.analyses.map((analysis) => ({
      ...filters,
      date: analysis.date,
      value: analysis.value,
      outlier: analysis.is_outlier ? i18n.t('csv.yes') : i18n.t('csv.no')
    }))
  };
}

export type SummaryCsvRow = FilterFields & { statistic: string; value: number | null };

const SUMMARY_CSV_COLUMNS: CsvColumn<SummaryCsvRow>[] = translatedColumns<SummaryCsvRow>([
  ...FILTER_COLUMNS,
  ['statistic', 'csv.statistic'],
  ['value', 'csv.value']
]);

/** CSV do resumo estatístico: uma linha por estatística da tela; a que o Service não calcula fica vazia. */
export function formatSummaryCsv(distribution: AnalysisDistribution): CsvChart<SummaryCsvRow> {
  const filters = filterFields(distribution);
  const { summary } = distribution.entity;
  return {
    name: DISTRIBUTION_CSV.summary,
    columns: SUMMARY_CSV_COLUMNS,
    rows: SUMMARY_STATISTICS.map(({ label, key }) => ({ ...filters, statistic: label, value: summary[key] }))
  };
}

export interface DistributionCsvCharts {
  histogram: CsvChart<HistogramCsvRow>;
  density: CsvChart<DensityCsvRow>;
  boxplot: CsvChart<BoxplotCsvRow>;
  scatter: CsvChart<ScatterCsvRow>;
  summary: CsvChart<SummaryCsvRow>;
}

/** Os cinco CSVs da página, com os dados que ela já carregou. */
export function formatDistributionCsvs(distribution: AnalysisDistribution): DistributionCsvCharts {
  return {
    histogram: formatHistogramCsv(distribution),
    density: formatDensityCsv(distribution),
    boxplot: formatBoxplotCsv(distribution),
    scatter: formatScatterCsv(distribution),
    summary: formatSummaryCsv(distribution)
  };
}
