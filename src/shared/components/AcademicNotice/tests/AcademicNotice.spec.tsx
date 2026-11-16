import React from 'react';
import { render, screen, within } from '@testing-library/react';
import pt from '../../../../../public/locales/pt/translation.json';
import AcademicNotice, {
  ACADEMIC_NOTICE_BANNER_ID,
  ACADEMIC_NOTICE_LEARN_MORE_URL,
  renderWithStrong
} from '../AcademicNotice';

// O mock global devolve a própria chave; aqui o t devolve o texto real em português para conferir o negrito.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('.').reduce((node: any, part) => node?.[part], pt) ?? key
  })
}));

describe('AcademicNotice', () => {
  describe('variante banner', () => {
    it('exibe o título, o texto com os trechos em negrito e o link "Saiba mais"', () => {
      render(<AcademicNotice variant="banner" />);

      const banner = screen.getByRole('complementary', { name: 'Aviso de ambiente acadêmico' });
      expect(banner).toHaveAttribute('id', ACADEMIC_NOTICE_BANNER_ID);
      expect(within(banner).getByText('Aviso de ambiente acadêmico')).toBeInTheDocument();
      expect(within(banner).getByText('projeto universitário em fase experimental').tagName).toBe('STRONG');
      expect(
        within(banner).getByText('não utilizar dados reais, confidenciais ou tokens com permissões sensíveis').tagName
      ).toBe('STRONG');
      expect(banner).not.toHaveTextContent('<strong>');

      const link = within(banner).getByRole('link', { name: 'Saiba mais' });
      expect(link).toHaveAttribute('href', ACADEMIC_NOTICE_LEARN_MORE_URL);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('variante card', () => {
    it('exibe o título e os três itens do aviso, sem link', () => {
      render(<AcademicNotice variant="card" />);

      const card = screen.getByRole('complementary', { name: 'Aviso de ambiente acadêmico' });
      expect(within(card).getByText('Aviso de ambiente acadêmico')).toBeInTheDocument();

      const items = within(card).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('O MeasureSoftGram é um projeto universitário em fase experimental.');
      expect(items[1]).toHaveTextContent(
        'Não oferecemos garantias sobre a persistência ou segurança dos dados armazenados.'
      );
      expect(items[2]).toHaveTextContent(
        'Não utilize dados reais, confidenciais ou tokens com permissões sensíveis nesta instância.'
      );
      items.forEach((item) => expect(item.querySelector('strong')).not.toBeNull());
      expect(within(card).queryByRole('link')).toBeNull();
    });
  });

  describe('renderWithStrong', () => {
    it('mantém o texto sem marcação como está', () => {
      render(<p data-testid="texto">{renderWithStrong('academicNotice.summary')}</p>);
      expect(screen.getByTestId('texto')).toHaveTextContent('academicNotice.summary');
      expect(screen.getByTestId('texto').querySelector('strong')).toBeNull();
    });
  });
});
