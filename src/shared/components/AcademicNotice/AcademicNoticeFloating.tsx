import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, ButtonBase, Typography } from '@mui/material';
import { ACADEMIC_NOTICE_BANNER_ID, WarningIcon } from './AcademicNotice';

/**
 * Leva o usuário de volta até a tarja do topo e passa o foco para ela, para que leitores de tela leiam o aviso.
 * Sem a tarja na página, só volta para o topo.
 */
export function goToAcademicNotice() {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
  const banner = document.getElementById(ACADEMIC_NOTICE_BANNER_ID);

  if (!banner) {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  banner.scrollIntoView?.({ behavior, block: 'start' });
  banner.focus({ preventScroll: true });
}

/** Selo fixo no canto inferior esquerdo: fica visível durante toda a rolagem e leva até a tarja do topo. */
export default function AcademicNoticeFloating() {
  const { t } = useTranslation();

  return (
    <ButtonBase
      type="button"
      onClick={goToAcademicNotice}
      aria-controls={ACADEMIC_NOTICE_BANNER_ID}
      data-testid="academic-notice-floating"
      sx={{
        position: 'fixed',
        left: { xs: 16, md: 28 },
        bottom: { xs: 16, md: 28 },
        zIndex: (theme) => theme.zIndex.speedDial,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        maxWidth: 'calc(100vw - 32px)',
        py: 1,
        pl: 1,
        pr: 3,
        borderRadius: '999px',
        border: '2px solid #1F3047',
        backgroundColor: '#F6C343',
        color: '#1F3047',
        textAlign: 'left',
        boxShadow: '0 8px 24px rgba(31, 48, 71, 0.25)',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(31, 48, 71, 0.3)' },
        '&.Mui-focusVisible': { outline: '3px solid #1F3047', outlineOffset: 3 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
      }}
    >
      <WarningIcon size={44} />
      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Typography component="span" sx={{ fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.3 }}>
          {t('academicNotice.badge')}
        </Typography>
        <Typography component="span" sx={{ fontSize: '0.8125rem', lineHeight: 1.3 }}>
          {t('academicNotice.floatingHint')} · {t('academicNotice.viewNotice')}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
