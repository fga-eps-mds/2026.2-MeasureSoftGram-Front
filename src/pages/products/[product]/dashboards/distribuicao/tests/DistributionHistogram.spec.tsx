import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QUALITY_BANDS, QualityBand } from '@utils/qualityBands';
import { PRODUCT_BANDS } from '@utils/tests/productQualityBandsFixture';
import {
  BAND_LABEL_STEPS,
  BAND_LETTER_ONLY_MAX_WIDTH,
  bandColumns,
  bandLabelRules,
  QualityBandRuler,
  VISUALLY_HIDDEN
} from '../DistributionHistogram';

function cssRules() {
  return Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText));
}

/** As colunas que a régua deve ter, cada número sendo quanto a faixa vale do eixo de 0 a 1, em centésimos. */
const columns = (...widths: number[]) => widths.map((width) => `minmax(0, ${width}fr)`).join(' ');

describe('<QualityBandRuler />', () => {
  it('tem as cinco faixas, de E a A, com a letra e o rótulo no texto e no title', () => {
    render(<QualityBandRuler />);

    const bands = within(screen.getByRole('list', { name: 'Faixas de qualidade de A a E' })).getAllByRole('listitem');
    expect(bands.map((band) => band.textContent)).toEqual([
      'E · Muito ruim',
      'D · Ruim',
      'C · Bom',
      'B · Muito bom',
      'A · Ótimo'
    ]);
    expect(bands.map((band) => band.getAttribute('title'))).toEqual(bands.map((band) => band.textContent));
  });

  it('cada faixa é o próprio container: a decisão de mostrar o rótulo é pela largura da faixa, não da régua', () => {
    render(<QualityBandRuler />);

    const [band] = screen.getAllByTestId('quality-band');
    const bandClass = Array.from(band.classList).find((name) => name.startsWith('css-'));
    const list = screen.getByRole('list', { name: 'Faixas de qualidade de A a E' });
    const listClass = Array.from(list.classList).find((name) => name.startsWith('css-'));
    // o jsdom não calcula a largura nem guarda as regras @container: o teste confere quem é o container, e as
    // regras por largura ficam em bandLabelRules
    expect(cssRules()).toContainEqual(expect.stringMatching(`^\\.${bandClass} \\{.*container-type: inline-size;`));
    expect(cssRules().find((rule) => rule.startsWith(`.${listClass} `))).not.toContain('container-type');
  });

  it('desenha as faixas do produto, com a cor e o rótulo de cada grau (US30.02)', () => {
    render(<QualityBandRuler bands={PRODUCT_BANDS} />);

    const bands = within(screen.getByRole('list', { name: 'Faixas de qualidade de A a E' })).getAllByRole('listitem');
    // os graus e os rótulos vêm do guia de IDV: o que a régua do produto muda são os limites, e com eles a largura
    expect(bands.map((band) => band.textContent)).toEqual([
      'E · Muito ruim',
      'D · Ruim',
      'C · Bom',
      'B · Muito bom',
      'A · Ótimo'
    ]);
    const list = screen.getByRole('list', { name: 'Faixas de qualidade de A a E' });
    const listClass = Array.from(list.classList).find((name) => name.startsWith('css-'));
    const rule = cssRules().find((item) => item.startsWith(`.${listClass} {`));
    expect(rule).toContain(`grid-template-columns: ${columns(25, 20, 20, 20, 15)};`);
  });
});

describe('bandColumns', () => {
  it('dá cinco colunas iguais na régua padrão', () => {
    expect(bandColumns(QUALITY_BANDS)).toBe(columns(20, 20, 20, 20, 20));
  });

  it('dá a cada faixa do produto a largura que ela vale no eixo de 0 a 1, para a cor cair embaixo das barras', () => {
    // um A que começa em 0,85 vale 0,15 do eixo: a coluna dele é menor que as outras
    expect(bandColumns(PRODUCT_BANDS)).toBe(columns(25, 20, 20, 20, 15));
  });

  it('não deixa o ponto flutuante virar uma largura esquisita', () => {
    const thirds: QualityBand[] = [
      { ...QUALITY_BANDS[0], min: 0, max: 0.07 },
      { ...QUALITY_BANDS[1], min: 0.07, max: 0.29 },
      { ...QUALITY_BANDS[2], min: 0.29, max: 0.58 },
      { ...QUALITY_BANDS[3], min: 0.58, max: 0.91 },
      { ...QUALITY_BANDS[4], min: 0.91, max: 1 }
    ];

    expect(bandColumns(thirds)).toBe(columns(7, 22, 29, 33, 9));
  });
});

describe('bandLabelRules', () => {
  it('diminui a fonte em degraus conforme a faixa estreita e, quando nem assim cabe, deixa só a letra, no tamanho normal', () => {
    expect(bandLabelRules()).toEqual({
      '@container (max-width: 72px)': { fontSize: '10px' },
      '@container (max-width: 65px)': { fontSize: '9px' },
      '@container (max-width: 58px)': { fontSize: '11px', '& .quality-band-label': VISUALLY_HIDDEN }
    });
  });

  it('no desktop a letra e o rótulo aparecem, e em 360 px só a letra', () => {
    // largura de cada faixa medida na página: 1440 px → 76, 1314 px → 64, 1024 px → 102, 360 px → 25
    const desktop = [76, 64, 102];
    const narrow = 25;
    const [normal, small] = BAND_LABEL_STEPS;

    desktop.forEach((width) => expect(width).toBeGreaterThan(BAND_LETTER_ONLY_MAX_WIDTH));
    expect(narrow).toBeLessThanOrEqual(BAND_LETTER_ONLY_MAX_WIDTH);
    // "B · Muito bom" mede 69 px em 11 px, 63 px em 10 px e 56 px em 9 px: cada degrau ainda cabe no seu limite
    expect(normal.maxWidth).toBeGreaterThan(69);
    expect(small.maxWidth).toBeGreaterThan(63);
    expect(BAND_LETTER_ONLY_MAX_WIDTH).toBeGreaterThanOrEqual(56);
  });
});
