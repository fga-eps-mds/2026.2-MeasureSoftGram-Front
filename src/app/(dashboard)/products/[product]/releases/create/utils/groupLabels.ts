import { WeightGroup } from './weightGroups';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** "Características", "Sub · Confiabilidade", "Medidas · Status de Teste" */
export function groupTitle(group: WeightGroup, t: Translate): string {
  switch (group.level) {
    case 'characteristics':
      return t('groupCharacteristics');
    case 'subcharacteristics':
      return t('groupSub', { name: t(`characteristics.${group.characteristicKey}`) });
    default:
      return t('groupMeasures', { name: t(`subCharacteristics.${group.subcharacteristicKey}`) });
  }
}

/** Nome da entidade pelo nível do grupo. */
export function entityName(group: WeightGroup, key: string, t: Translate): string {
  switch (group.level) {
    case 'characteristics':
      return t(`characteristics.${key}`);
    case 'subcharacteristics':
      return t(`subCharacteristics.${key}`);
    default:
      return t(`measures.${key}`);
  }
}

/** Título e orientação da mensagem de soma diferente de 100 (protótipo 03qE). */
export function sumErrorMessage(group: WeightGroup, sum: number, t: Translate): { title: string; body: string } {
  let title: string;
  switch (group.level) {
    case 'characteristics':
      title = t('sumErrorCharacteristics', { sum });
      break;
    case 'subcharacteristics':
      title = t('sumErrorSubcharacteristics', { sum, name: t(`characteristics.${group.characteristicKey}`) });
      break;
    default:
      title = t('sumErrorMeasures', { sum, name: t(`subCharacteristics.${group.subcharacteristicKey}`) });
  }

  const diff = Math.abs(sum - 100);
  const body = sum > 100 ? t('sumErrorOver', { diff }) : t('sumErrorUnder', { diff });
  return { title, body };
}
