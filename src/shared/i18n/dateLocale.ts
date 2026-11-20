import { enUS, ptBR } from 'date-fns/locale';
import i18n from './i18n';

const isPortuguese = () => !!i18n.language?.startsWith('pt');

export const dateLocale = () => (isPortuguese() ? ptBR : enUS);

export const intlLocale = () => (isPortuguese() ? 'pt-BR' : 'en-US');
