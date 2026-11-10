import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProductSettings from '../ProductSettings';

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { product: '1-5-MeasureSoftGram' }, pathname: '/products/[product]/settings' })
}));
jest.mock('@hooks/useRequireAuth', () => () => ({}));
jest.mock('@contexts/ProductProvider', () => ({
  useProductContext: () => ({ currentProduct: { id: 5, name: 'MeasureSoftGram' } })
}));

const mockTab = jest.fn();
jest.mock('../components/QualityBandsTab', () => (props: Record<string, string>) => {
  mockTab(props);
  return <div data-testid="quality-bands-tab" />;
});

describe('ProductSettings', () => {
  it('abre as configurações do produto na aba "Faixas de qualidade"', () => {
    render(<ProductSettings />);

    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('MeasureSoftGram')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Faixas de qualidade' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('quality-bands-tab')).toBeInTheDocument();
    expect(mockTab).toHaveBeenCalledWith({ organizationId: '1', productId: '5' });
  });
});
