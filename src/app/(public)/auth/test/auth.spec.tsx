import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import Auth from '../page';

describe('Auth', () => {
  const originalEnv = process.env;
  const originalLocation = window.location;

  const setLocation = (overrides: Record<string, string> = {}) => {
    delete (window as any).location;
    window.location = {
      href: '',
      origin: 'http://localhost:3000',
      pathname: '/auth/',
      search: '',
      assign: jest.fn(),
      replace: jest.fn(),
      ...overrides
    } as any;
  };

  const clickLogin = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_LOGIN_REDIRECT_URL: 'http://localhost:3000' };
    setLocation();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Snapshot', () => {
    it('Deve corresponder ao Snapshot', () => {
      const tree = render(<Auth />);
      expect(tree).toMatchSnapshot();
    });
  });

  describe('Início do login', () => {
    it('Deve levar o login do GitHub ao servidor, que valida o client id e guarda o state', () => {
      render(<Auth />);

      clickLogin(/login com github/i);

      expect(window.location.assign).toHaveBeenCalledWith('/auth/oauth/github');
    });

    it('Deve levar o login do GitLab ao servidor', () => {
      render(<Auth />);

      clickLogin(/login com gitlab/i);

      expect(window.location.assign).toHaveBeenCalledWith('/auth/oauth/gitlab');
    });

    it('Deve repassar o returnTo da URL, codificado', () => {
      setLocation({ search: '?returnTo=%2Fproducts%2F1-2-x%3Ftab%3D1' });
      render(<Auth />);

      clickLogin(/login com github/i);

      expect(window.location.assign).toHaveBeenCalledWith(
        `/auth/oauth/github?returnTo=${encodeURIComponent('/products/1-2-x?tab=1')}`
      );
    });

    it('Deve começar o login na origem do callback quando a origem atual for outra', () => {
      setLocation({ origin: 'http://127.0.0.1:3000' });
      render(<Auth />);

      clickLogin(/login com gitlab/i);

      expect(window.location.assign).toHaveBeenCalledWith('http://localhost:3000/auth/oauth/gitlab');
    });

    it('Não deve trocar de origem quando a URL de callback não estiver configurada', () => {
      delete process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL;
      setLocation({ origin: 'http://127.0.0.1:3000' });
      render(<Auth />);

      clickLogin(/login com github/i);

      expect(window.location.assign).toHaveBeenCalledWith('/auth/oauth/github');
    });
  });

  describe('Enquanto navega', () => {
    it('Deve desabilitar os dois botões e mostrar o aviso no escolhido', () => {
      render(<Auth />);

      clickLogin(/login com github/i);

      expect(screen.getByRole('button', { name: /validando/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /login com gitlab/i })).toBeDisabled();
    });

    it('Deve reabilitar os botões quando o Voltar do navegador restaurar a página (pageshow)', () => {
      render(<Auth />);
      clickLogin(/login com github/i);

      act(() => {
        window.dispatchEvent(new Event('pageshow'));
      });

      expect(screen.getByRole('button', { name: /login com github/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /login com gitlab/i })).toBeEnabled();
    });
  });
});
