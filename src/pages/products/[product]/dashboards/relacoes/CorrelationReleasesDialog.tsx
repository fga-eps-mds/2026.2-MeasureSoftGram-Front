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

interface Props {
  correlation: RepositoryCorrelation;
  open: boolean;
  onClose: () => void;
}

/** Releases da análise (CA3): todas as releases do repositório, com o valor de cada entidade e se entraram em RD. */
export default function CorrelationReleasesDialog({ correlation, open, onClose }: Readonly<Props>) {
  const noun = CORRELATION_LEVEL_PLURALS[correlation.level];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Releases da análise de {correlation.repository.name}
        <Typography variant="body2" color="text.secondary">
          Entram na correlação as releases em que o repositório tem valor para todas as {noun}. O valor é o da última
          análise dentro do período da release.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box overflow="auto">
          <Table size="small" aria-label={`Releases da análise de ${correlation.repository.name}`}>
            <TableHead>
              <TableRow>
                <TableCell>Release</TableCell>
                <TableCell>Período</TableCell>
                {correlation.entities.map((entity) => (
                  <TableCell key={entity.key} align="right">
                    {entity.name}
                  </TableCell>
                ))}
                <TableCell>Situação</TableCell>
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
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
