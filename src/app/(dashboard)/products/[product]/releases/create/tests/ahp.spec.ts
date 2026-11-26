import { AHPAnswer, AHPCalculateResponse } from '@customTypes/ahp';
import {
  GroupComparison,
  answersKey,
  buildAnswers,
  buildComparisonsPayload,
  reconcileComparisons,
  countAnswered,
  displayedCR,
  findPreferenceCycle,
  groupStatus,
  isGroupDone,
  pairKey,
  pairsOf,
  toAnswer,
} from '../utils/ahp';

const preview = (consistent: boolean, cr: number | null = consistent ? 0 : 4.95): AHPCalculateResponse => ({
  priorities: {},
  weights: {},
  consistency_ratio: cr,
  consistent,
  cr_threshold: 0.1,
  conflict: null,
});

describe('pairsOf', () => {
  it('gera os pares na ordem de itertools.combinations, como o Service', () => {
    expect(pairsOf(['a', 'b', 'c'])).toEqual([['a', 'b'], ['a', 'c'], ['b', 'c']]);
    expect(pairsOf(['a'])).toEqual([]);
  });
});

describe('toAnswer', () => {
  it('converte "igualmente" no formato do Core (preferred null, intensity igual)', () => {
    expect(toAnswer('a', 'b', { choice: 'equal' })).toEqual({ a: 'a', b: 'b', preferred: null, intensity: 'igual' });
  });

  it('converte a preferência pelo segundo do par', () => {
    expect(toAnswer('a', 'b', { choice: 'b', intensity: 'fortemente' })).toEqual({ a: 'a', b: 'b', preferred: 'b', intensity: 'fortemente' });
  });

  it('não considera respondido o par sem intensidade', () => {
    expect(toAnswer('a', 'b', { choice: 'a' })).toBeUndefined();
  });
});

describe('buildAnswers e countAnswered', () => {
  const answers = {
    [pairKey('a', 'b')]: { choice: 'equal' as const },
    [pairKey('a', 'c')]: { choice: 'a' as const, intensity: 'moderadamente' as const },
  };

  it('conta os pares respondidos', () => {
    expect(countAnswered(['a', 'b', 'c'], answers)).toBe(2);
  });

  it('só devolve as respostas quando todos os pares foram respondidos', () => {
    expect(buildAnswers(['a', 'b', 'c'], answers)).toBeUndefined();
    expect(buildAnswers(['a', 'b', 'c'], { ...answers, [pairKey('b', 'c')]: { choice: 'b', intensity: 'moderadamente' } })).toHaveLength(3);
  });
});

describe('findPreferenceCycle', () => {
  const entities = ['passed_tests', 'test_builds', 'test_coverage'];

  it('encontra o ciclo das respostas circulares (vetor CR 4,95 da US13.02)', () => {
    const circular: AHPAnswer[] = [
      { a: 'passed_tests', b: 'test_builds', preferred: 'passed_tests', intensity: 'muito_fortemente' },
      { a: 'passed_tests', b: 'test_coverage', preferred: 'test_coverage', intensity: 'muito_fortemente' },
      { a: 'test_builds', b: 'test_coverage', preferred: 'test_builds', intensity: 'muito_fortemente' },
    ];
    expect(findPreferenceCycle(entities, circular)).toEqual(['passed_tests', 'test_builds', 'test_coverage', 'passed_tests']);
  });

  it('não acusa ciclo quando as preferências são transitivas', () => {
    const transitive: AHPAnswer[] = [
      { a: 'passed_tests', b: 'test_builds', preferred: 'passed_tests', intensity: 'moderadamente' },
      { a: 'passed_tests', b: 'test_coverage', preferred: 'passed_tests', intensity: 'fortemente' },
      { a: 'test_builds', b: 'test_coverage', preferred: null, intensity: 'igual' },
    ];
    expect(findPreferenceCycle(entities, transitive)).toBeNull();
  });
});

