import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';

// Página da documentação que explica o projeto e a sua condição de produto acadêmico.
export const ACADEMIC_NOTICE_LEARN_MORE_URL = 'https://fga-eps-mds.github.io/MeasureSoftGram-Docs/docs/intro/';

// id da tarja do topo: o selo flutuante rola até ela e passa o foco para ela.
export const ACADEMIC_NOTICE_BANNER_ID = 'academic-notice';

const COLORS = {
  yellow: '#F6C343',
  navy: '#1F3047',
  navyHover: '#2C4363',
  white: '#FFFFFF',
  badgeBackground: '#F6C343',
  badgeText: '#3B2A00',
  cardBackground: '#FFF6DC',
  cardBorder: '#F2C94C',
  cardText: '#4A3600'
};

/**
 * Os textos do aviso marcam os trechos em negrito com <strong>...</strong>. Converte essas marcas em elementos
 * <strong> sem usar dangerouslySetInnerHTML; o resto do texto continua texto puro.
 */
export function renderWithStrong(text: string): React.ReactNode[] {
  return text
    .split(/(<strong>.*?<\/strong>)/g)
    .filter(Boolean)
    .map((part, index) => {
      const match = /^<strong>(.*)<\/strong>$/.exec(part);
      // eslint-disable-next-line react/no-array-index-key
      return match ? <strong key={index}>{match[1]}</strong> : <React.Fragment key={index}>{part}</React.Fragment>;
    });
}

type AcademicNoticeProps = {
  /** `banner`: tarja no topo da landing. `card`: caixa dentro do card de login. */
  variant: 'banner' | 'card';
};

/** Ícone de atenção amarelo dentro de um círculo azul-escuro, usado na tarja e no selo flutuante. */
export function WarningIcon({ size }: { size: number }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: COLORS.navy,
        color: COLORS.yellow
      }}
    >
      <WarningAmberRoundedIcon sx={{ fontSize: size * 0.55 }} />
    </Box>
  );
}

export default function AcademicNotice({ variant }: AcademicNoticeProps) {
  const { t } = useTranslation();

  if (variant === 'banner') {
    return (
      <Box
        component="aside"
        id={ACADEMIC_NOTICE_BANNER_ID}
        tabIndex={-1}
        aria-label={t('academicNotice.title')}
        data-testid="academic-notice-banner"
        sx={{
          backgroundColor: COLORS.yellow,
          color: COLORS.navy,
          outline: 'none',
          // Faixa listrada de "atenção" na borda de baixo.
          borderBottom: '6px solid transparent',
          borderImage: `repeating-linear-gradient(-45deg, ${COLORS.navy} 0 12px, ${COLORS.yellow} 12px 24px) 6`
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            gap={{ xs: 1.5, md: 2.5 }}
            sx={{ py: 2 }}
          >
            <Stack direction="row" alignItems="flex-start" gap={2} sx={{ flex: 1 }}>
              <WarningIcon size={44} />
              <Box>
                <Typography component="p" sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.4, mb: 0.5 }}>
                  {t('academicNotice.title')}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {renderWithStrong(t('academicNotice.summary'))}
                </Typography>
              </Box>
            </Stack>
            <Button
              component="a"
              href={ACADEMIC_NOTICE_LEARN_MORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              disableElevation
              sx={{
                flexShrink: 0,
                alignSelf: { xs: 'flex-end', md: 'center' },
                px: 2.25,
                py: 1,
                backgroundColor: COLORS.navy,
                color: COLORS.white,
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 1,
                '&:hover': { backgroundColor: COLORS.navyHover }
              }}
            >
              {t('academicNotice.learnMore')}
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  const items = ['experimental', 'noGuarantee', 'noRealData'];

  return (
    <Box
      component="aside"
      aria-label={t('academicNotice.title')}
      data-testid="academic-notice-card"
      sx={{
        display: 'flex',
        gap: 1.5,
        width: '100%',
        boxSizing: 'border-box',
        p: 2,
        borderRadius: 2,
        border: `1px solid ${COLORS.cardBorder}`,
        backgroundColor: COLORS.cardBackground,
        color: COLORS.cardText
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: 1.5,
          backgroundColor: COLORS.badgeBackground,
          color: COLORS.badgeText
        }}
      >
        <SchoolOutlinedIcon aria-hidden="true" sx={{ fontSize: '1.25rem' }} />
      </Box>
      <Box>
        <Typography component="p" sx={{ fontSize: '0.875rem', fontWeight: 700, mb: 0.5 }}>
          {t('academicNotice.title')}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '0.8125rem', lineHeight: 1.6 }}>
          {items.map((item) => (
            <li key={item}>{renderWithStrong(t(`academicNotice.${item}`))}</li>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
