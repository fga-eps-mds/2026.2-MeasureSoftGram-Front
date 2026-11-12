export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700&family=Roboto:wght@300;400;500;700&display=swap';

// Os mesmos user agents com que o Next 12 embutia o CSS do Google Fonts no HTML. Com eles o Google entrega a Roboto em
// arquivos estáticos por peso; o navegador atual recebe a fonte variável, com outra métrica, e o texto muda de largura.
// A ordem IE -> Chrome importa: a regra do Chrome vem depois e prevalece no cascade.
const IE_UA = 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36';

async function fetchCss(url: string, userAgent: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': userAgent }, cache: 'force-cache' });
  if (!response.ok) throw new Error(`Google Fonts respondeu ${response.status}`);
  return response.text();
}

const minify = (css: string) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s+/g, ' ')
    .trim();

/** O CSS das fontes para embutir na página, ou null quando o Google Fonts não responde (a página usa o <link>). */
export async function getInlineFontCss(url: string = GOOGLE_FONTS_URL): Promise<string | null> {
  try {
    const [ie, chrome] = await Promise.all([fetchCss(url, IE_UA), fetchCss(url, CHROME_UA)]);
    return minify(ie + chrome);
  } catch {
    return null;
  }
}
