import api from '../api';
import { FLASH_MESSAGE_KEY } from '../../utils/flashMessage';

describe('API Interceptors', () => {
  let responseSuccess: any;
  let responseError: any;

  const originalLocation = window.location;

  const setLocation = (pathname: string, search = '') => {
    window.location = { href: '', pathname, search } as any;
  };

  beforeAll(() => {
    responseSuccess = (api.interceptors.response as any).handlers[0].fulfilled;
    responseError = (api.interceptors.response as any).handlers[0].rejected;

    delete (window as any).location;
  });

  afterAll(() => {
    window.location = originalLocation as string & Location;
  });

  beforeEach(() => {
    sessionStorage.clear();
    setLocation('/home/');
  });

  it('não registra interceptor de request: o token vai no cookie HttpOnly, não em header', () => {
    expect((api.interceptors.request as any).handlers).toHaveLength(0);
  });

  describe('Response Interceptor', () => {
    it('deve simplesmente retornar o response em caso de sucesso', () => {
      const mockResponse = { data: 'sucesso', status: 200 };

      expect(responseSuccess(mockResponse)).toEqual(mockResponse);
    });

    it('no 401 volta ao login guardando a rota atual e avisa que a sessão expirou', async () => {
      setLocation('/products/1-2-x/', '?tab=1');
      const mockError = { response: { status: 401 } };

      await expect(responseError(mockError)).rejects.toEqual(mockError);

      expect(window.location.href).toBe(`/auth?returnTo=${encodeURIComponent('/products/1-2-x/?tab=1')}`);
      expect(JSON.parse(sessionStorage.getItem(FLASH_MESSAGE_KEY) as string)).toEqual({
        type: 'warning',
        text: 'Sua sessão expirou. Entre novamente.'
      });
    });

    it('no 401 já em /auth não redireciona de novo', async () => {
      setLocation('/auth', '?returnTo=%2Fhome');
      const mockError = { response: { status: 401 } };

      await expect(responseError(mockError)).rejects.toEqual(mockError);

      expect(window.location.href).toBe('');
    });

    it('não redireciona se o status do erro não for 401', async () => {
      const mockError = { response: { status: 500 } };

      await expect(responseError(mockError)).rejects.toEqual(mockError);

      expect(window.location.href).toBe('');
      expect(sessionStorage.getItem(FLASH_MESSAGE_KEY)).toBeNull();
    });

    it('não executa ações do browser se window for undefined no erro 401', async () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const mockError = { response: { status: 401 } };
      await expect(responseError(mockError)).rejects.toEqual(mockError);

      global.window = originalWindow;
    });
  });
});

describe('api client baseURL', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NEXT_PUBLIC_API_URL: 'https://api.example.test', SERVICE_URL: 'https://svc.example.test' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sempre usa o /bff do próprio Next, ignorando a URL do Service', () => {
    const api = require('../api').default;

    expect(api.defaults.baseURL).toBe('/bff');
  });
});
