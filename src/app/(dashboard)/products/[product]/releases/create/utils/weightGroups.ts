import { Characteristic, PreConfigData, Subcharacteristic } from '@customTypes/preConfig';

export type GroupLevel = 'characteristics' | 'subcharacteristics' | 'measures';

export interface GroupEntity {
  key: string;
  weight: number;
}

/**
 * Conjunto de irmãos que dividem 100% do peso. O `path` segue o `group_path`
 * do Service: "characteristics", "<car>/subcharacteristics", "<car>/<sub>/measures".
 */
export interface WeightGroup {
  path: string;
  level: GroupLevel;
  characteristicKey?: string;
  subcharacteristicKey?: string;
  entities: GroupEntity[];
}

const toEntity = ({ key, weight }: { key: string; weight: number }): GroupEntity => ({ key, weight });

const activeOnly = <T extends { active?: boolean }>(items: T[] | undefined): T[] =>
  (items ?? []).filter(item => item.active);

function characteristicsGroup(config: PreConfigData): WeightGroup {
  return {
    path: 'characteristics',
    level: 'characteristics',
    entities: activeOnly(config.characteristics).map(toEntity),
  };
}

function subcharacteristicsGroup(characteristic: Characteristic): WeightGroup {
  return {
    path: `${characteristic.key}/subcharacteristics`,
    level: 'subcharacteristics',
    characteristicKey: characteristic.key,
    entities: activeOnly(characteristic.subcharacteristics).map(toEntity),
  };
}

function measuresGroup(characteristic: Characteristic, subcharacteristic: Subcharacteristic): WeightGroup {
  return {
    path: `${characteristic.key}/${subcharacteristic.key}/measures`,
    level: 'measures',
    characteristicKey: characteristic.key,
    subcharacteristicKey: subcharacteristic.key,
    entities: activeOnly(subcharacteristic.measures).map(toEntity),
  };
}

/**
 * Grupos das entidades ativas, na ordem das telas: características, depois as
 * subcaracterísticas de cada característica e, por fim, as medidas de cada sub.
 */
export function buildWeightGroups(config: PreConfigData): WeightGroup[] {
  const characteristics = activeOnly(config.characteristics);

  return [
    characteristicsGroup(config),
    ...characteristics.map(subcharacteristicsGroup),
    ...characteristics.flatMap(characteristic =>
      activeOnly(characteristic.subcharacteristics).map(sub => measuresGroup(characteristic, sub))
    ),
  ];
}

export function groupWeightSum(group: WeightGroup): number {
  return group.entities.reduce((sum, entity) => sum + Number(entity.weight), 0);
}

export interface InvalidGroup {
  group: WeightGroup;
  sum: number;
}

/** Grupos cuja soma de pesos não é 100. */
export function findInvalidGroups(config: PreConfigData): InvalidGroup[] {
  return buildWeightGroups(config)
    .map(group => ({ group, sum: groupWeightSum(group) }))
    .filter(({ group, sum }) => group.entities.length > 0 && sum !== 100);
}

/** Grupos sem nenhuma entidade marcada (ex.: característica sem subcaracterística). */
export function findEmptyGroups(config: PreConfigData): WeightGroup[] {
  return buildWeightGroups(config).filter(group => group.entities.length === 0);
}

/** Em grupos de uma única entidade, ela fica com peso 100 (não há o que dividir). */
export function normalizeSingleEntityGroups(config: PreConfigData): PreConfigData {
  const single = <T extends { active?: boolean; weight: number }>(items: T[]): T[] => {
    const active = activeOnly(items);
    return active.length === 1 ? items.map(item => (item.active ? { ...item, weight: 100 } : item)) : items;
  };

  return {
    ...config,
    characteristics: single(config.characteristics).map(characteristic => ({
      ...characteristic,
      subcharacteristics: single(characteristic.subcharacteristics).map(sub => ({
        ...sub,
        measures: single(sub.measures),
      })),
    })),
  };
}

/** Grava nos pesos da configuração os pesos de um grupo (ex.: os devolvidos pela prévia AHP). */
export function applyGroupWeights(config: PreConfigData, group: WeightGroup, weights: Record<string, number>): PreConfigData {
  const withWeights = <T extends { key: string; weight: number }>(items: T[]): T[] =>
    items.map(item => (item.key in weights ? { ...item, weight: weights[item.key] } : item));

  return {
    ...config,
    characteristics: group.level === 'characteristics'
      ? withWeights(config.characteristics)
      : config.characteristics.map(characteristic => {
        if (characteristic.key !== group.characteristicKey) return characteristic;
        if (group.level === 'subcharacteristics')
          return { ...characteristic, subcharacteristics: withWeights(characteristic.subcharacteristics) };
        return {
          ...characteristic,
          subcharacteristics: characteristic.subcharacteristics.map(sub =>
            sub.key === group.subcharacteristicKey ? { ...sub, measures: withWeights(sub.measures) } : sub
          ),
        };
      }),
  };
}

/** Peso de cada entidade do grupo em outra configuração (ex.: o padrão, para o "Antes"). */
export function weightsInConfig(config: PreConfigData | undefined, group: WeightGroup): Record<string, number> {
  const other = config && buildWeightGroupsIncludingInactive(config).find(item => item.path === group.path);
  return Object.fromEntries((other?.entities ?? []).map(entity => [entity.key, entity.weight]));
}

function buildWeightGroupsIncludingInactive(config: PreConfigData): WeightGroup[] {
  const all = <T extends { active?: boolean }>(items: T[]) => items.map(item => ({ ...item, active: true }));
  return buildWeightGroups({
    ...config,
    characteristics: all(config.characteristics).map(c => ({
      ...c,
      subcharacteristics: all(c.subcharacteristics).map(s => ({ ...s, measures: all(s.measures) })),
    })),
  });
}

/** id do elemento da tela de pesos onde o grupo é editado (para rolar até ele). */
export function groupElementId(group: WeightGroup): string {
  switch (group.level) {
    case 'characteristics':
      return 'characteristicSection';
    case 'subcharacteristics':
      return `SubCarAccordion-${group.characteristicKey}`;
    default:
      return `MetricSubCarAccordion-${group.subcharacteristicKey}`;
  }
}
