import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import { FileMetricKey, MetricDistributionFile } from '@customTypes/product';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { escapeHtml } from '@utils/formatOverviewCharts';
import { COLOR_TOKENS } from '@utils/formatPulseChart';
import {
  BoxplotStats,
  buildHistogramBins,
  describeReferencePosition,
  formatBinLabel,
  formatFileCount,
  formatMetricValue,
  formatNumber,
  formatOutlierCount,
  getFileMetric,
  groupOutliers,
  MetricKind,
  MetricReference,
  OutlierGroup
} from '@utils/metricDistribution';

/** Cores do protótipo: barras em azul claro, caixa na cor primária, outliers em laranja e referência em verde. */
export const DISTRIBUTION_COLORS = {
  bar: '#7BA7D7',
  barHover: DASHBOARD_COLORS.planned,
  box: DASHBOARD_COLORS.primary,
  boxFill: DASHBOARD_COLORS.infoBackground,
  outlier: COLOR_TOKENS.warning,
  reference: COLOR_TOKENS.adequate,
  referenceLabel: '#D4EFE3'
};

/** Altura do gráfico de um repositório: rótulos da referência, histograma, boxplot e legenda do eixo x. */
export const DISTRIBUTION_CHART_HEIGHT = 384;

const AXIS_LABEL = { color: DASHBOARD_COLORS.mutedText, fontSize: 11 };
const SPLIT_LINE = { lineStyle: { color: DASHBOARD_COLORS.gridLine } };
// mesmo left/right nos dois grids, com containLabel desligado: o histograma e o boxplot dividem o eixo x
const GRID_SIDES = { left: 64, right: 32 };
// enterable deixa o mouse entrar no tooltip para rolar a lista de arquivos; o hideDelay dá tempo de chegar nele. O
// confine só prende a posição: sem max-width, um caminho longo estica a caixa (nowrap do ECharts) e a página rola
const TOOLTIP = {
  trigger: 'item',
  triggerOn: 'mousemove|click',
  enterable: true,
  confine: true,
  hideDelay: 300,
  extraCssText: 'max-width: 420px; white-space: normal; overflow-wrap: anywhere;'
};
// um outlier a menos de 1/36 do eixo do centro de um grupo entra nele: uns 14 px num gráfico de 600 px, mais que os
// 13,5 px do ponto maior, então nenhum ponto fica escondido atrás de outro
const OUTLIER_SPREAD = 36;

const OUTLIER_STYLE = {
  cursor: 'pointer',
  itemStyle: { color: '#FFFFFF', borderColor: DISTRIBUTION_COLORS.outlier, borderWidth: 1.5 },
  // o outlier sob o mouse ou clicado fica preenchido, como no protótipo
  emphasis: { itemStyle: { color: DISTRIBUTION_COLORS.outlier } }
};

const REFERENCE_LINE = {
  silent: true,
  symbol: 'none',
  lineStyle: { color: DISTRIBUTION_COLORS.reference, type: 'dashed', width: 1.5 }
};

const REFERENCE_LABEL = {
  show: true,
  color: DISTRIBUTION_COLORS.reference,
  fontSize: 11,
  fontWeight: 'bold',
  backgroundColor: DISTRIBUTION_COLORS.referenceLabel,
  padding: [2, 6],
  borderRadius: 3,
  // na v5 o estilo rich não herda a fonte do label, então cada estilo declara a sua
  rich: {
    value: { color: DISTRIBUTION_COLORS.reference, fontSize: 11, fontWeight: 'bold' },
    measure: { color: DISTRIBUTION_COLORS.reference, fontSize: 10, lineHeight: 14 }
  }
};

/** No rich text do ECharts a chave fecha o bloco {estilo|texto}, então ela sai do texto. */
function richText(text: string): string {
  return text.replace(/[{}]/g, '');
}

/** Cada faixa é [início, fim, arquivos]: um retângulo de início a fim, do zero até a contagem. */
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

/** Ponto maior quando junta mais de um arquivo. */
export function outlierSymbolSize(groups: OutlierGroup[]) {
  return (_value: unknown, { dataIndex }: { dataIndex: number }) => (groups[dataIndex].files.length > 1 ? 12 : 9);
}

