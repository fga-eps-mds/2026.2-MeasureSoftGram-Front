export type StepId =
  | 'repositories'
  | 'releaseInfo'
  | 'modelConfig'
  | 'referenceValues'
  | 'balance';

export interface StepFlags {
  changeRefValue: boolean;
}

const STEP_ORDER: StepId[] = [
  'repositories',
  'releaseInfo',
  'modelConfig',
  'referenceValues',
  'balance',
];

export function getVisibleSteps(flags: StepFlags): StepId[] {
  return STEP_ORDER.filter(step => step !== 'referenceValues' || flags.changeRefValue);
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
