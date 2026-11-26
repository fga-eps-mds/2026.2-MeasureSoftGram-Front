import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { runGuardedNavigation } from '@utils/navigationGuard';
import { useLeaveGuard } from '../hooks/useLeaveGuard';

describe('useLeaveGuard', () => {
  it('segura a navegação pelo menu e só navega depois da confirmação', () => {
    const navigate = jest.fn();
    const { result, unmount } = renderHook(() => useLeaveGuard(true, navigate));
    const pushToHome = jest.fn();

    act(() => runGuardedNavigation(pushToHome));
    expect(pushToHome).not.toHaveBeenCalled();
    expect(result.current.isLeaveConfirmOpen).toBe(true);

    act(() => result.current.confirmLeave());
    expect(pushToHome).toHaveBeenCalledTimes(1);
    expect(result.current.isLeaveConfirmOpen).toBe(false);
    unmount();
  });

  it('"Voltar" fecha a confirmação e continua na página', () => {
    const { result, unmount } = renderHook(() => useLeaveGuard(true, jest.fn()));
    const push = jest.fn();

    act(() => runGuardedNavigation(push));
    act(() => result.current.cancelLeave());

    expect(result.current.isLeaveConfirmOpen).toBe(false);
    expect(push).not.toHaveBeenCalled();
    unmount();
  });

  it('não segura nada enquanto o planejamento não começou', () => {
    const { result, unmount } = renderHook(() => useLeaveGuard(false, jest.fn()));
    const push = jest.fn();

    act(() => runGuardedNavigation(push));
    expect(push).toHaveBeenCalled();
    expect(result.current.isLeaveConfirmOpen).toBe(false);
    unmount();
  });

  it('depois de allowLeave (planejamento gravado) navega sem perguntar', () => {
    const { result, unmount } = renderHook(() => useLeaveGuard(true, jest.fn()));
    const push = jest.fn();

    act(() => result.current.allowLeave());
    act(() => runGuardedNavigation(push));
    expect(push).toHaveBeenCalled();
    unmount();
  });

  it('segura o clique num link interno e navega por ele ao confirmar', () => {
    const navigate = jest.fn();
    let guard: ReturnType<typeof useLeaveGuard> | undefined;

    function Page() {
      guard = useLeaveGuard(true, navigate);
      return <a href="/home?x=1">Início</a>;
    }

    render(<Page />);
    fireEvent.click(screen.getByText('Início'));
    expect(guard?.isLeaveConfirmOpen).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    act(() => guard?.confirmLeave());
    expect(navigate).toHaveBeenCalledWith('/home?x=1');
  });

  it('avisa o navegador ao fechar ou recarregar a aba', () => {
    const { unmount } = renderHook(() => useLeaveGuard(true, jest.fn()));
    const event = new Event('beforeunload', { cancelable: true });

    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    unmount();
  });
});
