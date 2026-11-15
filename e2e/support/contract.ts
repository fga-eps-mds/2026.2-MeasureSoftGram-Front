import Ajv, { ValidateFunction } from 'ajv';
import openapi from '../contract/openapi.json';

/**
 * Contrato do Service: o schema que o drf_yasg gera (Swagger 2.0), publicado como artifact `openapi` pela CI do Service.
 * Para atualizar com o da develop do Service:
 *   gh run download -R fga-eps-mds/2026.2-MeasureSoftGram-Service -n openapi -D e2e/contract \
 *     $(gh run list -R fga-eps-mds/2026.2-MeasureSoftGram-Service -b develop -w "Rodar Testes" -s success -L 1 \
 *     --json databaseId -q '.[0].databaseId')
 * shortcut: cópia versionada e atualizada à mão; baixe o artifact na CI do Front se a cópia ficar para trás com frequência.
 */

type Json = any;

/** O drf_yasg marca campo nulo com x-nullable; o JSON Schema quer o null como alternativa. */
function toJsonSchema(node: Json): Json {
  if (Array.isArray(node)) return node.map(toJsonSchema);
  if (!node || typeof node !== 'object') return node;
  const { 'x-nullable': nullable, ...rest } = node;
  const converted = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, toJsonSchema(value)]));
  return nullable ? { anyOf: [converted, { type: 'null' }] } : converted;
}

// as respostas apontam para #/definitions/X do documento inteiro, registrado no ajv como "openapi"
const schema = JSON.parse(
  JSON.stringify(toJsonSchema(openapi)).replaceAll('"#/definitions/', '"openapi#/definitions/')
);
const ajv = new Ajv({ strict: false, validateFormats: false });
ajv.addSchema({ definitions: schema.definitions }, 'openapi');

interface Operation {
  template: string;
  pattern: RegExp;
  params: number;
  methods: Record<string, { responses: Record<string, { schema?: Json }> }>;
}

// caminhos a partir de /v1, sem a barra final, como o normalize do mockApi
const basePath = (openapi.basePath as string).replace(/^\/api/, '');
const operations: Operation[] = Object.entries(schema.paths as Record<string, Json>)
  .map(([path, methods]) => {
    const template = `${basePath}${path}`.replace(/\/$/, '');
    const source = template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+');
    return { template, pattern: new RegExp(`^${source}$`), params: (template.match(/\{/g) ?? []).length, methods };
  })
  // caminho fixo antes do com parâmetro: /organizations/import-gitlab não é /organizations/{id}
  .sort((a, b) => a.params - b.params);

function find(path: string): Operation | undefined {
  return operations.find(({ pattern }) => pattern.test(path));
}

/** O status 2xx que o Service documenta para a rota (201 na criação, 204 na remoção); 200 se ele não disser. */
export function documentedStatus(method: string, path: string): number {
  const operation = find(path);
  const responses = operation?.methods[method.toLowerCase()]?.responses ?? {};
  return Number(Object.keys(responses).find((status) => status.startsWith('2')) ?? 200);
}

/**
 * Respostas que o Service dá com outro status 2xx do que o schema diz: o login social do dj-rest-auth responde 200, e o
 * drf_yasg documenta 201 em todo POST. O corpo é conferido com o do status documentado.
 * shortcut: lista à mão; apague cada item quando o openapi.json do Service documentar o 200.
 */
const DOCUMENTED_AS: Record<string, string> = {
  'POST /v1/accounts/gitlab/login 200': '201',
  'POST /v1/accounts/github/login 200': '201'
};

const validators = new Map<string, ValidateFunction>();

export interface ContractCheck {
  /** A resposta simulada não bate com o Service: rota, método ou status que ele não tem, ou corpo fora do schema. */
  error?: string;
  /** O Service tem a rota, mas o schema não descreve o corpo dessa resposta. */
  uncovered?: string;
}

/** Confere uma resposta 2xx simulada contra o schema do Service; as de erro ficam de fora. */
export function checkResponse(method: string, path: string, status: number, body: unknown): ContractCheck {
  if (status < 200 || status >= 300) return {};
  const operation = find(path);
  if (!operation) return { error: `${method} ${path}: rota que o Service não tem` };

  const route = `${method} ${operation.template}`;
  const responses = operation.methods[method.toLowerCase()]?.responses;
  if (!responses) return { error: `${route}: método que o Service não tem nessa rota` };
  const response = responses[String(status)] ?? responses[DOCUMENTED_AS[`${route} ${status}`]];
  if (!response)
    return { error: `${route}: o Service não responde ${status} (responde ${Object.keys(responses).join(', ')})` };
  if (status === 204) return {};
  if (!response.schema) return { uncovered: `${route} ${status}` };

  const key = `${route} ${status}`;
  let validate = validators.get(key);
  if (!validate) {
    validate = ajv.compile(response.schema);
    validators.set(key, validate);
  }
  if (validate(body)) return {};
  const [first] = validate.errors ?? [];
  return { error: `${route} ${status}: ${first?.instancePath || '(corpo)'} ${first?.message} (${path})` };
}
