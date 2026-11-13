import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { DEFAULT_LIMITS, formatLimit } from '@utils/qualityBandsForm';

interface RestoreDefaultsDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const defaults = DEFAULT_LIMITS.map(formatLimit);
const defaultsText = `${defaults.slice(0, -1).join(', ')} e ${defaults.at(-1)}`;

/** Confirmação do "Restaurar padrão" (CA4). */
export default function RestoreDefaultsDialog({ open, onCancel, onConfirm }: RestoreDefaultsDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="restore-defaults-title" maxWidth="xs">
      <DialogTitle id="restore-defaults-title" fontWeight="bold" color={DASHBOARD_COLORS.text}>
        Restaurar os limites padrão?
      </DialogTitle>
      <DialogContent>
        <DialogContentText color={DASHBOARD_COLORS.mutedText}>
          Os limites entre as faixas voltam a {defaultsText}, e a alteração é salva.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ padding: '0 24px 20px' }}>
        <Button onClick={onCancel} sx={{ textTransform: 'none', color: DASHBOARD_COLORS.primary }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={onConfirm}
          sx={{ textTransform: 'none', fontWeight: 'bold', backgroundColor: DASHBOARD_COLORS.primary }}
        >
          Restaurar padrão
        </Button>
      </DialogActions>
    </Dialog>
  );
}
