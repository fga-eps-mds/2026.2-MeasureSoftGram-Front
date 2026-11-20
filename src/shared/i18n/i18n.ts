import i18next from 'i18next';
import bundledBackend from './bundledBackend';
import en from './locales/en';
import { DEFAULT_LANGUAGE, i18nConfig } from './config';

const i18n = i18next.createInstance();
void i18n.use(bundledBackend).init({
  ...i18nConfig,
  ns: Object.keys(en),
  lng: DEFAULT_LANGUAGE,
  resources: { [DEFAULT_LANGUAGE]: en },
  partialBundledLanguages: true,
  interpolation: { escapeValue: false },
  initImmediate: false
});

export default i18n;
