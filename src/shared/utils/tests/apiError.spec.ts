import { extractApiError } from '../apiError';

const withData = (data: unknown) => ({ response: { data } });

describe('extractApiError', () => {
  it('lê o message das rotas de release', () => {
    expect(extractApiError(withData({ message: 'The release name must be unique' }))).toBe('The release name must be unique');
  });

  it('lê o detail em texto e em lista', () => {
    expect(extractApiError(withData({ detail: 'Faltam comparações: a × c' }))).toBe('Faltam comparações: a × c');
    expect(extractApiError(withData({ detail: ['Comparação fora do grupo: x'] }))).toBe('Comparação fora do grupo: x');
  });

  it('lê a soma diferente de 100 e a recusa das comparações ao salvar', () => {
    expect(extractApiError(withData({ non_field_errors: ['The sum of weights of characteristics is not 100'] })))
      .toBe('The sum of weights of characteristics is not 100');
    expect(extractApiError(withData({ comparisons: ['Weights in data for group `characteristics` do not match'] })))
      .toBe('Weights in data for group `characteristics` do not match');
  });

  it('junta erros por campo do DRF', () => {
    expect(extractApiError(withData({ entities: ['This field is required.'], name: ['Too long.'] })))
      .toBe('This field is required. Too long.');
  });

  it('sem resposta da API, usa a mensagem do erro', () => {
    expect(extractApiError(new Error('Network Error'))).toBe('Network Error');
    expect(extractApiError(withData('Bad Gateway'))).toBe('Bad Gateway');
  });
});
