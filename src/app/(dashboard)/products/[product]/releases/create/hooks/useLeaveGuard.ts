import { useCallback, useEffect, useRef, useState } from 'react';
import { setNavigationGuard } from '@utils/navigationGuard';

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Link interno que leva a outra página (nova aba, download e links externos passam direto). */
function internalLinkTarget(event: MouseEvent): string | null {
  if (event.defaultPrevented || !isPlainLeftClick(event)) return null;

  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * "Sair sem salvar" (Cenário 8 do protótipo): enquanto `active`, segura a saída
 * pelo menu (router.push), por links e pelo fechamento/recarga da aba, e pede
 * confirmação. Nada do planejamento é gravado antes de "Finalizar".
 */
export function useLeaveGuard(active: boolean, navigate: (href: string) => void) {
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    if (!active) return undefined;

    const removeGuard = setNavigationGuard(proceed => {
      if (bypass.current) return false;
      setPendingLeave(() => proceed);
      return true;
    });

    const onClick = (event: MouseEvent) => {
      if (bypass.current) return;
      const href = internalLinkTarget(event);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(() => () => navigate(href));
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypass.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      removeGuard();
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [active, navigate]);

  /** Libera a saída sem perguntar (ex.: depois de gravar o planejamento). */
  const allowLeave = useCallback(() => {
    bypass.current = true;
  }, []);

  const confirmLeave = useCallback(() => {
    const proceed = pendingLeave;
    setPendingLeave(null);
    bypass.current = true;
    proceed?.();
  }, [pendingLeave]);

  const cancelLeave = useCallback(() => setPendingLeave(null), []);

  return { isLeaveConfirmOpen: pendingLeave !== null, confirmLeave, cancelLeave, allowLeave };
}
