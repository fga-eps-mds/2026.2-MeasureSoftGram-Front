import {
  buildQualityBands,
  formatQualityBandRange,
  getQualityBand,
  getQualityBandClamped,
  getQualityVisualMapPieces,
  QUALITY_BANDS
} from '../qualityBands';

// régua de um produto que subiu o corte da faixa A para 0,85, como no exemplo do CA1 da US30.02
const PRODUCT_BANDS = buildQualityBands([
  { key: 'E', min: 0, max: 0.1 },
  { key: 'D', min: 0.1, max: 0.3 },
  { key: 'C', min: 0.3, max: 0.5 },
  { key: 'B', min: 0.5, max: 0.85 },
  { key: 'A', min: 0.85, max: 1 }
]);

describe('QUALITY_BANDS', () => {
  it('cobre de 0 a 1 sem buracos, com as cores e os rótulos da US06.01', () => {
    expect(QUALITY_BANDS.map(({ grade, color, label }) => [grade, color, label])).toEqual([
      ['E', '#BE2E0E', 'Muito ruim'],
      ['D', '#F16141', 'Ruim'],
      ['C', '#EBA133', 'Bom'],
      ['B', '#0DC889', 'Muito bom'],
      ['A', '#04724D', 'Ótimo']
    ]);
    QUALITY_BANDS.slice(1).forEach((band, index) => expect(band.min).toBe(QUALITY_BANDS[index].max));
    expect(QUALITY_BANDS[0].min).toBe(0);
    expect(QUALITY_BANDS[QUALITY_BANDS.length - 1].max).toBe(1);
  });
});

describe('getQualityBand', () => {
  it.each([
    [0, 'E'],
    [0.19, 'E'],
    [0.2, 'D'],
    [0.4, 'C'],
    [0.6, 'B'],
    [0.79, 'B'],
    [0.8, 'A'],
    [1, 'A']
  ])('%p fica na faixa %s', (value, grade) => {
    expect(getQualityBand(value)?.grade).toBe(grade);
  });

  it('não classifica valores fora de 0 a 1', () => {
    expect(getQualityBand(-0.1)).toBeUndefined();
    expect(getQualityBand(1.01)).toBeUndefined();
  });

  it('usa os limites da régua recebida em vez dos padrões', () => {
    // com a faixa A começando em 0,85, o indicador de 0,82 fica na B, não na A dos padrões (CA1)
    expect(getQualityBand(0.82, PRODUCT_BANDS)?.grade).toBe('B');
    expect(getQualityBand(0.82)?.grade).toBe('A');
    expect(getQualityBand(0.85, PRODUCT_BANDS)?.grade).toBe('A');
    expect(getQualityBand(0.05, PRODUCT_BANDS)?.grade).toBe('E');
    expect(getQualityBand(0.1, PRODUCT_BANDS)?.grade).toBe('D');
    expect(getQualityBand(1, PRODUCT_BANDS)?.grade).toBe('A');
  });
});

describe('buildQualityBands', () => {
  it('junta os limites do produto com a cor e o nome de cada letra', () => {
    expect(PRODUCT_BANDS).toEqual([
      { grade: 'E', min: 0, max: 0.1, color: '#BE2E0E', label: 'Muito ruim' },
      { grade: 'D', min: 0.1, max: 0.3, color: '#F16141', label: 'Ruim' },
      { grade: 'C', min: 0.3, max: 0.5, color: '#EBA133', label: 'Bom' },
      { grade: 'B', min: 0.5, max: 0.85, color: '#0DC889', label: 'Muito bom' },
      { grade: 'A', min: 0.85, max: 1, color: '#04724D', label: 'Ótimo' }
    ]);
  });

  it('não deixa faixa sem cor quando a letra não é uma das cinco', () => {
    const [band] = buildQualityBands([{ key: 'F' as never, min: 0, max: 1 }]);

    expect(band.color).toBe(QUALITY_BANDS[0].color);
    expect(band.label).toBe(QUALITY_BANDS[0].label);
  });
});

describe('getQualityBandClamped', () => {
  it('leva o que passar de 0 a 1 para a faixa da ponta', () => {
    expect(getQualityBandClamped(-0.1).grade).toBe('E');
    expect(getQualityBandClamped(1.2).grade).toBe('A');
    expect(getQualityBandClamped(0.6).grade).toBe('B');
  });

  it('respeita a régua recebida, inclusive nas pontas', () => {
    expect(getQualityBandClamped(0.82, PRODUCT_BANDS).grade).toBe('B');
    expect(getQualityBandClamped(-0.5, PRODUCT_BANDS).grade).toBe('E');
    expect(getQualityBandClamped(1.2, PRODUCT_BANDS).grade).toBe('A');
  });
});

describe('formatQualityBandRange', () => {
  it('escreve o intervalo de cada faixa com vírgula decimal', () => {
    expect(QUALITY_BANDS.map(formatQualityBandRange)).toEqual([
      '0,00 a 0,19',
      '0,20 a 0,39',
      '0,40 a 0,59',
      '0,60 a 0,79',
      '0,80 a 1,00'
    ]);
  });

  it('escreve o intervalo com os limites do produto', () => {
    // a legenda da faixa A do exemplo do CA1 passa a ler "0,85 a 1,00"
    expect(PRODUCT_BANDS.map(formatQualityBandRange)).toEqual([
      '0,00 a 0,09',
      '0,10 a 0,29',
      '0,30 a 0,49',
      '0,50 a 0,84',
      '0,85 a 1,00'
    ]);
  });
});

describe('getQualityVisualMapPieces', () => {
  it('cobre de 0 a 1 com as mesmas fronteiras das faixas', () => {
    expect(getQualityVisualMapPieces()).toEqual([
      { lt: 0.2, color: '#BE2E0E' },
      { gte: 0.2, lt: 0.4, color: '#F16141' },
      { gte: 0.4, lt: 0.6, color: '#EBA133' },
      { gte: 0.6, lt: 0.8, color: '#0DC889' },
      { gte: 0.8, color: '#04724D' }
    ]);
  });

  it('usa as fronteiras da régua do produto', () => {
    expect(getQualityVisualMapPieces(PRODUCT_BANDS)).toEqual([
      { lt: 0.1, color: '#BE2E0E' },
      { gte: 0.1, lt: 0.3, color: '#F16141' },
      { gte: 0.3, lt: 0.5, color: '#EBA133' },
      { gte: 0.5, lt: 0.85, color: '#0DC889' },
      { gte: 0.85, color: '#04724D' }
    ]);
  });
});
