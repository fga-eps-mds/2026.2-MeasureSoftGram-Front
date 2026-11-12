import { withRepositoryTerm } from '@utils/csvRepositoryTerm';

describe('withRepositoryTerm', () => {
  const chart = {
    name: 'resumo',
    columns: [
      { key: 'release' as const, title: 'Release' },
      { key: 'repository' as const, title: 'Repositório' }
    ],
    rows: [{ release: 'R1', repository: 'api' }]
  };

  it('troca o título "Repositório" pelo termo do provedor e mantém as outras colunas', () => {
    expect(withRepositoryTerm(chart, 'Projeto').columns.map((column) => column.title)).toEqual(['Release', 'Projeto']);
  });

  it('não altera as linhas nem o gráfico original', () => {
    expect(withRepositoryTerm(chart, 'Projeto').rows).toBe(chart.rows);
    expect(chart.columns[1].title).toBe('Repositório');
  });

  it('com o termo do GitHub, o CSV fica igual', () => {
    expect(withRepositoryTerm(chart, 'Repositório')).toEqual(chart);
  });
});
