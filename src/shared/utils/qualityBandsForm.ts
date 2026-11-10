import type { ProductQualityBand } from '@customTypes/qualityBands';
import { QUALITY_BANDS, QualityBand } from '@utils/qualityBands';

/**
 * Formulário das faixas de qualidade do produto (US30.01). As 5 faixas de E a A são separadas por 4 limites:
 * o "Até" de E, D, C e B. O "De" de cada faixa é o "Até" da anterior, a faixa E começa em 0 e a A termina em 1.
 * As mensagens são as mesmas que o Service devolve no `PUT` de `quality-bands/`.
 */

/** Os 4 limites padrão (0,20, 0,40, 0,60 e 0,80), tirados das faixas fixas da US06.01. */
export const DEFAULT_LIMITS: number[] = QUALITY_BANDS.slice(0, -1).map((band) => band.max);

export const LIMIT_MESSAGES = {
  notANumber: 'Use um número entre 0 e 1.',
  decimals: 'Use no máximo duas casas decimais.',
  range: 'Use um valor entre 0 e 1.',
  greaterThan: (value: number) => `O limite precisa ser maior que ${formatLimit(value)}.`,
  lessThanOne: 'O limite precisa ser menor que 1,00.'
};

/** Limite como aparece na tela: duas casas e vírgula decimal (0,40). */
export function formatLimit(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** Valor digitado no campo, com vírgula ou ponto; NaN se não for um número. */
export function parseLimit(text: string): number {
  const normalized = text.trim().replace(',', '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

// compara em centésimos para 0,1 + 0,2 não virar 0,30000000000000004
const cents = (value: number) => Math.round(value * 100);

/**
 * Mensagem de cada um dos 4 campos "Até", ou null se ele for válido (CA3). Um limite precisa ser número, ter até
 * duas casas, ficar entre 0 e 1 e ser maior que o "De" da faixa, que é o limite anterior. O último (fim da faixa B)
 * precisa ser menor que 1 para a faixa A não ficar vazia.
 */
export function getLimitErrors(drafts: string[]): (string | null)[] {
  const values = drafts.map(parseLimit);

  return values.map((value, index) => {
    if (Number.isNaN(value)) return LIMIT_MESSAGES.notANumber;
    if (/[.,]\d{3,}$/.test(drafts[index].trim())) return LIMIT_MESSAGES.decimals;
    if (value < 0 || value > 1) return LIMIT_MESSAGES.range;

    const start = index === 0 ? 0 : values[index - 1];
    // com o limite anterior inválido, a mensagem fica só no campo dele
    if (!Number.isNaN(start) && cents(value) <= cents(start)) return LIMIT_MESSAGES.greaterThan(start);
    if (index === values.length - 1 && cents(value) >= cents(1)) return LIMIT_MESSAGES.lessThanOne;
    return null;
  });
}

/** Os limites dos campos já validados, como números. */
export function parseLimits(drafts: string[]): number[] {
  return drafts.map((draft) => cents(parseLimit(draft)) / 100);
}

export function formatLimits(limits: number[]): string[] {
  return limits.map(formatLimit);
}

/** Os 4 limites de uma régua do Service. */
export function limitsFromBands(bands: ProductQualityBand[]): number[] {
  return bands.slice(0, -1).map((band) => band.max);
}

/** As 5 faixas de E a A a partir dos 4 limites, no formato do `PUT`. */
export function bandsFromLimits(limits: number[]): ProductQualityBand[] {
  const edges = [0, ...limits, 1];
  return QUALITY_BANDS.map((band, index) => ({ key: band.grade, min: edges[index], max: edges[index + 1] }));
}

export function sameLimits(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => cents(value) === cents(b[index]));
}

export interface RulerSegment {
  band: QualityBand;
  start: number;
  end: number;
}

/**
 * Trechos da barra de 0 a 1, que acompanha o que é digitado (CA2). Um campo inválido usa o último limite salvo, e
 * cada limite fica entre o anterior e 1, para a barra nunca ter trecho negativo enquanto o usuário corrige o valor.
 */
export function getRulerSegments(drafts: string[], saved: number[]): RulerSegment[] {
  const limits: number[] = [];
  drafts.forEach((draft, index) => {
    const value = parseLimit(draft);
    const usable = Number.isNaN(value) || value < 0 || value > 1 ? saved[index] : value;
    limits.push(Math.min(1, Math.max(usable, limits[index - 1] ?? 0)));
  });

  const edges = [0, ...limits, 1];
  return QUALITY_BANDS.map((band, index) => ({ band, start: edges[index], end: edges[index + 1] }));
}
