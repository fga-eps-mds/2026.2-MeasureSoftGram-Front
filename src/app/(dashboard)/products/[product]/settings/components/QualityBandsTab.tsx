import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';

import DashboardCard, { SkeletonBlock } from '@components/DashboardCard';
import MSGAlert from '../../../../../../components/idv/feedback';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { QUALITY_BANDS } from '@utils/qualityBands';
import {
  DEFAULT_LIMITS,
  formatLimit,
  formatLimits,
  getLimitErrors,
  getRulerSegments,
  limitsFromBands,
  parseLimit,
  parseLimits,
  sameLimits
} from '@utils/qualityBandsForm';
import { useQualityBands } from '../hooks/useQualityBands';
import QualityBandsRuler from './QualityBandsRuler';
import RestoreDefaultsDialog from './RestoreDefaultsDialog';
import { useTranslation } from 'react-i18next';

type Feedback = 'saved' | 'error' | null;

const buttonSx = { textTransform: 'none', fontWeight: 'bold', minWidth: '140px' } as const;

// o sx com a cor da marca valeria também para o botão desabilitado, que pareceria clicável
const disabledSx = {
  '&.Mui-disabled': { color: DASHBOARD_COLORS.mutedText, borderColor: DASHBOARD_COLORS.skeleton }
} as const;

/** "De" de uma faixa enquanto o usuário digita: o "Até" da anterior, ou um traço se ele ainda não for um número. */
function startOf(drafts: string[], index: number): string {
  if (index === 0) return formatLimit(0);
  const value = parseLimit(drafts[index - 1]);
  return Number.isNaN(value) ? '—' : formatLimit(value);
}

/** Aba "Faixas de qualidade" das configurações do produto (US30.01). */
export default function QualityBandsTab({ organizationId, productId }: { organizationId: string; productId: string }) {
  const { t } = useTranslation('settings');
  const { qualityBands, status, save, restore, retry } = useQualityBands(organizationId, productId);

  const savedLimits = useMemo(
    () => (qualityBands ? limitsFromBands(qualityBands.bands) : DEFAULT_LIMITS),
    [qualityBands]
  );
  const [drafts, setDrafts] = useState<string[]>(formatLimits(savedLimits));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // a régua salva (ao carregar, salvar ou restaurar) passa a ser o ponto de partida dos campos. Depende dos valores,
  // não do array: uma revalidação do SWR com as mesmas faixas não pode apagar o que foi digitado (CA6)
  const savedKey = savedLimits.join(';');
  useEffect(() => {
    setDrafts(formatLimits(savedLimits));
  }, [savedKey]);

  const errors = getLimitErrors(drafts);
  const hasErrors = errors.some(Boolean);
  const isDirty = hasErrors || !sameLimits(parseLimits(drafts), savedLimits);
  const canEdit = qualityBands?.can_edit ?? false;
  const isDefault = !isDirty && (qualityBands?.is_default ?? true);
  const segments = getRulerSegments(drafts, savedLimits);

  const changeLimit = (index: number, value: string) => {
    setFeedback(null);
    setDrafts((current) => current.map((draft, position) => (position === index ? value : draft)));
  };

  const run = async (action: () => Promise<void>) => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await action();
      setFeedback('saved');
    } catch {
      // os valores digitados ficam na tela para o usuário tentar de novo (CA6)
      setFeedback('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => run(() => save(parseLimits(drafts)));

  const handleRestore = () => {
    setIsConfirmOpen(false);
    void run(restore);
  };

  return (
    <DashboardCard
      title={t('quality-bands.tab')}
      status={status}
      loadingMessage={t('quality-bands.loading')}
      loadingContent={<SkeletonBlock width="100%" height={220} />}
      errorTitle={t('quality-bands.load-error')}
      onRetry={retry}
    >
      <Typography fontSize="14px" color={DASHBOARD_COLORS.mutedText}>
        {t('quality-bands.description')}
        {!canEdit && t('quality-bands.admin-only')}
      </Typography>

      <QualityBandsRuler segments={segments} />

      <Box component="ul" sx={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {QUALITY_BANDS.map((band, index) => {
          const isLast = index === QUALITY_BANDS.length - 1;
          const error = isLast ? null : errors[index];
          const label = `${band.grade} · ${band.label}`;

          return (
            <Box
              component="li"
              key={band.grade}
              data-testid={`quality-band-${band.grade}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(160px, 1fr) 120px 160px' },
                alignItems: 'start',
                columnGap: '16px',
                rowGap: '4px',
                padding: '12px 0',
                borderTop: index === 0 ? 'none' : `1px solid ${DASHBOARD_COLORS.gridLine}`
              }}
            >
              <Box display="flex" alignItems="center" gap="10px" minHeight="40px">
                <Box
                  aria-hidden
                  sx={{ width: 16, height: 16, borderRadius: '4px', backgroundColor: band.color, flexShrink: 0 }}
                />
                <Typography fontWeight="bold" fontSize="14px" color={DASHBOARD_COLORS.text}>
                  {label}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" minHeight="40px" gap="6px">
                <Typography fontSize="14px" color={DASHBOARD_COLORS.mutedText}>
                  {t('quality-bands.from')}
                </Typography>
                <Typography fontSize="14px" color={DASHBOARD_COLORS.text} data-testid={`band-start-${band.grade}`}>
                  {startOf(drafts, index)}
                </Typography>
              </Box>

              {canEdit && !isLast ? (
                <TextField
                  size="small"
                  label={t('quality-bands.to')}
                  value={drafts[index]}
                  onChange={(event) => changeLimit(index, event.target.value)}
                  error={!!error}
                  helperText={error ?? ' '}
                  disabled={isSaving}
                  inputProps={{ inputMode: 'decimal', 'aria-label': t('quality-bands.to-aria', { band: label }) }}
                />
              ) : (
                <Box display="flex" alignItems="center" minHeight="40px" gap="6px">
                  <Typography fontSize="14px" color={DASHBOARD_COLORS.mutedText}>
                    {t('quality-bands.to')}
                  </Typography>
                  <Typography fontSize="14px" color={DASHBOARD_COLORS.text} data-testid={`band-end-${band.grade}`}>
                    {isLast ? formatLimit(1) : drafts[index]}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {feedback === 'saved' && <MSGAlert severity="success" title={t('quality-bands.saved')} />}
      {feedback === 'error' && <MSGAlert severity="error" title={t('quality-bands.save-error')} />}

      {canEdit && (
        <Box display="flex" justifyContent="flex-end" flexWrap="wrap" gap="12px">
          <Button
            variant="outlined"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isSaving || isDefault}
            sx={{ ...buttonSx, color: DASHBOARD_COLORS.primary, borderColor: DASHBOARD_COLORS.primary, ...disabledSx }}
          >
            {t('quality-bands.restore')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => void handleSave()}
            disabled={isSaving || !isDirty || hasErrors}
            sx={{
              ...buttonSx,
              backgroundColor: DASHBOARD_COLORS.primary,
              '&.Mui-disabled': { ...disabledSx['&.Mui-disabled'], backgroundColor: DASHBOARD_COLORS.skeleton }
            }}
          >
            {isSaving ? t('quality-bands.saving') : t('quality-bands.save')}
          </Button>
        </Box>
      )}

      <RestoreDefaultsDialog
        open={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleRestore}
      />
    </DashboardCard>
  );
}
