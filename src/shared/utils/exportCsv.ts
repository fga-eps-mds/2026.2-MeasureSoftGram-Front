import JSZip from 'jszip';
import { format } from 'date-fns';

export type CsvValue = string | number | boolean | null | undefined;

/** Coluna do CSV: a chave do campo na linha e o título do cabeçalho. */
export interface CsvColumn<Row> {
  key: keyof Row & string;
  title: string;
}

/** Os dados de um gráfico para exportar: `name` vai no nome do arquivo (`msgram-<dashboard>-<name>-<data>.csv`). */
export interface CsvChart<Row = Record<string, CsvValue>> {
  name: string;
  columns: CsvColumn<Row>[];
  rows: Row[];
}

/** Título que as colunas de repositório têm nos formatadores dos dashboards (termo do GitHub). */
const REPOSITORY_COLUMN_TITLE = 'Repositório';

/** Troca o título "Repositório" das colunas pelo termo do provedor da sessão (ex.: "Projeto" no GitLab). */
export function withRepositoryTerm<Row>(chart: CsvChart<Row>, repositoryTerm: string): CsvChart<Row> {
  return {
    ...chart,
    columns: chart.columns.map((column) =>
      column.title === REPOSITORY_COLUMN_TITLE ? { ...column, title: repositoryTerm } : column
    )
  };
}

const CSV_TYPE = 'text/csv;charset=utf-8';
/**
 * O Excel em português usa `;` como separador de lista: com vírgula ele joga a linha inteira numa célula só, que foi
 * a ressalva do PO na homologação da US07.01 (03/11/2026). A vírgula fica livre para separar a casa decimal.
 */
const CSV_SEPARATOR = ';';
/** Sem a marca de ordem de bytes o Excel assume a codificação da máquina e os acentos saem trocados. */
const BOM = '\uFEFF';

/**
 * Campo entre aspas quando tem o separador, aspas ou quebra de linha, com as aspas dobradas (RFC 4180). Número sai
 * com vírgula decimal, senão o Excel em português lê `0.5` como texto e não soma nem ordena a coluna.
 */
function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? String(value).replace('.', ',') : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** CSV separado por ponto e vírgula, com o cabeçalho e uma linha por item, nos valores sem arredondar. */
export function toCsv<Row extends Record<string, CsvValue>>({
  columns,
  rows
}: Pick<CsvChart<Row>, 'columns' | 'rows'>) {
  const lines = [
    columns.map((column) => escapeCsvValue(column.title)),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])))
  ];
  return lines.map((line) => line.join(CSV_SEPARATOR)).join('\r\n');
}

export function csvFileName(dashboard: string, chart: string, date = new Date()): string {
  return `msgram-${dashboard}-${chart}-${format(date, 'yyyy-MM-dd')}.csv`;
}

function downloadFile(content: Blob, fileName: string) {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv<Row extends Record<string, CsvValue>>(dashboard: string, chart: CsvChart<Row>) {
  downloadFile(new Blob([BOM + toCsv(chart)], { type: CSV_TYPE }), csvFileName(dashboard, chart.name));
}

/** Um `.zip` (`msgram-<dashboard>-<data>.zip`) com um CSV por gráfico, já que cada gráfico tem colunas diferentes. */
export async function downloadCsvZip<Row extends Record<string, CsvValue>>(dashboard: string, charts: CsvChart<Row>[]) {
  const date = new Date();
  const zip = new JSZip();
  charts.forEach((chart) => zip.file(csvFileName(dashboard, chart.name, date), BOM + toCsv(chart)));
  const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  downloadFile(content, `msgram-${dashboard}-${format(date, 'yyyy-MM-dd')}.zip`);
}
