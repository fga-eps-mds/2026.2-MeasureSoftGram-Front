/** @jest-environment node */
import { NextRequest } from 'next/server';
import { serializeState } from '../../../shared/server/auth/oauthState';
import { DELETE, POST } from '../session/route';

const ORIGIN = 'http://localhost:3000';
const fetchMock = global.fetch as jest.Mock;

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const post = (body: object | null, { cookies = '', origin = ORIGIN }: { cookies?: string; origin?: string } = {}) =>
  POST(
    new NextRequest(`${ORIGIN}/bff/session`, {
      method: 'POST',
      headers: { host: 'localhost:3000', origin, 'content-type': 'application/json', cookie: cookies },
      body: body === null ? 'não é json' : JSON.stringify(body)
    })
  );

const pendingLogin = (provider: 'github' | 'gitlab' = 'github', returnTo: string | null = null, now = Date.now()) => {
  const { nonce, cookieValue } = serializeState({ provider, returnTo }, undefined, now);
  return { nonce, cookie: `msgram_oauth_state=${cookieValue}` };
};

const setCookies = (response: Response) => response.headers.getSetCookie();
const cookieNamed = (response: Response, name: string) => setCookies(response).find((cookie) => cookie.startsWith(`${name}=`));
const stateConsumed = (response: Response) => /^msgram_oauth_state=;.*Max-Age=0/i.test(cookieNamed(response, 'msgram_oauth_state') ?? '');

