import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
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
import { EntityAnalysis, EntityLevel, EntityMatrixLevel } from '@customTypes/product';
import { useRequest } from '@hooks/useRequest';
import { productQuery } from '@services/product';
import { formatEntityValue, LEVEL_LABELS, noDataLabel } from '@utils/entityLevels';
import { useTranslation } from 'react-i18next';
import { formatScore } from '@utils/entityMatrix';
import { getQualityBand, QualityBand } from '@utils/qualityBands';
import { SelectedCell } from './EntityHeatmap';

const CHILD_LEVEL: Record<EntityMatrixLevel, EntityLevel> = {
  characteristic: 'subcharacteristic',
  subcharacteristic: 'measure',
  measure: 'metric'
};

interface Props {
  organizationId: string;
  productId: string;
  releaseId?: number;
  level: EntityMatrixLevel;
  cell: SelectedCell | null;
  onClose: () => void;
  /** Régua do produto, que dá o grau do valor (US30.02). */
  bands: QualityBand[];
}

function formatCellValue(value: number | null, bands: QualityBand[]): string {
  if (value === null) return noDataLabel();
  const band = getQualityBand(value, bands);
  return band ? `${formatScore(value)} (${band.grade}, ${band.label})` : formatScore(value);
}

/** Composição da célula (CA7): os filhos da entidade naquele repositório, com o peso e o valor de cada um. */
export default function RepositoryDetailDialog({
  organizationId,
  productId,
  releaseId,
  level,
  cell,
  onClose,
  bands
}: Readonly<Props>) {
  const { t } = useTranslation('dashboards');
  const childLevel = CHILD_LEVEL[level];
  const {
    data: analysis,
    error,
    isLoading,
    mutate
  } = useRequest<EntityAnalysis>(
    cell ? productQuery.getEntityAnalysis(organizationId, productId, { releaseId, level, key: cell.column.key }) : null
  );
  const children = analysis?.repositories.find((repository) => repository.id === cell?.repository.id)?.children;

  const renderContent = () => {
    if (error) {
      return (
        <Box display="flex" alignItems="center" gap={2}>
          <Typography color="text.secondary">{t('entity.detail.error')}</Typography>
          <Button size="small" onClick={() => void mutate()}>
            {t('entity.detail.retry')}
          </Button>
        </Box>
      );
    }
    if (isLoading || !analysis) {
      return (
        <Box display="flex" justifyContent="center" padding={2}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    if (!children || children.length === 0) {
      return <Typography color="text.secondary">{t('entity.detail.no-children')}</Typography>;
    }
    return (
      <Table size="small" aria-label={t('entity.detail.children', { name: cell?.column.name })}>
        <TableHead>
          <TableRow>
            <TableCell>{LEVEL_LABELS[childLevel]}</TableCell>
            <TableCell align="right">{t('entity.detail.weight')}</TableCell>
            <TableCell align="right">{t('entity.detail.value')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {children.map((child) => (
            <TableRow key={child.key}>
              <TableCell>{child.name}</TableCell>
              <TableCell align="right">{child.weight === null ? '—' : `${child.weight}%`}</TableCell>
              <TableCell
                align="right"
                sx={child.value === null ? { color: 'text.secondary', fontStyle: 'italic' } : undefined}
              >
                {childLevel === 'metric'
                  ? formatEntityValue(child.value, childLevel)
                  : formatCellValue(child.value, bands)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Dialog open={!!cell} onClose={onClose} fullWidth maxWidth="sm">
      {cell && (
        <>
          <DialogTitle>
            {t('entity.detail.title', { entity: cell.column.name, repository: cell.repository.name })}
            <Typography variant="body2" color="text.secondary">
              {t('entity.detail.value-line', { value: formatCellValue(cell.value, bands) })}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>{renderContent()}</DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t('entity.detail.close')}</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
