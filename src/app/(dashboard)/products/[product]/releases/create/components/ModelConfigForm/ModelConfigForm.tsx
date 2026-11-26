import React from 'react';
import { Accordion, AccordionSummary, Box, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Characteristic, PreConfigData, Subcharacteristic } from '@customTypes/preConfig';
import MSGAlert from '../../../../../../../../components/idv/feedback';
import SectionTooltip from '../SectionTooltip/SectionTooltip';
import CheckboxSliderInput from '../CheckboxSliderInput/CheckboxSliderInput';
import { InvalidGroup, findInvalidGroups } from '../../utils/weightGroups';
import { sumErrorMessage } from '../../utils/groupLabels';

interface ModelConfigFormProps {
  configPageData: PreConfigData;
  setConfigPageData: React.Dispatch<React.SetStateAction<PreConfigData | undefined>>;
}

const accordionSx = {
  boxShadow: 'inherit',
  border: 0.5,
  backgroundColor: 'transparent',
  borderColor: '#00000040',
  borderRadius: 3,
  marginTop: 2,
};

const nestedAccordionSx = { ...accordionSx, marginTop: 0, margin: '0 1rem 1rem !important' };

function readWeight(event: React.ChangeEvent<HTMLInputElement>, sliderValue: number): number {
  const value = event?.target?.type === 'number' ? Number(event.target.value) : Number(sliderValue);
  return Number.isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100);
}

/**
 * "Definir pesos" quantitativo: porcentagens das entidades escolhidas em
 * "Definir entidades". A soma de cada grupo não é limitada aqui; se for
 * diferente de 100, o grupo mostra a mensagem de erro e o Avançar fica bloqueado.
 */
export default function ModelConfigForm({ configPageData, setConfigPageData }: ModelConfigFormProps) {
  const { t } = useTranslation('plan_release');

  const invalidGroups = findInvalidGroups(configPageData);
  const errorFor = (path: string): InvalidGroup | undefined => invalidGroups.find(item => item.group.path === path);

  const renderError = (path: string) => {
    const invalid = errorFor(path);
    if (!invalid) return null;
    const { title, body } = sumErrorMessage(invalid.group, invalid.sum, t);
    return (
      <Box sx={{ my: 1.5 }} data-testid={`sum-error-${path}`}>
        <MSGAlert severity="error" title={title}>{body}</MSGAlert>
      </Box>
    );
  };

  function updateCharacteristic(characteristicKey: string, update: (c: Characteristic) => Characteristic) {
    setConfigPageData(prev => prev && ({
      ...prev,
      characteristics: prev.characteristics.map(c => (c.key === characteristicKey ? update(c) : c)),
    }));
  }

  function updateSubcharacteristic(characteristicKey: string, subKey: string, update: (s: Subcharacteristic) => Subcharacteristic) {
    updateCharacteristic(characteristicKey, c => ({
      ...c,
      subcharacteristics: c.subcharacteristics.map(s => (s.key === subKey ? update(s) : s)),
    }));
  }

  function handleCharacteristicChange(event: React.ChangeEvent<HTMLInputElement>, value: number, characteristicKey: string) {
    const weight = readWeight(event, value);
    updateCharacteristic(characteristicKey, c => ({ ...c, weight }));
  }

  function handleSubcharacteristicChange(event: React.ChangeEvent<HTMLInputElement>, value: number, characteristicKey: string, subKey: string) {
    const weight = readWeight(event, value);
    updateSubcharacteristic(characteristicKey, subKey, s => ({ ...s, weight }));
  }

  function handleMeasureChange(event: React.ChangeEvent<HTMLInputElement>, value: number, characteristicKey: string, subKey: string, measureKey: string) {
    const weight = readWeight(event, value);
    updateSubcharacteristic(characteristicKey, subKey, s => ({
      ...s,
      measures: s.measures.map(m => (m.key === measureKey ? { ...m, weight } : m)),
    }));
  }

  const activeCharacteristics = configPageData?.characteristics?.filter(c => c.active) ?? [];

  return (
    <>
      <SectionTooltip id="characteristicSection" text={t('defineCharacteristics')} tooltip={t('defineCharacteristicsTooltip')} />
      {renderError('characteristics')}
      <Accordion defaultExpanded square sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>{t('characteristic')}</Typography>
        </AccordionSummary>
        {activeCharacteristics.map(c => (
          <CheckboxSliderInput
            key={`characteristic-${c.key}`}
            label={t(`characteristics.${c.key}`)}
            labelKey={c.key}
            inputValue={c.weight}
            setInputValue={handleCharacteristicChange}
            checkboxValue={c.active}
            showCheckbox={false}
          />
        ))}
      </Accordion>

      <SectionTooltip id="subcharacteristicSection" text={t('defineSubCharacteristics')} tooltip={t('defineSubCharacteristicsTooltip')} />
      <Accordion defaultExpanded square sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>{t('subCharacteristic')}</Typography>
        </AccordionSummary>
        {activeCharacteristics.map(c => (
          <Accordion defaultExpanded id={`SubCarAccordion-${c.key}`} key={`SubCarAccordion-${c.key}`} square sx={nestedAccordionSx}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t(`characteristics.${c.key}`)}</Typography>
            </AccordionSummary>
            <Box sx={{ px: 2 }}>{renderError(`${c.key}/subcharacteristics`)}</Box>
            {c.subcharacteristics.filter(s => s.active).map(s => (
              <CheckboxSliderInput
                key={`subcharacteristics-${c.key}-${s.key}`}
                label={t(`subCharacteristics.${s.key}`)}
                labelKey={s.key}
                secLabel={c.key}
                inputValue={s.weight}
                setInputValue={handleSubcharacteristicChange}
                checkboxValue={s.active}
                showCheckbox={false}
              />
            ))}
          </Accordion>
        ))}
      </Accordion>

      <SectionTooltip id="medidasSection" text={t('defineMeasures')} tooltip={t('defineMeasuresTooltip')} />
      <Accordion defaultExpanded square sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>{t('measure')}</Typography>
        </AccordionSummary>
        {activeCharacteristics.map(c => (
          <Accordion defaultExpanded key={`MeasureCarAccordion-${c.key}`} square sx={nestedAccordionSx}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{t(`characteristics.${c.key}`)}</Typography>
            </AccordionSummary>
            {c.subcharacteristics.filter(s => s.active).map(s => (
              <Accordion
                defaultExpanded
                id={`MetricSubCarAccordion-${s.key}`}
                key={`MetricSubCarAccordion-${s.key}`}
                square
                sx={nestedAccordionSx}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>{t(`subCharacteristics.${s.key}`)}</Typography>
                </AccordionSummary>
                <Box sx={{ px: 2 }}>{renderError(`${c.key}/${s.key}/measures`)}</Box>
                {s.measures.filter(m => m.active).map(m => (
                  <CheckboxSliderInput
                    key={`metric-${m.key}-${s.key}-${c.key}`}
                    label={t(`measures.${m.key}`)}
                    labelKey={m.key}
                    secLabel={s.key}
                    terLabel={c.key}
                    inputValue={m.weight}
                    setInputValue={handleMeasureChange}
                    checkboxValue={m.active}
                    showCheckbox={false}
                  />
                ))}
              </Accordion>
            ))}
          </Accordion>
        ))}
      </Accordion>
    </>
  );
}
