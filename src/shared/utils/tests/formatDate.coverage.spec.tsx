import { formatDate, formatDateTime } from '../formatDate';

describe('formatDate and formatDateTime coverage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('formata data em inglês quando locale_lang é en', () => {
    window.localStorage.setItem('locale_lang', 'en');
    const formatted = formatDate('2026-05-10T12:00:00Z', 'long');
    expect(formatted).toContain('2026');
  });

  it('retorna "-" quando formatDate recebe uma data inválida', () => {
    expect(formatDate('data-invalida')).toBe('-');
  });

  it('formata data e hora com formatDateTime nos idiomas suportados', () => {
    const isoDate = '2026-05-10T15:30:00Z';

    const defaultFormatted = formatDateTime(isoDate);
    expect(defaultFormatted).toContain('2026');

    window.localStorage.setItem('locale_lang', 'pt');
    const ptFormatted = formatDateTime(isoDate, 'numeric');
    expect(ptFormatted).toContain('2026');

    window.localStorage.setItem('locale_lang', 'en');
    const enFormatted = formatDateTime(new Date(isoDate), 'long');
    expect(enFormatted).toContain('2026');
  });

  it('retorna "-" quando formatDateTime recebe uma data inválida', () => {
    expect(formatDateTime('data-invalida')).toBe('-');
  });
});
