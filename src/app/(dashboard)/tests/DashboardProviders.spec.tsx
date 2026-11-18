import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DashboardProviders from '../DashboardProviders';

jest.mock('@contexts/Auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>
}));

jest.mock('@contexts/OrganizationProvider', () => ({
  OrganizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="org-provider">{children}</div>
  )
}));

jest.mock('@contexts/RepositoryProvider', () => ({
  RepositoryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="repo-provider">{children}</div>
  )
}));

jest.mock('@contexts/ProductProvider', () => ({
  ProductProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="product-provider">{children}</div>
  )
}));

describe('DashboardProviders', () => {
  it('renderiza os providers e o conteúdo filho no cliente', () => {
    const { unmount } = render(
      <DashboardProviders initialUser={null} provider="github" loginAt={1700000000}>
        <span>Conteúdo do Dashboard</span>
      </DashboardProviders>
    );

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('org-provider')).toBeInTheDocument();
    expect(screen.getByTestId('repo-provider')).toBeInTheDocument();
    expect(screen.getByTestId('product-provider')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do Dashboard')).toBeInTheDocument();

    unmount();
  });
});
