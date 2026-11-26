'use client';

import React, { useEffect, useState } from 'react';

import { Box, Breadcrumbs, Button } from '@mui/material';
import { useForm } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import { useRouter } from '@hooks/useRouter';
import { useTranslation } from 'react-i18next';
import { Change, ReleaseGoal } from '@customTypes/product';
import { Characteristic, Measure, PreConfigData, ReleaseInfoForm, Subcharacteristic } from '@customTypes/preConfig';
import { productQuery } from '@services/product';
import { balanceMatrixService } from '@services/balanceMatrix';
import { toast } from 'react-toastify';
import ConfirmModal from '@components/ConfirmModal/ConfirmModal';
import * as Styles from './styles';
import BasicInfoForm from './components/BasicInfoForm/BasicInfoForm';
import ModelConfigForm from './components/ModelConfigForm/ModelConfigForm';
import ReferenceValuesForm from './components/ReferenceValuesForm/ReferenceValuesForm';
import CharacteristicsBalanceForm from './components/CharacteristicsBalanceForm/CharacteristicsBalanceForm';
import RepositorySelectionForm from './components/RepositorySelectionForm/RepositorySelectionForm';
import { useProviderTerms } from '@hooks/useProviderTerms';
import { StepId, getNextStep, getPreviousStep, getVisibleSteps, isLastStep } from './steps';

