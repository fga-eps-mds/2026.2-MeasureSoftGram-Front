import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PreConfigData } from '@customTypes/preConfig';
import { SaatyIntensity } from '@customTypes/ahp';
import { ahpService } from '@services/ahp';
import { WeightGroup, applyGroupWeights, buildWeightGroups } from '../utils/weightGroups';
import {
  DEFAULT_CR_THRESHOLD,
  DEFAULT_INTENSITIES,
  GroupComparison,
  GroupStatus,
  PairChoice,
  answersKey,
  buildAnswers,
  groupStatus,
  isGroupDone,
  pairKey,
} from '../utils/ahp';

interface UseAhpComparisonParams {
  organizationId: string;
  productId: string;
  configPageData?: PreConfigData;
  setConfigPageData: React.Dispatch<React.SetStateAction<PreConfigData | undefined>>;
  enabled: boolean;
}

export type GroupMove = 'moved' | 'leave' | 'blocked';

const emptyComparison = (): GroupComparison => ({ answers: {}, accepted: false, loading: false });

function errorDetail(error: any): string {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.join(' ');
  return detail ?? error?.message ?? String(error);
}

/**
 * Estado da comparação por pares: respostas por grupo, prévia (POST ahp/calculate/)
 * e navegação entre os grupos. O Front não calcula pesos nem CR.
 */
export function useAhpComparison({ organizationId, productId, configPageData, setConfigPageData, enabled }: UseAhpComparisonParams) {
  const [comparisons, setComparisons] = useState<Record<string, GroupComparison>>({});
  const [currentPath, setCurrentPath] = useState<string>();
  const [intensities, setIntensities] = useState<SaatyIntensity[]>(DEFAULT_INTENSITIES);
  const [crThreshold, setCrThreshold] = useState(DEFAULT_CR_THRESHOLD);
  const latestRequest = useRef<Record<string, string>>({});

  const groups = useMemo(() => (configPageData ? buildWeightGroups(configPageData) : []), [configPageData]);
  const comparableGroups = useMemo(() => groups.filter(group => group.entities.length > 1), [groups]);
  const currentGroup = groups.find(group => group.path === currentPath) ?? groups[0];

  useEffect(() => {
    if (!enabled || !organizationId || !productId) return;
    ahpService.getScale(organizationId, productId)
      ?.then(response => {
        const scale = response?.data;
        if (!scale?.scale) return;
        const ordered = (Object.keys(scale.scale) as SaatyIntensity[])
          .filter(key => key !== 'igual')
          .sort((x, y) => scale.scale[x] - scale.scale[y]);
        setIntensities(ordered);
        setCrThreshold(scale.cr_threshold);
      })
      .catch(() => undefined);
  }, [enabled, organizationId, productId]);

  const statusOf = useCallback(
    (group: WeightGroup): GroupStatus => groupStatus(group.entities.map(entity => entity.key), comparisons[group.path]),
    [comparisons]
  );

  const requestPreview = useCallback((group: WeightGroup, answersMap: Record<string, PairChoice>) => {
    const entities = group.entities.map(entity => entity.key);
    const answers = buildAnswers(entities, answersMap);
    if (!answers) return;

    const key = answersKey(answers);
    latestRequest.current[group.path] = key;

    ahpService.calculateGroup(organizationId, productId, { entities, answers })
      .then(response => {
        if (latestRequest.current[group.path] !== key) return;
        const preview = response.data;
        setComparisons(prev => ({
          ...prev,
          [group.path]: { ...(prev[group.path] ?? emptyComparison()), preview, previewKey: key, loading: false, error: undefined },
        }));
        setConfigPageData(prev => prev && applyGroupWeights(prev, group, preview.weights));
      })
      .catch(error => {
        if (latestRequest.current[group.path] !== key) return;
        setComparisons(prev => ({
          ...prev,
          [group.path]: { ...(prev[group.path] ?? emptyComparison()), loading: false, error: errorDetail(error) },
        }));
      });
  }, [organizationId, productId, setConfigPageData]);

  const setPairChoice = useCallback((group: WeightGroup, a: string, b: string, choice: PairChoice) => {
    const current = comparisons[group.path] ?? emptyComparison();
    const answers = { ...current.answers, [pairKey(a, b)]: choice };
    const entities = group.entities.map(entity => entity.key);
    const complete = !!buildAnswers(entities, answers);

    setComparisons(prev => ({
      ...prev,
      [group.path]: { ...current, answers, accepted: false, loading: complete, error: undefined },
    }));

    if (complete) requestPreview(group, answers);
  }, [comparisons, requestPreview]);

  const acceptGroup = useCallback((group: WeightGroup) => {
    setComparisons(prev => ({ ...prev, [group.path]: { ...(prev[group.path] ?? emptyComparison()), accepted: true } }));
  }, []);

  /** Ao entrar na tela de comparação: o primeiro grupo indo em frente, o último voltando. */
  const enter = useCallback((direction: 'forward' | 'back') => {
    const candidates = comparableGroups.length > 0 ? comparableGroups : groups;
    const target = direction === 'forward' ? candidates[0] : candidates[candidates.length - 1];
    setCurrentPath(target?.path);
  }, [comparableGroups, groups]);

  const goToGroup = useCallback((path: string) => setCurrentPath(path), []);

  const firstPendingGroup = useCallback(
    () => comparableGroups.find(group => !isGroupDone(statusOf(group))),
    [comparableGroups, statusOf]
  );

  const nextComparableAfter = (group?: WeightGroup) => {
    const index = groups.findIndex(item => item.path === group?.path);
    return groups.slice(index + 1).find(item => item.entities.length > 1);
  };

  const canAdvance = !!currentGroup && isGroupDone(statusOf(currentGroup));
  const isLastGroup = !nextComparableAfter(currentGroup) && !firstPendingGroup();

  /** "Próximo grupo": pula os grupos de uma entidade; sai da tela quando todos estão definidos. */
  const next = (): GroupMove => {
    if (!canAdvance) return 'blocked';
    const following = nextComparableAfter(currentGroup) ?? firstPendingGroup();
    if (following) {
      setCurrentPath(following.path);
      return 'moved';
    }
    return 'leave';
  };

  const previous = (): GroupMove => {
    const index = groups.findIndex(item => item.path === currentGroup?.path);
    const before = groups.slice(0, Math.max(index, 0)).reverse().find(item => item.entities.length > 1);
    if (before) {
      setCurrentPath(before.path);
      return 'moved';
    }
    return 'leave';
  };

  return {
    groups,
    currentGroup,
    comparisons,
    intensities,
    crThreshold,
    statusOf,
    setPairChoice,
    acceptGroup,
    enter,
    goToGroup,
    next,
    previous,
    canAdvance,
    isLastGroup,
  };
}

export type AhpComparison = ReturnType<typeof useAhpComparison>;
