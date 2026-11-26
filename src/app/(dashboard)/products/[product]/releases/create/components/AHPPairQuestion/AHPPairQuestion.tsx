import React from 'react';
import { Box, FormControl, FormControlLabel, MenuItem, Radio, RadioGroup, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SaatyIntensity } from '@customTypes/ahp';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import { PairChoice, isPairAnswered } from '../../utils/ahp';

/** Borda de aviso do guia de IDV (MSGAlert warning), para o par em conflito. */
const MSG_WARNING = '#DF8E16';

interface AHPPairQuestionProps {
  a: string;
  b: string;
  aLabel: string;
  bLabel: string;
  value?: PairChoice;
  intensities: SaatyIntensity[];
  onChange: (value: PairChoice) => void;
  highlighted?: boolean;
}

/**
 * Um par da comparação (componente "AHP · Par de comparação" do protótipo):
 * qual é mais importante e, se não for "igualmente", quanto mais.
 */
export default function AHPPairQuestion({ a, b, aLabel, bLabel, value, intensities, onChange, highlighted = false }: AHPPairQuestionProps) {
  const { t } = useTranslation('plan_release');
  const answered = isPairAnswered(value);
  const choice = value?.choice ?? '';
  const questionId = `pair-${a}-${b}`;

  const handleChoice = (next: 'a' | 'b' | 'equal') =>
    // Ao trocar de lado ou sair de "igualmente", a intensidade fica em branco até ser escolhida.
    onChange(next === 'equal' ? { choice: 'equal' } : { choice: next, intensity: next === value?.choice ? value?.intensity : undefined });

  return (
    <Box
      data-testid={questionId}
      sx={{
        border: `1px solid ${highlighted ? MSG_WARNING : DASHBOARD_COLORS.gridLine}`,
        borderRadius: 2,
        p: 2,
        mb: 1.5,
        bgcolor: 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography sx={{ color: DASHBOARD_COLORS.primary, fontWeight: 500 }}>
          {aLabel} <Box component="span" sx={{ color: DASHBOARD_COLORS.mutedText, mx: 0.5 }}>×</Box> {bLabel}
        </Typography>
        <Box
          component="span"
          sx={{
            fontSize: 12,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: answered ? DASHBOARD_COLORS.infoBackground : DASHBOARD_COLORS.gridLine,
            color: answered ? DASHBOARD_COLORS.primary : DASHBOARD_COLORS.mutedText,
          }}
        >
          {answered ? t('answered') : t('unanswered')}
        </Box>
      </Box>

      <Typography id={`${questionId}-label`} variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, mt: 1 }}>
        {t('whichMoreImportant')}
      </Typography>
      <RadioGroup
        row
        aria-labelledby={`${questionId}-label`}
        value={choice}
        onChange={event => handleChoice(event.target.value as 'a' | 'b' | 'equal')}
      >
        <FormControlLabel value="a" control={<Radio size="small" />} label={aLabel} />
        <FormControlLabel value="b" control={<Radio size="small" />} label={bLabel} />
        <FormControlLabel value="equal" control={<Radio size="small" />} label={t('equallyImportant')} />
      </RadioGroup>

      {(value?.choice === 'a' || value?.choice === 'b') && (
        <Box display="flex" alignItems="center" gap={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
          <Typography id={`${questionId}-intensity`} variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText }}>
            {t('howMuchMore')}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <Select
              value={value.intensity ?? ''}
              displayEmpty
              inputProps={{ 'aria-labelledby': `${questionId}-intensity`, 'data-testid': `${questionId}-intensity-select` }}
              onChange={event => onChange({ choice: value.choice, intensity: event.target.value as SaatyIntensity })}
            >
              <MenuItem value="" disabled>{t('selectIntensity')}</MenuItem>
              {intensities.map(intensity => (
                <MenuItem key={intensity} value={intensity}>{t(`intensity.${intensity}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
}
