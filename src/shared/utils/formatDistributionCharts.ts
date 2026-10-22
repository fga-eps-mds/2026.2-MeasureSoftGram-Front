import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { DensityPoint } from '@utils/distributionDensity';
import { formatAxisValue, formatBinLabel, Histogram } from '@utils/distributionHistogram';
import { formatAnalysisCount, formatCount, formatStatistic } from '@utils/distributionSummary';
import { escapeHtml } from '@utils/formatOverviewCharts';
import { COLOR_TOKENS } from '@utils/formatPulseChart';
import { BoxplotStats, OutlierGroup } from '@utils/metricDistribution';

/** Cores dos gráficos da distribuição: barras em azul claro, caixa na cor primária e discrepantes em laranja. */
export const DISTRIBUTION_COLORS = {
  bar: '#7BA7D7',
  barHover: DASHBOARD_COLORS.planned,
  box: DASHBOARD_COLORS.primary,
  boxFill: DASHBOARD_COLORS.infoBackground,
  outlier: COLOR_TOKENS.warning,
  density: DASHBOARD_COLORS.planned,
  densityFill: 'rgba(123, 167, 215, 0.3)',
  median: DASHBOARD_COLORS.primary
};

const LEGEND = { textStyle: { color: DASHBOARD_COLORS.text, fontSize: 11 }, itemWidth: 16, itemHeight: 8 };

const AXIS_LABEL = { color: DASHBOARD_COLORS.mutedText, fontSize: 11 };
const SPLIT_LINE = { lineStyle: { color: DASHBOARD_COLORS.gridLine } };

/** Discrepante em círculo vazado; o que está sob o mouse ou clicado fica preenchido (TASK21.03.05). */
export const OUTLIER_STYLE = {
  cursor: 'pointer',
  itemStyle: { color: '#FFFFFF', borderColor: DISTRIBUTION_COLORS.outlier, borderWidth: 1.5 },
  emphasis: { itemStyle: { color: DISTRIBUTION_COLORS.outlier } }
};

/** Cada faixa é [início, fim, análises]: um retângulo de início a fim, do zero até a contagem. */
export function renderHistogramBar(
  _params: CustomSeriesRenderItemParams,
  api: CustomSeriesRenderItemAPI
): CustomSeriesRenderItemReturn {
  const [left, top] = api.coord([Number(api.value(0)), Number(api.value(2))]);
  const [right, bottom] = api.coord([Number(api.value(1)), 0]);
  return {
    type: 'rect',
    // 1px de folga de cada lado separa as barras vizinhas
    shape: { x: left + 1, y: top, width: Math.max(right - left - 2, 1), height: bottom - top },
    style: { fill: DISTRIBUTION_COLORS.bar },
    emphasis: { style: { fill: DISTRIBUTION_COLORS.barHover } }
  };
}

/** Ponto maior quando junta mais de uma análise. */
export function outlierSymbolSize(groups: OutlierGroup[]) {
  return (_value: unknown, { dataIndex }: { dataIndex: number }) => (groups[dataIndex].analyses.length > 1 ? 12 : 9);
}

/** Caixa e hastes no tooltip do boxplot, com duas casas; o params.value do boxplot traz o índice da categoria na frente. */
export function formatBoxTooltip(stats: BoxplotStats, title = 'Boxplot'): string {
  return [
    `<strong>${escapeHtml(title)}</strong>`,
    `Haste superior: ${formatStatistic(stats.high)}`,
    `Q3: ${formatStatistic(stats.q3)}`,
    `Mediana: ${formatStatistic(stats.median)}`,
    `Q1: ${formatStatistic(stats.q1)}`,
    `Haste inferior: ${formatStatistic(stats.low)}`
  ].join('<br/>');
}

/** Altura do histograma das análises. */
export const HISTOGRAM_CHART_HEIGHT = 280;

/**
 * Margens do grid do histograma, em px, com o containLabel desligado: a régua A a E, desenhada fora do ECharts, usa as
 * mesmas para ficar alinhada às faixas do eixo.
 */
export const HISTOGRAM_GRID_SIDES = { left: 56, right: 24 };

/** Eixo x de valor de um quadro alinhado ao histograma: o mesmo início, fim e intervalo das faixas. */
function histogramValueAxis(histogram: Histogram) {
  return {
    type: 'value',
    min: histogram.min,
    max: histogram.max,
    interval: histogram.width,
    splitLine: { show: false },
    axisLine: { lineStyle: { color: DASHBOARD_COLORS.gridLine } },
    axisLabel: { ...AXIS_LABEL, formatter: formatAxisValue, hideOverlap: true }
  };
}

