import React, { useMemo } from 'react';
import { Alert, Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { Characteristic } from '@customTypes/product';
import { StyledSlider } from '@components/Equalizer/EqualizerSlider/styles';
import {
  CharacteristicComparison,
  ComparisonStatus,
  comparePlannedAccomplished,
  formatComparisonValue,
} from '@utils/comparePlannedAccomplished';

export interface PlannedVsAccomplishedEqualizerProps {
  planned: Characteristic[];
  /** Características realizadas do repositório; `undefined` quando a release ainda não tem análise. */
  accomplished?: Characteristic[];
  normDiff?: number | null;
}

export const COLORS = {
  planned: '#1565C0',
  accomplished: '#E65100',
};

/** Altura do trilho: mesma altura mínima do equalizador da tela de planejamento (15rem). */
export const TRACK_HEIGHT = 240;
const LABEL_WIDTH = 112;
const MARKER_SIZE = 6;

/** Com poucas características as colunas não crescem, para o componente não ocupar a tela inteira. */
export const getColumnWidth = (count: number) => (count > 6 ? 100 : 120);

export const STATUS_SYMBOL: Record<ComparisonStatus, string> = {
  equal: '=',
  above: '▲',
  below: '▼',
  'no-data': '—',
};

const valueToY = (value: number) => (1 - Math.min(1, Math.max(0, value))) * TRACK_HEIGHT;

/** Gera os trechos da curva, interrompendo-a onde não há valor (característica sem dado). */
export function buildCurvePath(values: (number | null)[], columnWidth: number): string {
  let path = '';
  let penDown = false;

  values.forEach((value, index) => {
    if (value === null) {
      penDown = false;
      return;
    }
    const x = index * columnWidth + columnWidth / 2;
    const y = valueToY(value);
    path += `${penDown ? 'L' : 'M'}${x} ${y} `;
    penDown = true;
  });

  return path.trim();
}

function LegendItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <svg width={36} height={16} aria-hidden="true">
        {children}
      </svg>
      <Typography fontSize="13px">{label}</Typography>
    </Stack>
  );
}

