'use client';

import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { SentimentDissatisfied } from '@mui/icons-material';
import { useNavigation } from '@hooks/useRouter';
import { AuthLayout } from '@layouts/auth';
import Image from 'next/image';
import logoImage from '@public/images/svg/logo.svg';
import { useTranslation } from 'react-i18next';

const AuthError: React.FC = () => {
  const { t } = useTranslation('auth');
  const router = useNavigation();

  return (
    <AuthLayout>
      <Box display="flex" flexDirection="column" alignItems="center" gap="2rem" textAlign="center">
        <Box sx={{ width: '60px', height: '60px', marginBottom: '0.5rem' }}>
          <Image src={logoImage} alt="Logo Measure" style={{ width: '100%', height: 'auto' }} />
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" gap="0.5rem">
          <SentimentDissatisfied sx={{ fontSize: '3rem', color: 'text.secondary' }} />

          <Typography variant="h5" fontWeight="bold" color="text.primary" gutterBottom>
            {t('error.title')}
          </Typography>

          <Typography variant="body1" color="text.secondary">
            {t('error.description')}
          </Typography>
        </Box>

        <Box sx={{ backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', width: '100%' }}>
          <Typography variant="body2" color="text.primary" fontWeight="bold" textAlign="left" gutterBottom>
            {t('error.tips-title')}
          </Typography>

          <Box display="flex" flexDirection="column" gap="0.75rem" mt={1}>
            <Typography variant="body2" color="text.secondary" textAlign="left">
              <strong>{t('error.tip1-title')}</strong> {t('error.tip1')}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="left">
              <strong>{t('error.tip2-title')}</strong> {t('error.tip2')}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="left">
              <strong>{t('error.tip3-title')}</strong> {t('error.tip3')}
            </Typography>
          </Box>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => {
            void router.push('/auth');
          }}
          sx={{
            py: 1.5,
            fontSize: '1rem',
            fontWeight: '600',
            textTransform: 'none',
            backgroundColor: '#24292e',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#1b1f23',
            },
          }}
        >
          {t('error.back')}
        </Button>
      </Box>
    </AuthLayout>
  );
};

export default AuthError;
