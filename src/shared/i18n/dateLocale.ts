import { enUS, ptBR } from 'date-fns/locale';
import i18n from './i18n';

const isPortuguese = () => !!i18n.language?.startsWith('pt');

export const dateLocale = () => (isPortuguese() ? ptBR : enUS);

export const intlLocale = () => (isPortuguese() ? 'pt-BR' : 'en-US');

const DATE_PATTERNS = {
  date: { pt: 'dd/MM/yyyy', en: 'MM/dd/yyyy' },
  dateTime: { pt: "dd/MM/yyyy 'às' HH:mm", en: "MM/dd/yyyy 'at' HH:mm" }
} as const;

export const datePattern = (name: keyof typeof DATE_PATTERNS) => DATE_PATTERNS[name][isPortuguese() ? 'pt' : 'en'];
