'use client';

import React, { useEffect, useState } from 'react';

import { Box, Breadcrumbs, Button } from '@mui/material';
import { useForm } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import { useRouter } from '@hooks/useRouter';
import { useTranslation } from 'react-i18next';
import { Change, ReleaseGoal } from '@customTypes/product';
import { Characteristic, Measure, PreConfigData, PreConfigMeta, ReleaseInfoForm, Subcharacteristic } from '@customTypes/preConfig';
import { productQuery } from '@services/product';
import { balanceMatrixService } from '@services/balanceMatrix';
import { toast } from 'react-toastify';
import ConfirmModal from '@components/ConfirmModal/ConfirmModal';
import * as Styles from './styles';
import BasicInfoForm from './components/BasicInfoForm/BasicInfoForm';
import ModelConfigForm from './components/ModelConfigForm/ModelConfigForm';
import EntitySelectionForm from './components/EntitySelectionForm/EntitySelectionForm';
import WeightMethodSelector from './components/WeightMethodSelector/WeightMethodSelector';
import WeightsSummary from './components/WeightsSummary/WeightsSummary';
import ReferenceValuesForm from './components/ReferenceValuesForm/ReferenceValuesForm';
import CharacteristicsBalanceForm from './components/CharacteristicsBalanceForm/CharacteristicsBalanceForm';
import RepositorySelectionForm from './components/RepositorySelectionForm/RepositorySelectionForm';
import { useProviderTerms } from '@hooks/useProviderTerms';
import { StartingPoint, StepId, getNextStep, getPreviousStep, getVisibleSteps, isLastStep } from './steps';
import { WeightMethod, WeightsView, getNextWeightsView, getPreviousWeightsView } from './weightsFlow';
import { WeightGroup, findEmptyGroups, findInvalidGroups, groupElementId, normalizeSingleEntityGroups } from './utils/weightGroups';
import PairwiseComparisonStep from './components/PairwiseComparisonStep/PairwiseComparisonStep';
import { GroupBadge } from './components/WeightsSummary/WeightsSummary';
import { formatDecimal } from './components/GroupPreview/GroupPreview';
import { useAhpComparison } from './hooks/useAhpComparison';
import { useLeaveGuard } from './hooks/useLeaveGuard';
import { extractApiError } from '@utils/apiError';
import { displayedCR } from './utils/ahp';