/** Caixa e bigodes; o params.value do boxplot traz o índice da categoria na frente, então não é usado. */
export function formatBoxTooltip(stats: BoxplotStats, kind: MetricKind, title = 'Boxplot'): string {
  const value = (item: number) => formatMetricValue(item, kind);
  return [
    `<strong>${escapeHtml(title)}</strong>`,
    `Bigode superior: ${value(stats.high)}`,
    `3º quartil: ${value(stats.q3)}`,
    `Mediana: ${value(stats.median)}`,
    `1º quartil: ${value(stats.q1)}`,
    `Bigode inferior: ${value(stats.low)}`
  ].join('<br/>');
}

/**
 * Arquivos de um ponto de outliers (CA5), escapados porque o tooltip do ECharts é HTML. Lista todos os caminhos; com
 * muitos arquivos no mesmo ponto, a lista rola dentro do tooltip. A posição em relação à faixa de referência vai numa
 * linha só quando vale para o grupo inteiro; senão, vai ao lado de cada arquivo.
 */
export function formatOutlierTooltip(
  group: OutlierGroup,
  metric: FileMetricKey,
  reference: MetricReference | null,
  repository?: string
): string {
  const { kind } = getFileMetric(metric);
  const { files } = group;
  const lowest = formatMetricValue(files[0].value, kind);
  const highest = formatMetricValue(files[files.length - 1].value, kind);
  const sameValue = lowest === highest;
  const positions = files.map((file) => describeReferencePosition(file.value, reference, kind));
  const samePosition = positions.every((position) => position === positions[0]);
  const title = files.length === 1 ? 'Outlier' : formatOutlierCount(files.length);
  const paths = files
    .map((file, index) => {
      const valueText = sameValue ? '' : `: ${formatMetricValue(file.value, kind)}`;
      const positionText = samePosition ? '' : ` · ${positions[index]}`;
      return `<strong>${escapeHtml(file.path)}</strong>${valueText}${positionText}`;
    })
    .join('<br/>');

  const lines = [`<span style="color:${DISTRIBUTION_COLORS.outlier};font-weight:bold">${title}</span>`];
  if (repository) lines.push(escapeHtml(repository));
  lines.push(files.length > 1 ? `<div style="max-height:160px;overflow-y:auto">${paths}</div>` : paths);
  lines.push(sameValue ? `${metric}: ${lowest}` : `${metric}: ${lowest} a ${highest}`);
  if (samePosition && positions[0]) lines.push(positions[0]);
  return lines.join('<br/>');
}

/** Rótulo da linha de referência; o do máximo traz a medida na segunda linha, como no protótipo. */
function referenceLabel(reference: MetricReference, kind: MetricKind, bound: 'min' | 'max'): string {
  if (bound === 'min') return `Mín. de referência = ${formatMetricValue(reference.min_threshold, kind)}`;
  const value = formatMetricValue(reference.max_threshold, kind);
  return `{value|Máx. de referência = ${value}}\n{measure|medida: ${richText(reference.measureName)}}`;
}

/** Linhas tracejadas verticais do mínimo e do máximo (CA4); os rótulos ficam só no gráfico de cima. */
function verticalReferenceLines(
  reference: MetricReference | null,
  kind: MetricKind,
  axisMax: number,
  withLabels: boolean
) {
  if (!reference) return undefined;
  if (!withLabels) {
    return {
      ...REFERENCE_LINE,
      label: { show: false },
      data: [{ xAxis: reference.min_threshold }, { xAxis: reference.max_threshold }]
    };
  }

  const line = (value: number, formatter: string, rowDistance: number) => ({
    xAxis: value,
    label: {
      formatter,
      // o rótulo cresce para dentro do gráfico, e o do máximo fica uma linha acima do do mínimo
      align: value > axisMax / 2 ? 'right' : 'left',
      distance: [0, rowDistance]
    }
  });

  return {
    ...REFERENCE_LINE,
    label: { ...REFERENCE_LABEL, position: 'end' },
    data: [
      line(reference.min_threshold, referenceLabel(reference, kind, 'min'), 6),
      line(reference.max_threshold, referenceLabel(reference, kind, 'max'), 30)
    ]
  };
}

export interface DistributionChartData {
  metric: FileMetricKey;
  files: MetricDistributionFile[];
  stats: BoxplotStats;
  reference: MetricReference | null;
}

/**
 * Histograma (grid de cima, série custom com um retângulo por faixa) e boxplot de Tukey deitado (grid de baixo,
 * com os outliers), no mesmo eixo x (CA3).
 */
