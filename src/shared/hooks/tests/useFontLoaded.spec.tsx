import { act, renderHook, waitFor } from '@testing-library/react';
import { FONT_LOAD_TIMEOUT_MS, useFontLoaded } from '@hooks/useFontLoaded';

const FONT = '11px Roboto';

/** Simula a API de fontes do navegador, que o jsdom não tem; devolve como resolver ou rejeitar o carregamento. */
function mockFonts() {
  let resolve: () => void = () => undefined;
  let reject: () => void = () => undefined;
  const load = jest.fn(
    () =>
      new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      })
  );
  Object.defineProperty(document, 'fonts', { configurable: true, value: { load } });
  return { load, resolve: () => resolve(), reject: () => reject() };
}

describe('useFontLoaded', () => {
  afterEach(() => {
    delete (document as unknown as { fonts?: unknown }).fonts;
    jest.useRealTimers();
  });

  it('libera na hora sem a API de fontes', async () => {
    const { result } = renderHook(() => useFontLoaded(FONT));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('espera a fonte carregar', async () => {
    const fonts = mockFonts();
    const { result } = renderHook(() => useFontLoaded(FONT));

    expect(fonts.load).toHaveBeenCalledWith(FONT);
    expect(result.current).toBe(false);

    await act(async () => fonts.resolve());

    expect(result.current).toBe(true);
  });

  it('libera com a fonte reserva quando o carregamento falha', async () => {
    const fonts = mockFonts();
    const { result } = renderHook(() => useFontLoaded(FONT));

    await act(async () => fonts.reject());

    expect(result.current).toBe(true);
  });

  it('libera com a fonte reserva quando a fonte não chega no prazo', () => {
    jest.useFakeTimers();
    mockFonts();
    const { result } = renderHook(() => useFontLoaded(FONT));

    act(() => {
      jest.advanceTimersByTime(FONT_LOAD_TIMEOUT_MS - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('não atualiza o estado depois de desmontar', async () => {
    jest.useFakeTimers();
    const fonts = mockFonts();
    const { result, unmount } = renderHook(() => useFontLoaded(FONT));

    unmount();
    await act(async () => {
      fonts.resolve();
      jest.advanceTimersByTime(FONT_LOAD_TIMEOUT_MS);
    });

    expect(result.current).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});
