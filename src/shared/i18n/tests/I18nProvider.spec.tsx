import React from 'react';
import { act, render } from '@testing-library/react';
import { useTranslation as useRealTranslation } from 'react-i18next';
import en from '../locales/en';
import I18nProvider from '../I18nProvider';

// o jestSetup troca o react-i18next por um mock: aqui interessa o de verdade
jest.mock('react-i18next', () => jest.requireActual('react-i18next'));

// o jsdom não traz o que o react-dom/server (build de navegador) espera
const renderToString = (element: React.ReactElement): string => {
  const { MessageChannel } = require('worker_threads');
  const { TextEncoder } = require('util');
  Object.assign(globalThis, { MessageChannel, TextEncoder });

  return require('react-dom/server').renderToString(element);
};

const Probe = ({ ns, text }: { ns: string; text: string }) => {
  const { t, i18n } = useRealTranslation(ns);
  return (
    <span data-testid="probe" data-language={i18n.language}>
      {t(text)}
    </span>
  );
};

// a instância do i18next é uma só por módulo: a troca de idioma fica por último
describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('traduz em inglês já no primeiro render do servidor, sem chaves cruas no HTML', () => {
    const [namespace, key] = ['repositories', 'input-placeholder'];

    const html = renderToString(
      <I18nProvider>
        <Probe ns={namespace} text={key} />
      </I18nProvider>
    );

    expect(html).toContain((en as Record<string, any>)[namespace][key]);
    expect(html).not.toContain(`>${key}<`);
    expect(html).toContain('data-language="en"');
  });

  it('abre em inglês quando não há idioma salvo', () => {

    const { getByTestId } = render(
      <I18nProvider>
        <Probe ns="translation" text="qualquer" />
      </I18nProvider>
    );

    expect(getByTestId('probe')).toHaveAttribute('data-language', 'en');
  });

  it('troca para o idioma salvo depois da hidratação', async () => {
    window.localStorage.setItem('locale_lang', 'pt');

    const { getByTestId } = render(
      <I18nProvider>
        <Probe ns="translation" text="qualquer" />
      </I18nProvider>
    );
    await act(async () => {});

    expect(getByTestId('probe')).toHaveAttribute('data-language', 'pt');
  });
});
