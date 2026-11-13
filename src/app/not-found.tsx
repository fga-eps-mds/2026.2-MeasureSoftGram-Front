'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import { SentimentDissatisfied } from '@mui/icons-material';
import { AuthLayout } from '@layouts/auth';
import logoImage from '@public/images/svg/logo.svg';

export default function NotFound() {
  return (
    <AuthLayout>
      <Box display="flex" flexDirection="column" alignItems="center" gap="1.5rem" textAlign="center">
        <Box sx={{ width: '60px', height: '60px' }}>
          <Image src={logoImage} alt="Logo Measure" style={{ width: '100%', height: 'auto' }} />
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" gap="0.5rem">
          <SentimentDissatisfied sx={{ fontSize: '3rem', color: 'text.secondary' }} />

          <Typography variant="h5" fontWeight="bold" color="text.primary">
            Página não encontrada
          </Typography>

          <Typography variant="body1" color="text.secondary">
            O endereço que você acessou não existe ou foi movido.
          </Typography>
        </Box>

        <Button component={Link} href="/" fullWidth variant="contained" size="large" sx={{ py: 1.5, textTransform: 'none' }}>
          Voltar para o início
        </Button>
      </Box>
    </AuthLayout>
  );
}
