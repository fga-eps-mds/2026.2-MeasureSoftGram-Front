import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FLASH_MESSAGE_KEY } from '../../../../shared/utils/flashMessage';
import AuthCallback, { resolveCallbackResult } from '../callback/AuthCallback';

const fetchMock = global.fetch as jest.Mock;
const flash = () => JSON.parse(sessionStorage.getItem(FLASH_MESSAGE_KEY) as string);
const reply = (status: number, body: object) => Promise.resolve({ status, json: async () => body });

describe('AuthCallback', () => {
  const originalLocation = window.location;
  const replace = jest.fn();

  const setSearch = (search: string) => {
    delete (window as any).location;
    window.location = { search, replace, assign: jest.fn() } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    fetchMock.mockReset();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('mostra só o loading, sem nenhum botão', () => {
    setSearch('?code=abc&state=xyz');
    fetchMock.mockReturnValue(new Promise(() => undefined));

    render(<AuthCallback />);

    expect(screen.getByRole('status')).toHaveTextContent('Autenticando no MeasureSoftGram');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('faz uma única chamada ao servidor com code e state e vai direto ao destino', async () => {
    setSearch('?code=abc&state=xyz');
    fetchMock.mockReturnValue(reply(200, { outcome: 'success', redirectTo: '/products/1-2-x' }));

    render(<AuthCallback />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/products/1-2-x'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/bff/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'abc', error: null, state: 'xyz' })
    });
    expect(flash()).toEqual({ type: 'success', text: 'Login realizado com sucesso!' });
  });

  it('state inválido vai para /auth/error', async () => {
    setSearch('?code=abc&state=falso');
    fetchMock.mockReturnValue(reply(400, { error: 'invalid_state' }));

    render(<AuthCallback />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth/error'));
    expect(flash().type).toBe('error');
  });

  it('cancelamento no provedor sem sessão vai para /auth com aviso', async () => {
    setSearch('?error=access_denied&state=xyz');
    fetchMock.mockReturnValue(reply(200, { outcome: 'cancelled', redirectTo: null }));

    render(<AuthCallback />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth'));
    expect(flash()).toEqual({ type: 'info', text: 'Login cancelado' });
  });

  it('cancelamento da reautorização volta para onde a pessoa estava', async () => {
    setSearch('?error=access_denied&state=xyz');
    fetchMock.mockReturnValue(reply(200, { outcome: 'cancelled', redirectTo: '/products' }));

    render(<AuthCallback />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/products'));
  });

  it('falha de rede vai para /auth com o erro', async () => {
    setSearch('?code=abc&state=xyz');
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    render(<AuthCallback />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth'));
    expect(flash().text).toBe('Sua sessão expirou. Por favor, faça login novamente!');
  });

  it('sem code nem error volta para /auth sem chamar o servidor', async () => {
    setSearch('');

    render(<AuthCallback />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolveCallbackResult cobre as respostas do servidor', () => {
    expect(resolveCallbackResult(200, { outcome: 'success' }).destination).toBe('/home');
    expect(resolveCallbackResult(200, { outcome: 'provider_error', redirectTo: null })).toMatchObject({
      destination: '/auth',
      flash: { type: 'error', text: 'Erro na autorização do provedor.' }
    });
    // sem o detalhe técnico do Service (US11.01 CA5)
    const expired = { destination: '/auth', flash: { type: 'error', text: 'Sua sessão expirou. Por favor, faça login novamente!' } };
    expect(resolveCallbackResult(400, { error: 'login_failed', message: 'E-mail em uso' })).toMatchObject(expired);
    expect(resolveCallbackResult(502, {})).toMatchObject(expired);
    expect(resolveCallbackResult(400, {})).toMatchObject(expired);
  });
});