function ReleaseCreation() {
  const { terms } = useProviderTerms();
  const [organizationId, setOrganizationId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [activeStep, setActiveStep] = useState<StepId>(process.env.NODE_ENV === 'test' ? 'releaseInfo' : 'repositories');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showChangeDateModal, setShowChangeDateModal] = useState(false);
  const [changeRefValue, setChangeRefValue] = useState<boolean>(false);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>('new');
  const stepFlags = { changeRefValue, startingPoint };
  const [weightMethod, setWeightMethod] = useState<WeightMethod>('ahp');
  const [weightsView, setWeightsView] = useState<WeightsView>('method');
  const [dinamicBalance, setDinamicBalance] = useState<boolean>(false);
  const [defaultPageData, setConfigDefaultPageData] = useState<PreConfigData>();
  const [lastConfigPageData, setLastConfigPageData] = useState<PreConfigData>();
  const [lastConfigMeta, setLastConfigMeta] = useState<PreConfigMeta>();
  const [configPageData, setConfigPageData] = useState<PreConfigData>();
  const [balanceMatrix, setBalanceMatrix] = useState<any>();
  const [releaseGoal, setReleaseGoal] = useState<any>();
  const [releaseConflict, setReleaseConflict] = useState<string>();

  const router = useRouter();
  const routerParams: any = router.query;

  // "Sair sem salvar": só depois que a pessoa começou o planejamento.
  const [planningStarted, setPlanningStarted] = useState(false);
  const leaveGuard = useLeaveGuard(planningStarted, router.push);

  const ahp = useAhpComparison({
    organizationId,
    productId,
    configPageData,
    setConfigPageData,
    enabled: startingPoint === 'new',
  });

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

          const currentConfig = currentResult.status === 'fulfilled' ? currentResult.value?.data : undefined;
          if (currentConfig?.data) {
            const { data: currentData, ...currentMeta } = currentConfig;
            setLastConfigPageData(formatConfig(mergeWithDefault(currentData, defaultData), currentReleaseGoal));
            setLastConfigMeta(currentMeta);
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

  function handleSetStartingPoint(value: StartingPoint) {
    // "Definir novos pesos" começa pelas entidades do padrão (comentário do PO na #276).
    setConfigPageData(value === 'last' ? lastConfigPageData! : defaultPageData!);

    // Valores de referência só são ajustados em Definir entidades, que os caminhos
    // "Última" e "Padrão" não percorrem.
    if (value !== 'new') setChangeRefValue(false);

    setStartingPoint(value);
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
        return <BasicInfoForm
          trigger={trigger}
          register={register}
          errors={errors}
          watch={watch}
          startingPoint={startingPoint}
          setStartingPoint={handleSetStartingPoint}
          lastConfigMeta={lastConfigMeta}
          lastConfigData={lastConfigPageData}
          defaultConfigData={defaultPageData}
        />
      case 'entities':
        return <EntitySelectionForm changeRefValue={changeRefValue} setChangeRefValue={handleChangeRefValue} configPageData={configPageData!} setConfigPageData={setConfigPageData} />
      case 'weights':
        return renderWeightsView();
      case 'referenceValues':
        return <ReferenceValuesForm configPageData={configPageData!} defaultPageData={defaultPageData!} setConfigPageData={setConfigPageData} />
      case 'balance':
        return <CharacteristicsBalanceForm characteristicRelations={balanceMatrix} configPageData={configPageData!} setConfigPageData={setConfigPageData} dinamicBalance={dinamicBalance} setDinamicBalance={handleChangeDinamicBalance} />
      default:
        return null;
    }
  }

  function renderWeightsView(): React.ReactNode {
    switch (weightsView) {
      case 'method':
        return <WeightMethodSelector value={weightMethod} onChange={setWeightMethod} />
      case 'groups':
        return <PairwiseComparisonStep ahp={ahp} baselineConfig={defaultPageData} />
      case 'typed':
        return <ModelConfigForm configPageData={configPageData!} setConfigPageData={setConfigPageData} />
      case 'summary':
        return <WeightsSummary configPageData={configPageData!} method={weightMethod} onEdit={handleEditGroup} describeGroup={describeGroup} />
      default:
        return null;
    }
  }

  /** Selo do grupo no Resumo quando os pesos vieram da comparação. */
  function describeGroup(group: WeightGroup): GroupBadge | undefined {
    if (weightMethod !== 'ahp' || group.entities.length === 1) return undefined;

    const preview = ahp.comparisons[group.path]?.preview;
    if (!preview) return undefined;

    const cr = formatDecimal(displayedCR(preview));
    return ahp.statusOf(group) === 'accepted'
      ? { label: t('badgeAhpAccepted', { cr }), tone: 'warning' }
      : { label: t('badgeAhp', { cr }), tone: 'info' };
  }

  /** Troca de tela dentro de "Definir pesos"; ao chegar na comparação, escolhe o grupo. */
  function showWeightsView(view: WeightsView, direction: 'forward' | 'back'): void {
    if (view === 'groups') ahp.enter(direction);
    setWeightsView(view);
  }

  /** Entra numa etapa; em "Definir pesos", voltando de uma etapa posterior, cai no Resumo. */
  function enterStep(step: StepId, direction: 'forward' | 'back'): void {
    if (step === 'weights')
      setWeightsView(direction === 'back' ? 'summary' : 'method');
    setActiveStep(step);
  }

  function goToNextStep(): void {
    const next = getNextStep(activeStep, stepFlags);
    if (next) enterStep(next, 'forward');
  }

  function handlePreviousButtonClick(): void {
    if (activeStep === 'weights') {
      if (weightsView === 'groups' && ahp.previous() === 'moved') return;

      const previousView = getPreviousWeightsView(weightsView, weightMethod);
      if (previousView) {
        showWeightsView(previousView, 'back');
        return;
      }
    }

    const previous = getPreviousStep(activeStep, stepFlags);
    if (previous) enterStep(previous, 'back');
  }

  function handleEditGroup(group: WeightGroup): void {
    if (weightMethod === 'ahp') {
      ahp.goToGroup(group.path);
      setWeightsView('groups');
      return;
    }

    setWeightsView('typed');
    requestAnimationFrame(() => {
      document.getElementById(groupElementId(group))?.scrollIntoView?.({ behavior: 'smooth' });
    });
  }

  function handleEntitiesNext(): void {
    if (findEmptyGroups(configPageData!).length > 0) {
      toast.error(t('entitiesEmptyGroupError'), { autoClose: 10000 });
      return;
    }

    setConfigPageData(normalizeSingleEntityGroups(configPageData!));
    goToNextStep();
  }

  function handleWeightsNext(): void {
    if (weightsView === 'typed' && findInvalidGroups(configPageData!).length > 0) return;
    if (weightsView === 'groups' && ahp.next() !== 'leave') return;

    const nextView = getNextWeightsView(weightsView, weightMethod);
    if (nextView) showWeightsView(nextView, 'forward');
    else goToNextStep();
  }

  const isTypedSumInvalid =
    weightsView === 'typed' && !!configPageData && findInvalidGroups(configPageData).length > 0;
  const isGroupPending = weightsView === 'groups' && !ahp.canAdvance;
  const isNextBlocked = activeStep === 'weights' && (isTypedSumInvalid || isGroupPending);

  function nextButtonLabel(): string {
    if (isLastStep(activeStep, stepFlags)) return t('end');
    if (activeStep === 'weights' && weightsView === 'groups' && !ahp.isLastGroup) return t('nextGroup');
    return t('next');
  }

  async function handleNextButtonClick(): Promise<void> {
    setPlanningStarted(true);
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
      case 'entities':
        handleEntitiesNext();
        break;
      case 'weights':
        handleWeightsNext();
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

  /**
   * Pelo breadcrumb dá para chegar ao balanceamento com pesos incompletos (ex.:
   * entidades mudaram depois da comparação). Leva de volta ao que falta.
   */
  function ensureWeightsReady(): boolean {
    if (startingPoint !== 'new') return true;

    if (weightMethod === 'ahp' && ahp.pendingGroups.length > 0) {
      toast.error(t('submitPendingComparisons'), { autoClose: 10000 });
      ahp.goToGroup(ahp.pendingGroups[0].path);
      setWeightsView('groups');
      setActiveStep('weights');
      return false;
    }

    if (weightMethod === 'typed' && findInvalidGroups(configPageData!).length > 0) {
      toast.error(t('submitInvalidWeights'), { autoClose: 10000 });
      setWeightsView('typed');
      setActiveStep('weights');
      return false;
    }

    return true;
  }

  async function submitRelease() {
    if (!ensureWeightsReady()) return;

    const goalChanges = generateChanges();
    const release = getValues();
    const finalConfig = cleanConfigData();
    const comparisons = startingPoint === 'new' && weightMethod === 'ahp' ? ahp.comparisonsPayload() : [];

    try {
      // Com "Última configuração" a release usa a configuração atual do produto
      // (a mais recente até o fim da release). Regravá-la criaria uma cópia sem o
      // registro das comparações AHP da original.
      if (startingPoint !== 'last')
        await productQuery.postPreConfig(organizationId, productId, {
          name: productName,
          data: finalConfig,
          ...(comparisons.length > 0 ? { comparisons } : {}),
        });

      const productGoalResult = await productQuery.createProductGoal(organizationId, productId, goalChanges);

      release.goal = productGoalResult.data.id;

      await productQuery.createProductRelease(organizationId, productId, release);

      toast.success(t('releaseCreated'), { autoClose: 6000 });
      leaveGuard.allowLeave();
      router.push(`/products/${router.query.product}/releases/`);
    } catch (error: any) {
      toast.error(extractApiError(error), { autoClose: 10000 });
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
    if (activeStep === 'entities')
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
      case 'entities':
        return t('defineEntities');
      case 'weights':
        return t('defineWeights');
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
      onClick={() => isFirstStepActive ? {} : enterStep(step, 'forward')}
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
              <Button type="submit" variant="contained" disabled={isNextBlocked}>
                {nextButtonLabel()}
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
        text={activeStep === 'entities' ? t('alertRefValue') : t('alertDinamicBalance')}
        btnConfirmText={t('continue')}
        btnDismissText={t('back')}
        isModalOpen={showConfirmationModal}
        handleDismissBtnClick={() => {
          setShowConfirmationModal(false)
          activeStep === 'entities' ? setChangeRefValue(false) : setDinamicBalance(false)
        }}
        handleConfirmBtnClick={handleModalBtnClick} />
      <ConfirmModal
        setIsModalOpen={(open: boolean) => { if (!open) leaveGuard.cancelLeave(); }}
        text={t('leaveWithoutSavingText')}
        btnConfirmText={t('leaveWithoutSaving')}
        btnDismissText={t('back')}
        isModalOpen={leaveGuard.isLeaveConfirmOpen}
        handleConfirmBtnClick={leaveGuard.confirmLeave}
        handleDismissBtnClick={leaveGuard.cancelLeave}
      />
    </>
  );
}


export default ReleaseCreation;
