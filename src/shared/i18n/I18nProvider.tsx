'use client';

import React, { useEffect } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import bundledBackend from './bundledBackend';
import en from './locales/en';
import { DEFAULT_LANGUAGE, i18nConfig } from './config';

// sem idioma salvo o app abre em inglês; o salvo é lido depois da hidratação, para o HTML do servidor e o primeiro
// render do navegador saírem iguais. O `en` entra já carregado (init síncrono): sem isso o HTML do servidor sairia com
// as chaves cruas (`repo-button`), porque o backend só responde de forma assíncrona. Os outros idiomas vêm do backend.
const i18n = i18next.createInstance();
void i18n
  .use(bundledBackend)
  .use(initReactI18next)
  .init({
    ...i18nConfig,
    lng: DEFAULT_LANGUAGE,
    resources: { [DEFAULT_LANGUAGE]: en },
    partialBundledLanguages: true,
    initImmediate: false
  });

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = window.localStorage.getItem('locale_lang') || DEFAULT_LANGUAGE;
    if (i18n.language !== saved) void i18n.changeLanguage(saved);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
