import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { ComparisonLevel, WeightComparisonRow } from '../../utils/weightsComparison';

export type ComparisonHighlight = 'last' | 'default' | null;

interface WeightsComparisonTableProps {
  rows: WeightComparisonRow[];
  highlight: ComparisonHighlight;
  lastColumnLabel: string;
}

const TRANSLATION_PREFIX: Record<ComparisonLevel, string> = {
  characteristic: 'characteristics',
  subcharacteristic: 'subCharacteristics',
  measure: 'measures',
};

const INDENT: Record<ComparisonLevel, number> = {
  characteristic: 1,
  subcharacteristic: 3,
  measure: 5,
};

export default function WeightsComparisonTable({ rows, highlight, lastColumnLabel }: WeightsComparisonTableProps) {
  const { t } = useTranslation('plan_release');

  const renderWeight = (value: number | null, column: 'last' | 'default', differs: boolean) => {
    const isHighlighted = differs && highlight === column;
    return (
      <TableCell
        align="right"
        sx={{
          fontWeight: isHighlighted ? 700 : 400,
          color: isHighlighted ? DASHBOARD_COLORS.primary : DASHBOARD_COLORS.text,
        }}
      >
        {value ?? '—'}
      </TableCell>
    );
  };

  return (
    <Box data-testid="weights-comparison-table">
      <Typography variant="caption" sx={{ color: DASHBOARD_COLORS.mutedText, display: 'block', mb: 1 }}>
        {t('hierarchyLegend')}
      </Typography>
      <TableContainer sx={{ border: `1px solid ${DASHBOARD_COLORS.gridLine}`, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('entity')}</TableCell>
              <TableCell align="right">{lastColumnLabel}</TableCell>
              <TableCell align="right">{t('defaultColumn')}</TableCell>
              <TableCell align="center">{t('differsColumn')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => {
              const isCharacteristic = row.level === 'characteristic';
              return (
                <TableRow
                  key={`${row.level}-${row.key}`}
                  data-testid={`comparison-row-${row.key}`}
                  sx={{ bgcolor: isCharacteristic ? DASHBOARD_COLORS.infoBackground : 'transparent' }}
                >
                  <TableCell
                    sx={{
                      pl: INDENT[row.level],
                      fontWeight: row.level === 'subcharacteristic' ? 600 : 400,
                      color: isCharacteristic ? DASHBOARD_COLORS.primary : DASHBOARD_COLORS.text,
                    }}
                  >
                    {t(`${TRANSLATION_PREFIX[row.level]}.${row.key}`)}
                  </TableCell>
                  {renderWeight(row.last, 'last', row.differs)}
                  {renderWeight(row.default, 'default', row.differs)}
                  <TableCell align="center">
                    {row.differs && (
                      <Box
                        component="span"
                        role="img"
                        aria-label={t('differsColumn')}
                        sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', bgcolor: DASHBOARD_COLORS.primary }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
