import { QualityModelNode } from '@customTypes/metamodel';

export const METAMODEL_COLORS = {
  tsqmi: '#234361',
  characteristic: '#1976D2',
  subcharacteristic: '#00838F',
  measure: '#E65100',
  metric: '#7B1FA2',
  line: '#CBD5E1',
  textDark: '#1E293B',
  textMuted: '#64748B',
  bgCard: '#FFFFFF',
};

export interface EnrichedQualityModelNode extends QualityModelNode {
  isSharedMetric?: boolean;
  parentPath?: string;
  parentWeightLabel?: string;
  children: EnrichedQualityModelNode[];
  collapsed?: boolean;
}

/**
 * Conta a ocorrência de cada métrica para marcar se é compartilhada entre múltiplas medidas.
 */
export function countMetricOccurrences(tree: QualityModelNode): Record<string, number> {
  const counts: Record<string, number> = {};

  function traverse(node: QualityModelNode) {
    if (node.type === 'metric') {
      const key = node.key || node.name;
      counts[key] = (counts[key] || 0) + 1;
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(tree);
  return counts;
}

/**
 * Enriquece os nós com caminhos hierárquicos, status de métrica compartilhada
 * e controle de colapso inicial (recolhido a partir de subcaracterísticas - depth >= 2).
 */
export function enrichTreeNodes(
  node: QualityModelNode,
  metricCounts: Record<string, number>,
  parentPath = '',
  depth = 0,
  forceCollapseDepth?: number
): EnrichedQualityModelNode {
  const isMetric = node.type === 'metric';
  const metricKey = node.key || node.name;
  const isSharedMetric = isMetric && (metricCounts[metricKey] || 0) > 1;

  const currentPath = parentPath ? `${parentPath} › ${node.name}` : node.name;

  let parentWeightLabel = 'Peso';
  if (node.type === 'characteristic') parentWeightLabel = 'Peso no TSQMI';
  else if (node.type === 'subcharacteristic') parentWeightLabel = 'Peso na característica';
  else if (node.type === 'measure') parentWeightLabel = 'Peso na subcaracterística';

  // Por padrão: depth 0 (tsqmi) e 1 (characteristic) abertos; depth >= 2 (subcharacteristic) recolhido
  // Se forceCollapseDepth for passado:
  // - forceCollapseDepth === -1: tudo expandido (collapsed = false)
  // - forceCollapseDepth === 2: recolhido até subcaracterísticas (depth >= 2 tem collapsed = true)
  const collapseThreshold = forceCollapseDepth !== undefined ? forceCollapseDepth : 2;
  const shouldCollapse = collapseThreshold === -1 ? false : depth >= collapseThreshold;

  const hasChildren = node.children && node.children.length > 0;

  return {
    ...node,
    isSharedMetric,
    parentPath,
    parentWeightLabel,
    collapsed: hasChildren && shouldCollapse ? true : false,
    children: (node.children || []).map((child) =>
      enrichTreeNodes(child, metricCounts, currentPath, depth + 1, forceCollapseDepth)
    ),
  };
}

/**
 * Formata os limites de referência de uma medida
 */
export function formatThresholdSummary(min?: number | null, max?: number | null): string {
  const hasMin = min !== undefined && min !== null;
  const hasMax = max !== undefined && max !== null;

  if (hasMin && hasMax) {
    return `mín. ${min} · máx. ${max}`;
  }
  if (hasMin) {
    return `mín. ${min}`;
  }
  if (hasMax) {
    return `máx. ${max}`;
  }
  return '';
}

/**
 * Cria a estrutura de opções do ECharts para o gráfico series-tree.
 */
export function buildEChartsTreeOption(
  rootNode: EnrichedQualityModelNode | null,
  onNodeClickDetails?: (node: EnrichedQualityModelNode) => void
) {
  if (!rootNode) {
    return {};
  }

  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      enterable: true,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      extraCssText: 'box-shadow: none; z-index: 1000;',
      formatter: (params: any) => {
        const data = params.data as EnrichedQualityModelNode;
        if (!data) return '';

        const typeLabels: Record<string, string> = {
          tsqmi: 'Índice de Qualidade',
          characteristic: 'Característica',
          subcharacteristic: 'Subcaracterística',
          measure: 'Medida',
          metric: 'Métrica',
        };

        const typeColors: Record<string, string> = {
          tsqmi: METAMODEL_COLORS.tsqmi,
          characteristic: METAMODEL_COLORS.characteristic,
          subcharacteristic: METAMODEL_COLORS.subcharacteristic,
          measure: METAMODEL_COLORS.measure,
          metric: METAMODEL_COLORS.metric,
        };

        const typeLabel = typeLabels[data.type] || data.type;
        const typeColor = typeColors[data.type] || '#333';
        const path = data.parentPath ? `${typeLabel} · ${data.parentPath}` : typeLabel;

        const weightRow =
          data.weight !== null && data.weight !== undefined
            ? `<div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px;">
                 <span style="color: #64748B;">${data.parentWeightLabel || 'Peso'}:</span>
                 <strong style="color: #1E293B; margin-left: 12px;">${data.weight}%</strong>
               </div>`
            : '';

        const minThresholdRow =
          data.type === 'measure' && data.min_threshold !== null && data.min_threshold !== undefined
            ? `<div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px;">
                 <span style="color: #64748B;">Valor de referência mínimo:</span>
                 <strong style="color: #1E293B; margin-left: 12px;">${data.min_threshold}</strong>
               </div>`
            : '';

        const maxThresholdRow =
          data.type === 'measure' && data.max_threshold !== null && data.max_threshold !== undefined
            ? `<div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px;">
                 <span style="color: #64748B;">Valor de referência máximo:</span>
                 <strong style="color: #1E293B; margin-left: 12px;">${data.max_threshold}</strong>
               </div>`
            : '';

        const metricsUsedRow =
          data.type === 'measure' && data.children && data.children.length > 0
            ? `<div style="display: flex; flex-direction: column; margin-top: 6px; font-size: 12px;">
                 <span style="color: #64748B;">Métricas usadas:</span>
                 <span style="color: #1E293B; font-weight: 600; margin-top: 2px;">
                   ${data.children.map((c) => c.name || c.key).join(', ')}
                 </span>
               </div>`
            : '';

        const sharedNotice = data.isSharedMetric
          ? `<div style="margin-top: 6px; font-size: 11px; color: ${METAMODEL_COLORS.metric}; font-weight: 500;">
               ▲ Métrica também utilizada em outras medidas
             </div>`
          : '';

        return `
          <div style="
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            padding: 14px 16px;
            max-width: 340px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            text-align: left;
            pointer-events: auto;
          ">
            <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">
              ${data.name}
            </div>
            <div style="font-size: 11px; font-weight: 600; color: ${typeColor}; margin-bottom: 8px;">
              ${path}
            </div>
            ${
              data.description
                ? `<div style="font-size: 12px; color: #475569; line-height: 1.45; margin-bottom: 10px; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
                     ${data.description}
                   </div>`
                : ''
            }
            <div style="display: flex; flex-direction: column;">
              ${weightRow}
              ${minThresholdRow}
              ${maxThresholdRow}
              ${metricsUsedRow}
              ${sharedNotice}
            </div>
          </div>
        `;
      },
    },
    series: [
      {
        type: 'tree',
        data: [rootNode],
        top: '40px',
        left: '80px',
        bottom: '40px',
        right: '180px',
        layout: 'orthogonal',
        orient: 'LR',
        symbol: 'emptyCircle',
        symbolSize: 1, // Não desenha círculos padrões para nós usarmos o label estilizado como card
        edgeShape: 'curve',
        edgeForkPosition: '60%',
        initialTreeDepth: 2,
        expandAndCollapse: true,
        animationDuration: 400,
        animationDurationUpdate: 300,
        lineStyle: {
          color: METAMODEL_COLORS.line,
          width: 1.5,
          curveness: 0.5,
        },
        label: {
          position: 'right',
          verticalAlign: 'middle',
          align: 'left',
          distance: 0,
          formatter: (params: any) => {
            const node = params.data as EnrichedQualityModelNode;
            if (!node) return '';

            if (node.type === 'tsqmi') {
              return `{tsqmiCard| ${node.name} }`;
            }

            if (node.type === 'characteristic') {
              return `{charCard|{charBullet|●}  {charName|${node.name}}  {weight|· ${node.weight ?? 0}%}}`;
            }

            if (node.type === 'subcharacteristic') {
              const numChildren = node.children ? node.children.length : 0;
              const isCollapsed =
                params.isExpand !== undefined ? !params.isExpand : Boolean(node.collapsed);
              const badge = isCollapsed
                ? `{subBadge|+ ${numChildren} ${numChildren === 1 ? 'medida' : 'medidas'}}`
                : `{subBadgeClose|−}`;

              return `{subCard|{subSquare|■}  {subName|${node.name}}  {weight|· ${node.weight ?? 0}%}  ${badge}}`;
            }

            if (node.type === 'measure') {
              const ref = formatThresholdSummary(node.min_threshold, node.max_threshold);
              const refLine = ref ? `\n{measureRef|Ref. por arquivo: ${ref}}` : '';
              return `{measureCard|{measureDiamond|◆}  {measureName|${node.name}}  {weightOrange|· ${node.weight ?? 0}%}${refLine}}`;
            }

            if (node.type === 'metric') {
              const sharedLine = node.isSharedMetric ? `\n{metricShared|também em outra medida}` : '';
              return `{metricCard|{metricTriangle|▲}  {metricName|${node.name || node.key}}${sharedLine}}`;
            }

            return node.name;
          },
          rich: {
            tsqmiCard: {
              backgroundColor: METAMODEL_COLORS.tsqmi,
              color: '#FFFFFF',
              borderRadius: 4,
              padding: [8, 14],
              fontWeight: 'bold',
              fontSize: 13,
              lineHeight: 18,
            },
            charCard: {
              backgroundColor: '#FFFFFF',
              borderColor: METAMODEL_COLORS.characteristic,
              borderWidth: 1.5,
              borderRadius: 6,
              padding: [6, 12],
              lineHeight: 20,
            },
            charBullet: {
              color: METAMODEL_COLORS.characteristic,
              fontSize: 13,
            },
            charName: {
              color: '#1E293B',
              fontWeight: 600,
              fontSize: 13,
            },
            weight: {
              color: '#2563EB',
              fontWeight: 600,
              fontSize: 12,
            },
            subCard: {
              backgroundColor: '#FFFFFF',
              borderColor: METAMODEL_COLORS.subcharacteristic,
              borderWidth: 1.5,
              borderRadius: 6,
              padding: [6, 12],
              lineHeight: 20,
            },
            subSquare: {
              color: METAMODEL_COLORS.subcharacteristic,
              fontSize: 12,
            },
            subName: {
              color: '#1E293B',
              fontWeight: 600,
              fontSize: 13,
            },
            subBadge: {
              backgroundColor: '#E0F2FE',
              color: '#0369A1',
              borderRadius: 4,
              padding: [2, 6],
              fontSize: 11,
              fontWeight: 600,
            },
            subBadgeClose: {
              backgroundColor: '#F1F5F9',
              color: '#475569',
              borderRadius: 4,
              padding: [2, 6],
              fontSize: 12,
              fontWeight: 700,
            },
            measureCard: {
              backgroundColor: '#FFFFFF',
              borderColor: METAMODEL_COLORS.measure,
              borderWidth: 1.5,
              borderRadius: 6,
              padding: [6, 12],
              lineHeight: 18,
            },
            measureDiamond: {
              color: METAMODEL_COLORS.measure,
              fontSize: 13,
            },
            measureName: {
              color: '#1E293B',
              fontWeight: 600,
              fontSize: 13,
            },
            weightOrange: {
              color: METAMODEL_COLORS.measure,
              fontWeight: 600,
              fontSize: 12,
            },
            measureRef: {
              color: '#64748B',
              fontSize: 11,
              padding: [4, 0, 0, 16],
            },
            metricCard: {
              backgroundColor: '#FFFFFF',
              borderColor: METAMODEL_COLORS.metric,
              borderWidth: 1.5,
              borderRadius: 6,
              padding: [6, 12],
              lineHeight: 18,
            },
            metricTriangle: {
              color: METAMODEL_COLORS.metric,
              fontSize: 11,
            },
            metricName: {
              color: '#1E293B',
              fontWeight: 500,
              fontSize: 12,
            },
            metricShared: {
              color: METAMODEL_COLORS.metric,
              fontSize: 10,
              padding: [2, 0, 0, 14],
            },
          },
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left',
          },
        },
      },
    ],
  };
}
