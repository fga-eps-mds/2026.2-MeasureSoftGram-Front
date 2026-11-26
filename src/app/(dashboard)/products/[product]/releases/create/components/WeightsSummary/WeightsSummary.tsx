import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PreConfigData } from '@customTypes/preConfig';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import SectionTooltip from '../SectionTooltip/SectionTooltip';
import { WeightGroup, buildWeightGroups } from '../../utils/weightGroups';
import { entityName, groupTitle } from '../../utils/groupLabels';
import { WeightMethod } from '../../weightsFlow';

interface WeightsSummaryProps {
  configPageData: PreConfigData;
  method: WeightMethod;
  onEdit: (group: WeightGroup) => void;
}

function Badge({ children }: { children: React.ReactNode }) {
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
        bgcolor: DASHBOARD_COLORS.gridLine,
        color: DASHBOARD_COLORS.mutedText,
      }}
    >
      {children}
    </Box>
  );
}

/** Tela 10/10q: um grupo por linha, com os pesos e como cada grupo foi definido. */
export default function WeightsSummary({ configPageData, method, onEdit }: WeightsSummaryProps) {
  const { t } = useTranslation('plan_release');
  const groups = buildWeightGroups(configPageData);

  const badgeFor = (group: WeightGroup): string =>
    group.entities.length === 1 ? t('badgeSingleWeight') : t(method === 'typed' ? 'badgeQuantitative' : 'badgeQualitative');

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
                <Badge>{badgeFor(group)}</Badge>
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
