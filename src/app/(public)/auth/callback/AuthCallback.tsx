'use client';

import React, { useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import Image from 'next/image';
import logoImage from '@public/images/svg/logo.svg';
import { setFlashMessage } from '../../../../shared/utils/flashMessage';

const LOGIN_PAGE = '/auth';
const ERROR_PAGE = '/auth/error';
const OAUTH_REJECTED_MESSAGE = 'Não foi possível confirmar o login. Tente entrar novamente.';

interface SessionResponse {
  outcome?: 'success' | 'cancelled' | 'provider_error';
  redirectTo?: string | null;
  error?: string;
  message?: string;
}

export function resolveCallbackResult(status: number, data: SessionResponse) {
  if (data.error === 'invalid_state') {
    return { flash: { type: 'error', text: OAUTH_REJECTED_MESSAGE }, destination: ERROR_PAGE } as const;
  }
  if (data.outcome === 'success') {
    return { flash: { type: 'success', text: 'Login realizado com sucesso!' }, destination: data.redirectTo || '/home' } as const;
  }
  if (data.outcome === 'cancelled') {
    return { flash: { type: 'info', text: 'Login cancelado' }, destination: data.redirectTo || LOGIN_PAGE } as const;
  }
  if (data.outcome === 'provider_error') {
    return { flash: { type: 'error', text: 'Erro na autorização do provedor.' }, destination: data.redirectTo || LOGIN_PAGE } as const;
  }

  const reason = status >= 500 && !data.message ? 'Serviço indisponível' : data.message || 'Erro desconhecido';
  return { flash: { type: 'error', text: `Erro ao realizar login: ${reason}` }, destination: LOGIN_PAGE } as const;
}

const AuthCallback: React.FC = () => {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (!code && !error) {
      window.location.replace(LOGIN_PAGE);
      return;
    }

    const finish = (status: number, data: SessionResponse) => {
      const { flash, destination } = resolveCallbackResult(status, data);
      setFlashMessage(flash);
      window.location.replace(destination);
    };

    fetch('/bff/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, error, state: params.get('state') })
    })
      .then(async (response) => finish(response.status, (await response.json().catch(() => ({}))) as SessionResponse))
      .catch(() => finish(502, { message: 'Serviço indisponível' }));
  }, []);

  return (
    <Box
      role="status"
      aria-live="polite"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="1.5rem"
      minHeight="100vh"
      bgcolor="#fff"
    >
      <Box sx={{ width: '60px', height: '60px' }}>
        <Image src={logoImage} alt="Logo Measure" style={{ width: '100%', height: 'auto' }} />
      </Box>
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        Entrando no MeasureSoftGram...
      </Typography>
    </Box>
  );
};

export default AuthCallback;
