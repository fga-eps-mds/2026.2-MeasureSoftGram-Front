import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PreConfigData } from '@customTypes/preConfig';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import MSGAlert from '../../../../../../../../components/idv/feedback/MSGAlert';
import AHPPairQuestion from '../AHPPairQuestion/AHPPairQuestion';
import GroupChips from '../GroupChips/GroupChips';
import GroupPreview, { ConsistencyInfo, PreviewRow } from '../GroupPreview/GroupPreview';
import { AhpComparison } from '../../hooks/useAhpComparison';
import { WeightGroup, weightsInConfig } from '../../utils/weightGroups';
import { entityName, groupTitle } from '../../utils/groupLabels';
import { buildAnswers, countAnswered, displayedCR, findPreferenceCycle, pairKey, pairsOf } from '../../utils/ahp';

interface PairwiseComparisonStepProps {
  ahp: AhpComparison;
  /** Pesos do "Antes" na prévia (decisão da US13.01: o modelo padrão). */
  baselineConfig?: PreConfigData;
}

/** Telas 04 a 07: comparação por pares, um grupo de cada vez. */
export default function PairwiseComparisonStep({ ahp, baselineConfig }: PairwiseComparisonStepProps) {
  const { t } = useTranslation('plan_release');
  const group = ahp.currentGroup;
  if (!group) return null;

  const groupIndex = ahp.groups.findIndex(item => item.path === group.path);
  const entities = group.entities.map(entity => entity.key);
  const nameOf = (key: string) => entityName(group, key, t);
  const comparison = ahp.comparisons[group.path];
  const pairs = pairsOf(entities);
  const answered = countAnswered(entities, comparison?.answers ?? {});
  const status = ahp.statusOf(group);
  const before = weightsInConfig(baselineConfig, group);

  const previewRows = (weights: Record<string, number>): PreviewRow[] =>
    entities.map(key => ({ key, name: nameOf(key), before: before[key], after: weights[key] ?? 0 }));

  const answers = buildAnswers(entities, comparison?.answers ?? {});
  const cycle = answers && status !== 'done' ? findPreferenceCycle(entities, answers) : null;
  const cyclePairs = new Set(
    (cycle ?? []).slice(0, -1).flatMap((from, index) => [pairKey(from, cycle![index + 1]), pairKey(cycle![index + 1], from)])
  );

  const scrollToFirstPair = () => {
    const [a, b] = pairs.find(([x, y]) => cyclePairs.has(pairKey(x, y))) ?? pairs[0];
    document.querySelector(`[data-testid="pair-${a}-${b}"]`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  };

  const consistency = (): ConsistencyInfo | undefined => {
    if (!comparison?.preview || (status !== 'done' && status !== 'accepted' && status !== 'inconsistent')) return undefined;
    return {
      status,
      cr: displayedCR(comparison.preview),
      threshold: comparison.preview.cr_threshold ?? ahp.crThreshold,
      // ">" sem escapar: o React já escapa o texto na tela.
      explanation: cycle ? t('consistencyCycle', { cycle: cycle.map(nameOf).join(' > '), interpolation: { escapeValue: false } }) : undefined,
    };
  };

  const subtitle = group.entities.length === 1
    ? t('groupSubtitleNone', { entities: nameOf(entities[0]) })
    : t(pairs.length === 1 ? 'groupSubtitleOne' : 'groupSubtitleOther', {
      entities: entities.map(nameOf).join(', '),
      count: pairs.length,
    });

  const renderStaleNotice = () => {
    const stale = comparison?.stale;
    if (!stale || status !== 'stale') return null;
    const names = (keys: string[]) => keys.map(nameOf).join(', ');
    const changes = [
      stale.removed.length > 0 ? t('groupChangedRemoved', { names: names(stale.removed), count: stale.removed.length }) : null,
      stale.added.length > 0 ? t('groupChangedAdded', { names: names(stale.added), count: stale.added.length }) : null,
    ].filter(Boolean).join(' ');

    return (
      <Box sx={{ mb: 2 }} data-testid="group-changed">
        <MSGAlert severity="warning" title={t('groupChangedTitle')}>{`${changes} ${t('groupChangedAnswerAgain')}`}</MSGAlert>
      </Box>
    );
  };

  const renderComparableGroup = () => (
    <>
      {renderStaleNotice()}
      {pairs.map(([a, b]) => (
        <AHPPairQuestion
          key={pairKey(a, b)}
          a={a}
          b={b}
          aLabel={nameOf(a)}
          bLabel={nameOf(b)}
          value={comparison?.answers[pairKey(a, b)]}
          intensities={ahp.intensities}
          highlighted={status === 'inconsistent' && cyclePairs.has(pairKey(a, b))}
          onChange={choice => ahp.setPairChoice(group, a, b, choice)}
        />
      ))}

      {comparison?.error && (
        <MSGAlert severity="error" title={t('previewError')}>{comparison.error}</MSGAlert>
      )}

      {!comparison?.error && answered < pairs.length && (
        <Box sx={{ border: `1px dashed ${DASHBOARD_COLORS.cardBorder}`, borderRadius: 2, p: 2, color: DASHBOARD_COLORS.mutedText }}>
          <Typography variant="body2">{t('previewPending', { answered, total: pairs.length })}</Typography>
        </Box>
      )}

      {comparison?.loading && (
        <Box display="flex" justifyContent="center" sx={{ py: 2 }}><CircularProgress size={24} aria-label={t('previewTitle')} /></Box>
      )}

      {!comparison?.loading && status !== 'pending' && comparison?.preview && (
        <GroupPreview
          rows={previewRows(comparison.preview.weights)}
          consistency={consistency()}
          onReview={scrollToFirstPair}
          onAccept={() => ahp.acceptGroup(group)}
        />
      )}
    </>
  );

  const renderSingleEntityGroup = () => (
    <>
      <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.text }}>
        {t('singleEntityGroup', { name: nameOf(entities[0]) })}
      </Typography>
      <GroupPreview rows={previewRows({ [entities[0]]: 100 })} />
    </>
  );

  return (
    <>
      <GroupChips
        groups={ahp.groups}
        currentPath={group.path}
        statusOf={ahp.statusOf}
        titleOf={(item: WeightGroup) => groupTitle(item, t)}
        onSelect={item => ahp.goToGroup(item.path)}
      />
      <Box sx={{ border: `1px solid ${DASHBOARD_COLORS.gridLine}`, borderRadius: 2, p: 2.5, bgcolor: 'background.paper' }}>
        <Typography variant="caption" sx={{ color: DASHBOARD_COLORS.mutedText }}>
          {t('groupProgress', { index: groupIndex + 1, total: ahp.groups.length })}
        </Typography>
        <Typography component="h2" sx={{ color: DASHBOARD_COLORS.primary, fontSize: 22, fontWeight: 500 }}>
          {groupTitle(group, t)}
        </Typography>
        <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, mb: 2 }}>{subtitle}</Typography>
        {group.entities.length === 1 ? renderSingleEntityGroup() : renderComparableGroup()}
      </Box>
    </>
  );
}