describe('/bff/session', () => {
  const originalServiceUrl = process.env.SERVICE_URL;

  beforeEach(() => {
    fetchMock.mockReset();
    process.env.SERVICE_URL = 'http://service:8080/api';
  });

  afterAll(() => {
    process.env.SERVICE_URL = originalServiceUrl;
  });

  describe('POST (login)', () => {
    it('troca o code no Service e grava a sessão em cookies HttpOnly', async () => {
      fetchMock.mockResolvedValue(json(200, { key: 'tok-123' }));
      const { nonce, cookie } = pendingLogin('github');

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ outcome: 'success', provider: 'github', redirectTo: '/home/' });
      expect(fetchMock).toHaveBeenCalledWith(
        'http://service:8080/api/v1/accounts/github/login/',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'abc' }) })
      );
      expect(cookieNamed(response, 'msgram_token')).toMatch(/^msgram_token=tok-123;.*Max-Age=7200.*HttpOnly.*SameSite=lax/i);
      expect(cookieNamed(response, 'msgram_provider')).toMatch(/^msgram_provider=github;/);
      expect(cookieNamed(response, 'msgram_login_at')).toMatch(/^msgram_login_at=\d+;/);
      expect(stateConsumed(response)).toBe(true);
    });

    it('usa o endpoint do GitLab quando o state é do GitLab', async () => {
      fetchMock.mockResolvedValue(json(200, { key: 'tok' }));
      const { nonce, cookie } = pendingLogin('gitlab');

      await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect(fetchMock.mock.calls[0][0]).toBe('http://service:8080/api/v1/accounts/gitlab/login/');
    });

    it('leva ao returnTo guardado no state', async () => {
      fetchMock.mockResolvedValue(json(200, { key: 'tok' }));
      const { nonce, cookie } = pendingLogin('github', '/products/1-2-x?tab=1');

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect((await response.json()).redirectTo).toBe('/products/1-2-x?tab=1');
    });

    it('ignora returnTo externo mesmo que tenha sido guardado', async () => {
      fetchMock.mockResolvedValue(json(200, { key: 'tok' }));
      const { nonce, cookie } = pendingLogin('github', '//evil.com');

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect((await response.json()).redirectTo).toBe('/home/');
    });

    it('recusa state errado sem chamar o Service e sem gravar sessão', async () => {
      const { cookie } = pendingLogin();

      const response = await post({ code: 'abc', state: 'errado' }, { cookies: cookie });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_state' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(cookieNamed(response, 'msgram_token')).toBeUndefined();
      expect(stateConsumed(response)).toBe(true);
    });

    it('recusa state repetido: o state é de uso único', async () => {
      fetchMock.mockResolvedValue(json(200, { key: 'tok' }));
      const { nonce, cookie } = pendingLogin();

      const first = await post({ code: 'abc', state: nonce }, { cookies: cookie });
      expect(first.status).toBe(200);

      // o navegador apagou o cookie do state com a primeira resposta
      const replay = await post({ code: 'abc', state: nonce });
      expect(replay.status).toBe(400);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('recusa state expirado', async () => {
      const { nonce, cookie } = pendingLogin('github', null, Date.now() - 11 * 60 * 1000);

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_state' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('recusa quando não há cookie de state', async () => {
      const response = await post({ code: 'abc', state: 'qualquer' });

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('recusa corpo que não é JSON', async () => {
      const response = await post(null);

      expect(response.status).toBe(400);
    });

    it('recusa origem externa (CSRF)', async () => {
      const { nonce, cookie } = pendingLogin();

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie, origin: 'https://evil.com' });

      expect(response.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('state válido sem code nem error é recusado', async () => {
      const { nonce, cookie } = pendingLogin();

      const response = await post({ state: nonce }, { cookies: cookie });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'missing_code' });
    });

    it('devolve a mensagem do Service quando ele recusa o login (400)', async () => {
      const message = 'Este e-mail já está cadastrado com login por senha.';
      fetchMock.mockResolvedValue(json(400, { non_field_errors: [message] }));
      const { nonce, cookie } = pendingLogin();

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'login_failed', message });
      expect(cookieNamed(response, 'msgram_token')).toBeUndefined();
      expect(stateConsumed(response)).toBe(true);
    });

    it('responde 502 quando o Service está fora do ar', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const { nonce, cookie } = pendingLogin();

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect(response.status).toBe(502);
      expect((await response.json()).error).toBe('login_failed');
    });

    it('responde erro quando o Service não devolve o token', async () => {
      fetchMock.mockResolvedValue(json(200, {}));
      const { nonce, cookie } = pendingLogin();

      const response = await post({ code: 'abc', state: nonce }, { cookies: cookie });

      expect(response.status).toBe(502);
      expect(cookieNamed(response, 'msgram_token')).toBeUndefined();
    });

    it('marca os cookies como Secure em HTTPS', async () => {
      fetchMock.mockResolvedValue(json(200, { key: 'tok' }));
      const { nonce, cookie } = pendingLogin();
      const request = new NextRequest('https://app.exemplo.com/bff/session', {
        method: 'POST',
        headers: { host: 'app.exemplo.com', origin: 'https://app.exemplo.com', cookie },
        body: JSON.stringify({ code: 'abc', state: nonce })
      });

      const response = await POST(request);

      expect(cookieNamed(response, 'msgram_token')).toMatch(/; Secure/i);
    });
  });

  describe('POST (cancelamento no provedor)', () => {
    it('sem sessão manda para o login (redirectTo nulo)', async () => {
      const { nonce, cookie } = pendingLogin('github', '/products');

      const response = await post({ error: 'access_denied', state: nonce }, { cookies: cookie });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ outcome: 'cancelled', redirectTo: null });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(stateConsumed(response)).toBe(true);
    });

    it('com sessão volta para o returnTo (reautorização cancelada)', async () => {
      const { nonce, cookie } = pendingLogin('github', '/products');

      const response = await post({ error: 'access_denied', state: nonce }, { cookies: `${cookie}; msgram_token=good` });

      expect(await response.json()).toEqual({ outcome: 'cancelled', redirectTo: '/products' });
    });

    it('outro erro do provedor vem como provider_error', async () => {
      const { nonce, cookie } = pendingLogin();

      const response = await post({ error: 'server_error', state: nonce }, { cookies: cookie });

      expect((await response.json()).outcome).toBe('provider_error');
    });

    it('state inválido no cancelamento é recusado', async () => {
      const { cookie } = pendingLogin();

      const response = await post({ error: 'access_denied', state: 'errado' }, { cookies: cookie });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_state' });
    });
  });

  describe('DELETE (logout)', () => {
    const del = (cookies = 'msgram_token=good', origin = ORIGIN) =>
      DELETE(new NextRequest(`${ORIGIN}/bff/session`, { method: 'DELETE', headers: { host: 'localhost:3000', origin, cookie: cookies } }));

    it('encerra o token no Service e apaga os cookies', async () => {
      fetchMock.mockResolvedValue(json(200, {}));

      const response = await del();

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://service:8080/api/v1/accounts/logout/',
        expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Token good' } })
      );
      const cleared = setCookies(response).filter((cookie) => /Max-Age=0/i.test(cookie)).map((cookie) => cookie.split('=')[0]);
      expect(cleared).toEqual(['msgram_token', 'msgram_provider', 'msgram_login_at']);
    });

    it('apaga os cookies mesmo com o Service fora do ar', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      const response = await del();

      expect(response.status).toBe(200);
      expect(cookieNamed(response, 'msgram_token')).toMatch(/Max-Age=0/i);
    });

    it('sem token apenas limpa os cookies, sem chamar o Service', async () => {
      const response = await del('');

      expect(response.status).toBe(200);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('recusa origem externa (CSRF)', async () => {
      const response = await del('msgram_token=good', 'https://evil.com');

      expect(response.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
