/**
 * Telas dentro da etapa "Definir pesos". O breadcrumb continua em "Definir pesos"
 * em todas elas (protótipo US13.01).
 */
export type WeightMethod = 'ahp' | 'typed';
export type WeightsView = 'method' | 'typed' | 'summary';

function viewsFor(method: WeightMethod): WeightsView[] {
  // A comparação por pares (AHP) entra no lugar de "typed" no próximo passo.
  return method === 'typed' ? ['method', 'typed', 'summary'] : ['method', 'summary'];
}

/** Próxima tela dentro da etapa; undefined quando a etapa termina. */
export function getNextWeightsView(current: WeightsView, method: WeightMethod): WeightsView | undefined {
  const views = viewsFor(method);
  const index = views.indexOf(current);
  return index === -1 ? undefined : views[index + 1];
}

/** Tela anterior dentro da etapa; undefined quando é preciso voltar de etapa. */
export function getPreviousWeightsView(current: WeightsView, method: WeightMethod): WeightsView | undefined {
  const views = viewsFor(method);
  const index = views.indexOf(current);
  return index <= 0 ? undefined : views[index - 1];
}
