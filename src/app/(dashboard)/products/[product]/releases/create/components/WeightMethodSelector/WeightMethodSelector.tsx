import React from 'react';
import { Box, Radio, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import SectionTooltip from '../SectionTooltip/SectionTooltip';
import { WeightMethod } from '../../weightsFlow';

interface WeightMethodSelectorProps {
  value: WeightMethod;
  onChange: (value: WeightMethod) => void;
  qualitativeEnabled?: boolean;
}

interface MethodCardProps {
  method: WeightMethod;
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  bullets: string[];
  onSelect: (value: WeightMethod) => void;
}

function MethodCard({ method, selected, disabled = false, title, description, bullets, onSelect }: MethodCardProps) {
  return (
    <Box
      component="label"
      data-testid={`weight-method-${method}`}
      sx={{
        display: 'block',
        flex: 1,
        borderRadius: 2,
        p: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        border: selected ? `2px solid ${DASHBOARD_COLORS.primary}` : `1px solid ${DASHBOARD_COLORS.cardBorder}`,
        bgcolor: selected ? DASHBOARD_COLORS.infoBackground : 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" sx={{ ml: -1 }}>
        <Radio
          checked={selected}
          disabled={disabled}
          onChange={() => onSelect(method)}
          value={method}
          name="weight-method"
          size="small"
          inputProps={{ 'aria-label': title }}
        />
        <Typography sx={{ fontWeight: 500, color: DASHBOARD_COLORS.text }}>{title}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.text, my: 1 }}>{description}</Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5, color: DASHBOARD_COLORS.mutedText }}>
        {bullets.map(bullet => (
          <Typography component="li" variant="body2" key={bullet} sx={{ mb: 0.5 }}>{bullet}</Typography>
        ))}
      </Box>
    </Box>
  );
}

/** Tela 02/02q: escolha entre qualitativa (AHP) e quantitativa. */
export default function WeightMethodSelector({ value, onChange, qualitativeEnabled = true }: WeightMethodSelectorProps) {
  const { t } = useTranslation('plan_release');

  return (
    <>
      <SectionTooltip text={t('defineWeights')} tooltip={t('weightMethodTooltip')} />
      <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, mb: 2 }}>
        {t('weightMethodDescription')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        <MethodCard
          method="ahp"
          selected={value === 'ahp'}
          disabled={!qualitativeEnabled}
          title={t('methodQualitative')}
          description={t('methodQualitativeDescription')}
          bullets={[t('methodQualitativeBullet1'), t('methodQualitativeBullet2'), t('methodQualitativeBullet3')]}
          onSelect={onChange}
        />
        <MethodCard
          method="typed"
          selected={value === 'typed'}
          title={t('methodQuantitative')}
          description={t('methodQuantitativeDescription')}
          bullets={[t('methodQuantitativeBullet1'), t('methodQuantitativeBullet2')]}
          onSelect={onChange}
        />
      </Box>
    </>
  );
}
