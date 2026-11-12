import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import mockRouter from 'next-router-mock';
import AuthError from '../AuthError';

/* eslint-disable global-require, arrow-body-style */
jest.mock('next/router', () => require('next-router-mock'));
/* eslint-enable global-require, arrow-body-style */

describe('AuthError Component', () => {
  beforeEach(() => {
    mockRouter.setCurrentUrl('/auth/error');
  });

  it('renders the auth error message and instructions correctly', () => {
    render(<AuthError />);

    expect(screen.getByText('Sua sessão expirou. Por favor, faça login novamente!')).toBeInTheDocument();
    expect(
      screen.getByText('Por segurança, você precisa entrar de novo. Volte para o login e tente novamente.')
    ).toBeInTheDocument();
    expect(screen.getByText(/O que você pode tentar:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Voltar para o Login/i })).toBeInTheDocument();
  });

  it('redirects to /auth when clicking the back to login button', () => {
    render(<AuthError />);

    const button = screen.getByRole('button', { name: /Voltar para o Login/i });
    fireEvent.click(button);

    expect(mockRouter.asPath).toBe('/auth');
  });

  it('executes getLayout function correctly', () => {
    const page = <div>Test Page</div>;
    expect(AuthError.getLayout?.(page)).toEqual(page);
  });
});
