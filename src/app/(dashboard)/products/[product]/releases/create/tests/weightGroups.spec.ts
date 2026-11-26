import { PreConfigData } from '@customTypes/preConfig';
import {
  applyGroupWeights,
  buildWeightGroups,
  weightsInConfig,
  findEmptyGroups,
  findInvalidGroups,
  groupElementId,
  normalizeSingleEntityGroups,
} from '../utils/weightGroups';

const measure = (key: string, weight: number, active = true) => ({ key, weight, active, metrics: [] });

const config = (): PreConfigData => ({
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
      weight: 33,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'modifiability', weight: 100, active: true, measures: [measure('technical_debt_ratio', 100)] },
      ],
    },
    {
      key: 'functional_suitability',
      weight: 33,
      active: true,
      goal: 50,
      subcharacteristics: [
        { key: 'functional_completeness', weight: 100, active: true, measures: [measure('team_throughput', 100)] },
      ],
    },
  ],
});

describe('buildWeightGroups', () => {
  it('monta os grupos na ordem do protótipo e com o group_path do Service', () => {
    expect(buildWeightGroups(config()).map(group => group.path)).toEqual([
      'characteristics',
      'reliability/subcharacteristics',
      'maintainability/subcharacteristics',
      'functional_suitability/subcharacteristics',
      'reliability/testing_status/measures',
      'reliability/maturity/measures',
      'maintainability/modifiability/measures',
      'functional_suitability/functional_completeness/measures',
    ]);
  });

  it('deixa de fora as entidades desmarcadas e os grupos delas', () => {
    const data = config();
    data.characteristics[2].active = false;
    data.characteristics[0].subcharacteristics[0].measures[1].active = false;

    const groups = buildWeightGroups(data);
    expect(groups.map(group => group.path)).not.toContain('functional_suitability/subcharacteristics');
    expect(groups[0].entities.map(entity => entity.key)).toEqual(['reliability', 'maintainability']);
    expect(groups.find(group => group.path === 'reliability/testing_status/measures')?.entities.map(entity => entity.key))
      .toEqual(['passed_tests', 'test_coverage']);
  });
});

describe('findInvalidGroups', () => {
  it('não acusa nada quando todo grupo soma 100', () => {
    expect(findInvalidGroups(config())).toEqual([]);
  });

  it('acusa o grupo com soma diferente de 100 e informa a soma', () => {
    const data = config();
    data.characteristics[0].weight = 44;

    expect(findInvalidGroups(data)).toEqual([
      expect.objectContaining({ group: expect.objectContaining({ path: 'characteristics' }), sum: 110 }),
    ]);
  });
});

describe('findEmptyGroups', () => {
  it('acusa a característica sem nenhuma subcaracterística marcada', () => {
    const data = config();
    data.characteristics[1].subcharacteristics[0].active = false;

    expect(findEmptyGroups(data).map(group => group.path)).toEqual(['maintainability/subcharacteristics']);
  });
});

describe('normalizeSingleEntityGroups', () => {
  it('dá peso 100 à única entidade marcada do grupo', () => {
    const data = config();
    data.characteristics[0].subcharacteristics[1].active = false;

    const normalized = normalizeSingleEntityGroups(data);
    const reliability = normalized.characteristics[0];

    expect(reliability.subcharacteristics[0].weight).toBe(100);
    expect(reliability.subcharacteristics[1].weight).toBe(50);
    expect(reliability.subcharacteristics[0].measures.map(m => m.weight)).toEqual([33, 33, 34]);
  });

  it('não muda o objeto recebido', () => {
    const data = config();
    data.characteristics[0].subcharacteristics[1].active = false;
    normalizeSingleEntityGroups(data);
    expect(data.characteristics[0].subcharacteristics[0].weight).toBe(50);
  });
});

describe('groupElementId', () => {
  it('aponta para a seção onde o grupo é editado', () => {
    const [characteristics, reliabilitySubs, , , testingStatus] = buildWeightGroups(config());

    expect(groupElementId(characteristics)).toBe('characteristicSection');
    expect(groupElementId(reliabilitySubs)).toBe('SubCarAccordion-reliability');
    expect(groupElementId(testingStatus)).toBe('MetricSubCarAccordion-testing_status');
  });
});

describe('applyGroupWeights', () => {
  it('grava os pesos só nas entidades do grupo', () => {
    const data = config();
    const testingStatus = buildWeightGroups(data).find(group => group.path === 'reliability/testing_status/measures')!;

    const updated = applyGroupWeights(data, testingStatus, { passed_tests: 65, test_builds: 7, test_coverage: 28 });

    expect(updated.characteristics[0].subcharacteristics[0].measures.map(m => m.weight)).toEqual([65, 7, 28]);
    expect(updated.characteristics[0].subcharacteristics[1].measures[0].weight).toBe(100);
    expect(data.characteristics[0].subcharacteristics[0].measures[0].weight).toBe(33);
  });

  it('grava os pesos das características', () => {
    const data = config();
    const updated = applyGroupWeights(data, buildWeightGroups(data)[0], { reliability: 43, maintainability: 43, functional_suitability: 14 });
    expect(updated.characteristics.map(c => c.weight)).toEqual([43, 43, 14]);
  });
});

describe('weightsInConfig', () => {
  it('lê os pesos do grupo em outra configuração (o "Antes")', () => {
    const atual = config();
    atual.characteristics[2].active = false;
    const grupo = buildWeightGroups(atual)[0];

    expect(weightsInConfig(config(), grupo)).toEqual({ reliability: 34, maintainability: 33, functional_suitability: 33 });
    expect(weightsInConfig(undefined, grupo)).toEqual({});
  });
});
