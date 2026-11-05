/** @jest-environment node */
import { NextRequest } from 'next/server';
import { DELETE, GET, POST } from '../[...path]/route';

const ORIGIN = 'http://localhost:3000';
const fetchMock = global.fetch as jest.Mock;

const upstreamResponse = (status = 200, body: BodyInit | null = '{"ok":true}', headers: Record<string, string> = {}) =>
  new Response(status === 204 ? null : body, { status, headers: { 'content-type': 'application/json', ...headers } });

const call = (
  handler: typeof GET,
  path: string,
  { method = 'GET', cookie = 'good', headers = {}, body }: { method?: string; cookie?: string | null; headers?: Record<string, string>; body?: string } = {}
) => {
  const request = new NextRequest(`${ORIGIN}/bff/${path}`, {
    method,
    headers: { host: 'localhost:3000', ...(cookie ? { cookie: `msgram_token=${cookie}` } : {}), ...headers },
    body
  });
  const segments = path.split('?')[0].split('/').filter(Boolean);

  return handler(request, { params: Promise.resolve({ path: segments }) });
};

const forwarded = () => ({ url: fetchMock.mock.calls[0][0] as string, init: fetchMock.mock.calls[0][1] as RequestInit });

describe('/bff/[...path]', () => {
  const originalServiceUrl = process.env.SERVICE_URL;

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(upstreamResponse());
    process.env.SERVICE_URL = 'http://service:8080/api';
  });

  afterAll(() => {
    process.env.SERVICE_URL = originalServiceUrl;
  });

  describe('caminho', () => {
    it('repassa v1/... ao Service com o token do cookie no Authorization', async () => {
      const response = await call(GET, 'v1/organizations/');

      expect(response.status).toBe(200);
      expect(forwarded().url).toBe('http://service:8080/api/v1/organizations/');
      expect((forwarded().init.headers as Headers).get('authorization')).toBe('Token good');
    });

    it('preserva a barra final, que o Django exige', async () => {
      await call(GET, 'v1/organizations/1/products/');

      expect(forwarded().url).toBe('http://service:8080/api/v1/organizations/1/products/');
    });

    it('não acrescenta a barra final quando o cliente não a mandou', async () => {
      await call(GET, 'v1/accounts/access-token');

      expect(forwarded().url).toBe('http://service:8080/api/v1/accounts/access-token');
    });

    it('preserva a query string', async () => {
      await call(GET, 'v1/organizations/?page=2&search=a%20b');

      expect(forwarded().url).toBe('http://service:8080/api/v1/organizations/?page=2&search=a%20b');
    });

    it.each(['v2/organizations/', 'api/v1/x/', 'v1', 'accounts/v1/'])('recusa %s: só v1/... é aceito', async (path) => {
      const response = await call(GET, path);

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(['v1/../admin/', 'v1/./x/', 'v1/%2e%2e/admin/', 'v1/a%2Fb/', 'v1/a%5Cb/'])('recusa o caminho %s', async (path) => {
      const response = await call(GET, path);

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('autenticação', () => {
    it('sem cookie responde 401 sem chamar o Service', async () => {
      const response = await call(GET, 'v1/accounts/', { cookie: null });

      expect(response.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('quando o Service responde 401 apaga os cookies da sessão', async () => {
      fetchMock.mockResolvedValue(upstreamResponse(401, '{"detail":"Token inválido."}'));

      const response = await call(GET, 'v1/accounts/', { cookie: 'revoked' });

      expect(response.status).toBe(401);
      const cleared = response.headers.getSetCookie().filter((cookie) => /Max-Age=0/i.test(cookie));
      expect(cleared.map((cookie) => cookie.split('=')[0])).toEqual(['msgram_token', 'msgram_provider', 'msgram_login_at']);
    });

    it('um 4xx comum não apaga a sessão', async () => {
      fetchMock.mockResolvedValue(upstreamResponse(404, '{"detail":"Não encontrado."}'));

      const response = await call(GET, 'v1/organizations/99/');

      expect(response.status).toBe(404);
      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it('não repassa o cookie do navegador ao Service', async () => {
      await call(GET, 'v1/organizations/', { headers: { cookie: 'msgram_token=good; outro=1' } });

      expect((forwarded().init.headers as Headers).get('cookie')).toBeNull();
    });
  });

  describe('CSRF: Origin nos métodos de escrita', () => {
    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s com Origin de outro site é recusado', async (method) => {
      const response = await call(POST, 'v1/organizations/', { method, headers: { origin: 'https://evil.com' }, body: method === 'DELETE' ? undefined : '{}' });

      expect(response.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('POST com Origin da própria aplicação passa e leva o corpo', async () => {
      await call(POST, 'v1/organizations/', {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json' },
        body: '{"name":"x"}'
      });

      const { init } = forwarded();
      expect(init.method).toBe('POST');
      expect(Buffer.from(init.body as ArrayBuffer).toString()).toBe('{"name":"x"}');
      expect((init.headers as Headers).get('content-type')).toBe('application/json');
    });

    it('DELETE com Origin da própria aplicação passa', async () => {
      await call(DELETE, 'v1/organizations/1/', { method: 'DELETE', headers: { origin: ORIGIN } });

      expect(forwarded().init.method).toBe('DELETE');
    });

    it('GET não exige Origin', async () => {
      const response = await call(GET, 'v1/organizations/', { headers: { origin: 'https://evil.com' } });

      expect(response.status).toBe(200);
    });

    it('sem Origin recusa a escrita marcada como cross-site pelo navegador', async () => {
      const response = await call(POST, 'v1/organizations/', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' }, body: '{}' });

      expect(response.status).toBe(403);
    });
  });

  describe('resposta', () => {
    it('repassa status, corpo e os cabeçalhos X-Total-*', async () => {
      fetchMock.mockResolvedValue(upstreamResponse(200, '[1,2]', { 'x-total-count': '42', 'x-total-pages': '5', 'set-cookie': 'sessionid=1' }));

      const response = await call(GET, 'v1/organizations/');

      expect(await response.json()).toEqual([1, 2]);
      expect(response.headers.get('x-total-count')).toBe('42');
      expect(response.headers.get('x-total-pages')).toBe('5');
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('responde 204 sem corpo', async () => {
      fetchMock.mockResolvedValue(upstreamResponse(204));

      const response = await call(DELETE, 'v1/organizations/1/', { method: 'DELETE', headers: { origin: ORIGIN } });

      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
    });

    it('não segue redirecionamento do Service', async () => {
      await call(GET, 'v1/organizations/');

      expect(forwarded().init.redirect).toBe('manual');
    });

    it('responde 502 quando o Service não responde', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      const response = await call(GET, 'v1/organizations/');

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ detail: 'Serviço indisponível.' });
    });
  });
});
