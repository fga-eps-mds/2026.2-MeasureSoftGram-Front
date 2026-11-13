import { act, renderHook } from '@testing-library/react';
import { useRequest } from '@hooks/useRequest';
import { productQuery } from '@services/product';
import { useQualityBands } from '../hooks/useQualityBands';

jest.mock('@hooks/useRequest', () => ({ useRequest: jest.fn() }));
jest.mock('@services/product', () => {
  const { productQuery: actual } = jest.requireActual('@services/product');
  return {
    productQuery: {
      getQualityBandsConfig: actual.getQualityBandsConfig.bind(actual),
      updateQualityBands: jest.fn(),
      restoreQualityBands: jest.fn()
    }
  };
});

const update = productQuery.updateQualityBands as jest.Mock;
const restoreBands = productQuery.restoreQualityBands as jest.Mock;

const DEFAULT_BANDS = [
  { key: 'E', min: 0, max: 0.2 },
  { key: 'D', min: 0.2, max: 0.4 },
  { key: 'C', min: 0.4, max: 0.6 },
  { key: 'B', min: 0.6, max: 0.8 },
  { key: 'A', min: 0.8, max: 1 }
];
const qualityBands = { is_default: true, can_edit: true, bands: DEFAULT_BANDS };
const mutate = jest.fn();

function mockRequest(result: Record<string, unknown>) {
  (useRequest as jest.Mock).mockReturnValue({ mutate, ...result });
}

describe('useQualityBands', () => {
  beforeEach(() => {
    update.mockReset();
    restoreBands.mockReset();
    mutate.mockReset();
    mockRequest({ data: qualityBands, response: { data: qualityBands, status: 200 } });
  });

  it('lê as faixas do produto em quality-bands/', () => {
    const { result } = renderHook(() => useQualityBands('1', '5'));

    expect(useRequest).toHaveBeenCalledWith(
      { url: '/v1/organizations/1/products/5/quality-bands/', method: 'get' },
      expect.anything()
    );
    expect(result.current.status).toBe('ready');
    expect(result.current.qualityBands).toEqual(qualityBands);
  });

  it('não busca nada sem organização ou produto', () => {
    mockRequest({ data: undefined });
    renderHook(() => useQualityBands('', ''));

    expect(useRequest).toHaveBeenCalledWith(null, expect.anything());
  });

  it('informa carregando e erro', () => {
    mockRequest({ data: undefined });
    expect(renderHook(() => useQualityBands('1', '5')).result.current.status).toBe('loading');

    mockRequest({ data: undefined, error: new Error('falhou') });
    expect(renderHook(() => useQualityBands('1', '5')).result.current.status).toBe('error');
  });

  it('continua pronto quando uma revalidação falha com as faixas já carregadas', () => {
    mockRequest({ data: qualityBands, error: new Error('falhou') });
    expect(renderHook(() => useQualityBands('1', '5')).result.current.status).toBe('ready');
  });

  it('salva as 5 faixas a partir dos limites e guarda a resposta no cache, sem nova requisição', async () => {
    const saved = { is_default: false, can_edit: true, bands: DEFAULT_BANDS };
    update.mockResolvedValue(saved);
    const { result } = renderHook(() => useQualityBands('1', '5'));

    await act(() => result.current.save([0.2, 0.4, 0.7, 0.8]));

    expect(update).toHaveBeenCalledWith('1', '5', [
      { key: 'E', min: 0, max: 0.2 },
      { key: 'D', min: 0.2, max: 0.4 },
      { key: 'C', min: 0.4, max: 0.7 },
      { key: 'B', min: 0.7, max: 0.8 },
      { key: 'A', min: 0.8, max: 1 }
    ]);
    expect(mutate).toHaveBeenCalledWith({ data: saved, status: 200 }, { revalidate: false });
  });

  it('restaura os padrões', async () => {
    restoreBands.mockResolvedValue(qualityBands);
    const { result } = renderHook(() => useQualityBands('1', '5'));

    await act(() => result.current.restore());

    expect(restoreBands).toHaveBeenCalledWith('1', '5');
    expect(mutate).toHaveBeenCalledWith({ data: qualityBands, status: 200 }, { revalidate: false });
  });

  it('repassa a falha ao salvar para a tela e não mexe no cache', async () => {
    update.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useQualityBands('1', '5'));

    await expect(result.current.save([0.2, 0.4, 0.7, 0.8])).rejects.toThrow('500');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('tenta carregar de novo', () => {
    const { result } = renderHook(() => useQualityBands('1', '5'));

    act(() => result.current.retry());

    expect(mutate).toHaveBeenCalledWith();
  });
});
