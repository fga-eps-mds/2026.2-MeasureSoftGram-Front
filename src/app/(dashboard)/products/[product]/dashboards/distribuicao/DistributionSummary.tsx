import React from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCard from '@components/DashboardCard';
import ExportCsvButton from '@components/ExportCsvButton';
import { DistributionSummary as Summary } from '@customTypes/product';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { describeSkewness, getSkewnessWarning, getSummaryRows } from '@utils/distributionSummary';
import { CsvChart } from '@utils/exportCsv';
import { DISTRIBUTION_CSV, SummaryCsvRow } from '@utils/formatDistributionCsv';
import { COLOR_TOKENS } from '@utils/formatPulseChart';

import { useTranslation } from 'react-i18next';
import i18n from '../../../../../../shared/i18n/i18n';

export const summaryTitle = () => i18n.t('dashboards:distribution.card.summary');

/** Resumo estatístico das análises (CA8), com a nota sobre o IQR, os discrepantes e a assimetria. */
export default function DistributionSummary({
  summary,
  csv
}: {
  summary: Summary;
  /** O CSV do quadro, montado pela página; com ele, o cabeçalho ganha o botão "Exportar .csv". */
  csv?: CsvChart<SummaryCsvRow>;
}) {
  const { t } = useTranslation('dashboards');
  const warning = getSkewnessWarning(summary);
  const skewness = describeSkewness(summary.skewness);

  return (
    <DashboardCard
      title={summaryTitle()}
      status="ready"
      headerAction={csv && <ExportCsvButton dashboard={DISTRIBUTION_CSV.dashboard} chart={csv} />}
    >
      <Box component="dl" display="flex" flexDirection="column" gap="4px" margin={0}>
        {getSummaryRows(summary).map((row) => (
          <Box
            key={row.label}
            data-testid="summary-row"
            data-highlight={row.highlight ? 'true' : undefined}
            display="flex"
            justifyContent="space-between"
            gap="12px"
            sx={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: row.highlight ? DASHBOARD_COLORS.infoBackground : undefined
            }}
          >
            <Typography
              component="dt"
              fontSize="13px"
              fontWeight={row.highlight ? 'bold' : undefined}
              color={row.highlight ? DASHBOARD_COLORS.primary : DASHBOARD_COLORS.text}
            >
              {row.label}
            </Typography>
            <Typography
              component="dd"
              fontSize="13px"
              fontWeight="bold"
              color={row.highlight ? DASHBOARD_COLORS.primary : DASHBOARD_COLORS.text}
              margin={0}
            >
              {row.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {warning && (
        <Typography data-testid="skewness-warning" fontSize="12px" color={DASHBOARD_COLORS.mutedText}>
          {warning}
        </Typography>
      )}

      <Box
        data-testid="summary-note"
        sx={{ backgroundColor: COLOR_TOKENS.bgEven, borderRadius: '6px', padding: '10px 12px' }}
      >
        <Typography fontSize="12px" color={DASHBOARD_COLORS.text}>
          {t('distribution.summary-card.note')}
        </Typography>
        <Typography fontSize="12px" color={DASHBOARD_COLORS.mutedText} marginTop="6px">
          {skewness ?? t('distribution.summary-card.skewness-default')}
        </Typography>
      </Box>
    </DashboardCard>
  );
}
