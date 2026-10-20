import { act, renderHook } from '@testing-library/react';
import { useRequest } from '@hooks/useRequest';
import { useEntityAnalysis } from '../useEntityAnalysis';

jest.mock('@hooks/useRequest', () => ({ useRequest: jest.fn() }));

const releases = [
  { id: 20, release_name: 'v2.0' },
  { id: 10, release_name: 'v1.0' },
];
const catalog = {
  characteristic: [
    { key: 'reliability', name: 'Reliability' },
    { key: 'maintainability', name: 'Maintainability' },
  ],
  subcharacteristic: [{ key: 'modifiability', name: 'Modifiability' }],
  measure: [],
  metric: [],
};
const mutate = jest.fn();

function mockRequests({ releaseData = releases as unknown, error }: { releaseData?: unknown; error?: Error } = {}) {
  (useRequest as jest.Mock).mockImplementation((request: { url: string } | null) => {
    if (!request) return { data: undefined, isLoading: false, mutate };
    if (request.url.endsWith('/release/')) return { data: releaseData, isLoading: false, mutate };
    if (request.url.endsWith('/entities/')) return { data: catalog, isLoading: false, mutate };
    return { data: { level: 'characteristic' }, isLoading: false, error, mutate };
  });
}

describe('useEntityAnalysis', () => {
  beforeEach(() => {
    mutate.mockClear();
    mockRequests();
  });

  it('começa pela release mais recente e pela primeira entidade do nível', () => {
    const { result } = renderHook(() => useEntityAnalysis('1', '2'));

    expect(result.current.releaseId).toBe(20);
    expect(result.current.entityKey).toBe('reliability');
    expect((useRequest as jest.Mock).mock.calls.at(-1)[0]).toEqual({
      url: '/v1/organizations/1/products/2/entity-analysis/',
      method: 'get',
      params: { release_id: 20, level: 'characteristic', key: 'reliability' },
    });
  });

  it('aceita a lista de releases paginada', () => {
    mockRequests({ releaseData: { results: releases } });

    const { result } = renderHook(() => useEntityAnalysis('1', '2'));

    expect(result.current.releases).toHaveLength(2);
  });

  it('troca a entidade quando o nível muda', () => {
    const { result } = renderHook(() => useEntityAnalysis('1', '2'));

    act(() => result.current.setLevel('subcharacteristic'));

    expect(result.current.entities).toEqual(catalog.subcharacteristic);
    expect(result.current.entityKey).toBe('modifiability');
  });

  it('mantém a entidade escolhida enquanto ela existe no nível', () => {
    const { result } = renderHook(() => useEntityAnalysis('1', '2'));

    act(() => result.current.setEntityKey('maintainability'));

    expect(result.current.entityKey).toBe('maintainability');
  });

  it('fica sem entidade quando o nível não tem nenhuma na configuração', () => {
    const { result } = renderHook(() => useEntityAnalysis('1', '2'));

    act(() => result.current.setLevel('measure'));

    expect(result.current.entityKey).toBeUndefined();
  });

  it('expõe o erro e refaz todas as requisições no retry', () => {
    mockRequests({ error: new Error('falhou') });

    const { result } = renderHook(() => useEntityAnalysis('1', '2'));
    result.current.retry();

    expect(result.current.error).toBeTruthy();
    expect(mutate).toHaveBeenCalledTimes(3);
  });
});
