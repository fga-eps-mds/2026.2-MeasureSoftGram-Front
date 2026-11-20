import type { TOptions } from 'i18next';
import i18n from './i18n';
import { DEFAULT_LANGUAGE } from './config';

export const savedLanguage = () => window.localStorage.getItem('locale_lang') || DEFAULT_LANGUAGE;

export async function translateInSavedLanguage(key: string, options?: TOptions): Promise<string> {
  const language = savedLanguage();
  await i18n.loadLanguages(language).catch(() => undefined);
  return i18n.getFixedT(language)(key, options ?? {});
}