/**
 * Histograma das análises da entidade (CA4): uma barra por faixa de valor, do início ao fim dela, com a quantidade de
 * análises. O eixo x é o das faixas; nos valores de 0 a 1, a régua A a E fica abaixo dele, fora do gráfico.
 */
export function formatHistogramOptions(histogram: Histogram, entityName: string) {
  const { bins } = histogram;
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  const filled = bins
    .filter((bin) => bin.count > 0)
    .map((bin) => `${formatBinLabel(bin, histogram)}: ${formatAnalysisCount(bin.count)}`)
    .join('; ');

  return {
    animation: false,
    aria: {
      enabled: true,
      label: {
        description: `Histograma de ${entityName}: ${formatAnalysisCount(total)} em faixas de ${formatAxisValue(
          histogram.width
        )}. ${filled}.`
      }
    },
    tooltip: { trigger: 'item', confine: true },
    grid: { ...HISTOGRAM_GRID_SIDES, top: 32, bottom: 32 },
    xAxis: histogramValueAxis(histogram),
    yAxis: {
      type: 'value',
      name: 'Análises',
      nameTextStyle: AXIS_LABEL,
      minInterval: 1,
      axisLabel: { ...AXIS_LABEL, formatter: formatCount },
      splitLine: SPLIT_LINE
    },
    series: [
      {
        id: 'histogram',
        type: 'custom',
        renderItem: renderHistogramBar,
        // sem o encode, o eixo y leria o fim da faixa (dimensão 1) em vez da contagem
        encode: { x: [0, 1], y: 2 },
        data: bins.map((bin) => [bin.start, bin.end, bin.count]),
        tooltip: {
          formatter: ({ dataIndex }: { dataIndex: number }) =>
            `${formatBinLabel(bins[dataIndex], histogram)}<br/><strong>${formatAnalysisCount(
              bins[dataIndex].count
            )}</strong>`
        }
      }
    ]
  };
}

/** Rótulo da mediana na legenda: "Mediana (0,55)". */
export function formatMedianLabel(median: number | null): string {
  return `Mediana (${formatStatistic(median)})`;
}

/**
 * Curva de densidade das análises (CA5), no mesmo eixo x e com as mesmas margens do histograma, para os dois quadros
 * ficarem alinhados lado a lado. A área fica preenchida em cor clara. A mediana do Service é uma linha vertical
 * tracejada numa série sem pontos, só para ter o próprio item na legenda.
 */
export function formatDensityOptions(
  points: DensityPoint[],
  histogram: Histogram,
  median: number | null,
  entityName: string
) {
  const peak = points.reduce((top, point) => (point.y > top.y ? point : top), points[0]);
  const medianLabel = formatMedianLabel(median);
  const hasMedian = median !== null;
  const medianSentence = hasMedian ? ` ${medianLabel}.` : '';

  return {
    animation: false,
    aria: {
      enabled: true,
      label: {
        description: `Curva de densidade de ${entityName}, de ${formatAxisValue(histogram.min)} a ${formatAxisValue(
          histogram.max
        )}, com o pico em ${formatStatistic(peak.x)}.${medianSentence}`
      }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: { value: number[] }[]) => {
        const [x, y] = params[0].value;
        return `${formatStatistic(x)}<br/>Densidade: <strong>${formatStatistic(y)}</strong>`;
      }
    },
    legend: {
      ...LEGEND,
      top: 0,
      right: HISTOGRAM_GRID_SIDES.right,
      data: hasMedian ? ['Densidade', medianLabel] : ['Densidade']
    },
    grid: { ...HISTOGRAM_GRID_SIDES, top: 40, bottom: 32 },
    xAxis: histogramValueAxis(histogram),
    yAxis: {
      type: 'value',
      axisLabel: { ...AXIS_LABEL, formatter: (value: number) => formatAxisValue(Number(value.toFixed(2))) },
      splitLine: SPLIT_LINE
    },
    series: [
      {
        id: 'density',
        name: 'Densidade',
        type: 'line',
        data: points.map((point) => [point.x, point.y]),
        showSymbol: false,
        lineStyle: { color: DISTRIBUTION_COLORS.density, width: 2 },
        itemStyle: { color: DISTRIBUTION_COLORS.density },
        areaStyle: { color: DISTRIBUTION_COLORS.densityFill }
      },
      ...(hasMedian
        ? [
            {
              id: 'median',
              name: medianLabel,
              type: 'line',
              data: [],
              itemStyle: { color: DISTRIBUTION_COLORS.median },
              lineStyle: { color: DISTRIBUTION_COLORS.median, type: 'dashed' },
              markLine: {
                silent: true,
                symbol: 'none',
                label: { show: false },
                lineStyle: { color: DISTRIBUTION_COLORS.median, width: 2, type: 'dashed' },
                data: [{ xAxis: median }]
              }
            }
          ]
        : [])
    ]
  };
}
