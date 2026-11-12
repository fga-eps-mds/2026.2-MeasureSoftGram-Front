import { expect, Page } from '@playwright/test';
import { SessionProvider } from './session';

export type Language = 'pt' | 'en';

/** Os termos de cada provedor na interface, por idioma (ver src/shared/utils/providerTerminology.ts e public/locales). */
const GITHUB_TERMS: Record<Language, RegExp[]> = {
  pt: [/reposit[óo]ri[oa]s?/i, /organiza[çc][ãa]o|organiza[çc][õo]es/i, /pull requests?/i, /\bPRs?\b/],
  en: [/repositor(y|ies)/i, /organi[sz]ations?/i, /pull requests?/i, /\bPRs?\b/]
};
const GITLAB_TERMS: Record<Language, RegExp[]> = {
  pt: [/\bprojetos?\b/i, /\bgrupos?\b/i, /merge requests?/i, /\bMRs?\b/],
  en: [/\bprojects?\b/i, /\bgroups?\b/i, /merge requests?/i, /\bMRs?\b/]
};

/** Os termos que não podem aparecer na sessão de cada provedor: os do outro (credentials usa o vocabulário do GitHub). */
function forbidden(provider: SessionProvider, language: Language): RegExp[] {
  return provider === 'gitlab' ? GITHUB_TERMS[language] : GITLAB_TERMS[language];
}

/** Abre o app no idioma escolhido (sem o locale_lang salvo, o app abre em inglês). */
export async function seedLanguage(page: Page, language: Language): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem('locale_lang', value), language);
}

/**
 * Todo texto que o usuário vê ou ouve na página: o texto renderizado, o título da aba e os atributos placeholder,
 * aria-label, title e alt (tooltips nativos, campos e a descrição dos gráficos em canvas).
 */
export async function collectUiText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const texts = [document.title, document.body.innerText];
    document.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach((element) => {
      ['placeholder', 'aria-label', 'title', 'alt'].forEach((name) => {
        const value = element.getAttribute(name);
        if (value) texts.push(value);
      });
    });
    return texts.flatMap((text) => text.split('\n')).filter((line) => line.trim());
  });
}

/**
 * Falha listando cada linha da tela que usa um termo de outro provedor. Confere de novo até a tela assentar: logo depois
 * de abrir, o breadcrumb ainda mostra a chave sem tradução ("organizations") e o padrão da rota ("[repository]").
 */
export async function expectOnlyTermsOf(page: Page, provider: SessionProvider, language: Language) {
  await expect
    .poll(
      async () => (await collectUiText(page)).filter((line) => forbidden(provider, language).some((t) => t.test(line))),
      { message: `termos de outro provedor na sessão ${provider} em ${language}` }
    )
    .toEqual([]);
}