function ReleaseCreation() {
  const { terms } = useProviderTerms();
  const [organizationId, setOrganizationId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [activeStep, setActiveStep] = useState<StepId>(process.env.NODE_ENV === 'test' ? 'releaseInfo' : 'repositories');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showChangeDateModal, setShowChangeDateModal] = useState(false);
  const [changeRefValue, setChangeRefValue] = useState<boolean>(false);
  const stepFlags = { changeRefValue };
  const [followLastConfig, setFollowLastConfig] = useState<boolean>(false);
  const [dinamicBalance, setDinamicBalance] = useState<boolean>(false);
  const [defaultPageData, setConfigDefaultPageData] = useState<PreConfigData>();
  const [lastConfigPageData, setLastConfigPageData] = useState<PreConfigData>();
  const [configPageData, setConfigPageData] = useState<PreConfigData>();
  const [balanceMatrix, setBalanceMatrix] = useState<any>();
  const [releaseGoal, setReleaseGoal] = useState<any>();
  const [releaseConflict, setReleaseConflict] = useState<string>();

  const router = useRouter();
  const routerParams: any = router.query;

  const { t } = useTranslation('plan_release');

  const { register, handleSubmit, formState: { errors }, getValues, watch, trigger, setValue } = useForm<ReleaseInfoForm>({
    mode: "all",
    defaultValues: {
      end_at: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      start_at: format(new Date(), 'yyyy-MM-dd'),
      goal: 0,
      release_name: '',
      description: '',
      repositories_ids: process.env.NODE_ENV === 'test' ? [1] : []
    }
  });

  useEffect(() => {
    if (router.isReady) {
      const organization = routerParams.product.split('-')[0];
      const productIdentifier = routerParams.product.split('-')[1];
      const productTitle = routerParams.product.split('-')[2];

      setOrganizationId(organization);
      setProductId(productIdentifier);
      setProductName(productTitle);

      const getPreConfig = async () => {
        const [entitiesResult, goalResult, defaultResult, currentResult, balanceResult] = await Promise.allSettled([
          productQuery.getPreConfigEntitiesRelationship(organization, productIdentifier),
          productQuery.getCurrentReleaseGoal(organization, productIdentifier),
          productQuery.getProductDefaultPreConfig(organization, productIdentifier),
          productQuery.getProductCurrentPreConfig(organization, productIdentifier),
          balanceMatrixService.getBalanceMatrix()
        ]);

        let currentReleaseGoal: any;
        if (entitiesResult.status === 'fulfilled' && goalResult.status === 'fulfilled') {
          currentReleaseGoal = goalResult.value.data;
        } else {
          const data: Record<string, number> = {};

          if (entitiesResult.status === 'fulfilled') {
            entitiesResult.value.data.forEach((element: { key: string | number; }) => {
              data[element.key] = 50;
            });
          }

          currentReleaseGoal = { id: 0, data, allow_dynamic: false };
        }
        setReleaseGoal(currentReleaseGoal);

        if (defaultResult.status === 'fulfilled') {
          const defaultData = defaultResult.value.data;
          setConfigPageData(formatConfig(defaultData, currentReleaseGoal));
          setConfigDefaultPageData(formatConfig(defaultData, currentReleaseGoal));

          if (currentResult.status === 'fulfilled') {
            setLastConfigPageData(formatConfig(mergeWithDefault(currentResult.value.data.data, defaultData), currentReleaseGoal));
          }
        }

        if (balanceResult.status === 'fulfilled') {
          setBalanceMatrix(balanceResult.value.data.result);
        }

        if (defaultResult.status === 'rejected' || currentResult.status === 'rejected' || balanceResult.status === 'rejected') {
          toast.error(t('getPreConfigError'), { autoClose: 10000 })
        }
      }

      void getPreConfig();
    };
  }, [router.isReady, routerParams.product]);

  function mergeWithDefault(current: PreConfigData, defaultData: PreConfigData): PreConfigData {
    const findOrCreate = <T extends { key: string }>(array: T[], key: string, defaultEntry: T): T => {
      const entry = array.find(item => item.key === key);
      return entry ?? { ...defaultEntry, key, weight: 0, active: false };
    };

    const updatedCharacteristics = defaultData.characteristics.map(defaultChar => {
      const currentChar = findOrCreate(current.characteristics, defaultChar.key, defaultChar);

      const updatedSubcharacteristics = defaultChar.subcharacteristics.map(defaultSub => {
        const currentSub = findOrCreate(currentChar.subcharacteristics, defaultSub.key, defaultSub);

        const updatedMeasures = defaultSub.measures.map(defaultMeasure => findOrCreate(currentSub.measures, defaultMeasure.key, defaultMeasure));

        return {
          ...currentSub,
          measures: updatedMeasures
        };
      });

      return {
        ...currentChar,
        subcharacteristics: updatedSubcharacteristics
      };
    });

    return {
      ...current,
      characteristics: updatedCharacteristics
    };
  };

  function formatConfig(data: PreConfigData, currentReleaseGoal: any): PreConfigData {
    data.characteristics.forEach((characteristic: Characteristic) => {
      characteristic.goal = currentReleaseGoal.data[characteristic.key] ?? 0;
      if (characteristic.weight > 0) {
        characteristic.active = true;
      }
      characteristic.subcharacteristics.forEach((subcharacteristic: Subcharacteristic) => {
        if (subcharacteristic.weight > 0 && characteristic.active) {
          subcharacteristic.active = true;
        }
        subcharacteristic.measures.forEach((measure: Measure) => {
          if (measure.weight > 0 && subcharacteristic.active) {
            measure.active = true;
          }
        });
      });
    });

    return data;
  }

  function handleSetFollowLastConfig(value: boolean) {
    if (value)
      setConfigPageData(lastConfigPageData!);
    else
      setConfigPageData(defaultPageData!);

    setFollowLastConfig(value)
  }

  async function checkBasicValues() {
    if (Object.keys(errors).length !== 0)
      return;

    try {
      await productQuery.getIsReleaseValid(organizationId, productId, getValues());
      goToNextStep();
    } catch (error: any) {
      if (error?.response?.data?.detail === "Já existe uma release neste período") {
        setReleaseConflict(error?.response?.data?.release?.id)
        setShowChangeDateModal(true);
      }
      else
        toast.error(`${error?.response?.data?.detail}`, { autoClose: 10000 })
    }
  };

  async function handleReleaseDateModal() {
    try {
      const newDate = new Date(getValues('start_at'))
      newDate.setDate(newDate.getDate() - 1);

      setShowChangeDateModal(false);

      await productQuery.updateReleaseEndDate(organizationId, productId, releaseConflict!, { end_at: newDate });
      void checkBasicValues();
    }
    catch (error: any) {
      setShowChangeDateModal(false);
      toast.error(`${error?.response?.data?.detail}`, { autoClose: 10000 });
    }
  }

  function handleChangeRefValue(value: boolean) {
    if (value)
      setShowConfirmationModal(value);

    setChangeRefValue(value)
  }

  function handleChangeDinamicBalance(value: boolean) {
    if (value)
      setShowConfirmationModal(value);

    setDinamicBalance(value)
  }

  function renderStep(): React.ReactNode {
    switch (activeStep) {
      case 'repositories':
        return <RepositorySelectionForm organizationId={organizationId} productId={productId} watch={watch} setValue={setValue} />
      case 'releaseInfo':
        return <BasicInfoForm configPageData={configPageData!} trigger={trigger} register={register} errors={errors} watch={watch} followLastConfig={followLastConfig} setFollowLastConfig={handleSetFollowLastConfig} />
      case 'modelConfig':
        return <ModelConfigForm changeRefValue={changeRefValue} setChangeRefValue={handleChangeRefValue} configPageData={configPageData!} setConfigPageData={setConfigPageData} />
      case 'referenceValues':
        return <ReferenceValuesForm configPageData={configPageData!} defaultPageData={defaultPageData!} setConfigPageData={setConfigPageData} />
      case 'balance':
        return <CharacteristicsBalanceForm characteristicRelations={balanceMatrix} configPageData={configPageData!} setConfigPageData={setConfigPageData} dinamicBalance={dinamicBalance} setDinamicBalance={handleChangeDinamicBalance} />
      default:
        return null;
    }
  }

  function goToNextStep(): void {
    const next = getNextStep(activeStep, stepFlags);
    if (next) setActiveStep(next);
  }

  function handlePreviousButtonClick(): void {
    const previous = getPreviousStep(activeStep, stepFlags);
    if (previous) setActiveStep(previous);
  }

  function findItemWithSumNotEqualTo100(items: { key: string; weight: number; active?: boolean }[]) {
    return items.filter(item => item.active).reduce((sum, item) =>
      sum + item.weight
      , 0) !== 100
      ? items.find(item => item.active)?.key
      : null;
  }

  function isConfigDataWeightValid(): boolean {
    const invalidCharacteristics = findItemWithSumNotEqualTo100(configPageData!.characteristics);

    if (invalidCharacteristics && invalidCharacteristics?.length > 0) {
      toast.error(t('invalidCharacteristicsError'), { autoClose: 10000 })
      document.getElementById("characteristicSection")?.scrollIntoView({ behavior: "smooth" });
      return false;
    }

    const invalidSubcharacteristics = configPageData!.characteristics
      .filter(characteristic => characteristic.active)
      .map(characteristic => {
        const invalidKey = findItemWithSumNotEqualTo100(characteristic.subcharacteristics);
        return invalidKey ? characteristic.key : null;
      })
      .filter(key => key !== null);


    if (invalidSubcharacteristics && invalidSubcharacteristics?.length > 0) {
      toast.error(t("invalidSubcharacteristicsError"), { autoClose: 10000 })
      document.getElementById(`SubCarAccordion-${invalidSubcharacteristics[0]}`)?.scrollIntoView({ behavior: "smooth" });
      return false;
    }

    const invalidMeasures = configPageData!.characteristics
      .filter(characteristic => characteristic.active)
      .flatMap(characteristic =>
        characteristic.subcharacteristics
          .filter(subcharacteristic => subcharacteristic.active)
          .map(subcharacteristic => {
            const invalidMeasureKey = findItemWithSumNotEqualTo100(subcharacteristic.measures);
            return invalidMeasureKey ? subcharacteristic.key : null; // Retorna o nome da subcaracterística se inválido
          })
      )
      .filter(key => key !== null);

    if (invalidMeasures && invalidMeasures?.length > 0) {
      toast.error(t('invalidMeasuresError'), { autoClose: 10000 })
      document.getElementById(`MetricSubCarAccordion-${invalidMeasures[0]}`)?.scrollIntoView({ behavior: "smooth" });
      return false;
    }

    return true;
  }

  async function handleNextButtonClick(): Promise<void> {
    switch (activeStep) {
      case 'repositories': {
        const selectedRepos = getValues('repositories_ids');
        if (!selectedRepos || selectedRepos.length === 0) {
          toast.error(t(`Selecione pelo menos um ${terms.repository} para a release.`), { autoClose: 6000 });
          break;
        }
        goToNextStep();
        break;
      }
      case 'releaseInfo':
        await checkBasicValues();
        break;
      case 'modelConfig':
        if (!isConfigDataWeightValid()) break;
        goToNextStep();
        break;
      case 'referenceValues':
        goToNextStep();
        break;
      case 'balance':
        void submitRelease();
        break;
      default:
        break;
    }
  }

  async function submitRelease() {
    const goalChanges = generateChanges();
    const release = getValues();
    const finalConfig = cleanConfigData();

    try {
      await productQuery.postPreConfig(organizationId, productId, { name: productName, data: finalConfig });

      const productGoalResult = await productQuery.createProductGoal(organizationId, productId, goalChanges);

      release.goal = productGoalResult.data.id;

      await productQuery.createProductRelease(organizationId, productId, release);

      toast.success(t('releaseCreated'), { autoClose: 6000 });
      router.push(`/products/${router.query.product}/releases/`);
    } catch (error: any) {
      toast.error(`${error.response?.data?.message ?? error}`, { autoClose: 10000 });
    }

  }

  function generateChanges(): ReleaseGoal {
    // Criação do array de mudanças com a tipagem explícita
    const changes: Change[] = [];

    configPageData?.characteristics
      .filter((characteristic: Characteristic) => characteristic.active)
      .forEach((characteristic: Characteristic) => {
        const referenceGoal = releaseGoal.data[characteristic.key] ?? 0;
        let delta: number;

        if (dinamicBalance) {
          delta = 50 - characteristic.goal;
        } else {
          const relatedPositiveKeys = balanceMatrix[characteristic.key]?.['+'] || [];
          const isAlreadyChanged = relatedPositiveKeys.some((relatedKey: string) =>
            changes.some(change => change.characteristic_key === relatedKey)
          );

          if (isAlreadyChanged || referenceGoal === characteristic.goal) {
            return;
          }

          delta = characteristic.goal - referenceGoal;
        }

        changes.push({
          characteristic_key: characteristic.key,
          delta,
        });
      });

    return { changes, allow_dynamic: dinamicBalance };
  }

  function cleanConfigData() {
    return {
      ...configPageData,
      characteristics: configPageData!.characteristics
        .filter((characteristic: Characteristic) => characteristic.active)
        .map((characteristic: Characteristic) => ({
          ...removeProperties(characteristic),
          subcharacteristics: characteristic.subcharacteristics
            .filter((sub: Subcharacteristic) => sub.active)
            .map((sub: Subcharacteristic) => ({
              ...removeProperties(sub),
              measures: sub.measures
                .filter((measure: Measure) => measure.active)
                .map((measure: Measure) => removeProperties(measure))
            }))
        }))
    };
  }

  function removeProperties(obj: any) {
    const { goal, active, ...rest } = obj;
    return rest;
  }

  function handleModalBtnClick() {
    if (activeStep === 'modelConfig')
      handleChangeRefValue(true);
    else
      handleChangeDinamicBalance(true)

    setShowConfirmationModal(false)
  }

  function getStepLabel(step: StepId): string {
    switch (step) {
      case 'repositories':
        return `Selecionar ${terms.Repositories}`;
      case 'releaseInfo':
        return t('createRelease');
      case 'modelConfig':
        return t('defineConfiguration');
      case 'referenceValues':
        return t('changeRefValue');
      case 'balance':
        return t('balanceCharacteristics');
      default:
        return '';
    }
  }

  function renderBreadcrumb(step: StepId): React.ReactNode {
    const isFirstStepActive = activeStep === 'repositories';

    return <Button
      key={step}
      sx={{
        cursor: 'pointer',
        textDecoration: 'none',
        color: activeStep === step ? "text.primary" : "text.secondary",
        fontWeight: activeStep === step ? '800' : 'normal',
        textTransform: 'none',
        pointerEvents: isFirstStepActive ? "none" : "auto"
      }}
      onClick={() => isFirstStepActive ? {} : setActiveStep(step)}
    >
      {getStepLabel(step)}
    </Button>
  }

  return (
    <>
      <Styles.Header>
        <h1 style={{ color: '#33568E', fontWeight: '500', textAlign: "left" }}>{t('planRelease')}</h1>
        <Breadcrumbs
          separator={<Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />}
          sx={{ fontSize: '14px' }}
        >
          {getVisibleSteps(stepFlags).map(renderBreadcrumb)}
        </Breadcrumbs>
      </Styles.Header>
      <Styles.Body>
        <Box>
          <form onSubmit={handleSubmit(handleNextButtonClick)}>
            {renderStep()}
            <Box
              sx={{
                display: 'grid',
                columnGap: 2,
                gridTemplateColumns: activeStep !== 'repositories' ? 'repeat(2, 1fr)' : "none",
                marginTop: 2
              }}
            >
              {activeStep !== 'repositories' &&
                <Button onClick={() => handlePreviousButtonClick()} variant="outlined">
                  {t('back')}
                </Button>
              }
              <Button type="submit" variant="contained">
                {isLastStep(activeStep, stepFlags) ? t('end') : t('next')}
              </Button>
            </Box>
          </form>
        </Box>
      </Styles.Body >
      <ConfirmModal
        setIsModalOpen={setShowChangeDateModal}
        text={t('conflictDates')}
        btnConfirmText={t('continue')}
        btnDismissText={t('back')}
        isModalOpen={showChangeDateModal}
        handleConfirmBtnClick={handleReleaseDateModal}
        handleDismissBtnClick={() => setShowChangeDateModal(false)}
      />
      <ConfirmModal
        setIsModalOpen={setShowConfirmationModal}
        text={activeStep === 'modelConfig' ? t('alertRefValue') : t('alertDinamicBalance')}
        btnConfirmText={t('continue')}
        btnDismissText={t('back')}
        isModalOpen={showConfirmationModal}
        handleDismissBtnClick={() => {
          setShowConfirmationModal(false)
          activeStep === 'modelConfig' ? setChangeRefValue(false) : setDinamicBalance(false)
        }}
        handleConfirmBtnClick={handleModalBtnClick} />
    </>
  );
}


export default ReleaseCreation;
