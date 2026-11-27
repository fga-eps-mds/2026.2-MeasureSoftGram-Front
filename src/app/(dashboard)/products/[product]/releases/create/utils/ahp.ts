import { AHPAnswer, AHPCalculateResponse, AHPGroupComparison, SaatyIntensity } from '@customTypes/ahp';
import { WeightGroup } from './weightGroups';

/** Intensidades além de "igual", em ordem crescente (usadas se a escala não carregar). */
export const DEFAULT_INTENSITIES: SaatyIntensity[] = ['moderadamente', 'fortemente', 'muito_fortemente', 'extremamente'];

export const DEFAULT_CR_THRESHOLD = 0.1;

/** Resposta de um par na tela: qual é mais importante e, se não for "igual", quanto. */
export interface PairChoice {
  choice?: 'a' | 'b' | 'equal';
  intensity?: SaatyIntensity;
}

/** Pares na mesma ordem do Service (itertools.combinations): (A,B), (A,C), (B,C). */
export function pairsOf(entities: string[]): [string, string][] {
  return entities.flatMap((a, i) => entities.slice(i + 1).map(b => [a, b] as [string, string]));
}

export const pairKey = (a: string, b: string) => `${a}|${b}`;

export function isPairAnswered(choice?: PairChoice): boolean {
  return choice?.choice === 'equal' || (!!choice?.choice && !!choice.intensity);
}

export function toAnswer(a: string, b: string, choice?: PairChoice): AHPAnswer | undefined {
  if (!isPairAnswered(choice)) return undefined;
  if (choice!.choice === 'equal') return { a, b, preferred: null, intensity: 'igual' };
  return { a, b, preferred: choice!.choice === 'a' ? a : b, intensity: choice!.intensity! };
}

export function countAnswered(entities: string[], answers: Record<string, PairChoice>): number {
  return pairsOf(entities).filter(([a, b]) => isPairAnswered(answers[pairKey(a, b)])).length;
}

/** Respostas no formato do Core, ou undefined se algum par ainda não foi respondido. */
export function buildAnswers(entities: string[], answers: Record<string, PairChoice>): AHPAnswer[] | undefined {
  const built = pairsOf(entities).map(([a, b]) => toAnswer(a, b, answers[pairKey(a, b)]));
  return built.every(Boolean) ? (built as AHPAnswer[]) : undefined;
}

/** CR para exibição: vem do Service; com 2 entidades ele é null e mostramos 0. */
export function displayedCR(preview: AHPCalculateResponse): number {
  return preview.consistency_ratio ?? 0;
}

/**
 * Um ciclo de preferências estritas, como A > B > C > A, para explicar respostas
 * contraditórias. Não calcula peso nenhum: só lê quais entidades foram preferidas.
 */
export function findPreferenceCycle(entities: string[], answers: AHPAnswer[]): string[] | null {
  const beats = new Map<string, string[]>(entities.map(entity => [entity, []]));
  answers.forEach(answer => {
    if (!answer.preferred) return;
    const loser = answer.preferred === answer.a ? answer.b : answer.a;
    beats.get(answer.preferred)?.push(loser);
  });

  const visit = (node: string, path: string[]): string[] | null => {
    for (const next of beats.get(node) ?? []) {
      const start = path.indexOf(next);
      if (start !== -1) return [...path.slice(start), next];
      const found = visit(next, [...path, next]);
      if (found) return found;
    }
    return null;
  };

  for (const entity of entities) {
    const cycle = visit(entity, [entity]);
    if (cycle) return cycle;
  }
  return null;
}

export type GroupStatus = 'single' | 'pending' | 'stale' | 'done' | 'accepted' | 'inconsistent';

/** O que mudou nas entidades de um grupo depois de comparado (tela 09). */
export interface StaleChange {
  added: string[];
  removed: string[];
}

export interface GroupComparison {
  /** Entidades do grupo quando as respostas foram dadas. */
  entities?: string[];
  /** Preenchido quando as entidades mudaram e as respostas foram descartadas. */
  stale?: StaleChange;
  answers: Record<string, PairChoice>;
  preview?: AHPCalculateResponse;
  /** Respostas a que a prévia corresponde; se mudarem, a prévia fica desatualizada. */
  previewKey?: string;
  accepted: boolean;
  loading: boolean;
  error?: string;
}

export const answersKey = (answers: AHPAnswer[]) => JSON.stringify(answers);

export function groupStatus(entities: string[], comparison?: GroupComparison): GroupStatus {
  if (entities.length === 1) return 'single';
  if (!comparison) return 'pending';

  const answers = buildAnswers(entities, comparison.answers);
  const preview = comparison.preview;
  if (!answers || !preview || comparison.previewKey !== answersKey(answers)) return comparison.stale ? 'stale' : 'pending';
  if (preview.consistent) return 'done';
  return comparison.accepted ? 'accepted' : 'inconsistent';
}

export const isGroupDone = (status: GroupStatus) => status === 'single' || status === 'done' || status === 'accepted';

const sameList = (x: string[], y: string[]) => x.length === y.length && x.every((item, index) => item === y[index]);

/**
 * Cenário 7: se as entidades de um grupo comparado mudaram em "Definir entidades",
 * as respostas dele são descartadas e a comparação é pedida de novo. Grupos que
 * deixaram de existir saem. Devolve o mesmo objeto quando nada mudou.
 */
export function reconcileComparisons(
  previous: Record<string, GroupComparison>,
  groups: WeightGroup[]
): Record<string, GroupComparison> {
  let changed = false;
  const next: Record<string, GroupComparison> = {};

  Object.entries(previous).forEach(([path, comparison]) => {
    const group = groups.find(item => item.path === path);
    if (!group) {
      changed = true;
      return;
    }

    const entities = group.entities.map(entity => entity.key);
    const before = comparison.entities;
    if (!before || sameList(before, entities)) {
      next[path] = comparison;
      return;
    }

    changed = true;
    next[path] = {
      entities,
      answers: {},
      accepted: false,
      loading: false,
      stale: {
        added: entities.filter(entity => !before.includes(entity)),
        removed: before.filter(entity => !entities.includes(entity)),
      },
    };
  });

  return changed ? next : previous;
}

/** Grupos comparados (2+ entidades, resolvidos) no formato que o Service grava com a configuração. */
export function buildComparisonsPayload(
  groups: WeightGroup[],
  comparisons: Record<string, GroupComparison>
): AHPGroupComparison[] {
  return groups
    .filter(group => group.entities.length > 1)
    .flatMap(group => {
      const entities = group.entities.map(entity => entity.key);
      const comparison = comparisons[group.path];
      const status = groupStatus(entities, comparison);
      if (status !== 'done' && status !== 'accepted') return [];

      return [{
        group_path: group.path,
        entities,
        answers: buildAnswers(entities, comparison!.answers)!,
        accepted_inconsistent: status === 'accepted',
      }];
    });
}
