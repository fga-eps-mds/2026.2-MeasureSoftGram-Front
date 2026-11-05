import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { getUserInfo } from '@services/Auth';
import { toast } from 'react-toastify';
import { FLASH_MESSAGE_KEY } from '../../../utils/flashMessage';
import { AuthProvider, useAuth } from '../Auth.context';

jest.mock('@services/Auth', () => ({
  getUserInfo: jest.fn()
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }
}));

// Mock simples do ConfirmModal para focar na lógica do contexto
jest.mock(
  '@components/ConfirmModal/ConfirmModal',
  () =>
    function MockConfirmModal({ isModalOpen, btnConfirmText, btnDismissText, handleConfirmBtnClick, handleDismissBtnClick, text }: any) {
      if (!isModalOpen) return null;
      return (
        <div data-testid="confirm-modal">
          <p>{text}</p>
          <button onClick={handleConfirmBtnClick}>{btnConfirmText}</button>
          <button onClick={handleDismissBtnClick}>{btnDismissText}</button>
        </div>
      );
    }
);

const user = { username: 'alice', first_name: 'A', last_name: 'B', email: 'a@b.c', avatar_url: '', repos_url: '', organizations_url: '' };
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const TestComponent = () => {
  const { session, logout, loading, provider } = useAuth();

  return (
    <div>
      <span data-testid="loading-state">{loading}</span>
      <span data-testid="session-state">{session ? session.username : 'Deslogado'}</span>
      <span data-testid="provider">{provider}</span>
      <button onClick={() => logout()} data-testid="btn-logout">
        Logout
      </button>
    </div>
  );
};

describe('AuthProvider', () => {
  const assign = jest.fn();
  const flash = () => JSON.parse(sessionStorage.getItem(FLASH_MESSAGE_KEY) as string);

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    (getUserInfo as jest.Mock).mockResolvedValue({ type: 'error', error: new Error('sem sessão') });
    Object.defineProperty(globalThis, 'location', {
      value: { assign, search: '', href: 'http://localhost/', pathname: '/home' },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('usa o usuário e o provedor vindos do servidor, sem buscar nada', () => {
    render(
      <AuthProvider initialUser={user} provider="gitlab">
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('session-state')).toHaveTextContent('alice');
    expect(screen.getByTestId('provider')).toHaveTextContent('gitlab');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
    expect(getUserInfo).not.toHaveBeenCalled();
  });

  it('busca o usuário no cliente quando o servidor não conseguiu consultar o Service', async () => {
    (getUserInfo as jest.Mock).mockResolvedValue({ type: 'success', value: user });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');

    await waitFor(() => expect(screen.getByTestId('session-state')).toHaveTextContent('alice'));
    expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
  });

  it('mantém sem sessão se a busca no cliente falhar', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(getUserInfo).toHaveBeenCalled());
    expect(screen.getByTestId('session-state')).toHaveTextContent('Deslogado');
  });

  it('expõe o provedor padrão "credentials"', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.session).toBeNull();
    expect(result.current.provider).toBe('credentials');
    expect(result.current.logout).toBeInstanceOf(Function);
  });

  it('apaga as chaves de sessão que ficavam no localStorage', () => {
    ['token', 'session', 'provider', 'login_timestamp'].forEach((key) => localStorage.setItem(key, 'x'));
    localStorage.setItem('selectedOrgId', '1');

    render(
      <AuthProvider initialUser={user}>
        <div />
      </AuthProvider>
    );

    ['token', 'session', 'provider', 'login_timestamp'].forEach((key) => expect(localStorage.getItem(key)).toBeNull());
    expect(localStorage.getItem('selectedOrgId')).toBe('1');
  });

  describe('logout', () => {
    it('encerra a sessão no servidor, guarda o aviso e recarrega a página em "/"', async () => {
      render(
        <AuthProvider initialUser={user}>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('btn-logout'));

      await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
      expect(global.fetch).toHaveBeenCalledWith('/bff/session', { method: 'DELETE', credentials: 'same-origin' });
      expect(flash()).toEqual({ type: 'success', text: 'Volte logo para acompanhar seus produtos!' });
    });

    it('sai mesmo se o servidor não responder', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('rede'));

      render(
        <AuthProvider initialUser={user}>
          <TestComponent />
        </AuthProvider>
      );
      fireEvent.click(screen.getByTestId('btn-logout'));

      await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    });

    it('não repete a saída se for chamado de novo', async () => {
      render(
        <AuthProvider initialUser={user}>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('btn-logout'));
      fireEvent.click(screen.getByTestId('btn-logout'));

      await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('expiração da sessão', () => {
    const renderWithLoginAt = (elapsed: number) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));
      return render(
        <AuthProvider initialUser={user} loginAt={Date.now() - elapsed}>
          <TestComponent />
        </AuthProvider>
      );
    };

    it('não avisa nem sai antes de 1h50', () => {
      renderWithLoginAt(HOUR);

      expect(toast.warning).not.toHaveBeenCalled();
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });

    it('sem horário de login (modo mock) não monitora a sessão', () => {
      jest.useFakeTimers();
      render(
        <AuthProvider initialUser={user}>
          <TestComponent />
        </AuthProvider>
      );
      act(() => {
        jest.advanceTimersByTime(3 * HOUR);
      });

      expect(toast.warning).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    });

    it('avisa uma vez só aos 1h50, com toast e modal', () => {
      renderWithLoginAt(HOUR + 50 * MINUTE);

      expect(toast.warning).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(MINUTE);
      });
      expect(toast.warning).toHaveBeenCalledTimes(1);
    });

    it('"Entendi" fecha o aviso e a sessão continua', () => {
      renderWithLoginAt(HOUR + 55 * MINUTE);

      fireEvent.click(screen.getByText('Entendi'));

      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(assign).not.toHaveBeenCalled();
    });

    it('"Sair Agora" encerra a sessão', async () => {
      render(
        <AuthProvider initialUser={user} loginAt={Date.now() - (HOUR + 55 * MINUTE)}>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByText('Sair Agora'));

      await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
      expect(flash().type).toBe('success');
    });

    it('passadas 2h faz logout automático e avisa que a sessão expirou', async () => {
      render(
        <AuthProvider initialUser={user} loginAt={Date.now() - 2 * HOUR - MINUTE}>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
      expect(flash()).toEqual({ type: 'warning', text: 'Sua sessão expirou por segurança (limite de 2h).' });
    });
  });
});
