import { CsvChart, CsvColumn } from '@utils/exportCsv';
import { PulseMeasurement, PulseRepositoryData } from '@utils/formatPulseChart';
import { getQualityBandClamped, QUALITY_BANDS, QualityBand } from '@utils/qualityBands';
import { translatedColumns } from '../i18n/translatedRecord';

/** Nome do dashboard de cada pulso e do gráfico nos arquivos exportados: `msgram-<produto|repositorio>-pulso-<data>.csv`. */
export const PULSE_CSV = { product: 'produto', repository: 'repositorio', pulse: 'pulso' };

export type ProductPulseCsvRow = { repository: string; date: string; value: number; grade: string };

const PRODUCT_PULSE_CSV_COLUMNS: CsvColumn<ProductPulseCsvRow>[] = translatedColumns<ProductPulseCsvRow>([
  ['repository', 'csv.repository'],
  ['date', 'csv.date'],
  ['value', 'csv.value'],
  ['grade', 'csv.grade']
]);

export type RepositoryPulseCsvRow = {
  repository: string;
  characteristic: string;
  date: string;
  value: number;
  grade: string;
};

const REPOSITORY_PULSE_CSV_COLUMNS: CsvColumn<RepositoryPulseCsvRow>[] = translatedColumns<RepositoryPulseCsvRow>([
  ['repository', 'csv.repository'],
  ['characteristic', 'csv.characteristic'],
  ['date', 'csv.date'],
  ['value', 'csv.value'],
  ['grade', 'csv.grade']
]);

function byDate(measurements: PulseMeasurement[]): PulseMeasurement[] {
  return [...measurements].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function toMeasurementFields({ created_at: date, value }: PulseMeasurement, bands: QualityBand[]) {
  return { date, value, grade: getQualityBandClamped(value, bands).grade };
}

/** CSV do pulso do produto: as medições do período filtrado de cada repositório, em ordem de data, com o grau (A a E). */
export function formatProductPulseCsv(
  repositories: PulseRepositoryData[],
  bands: QualityBand[] = QUALITY_BANDS
): CsvChart<ProductPulseCsvRow> {
  return {
    name: PULSE_CSV.pulse,
    columns: PRODUCT_PULSE_CSV_COLUMNS,
    rows: repositories.flatMap(({ name, measurements }) =>
      byDate(measurements).map((measurement) => ({ repository: name, ...toMeasurementFields(measurement, bands) }))
    )
  };
}

/** CSV do pulso das características do repositório: as medições do período filtrado de cada característica. */
export function formatRepositoryPulseCsv(
  repositoryName: string,
  characteristics: PulseRepositoryData[],
  bands: QualityBand[] = QUALITY_BANDS
): CsvChart<RepositoryPulseCsvRow> {
  return {
    name: PULSE_CSV.pulse,
    columns: REPOSITORY_PULSE_CSV_COLUMNS,
    rows: characteristics.flatMap(({ name, measurements }) =>
      byDate(measurements).map((measurement) => ({
        repository: repositoryName,
        characteristic: name,
        ...toMeasurementFields(measurement, bands)
      }))
    )
  };
}
