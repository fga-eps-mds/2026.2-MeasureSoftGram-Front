import i18n from './i18n';

export function translatedRecord<Key extends string>(keys: Record<Key, string>): Record<Key, string> {
  const record = {} as Record<Key, string>;
  (Object.keys(keys) as Key[]).forEach((key) => {
    Object.defineProperty(record, key, { enumerable: true, get: () => i18n.t(keys[key]) });
  });
  return record;
}

export function translatedColumns<Row>(columns: [key: keyof Row & string, titleKey: string][]) {
  return columns.map(([key, titleKey]) => ({
    key,
    get title() {
      return i18n.t(titleKey);
    }
  }));
}
