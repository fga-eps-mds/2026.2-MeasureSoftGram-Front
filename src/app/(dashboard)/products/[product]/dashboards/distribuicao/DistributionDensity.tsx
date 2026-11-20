import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCard from '@components/DashboardCard';
import ExportCsvButton from '@components/ExportCsvButton';
import { DistributionEntity } from '@customTypes/product';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { buildDensity, MIN_ANALYSES_FOR_DENSITY } from '@utils/distributionDensity';
import { buildHistogram } from '@utils/distributionHistogram';
import { formatAnalysisCount } from '@utils/distributionSummary';
import { CsvChart } from '@utils/exportCsv';
import { formatDensityOptions, HISTOGRAM_CHART_HEIGHT } from '@utils/formatDistributionCharts';
import { DensityCsvRow, DISTRIBUTION_CSV } from '@utils/formatDistributionCsv';
import { QualityBand } from '@utils/qualityBands';
import DistributionChart from './DistributionChart';
import { QualityBandRuler } from './DistributionHistogram';
import i18n from '../../../../../../shared/i18n/i18n';

export const densityTitle = () => i18n.t('dashboards:distribution.card.density');

/** Por que não há curva (CA9): poucas análises ou todas com o mesmo valor. */
function getMissingDensity(count: number) {
  if (count < MIN_ANALYSES_FOR_DENSITY) {
    return {
      title: i18n.t('dashboards:distribution.density.few-title'),
      description: i18n.t('dashboards:distribution.density.few-description', {
        min: MIN_ANALYSES_FOR_DENSITY,
        amount: formatAnalysisCount(count)
      })
    };
  }
  return {
    title: i18n.t('dashboards:distribution.density.same-title'),
    description: i18n.t('dashboards:distribution.density.same-description', { amount: formatAnalysisCount(count) })
  };
}

/** Forma da distribuição das análises (CA5), no mesmo eixo do histograma, com a linha da mediana. */
export default function DistributionDensity({
  entity,
  csv,
  bands
}: {
  entity: DistributionEntity;
  /** O CSV do quadro, montado pela página; sem curva ele não tem linhas, e o botão fica desabilitado. */
  csv?: CsvChart<DensityCsvRow>;
  /** Régua do produto (US30.02); sem ela, a régua padrão. */
  bands: QualityBand[];
}) {
  const { histogram, points } = useMemo(() => {
    const values = entity.analyses.map((analysis) => analysis.value);
    const axis = buildHistogram(values, entity.level, entity.metric_type);
    return {
      histogram: axis,
      points: buildDensity(values, { min: axis.min, max: axis.max, iqr: entity.summary.iqr })
    };
  }, [entity]);
  const option = useMemo(
    () => points && formatDensityOptions(points, histogram, entity.summary.median, entity),
    [points, histogram, entity]
  );

  const exportButton = csv && <ExportCsvButton dashboard={DISTRIBUTION_CSV.dashboard} chart={csv} />;

  if (!option) {
    const missing = getMissingDensity(entity.analyses.length);
    return (
      <DashboardCard
        title={densityTitle()}
        status="empty"
        badgeLabel={i18n.t('dashboards:distribution.density.few-badge')}
        emptyTitle={missing.title}
        emptyDescription={missing.description}
        emptyHeaderAction={exportButton}
      />
    );
  }

  return (
    <DashboardCard title={densityTitle()} status="ready" headerAction={exportButton}>
      <Box>
        <DistributionChart option={option} height={HISTOGRAM_CHART_HEIGHT} />
        {histogram.unit && <QualityBandRuler bands={bands} />}
      </Box>
      <Typography fontSize="12px" color={DASHBOARD_COLORS.mutedText}>
        {i18n.t('dashboards:distribution.density.caption')}
      </Typography>
    </DashboardCard>
  );
}
