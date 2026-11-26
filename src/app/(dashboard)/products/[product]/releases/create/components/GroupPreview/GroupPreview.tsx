import React from 'react';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import MSGAlert, { MSG_ALERT_STYLES } from '../../../../../../../../components/idv/feedback/MSGAlert';

export interface PreviewRow {
  key: string;
  name: string;
  before?: number;
  after: number;
}

export interface ConsistencyInfo {
  status: 'done' | 'accepted' | 'inconsistent';
  cr: number;
  threshold: number;
  /** "Testes Passados > Builds de Teste > … > Testes Passados", quando há ciclo. */
  explanation?: string;
}

interface GroupPreviewProps {
  rows: PreviewRow[];
  consistency?: ConsistencyInfo;
  onReview?: () => void;
  onAccept?: () => void;
}

export function formatDecimal(value: number, language = 'pt-BR'): string {
  return value.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function variationColor(delta: number): string {
  if (delta > 0) return MSG_ALERT_STYLES.success.text;
  if (delta < 0) return MSG_ALERT_STYLES.warning.text;
  return DASHBOARD_COLORS.mutedText;
}

const signed = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

/** Prévia do grupo (telas 05, 06 e 07): consistência e pesos antes → depois. Nada é gravado aqui. */
export default function GroupPreview({ rows, consistency, onReview, onAccept }: GroupPreviewProps) {
  const { t, i18n } = useTranslation('plan_release');
  const language = i18n?.language === 'en' ? 'en-US' : 'pt-BR';

  const renderConsistency = () => {
    if (!consistency) return null;
    const cr = formatDecimal(consistency.cr, language);
    const threshold = formatDecimal(consistency.threshold, language);

    if (consistency.status === 'done')
      return <MSGAlert severity="success" title={t('consistencyOk', { cr })}>{t('consistencyOkBody')}</MSGAlert>;

    const actions = (
      <Box display="flex" gap={1} flexShrink={0}>
        <Button size="small" onClick={onReview} sx={{ color: MSG_ALERT_STYLES.warning.text, fontWeight: 700, textTransform: 'none' }}>
          {t('reviewAnswers')}
        </Button>
        {consistency.status === 'inconsistent' && (
          <Button size="small" onClick={onAccept} sx={{ color: MSG_ALERT_STYLES.warning.text, fontWeight: 700, textTransform: 'none' }}>
            {t('acceptAnyway')}
          </Button>
        )}
      </Box>
    );

    const title = consistency.status === 'accepted'
      ? t('consistencyAccepted', { cr })
      : t('consistencyHigh', { cr, threshold });

    return (
      <MSGAlert severity="warning" title={title} action={actions}>
        {consistency.explanation ?? t('consistencyHighGeneric')}
      </MSGAlert>
    );
  };

  return (
    <Box data-testid="group-preview" sx={{ mt: 2 }}>
      {consistency && (
        <>
          <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, mb: 1 }}>{t('previewTitle')}</Typography>
          {renderConsistency()}
        </>
      )}
      <Box sx={{ mt: 2, border: `1px solid ${DASHBOARD_COLORS.gridLine}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('entity')}</TableCell>
              <TableCell align="right">{t('before')}</TableCell>
              <TableCell aria-hidden />
              <TableCell>{t('after')}</TableCell>
              <TableCell align="right">{t('variation')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => {
              const delta = row.before === undefined ? 0 : row.after - row.before;
              return (
                <TableRow key={row.key} data-testid={`preview-row-${row.key}`}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">{row.before ?? '—'}</TableCell>
                  <TableCell aria-hidden sx={{ color: DASHBOARD_COLORS.mutedText }}>→</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Typography sx={{ fontWeight: 700, color: DASHBOARD_COLORS.primary, minWidth: 28 }}>{row.after}</Typography>
                      <Box sx={{ flex: 1, minWidth: 80, height: 6, borderRadius: 3, bgcolor: DASHBOARD_COLORS.gridLine }}>
                        <Box sx={{ width: `${row.after}%`, height: '100%', borderRadius: 3, bgcolor: DASHBOARD_COLORS.primary }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: variationColor(delta) }}>{signed(delta)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
