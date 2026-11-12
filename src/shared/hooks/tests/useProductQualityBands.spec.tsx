import { act, renderHook } from '@testing-library/react';
import { useRequest } from '@hooks/useRequest';
import { QUALITY_BANDS } from '@utils/qualityBands';
import { useProductQualityBands } from '../useProductQualityBands';

jest.mock('@hooks/useRequest', () => ({ useRequest: jest.fn() }));

const PRODUCT_BANDS = [
  { key: 'E', min: 0, max: 0.1 },
  { key: 'D', min: 0.1, max: 0.3 },
  { key: 'C', min: 0.3, max: 0.5 },
  { key: 'B', min: 0.5, max: 0.85 },
  { key: 'A', min: 0.85, max: 1 }
];
const qualityBands = { is_default: false, can_edit: false, bands: PRODUCT_BANDS };
const mutate = jest.fn();

function mockRequest(result: Record<string, unknown>) {
  (useRequest as jest.Mock).mockReturnValue({ isLoading: false, mutate, ...result });
}

describe('useProductQualityBands', () => {
  beforeEach(() => {
    mutate.mockReset();
    mockRequest({ data: qualityBands });
  });

  it('lê a régua do produto em quality-bands/ e devolve as faixas com cor e nome', () => {
    const { result } = renderHook(() => useProductQualityBands('1', '5'));

    expect(useRequest).toHaveBeenCalledWith({
      url: '/v1/organizations/1/products/5/quality-bands/',
      method: 'get'
    });
    expect(result.current.bands).toEqual([
      { grade: 'E', min: 0, max: 0.1, color: '#BE2E0E', label: 'Muito ruim' },
      { grade: 'D', min: 0.1, max: 0.3, color: '#F16141', label: 'Ruim' },
      { grade: 'C', min: 0.3, max: 0.5, color: '#EBA133', label: 'Bom' },
      { grade: 'B', min: 0.5, max: 0.85, color: '#0DC889', label: 'Muito bom' },
      { grade: 'A', min: 0.85, max: 1, color: '#04724D', label: 'Ótimo' }
    ]);
    expect(result.current.isDefault).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('não busca nada sem organização ou produto', () => {
    mockRequest({ data: undefined });
    renderHook(() => useProductQualityBands('', ''));

    expect(useRequest).toHaveBeenCalledWith(null);
  });

  it('usa os padrões enquanto a régua não chega', () => {
    mockRequest({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useProductQualityBands('1', '5'));

    expect(result.current.bands).toEqual(QUALITY_BANDS);
    expect(result.current.isDefault).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('cai nos padrões e avisa o erro quando a régua não pode ser lida (CA4)', () => {
    mockRequest({ data: undefined, error: new Error('falhou') });
    const { result } = renderHook(() => useProductQualityBands('1', '5'));

    expect(result.current.bands).toEqual(QUALITY_BANDS);
    expect(result.current.isDefault).toBe(true);
    expect(result.current.hasError).toBe(true);
  });

  it('não avisa erro quando uma revalidação falha com a régua do produto já em mãos', () => {
    mockRequest({ data: qualityBands, error: new Error('falhou') });
    const { result } = renderHook(() => useProductQualityBands('1', '5'));

    expect(result.current.hasError).toBe(false);
    expect(result.current.bands[4].min).toBe(0.85);
  });

  it('informa que o produto segue os padrões quando ele nunca alterou a régua', () => {
    mockRequest({ data: { ...qualityBands, is_default: true } });

    expect(renderHook(() => useProductQualityBands('1', '5')).result.current.isDefault).toBe(true);
  });

  it('tenta carregar de novo', () => {
    const { result } = renderHook(() => useProductQualityBands('1', '5'));

    act(() => result.current.retry());

    expect(mutate).toHaveBeenCalledWith();
  });
});