describe('groupStatus', () => {
  const entities = ['a', 'b'];
  const answers = { [pairKey('a', 'b')]: { choice: 'a' as const, intensity: 'fortemente' as const } };
  const key = answersKey(buildAnswers(entities, answers)!);

  it('grupo de uma entidade não precisa de comparação', () => {
    expect(groupStatus(['a'])).toBe('single');
    expect(isGroupDone('single')).toBe(true);
  });

  it('fica pendente até a prévia corresponder às respostas atuais', () => {
    expect(groupStatus(entities)).toBe('pending');
    expect(groupStatus(entities, { answers, accepted: false, loading: true })).toBe('pending');
    expect(groupStatus(entities, { answers, preview: preview(true), previewKey: 'outra', accepted: false, loading: false })).toBe('pending');
  });

  it('consistente, aceito acima do limite ou inconsistente', () => {
    expect(groupStatus(entities, { answers, preview: preview(true), previewKey: key, accepted: false, loading: false })).toBe('done');
    expect(groupStatus(entities, { answers, preview: preview(false), previewKey: key, accepted: false, loading: false })).toBe('inconsistent');
    expect(groupStatus(entities, { answers, preview: preview(false), previewKey: key, accepted: true, loading: false })).toBe('accepted');
    expect(isGroupDone('inconsistent')).toBe(false);
  });
});

describe('displayedCR', () => {
  it('mostra 0 quando o Service não calcula CR (2 entidades)', () => {
    expect(displayedCR(preview(true, null))).toBe(0);
    expect(displayedCR(preview(false, 4.95))).toBe(4.95);
  });
});

const group = (path: string, keys: string[]) => ({
  path,
  level: 'characteristics' as const,
  entities: keys.map(key => ({ key, weight: 0 })),
});

const answered = (entities: string[], consistent = true, accepted = false): GroupComparison => {
  const answers = Object.fromEntries(pairsOf(entities).map(([a, b]) => [pairKey(a, b), { choice: 'equal' as const }]));
  return {
    entities,
    answers,
    preview: preview(consistent),
    previewKey: answersKey(buildAnswers(entities, answers)!),
    accepted,
    loading: false,
  };
};

describe('reconcileComparisons (Cenário 7)', () => {
  const abc = ['a', 'b', 'c'];

  it('mantém o mesmo objeto quando as entidades não mudaram', () => {
    const previous = { characteristics: answered(abc) };
    expect(reconcileComparisons(previous, [group('characteristics', abc)])).toBe(previous);
  });

  it('descarta as respostas do grupo cujas entidades mudaram e diz o que mudou', () => {
    const next = reconcileComparisons({ characteristics: answered(abc) }, [group('characteristics', ['a', 'b', 'd'])]);

    expect(next.characteristics).toEqual({
      entities: ['a', 'b', 'd'],
      answers: {},
      accepted: false,
      loading: false,
      stale: { added: ['d'], removed: ['c'] },
    });
    expect(groupStatus(['a', 'b', 'd'], next.characteristics)).toBe('stale');
  });

  it('tira os grupos que deixaram de existir', () => {
    const next = reconcileComparisons({ 'c/subcharacteristics': answered(['x', 'y']) }, [group('characteristics', abc)]);
    expect(next).toEqual({});
  });
});

describe('buildComparisonsPayload', () => {
  it('envia só os grupos comparados e marca o aceite acima do limite', () => {
    const groups = [
      group('characteristics', ['a', 'b']),
      group('a/subcharacteristics', ['x']),
      group('a/x/measures', ['m1', 'm2', 'm3']),
      group('b/subcharacteristics', ['y', 'z']),
    ];
    const payload = buildComparisonsPayload(groups, {
      characteristics: answered(['a', 'b']),
      'a/x/measures': answered(['m1', 'm2', 'm3'], false, true),
      'b/subcharacteristics': { answers: {}, accepted: false, loading: false },
    });

    expect(payload).toEqual([
      {
        group_path: 'characteristics',
        entities: ['a', 'b'],
        answers: [{ a: 'a', b: 'b', preferred: null, intensity: 'igual' }],
        accepted_inconsistent: false,
      },
      expect.objectContaining({ group_path: 'a/x/measures', entities: ['m1', 'm2', 'm3'], accepted_inconsistent: true }),
    ]);
  });
});
