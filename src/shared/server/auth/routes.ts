import { stripTrailingSlashes } from '../../utils/stripTrailingSlashes';

export const PUBLIC_ROUTES = ['/', '/landing', '/auth'];
export const PUBLIC_PREFIXES = ['/auth/'];

// Páginas de `src/app/(dashboard)`; `[x]` casa com um segmento qualquer. Um caminho que não está aqui nem entre as
// públicas não é página: segue sem exigir login e cai na página 404. O teste `routes.spec` falha se uma página nova
// ficar de fora desta lista.
export const PROTECTED_ROUTES = [
  '/home',
  '/about',
  '/config',
  '/organizations',
  '/products',
  '/products/create',
  '/products/[product]',
  '/products/[product]/releases',
  '/products/[product]/releases/create',
  '/products/[product]/releases/[release]',
  '/products/[product]/repositories',
  '/products/[product]/repositories/manage-repository',
  '/products/[product]/repositories/[repository]',
  '/products/[product]/settings',
  '/products/[product]/dashboards/overview',
  '/products/[product]/dashboards/temporal',
  '/products/[product]/dashboards/metamodelo',
  '/products/[product]/dashboards/entidade',
  '/products/[product]/dashboards/distribuicao',
  '/products/[product]/dashboards/relacoes'
];

export const normalizePath = (pathname: string): string =>
  pathname.length > 1 ? stripTrailingSlashes(pathname) || '/' : pathname;

export const isPublicPath = (pathname: string): boolean => {
  const path = normalizePath(pathname);
  if (PUBLIC_ROUTES.includes(path)) return true;

  return PUBLIC_PREFIXES.some((prefix) => `${path}/`.startsWith(prefix));
};

const matchesPattern = (pattern: string, path: string): boolean => {
  const patternSegments = pattern.split('/');
  const pathSegments = path.split('/');

  return (
    patternSegments.length === pathSegments.length &&
    patternSegments.every((segment, index) => (segment.startsWith('[') ? pathSegments[index] !== '' : segment === pathSegments[index]))
  );
};

/** Página que exige login. Os segmentos estáticos têm prioridade no Next, então `create` não vira `[product]`. */
export const isProtectedPath = (pathname: string): boolean => {
  const path = normalizePath(pathname);
  return PROTECTED_ROUTES.some((pattern) => matchesPattern(pattern, path));
};

const INTERNAL_BASE = 'http://internal.invalid';

/**
 * '//host' e '/\host' o navegador trata como outro domínio, e ele também descarta tab e quebra de linha antes de
 * interpretar a URL ('/\t/host' vira '//host'). Por isso recusa caractere de controle e '\' em qualquer posição e,
 * por garantia, confere que a URL resolvida continua na mesma origem.
 */
export const isInternalPath = (path: unknown): path is string => {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return false;
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return false;

  try {
    return new URL(path, INTERNAL_BASE).origin === INTERNAL_BASE;
  } catch {
    return false;
  }
};

/** Rotas de autenticação não servem de destino depois do login (levariam de volta ao login). */
export const sanitizeReturnTo = (path: unknown): string | null => {
  if (!isInternalPath(path)) return null;

  const pathname = path.split(/[?#]/)[0];
  if (pathname === '/' || isPublicPath(pathname)) return null;

  return path;
};
