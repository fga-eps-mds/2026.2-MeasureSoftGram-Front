import { CharacteristicComparison } from '@utils/comparePlannedAccomplished';
import { CsvChart, CsvColumn } from '@utils/exportCsv';
import { TotalItem, TsqmiBar } from '@utils/formatOverviewCharts';
import { getQualityBandClamped, QUALITY_BANDS, QualityBand } from '@utils/qualityBands';
import { translatedColumns } from '../i18n/translatedRecord';

/** Nome do dashboard e de cada gráfico nos arquivos exportados: `msgram-overview-<grafico>-<data>.csv`. */
export const OVERVIEW_CSV = {
  dashboard: 'overview',
  totals: 'totais',
  indicator: 'indicador',
  plannedAccomplished: 'planejado-realizado',
  radar: 'radar'
};

/** A release escolhida, no começo de toda linha. */
type ReleaseField = { release: string };

/** `quantity` fica vazia no total que não se aplica à release, como nos outros CSVs do produto. */
export type TotalsCsvRow = ReleaseField & { total: string; quantity: number | null };

const TOTALS_CSV_COLUMNS: CsvColumn<TotalsCsvRow>[] = translatedColumns<TotalsCsvRow>([
  ['release', 'csv.release'],
  ['total', 'csv.total'],
  ['quantity', 'csv.quantity']
]);

/** CSV dos totais da release: uma linha por total que já chegou. */
export function formatTotalsCsv(releaseName: string, items: TotalItem[]): CsvChart<TotalsCsvRow> {
  return {
    name: OVERVIEW_CSV.totals,
    columns: TOTALS_CSV_COLUMNS,
    rows: items.flatMap(({ label, value }) =>
      value === undefined ? [] : [{ release: releaseName, total: label, quantity: value }]
    )
  };
}

export type IndicatorCsvRow = ReleaseField & { repository: string; indicator: number; grade: string };

const INDICATOR_CSV_COLUMNS: CsvColumn<IndicatorCsvRow>[] = translatedColumns<IndicatorCsvRow>([
  ['release', 'csv.release'],
  ['repository', 'csv.repository'],
  ['indicator', 'csv.indicator'],
  ['grade', 'csv.grade']
]);

/** CSV do Indicador Total da Qualidade: o valor e o grau (A a E) de cada barra da tela, na mesma ordem. */
export function formatIndicatorCsv(
  releaseName: string,
  bars: TsqmiBar[],
  bands: QualityBand[] = QUALITY_BANDS
): CsvChart<IndicatorCsvRow> {
  return {
    name: OVERVIEW_CSV.indicator,
    columns: INDICATOR_CSV_COLUMNS,
    rows: bars.map((bar) => ({
      release: releaseName,
      repository: bar.name,
      indicator: bar.value,
      grade: getQualityBandClamped(bar.value, bands).grade
    }))
  };
}

type RepositoryFields = ReleaseField & { repository: string; characteristic: string };

const REPOSITORY_COLUMNS: [keyof RepositoryFields, string][] = [
  ['release', 'csv.release'],
  ['repository', 'csv.repository'],
  ['characteristic', 'csv.characteristic']
];

export type PlannedAccomplishedCsvRow = RepositoryFields & {
  planned: number;
  accomplished: number | null;
  difference: number | null;
  normDiff: number | null;
};

const PLANNED_ACCOMPLISHED_CSV_COLUMNS: CsvColumn<PlannedAccomplishedCsvRow>[] =
  translatedColumns<PlannedAccomplishedCsvRow>([
    ...REPOSITORY_COLUMNS,
    ['planned', 'csv.planned'],
    ['accomplished', 'csv.accomplished'],
    ['difference', 'csv.difference'],
    ['normDiff', 'csv.norm-diff']
  ]);

/**
 * CSV do planejado × realizado do repositório escolhido: uma linha por característica planejada, com a diferença
 * (Rp − Rd) e o desvio geral do repositório, que se repete nas linhas. Sem realizado, o realizado e a diferença ficam vazios.
 */
export function formatPlannedAccomplishedCsv(
  releaseName: string,
  repositoryName: string,
  comparisons: CharacteristicComparison[],
  normDiff: number | null | undefined,
  nameOf: (key: string) => string
): CsvChart<PlannedAccomplishedCsvRow> {
  return {
    name: OVERVIEW_CSV.plannedAccomplished,
    columns: PLANNED_ACCOMPLISHED_CSV_COLUMNS,
    rows: comparisons.map((comparison) => ({
      release: releaseName,
      repository: repositoryName,
      characteristic: nameOf(comparison.key),
      planned: comparison.rp,
      accomplished: comparison.rd,
      difference: comparison.delta,
      normDiff: normDiff ?? null
    }))
  };
}

export type RadarCsvRow = RepositoryFields & { value: number | null };

const RADAR_CSV_COLUMNS: CsvColumn<RadarCsvRow>[] = translatedColumns<RadarCsvRow>([
  ...REPOSITORY_COLUMNS,
  ['value', 'csv.value']
]);

/** CSV do radar: os mesmos valores do realizado (Rd), um por eixo; o eixo sem realizado fica sem valor, como sem ponto. */
export function formatRadarCsv(
  releaseName: string,
  repositoryName: string,
  comparisons: CharacteristicComparison[],
  nameOf: (key: string) => string
): CsvChart<RadarCsvRow> {
  return {
    name: OVERVIEW_CSV.radar,
    columns: RADAR_CSV_COLUMNS,
    rows: comparisons.map((comparison) => ({
      release: releaseName,
      repository: repositoryName,
      characteristic: nameOf(comparison.key),
      value: comparison.rd
    }))
  };
}
