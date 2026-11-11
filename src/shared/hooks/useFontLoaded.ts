import { useEffect, useState } from 'react';

/** O prazo que os navegadores dão a uma fonte com `font-display: block` antes de usar a reserva. */
export const FONT_LOAD_TIMEOUT_MS = 3000;

/**
 * Diz se a fonte (no formato do `font` do CSS, como `11px Roboto`) já carregou, para um canvas só desenhar texto com
 * ela. O canvas não troca a fonte sozinho quando ela chega, como o DOM, e o ECharts guarda a largura medida de cada
 * texto: desenhando antes, o texto fica na fonte reserva. Se a fonte não vier no prazo, libera com a reserva, para o
 * gráfico não ficar vazio.
 * shortcut: espera só o subconjunto latino da fonte, o que o `load` pede sem texto; passe o texto ao `load` se o canvas
 * ganhar caracteres de outro subconjunto.
 */
export function useFontLoaded(font: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // sem a API de fontes (jsdom), não há o que esperar
    if (!document.fonts) {
      setLoaded(true);
      return undefined;
    }

    let active = true;
    const done = () => {
      if (active) setLoaded(true);
    };
    const timer = setTimeout(done, FONT_LOAD_TIMEOUT_MS);
    document.fonts.load(font).then(done, done);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [font]);

  return loaded;
}
