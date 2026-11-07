import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { MSG_ALERT_STYLES } from '../../../../../../../components/idv/feedback';
import { formatDecimal } from '@utils/formatNumber';

export const DEMO_BANNER_TITLE = 'Modo demonstração: dados fictícios';
export const DEMO_LABEL = 'DEMONSTRAÇÃO';

interface Props {
  notice: string;
  tsqmi: number;
  onExit: () => void;
}

/**
 * Faixa fixa no topo enquanto os dados de demonstração estão na tela: diz que são fictícios, mostra o TSQMI de
 * demonstração (no lugar da badge, que é sempre a real) e permite voltar aos dados reais.
 */
export default function DemoDataBanner({ notice, tsqmi, onExit }: Readonly<Props>) {
  const style = MSG_ALERT_STYLES.warning;

  return (
    <Box
      role="status"
      aria-live="polite"
      data-testid="demo-data-banner"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: `2px dashed ${style.border}`,
        backgroundColor: '#FFF6E5',
        boxShadow: '0px 4px 16px rgba(145, 158, 171, 0.24)'
      }}
    >
      <Chip label={DEMO_LABEL} size="small" sx={{ fontWeight: 700, color: '#FFFFFF', backgroundColor: style.border }} />
      <Box flex="1 1 320px" minWidth={0}>
        <Typography fontWeight={700} fontSize="14px" color={style.text}>
          {DEMO_BANNER_TITLE}
        </Typography>
        <Typography fontSize="14px" color={style.text}>
          {notice}
        </Typography>
      </Box>
      <Typography data-testid="demo-tsqmi" fontWeight={700} fontSize="14px" color={style.text}>
        {`TSQMI de demonstração: ${formatDecimal(tsqmi)}`}
      </Typography>
      <Button variant="contained" color="warning" onClick={onExit} sx={{ textTransform: 'none', fontWeight: 700 }}>
        Sair da demonstração
      </Button>
    </Box>
  );
}
