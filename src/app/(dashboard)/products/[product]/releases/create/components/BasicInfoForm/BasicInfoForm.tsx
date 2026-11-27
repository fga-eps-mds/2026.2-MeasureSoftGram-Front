import React from 'react';
import { Box, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FieldErrors, UseFormRegister, UseFormTrigger, UseFormWatch } from 'react-hook-form';
import { PreConfigData, PreConfigMeta, ReleaseInfoForm } from '@customTypes/preConfig';
import SectionTooltip from '../SectionTooltip/SectionTooltip';
import StartingPointSelector from '../StartingPointSelector/StartingPointSelector';
import { StartingPoint } from '../../steps';

interface BasicInfoFormProps {
  register: UseFormRegister<ReleaseInfoForm>;
  errors: FieldErrors<ReleaseInfoForm>;
  watch: UseFormWatch<ReleaseInfoForm>;
  trigger: UseFormTrigger<ReleaseInfoForm>;
  startingPoint: StartingPoint;
  setStartingPoint: (value: StartingPoint) => void;
  lastConfigMeta?: PreConfigMeta;
  lastConfigData?: PreConfigData;
  defaultConfigData?: PreConfigData;
}

export default function BasicInfoForm({
  register,
  errors,
  watch,
  startingPoint,
  setStartingPoint,
  lastConfigMeta,
  lastConfigData,
  defaultConfigData,
}: BasicInfoFormProps) {
  const { t } = useTranslation('plan_release');

  return <>
    <SectionTooltip text={t('basicConfig')} tooltip={t('basicConfigTooltip')} />
    <TextField
      label={t('releaseName')}
      required
      style={{ marginBottom: '24px' }}
      autoFocus
      error={!!errors?.release_name}
      helperText={errors?.release_name?.message}
      {...register('release_name', {
        required: t('releaseNameError'),
      })}
      inputProps={{
        'data-testid': 'apelido-release'
      }}
      fullWidth
    />
    <TextField
      label={t('releaseDesc')}
      style={{ marginBottom: '24px' }}
      error={!!errors?.description}
      helperText={errors?.description?.message}
      {...register('description', {
        maxLength: 512,
      })}
      inputProps={{
        'data-testid': 'descricao-release'
      }}
      multiline
      minRows={3}
      maxRows={8}
      fullWidth
    />
    <Box display="flex">
      <TextField
        label={t('releaseIniDate')}
        required
        type="date"
        style={{ marginRight: '16px' }}
        error={!!errors?.start_at}
        helperText={errors?.start_at?.message}
        {...register('start_at', {
          required: t('releaseIniDateError'),
        })}
        inputProps={{
          'data-testid': 'inicio-release',
          max: watch("end_at")
        }}
        sx={{ flex: 1 }}
      />
      <TextField
        label={t('releaseFinDate')}
        required
        type="date"
        style={{ marginBottom: '24px' }}
        error={!!errors?.end_at}
        helperText={errors?.end_at?.message}
        {...register('end_at', {
          required: t('releaseFinDateError'),
        })}
        inputProps={{
          'data-testid': 'fim-release',
          min: watch("start_at")
        }}
        sx={{ flex: 1 }}
      />
    </Box>
    <StartingPointSelector
      value={startingPoint}
      onChange={setStartingPoint}
      lastConfigMeta={lastConfigMeta}
      lastConfigData={lastConfigData}
      defaultConfigData={defaultConfigData}
    />
  </>
}
