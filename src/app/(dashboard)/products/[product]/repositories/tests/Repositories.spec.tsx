import '@testing-library/jest-dom';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { OrganizationProvider } from '@contexts/OrganizationProvider';
import Repositories from '../Repositories';

const mockPush = jest.fn();

jest.mock('@contexts/ProductProvider', () => ({
  useProductContext: () => ({
    currentProduct: {
      name: `aoba`
    },
    // o useQuery da tabela carrega o produto da rota depois do teste: sem a função, o erro saía no console
    setCurrentProduct: jest.fn()
  })
}));

jest.mock('@contexts/RepositoryProvider', () => ({
  useRepositoryContext: () => ({ setRepositoryList: jest.fn() })
}));

jest.mock('@hooks/useRouter', () => ({
  useRouter: () => ({
    query: { product: '1-5-MeasureSoftGram' },
    push: mockPush
  })
}));

describe('Repository', () => {
  describe('Snapshot', () => {
    it('Deve corresponder ao Snapshot', () => {
      const tree = render(
        <OrganizationProvider>
          <Repositories />
        </OrganizationProvider>
      );

      expect(tree).toMatchSnapshot();
    });
  });

  it('Deve ir para a lista de produtos ao clicar em adicionar', () => {
    render(
      <OrganizationProvider>
        <Repositories />
      </OrganizationProvider>
    );

    fireEvent.click(screen.getByLabelText('add'));

    expect(mockPush).toHaveBeenCalledWith('/products');
  });
});
