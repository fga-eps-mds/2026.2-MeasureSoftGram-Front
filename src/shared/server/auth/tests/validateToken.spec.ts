/** @jest-environment node */
import {
  clearValidationCache,
  getServiceUrl,
  validateToken,
  VALIDATION_CACHE_TTL_MS,
  VALIDATION_TIMEOUT_MS
} from '../validateToken';

const respond = (status: number, body: object = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('validateToken', () => {
  const originalServiceUrl = process.env.SERVICE_URL;
  const fetchMock = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.restoreAllMocks();
    fetchMock.mockReset();
    clearValidationCache();
    process.env.SERVICE_URL = 'http://service:8080/api/';
  });

  afterAll(() => {
    process.env.SERVICE_URL = originalServiceUrl;
  });

  it('pergunta ao Service com o token e devolve o usuário', async () => {
    fetchMock.mockResolvedValue(respond(200, { username: 'alice' }));

    const result = await validateToken('tok');

    expect(result).toEqual({ status: 'valid', user: { username: 'alice' } });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://service:8080/api/v1/accounts/',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Token tok' }), cache: 'no-store' })
    );
  });

  it('usa um timeout de 3 s na chamada', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(respond(200, { username: 'alice' }));

    await validateToken('tok');

    expect(VALIDATION_TIMEOUT_MS).toBe(3000);
    expect(timeout).toHaveBeenCalledWith(3000);
  });

  it.each([401, 403])('trata %i como token rejeitado', async (status) => {
    fetchMock.mockResolvedValue(respond(status));

    expect(await validateToken('tok')).toEqual({ status: 'invalid' });
  });

  it.each([400, 500, 502, 503])('trata %i como Service indisponível, sem deslogar', async (status) => {
    fetchMock.mockResolvedValue(respond(status));

    expect(await validateToken('tok')).toEqual({ status: 'unavailable' });
  });

  it('trata falha de rede e timeout como Service indisponível', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await validateToken('a')).toEqual({ status: 'unavailable' });

    fetchMock.mockRejectedValueOnce(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    expect(await validateToken('b')).toEqual({ status: 'unavailable' });
  });

  it('trata resposta que não é JSON como Service indisponível', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      }
    });

    expect(await validateToken('tok')).toEqual({ status: 'unavailable' });
  });

  describe('cache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('guarda o token válido por 60 s, sem nova chamada ao Service', async () => {
      fetchMock.mockResolvedValue(respond(200, { username: 'alice' }));

      await validateToken('tok');
      jest.advanceTimersByTime(VALIDATION_CACHE_TTL_MS - 1);
      const second = await validateToken('tok');

      expect(second).toEqual({ status: 'valid', user: { username: 'alice' } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('depois dos 60 s pergunta de novo e pega a revogação', async () => {
      fetchMock.mockResolvedValueOnce(respond(200, { username: 'alice' })).mockResolvedValueOnce(respond(401));

      await validateToken('tok');
      jest.advanceTimersByTime(VALIDATION_CACHE_TTL_MS + 1);

      expect(await validateToken('tok')).toEqual({ status: 'invalid' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('não guarda token rejeitado nem indisponibilidade', async () => {
      fetchMock.mockResolvedValueOnce(respond(401)).mockResolvedValueOnce(respond(503)).mockResolvedValueOnce(respond(200, { username: 'a' }));

      await validateToken('tok');
      await validateToken('tok');
      expect(await validateToken('tok')).toEqual({ status: 'valid', user: { username: 'a' } });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('separa o cache por token', async () => {
      fetchMock.mockResolvedValueOnce(respond(200, { username: 'alice' })).mockResolvedValueOnce(respond(200, { username: 'bob' }));

      expect(await validateToken('t1')).toEqual({ status: 'valid', user: { username: 'alice' } });
      expect(await validateToken('t2')).toEqual({ status: 'valid', user: { username: 'bob' } });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('getServiceUrl', () => {
    it('lê SERVICE_URL em execução, sem a barra final', () => {
      process.env.SERVICE_URL = 'http://outro:9000/api///';
      expect(getServiceUrl()).toBe('http://outro:9000/api');
    });

    it('cai no endereço local quando não está definida', () => {
      delete process.env.SERVICE_URL;
      expect(getServiceUrl()).toBe('http://localhost:8080/api');
    });
  });
});