export function formatDistributionChartOptions({ metric, files, stats, reference }: DistributionChartData) {
  const { description, kind } = getFileMetric(metric);
  const bins = buildHistogramBins(
    files.map((file) => file.value),
    kind
  );
  // o eixo é o das faixas, do zero até o fim da última; sem arquivos, vai até o bigode de cima
  const axisMax = bins.length ? bins[bins.length - 1].end : Math.max(1, stats.high);
  const sharedXAxis = { type: 'value', min: 0, max: axisMax, splitLine: { show: false } };
  const formatValue = (value: number) => formatMetricValue(value, kind);
  const outlierGroups = groupOutliers(stats.outliers, axisMax / OUTLIER_SPREAD);
  const fileCount = formatFileCount(files.length);
  const median = formatValue(stats.median);
  const outlierCount = formatOutlierCount(stats.outliers.length);

  return {
    animation: false,
    aria: {
      enabled: true,
      label: { description: `Histograma e boxplot de ${metric}: ${fileCount}, mediana ${median}, ${outlierCount}.` }
    },
    tooltip: TOOLTIP,
    grid: [
      { ...GRID_SIDES, top: 64, height: 200 },
      { ...GRID_SIDES, top: 284, height: 44 }
    ],
    xAxis: [
      {
        ...sharedXAxis,
        gridIndex: 0,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: DASHBOARD_COLORS.gridLine } }
      },
      {
        ...sharedXAxis,
        gridIndex: 1,
        name: `${metric} (${description})`,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: DASHBOARD_COLORS.text, fontSize: 12 },
        axisLabel: { ...AXIS_LABEL, formatter: formatValue }
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'value',
        name: 'Arquivos',
        // embaixo do zero, como no protótipo, longe dos rótulos da referência que ficam no topo
        nameLocation: 'start',
        nameGap: 10,
        nameTextStyle: AXIS_LABEL,
        minInterval: 1,
        axisLabel: { ...AXIS_LABEL, formatter: formatNumber },
        splitLine: SPLIT_LINE
      },
      {
        gridIndex: 1,
        type: 'category',
        data: ['Boxplot'],
        axisTick: { show: false },
        axisLine: { show: false },
        // margem maior: um outlier em 0 fica no começo do eixo, encostado no rótulo
        axisLabel: { ...AXIS_LABEL, margin: 14 }
      }
    ],
    series: [
      {
        id: 'histogram',
        type: 'custom',
        xAxisIndex: 0,
        yAxisIndex: 0,
        renderItem: renderHistogramBar,
        // sem o encode, o eixo y leria o fim da faixa (dimensão 1) em vez da contagem
        encode: { x: [0, 1], y: 2 },
        data: bins.map((bin) => [bin.start, bin.end, bin.count]),
        tooltip: {
          formatter: ({ dataIndex }: { dataIndex: number }) =>
            `${formatBinLabel(bins[dataIndex], kind)}<br/><strong>${formatFileCount(bins[dataIndex].count)}</strong>`
        },
        markLine: verticalReferenceLines(reference, kind, axisMax, true)
      },
      {
        id: 'boxplot',
        type: 'boxplot',
        xAxisIndex: 1,
        yAxisIndex: 1,
        // sem layout: com o eixo y de categoria o ECharts já deita a caixa
        boxWidth: [18, 28],
        itemStyle: { color: DISTRIBUTION_COLORS.boxFill, borderColor: DISTRIBUTION_COLORS.box, borderWidth: 1.5 },
        data: [[stats.low, stats.q1, stats.median, stats.q3, stats.high]],
        tooltip: { formatter: () => formatBoxTooltip(stats, kind) },
        markLine: verticalReferenceLines(reference, kind, axisMax, false)
      },
      {
        id: 'outliers',
        type: 'scatter',
        xAxisIndex: 1,
        yAxisIndex: 1,
        ...OUTLIER_STYLE,
        symbolSize: outlierSymbolSize(outlierGroups),
        // [valor, 0]: 0 é o índice da única categoria do eixo y
        data: outlierGroups.map((group) => [group.value, 0]),
        tooltip: {
          formatter: ({ dataIndex }: { dataIndex: number }) =>
            formatOutlierTooltip(outlierGroups[dataIndex], metric, reference)
        }
      }
    ]
  };
}
