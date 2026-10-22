import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCard from '@components/DashboardCard';
import { DistributionEntity } from '@customTypes/product';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { buildHistogram, formatAxisValue } from '@utils/distributionHistogram';
import { formatHistogramOptions, HISTOGRAM_CHART_HEIGHT, HISTOGRAM_GRID_SIDES } from '@utils/formatDistributionCharts';
import { QUALITY_BANDS } from '@utils/qualityBands';
import DistributionChart from './DistributionChart';

export const HISTOGRAM_TITLE = 'Histograma';

/**
 * Régua das faixas A a E abaixo do eixo de 0 a 1, nas margens do grid do histograma: cada faixa ocupa 0,2 do eixo,
 * então cinco colunas iguais ficam alinhadas às barras. Fica fora do ECharts para o rótulo quebrar a linha em tela
 * estreita.
 */
export function QualityBandRuler() {
  return (
    <Box
      component="ul"
      aria-label="Faixas de qualidade de A a E"
      display="grid"
      gridTemplateColumns="repeat(5, minmax(0, 1fr))"
      gap="2px"
      margin={0}
      padding={0}
      sx={{
        listStyle: 'none',
        marginLeft: `${HISTOGRAM_GRID_SIDES.left}px`,
        marginRight: `${HISTOGRAM_GRID_SIDES.right}px`
      }}
    >
      {QUALITY_BANDS.map((band) => (
        <Box component="li" key={band.grade} data-testid="quality-band" textAlign="center" minWidth={0}>
          <Box sx={{ height: '10px', borderRadius: '2px', backgroundColor: band.color }} />
          <Typography fontSize="11px" color={DASHBOARD_COLORS.text} marginTop="4px" lineHeight={1.3}>
            <strong>{band.grade}</strong> · {band.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Quantas análises caem em cada faixa de valor (CA4); nos valores de 0 a 1, com a régua A a E. */
export default function DistributionHistogram({ entity }: { entity: DistributionEntity }) {
  const histogram = useMemo(
    () =>
      buildHistogram(
        entity.analyses.map((analysis) => analysis.value),
        entity.level,
        entity.metric_type
      ),
    [entity]
  );
  const option = useMemo(() => formatHistogramOptions(histogram, entity.name), [histogram, entity.name]);
  const caption = histogram.unit
    ? 'Quantas análises caem em cada faixa de 0,10. A régua mostra as faixas A a E do Indicador Total da Qualidade.'
    : `Quantas análises caem em cada faixa de ${formatAxisValue(histogram.width)} de ${
        entity.name
      }, na escala da métrica.`;

  return (
    <DashboardCard title={HISTOGRAM_TITLE} status="ready">
      <Box>
        <DistributionChart option={option} height={HISTOGRAM_CHART_HEIGHT} />
        {histogram.unit && <QualityBandRuler />}
      </Box>
      <Typography fontSize="12px" color={DASHBOARD_COLORS.mutedText}>
        {caption}
      </Typography>
    </DashboardCard>
  );
}
