import { runGuardedNavigation, setNavigationGuard } from '../navigationGuard';

describe('navigationGuard', () => {
  it('navega direto quando não há trava', () => {
    const navigate = jest.fn();
    runGuardedNavigation(navigate);
    expect(navigate).toHaveBeenCalled();
  });

  it('a trava pode segurar a navegação e liberá-la depois', () => {
    let pending: (() => void) | undefined;
    const remove = setNavigationGuard(proceed => {
      pending = proceed;
      return true;
    });
    const navigate = jest.fn();

    runGuardedNavigation(navigate);
    expect(navigate).not.toHaveBeenCalled();

    pending?.();
    expect(navigate).toHaveBeenCalledTimes(1);
    remove();
  });

  it('a trava que não segura deixa navegar', () => {
    const remove = setNavigationGuard(() => false);
    const navigate = jest.fn();
    runGuardedNavigation(navigate);
    expect(navigate).toHaveBeenCalled();
    remove();
  });

  it('remover uma trava antiga não apaga a trava atual', () => {
    const removeOld = setNavigationGuard(() => true);
    const removeNew = setNavigationGuard(() => true);
    removeOld();

    const navigate = jest.fn();
    runGuardedNavigation(navigate);
    expect(navigate).not.toHaveBeenCalled();
    removeNew();
  });
});
