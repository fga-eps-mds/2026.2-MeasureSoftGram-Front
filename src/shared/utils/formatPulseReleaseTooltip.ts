import { COLOR_TOKENS, PulseRelease, PulseReleaseHover, getQualityStatus } from '@utils/formatPulseChart';
import { escapeHtml, formatDecimal, formatQualityGrade, formatVariation } from '@utils/formatOverviewCharts';
import { QUALITY_BANDS, QualityBand } from '@utils/qualityBands';
import i18n from '../i18n/i18n';
import { intlLocale } from '../i18n/dateLocale';

/** +12,50% ou −3,10%, com o sinal de menos tipográfico. */
export function formatVariationPercent(percent: number): string {
  const rounded = Math.round(percent * 100) / 100;
  const formatted = Math.abs(rounded).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (rounded === 0) return `${formatted}%`;
  return `${rounded > 0 ? '+' : '−'}${formatted}%`;
}

function variationColor(variation: number): string {
  if (variation > 0) return COLOR_TOKENS.adequate;
  if (variation < 0) return COLOR_TOKENS.critical;
  return COLOR_TOKENS.mutedText;
}

function formatEndDate(release: PulseRelease): string {
  return new Date(release.end_at).toLocaleDateString(intlLocale());
}

/**
 * Variação em relação à release anterior do repositório (Cenários 4 e 5 da US06.01). Sem indicador na anterior (a
 * primeira release ou uma release sem análise), não há base; com a anterior igual a 0, só a variação absoluta.
 */
function formatReleaseVariation(release: PulseRelease): string {
  const { tsqmi } = release;
  if (!tsqmi || tsqmi.previous_value === null || tsqmi.variation === null) {
    return i18n.t('dashboards:pulse.tooltip.no-base');
  }

  const absolute = formatVariation(tsqmi.variation);
  const value =
    tsqmi.variation_percent === null ? absolute : `${formatVariationPercent(tsqmi.variation_percent)} (${absolute})`;
  const text = release.previousName
    ? i18n.t('dashboards:pulse.tooltip.variation-from', { value, release: escapeHtml(release.previousName) })
    : value;
  return i18n.t('dashboards:pulse.tooltip.variation', {
    value: `<span style="color:${variationColor(tsqmi.variation)}">${text}</span>`
  });
}

/**
 * Tooltip do ponto de uma release no pulso do produto (US06.01): nome e encerramento da release e, para cada
 * repositório que a tem, o indicador TSQMI, a faixa e a variação. Pontos de releases diferentes ficam em blocos.
 */
export function formatPulseReleaseTooltip(
  points: PulseReleaseHover[],
  bands: QualityBand[] = QUALITY_BANDS
): string {
  const byRelease = new Map<string, PulseReleaseHover[]>();
  points.forEach((point) => {
    const key = point.release.id !== undefined ? String(point.release.id) : `${point.release.name}|${point.release.end_at}`;
    byRelease.set(key, [...(byRelease.get(key) ?? []), point]);
  });

  return [...byRelease.values()]
    .map((releasePoints) => {
      const { release } = releasePoints[0];
      const repositories = releasePoints.map(({ repository, value, release: repositoryRelease }) => {
        const { color } = getQualityStatus(value, bands);
        return [
          `<div style="display:flex; align-items:center; gap:6px; margin-top:6px;">`,
          `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${color};"></span>`,
          `<strong>${escapeHtml(repository)}</strong></div>`,
          `<div>${i18n.t('dashboards:pulse.tooltip.tsqmi', {
            value: formatDecimal(value),
            grade: formatQualityGrade(value, bands)
          })}</div>`,
          `<div>${formatReleaseVariation(repositoryRelease)}</div>`
        ].join('');
      });

      return [
        `<div style="font-weight:bold; font-size:14px;">${escapeHtml(release.name)}</div>`,
        `<div style="color:${COLOR_TOKENS.mutedText};">${i18n.t('dashboards:pulse.tooltip.end', {
          date: formatEndDate(release)
        })}</div>`,
        ...repositories
      ].join('');
    })
    .join('<div style="margin-top:10px;"></div>');
}
