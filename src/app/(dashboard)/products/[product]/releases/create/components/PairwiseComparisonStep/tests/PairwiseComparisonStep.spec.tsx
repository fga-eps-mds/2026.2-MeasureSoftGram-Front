import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreConfigData } from '@customTypes/preConfig';
import { AHPCalculateResponse } from '@customTypes/ahp';
import { ahpService } from '@services/ahp';
import PairwiseComparisonStep from '../PairwiseComparisonStep';
import { useAhpComparison, AhpComparison } from '../../../hooks/useAhpComparison';

jest.mock('@services/ahp');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'pt' },
  }),
}));

const measure = (key: string, weight: number) => ({ key, weight, active: true, metrics: [] });

const padrao = (): PreConfigData => ({
  characteristics: [
    {
      key: 'reliability', weight: 34, active: true, goal: 50,
      subcharacteristics: [
        { key: 'testing_status', weight: 50, active: true, measures: [measure('passed_tests', 33), measure('test_builds', 33), measure('test_coverage', 34)] },
        { key: 'maturity', weight: 50, active: true, measures: [measure('ci_feedback_time', 100)] },
      ],
    },
    {
      key: 'maintainability', weight: 33, active: true, goal: 50,
      subcharacteristics: [{ key: 'modifiability', weight: 100, active: true, measures: [measure('technical_debt_ratio', 100)] }],
    },
    {
      key: 'functional_suitability', weight: 33, active: true, goal: 50,
      subcharacteristics: [{ key: 'functional_completeness', weight: 100, active: true, measures: [measure('team_throughput', 100)] }],
    },
  ],
});

const resposta = (weights: Record<string, number>, cr: number | null, consistent = true): { data: AHPCalculateResponse } => ({
  data: { priorities: {}, weights, consistency_ratio: cr, consistent, cr_threshold: 0.1, conflict: null },
});

let ahpRef: AhpComparison;
let configRef: PreConfigData | undefined;

function Harness() {
  const [config, setConfig] = useState<PreConfigData | undefined>(padrao());
  const ahp = useAhpComparison({ organizationId: '1', productId: '2', configPageData: config, setConfigPageData: setConfig, enabled: true });
  useEffect(() => {
    ahpRef = ahp;
    configRef = config;
  });
  return (
    <>
      <PairwiseComparisonStep ahp={ahp} baselineConfig={padrao()} />
      <button type="button" onClick={() => ahp.enter('forward')}>entrar</button>
      <button type="button" onClick={() => ahp.next()}>proximo</button>
      <button
        type="button"
        onClick={() => setConfig(prev => prev && ({
          ...prev,
          characteristics: prev.characteristics.map(c => (c.key === 'functional_suitability' ? { ...c, active: false } : c)),
        }))}
      >
        remover adequação
      </button>
    </>
  );
}

async function responder(a: string, b: string, escolha: string, intensidade?: string) {
  const par = within(screen.getByTestId(`pair-${a}-${b}`));
  fireEvent.click(par.getByLabelText(escolha));
  if (intensidade) {
    fireEvent.mouseDown(par.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: `intensity.${intensidade}` }));
  }
}

