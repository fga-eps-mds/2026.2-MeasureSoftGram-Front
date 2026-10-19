import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
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

/** Cores do IDV: Rp no azul do gradiente do equalizador, Rd no laranja usado nos gráficos do produto. */
export const COLORS = {
  planned: '#2DA1C8',
  accomplished: '#DF8E16',
  primary: '#2B4D6F',
};

const STATUS_COLOR: Record<ComparisonStatus, string> = {
  equal: '#2B4D6F',
  above: '#2E7D32',
  below: '#C62828',
  'no-data': '#6B7280',
};

export const STATUS_SYMBOL: Record<ComparisonStatus, string> = {
  equal: '=',
  above: '▲',
  below: '▼',
  'no-data': '—',
};

/** Mesma regra de colunas da tela de planejamento: no máximo 6 por linha, distribuídas de forma simétrica. */
const MAX_COLUMNS = 6;
export const getGridColumns = (count: number) => {
  if (count <= 0) return 1;
  const rows = Math.ceil(count / MAX_COLUMNS);
  return Math.ceil(count / rows);
};

export interface TrackGeometry {
  x: number;
  top: number;
  height: number;
}

/**
 * Gera o caminho de uma curva sobre os trilhos. A curva é interrompida onde não há valor
 * (característica sem dado) e na quebra de linha do grid (trilhos com topo diferente).
 */
export function buildCurvePath(values: (number | null)[], tracks: TrackGeometry[]): string {
  let path = '';
  let previousTop: number | null = null;

  values.forEach((value, index) => {
    const track = tracks[index];
    if (value === null || !track || track.height <= 0) {
      previousTop = null;
      return;
    }
    const y = track.top + (1 - Math.min(1, Math.max(0, value))) * track.height;
    const command = previousTop !== null && Math.abs(previousTop - track.top) < 1 ? 'L' : 'M';
    path += `${command}${track.x.toFixed(1)} ${y.toFixed(1)} `;
    previousTop = track.top;
  });

  return path.trim();
}

const valueToY = (value: number, track: TrackGeometry) =>
  track.top + (1 - Math.min(1, Math.max(0, value))) * track.height;

function LegendItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <svg width={28} height={14} aria-hidden="true">
        {children}
      </svg>
      <Typography fontSize="13px" color="text.secondary">
        {label}
      </Typography>
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sliderRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [tracks, setTracks] = useState<TrackGeometry[]>([]);

  /** Mede a posição real dos trilhos, para as curvas acompanharem o grid responsivo. */
  const measureTracks = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    setTracks(
      sliderRefs.current.slice(0, comparisons.length).map((slider) => {
        if (!slider) return { x: 0, top: 0, height: 0 };
        const rect = slider.getBoundingClientRect();
        return {
          x: rect.left - containerRect.left + rect.width / 2,
          top: rect.top - containerRect.top,
          height: rect.height,
        };
      }),
    );
  }, [comparisons.length]);

  useEffect(() => {
    measureTracks();
    if (typeof ResizeObserver === 'undefined' || !containerRef.current) return undefined;

    const observer = new ResizeObserver(() => measureTracks());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measureTracks]);

  if (planned.length === 0) {
    return (
      <Alert severity="info" data-testid="equalizer-no-planning">
        {t('equalizer.noPlanning')}
      </Alert>
    );
  }

  const hasAccomplished = accomplished !== undefined;
  const columns = getGridColumns(comparisons.length);

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
    <Stack
      direction="row"
      flexWrap="wrap"
      justifyContent="center"
      sx={{ columnGap: 3, rowGap: 1, mb: 4 }}
      data-testid="equalizer-legend"
    >
      <LegendItem label={t('equalizer.legend.planned')}>
        <line x1={1} y1={7} x2={27} y2={7} stroke={COLORS.planned} strokeWidth={2.5} />
      </LegendItem>
      {hasAccomplished && (
        <LegendItem label={t('equalizer.legend.accomplished')}>
          <line x1={1} y1={7} x2={27} y2={7} stroke={COLORS.accomplished} strokeWidth={2.5} strokeDasharray="5 3" />
          <circle cx={14} cy={7} r={4} fill={COLORS.accomplished} stroke="#fff" strokeWidth={1.5} />
        </LegendItem>
      )}
      <LegendItem label={t('equalizer.legend.cursor')}>
        <rect x={5} y={2} width={18} height={10} rx={4} fill="#fff" stroke={COLORS.primary} strokeWidth={2} />
      </LegendItem>
    </Stack>
  );

  const svgStyle = (zIndex: number): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    overflow: 'visible',
    zIndex,
  });

  /** Curvas atrás dos trilhos: o cursor (Rp) continua visível por cima. */
  const renderCurves = () => (
    <svg style={svgStyle(0)} aria-hidden="true" data-testid="equalizer-curves">
      <path
        d={buildCurvePath(comparisons.map((item) => item.rp), tracks)}
        fill="none"
        stroke={COLORS.planned}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-testid="equalizer-curve-planned"
      />
      {hasAccomplished && (
        <path
          d={buildCurvePath(comparisons.map((item) => item.rd), tracks)}
          fill="none"
          stroke={COLORS.accomplished}
          strokeWidth={2.5}
          strokeDasharray="6 4"
          strokeLinejoin="round"
          strokeLinecap="round"
          data-testid="equalizer-curve-accomplished"
        />
      )}
    </svg>
  );

  /** Marcadores do realizado na frente dos trilhos. */
  const renderAccomplishedMarkers = () => (
    <svg style={svgStyle(2)} aria-hidden="true">
      {comparisons.map((item, index) => {
        const track = tracks[index];
        if (item.rd === null || !track || track.height <= 0) return null;
        return (
          <circle
            key={`marker-${item.key}`}
            cx={track.x}
            cy={valueToY(item.rd, track)}
            r={6}
            fill={COLORS.accomplished}
            stroke="#fff"
            strokeWidth={2}
            data-testid={`equalizer-marker-accomplished-${item.key}`}
          />
        );
      })}
    </svg>
  );

  const renderTracks = () => (
    <Box position="relative" ref={containerRef}>
      {renderCurves()}
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(auto-fit, minmax(104px, 1fr))',
          md: `repeat(${columns}, minmax(0, 1fr))`,
        }}
        gap={{ xs: 2, sm: 4, md: 6 }}
        justifyItems="center"
        alignItems="start"
        position="relative"
        zIndex={1}
      >
        {comparisons.map((item, index) => (
          <Tooltip key={`track-${item.key}`} title={renderTooltip(item)} arrow placement="top">
            <Grid
              container
              direction="column"
              gap={2}
              tabIndex={0}
              aria-label={`${characteristicLabel(item.key)}: ${t('planned')} ${formatComparisonValue(item.rp)}, ${t(
                'accomplised',
              )} ${formatComparisonValue(item.rd, t('equalizer.noData'))}, ${statusLabel(item.status)}`}
              data-testid={`equalizer-track-${item.key}`}
              sx={{
                width: '100%',
                maxWidth: '120px',
                outline: 'none',
                borderRadius: 2,
                '&:focus-visible': { boxShadow: `0 0 0 2px ${COLORS.primary}` },
              }}
            >
              <Grid item display="flex" justifyContent="center">
                <StyledSlider
                  ref={(element: HTMLSpanElement | null) => {
                    sliderRefs.current[index] = element;
                  }}
                  aria-label={characteristicLabel(item.key)}
                  orientation="vertical"
                  value={item.rp}
                  min={0}
                  max={1}
                  step={0.01}
                  valueLabelDisplay="off"
                  tabIndex={-1}
                  data-testid={`equalizer-slider-${item.key}`}
                  sx={{ minHeight: '15rem', pointerEvents: 'none' }}
                />
              </Grid>
              <Grid item display="flex" alignItems="center" justifyContent="center">
                <Typography fontSize="14px" align="center">
                  {characteristicLabel(item.key)}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>
        ))}
      </Box>
      {hasAccomplished && renderAccomplishedMarkers()}
    </Box>
  );

  const cellSx = { fontSize: '13px', whiteSpace: 'nowrap' as const, px: 1.5 };

  const renderRow = (label: string, testId: string, renderCell: (item: CharacteristicComparison) => React.ReactNode) => (
    <TableRow data-testid={testId}>
      <TableCell component="th" scope="row" sx={{ ...cellSx, fontWeight: 600, color: COLORS.primary }}>
        {label}
      </TableCell>
      {comparisons.map((item) => (
        <TableCell key={`${testId}-${item.key}`} align="center" sx={cellSx}>
          {renderCell(item)}
        </TableCell>
      ))}
    </TableRow>
  );

  const renderVectors = () => (
    <TableContainer sx={{ mt: 5, overflowX: 'auto', contain: 'inline-size' }} data-testid="equalizer-vectors">
      <Table size="small" aria-label={t('view-values')}>
        <TableHead>
          <TableRow>
            <TableCell sx={cellSx} />
            {comparisons.map((item) => (
              <TableCell key={`head-${item.key}`} align="center" sx={{ ...cellSx, fontWeight: 600 }}>
                {characteristicLabel(item.key)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {renderRow('Rp', 'vector-rp', (item) => formatComparisonValue(item.rp))}
          {renderRow('Rd', 'vector-rd', (item) => formatComparisonValue(item.rd, t('equalizer.noData')))}
          {renderRow('Rc = max(0, Rp − Rd)', 'vector-rc', (item) => formatComparisonValue(item.rc))}
          {renderRow('Rp − Rd', 'vector-delta', (item) => formatComparisonValue(item.delta))}
          {hasAccomplished &&
            renderRow(t('equalizer.situation'), 'vector-status', (item) => (
              <Typography component="span" fontSize="13px" fontWeight={500} color={STATUS_COLOR[item.status]}>
                {`${STATUS_SYMBOL[item.status]} ${statusLabel(item.status)}`}
              </Typography>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderNormDiff = () =>
    typeof normDiff === 'number' && Number.isFinite(normDiff) ? (
      <Stack direction="row" alignItems="center" gap={1} mt={2} data-testid="equalizer-norm-diff">
        <Typography fontSize="13px" fontWeight={600} color={COLORS.primary}>
          {t('norm-diff.title')}: {normDiff.toFixed(2)}
        </Typography>
        <Tooltip title={t('norm-diff.tooltip')}>
          <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </Tooltip>
      </Stack>
    ) : null;

  return (
    <Box data-testid="planned-vs-accomplished-equalizer" width="100%" minWidth={0}>
      {!hasAccomplished && (
        <Alert severity="info" sx={{ mb: 3 }} data-testid="equalizer-no-accomplished">
          {t('equalizer.noAccomplished')}
        </Alert>
      )}
      <Box sx={{ border: 1, borderRadius: 3, px: { xs: 2, sm: 3 }, py: { xs: 4, sm: 6 }, width: '100%' }}>
        {renderLegend()}
        {renderTracks()}
        {renderVectors()}
        {renderNormDiff()}
      </Box>
    </Box>
  );
}
