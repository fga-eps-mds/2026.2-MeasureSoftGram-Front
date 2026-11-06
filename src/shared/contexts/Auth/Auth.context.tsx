'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getUserInfo } from '@services/Auth';
import { toast } from 'react-toastify';
import ConfirmModal from '@components/ConfirmModal/ConfirmModal';
import { setFlashMessage } from '../../utils/flashMessage';
import { WELCOME_COOKIE } from '../../server/auth/cookies';

export const authContextDefaultValues: authContextType = {
  session: null,
  loading: 'loading',
  logout: async () => {},
  provider: 'credentials'
};

export const AuthContext = createContext<authContextType>(authContextDefaultValues);

const SESSION_LIMIT_MS = 2 * 60 * 60 * 1000;
const WARNING_BEFORE_LIMIT_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const EXPIRING_MESSAGE = 'Sua sessão expirará em menos de 10 minutos. Salve seu trabalho para evitar perda de dados.';
// chaves da época em que o token ficava no localStorage: não devem continuar guardadas
const LEGACY_STORAGE_KEYS = ['token', 'session', 'provider', 'login_timestamp'];

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  provider?: Providers;
  loginAt?: number | null;
}

async function endSession(): Promise<void> {
  await fetch('/bff/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
}

export const AuthProvider = ({ children, initialUser = null, provider = 'credentials', loginAt = null }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const warningShownRef = useRef(false);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    if (!user || !document.cookie.split('; ').includes(`${WELCOME_COOKIE}=1`)) return;

    document.cookie = `${WELCOME_COOKIE}=; Max-Age=0; path=/`;
    toast.success(`Bem vindo ao MeasureSoftGram ${user.username}!`);
  }, [user]);

  // O servidor não conseguiu consultar o Service: o usuário é buscado aqui. Se o token foi rejeitado, o
  // interceptor do axios leva ao login.
  useEffect(() => {
    if (initialUser) return;
    let active = true;

    void getUserInfo().then((response) => {
      if (active && response.type === 'success') setUser(response.value);
    });

    return () => {
      active = false;
    };
  }, [initialUser]);

  const logout = useCallback(async (message: string = 'Volte logo para acompanhar seus produtos!', type: 'success' | 'warning' = 'success') => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;

    await endSession();
    setFlashMessage({ type, text: message });
    globalThis.location.assign('/');
  }, []);

  useEffect(() => {
    if (!loginAt) return;

    const checkSessionTime = () => {
      const elapsed = Date.now() - loginAt;

      if (elapsed >= SESSION_LIMIT_MS) {
        setIsWarningOpen(false);
        void logout('Sua sessão expirou por segurança (limite de 2h).', 'warning');
      } else if (elapsed >= SESSION_LIMIT_MS - WARNING_BEFORE_LIMIT_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        setIsWarningOpen(true);
        toast.warning(EXPIRING_MESSAGE);
      }
    };

    checkSessionTime();
    const interval = setInterval(checkSessionTime, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loginAt, logout]);

  const value = useMemo<authContextType>(
    () => ({
      session: user,
      logout: () => logout(),
      provider,
      loading: user ? 'loaded' : 'loading'
    }),
    [logout, provider, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ConfirmModal
        isModalOpen={isWarningOpen}
        setIsModalOpen={setIsWarningOpen}
        text={EXPIRING_MESSAGE}
        btnConfirmText="Entendi"
        btnDismissText="Sair Agora"
        handleConfirmBtnClick={() => setIsWarningOpen(false)}
        handleDismissBtnClick={() => {
          setIsWarningOpen(false);
          void logout();
        }}
      />
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider');
  }

  return context;
}
