export type StepId =
  | 'repositories'
  | 'releaseInfo'
  | 'modelConfig'
  | 'referenceValues'
  | 'balance';

export type StartingPoint = 'last' | 'default' | 'new';

export interface StepFlags {
  changeRefValue: boolean;
  startingPoint: StartingPoint;
}

const STEP_ORDER: StepId[] = [
  'repositories',
  'releaseInfo',
  'modelConfig',
  'referenceValues',
  'balance',
];

function isStepVisible(step: StepId, flags: StepFlags): boolean {
  const definesNewWeights = flags.startingPoint === 'new';

  switch (step) {
    case 'modelConfig':
      return definesNewWeights;
    case 'referenceValues':
      return definesNewWeights && flags.changeRefValue;
    default:
      return true;
  }
}

export function getVisibleSteps(flags: StepFlags): StepId[] {
  return STEP_ORDER.filter(step => isStepVisible(step, flags));
}

export function getNextStep(current: StepId, flags: StepFlags): StepId | undefined {
  const steps = getVisibleSteps(flags);
  const index = steps.indexOf(current);
  return index === -1 ? undefined : steps[index + 1];
}

export function getPreviousStep(current: StepId, flags: StepFlags): StepId | undefined {
  const steps = getVisibleSteps(flags);
  const index = steps.indexOf(current);
  return index <= 0 ? undefined : steps[index - 1];
}

export function isLastStep(current: StepId, flags: StepFlags): boolean {
  const steps = getVisibleSteps(flags);
  return steps[steps.length - 1] === current;
}
