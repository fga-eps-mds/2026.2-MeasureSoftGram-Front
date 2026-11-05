import { renderHook } from '@testing-library/react';
import { useParams, usePathname, useRouter as useNextRouter, useSearchParams } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useSearchParams: jest.fn()
}));

// o jestSetup troca @hooks/useRouter por um mock em todos os specs: aqui interessa o código de verdade
const actual = jest.requireActual('@hooks/useRouter') as typeof import('@hooks/useRouter');
const { toRoutePattern, useNavigation, useRouteQuery, useRoutePath, useRouter } = actual;

const nextRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), prefetch: jest.fn(), refresh: jest.fn() };

const mockUrl = ({ params = {}, search = '', path = '/' }: { params?: object; search?: string; path?: string }) => {
  (useParams as jest.Mock).mockReturnValue(params);
  (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(search));
  (usePathname as jest.Mock).mockReturnValue(path);
};

describe('hooks/useRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNextRouter as jest.Mock).mockReturnValue(nextRouter);
    mockUrl({});
  });

  describe('toRoutePattern', () => {
    it.each([
      ['/home', '/home'],
      ['/products', '/products'],
      ['/products/create', '/products/create'],
      ['/products/1-2-x', '/products/[product]'],
      ['/products/1-2-x/releases', '/products/[product]/releases'],
      ['/products/1-2-x/releases/create', '/products/[product]/releases/create'],
      ['/products/1-2-x/releases/7', '/products/[product]/releases/[release]'],
      ['/products/1-2-x/repositories', '/products/[product]/repositories'],
      ['/products/1-2-x/repositories/manage-repository', '/products/[product]/repositories/manage-repository'],
      ['/products/1-2-x/repositories/create', '/products/[product]/repositories/create'],
      ['/products/1-2-x/repositories/9', '/products/[product]/repositories/[repository]'],
      ['/products/1-2-x/dashboards/overview', '/products/[product]/dashboards/overview']
    ])('%s -> %s', (path, pattern) => {
      expect(toRoutePattern(path)).toBe(pattern);
    });
  });

  describe('useRouteQuery', () => {
    it('junta os parâmetros da rota e a query string num objeto só', () => {
      mockUrl({ params: { product: '1-2-x' }, search: 'tab=3&release=9' });

      const { result } = renderHook(() => useRouteQuery());

      expect(result.current).toEqual({ product: '1-2-x', tab: '3', release: '9' });
    });

    it('repetição na query vira lista', () => {
      mockUrl({ search: 'id=1&id=2&id=3' });

      expect(renderHook(() => useRouteQuery()).result.current).toEqual({ id: ['1', '2', '3'] });
    });

    it('o parâmetro da rota prevalece sobre a query de mesmo nome', () => {
      mockUrl({ params: { product: 'da-rota' }, search: 'product=da-query' });

      expect(renderHook(() => useRouteQuery()).result.current.product).toBe('da-rota');
    });

    it('decodifica o parâmetro da rota e mantém o valor se a codificação for inválida', () => {
      mockUrl({ params: { product: '1-2-meu%20produto', repository: '%E0%A4%A' } });

      const { result } = renderHook(() => useRouteQuery());

      expect(result.current.product).toBe('1-2-meu produto');
      expect(result.current.repository).toBe('%E0%A4%A');
    });

    it('decodifica cada item de parâmetro com vários segmentos', () => {
      mockUrl({ params: { slug: ['a%20b', 'c'] } });

      expect(renderHook(() => useRouteQuery()).result.current.slug).toEqual(['a b', 'c']);
    });

    it('sem parâmetros nem query devolve vazio', () => {
      (useParams as jest.Mock).mockReturnValue(null);
      (useSearchParams as jest.Mock).mockReturnValue(null);

      expect(renderHook(() => useRouteQuery()).result.current).toEqual({});
    });
  });

  describe('useRoutePath', () => {
    it.each([
      ['/home/', '/home'],
      ['/', '/'],
      ['/products/1-2-x/', '/products/1-2-x']
    ])('%s -> %s', (path, expected) => {
      mockUrl({ path });

      expect(renderHook(() => useRoutePath()).result.current).toBe(expected);
    });

    it('sem pathname cai na raiz', () => {
      (usePathname as jest.Mock).mockReturnValue(null);

      expect(renderHook(() => useRoutePath()).result.current).toBe('/');
    });
  });

  describe('useRouter', () => {
    it('expõe a forma do router do Pages Router', () => {
      mockUrl({ params: { product: '1-2-x' }, search: 'tab=1', path: '/products/1-2-x/releases/' });

      const { result } = renderHook(() => useRouter());

      expect(result.current).toMatchObject({
        pathname: '/products/[product]/releases',
        asPath: '/products/1-2-x/releases?tab=1',
        query: { product: '1-2-x', tab: '1' },
        isReady: true,
        push: nextRouter.push,
        replace: nextRouter.replace,
        back: nextRouter.back
      });
    });

    it('asPath fica sem "?" quando não há query', () => {
      mockUrl({ path: '/home/' });

      expect(renderHook(() => useRouter()).result.current.asPath).toBe('/home');
    });
  });

  describe('useNavigation', () => {
    it('devolve só push, replace e back', () => {
      const { result } = renderHook(() => useNavigation());

      expect(Object.keys(result.current).sort()).toEqual(['back', 'push', 'replace']);
      result.current.push('/auth');
      expect(nextRouter.push).toHaveBeenCalledWith('/auth');
    });

    it('não lê a URL: serve a páginas estáticas sem Suspense', () => {
      renderHook(() => useNavigation());

      expect(useSearchParams).not.toHaveBeenCalled();
      expect(useParams).not.toHaveBeenCalled();
      expect(usePathname).not.toHaveBeenCalled();
    });
  });
});
