import React from 'react';
import { render } from '@testing-library/react';
import { toast } from 'react-toastify';
import { usePathname } from 'next/navigation';
import FlashMessage from '@components/FlashMessage';
import { FLASH_MESSAGE_KEY, setFlashMessage, takeFlashMessage } from '../flashMessage';

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }
}));
jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

describe('flashMessage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('guarda a mensagem e a entrega uma vez só', () => {
    setFlashMessage({ type: 'success', text: 'Olá' });

    expect(takeFlashMessage()).toEqual({ type: 'success', text: 'Olá' });
    expect(takeFlashMessage()).toBeNull();
    expect(sessionStorage.getItem(FLASH_MESSAGE_KEY)).toBeNull();
  });

  it('só a última mensagem fica guardada', () => {
    setFlashMessage({ type: 'info', text: 'primeira' });
    setFlashMessage({ type: 'warning', text: 'segunda' });

    expect(takeFlashMessage()).toEqual({ type: 'warning', text: 'segunda' });
  });

  it('sem mensagem devolve null', () => {
    expect(takeFlashMessage()).toBeNull();
  });

  it.each(['{corrompido', '{"type":"success"}', '{"type":"desconhecido","text":"x"}', '"texto"', 'null'])(
    'ignora o registro inválido %s',
    (raw) => {
      sessionStorage.setItem(FLASH_MESSAGE_KEY, raw);

      expect(takeFlashMessage()).toBeNull();
    }
  );

  it('não quebra se o sessionStorage estiver bloqueado', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => setFlashMessage({ type: 'error', text: 'x' })).not.toThrow();
    expect(takeFlashMessage()).toBeNull();
  });
});

describe('<FlashMessage />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('mostra o toast guardado antes da recarga', () => {
    setFlashMessage({ type: 'success', text: 'Volte logo!' });

    render(<FlashMessage />);

    expect(toast.success).toHaveBeenCalledWith('Volte logo!');
    expect(sessionStorage.getItem(FLASH_MESSAGE_KEY)).toBeNull();
  });

  it.each(['info', 'warning', 'error'] as const)('usa o toast do tipo %s', (type) => {
    setFlashMessage({ type, text: 'aviso' });

    render(<FlashMessage />);

    expect(toast[type]).toHaveBeenCalledWith('aviso');
  });

  it('sem mensagem não mostra nada', () => {
    render(<FlashMessage />);

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('lê de novo a cada navegação do cliente, sem recarga', () => {
    const { rerender } = render(<FlashMessage />);

    setFlashMessage({ type: 'info', text: 'depois' });
    (usePathname as jest.Mock).mockReturnValue('/home');
    rerender(<FlashMessage />);

    expect(toast.info).toHaveBeenCalledWith('depois');
  });
});
