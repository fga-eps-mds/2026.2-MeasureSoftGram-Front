import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { WeightGroup } from '../../utils/weightGroups';
import { GroupStatus, isGroupDone } from '../../utils/ahp';

interface GroupChipsProps {
  groups: WeightGroup[];
  currentPath?: string;
  statusOf: (group: WeightGroup) => GroupStatus;
  titleOf: (group: WeightGroup) => string;
  onSelect: (group: WeightGroup) => void;
}

const WARNING = { background: 'rgba(223, 142, 22, 0.15)', text: '#C07910' };

type ChipTone = 'current' | 'done' | 'attention' | 'single' | 'pending';

function toneOf(status: GroupStatus, isCurrent: boolean): ChipTone {
  if (isCurrent) return 'current';
  if (status === 'accepted' || status === 'inconsistent') return 'attention';
  if (status === 'single') return 'single';
  if (isGroupDone(status)) return 'done';
  return 'pending';
}

const TONE_SX: Record<ChipTone, object> = {
  current: { bgcolor: DASHBOARD_COLORS.primary, color: '#fff', border: `1px solid ${DASHBOARD_COLORS.primary}` },
  done: { bgcolor: DASHBOARD_COLORS.infoBackground, color: DASHBOARD_COLORS.primary, border: `1px solid ${DASHBOARD_COLORS.infoBackground}` },
  attention: { bgcolor: WARNING.background, color: WARNING.text, border: `1px solid ${WARNING.background}` },
  single: { bgcolor: 'transparent', color: DASHBOARD_COLORS.mutedText, border: `1px solid ${DASHBOARD_COLORS.gridLine}`, opacity: 0.75 },
  pending: { bgcolor: 'background.paper', color: DASHBOARD_COLORS.text, border: `1px solid ${DASHBOARD_COLORS.cardBorder}` },
};

/** Lista de grupos no topo da comparação: atual, concluído (✓), atenção (laranja), peso único. */
export default function GroupChips({ groups, currentPath, statusOf, titleOf, onSelect }: GroupChipsProps) {
  return (
    <Box component="nav" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
      {groups.map((group, index) => {
        const status = statusOf(group);
        const isCurrent = group.path === currentPath;
        const tone = toneOf(status, isCurrent);
        const done = !isCurrent && status === 'done';

        return (
          <ButtonBase
            key={group.path}
            data-testid={`group-chip-${group.path}`}
            data-tone={tone}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => onSelect(group)}
            sx={{ borderRadius: 4, px: 1.5, py: 0.5, fontSize: 13, ...TONE_SX[tone] }}
          >
            {done ? '✓ ' : ''}{index + 1}. {titleOf(group)}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
