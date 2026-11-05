/** Tira as barras do fim do texto. Sem regex: `/\/+$/` tem custo quadrático em entradas com muitas barras. */
export const stripTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;

  return value.slice(0, end);
};
