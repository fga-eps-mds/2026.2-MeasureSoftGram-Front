import { PreConfigData } from '@customTypes/preConfig';

export type ComparisonLevel = 'characteristic' | 'subcharacteristic' | 'measure';

export interface WeightComparisonRow {
  level: ComparisonLevel;
  key: string;
  last: number | null;
  default: number | null;
  differs: boolean;
}

interface WeightedEntity {
  key: string;
  weight: number;
  active?: boolean;
}

function activeWeight(entity?: WeightedEntity): number | null {
  return entity?.active ? entity.weight : null;
}

function findByKey<T extends WeightedEntity>(items: T[] | undefined, key: string): T | undefined {
  return items?.find(item => item.key === key);
}

function row(level: ComparisonLevel, key: string, last?: WeightedEntity, def?: WeightedEntity): WeightComparisonRow {
  const lastWeight = activeWeight(last);
  const defaultWeight = activeWeight(def);
  return { level, key, last: lastWeight, default: defaultWeight, differs: lastWeight !== defaultWeight };
}

/**
 * Linhas da tabela "Última × Padrão", na hierarquia característica › sub › medida.
 * Percorre o modelo padrão (que tem todas as entidades); entidades fora de uma
 * configuração aparecem com peso null.
 */
export function buildWeightComparisonRows(last: PreConfigData, def: PreConfigData): WeightComparisonRow[] {
  return def.characteristics.flatMap(defChar => {
    const lastChar = findByKey(last.characteristics, defChar.key);

    return [
      row('characteristic', defChar.key, lastChar, defChar),
      ...defChar.subcharacteristics.flatMap(defSub => {
        const lastSub = findByKey(lastChar?.subcharacteristics, defSub.key);

        return [
          row('subcharacteristic', defSub.key, lastSub, defSub),
          ...defSub.measures.map(defMeasure =>
            row('measure', defMeasure.key, findByKey(lastSub?.measures, defMeasure.key), defMeasure)
          ),
        ];
      }),
    ];
  });
}

/** "Confiabilidade 43 · Manutenibilidade 43 · Adequação Funcional 14" */
export function summarizeCharacteristics(data: PreConfigData, translate: (key: string) => string): string {
  return data.characteristics
    .filter(characteristic => characteristic.active)
    .map(characteristic => {
      const name = translate(`characteristics.${characteristic.key}`);
      return `${name} ${characteristic.weight}`;
    })
    .join(' · ');
}
