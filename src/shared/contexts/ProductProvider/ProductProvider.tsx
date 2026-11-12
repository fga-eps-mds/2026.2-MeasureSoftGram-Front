import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';

import { Product } from '@customTypes/product';
import { productQuery } from '@services/product';
import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { useRouter } from 'next/router';
import { getPathId } from '@utils/pathDestructer';

interface Props {
  children: ReactNode;
}

export interface IProductContext {
  currentProduct?: Product | null;
  setCurrentProduct: (product: Product | null) => void;
  productsList?: Product[];
  updateProductList: (products: Product[]) => void;
  loadAllProducts: () => Promise<void>;
}

/**
 * Produto que deve virar o atual, ou undefined para manter o atual: o da URL, se a lista o tiver; sem produto atual,
 * o salvo no navegador ou o primeiro da lista.
 */
function productToSelect(
  productsList: Product[],
  currentProduct: Product | null | undefined,
  routeProductId: string | undefined,
  storedProductId: string | null
): Product | undefined {
  const routeProduct = routeProductId
    ? productsList.find((product) => String(product.id) === routeProductId)
    : undefined;
  if (routeProduct) {
    // compara pelo id: o produto pode ter vindo completo do getProductById, e não precisa ser trocado
    return String(currentProduct?.id) === routeProductId ? undefined : routeProduct;
  }
  if (currentProduct) return undefined;
  const stored = storedProductId
    ? productsList.find((p) => p.id === storedProductId || p.id?.toString() === storedProductId)
    : undefined;
  return stored ?? productsList[0];
}

export const ProductContext = createContext<IProductContext | undefined>(undefined);

export function ProductProvider({ children }: Props) {
  const [currentProduct, setCurrentProduct] = useState<Product | null | undefined>(undefined); // Initialize with undefined
  const [productsList, setProductsList] = useState<Product[]>([]);
  const { storedValue: storedProductId, setValue: setStoredProductId } = useLocalStorage<string | null>(
    'selectedProductId',
    null
  );

  const { currentOrganization } = useOrganizationContext();
  const currentOrgId = currentOrganization?.id;
  // organização cuja lista de produtos já chegou: lista vazia antes disso é carregamento, não "sem produtos"
  const [loadedOrgId, setLoadedOrgId] = useState<string>();

  // numa página de produto (/products/<org>-<produto>-<nome>), o produto da URL é o atual; antes, o salvo no
  // navegador ou o primeiro da lista podiam vencer, e o menu lateral levava para outro produto
  const router = useRouter();
  const [, routeProductId] = getPathId(router?.query?.product as string | undefined);

  const updateProductList = useCallback((products: Product[]) => {
    setProductsList(products);
  }, []);

  const loadAllProducts = useCallback(async () => {
    try {
      if (!currentOrgId) {
        updateProductList([]);
        return;
      }

      const result = await productQuery.getAllProducts(currentOrgId);
      const products = result.data?.results || result.data || [];
      updateProductList(products);
      setLoadedOrgId(String(currentOrgId));
    } catch (error) {
      console.error(error);
    }
  }, [currentOrgId, updateProductList]);

  useEffect(() => {
    if (currentOrgId) {
      // Load products without indiscriminately clearing currentProduct,
      // let the next useEffect decide if it's still valid
      void loadAllProducts();
    } else {
      setCurrentProduct(null);
      setProductsList([]);
    }
  }, [currentOrgId, loadAllProducts]);

  useEffect(() => {
    if (productsList.length > 0) {
      const next = productToSelect(productsList, currentProduct, routeProductId, storedProductId);
      if (next) setCurrentProduct(next);
    } else if (currentOrganization && loadedOrgId === String(currentOrganization.id)) {
      // a lista desta organização já chegou e veio vazia
      setCurrentProduct(null);
    }
  }, [productsList, storedProductId, currentProduct, currentOrganization, routeProductId, loadedOrgId]);

  // Sync back to local storage whenever it changes
  useEffect(() => {
    if (currentProduct && currentProduct.id) {
      setStoredProductId(currentProduct.id.toString());
    } else if (currentProduct === null) {
      setStoredProductId(null);
    }
  }, [currentProduct, setStoredProductId]);

  const value = useMemo(
    () => ({
      currentProduct,
      setCurrentProduct,
      productsList,
      updateProductList,
      loadAllProducts
    }),
    [currentProduct, productsList, updateProductList, loadAllProducts]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProductContext() {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error('useProductContext must be used within a ProductContext');
  }

  return context;
}
