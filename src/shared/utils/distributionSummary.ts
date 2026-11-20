import { format } from 'date-fns';
import { DistributionSummary } from '@customTypes/product';
import i18n from '../i18n/i18n';
import { dateLocale } from '../i18n/dateLocale';

/** O que aparece no lugar de uma estatística que o Service devolve null. */
export const MISSING_STATISTIC = '—';

/** A assimetria precisa de pelo menos 3 análises (a mesma regra do DISTORÇÃO). */
export const MIN_ANALYSES_FOR_SKEWNESS = 3;

/**
 * Estatística com duas casas e vírgula (CA8); null vira "—", e undefined também, para a tela não quebrar com um Service
 * que ainda não devolve o campo. Um valor que arredonda para zero perde o sinal, senão uma assimetria de −0,001
 * apareceria como "-0,00".
 */
export function formatStatistic(value: number | null | undefined): string {
  if (value === null || value === undefined) return MISSING_STATISTIC;
  const rounded = Math.abs(value) < 0.005 ? 0 : value;
  return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Contagem com separador de milhar: 1.284. */
export function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function formatAnalysisCount(count: number): string {
  return i18n.t('dashboards:distribution.analysis-count', { count, formatted: formatCount(count) });
}

export interface SummaryRow {
  label: string;
  value: string;
  /** O IQR fica destacado, como na referência. */
  highlight?: boolean;
}

/** Uma estatística do resumo (CA8): o rótulo da tela e o campo do resumo do Service. */
export interface SummaryStatistic {
  label: string;
  key: keyof DistributionSummary;
  highlight?: boolean;
}

/** As estatísticas do resumo, na ordem da referência; a tela e o CSV usam a mesma lista. */
const summaryStatistic = (key: keyof DistributionSummary, highlight?: boolean): SummaryStatistic => ({
  key,
  ...(highlight ? { highlight } : {}),
  get label() {
    return i18n.t(`dashboards:distribution.summary.${key}`);
  }
});

export const SUMMARY_STATISTICS: SummaryStatistic[] = [
  summaryStatistic('count'),
  summaryStatistic('min'),
  summaryStatistic('q1'),
  summaryStatistic('median'),
  summaryStatistic('q3'),
  summaryStatistic('max'),
  summaryStatistic('iqr', true),
  summaryStatistic('lower_limit'),
  summaryStatistic('upper_limit'),
  summaryStatistic('outliers'),
  summaryStatistic('mean'),
  summaryStatistic('std'),
  summaryStatistic('variance'),
  summaryStatistic('skewness')
];

/** Contagens sem casas e o resto com duas. */
function formatSummaryValue(key: keyof DistributionSummary, value: number | null): string {
  if (value !== null && (key === 'count' || key === 'outliers')) return formatCount(value);
  return formatStatistic(value);
}

/** Linhas do resumo estatístico (CA8), na ordem da referência. */
export function getSummaryRows(summary: DistributionSummary): SummaryRow[] {
  return SUMMARY_STATISTICS.map(({ label, key, highlight }) => ({
    label,
    value: formatSummaryValue(key, summary[key]),
    ...(highlight ? { highlight } : {})
  }));
}

/** O que o sinal da assimetria diz sobre as análises; null quando o Service não a calcula. */
export function describeSkewness(skewness: number | null): string | null {
  if (skewness === null) return null;
  const value = formatStatistic(skewness);
  if (value === formatStatistic(0)) {
    return i18n.t('dashboards:distribution.skewness.zero');
  }
  if (skewness > 0) {
    return i18n.t('dashboards:distribution.skewness.positive', { value });
  }
  return i18n.t('dashboards:distribution.skewness.negative', { value });
}

/**
 * Por que a assimetria ficou de fora (CA9): com menos de 3 análises, faltam análises; com 3 ou mais e o Service
 * devolvendo null, todas têm o mesmo valor (desvio zero). Null quando ela foi calculada.
 */
export function getSkewnessWarning({
  count,
  skewness
}: Pick<DistributionSummary, 'count' | 'skewness'>): string | null {
  if (count < MIN_ANALYSES_FOR_SKEWNESS) {
    return i18n.t('dashboards:distribution.skewness.few-analyses', {
      min: MIN_ANALYSES_FOR_SKEWNESS,
      amount: formatAnalysisCount(count)
    });
  }
  if (skewness === null) return i18n.t('dashboards:distribution.skewness.same-value');
  return null;
}

/** Período das análises (CA3): "17 ago a 16 out"; com o ano se as datas forem de anos diferentes; "17 ago" num dia só. */
export function formatPeriod(first: string, last: string): string {
  const start = new Date(first);
  const end = new Date(last);
  const pattern = start.getFullYear() === end.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  const from = format(start, pattern, { locale: dateLocale() });
  const to = format(end, pattern, { locale: dateLocale() });
  return from === to ? from : i18n.t('dashboards:distribution.period', { from, to });
}
