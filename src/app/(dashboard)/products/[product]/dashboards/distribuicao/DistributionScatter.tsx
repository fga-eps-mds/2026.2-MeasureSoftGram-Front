import React, { useMemo } from 'react';
import { Typography } from '@mui/material';
import DashboardCard from '@components/DashboardCard';
import ExportCsvButton from '@components/ExportCsvButton';
import { DistributionEntity } from '@customTypes/product';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { buildHistogram } from '@utils/distributionHistogram';
import { CsvChart } from '@utils/exportCsv';
import { formatScatterOptions, SCATTER_CHART_HEIGHT } from '@utils/formatDistributionCharts';
import { DISTRIBUTION_CSV, ScatterCsvRow } from '@utils/formatDistributionCsv';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../../../shared/i18n/i18n';
import DistributionChart from './DistributionChart';

export const scatterTitle = () => i18n.t('dashboards:distribution.card.scatter');

/** Um ponto por análise na data dela, com a faixa do Q1 ao Q3, a mediana e os discrepantes (CA7). */
export default function DistributionScatter({
  entity,
  csv
}: {
  entity: DistributionEntity;
  /** O CSV do quadro, montado pela página; com ele, o cabeçalho ganha o botão "Exportar .csv". */
  csv?: CsvChart<ScatterCsvRow>;
}) {
  const { t } = useTranslation('dashboards');
  const option = useMemo(() => {
    // o eixo y é o mesmo eixo de valores do histograma: 0 a 1, ou a escala da métrica
    const histogram = buildHistogram(
      entity.analyses.map((analysis) => analysis.value),
      entity.level,
      entity.metric_type
    );
    return formatScatterOptions(entity, histogram);
  }, [entity]);

  return (
    <DashboardCard
      title={scatterTitle()}
      status="ready"
      headerAction={csv && <ExportCsvButton dashboard={DISTRIBUTION_CSV.dashboard} chart={csv} />}
    >
      <DistributionChart option={option} height={SCATTER_CHART_HEIGHT} fill />
      <Typography fontSize="12px" color={DASHBOARD_COLORS.mutedText}>
        {t('distribution.scatter.caption')}
      </Typography>
    </DashboardCard>
  );
}
