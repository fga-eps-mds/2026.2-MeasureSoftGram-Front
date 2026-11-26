import React from 'react';
import { Accordion, AccordionSummary, Box, Checkbox, FormControlLabel, Switch, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Characteristic, PreConfigData, Subcharacteristic } from '@customTypes/preConfig';
import { DASHBOARD_COLORS } from '@utils/dashboardColors';
import SectionTooltip from '../SectionTooltip/SectionTooltip';

interface EntitySelectionFormProps {
  configPageData: PreConfigData;
  setConfigPageData: React.Dispatch<React.SetStateAction<PreConfigData | undefined>>;
  changeRefValue: boolean;
  setChangeRefValue: (value: boolean) => void;
}

const accordionSx = {
  boxShadow: 'inherit',
  border: 0.5,
  backgroundColor: 'transparent',
  borderColor: '#00000040',
  borderRadius: 3,
  marginTop: 2,
};

const groupLabelSx = { color: DASHBOARD_COLORS.mutedText, fontSize: 12, mb: 0.5 };

/**
 * "Definir entidades": só a seleção. Cada conjunto de irmãos marcados vira um
 * grupo de pesos na etapa seguinte.
 */
export default function EntitySelectionForm({ configPageData, setConfigPageData, changeRefValue, setChangeRefValue }: EntitySelectionFormProps) {
  const { t } = useTranslation('plan_release');

  const updateCharacteristic = (characteristicKey: string, update: (c: Characteristic) => Characteristic) => {
    setConfigPageData(prev => prev && ({
      ...prev,
      characteristics: prev.characteristics.map(c => (c.key === characteristicKey ? update(c) : c)),
    }));
  };

  const updateSubcharacteristic = (characteristicKey: string, subKey: string, update: (s: Subcharacteristic) => Subcharacteristic) => {
    updateCharacteristic(characteristicKey, c => ({
      ...c,
      subcharacteristics: c.subcharacteristics.map(s => (s.key === subKey ? update(s) : s)),
    }));
  };

  const toggleCharacteristic = (characteristicKey: string, active: boolean) =>
    updateCharacteristic(characteristicKey, c => ({ ...c, active }));

  const toggleSubcharacteristic = (characteristicKey: string, subKey: string, active: boolean) =>
    updateSubcharacteristic(characteristicKey, subKey, s => ({ ...s, active }));

  const toggleMeasure = (characteristicKey: string, subKey: string, measureKey: string, active: boolean) =>
    updateSubcharacteristic(characteristicKey, subKey, s => ({
      ...s,
      measures: s.measures.map(m => (m.key === measureKey ? { ...m, active } : m)),
    }));

  const renderCheckbox = (id: string, label: string, checked: boolean | undefined, onChange: (value: boolean) => void) => (
    <FormControlLabel
      key={id}
      sx={{ display: 'flex' }}
      control={<Checkbox checked={!!checked} onChange={event => onChange(event.target.checked)} />}
      label={<Typography>{label}</Typography>}
    />
  );

  const activeCharacteristics = configPageData?.characteristics?.filter(c => c.active) ?? [];

  return (
    <>
      <SectionTooltip id="characteristicSection" text={t('defineUsedCharacteristics')} tooltip={t('defineCharacteristicsTooltip')} />
      <Accordion defaultExpanded square sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>{t('characteristic')}</Typography>
        </AccordionSummary>
        <Box sx={{ px: 2, pb: 2 }}>
          {configPageData?.characteristics?.map(c =>
            renderCheckbox(c.key, t(`characteristics.${c.key}`), c.active, value => toggleCharacteristic(c.key, value))
          )}
        </Box>
      </Accordion>

      <SectionTooltip id="subcharacteristicSection" text={t('defineUsedSubCharacteristics')} tooltip={t('defineSubCharacteristicsTooltip')} />
      <Accordion defaultExpanded square sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>{t('subCharacteristic')}</Typography>
        </AccordionSummary>
        <Box sx={{ px: 2, pb: 2, display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {activeCharacteristics.map(c => (
            <Box key={`sub-group-${c.key}`} id={`SubCarAccordion-${c.key}`}>
              <Typography sx={groupLabelSx}>{t(`characteristics.${c.key}`)}</Typography>
              {c.subcharacteristics.map(s =>
                renderCheckbox(s.key, t(`subCharacteristics.${s.key}`), s.active, value => toggleSubcharacteristic(c.key, s.key, value))
              )}
            </Box>
          ))}
        </Box>
      </Accordion>

      <SectionTooltip id="medidasSection" text={t('defineUsedMeasures')} tooltip={t('defineMeasuresTooltip')} />
      <FormControlLabel
        sx={{ marginLeft: 0 }}
        control={<Switch checked={changeRefValue} onChange={() => setChangeRefValue(!changeRefValue)} color="primary" />}
        label={t('changeRefValues')}
        labelPlacement="start"
      />
      <Accordion square sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>{t('measure')}</Typography>
        </AccordionSummary>
        <Box sx={{ px: 2, pb: 2 }}>
          {activeCharacteristics.flatMap(c =>
            c.subcharacteristics.filter(s => s.active).map(s => (
              <Box key={`measure-group-${c.key}-${s.key}`} id={`MetricSubCarAccordion-${s.key}`} sx={{ mb: 2 }}>
                <Typography sx={groupLabelSx}>
                  {t(`characteristics.${c.key}`)} › {t(`subCharacteristics.${s.key}`)}
                </Typography>
                {s.measures.map(m =>
                  renderCheckbox(m.key, t(`measures.${m.key}`), m.active, value => toggleMeasure(c.key, s.key, m.key, value))
                )}
              </Box>
            ))
          )}
        </Box>
      </Accordion>
    </>
  );
}
