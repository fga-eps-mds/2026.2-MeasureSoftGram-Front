import { StepFlags, getNextStep, getPreviousStep, getVisibleSteps, isLastStep } from '../steps';

describe('steps do planejamento de release', () => {
  const novosPesos: StepFlags = { startingPoint: 'new', changeRefValue: false };
  const novosPesosComValoresDeReferencia: StepFlags = { startingPoint: 'new', changeRefValue: true };

  it('omite valores de referência quando a chave está desligada', () => {
    expect(getVisibleSteps(novosPesos)).toEqual([
      'repositories',
      'releaseInfo',
      'modelConfig',
      'balance',
    ]);
  });

  it('inclui valores de referência quando a chave está ligada', () => {
    expect(getVisibleSteps(novosPesosComValoresDeReferencia)).toEqual([
      'repositories',
      'releaseInfo',
      'modelConfig',
      'referenceValues',
      'balance',
    ]);
  });

  it.each(['last', 'default'] as const)('com o ponto de partida "%s" vai direto ao balanceamento', startingPoint => {
    const flags: StepFlags = { startingPoint, changeRefValue: true };

    expect(getVisibleSteps(flags)).toEqual(['repositories', 'releaseInfo', 'balance']);
    expect(getNextStep('releaseInfo', flags)).toBe('balance');
    expect(getPreviousStep('balance', flags)).toBe('releaseInfo');
  });

  it('avança e volta pulando valores de referência quando desligada', () => {
    expect(getNextStep('modelConfig', novosPesos)).toBe('balance');
    expect(getPreviousStep('balance', novosPesos)).toBe('modelConfig');
  });

  it('avança e volta passando por valores de referência quando ligada', () => {
    expect(getNextStep('modelConfig', novosPesosComValoresDeReferencia)).toBe('referenceValues');
    expect(getPreviousStep('balance', novosPesosComValoresDeReferencia)).toBe('referenceValues');
  });

  it('não tem etapa antes da primeira nem depois da última', () => {
    expect(getPreviousStep('repositories', novosPesos)).toBeUndefined();
    expect(getNextStep('balance', novosPesos)).toBeUndefined();
  });

  it('não navega a partir de uma etapa oculta', () => {
    expect(getNextStep('referenceValues', novosPesos)).toBeUndefined();
    expect(getPreviousStep('referenceValues', novosPesos)).toBeUndefined();
  });

  it('identifica a última etapa', () => {
    expect(isLastStep('balance', novosPesos)).toBe(true);
    expect(isLastStep('modelConfig', novosPesos)).toBe(false);
  });
});
