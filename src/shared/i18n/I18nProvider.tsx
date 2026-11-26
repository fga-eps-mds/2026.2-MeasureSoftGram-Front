'use client';

import React, { useEffect } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import i18n from './i18n';
import { DEFAULT_LANGUAGE } from './config';

initReactI18next.init(i18n);

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = window.localStorage.getItem('locale_lang') || DEFAULT_LANGUAGE;
    if (i18n.language !== saved) void i18n.changeLanguage(saved);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
