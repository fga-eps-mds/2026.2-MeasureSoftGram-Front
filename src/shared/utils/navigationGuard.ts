/**
 * Trava de navegação interna (App Router não tem evento de saída de rota).
 * Uma tela com trabalho não salvo registra uma trava; o `push` do `useRouter`
 * pergunta a ela antes de navegar. A trava devolve true quando segura a
 * navegação e, se a pessoa confirmar, chama `proceed` depois.
 */
export type NavigationGuard = (proceed: () => void) => boolean;

let currentGuard: NavigationGuard | null = null;

/** Registra a trava; devolve a função que a remove. */
export function setNavigationGuard(guard: NavigationGuard): () => void {
  currentGuard = guard;
  return () => {
    if (currentGuard === guard) currentGuard = null;
  };
}

/** Navega, a menos que a trava registrada segure a navegação. */
export function runGuardedNavigation(navigate: () => void): void {
  if (currentGuard?.(navigate)) return;
  navigate();
}
