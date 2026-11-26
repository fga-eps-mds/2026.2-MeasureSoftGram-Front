import React, { useMemo, useState } from 'react';
import { Box, Button, Radio, Typography } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { PreConfigData, PreConfigMeta } from '@customTypes/preConfig';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import SectionTooltip from '../SectionTooltip/SectionTooltip';
import WeightsComparisonTable, { ComparisonHighlight } from '../WeightsComparisonTable/WeightsComparisonTable';
import { buildWeightComparisonRows, summarizeCharacteristics } from '../../utils/weightsComparison';
import { StartingPoint } from '../../steps';

interface StartingPointSelectorProps {
  value: StartingPoint;
  onChange: (value: StartingPoint) => void;
  lastConfigMeta?: PreConfigMeta;
  lastConfigData?: PreConfigData;
  defaultConfigData?: PreConfigData;
}

type BadgeTone = 'info' | 'neutral';

function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        mr: 1,
        borderRadius: 1,
        fontSize: 12,
        bgcolor: tone === 'info' ? DASHBOARD_COLORS.infoBackground : DASHBOARD_COLORS.gridLine,
        color: tone === 'info' ? DASHBOARD_COLORS.primary : DASHBOARD_COLORS.mutedText,
      }}
    >
      {children}
    </Box>
  );
}

interface OptionCardProps {
  option: StartingPoint;
  selected: boolean;
  title: string;
  onSelect: (value: StartingPoint) => void;
  children: React.ReactNode;
}

function OptionCard({ option, selected, title, onSelect, children }: OptionCardProps) {
  return (
    <Box
      component="label"
      data-testid={`starting-point-${option}`}
      sx={{
        display: 'block',
        cursor: 'pointer',
        borderRadius: 2,
        p: 2,
        mb: 1.5,
        border: selected ? `2px solid ${DASHBOARD_COLORS.primary}` : `1px solid ${DASHBOARD_COLORS.cardBorder}`,
        bgcolor: selected ? DASHBOARD_COLORS.infoBackground : 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" sx={{ ml: -1 }}>
        <Radio
          checked={selected}
          onChange={() => onSelect(option)}
          value={option}
          name="starting-point"
          size="small"
          inputProps={{ 'aria-label': title }}
        />
        <Typography sx={{ color: DASHBOARD_COLORS.primary, fontSize: 16, fontWeight: 500 }}>{title}</Typography>
      </Box>
      <Box sx={{ pl: 4 }}>{children}</Box>
    </Box>
  );
}

const formatDate = (value: string | Date, pattern: string) => format(new Date(value), pattern);

export default function StartingPointSelector({
  value,
  onChange,
  lastConfigMeta,
  lastConfigData,
  defaultConfigData,
}: StartingPointSelectorProps) {
  const { t } = useTranslation('plan_release');
  const [showComparison, setShowComparison] = useState(false);

  const hasLastConfig = !!lastConfigMeta && !!lastConfigData;
  const releaseName = lastConfigMeta?.release?.release_name;

  const comparisonRows = useMemo(
    () => (hasLastConfig && defaultConfigData ? buildWeightComparisonRows(lastConfigData!, defaultConfigData) : []),
    [hasLastConfig, lastConfigData, defaultConfigData]
  );

  const highlight: ComparisonHighlight = value === 'new' ? null : value;

  const renderLastConfigDetails = () => {
    const savedAt = formatDate(lastConfigMeta!.created_at, 'dd/MM/yyyy');
    const release = lastConfigMeta!.release;
    const details = [
      release ? t('lastConfigPeriod', { start: formatDate(release.start_at, 'dd/MM'), end: formatDate(release.end_at, 'dd/MM/yyyy') }) : null,
      lastConfigMeta!.created_by
        ? t('lastConfigSavedBy', { author: lastConfigMeta!.created_by, date: savedAt })
        : t('lastConfigSavedAt', { date: savedAt }),
    ].filter(Boolean).join(' · ');

    return (
      <>
        <Typography sx={{ fontWeight: 600, color: DASHBOARD_COLORS.text }}>
          {releaseName ?? t('lastConfigFallbackTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, my: 0.5 }}>{details}</Typography>
        <Badge tone={lastConfigMeta!.has_ahp ? 'info' : 'neutral'}>
          {lastConfigMeta!.has_ahp ? t('badgeQualitative') : t('badgeManual')}
        </Badge>
        <Typography variant="body2" sx={{ mt: 1, color: DASHBOARD_COLORS.text }}>
          {t('characteristicsSummary', { summary: summarizeCharacteristics(lastConfigData!, t) })}
        </Typography>
      </>
    );
  };

  return (
    <Box sx={{ mt: 1 }}>
      <SectionTooltip text={t('startingPoint')} tooltip={t('startingPointTooltip')} />
      <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, mb: 2 }}>
        {t('startingPointDescription')}
      </Typography>

      {hasLastConfig && (
        <OptionCard option="last" selected={value === 'last'} title={t('startingPointLast')} onSelect={onChange}>
          {renderLastConfigDetails()}
        </OptionCard>
      )}

      <OptionCard option="default" selected={value === 'default'} title={t('startingPointDefault')} onSelect={onChange}>
        <Typography sx={{ fontWeight: 600, color: DASHBOARD_COLORS.text }}>{t('defaultModelTitle')}</Typography>
        <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, my: 0.5 }}>{t('defaultModelDescription')}</Typography>
        <Badge tone="neutral">{t('badgeEqualWeights')}</Badge>
        {defaultConfigData && (
          <Typography variant="body2" sx={{ mt: 1, color: DASHBOARD_COLORS.text }}>
            {t('characteristicsSummary', { summary: summarizeCharacteristics(defaultConfigData, t) })}
          </Typography>
        )}
      </OptionCard>

      <OptionCard option="new" selected={value === 'new'} title={t('startingPointNew')} onSelect={onChange}>
        <Typography sx={{ fontWeight: 600, color: DASHBOARD_COLORS.text }}>{t('newWeightsTitle')}</Typography>
        <Typography variant="body2" sx={{ color: DASHBOARD_COLORS.mutedText, my: 0.5 }}>{t('newWeightsDescription')}</Typography>
        <Badge tone="neutral">{t('tagQualitative')}</Badge>
        <Badge tone="neutral">{t('tagQuantitative')}</Badge>
      </OptionCard>

      {comparisonRows.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Button
            onClick={() => setShowComparison(!showComparison)}
            endIcon={showComparison ? <ExpandLess /> : <ExpandMore />}
            sx={{ textTransform: 'none', px: 0, mb: 1 }}
          >
            {showComparison ? t('hideWeightsComparison') : t('showWeightsComparison')}
          </Button>
          {showComparison && (
            <WeightsComparisonTable
              rows={comparisonRows}
              highlight={highlight}
              lastColumnLabel={releaseName ? t('lastColumn', { name: releaseName }) : t('lastColumnFallback')}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
