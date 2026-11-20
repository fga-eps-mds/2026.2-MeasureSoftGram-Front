import 'jest-canvas-mock';
import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';
import i18n from '../src/shared/i18n/i18n';
import pt from '../src/shared/i18n/locales/pt';

// O jsdom 19 nao expoe a Web Crypto API, que o navegador expoe.
if (!globalThis.crypto?.getRandomValues) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

export const createMockedRoute = (
  query?: Object) => ({
    query,
    asPath: '/product/id',
    push: jest.fn(), // <-- Adicionado aqui
    replace: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
   } as unknown as ReturnType<typeof import('@hooks/useRouter').useRouter>);

// @ts-ignore
global.fetch = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: (namespace?: string | string[]) => ({
    t: jest.requireActual('../src/shared/i18n/i18n').default.getFixedT('pt', namespace),
    // Adicionamos o objeto i18n mockado aqui:
    i18n: {
      language: 'pt-BR', // Simula que o idioma atual é português
      changeLanguage: jest.fn(), // Finge a função de troca sem fazer nada
    },
  }),
}));

// quem precisa de outra rota troca a implementação (ver tests/helper/router.ts) ou mocka o módulo no próprio spec
jest.mock('@hooks/useRouter', () => ({
  useRouter: jest.fn(() => createMockedRoute({ layer: undefined, product: undefined })),
  useNavigation: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }))
}));

Object.entries(pt).forEach(([namespace, resources]) => i18n.addResourceBundle('pt', namespace, resources));
void i18n.changeLanguage('pt');
beforeAll(() => i18n.changeLanguage('pt'));
