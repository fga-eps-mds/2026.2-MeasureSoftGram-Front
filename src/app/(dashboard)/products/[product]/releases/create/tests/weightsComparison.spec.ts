import { PreConfigData } from '@customTypes/preConfig';
import { buildWeightComparisonRows, summarizeCharacteristics } from '../utils/weightsComparison';

const measure = (key: string, weight: number, active = true) => ({ key, weight, active, metrics: [] });

const padrao: PreConfigData = {
  characteristics: [
    {
      key: 'reliability',
      weight: 34,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'testing_status', weight: 50, active: true, measures: [measure('passed_tests', 33), measure('test_builds', 33), measure('test_coverage', 34)] },
        { key: 'maturity', weight: 50, active: true, measures: [measure('ci_feedback_time', 100)] },
      ],
    },
    {
      key: 'maintainability',
      weight: 66,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'modifiability', weight: 100, active: true, measures: [measure('technical_debt_ratio', 100)] },
      ],
    },
  ],
};

// Última configuração já mesclada com o padrão: "maturity" ficou de fora (peso 0, inativa).
const ultima: PreConfigData = {
  characteristics: [
    {
      key: 'reliability',
      weight: 43,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'testing_status', weight: 100, active: true, measures: [measure('passed_tests', 34), measure('test_builds', 33), measure('test_coverage', 33)] },
        { key: 'maturity', weight: 0, active: false, measures: [measure('ci_feedback_time', 0, false)] },
      ],
    },
    {
      key: 'maintainability',
      weight: 57,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'modifiability', weight: 100, active: true, measures: [measure('technical_debt_ratio', 100)] },
      ],
    },
  ],
};

describe('buildWeightComparisonRows', () => {
  const rows = buildWeightComparisonRows(ultima, padrao);

  it('segue a hierarquia característica › sub › medida do padrão', () => {
    expect(rows.map(row => `${row.level}:${row.key}`)).toEqual([
      'characteristic:reliability',
      'subcharacteristic:testing_status',
      'measure:passed_tests',
      'measure:test_builds',
      'measure:test_coverage',
      'subcharacteristic:maturity',
      'measure:ci_feedback_time',
      'characteristic:maintainability',
      'subcharacteristic:modifiability',
      'measure:technical_debt_ratio',
    ]);
  });

  it('marca o que difere e mantém iguais os pesos que coincidem', () => {
    const byKey = Object.fromEntries(rows.map(row => [row.key, row]));

    expect(byKey.reliability).toMatchObject({ last: 43, default: 34, differs: true });
    expect(byKey.test_builds).toMatchObject({ last: 33, default: 33, differs: false });
    expect(byKey.technical_debt_ratio).toMatchObject({ last: 100, default: 100, differs: false });
  });

  it('mostra sem peso a entidade que não está na última configuração', () => {
    const maturity = rows.find(row => row.key === 'maturity');
    expect(maturity).toMatchObject({ last: null, default: 50, differs: true });
  });
});

describe('summarizeCharacteristics', () => {
  it('lista as características ativas com o peso', () => {
    expect(summarizeCharacteristics(ultima, key => key)).toBe(
      'characteristics.reliability 43 · characteristics.maintainability 57'
    );
  });
});