export default function PlannedVsAccomplishedEqualizer({
  planned,
  accomplished,
  normDiff,
}: PlannedVsAccomplishedEqualizerProps) {
  const { t } = useTranslation('release');

  const comparisons = useMemo(() => comparePlannedAccomplished(planned, accomplished), [planned, accomplished]);

  if (planned.length === 0) {
    return (
      <Alert severity="info" data-testid="equalizer-no-planning">
        {t('equalizer.noPlanning')}
      </Alert>
    );
  }

  const hasAccomplished = accomplished !== undefined;
  const columnWidth = getColumnWidth(comparisons.length);
  const contentWidth = comparisons.length * columnWidth;

  const statusLabel = (status: ComparisonStatus) => t(`equalizer.status.${status}`);
  const characteristicLabel = (key: string) => t(`characteristics.${key}`);

  const renderTooltip = (item: CharacteristicComparison) => (
    <Box data-testid={`equalizer-tooltip-${item.key}`}>
      <Typography fontSize="13px" fontWeight={600}>
        {characteristicLabel(item.key)}
      </Typography>
      <Typography fontSize="12px">
        {t('planned')} (Rp): {formatComparisonValue(item.rp)}
      </Typography>
      <Typography fontSize="12px">
        {t('accomplised')} (Rd): {formatComparisonValue(item.rd, t('equalizer.noData'))}
      </Typography>
      <Typography fontSize="12px">
        {t('diff')} (Rp − Rd): {formatComparisonValue(item.delta)}
      </Typography>
      <Typography fontSize="12px">
        {t('equalizer.situation')}: {STATUS_SYMBOL[item.status]} {statusLabel(item.status)}
      </Typography>
    </Box>
  );

  const renderLegend = () => (
    <Stack direction="row" flexWrap="wrap" gap={3} justifyContent="center" mb={3} data-testid="equalizer-legend">
      <LegendItem label={t('equalizer.legend.planned')}>
        <line x1={2} y1={8} x2={34} y2={8} stroke={COLORS.planned} strokeWidth={3} />
        <circle cx={18} cy={8} r={MARKER_SIZE - 1} fill={COLORS.planned} stroke="#fff" strokeWidth={1.5} />
      </LegendItem>
      <LegendItem label={t('equalizer.legend.accomplished')}>
        <line x1={2} y1={8} x2={34} y2={8} stroke={COLORS.accomplished} strokeWidth={3} strokeDasharray="6 4" />
        <rect
          x={18 - MARKER_SIZE + 1}
          y={8 - MARKER_SIZE + 1}
          width={(MARKER_SIZE - 1) * 2}
          height={(MARKER_SIZE - 1) * 2}
          transform="rotate(45 18 8)"
          fill={COLORS.accomplished}
          stroke="#fff"
          strokeWidth={1.5}
        />
      </LegendItem>
      <LegendItem label={t('equalizer.legend.cursor')}>
        <rect x={6} y={2} width={24} height={12} rx={4} fill="#fff" stroke="#2B4D6F" strokeWidth={2.5} />
      </LegendItem>
    </Stack>
  );

  const renderCurves = () => (
    <svg
      width={contentWidth}
      height={TRACK_HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 2 }}
      aria-hidden="true"
      data-testid="equalizer-curves"
    >
      <path
        d={buildCurvePath(comparisons.map((item) => item.rp), columnWidth)}
        fill="none"
        stroke={COLORS.planned}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-testid="equalizer-curve-planned"
      />
      {hasAccomplished && (
        <path
          d={buildCurvePath(comparisons.map((item) => item.rd), columnWidth)}
          fill="none"
          stroke={COLORS.accomplished}
          strokeWidth={3}
          strokeDasharray="6 4"
          strokeLinejoin="round"
          strokeLinecap="round"
          data-testid="equalizer-curve-accomplished"
        />
      )}
      {comparisons.map((item, index) => {
        const x = index * columnWidth + columnWidth / 2;
        return (
          <g key={`markers-${item.key}`}>
            <circle cx={x} cy={valueToY(item.rp)} r={MARKER_SIZE - 1} fill={COLORS.planned} stroke="#fff" strokeWidth={1.5} />
            {item.rd !== null && (
              <rect
                x={x - MARKER_SIZE}
                y={valueToY(item.rd) - MARKER_SIZE}
                width={MARKER_SIZE * 2}
                height={MARKER_SIZE * 2}
                transform={`rotate(45 ${x} ${valueToY(item.rd)})`}
                fill={COLORS.accomplished}
                stroke="#fff"
                strokeWidth={1.5}
                data-testid={`equalizer-marker-accomplished-${item.key}`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );

  const renderTracks = () => (
    <Box display="flex" alignItems="flex-start">
      <Box width={LABEL_WIDTH} flexShrink={0} />
      <Box position="relative" width={contentWidth} flexShrink={0}>
        <Box display="flex">
          {comparisons.map((item) => (
            <Tooltip key={`track-${item.key}`} title={renderTooltip(item)} arrow placement="top">
              <Box
                width={columnWidth}
                display="flex"
                flexDirection="column"
                alignItems="center"
                tabIndex={0}
                aria-label={`${characteristicLabel(item.key)}: ${t('planned')} ${formatComparisonValue(item.rp)}, ${t(
                  'accomplised',
                )} ${formatComparisonValue(item.rd, t('equalizer.noData'))}, ${statusLabel(item.status)}`}
                data-testid={`equalizer-track-${item.key}`}
                sx={{ outline: 'none', '&:focus-visible': { boxShadow: '0 0 0 2px #2B4D6F', borderRadius: 1 } }}
              >
                <Box height={TRACK_HEIGHT} display="flex" justifyContent="center">
                  <StyledSlider
                    aria-label={characteristicLabel(item.key)}
                    orientation="vertical"
                    value={item.rp}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="off"
                    tabIndex={-1}
                    sx={{ height: TRACK_HEIGHT, pointerEvents: 'none' }}
                    data-testid={`equalizer-slider-${item.key}`}
                  />
                </Box>
                <Typography fontSize="14px" align="center" mt={2} px={0.5}>
                  {characteristicLabel(item.key)}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
        {renderCurves()}
      </Box>
    </Box>
  );

  const renderValueRow = (label: string, values: string[], testId: string) => (
    <Box display="flex" alignItems="center" mb={1} data-testid={testId}>
      <Typography width={LABEL_WIDTH} flexShrink={0} fontSize="13px" fontWeight={600} pr={1}>
        {label}
      </Typography>
      {values.map((value, index) => (
        <Box key={`${testId}-${comparisons[index].key}`} width={columnWidth} flexShrink={0} display="flex" justifyContent="center">
          <Paper
            elevation={1}
            sx={{ minWidth: 48, height: 32, px: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography fontSize="13px">{value}</Typography>
          </Paper>
        </Box>
      ))}
    </Box>
  );

  const renderVectors = () => (
    <Box mt={4} data-testid="equalizer-vectors">
      {renderValueRow(
        'Rp',
        comparisons.map((item) => formatComparisonValue(item.rp)),
        'vector-rp',
      )}
      {renderValueRow(
        'Rd',
        comparisons.map((item) => formatComparisonValue(item.rd, t('equalizer.noData'))),
        'vector-rd',
      )}
      {renderValueRow(
        'Rc = max(0, Rp − Rd)',
        comparisons.map((item) => formatComparisonValue(item.rc)),
        'vector-rc',
      )}
      {renderValueRow(
        'Rp − Rd',
        comparisons.map((item) => formatComparisonValue(item.delta)),
        'vector-delta',
      )}
      {hasAccomplished &&
        renderValueRow(
          t('equalizer.situation'),
          comparisons.map((item) => `${STATUS_SYMBOL[item.status]} ${statusLabel(item.status)}`),
          'vector-status',
        )}
    </Box>
  );

  const renderNormDiff = () =>
    typeof normDiff === 'number' && Number.isFinite(normDiff) ? (
      <Stack direction="row" alignItems="center" gap={1} mt={2} ml={`${LABEL_WIDTH}px`} data-testid="equalizer-norm-diff">
        <Typography fontSize="13px" fontWeight={600}>
          {t('norm-diff.title')}: {normDiff.toFixed(2)}
        </Typography>
        <Tooltip title={t('norm-diff.tooltip')}>
          <InfoOutlinedIcon fontSize="small" />
        </Tooltip>
      </Stack>
    ) : null;

  return (
    <Box data-testid="planned-vs-accomplished-equalizer" width="100%">
      {!hasAccomplished && (
        <Alert severity="info" sx={{ mb: 3 }} data-testid="equalizer-no-accomplished">
          {t('equalizer.noAccomplished')}
        </Alert>
      )}
      {renderLegend()}
      <Box sx={{ overflowX: 'auto' }} pt={1}>
        <Box width="fit-content" mx="auto" pr={2}>
          {renderTracks()}
          {renderVectors()}
          {renderNormDiff()}
        </Box>
      </Box>
    </Box>
  );
}
