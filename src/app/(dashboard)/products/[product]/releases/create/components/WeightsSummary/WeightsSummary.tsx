import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PreConfigData } from '@customTypes/preConfig';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import SectionTooltip from '../SectionTooltip/SectionTooltip';
import { WeightGroup, buildWeightGroups } from '../../utils/weightGroups';
import { entityName, groupTitle } from '../../utils/groupLabels';
import { WeightMethod } from '../../weightsFlow';

export type BadgeTone = 'neutral' | 'info' | 'warning';

export interface GroupBadge {
  label: string;
  tone: BadgeTone;
}

interface WeightsSummaryProps {
  configPageData: PreConfigData;
  method: WeightMethod;
  onEdit: (group: WeightGroup) => void;
  /** Como o grupo foi definido; sem isso, usa "Peso único" ou o selo da forma escolhida. */
  describeGroup?: (group: WeightGroup) => GroupBadge | undefined;
}

const BADGE_COLORS: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: DASHBOARD_COLORS.gridLine, fg: DASHBOARD_COLORS.mutedText },
  info: { bg: DASHBOARD_COLORS.infoBackground, fg: DASHBOARD_COLORS.primary },
  warning: { bg: 'rgba(223, 142, 22, 0.15)', fg: '#C07910' },
};

function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        ml: 1,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: 12,
        bgcolor: BADGE_COLORS[tone].bg,
        color: BADGE_COLORS[tone].fg,
      }}
    >
      {children}
    </Box>
  );
}

/** Tela 10/10q: um grupo por linha, com os pesos e como cada grupo foi definido. */
export default function WeightsSummary({ configPageData, method, onEdit, describeGroup }: WeightsSummaryProps) {
  const { t } = useTranslation('plan_release');
  const groups = buildWeightGroups(configPageData);

  const badgeFor = (group: WeightGroup): GroupBadge => {
    const described = describeGroup?.(group);
    if (described) return described;
    if (group.entities.length === 1) return { label: t('badgeSingleWeight'), tone: 'neutral' };
    return method === 'typed'
      ? { label: t('badgeQuantitative'), tone: 'neutral' }
      : { label: t('badgeQualitative'), tone: 'info' };
  };

  return (
    <>
      <SectionTooltip text={t('summaryTitle')} tooltip={t('summaryTooltip')} />
      <Box sx={{ border: `1px solid ${DASHBOARD_COLORS.gridLine}`, borderRadius: 2, bgcolor: 'background.paper', px: 2 }}>
        {groups.map((group, index) => (
          <Box
            key={group.path}
            data-testid={`summary-group-${group.path}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              py: 1.5,
              borderTop: index === 0 ? 'none' : `1px solid ${DASHBOARD_COLORS.gridLine}`,
            }}
          >
            <Box flex={1} minWidth={0}>
              <Typography sx={{ color: DASHBOARD_COLORS.primary, fontWeight: 500 }}>
                {index + 1}. {groupTitle(group, t)}
                <Badge tone={badgeFor(group).tone}>{badgeFor(group).label}</Badge>
              </Typography>
              <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, mt: 0.5 }}>
                {group.entities.map(entity => `${entityName(group, entity.key, t)} ${entity.weight}`).join(' · ')}
              </Typography>
            </Box>
            <Button size="small" onClick={() => onEdit(group)} aria-label={`${t('edit')} ${groupTitle(group, t)}`}>
              {t('edit')}
            </Button>
          </Box>
        ))}
      </Box>
    </>
  );
}
