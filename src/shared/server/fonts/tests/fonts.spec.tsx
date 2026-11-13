/** @jest-environment node */
import { renderToStaticMarkup } from 'react-dom/server';
import GoogleFonts from '../GoogleFonts';
import { GOOGLE_FONTS_URL, getInlineFontCss } from '../inlineFontCss';

const IE_CSS = "@font-face {\n  font-family: 'Roboto';\n  src: url(https://fonts.gstatic.com/roboto.woff) format('woff');\n}\n";
const CHROME_CSS = "/* latin */\n@font-face {\n  font-family: 'Roboto';\n  src: url(https://fonts.gstatic.com/roboto.woff2) format('woff2');\n}\n";

const respond = (body: string, ok = true) => ({ ok, status: ok ? 200 : 500, text: async () => body });

describe('fontes do Google', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const answerByUserAgent = () =>
    fetchMock.mockImplementation(async (_url: string, init: { headers: Record<string, string> }) =>
      respond(init.headers['user-agent'].includes('Trident') ? IE_CSS : CHROME_CSS)
    );

  it('pede o CSS com os user agents do Next 12 e junta o do IE antes do do Chrome, sem comentários', async () => {
    answerByUserAgent();

    const css = await getInlineFontCss();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([GOOGLE_FONTS_URL, GOOGLE_FONTS_URL]);
    expect(css).toBe(
      "@font-face{font-family:'Roboto';src:url(https://fonts.gstatic.com/roboto.woff) format('woff')}" +
        "@font-face{font-family:'Roboto';src:url(https://fonts.gstatic.com/roboto.woff2) format('woff2')}"
    );
  });

  it('devolve null quando o Google Fonts responde com erro', async () => {
    fetchMock.mockResolvedValue(respond('', false));

    expect(await getInlineFontCss()).toBeNull();
  });

  it('devolve null sem rede', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    expect(await getInlineFontCss()).toBeNull();
  });

  it('embute o CSS num <style> no lugar do stylesheet', async () => {
    answerByUserAgent();

    const html = renderToStaticMarkup(await GoogleFonts());

    expect(html).toContain(`<style data-href="${GOOGLE_FONTS_URL.replaceAll('&', '&amp;')}">@font-face`);
    expect(html).not.toContain('rel="stylesheet"');
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>');
  });

  it('usa o <link> do stylesheet quando não consegue baixar o CSS', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const html = renderToStaticMarkup(await GoogleFonts());

    expect(html).toContain(`<link href="${GOOGLE_FONTS_URL.replaceAll('&', '&amp;')}" rel="stylesheet"/>`);
    expect(html).not.toContain('<style');
  });
});
