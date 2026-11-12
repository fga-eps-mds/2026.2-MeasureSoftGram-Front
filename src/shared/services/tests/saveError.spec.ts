import { AxiosError } from 'axios';
import { saveError } from '../saveError';

const DUPLICATES = {
  name: { server: 'Organization with this name already exists.', message: 'Já existe uma organização com este nome.' },
  key: { server: 'Organization with this key already exists.', message: 'Já existe uma organização com esta chave.' }
};
const FALLBACK = 'Ocorreu um erro ao salvar.';

const httpError = (status: number, data?: unknown) =>
  ({ isAxiosError: true, response: { status, data } } as unknown as AxiosError);

describe('saveError', () => {
  it('traduz o 400 de nome já usado', () => {
    const error = saveError(httpError(400, { name: [DUPLICATES.name.server] }), DUPLICATES, FALLBACK);
    expect(error.message).toBe(DUPLICATES.name.message);
  });

  it('traduz o 400 de chave já usada', () => {
    const error = saveError(httpError(400, { key: [DUPLICATES.key.server] }), DUPLICATES, FALLBACK);
    expect(error.message).toBe(DUPLICATES.key.message);
  });

  it('com nome e chave já usados, avisa do nome primeiro', () => {
    const data = { key: [DUPLICATES.key.server], name: [DUPLICATES.name.server] };
    expect(saveError(httpError(400, data), DUPLICATES, FALLBACK).message).toBe(DUPLICATES.name.message);
  });

  it('400 com outra mensagem no campo cai no texto padrão', () => {
    const error = saveError(httpError(400, { name: ['This field may not be blank.'] }), DUPLICATES, FALLBACK);
    expect(error.message).toBe(FALLBACK);
  });

  it('400 sem corpo cai no texto padrão', () => {
    expect(saveError(httpError(400), DUPLICATES, FALLBACK).message).toBe(FALLBACK);
  });

  it('outro status com a mesma mensagem cai no texto padrão', () => {
    const error = saveError(httpError(409, { name: [DUPLICATES.name.server] }), DUPLICATES, FALLBACK);
    expect(error.message).toBe(FALLBACK);
  });

  it('erro sem resposta HTTP cai no texto padrão', () => {
    expect(saveError(new Error('Network Error'), DUPLICATES, FALLBACK).message).toBe(FALLBACK);
  });
});
