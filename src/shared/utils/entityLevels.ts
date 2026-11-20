import { EntityLevel } from '@customTypes/product';
import i18n from '../i18n/i18n';
import { translatedRecord } from '../i18n/translatedRecord';

export const noDataLabel = (): string => i18n.t('entity.no-data');

export const LEVEL_LABELS: Record<EntityLevel, string> = translatedRecord({
  characteristic: 'entity.level.characteristic',
  subcharacteristic: 'entity.level.subcharacteristic',
  measure: 'entity.level.measure',
  metric: 'entity.level.metric'
});

const METRIC_UNITS: Record<string, string> = {
  PERCENT: '%',
  MILLISEC: 'ms'
};

export function getMetricUnit(metricType?: string): string {
  return (metricType && METRIC_UNITS[metricType]) || '';
}

/** Valores de característica, subcaracterística e medida vão de 0 a 1; métrica usa o valor coletado. */
export function formatEntityValue(value: number | null, level: EntityLevel, metricType?: string): string {
  if (value === null || value === undefined) return noDataLabel();
  if (level !== 'metric') return value.toFixed(2);

  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
  const unit = getMetricUnit(metricType);
  return unit ? `${formatted} ${unit}` : formatted;
}
