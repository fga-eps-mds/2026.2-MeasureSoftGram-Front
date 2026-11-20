import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { DEFAULT_LIMITS, formatLimit } from '@utils/qualityBandsForm';
import { useTranslation } from 'react-i18next';

interface RestoreDefaultsDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const defaults = DEFAULT_LIMITS.map(formatLimit);

/** Confirmação do "Restaurar padrão" (CA4). */
export default function RestoreDefaultsDialog({ open, onCancel, onConfirm }: RestoreDefaultsDialogProps) {
  const { t } = useTranslation('settings');
  const defaultsText = t('quality-bands.restore-dialog.limits', {
    list: defaults.slice(0, -1).join(', '),
    last: defaults.at(-1)
  });
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="restore-defaults-title" maxWidth="xs">
      <DialogTitle id="restore-defaults-title" fontWeight="bold" color={DASHBOARD_COLORS.text}>
        {t('quality-bands.restore-dialog.title')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText color={DASHBOARD_COLORS.mutedText}>
          {t('quality-bands.restore-dialog.description', { limits: defaultsText })}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ padding: '0 24px 20px' }}>
        <Button onClick={onCancel} sx={{ textTransform: 'none', color: DASHBOARD_COLORS.primary }}>
          {t('quality-bands.restore-dialog.cancel')}
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={onConfirm}
          sx={{ textTransform: 'none', fontWeight: 'bold', backgroundColor: DASHBOARD_COLORS.primary }}
        >
          {t('quality-bands.restore')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
