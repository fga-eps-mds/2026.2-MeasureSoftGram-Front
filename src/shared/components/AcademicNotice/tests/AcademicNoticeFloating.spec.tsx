import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import pt from '../../../../../public/locales/pt/translation.json';
import AcademicNotice from '../AcademicNotice';
import AcademicNoticeFloating from '../AcademicNoticeFloating';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('.').reduce((node: any, part) => node?.[part], pt) ?? key
  })
}));

describe('AcademicNoticeFloating', () => {
  const scrollIntoView = jest.fn();
  const scrollTo = jest.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    scrollTo.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.scrollTo = scrollTo;
  });

  it('exibe o selo fixo com o título e a chamada "Ver aviso"', () => {
    render(<AcademicNoticeFloating />);

    const selo = screen.getByRole('button', { name: /Ambiente acadêmico/ });
    expect(selo).toHaveTextContent('Não use dados reais · Ver aviso');
    expect(selo).toHaveStyle({ position: 'fixed' });
  });

  it('ao clicar, rola até a tarja do topo e passa o foco para ela', () => {
    render(
      <>
        <AcademicNotice variant="banner" />
        <AcademicNoticeFloating />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /Ambiente acadêmico/ }));

    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
    expect(screen.getByRole('complementary', { name: 'Aviso de ambiente acadêmico' })).toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('sem a tarja na página, volta para o topo', () => {
    render(<AcademicNoticeFloating />);

    fireEvent.click(screen.getByRole('button', { name: /Ambiente acadêmico/ }));

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});
