import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCard from '@components/DashboardCard';
import ExportCsvButton from '@components/ExportCsvButton';
import { RepositoryCorrelation } from '@customTypes/product';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import {
  CORRELATION_COLORS,
  CORRELATION_CSV,
  CORRELATION_LEVEL_PLURALS,
  formatCorrelationCsv,
  formatCorrelationMatrixOptions,
  formatSignificanceNote,
  METHOD_LABELS
} from '@utils/formatCorrelationCharts';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../../../shared/i18n/i18n';
import CorrelationChart from './CorrelationChart';

export function matrixTitle(correlation: Pick<RepositoryCorrelation, 'level'>): string {
  return i18n.t('dashboards:correlation.matrix-title', { noun: CORRELATION_LEVEL_PLURALS[correlation.level] });
}

/** Escala de −1 a +1, do laranja ao azul. */
function ScaleLegend() {
  return (
    <Box display="flex" alignItems="center" gap="8px" aria-hidden>
      <Typography fontSize="12px" color={DASHBOARD_COLORS.text}>
        −1
      </Typography>
      <Box
        width={160}
        height={10}
        borderRadius="5px"
        sx={{
          background: `linear-gradient(to right, ${CORRELATION_COLORS.negative}, ${CORRELATION_COLORS.neutral}, ${CORRELATION_COLORS.positive})`
        }}
      />
      <Typography fontSize="12px" color={DASHBOARD_COLORS.text}>
        +1
      </Typography>
    </Box>
  );
}

/**
 * Matriz de correlação (CA4): o triângulo de baixo de RD_Corr, com o nome de cada entidade na diagonal, o coeficiente
 * com duas casas na cor da escala de −1 a +1 e os não significativos em itálico e opacos.
 */
export default function CorrelationMatrix({ correlation }: { correlation: RepositoryCorrelation }) {
  const {
    t,
    i18n: { language }
  } = useTranslation('dashboards');
  const option = useMemo(() => formatCorrelationMatrixOptions(correlation), [correlation, language]);
  const noun = CORRELATION_LEVEL_PLURALS[correlation.level];
  const method = correlation.method ? METHOD_LABELS[correlation.method] : '';

  return (
    <DashboardCard
      title={matrixTitle(correlation)}
      status="ready"
      headerAction={
        <ExportCsvButton
          dashboard={CORRELATION_CSV.dashboard}
          chart={formatCorrelationCsv(correlation, CORRELATION_CSV.matrix)}
        />
      }
    >
      <Typography fontSize="13px" color={DASHBOARD_COLORS.text}>
        RD_Corr = f<sub>σ</sub>(RD):{' '}
        {t('correlation.matrix-description', {
          noun,
          amount: correlation.releases.length,
          repository: correlation.repository.name
        })}
      </Typography>
      <CorrelationChart option={option} entities={correlation.entities.length} />
      <Box display="flex" flexDirection="column" gap="6px">
        <ScaleLegend />
        <Typography fontSize="12px" color={DASHBOARD_COLORS.text}>
          {t('correlation.legend.colors')}
        </Typography>
        <Typography fontSize="12px" fontStyle="italic" color={DASHBOARD_COLORS.mutedText}>
          {formatSignificanceNote(correlation)}
        </Typography>
        <Typography fontSize="12px" color={DASHBOARD_COLORS.text}>
          {t('correlation.method-rule', { method })}
        </Typography>
      </Box>
    </DashboardCard>
  );
}
