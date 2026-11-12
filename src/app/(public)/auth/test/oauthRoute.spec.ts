/** @jest-environment node */
import { NextRequest } from 'next/server';
import { verifyState } from '../../../../shared/server/auth/oauthState';
import { GET } from '../oauth/[provider]/route';

const fetchMock = global.fetch as jest.Mock;

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status });

const call = (provider: string, query = '', headers: Record<string, string> = {}) =>
  GET(new NextRequest(`http://localhost:3000/auth/oauth/${provider}${query}`, { headers }), { params: Promise.resolve({ provider }) });

const location = (response: Response) => new URL(response.headers.get('location') as string, 'http://localhost:3000');
const stateCookie = (response: Response) =>
  response.headers.getSetCookie().find((cookie) => cookie.startsWith('msgram_oauth_state='));

describe('/auth/oauth/[provider]', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(json(200, { valid: true }));
    process.env = {
      ...originalEnv,
      SERVICE_URL: 'http://service:8080/api',
      NEXT_PUBLIC_GITHUB_CLIENT_ID: 'gh-client',
      GITLAB_CLIENT_ID: 'gl-client',
      NEXT_PUBLIC_LOGIN_REDIRECT_URL: 'http://localhost:3000'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('valida o client id no Service e redireciona para o GitHub com o state', async () => {
    const response = await call('github');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://service:8080/api/v1/accounts/github/validate/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ client_id: 'gh-client' }) })
    );
    expect(response.status).toBe(307);
    const url = location(response);
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('gh-client');
    expect(url.searchParams.get('scope')).toBe('repo read:org user');
    expect(url.searchParams.has('prompt')).toBe(false);
  });

  it('grava o state em cookie HttpOnly de 10 min, com o mesmo nonce da URL', async () => {
    const response = await call('github', '?returnTo=%2Fproducts');
    const cookie = stateCookie(response) as string;

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=600/);
    const value = cookie.split(';')[0].split('=')[1];
    expect(verifyState(value, location(response).searchParams.get('state'))).toEqual({ provider: 'github', returnTo: '/products' });
  });

  it('GitLab usa o endpoint e o client id do GitLab', async () => {
    const response = await call('gitlab');

    expect(fetchMock.mock.calls[0][0]).toBe('http://service:8080/api/v1/accounts/gitlab/validate/');
    const url = location(response);
    expect(url.origin + url.pathname).toBe('https://gitlab.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('gl-client');
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('reautorização do GitHub pede a escolha da conta', async () => {
    const response = await call('github', '?returnTo=%2Fproducts&reauthorize=1');

    expect(location(response).searchParams.get('prompt')).toBe('select_account');
  });

  it.each(['//evil.com', 'https://evil.com', '/\t/evil.com', '/\r\n/evil.com/x', '/auth', '/'])('descarta o returnTo %j', async (returnTo) => {
    const response = await call('github', `?returnTo=${encodeURIComponent(returnTo)}`);
    const value = (stateCookie(response) as string).split(';')[0].split('=')[1];

    expect(verifyState(value, location(response).searchParams.get('state'))?.returnTo).toBeNull();
  });

  describe('falhas levam a /auth/error, sem gravar state', () => {
    const expectErrorPage = (response: Response) => {
      expect(response.status).toBe(307);
      // relativo: a origem do request é a interna do contêiner e não serve ao navegador
      expect(response.headers.get('location')).toBe('/auth/error/');
      expect(stateCookie(response)).toBeUndefined();
    };

    it('provedor desconhecido', async () => {
      expectErrorPage(await call('bitbucket'));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('client id ausente, sem chamar o Service', async () => {
      delete process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

      expectErrorPage(await call('github'));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('client id rejeitado pelo Service', async () => {
      fetchMock.mockResolvedValue(json(200, { valid: false }));

      expectErrorPage(await call('github'));
    });

    it('Service responde com erro', async () => {
      fetchMock.mockResolvedValue(json(500, {}));

      expectErrorPage(await call('gitlab'));
    });

    it('Service fora do ar', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      expectErrorPage(await call('github'));
    });
  });
});
