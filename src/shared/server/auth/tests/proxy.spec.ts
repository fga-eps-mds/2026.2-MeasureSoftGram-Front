/** @jest-environment node */
import { NextRequest } from 'next/server';
import { proxy, config } from '../../../../proxy';
import { validateToken } from '../validateToken';

jest.mock('../validateToken', () => ({ validateToken: jest.fn() }));

const ORIGIN = 'http://localhost:3000';

const call = (path: string, cookie?: string, headers: Record<string, string> = {}) =>
  proxy(
    new NextRequest(`${ORIGIN}${path}`, {
      headers: { ...(cookie ? { cookie: `msgram_token=${cookie}` } : {}), ...headers }
    })
  );

const location = (response: Response) => response.headers.get('location');
const isPassThrough = (response: Response) => response.headers.get('x-middleware-next') === '1';
const clearedCookies = (response: Response) =>
  (response.headers.getSetCookie?.() ?? []).filter((cookie) => /Max-Age=0/i.test(cookie)).map((cookie) => cookie.split('=')[0]);

describe('proxy', () => {
  const originalMocking = process.env.NEXT_PUBLIC_API_MOCKING;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_API_MOCKING;
    (validateToken as jest.Mock).mockResolvedValue({ status: 'valid', user: { username: 'alice' } });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_API_MOCKING = originalMocking;
  });

  describe('rotas públicas', () => {
    it.each(['/', '/landing', '/landing/', '/auth', '/auth/', '/auth/error', '/auth/error/', '/auth/callback/', '/auth/oauth/github'])(
      '%s passa sem cookie e sem chamar o Service',
      async (path) => {
        const response = await call(path);

        expect(isPassThrough(response)).toBe(true);
        expect(validateToken).not.toHaveBeenCalled();
      }
    );

    it('/ e /auth com token válido vão para /home', async () => {
      expect(location(await call('/', 'good'))).toBe(`${ORIGIN}/home/`);
      expect(location(await call('/auth/', 'good'))).toBe(`${ORIGIN}/home/`);
    });

    it('/auth com token válido vai para o returnTo interno', async () => {
      const response = await call('/auth?returnTo=%2Fproducts%2F1-2-x%3Ftab%3D1', 'good');

      expect(response.status).toBe(307);
      expect(location(response)).toBe(`${ORIGIN}/products/1-2-x?tab=1`);
    });

    it.each(['//evil.com', '/\\evil.com', 'https://evil.com', '/auth', '/auth/error', '/'])(
      'returnTo %s não serve de destino e cai em /home',
      async (returnTo) => {
        const response = await call(`/auth?returnTo=${encodeURIComponent(returnTo)}`, 'good');

        expect(location(response)).toBe(`${ORIGIN}/home/`);
      }
    );

    it('/auth com token rejeitado mostra o login e apaga os cookies', async () => {
      (validateToken as jest.Mock).mockResolvedValue({ status: 'invalid' });

      const response = await call('/auth', 'old');

      expect(isPassThrough(response)).toBe(true);
      expect(clearedCookies(response)).toEqual(expect.arrayContaining(['msgram_token', 'msgram_provider', 'msgram_login_at']));
    });

    it('/ com o Service fora do ar mostra a landing sem apagar a sessão', async () => {
      (validateToken as jest.Mock).mockResolvedValue({ status: 'unavailable' });

      const response = await call('/', 'good');

      expect(isPassThrough(response)).toBe(true);
      expect(clearedCookies(response)).toEqual([]);
    });

    it('rotas públicas além de / e /auth não consultam o Service mesmo com cookie', async () => {
      await call('/landing', 'good');
      await call('/auth/callback/', 'good');

      expect(validateToken).not.toHaveBeenCalled();
    });
  });

  describe('retorno do provedor', () => {
    it('/?code&state vai para /auth/callback sem passar pela landing', async () => {
      const response = await call('/?code=abc&state=xyz');

      expect(response.status).toBe(307);
      expect(location(response)).toBe(`${ORIGIN}/auth/callback/?code=abc&state=xyz`);
    });

    it('/?error&state (cancelamento) também vai para /auth/callback', async () => {
      const response = await call('/?error=access_denied&state=xyz', 'good');

      expect(location(response)).toBe(`${ORIGIN}/auth/callback/?error=access_denied&state=xyz`);
    });
  });

  describe('rotas privadas', () => {
    it('sem cookie vai para /auth?returnTo=<rota> sem chamar o Service', async () => {
      const response = await call('/home/');

      expect(response.status).toBe(307);
      expect(location(response)).toBe(`${ORIGIN}/auth?returnTo=%2Fhome`);
      expect(validateToken).not.toHaveBeenCalled();
    });

    it('guarda o caminho e a query no returnTo', async () => {
      const response = await call('/products/1-2-x/dashboards/overview/?release=3');

      expect(location(response)).toBe(
        `${ORIGIN}/auth?returnTo=${encodeURIComponent('/products/1-2-x/dashboards/overview?release=3')}`
      );
    });

    it.each(['/products/', '/products/1-2-x/dashboards/overview/', '/products/1-2-x/releases/create/'])(
      '%s é página e exige login',
      async (path) => {
        expect(location(await call(path))).toContain('/auth?returnTo=');
      }
    );

    it('com token válido passa', async () => {
      const response = await call('/home/', 'good');

      expect(isPassThrough(response)).toBe(true);
      expect(validateToken).toHaveBeenCalledWith('good');
    });

    it('com token rejeitado redireciona e apaga os cookies', async () => {
      (validateToken as jest.Mock).mockResolvedValue({ status: 'invalid' });

      const response = await call('/home/', 'revoked');

      expect(location(response)).toBe(`${ORIGIN}/auth?returnTo=%2Fhome`);
      expect(clearedCookies(response)).toEqual(expect.arrayContaining(['msgram_token', 'msgram_provider', 'msgram_login_at']));
    });

    it('com o Service fora do ar passa sem apagar a sessão', async () => {
      (validateToken as jest.Mock).mockResolvedValue({ status: 'unavailable' });

      const response = await call('/home/', 'good');

      expect(isPassThrough(response)).toBe(true);
      expect(clearedCookies(response)).toEqual([]);
    });

    it('o cookie apagado leva Secure quando a requisição chegou por HTTPS (atrás de proxy reverso)', async () => {
      (validateToken as jest.Mock).mockResolvedValue({ status: 'invalid' });

      const response = await call('/home/', 'revoked', { 'x-forwarded-proto': 'https' });

      expect(response.headers.getSetCookie().every((cookie) => /; Secure/i.test(cookie))).toBe(true);
    });
  });

  describe('caminhos que não são página', () => {
    it.each(['/nao-existe/', '/authors/', '/products/1-2-x/foo/', '/home/extra/'])(
      '%s segue para o 404 sem exigir login e sem chamar o Service',
      async (path) => {
        const response = await call(path);

        expect(isPassThrough(response)).toBe(true);
        expect(validateToken).not.toHaveBeenCalled();
      }
    );

    it('com token também não consulta o Service', async () => {
      expect(isPassThrough(await call('/nao-existe/', 'good'))).toBe(true);
      expect(validateToken).not.toHaveBeenCalled();
    });
  });

  describe('boas-vindas', () => {
    const welcome = (response: Response) => response.headers.getSetCookie().find((cookie) => cookie.startsWith('msgram_welcome='));

    it('/ com token válido pede as boas-vindas, em cookie legível pelo cliente', async () => {
      const cookie = welcome(await call('/', 'good'));

      expect(cookie).toBeDefined();
      expect(cookie).not.toMatch(/HttpOnly/i);
    });

    it('/auth com token válido não pede as boas-vindas', async () => {
      expect(welcome(await call('/auth', 'good'))).toBeUndefined();
    });
  });

  describe('modo mock', () => {
    it('não valida nem redireciona', async () => {
      process.env.NEXT_PUBLIC_API_MOCKING = 'enabled';

      expect(isPassThrough(await call('/home/'))).toBe(true);
      expect(validateToken).not.toHaveBeenCalled();
    });
  });

  describe('matcher', () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    it.each(['/home', '/products/1-2-x', '/auth', '/'])('cobre %s', (path) => {
      expect(matcher.test(path)).toBe(true);
    });

    it.each(['/_next/static/chunk.js', '/bff/v1/accounts/', '/images/svg/logo.svg', '/locales/en/home.json', '/favicon.ico', '/mockServiceWorker.js'])(
      'não cobre %s',
      (path) => {
        expect(matcher.test(path)).toBe(false);
      }
    );
  });
});
