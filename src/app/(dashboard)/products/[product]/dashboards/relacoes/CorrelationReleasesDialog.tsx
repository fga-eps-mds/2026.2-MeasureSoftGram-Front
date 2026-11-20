import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import ExportCsvButton from '@components/ExportCsvButton';
import { RepositoryCorrelation } from '@customTypes/product';
import { formatPeriod, formatStatistic } from '@utils/distributionSummary';
import {
  CORRELATION_CSV,
  CORRELATION_LEVEL_PLURALS,
  formatCorrelationReleasesCsv,
  formatReleaseStatus
} from '@utils/formatCorrelationCharts';
import { useTranslation } from 'react-i18next';

interface Props {
  correlation: RepositoryCorrelation;
  open: boolean;
  onClose: () => void;
}

/** Releases da análise (CA3): todas as releases do repositório, com o valor de cada entidade e se entraram em RD. */
export default function CorrelationReleasesDialog({ correlation, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation('dashboards');
  const noun = CORRELATION_LEVEL_PLURALS[correlation.level];
  const title = t('correlation.releases.title', { repository: correlation.repository.name });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        {title}
        <Typography variant="body2" color="text.secondary">
          {t('correlation.releases.description', { noun })}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box overflow="auto">
          <Table size="small" aria-label={title}>
            <TableHead>
              <TableRow>
                <TableCell>{t('correlation.releases.release')}</TableCell>
                <TableCell>{t('correlation.releases.period')}</TableCell>
                {correlation.entities.map((entity) => (
                  <TableCell key={entity.key} align="right">
                    {entity.name}
                  </TableCell>
                ))}
                <TableCell>{t('correlation.releases.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {correlation.release_values.map((row) => (
                <TableRow key={row.release.id} sx={row.used ? undefined : { backgroundColor: 'action.hover' }}>
                  <TableCell>{row.release.release_name}</TableCell>
                  <TableCell>{formatPeriod(row.release.start_at, row.release.end_at)}</TableCell>
                  {correlation.entities.map((entity) => (
                    <TableCell
                      key={entity.key}
                      align="right"
                      sx={
                        row.values[entity.key] === null ? { color: 'text.secondary', fontStyle: 'italic' } : undefined
                      }
                    >
                      {formatStatistic(row.values[entity.key])}
                    </TableCell>
                  ))}
                  <TableCell sx={row.used ? undefined : { color: 'text.secondary' }}>
                    {formatReleaseStatus(row, correlation)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
      <DialogActions>
        <ExportCsvButton dashboard={CORRELATION_CSV.dashboard} chart={formatCorrelationReleasesCsv(correlation)} />
        <Button onClick={onClose}>{t('correlation.releases.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
