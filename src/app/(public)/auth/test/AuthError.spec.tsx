import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { useNavigation } from '@hooks/useRouter';
import AuthError from '../AuthError';

describe('AuthError Component', () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockClear();
    (useNavigation as jest.Mock).mockReturnValue({ push, replace: jest.fn(), back: jest.fn() });
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

    fireEvent.click(screen.getByRole('button', { name: /Voltar para o Login/i }));

    expect(push).toHaveBeenCalledWith('/auth');
  });
});