describe('PairwiseComparisonStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ahpService.getScale as jest.Mock).mockResolvedValue({
      data: {
        scale: { igual: 1, moderadamente: 3, fortemente: 5, muito_fortemente: 7, extremamente: 9 },
        phrases: {},
        cr_threshold: 0.1,
      },
    });
  });

  it('pede a prévia só quando todos os pares do grupo estão respondidos (Cenário 1)', async () => {
    (ahpService.calculateGroup as jest.Mock).mockResolvedValue(resposta({ reliability: 43, maintainability: 43, functional_suitability: 14 }, 0));
    render(<Harness />);
    fireEvent.click(screen.getByText('entrar'));

    expect(screen.getByText(/groupProgress .*"index":1,"total":8/)).toBeInTheDocument();
    expect(within(screen.getByTestId('group-chip-reliability/maturity/measures')).getByText(/groupMeasures/)).toBeInTheDocument();

    await responder('reliability', 'maintainability', 'equallyImportant');
    await responder('reliability', 'functional_suitability', 'characteristics.reliability', 'moderadamente');

    expect(screen.getByText(/previewPending .*"answered":2,"total":3/)).toBeInTheDocument();
    expect(ahpService.calculateGroup).not.toHaveBeenCalled();
    expect(ahpRef.canAdvance).toBe(false);
  });

  it('mostra CR e pesos antes → depois iguais aos do msgram weights (Cenário 2)', async () => {
    (ahpService.calculateGroup as jest.Mock).mockResolvedValue(resposta({ reliability: 43, maintainability: 43, functional_suitability: 14 }, 0));
    render(<Harness />);
    fireEvent.click(screen.getByText('entrar'));

    await responder('reliability', 'maintainability', 'equallyImportant');
    await responder('reliability', 'functional_suitability', 'characteristics.reliability', 'moderadamente');
    await responder('maintainability', 'functional_suitability', 'characteristics.maintainability', 'moderadamente');

    await waitFor(() => expect(ahpService.calculateGroup).toHaveBeenCalledWith('1', '2', {
      entities: ['reliability', 'maintainability', 'functional_suitability'],
      answers: [
        { a: 'reliability', b: 'maintainability', preferred: null, intensity: 'igual' },
        { a: 'reliability', b: 'functional_suitability', preferred: 'reliability', intensity: 'moderadamente' },
        { a: 'maintainability', b: 'functional_suitability', preferred: 'maintainability', intensity: 'moderadamente' },
      ],
    }));

    expect(await screen.findByText(/consistencyOk .*"cr":"0,00"/)).toBeInTheDocument();
    const linha = within(screen.getByTestId('preview-row-functional_suitability'));
    expect(linha.getByText('33')).toBeInTheDocument();
    expect(linha.getByText('14')).toBeInTheDocument();
    expect(linha.getByText('-19')).toBeInTheDocument();

    expect(configRef?.characteristics.map(c => c.weight)).toEqual([43, 43, 14]);
    expect(ahpRef.canAdvance).toBe(true);
  });

  it('respostas circulares: avisa o CR e o ciclo, e só libera após aceitar (Cenário 5)', async () => {
    (ahpService.calculateGroup as jest.Mock).mockResolvedValue(resposta({ passed_tests: 34, test_builds: 33, test_coverage: 33 }, 4.95, false));
    render(<Harness />);
    act(() => ahpRef.goToGroup('reliability/testing_status/measures'));

    await responder('passed_tests', 'test_builds', 'measures.passed_tests', 'muito_fortemente');
    await responder('passed_tests', 'test_coverage', 'measures.test_coverage', 'muito_fortemente');
    await responder('test_builds', 'test_coverage', 'measures.test_builds', 'muito_fortemente');

    expect(await screen.findByText(/consistencyHigh .*"cr":"4,95","threshold":"0,10"/)).toBeInTheDocument();
    expect(screen.getByText(/consistencyCycle .*measures.passed_tests > measures.test_builds > measures.test_coverage > measures.passed_tests/)).toBeInTheDocument();
    expect(ahpRef.canAdvance).toBe(false);

    fireEvent.click(screen.getByText('acceptAnyway'));

    expect(await screen.findByText(/consistencyAccepted .*"cr":"4,95"/)).toBeInTheDocument();
    expect(screen.getByTestId('group-chip-reliability/testing_status/measures')).toHaveAttribute('data-tone', 'current');
    expect(ahpRef.statusOf(ahpRef.currentGroup!)).toBe('accepted');
    expect(ahpRef.canAdvance).toBe(true);
  });

  it('mudar uma resposta depois de aceitar volta a exigir revisão ou aceite', async () => {
    (ahpService.calculateGroup as jest.Mock).mockResolvedValue(resposta({ passed_tests: 34, test_builds: 33, test_coverage: 33 }, 4.95, false));
    render(<Harness />);
    act(() => ahpRef.goToGroup('reliability/testing_status/measures'));

    await responder('passed_tests', 'test_builds', 'measures.passed_tests', 'muito_fortemente');
    await responder('passed_tests', 'test_coverage', 'measures.test_coverage', 'muito_fortemente');
    await responder('test_builds', 'test_coverage', 'measures.test_builds', 'muito_fortemente');
    fireEvent.click(await screen.findByText('acceptAnyway'));
    await waitFor(() => expect(ahpRef.canAdvance).toBe(true));

    await responder('test_builds', 'test_coverage', 'measures.test_builds', 'extremamente');
    await waitFor(() => expect(ahpRef.statusOf(ahpRef.currentGroup!)).toBe('inconsistent'));
  });

  it('grupo de uma entidade: peso 100 sem perguntas, e "Próximo grupo" o pula (Cenário 4)', async () => {
    render(<Harness />);
    act(() => ahpRef.goToGroup('maintainability/subcharacteristics'));

    expect(screen.getByText(/singleEntityGroup .*subCharacteristics.modifiability/)).toBeInTheDocument();
    expect(screen.queryByText('whichMoreImportant')).not.toBeInTheDocument();
    expect(ahpRef.canAdvance).toBe(true);

    fireEvent.click(screen.getByText('proximo'));
    expect(ahpRef.currentGroup?.path).toBe('reliability/testing_status/measures');
  });

  it('mostra o erro do Service quando a prévia falha', async () => {
    (ahpService.calculateGroup as jest.Mock).mockRejectedValue({ response: { data: { detail: 'Faltam comparações: a × c' } } });
    render(<Harness />);
    fireEvent.click(screen.getByText('entrar'));

    await responder('reliability', 'maintainability', 'equallyImportant');
    await responder('reliability', 'functional_suitability', 'equallyImportant');
    await responder('maintainability', 'functional_suitability', 'equallyImportant');

    expect(await screen.findByText('Faltam comparações: a × c')).toBeInTheDocument();
    expect(ahpRef.canAdvance).toBe(false);
  });

  it('descarta as respostas e pede a comparação de novo quando as entidades mudam (Cenário 7)', async () => {
    (ahpService.calculateGroup as jest.Mock).mockResolvedValue(resposta({ reliability: 43, maintainability: 43, functional_suitability: 14 }, 0));
    render(<Harness />);
    fireEvent.click(screen.getByText('entrar'));

    await responder('reliability', 'maintainability', 'equallyImportant');
    await responder('reliability', 'functional_suitability', 'characteristics.reliability', 'moderadamente');
    await responder('maintainability', 'functional_suitability', 'characteristics.maintainability', 'moderadamente');
    await waitFor(() => expect(ahpRef.canAdvance).toBe(true));

    fireEvent.click(screen.getByText('remover adequação'));

    const aviso = within(await screen.findByTestId('group-changed'));
    expect(aviso.getByText('groupChangedTitle')).toBeInTheDocument();
    expect(aviso.getByText(/groupChangedRemoved .*characteristics.functional_suitability/)).toBeInTheDocument();
    expect(within(screen.getByTestId('pair-reliability-maintainability')).getByText('unanswered')).toBeInTheDocument();
    expect(screen.queryByTestId('group-chip-functional_suitability/subcharacteristics')).not.toBeInTheDocument();
    expect(ahpRef.canAdvance).toBe(false);
    expect(ahpRef.comparisonsPayload()).toEqual([]);
  });
});
