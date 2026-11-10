import {
  DEFAULT_LIMITS,
  LIMIT_MESSAGES,
  bandsFromLimits,
  formatLimit,
  formatLimits,
  getLimitErrors,
  getRulerSegments,
  limitsFromBands,
  parseLimit,
  parseLimits,
  sameLimits
} from '../qualityBandsForm';

describe('qualityBandsForm', () => {
  it('tem como padrão os limites das faixas da US06.01', () => {
    expect(DEFAULT_LIMITS).toEqual([0.2, 0.4, 0.6, 0.8]);
    expect(formatLimits(DEFAULT_LIMITS)).toEqual(['0,20', '0,40', '0,60', '0,80']);
  });

  it('lê o limite com vírgula ou ponto e recusa o que não é número', () => {
    expect(parseLimit('0,7')).toBe(0.7);
    expect(parseLimit(' 0.75 ')).toBe(0.75);
    expect(parseLimit(',5')).toBe(0.5);
    expect(parseLimit('1')).toBe(1);
    expect(parseLimit('-0,1')).toBe(-0.1);
    expect(parseLimit('')).toBeNaN();
    expect(parseLimit('abc')).toBeNaN();
    expect(parseLimit('0,5,1')).toBeNaN();
  });

  it('formata com duas casas e vírgula', () => {
    expect(formatLimit(0.7)).toBe('0,70');
    expect(formatLimit(1)).toBe('1,00');
  });

  describe('getLimitErrors (CA3)', () => {
    it('aceita limites crescentes entre 0 e 1', () => {
      expect(getLimitErrors(['0,20', '0,40', '0,70', '0,80'])).toEqual([null, null, null, null]);
    });

    it('recusa um limite menor ou igual ao da faixa anterior', () => {
      expect(getLimitErrors(['0,20', '0,40', '0,40', '0,80'])[2]).toBe('O limite precisa ser maior que 0,40.');
      expect(getLimitErrors(['0,20', '0,50', '0,45', '0,80'])[2]).toBe('O limite precisa ser maior que 0,50.');
    });

    it('recusa a faixa E vazia e a faixa A vazia', () => {
      expect(getLimitErrors(['0', '0,40', '0,60', '0,80'])[0]).toBe('O limite precisa ser maior que 0,00.');
      expect(getLimitErrors(['0,20', '0,40', '0,60', '1'])[3]).toBe(LIMIT_MESSAGES.lessThanOne);
    });

    it('recusa valores fora de 0 a 1, que não são número ou com mais de duas casas', () => {
      expect(getLimitErrors(['0,20', '0,40', '0,60', '1,5'])[3]).toBe(LIMIT_MESSAGES.range);
      expect(getLimitErrors(['-0,1', '0,40', '0,60', '0,80'])[0]).toBe(LIMIT_MESSAGES.range);
      expect(getLimitErrors(['0,20', '', '0,60', '0,80'])[1]).toBe(LIMIT_MESSAGES.notANumber);
      expect(getLimitErrors(['0,20', '0,40', '0,655', '0,80'])[2]).toBe(LIMIT_MESSAGES.decimals);
    });

    it('deixa a mensagem só no campo inválido quando o seguinte depende dele', () => {
      expect(getLimitErrors(['0,20', 'x', '0,60', '0,80'])).toEqual([null, LIMIT_MESSAGES.notANumber, null, null]);
      expect(getLimitErrors(['0,20', '1,5', '0,60', '0,80'])).toEqual([null, LIMIT_MESSAGES.range, null, null]);
      expect(getLimitErrors(['0,20', '0,655', '0,60', '0,80'])).toEqual([null, LIMIT_MESSAGES.decimals, null, null]);
    });

    it('compara em centésimos, sem erro de ponto flutuante', () => {
      expect(getLimitErrors(['0,1', '0,30', '0,60', '0,80'])[1]).toBeNull();
    });
  });

  it('converte entre limites e faixas do Service', () => {
    const bands = bandsFromLimits([0.2, 0.4, 0.7, 0.8]);

    expect(bands).toEqual([
      { key: 'E', min: 0, max: 0.2 },
      { key: 'D', min: 0.2, max: 0.4 },
      { key: 'C', min: 0.4, max: 0.7 },
      { key: 'B', min: 0.7, max: 0.8 },
      { key: 'A', min: 0.8, max: 1 }
    ]);
    expect(limitsFromBands(bands)).toEqual([0.2, 0.4, 0.7, 0.8]);
  });

  it('arredonda os limites digitados para centésimos e compara réguas', () => {
    expect(parseLimits(['0,2', '0.4', '0,70', '0,8'])).toEqual([0.2, 0.4, 0.7, 0.8]);
    expect(sameLimits([0.1 + 0.2, 0.4, 0.6, 0.8], [0.3, 0.4, 0.6, 0.8])).toBe(true);
    expect(sameLimits([0.2, 0.4, 0.7, 0.8], DEFAULT_LIMITS)).toBe(false);
  });

  describe('getRulerSegments (CA2)', () => {
    it('acompanha os limites digitados', () => {
      const segments = getRulerSegments(['0,20', '0,40', '0,70', '0,80'], DEFAULT_LIMITS);

      expect(segments.map(({ band, start, end }) => [band.grade, start, end])).toEqual([
        ['E', 0, 0.2],
        ['D', 0.2, 0.4],
        ['C', 0.4, 0.7],
        ['B', 0.7, 0.8],
        ['A', 0.8, 1]
      ]);
    });

    it('usa o limite salvo no lugar de um campo inválido e nunca desenha trecho negativo', () => {
      const segments = getRulerSegments(['0,20', 'abc', '0,30', '0,80'], DEFAULT_LIMITS);

      expect(segments[1]).toMatchObject({ start: 0.2, end: 0.4 });
      // 0,30 é menor que o limite anterior (0,40): o trecho da faixa C fica vazio, e não negativo
      expect(segments[2]).toMatchObject({ start: 0.4, end: 0.4 });
      segments.forEach(({ start, end }) => expect(end).toBeGreaterThanOrEqual(start));
    });
  });
});
