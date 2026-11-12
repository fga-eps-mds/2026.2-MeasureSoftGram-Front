import React from 'react';
import { GOOGLE_FONTS_URL, getInlineFontCss } from './inlineFontCss';

/** As fontes do Google embutidas no <head>, como o Next 12 fazia; sem rede, cai no <link> do stylesheet. */
export default async function GoogleFonts() {
  const css = await getInlineFontCss();

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {css ? (
        <style data-href={GOOGLE_FONTS_URL} dangerouslySetInnerHTML={{ __html: css }} />
      ) : (
        <link href={GOOGLE_FONTS_URL} rel="stylesheet" />
      )}
    </>
  );
}
