import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';

// Página da documentação que explica o projeto e a sua condição de produto acadêmico.
export const ACADEMIC_NOTICE_LEARN_MORE_URL = 'https://fga-eps-mds.github.io/MeasureSoftGram-Docs/docs/intro/';

const COLORS = {
  bannerBackground: '#1F3047',
  bannerText: '#FFFFFF',
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
  /** `banner`: faixa no topo da landing. `card`: caixa dentro do card de login. */
  variant: 'banner' | 'card';
};

function Badge({ label }: { label: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        flexShrink: 0,
        alignSelf: 'flex-start',
        px: 1.25,
        py: 0.25,
        borderRadius: '999px',
        backgroundColor: COLORS.badgeBackground,
        color: COLORS.badgeText,
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      }}
    >
      <WarningAmberRoundedIcon aria-hidden="true" sx={{ fontSize: '1rem' }} />
      {label}
    </Box>
  );
}

export default function AcademicNotice({ variant }: AcademicNoticeProps) {
  const { t } = useTranslation();

  if (variant === 'banner') {
    return (
      <Box
        component="aside"
        aria-label={t('academicNotice.title')}
        data-testid="academic-notice-banner"
        sx={{ backgroundColor: COLORS.bannerBackground, color: COLORS.bannerText, py: 1.5 }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            gap={{ xs: 1.25, md: 2 }}
          >
            <Badge label={t('academicNotice.badge')} />
            <Typography sx={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.5 }}>
              {renderWithStrong(t('academicNotice.summary'))}
            </Typography>
            <Button
              component="a"
              href={ACADEMIC_NOTICE_LEARN_MORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
              sx={{
                flexShrink: 0,
                color: COLORS.bannerText,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { borderColor: COLORS.bannerText, backgroundColor: 'rgba(255, 255, 255, 0.08)' }
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
