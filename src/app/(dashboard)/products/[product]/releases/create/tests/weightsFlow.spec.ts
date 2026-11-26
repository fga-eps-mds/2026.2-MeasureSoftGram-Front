import { getNextWeightsView, getPreviousWeightsView } from '../weightsFlow';

describe('telas da etapa Definir pesos', () => {
  it('quantitativa: forma → porcentagens → resumo', () => {
    expect(getNextWeightsView('method', 'typed')).toBe('typed');
    expect(getNextWeightsView('typed', 'typed')).toBe('summary');
    expect(getNextWeightsView('summary', 'typed')).toBeUndefined();
  });

  it('volta pelas mesmas telas e sai da etapa a partir da forma', () => {
    expect(getPreviousWeightsView('summary', 'typed')).toBe('typed');
    expect(getPreviousWeightsView('typed', 'typed')).toBe('method');
    expect(getPreviousWeightsView('method', 'typed')).toBeUndefined();
  });
});
