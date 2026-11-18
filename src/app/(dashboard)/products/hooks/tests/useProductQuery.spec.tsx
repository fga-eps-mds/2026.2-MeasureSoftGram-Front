import { renderHook, act } from '@testing-library/react';
import { productQuery } from '@services/product';
import { useProductQuery } from '../useProductQuery';

jest.mock('@services/product', () => ({
  productQuery: {
    createProduct: jest.fn(),
    getProductById: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn()
  }
}));

describe('useProductQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve chamar createProduct com os dados informados', async () => {
    const formData = { name: 'Produto A', description: 'Desc', organizationId: '1' };
    (productQuery.createProduct as jest.Mock).mockResolvedValue({ type: 'success', value: formData });

    const { result } = renderHook(() => useProductQuery());
    let response;
    await act(async () => {
      response = await result.current.createProduct(formData as any);
    });

    expect(productQuery.createProduct).toHaveBeenCalledWith(formData);
    expect(response).toEqual({ type: 'success', value: formData });
  });

  it('deve chamar getProductById com organizationId e productId', async () => {
    const detail = { id: '2', name: 'Produto B' };
    (productQuery.getProductById as jest.Mock).mockResolvedValue({ type: 'success', value: detail });

    const { result } = renderHook(() => useProductQuery());
    let response;
    await act(async () => {
      response = await result.current.getProductById('org-1', 'prod-2');
    });

    expect(productQuery.getProductById).toHaveBeenCalledWith('org-1', 'prod-2');
    expect(response).toEqual({ type: 'success', value: detail });
  });

  it('deve chamar updateProduct com productId e dados', async () => {
    const formData = { name: 'Produto Atualizado', description: 'Nova', organizationId: '1' };
    (productQuery.updateProduct as jest.Mock).mockResolvedValue({ type: 'success', value: { id: '2', ...formData } });

    const { result } = renderHook(() => useProductQuery());
    let response;
    await act(async () => {
      response = await result.current.updateProduct('prod-2', formData as any);
    });

    expect(productQuery.updateProduct).toHaveBeenCalledWith('prod-2', formData);
    expect(response).toEqual({ type: 'success', value: { id: '2', ...formData } });
  });

  it('deve chamar deleteProduct com productId e organizationId', async () => {
    (productQuery.deleteProduct as jest.Mock).mockResolvedValue({ type: 'success', value: undefined });

    const { result } = renderHook(() => useProductQuery());
    let response;
    await act(async () => {
      response = await result.current.deleteProduct('prod-2', 'org-1');
    });

    expect(productQuery.deleteProduct).toHaveBeenCalledWith('prod-2', 'org-1');
    expect(response).toEqual({ type: 'success', value: undefined });
  });
});
