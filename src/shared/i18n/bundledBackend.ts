import type { BackendModule, ReadCallback } from 'i18next';
import en from './locales/en';

type Resources = Record<string, object>;

// `en` vai no bundle principal (é o idioma do HTML do servidor); só os demais idiomas viram chunk
const LOADERS: Record<string, () => Promise<{ default: Resources }>> = {
  pt: () => import('./locales/pt')
};

const loaded: Record<string, Promise<Resources>> = { en: Promise.resolve(en) };

export function loadLanguage(language: string): Promise<Resources> {
  const cached = loaded[language];
  if (cached !== undefined) return cached;
  const loader = LOADERS[language];
  if (!loader) return Promise.resolve({});
  loaded[language] = loader()
    .then((module) => module.default)
    .catch((error) => {
      // sem rede agora: a próxima leitura tenta de novo
      delete loaded[language];
      throw error;
    });
  return loaded[language];
}

/**
 * Backend do i18next com as traduções no bundle. O backend HTTP padrão do ni18n pedia um JSON por namespace e idioma
 * (26 requisições numa carga, servidas de /locales com max-age=0); aqui cada idioma é um chunk de /_next/static,
 * pedido uma vez e guardado em cache pelo navegador.
 */
const bundledBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language: string, namespace: string, callback: ReadCallback) {
    loadLanguage(language)
      .then((resources) => callback(null, (resources[namespace] ?? {}) as Parameters<ReadCallback>[1]))
      .catch((error) => callback(error, null));
  }
};

export default bundledBackend;
