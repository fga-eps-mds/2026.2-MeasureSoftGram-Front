import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';

import { repository } from '@services/repository';
import { DemoData } from '@customTypes/demoData';
import { DEMO_ERRORS, useDemoData } from '../useDemoData';

jest.mock('@services/repository', () => ({ repository: { getDemoData: jest.fn() } }));

const demoData: DemoData = {
  is_demo: true,
  notice: 'Dados fictícios de demonstração',
  generated_at: '2026-11-06T12:00:00+00:00',
  latest_tsqmi: { id: null, value: 0.72, created_at: '2026-11-06T12:00:00+00:00' },
  tsqmi_history: [{ id: null, value: 0.72, created_at: '2026-11-06T12:00:00+00:00' }],
  historical_characteristics: {
    count: 1,
    results: [{ id: 1, key: 'reliability', name: 'Reliability', history: [{ value: 0.6, created_at: '2026-11-06' }] }]
  }
};

const axiosError = (status: number) => {
  const error = new AxiosError('falhou');
  error.response = { status } as AxiosError['response'];
  return error;
};

describe('useDemoData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('começa desligado e não chama o Service sem a pessoa pedir', () => {
    const { result } = renderHook(() => useDemoData('1', '2', '7'));

    expect(result.current.isActive).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(repository.getDemoData).not.toHaveBeenCalled();
  });

  it('liga o modo demonstração com a resposta marcada como demonstração', async () => {
    (repository.getDemoData as jest.Mock).mockResolvedValue({ type: 'success', value: demoData });
    const { result } = renderHook(() => useDemoData('1', '2', '7'));

    await act(() => result.current.activate());

    expect(repository.getDemoData).toHaveBeenCalledWith('1', '2', '7');
    expect(result.current.isActive).toBe(true);
    expect(result.current.data).toEqual(demoData);
    expect(result.current.isLoading).toBe(false);
  });

  it('descarta uma resposta sem is_demo, para nunca mostrar dados fictícios sem o aviso', async () => {
    (repository.getDemoData as jest.Mock).mockResolvedValue({
      type: 'success',
      value: { ...demoData, is_demo: false }
    });
    const { result } = renderHook(() => useDemoData('1', '2', '7'));

    await act(() => result.current.activate());

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe(DEMO_ERRORS.generic);
  });

  it.each([
    [404, DEMO_ERRORS.disabled],
    [409, DEMO_ERRORS.hasRealData],
    [500, DEMO_ERRORS.generic]
  ])('explica a recusa do Service (%s)', async (status, message) => {
    (repository.getDemoData as jest.Mock).mockResolvedValue({ type: 'error', error: axiosError(status) });
    const { result } = renderHook(() => useDemoData('1', '2', '7'));

    await act(() => result.current.activate());

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe(message);
  });

  it('volta aos dados reais ao sair da demonstração', async () => {
    (repository.getDemoData as jest.Mock).mockResolvedValue({ type: 'success', value: demoData });
    const { result } = renderHook(() => useDemoData('1', '2', '7'));
    await act(() => result.current.activate());

    act(() => result.current.deactivate());

    expect(result.current.isActive).toBe(false);
  });

  it('desliga ao trocar de repositório', async () => {
    (repository.getDemoData as jest.Mock).mockResolvedValue({ type: 'success', value: demoData });
    const { result, rerender } = renderHook(({ repositoryId }) => useDemoData('1', '2', repositoryId), {
      initialProps: { repositoryId: '7' }
    });
    await act(() => result.current.activate());

    rerender({ repositoryId: '8' });

    await waitFor(() => expect(result.current.isActive).toBe(false));
  });
});
