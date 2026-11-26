import { getNextStep, getPreviousStep, getVisibleSteps, isLastStep } from '../steps';

describe('steps do planejamento de release', () => {
  const semValoresDeReferencia = { changeRefValue: false };
  const comValoresDeReferencia = { changeRefValue: true };

  it('omite valores de referência quando a chave está desligada', () => {
    expect(getVisibleSteps(semValoresDeReferencia)).toEqual([
      'repositories',
      'releaseInfo',
      'modelConfig',
      'balance',
    ]);
  });

  it('inclui valores de referência quando a chave está ligada', () => {
    expect(getVisibleSteps(comValoresDeReferencia)).toEqual([
      'repositories',
      'releaseInfo',
      'modelConfig',
      'referenceValues',
      'balance',
    ]);
  });

  it('avança e volta pulando valores de referência quando desligada', () => {
    expect(getNextStep('modelConfig', semValoresDeReferencia)).toBe('balance');
    expect(getPreviousStep('balance', semValoresDeReferencia)).toBe('modelConfig');
  });

  it('avança e volta passando por valores de referência quando ligada', () => {
    expect(getNextStep('modelConfig', comValoresDeReferencia)).toBe('referenceValues');
    expect(getPreviousStep('balance', comValoresDeReferencia)).toBe('referenceValues');
  });

  it('não tem etapa antes da primeira nem depois da última', () => {
    expect(getPreviousStep('repositories', semValoresDeReferencia)).toBeUndefined();
    expect(getNextStep('balance', semValoresDeReferencia)).toBeUndefined();
  });

  it('não navega a partir de uma etapa oculta', () => {
    expect(getNextStep('referenceValues', semValoresDeReferencia)).toBeUndefined();
    expect(getPreviousStep('referenceValues', semValoresDeReferencia)).toBeUndefined();
  });

  it('identifica a última etapa', () => {
    expect(isLastStep('balance', semValoresDeReferencia)).toBe(true);
    expect(isLastStep('modelConfig', semValoresDeReferencia)).toBe(false);
  });
});
