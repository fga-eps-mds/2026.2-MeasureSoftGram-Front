import { expect, test } from '@playwright/test';
import { checkResponse } from './support/contract';
import organizations from '../src/mocks/fixtures/organizations.json';

// a conferência do contrato em si: se ela aceitasse tudo, os outros testes passariam sem conferir nada
test.describe('contrato com o schema do Service', () => {
  test('aceita a resposta que bate com o schema', () => {
    expect(checkResponse('GET', '/v1/organizations', 200, organizations)).toEqual({});
  });

  test('acusa campo com o tipo errado', () => {
    const broken = { ...organizations, count: 'dois' };
    expect(checkResponse('GET', '/v1/organizations', 200, broken).error).toContain('/count');
  });

  test('acusa rota e status que o Service não tem', () => {
    expect(checkResponse('GET', '/v1/nao-existe', 200, {}).error).toContain('rota que o Service não tem');
    expect(checkResponse('POST', '/v1/organizations', 299, {}).error).toContain('não responde 299');
  });

  test('caminho fixo vence o com parâmetro e respostas de erro ficam de fora', () => {
    expect(checkResponse('GET', '/v1/organizations/1', 500, null)).toEqual({});
    // sem a ordem, /organizations/import-gitlab casaria com /organizations/{id}, que não tem POST
    expect(checkResponse('POST', '/v1/organizations/import-gitlab', 201, organizations.results[0])).toEqual({});
  });
});
