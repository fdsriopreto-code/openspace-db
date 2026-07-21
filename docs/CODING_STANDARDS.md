# Padrões de Código

## 1. Linguagem e tipagem

- TypeScript **strict** (`strict: true`, `noUncheckedIndexedAccess: true`) em todo o monorepo.
- `any` proibido em `packages/*` e `apps/*` fora de arquivos de teste; `unknown` + narrowing no lugar.
- Tipos compartilhados entre frontend/backend/MCP vivem em `packages/shared-types` — nunca duplicados.

## 2. Lint e formatação

- ESLint (flat config) + Prettier, configuração única em `packages/config`, consumida por todo pacote via `extends`.
- Regras de import ordenado e proibição de import circular entre `apps/*` e `plugins/*` (um plugin nunca importa de outro plugin diretamente — apenas via `packages/plugin-sdk` ou eventos do bus).
- `pnpm lint` e `pnpm typecheck` bloqueiam merge via CI.

## 3. Commits e versionamento

- **Conventional Commits** obrigatório, validado por `commitlint` + hook `husky` no `commit-msg`.
- **Changesets** para versionamento — cada pacote/plugin é versionado independentemente; um PR que muda um plugin gera um changeset descrevendo o impacto (patch/minor/major) só daquele pacote.

## 4. Testes

| Camada | Ferramenta | Escopo |
|---|---|---|
| Unit | Vitest | Funções puras, lógica de domínio, `packages/*` |
| Integração de API | Vitest + Fastify `inject` | Rotas do Core API e de cada plugin, sem subir servidor real |
| E2E Dashboard | Playwright | Fluxos críticos: login, criar plugin, editor SQL, upload de storage |
| MCP | Vitest + MCP SDK test client | Cada ferramenta testada com contrato de entrada/saída e caso de confirmação destrutiva |

Meta de cobertura: sem número arbitrário de "% global"; em vez disso, todo endpoint mutável e toda ferramenta MCP com `destructive: true` precisam de teste explícito do fluxo de confirmação — isso é checado em code review, não só em CI.

## 5. CI/CD

- GitHub Actions, com jobs `lint`, `typecheck`, `test`, `build` rodando apenas o *affected graph* calculado pelo Turborepo (`turbo run test --filter=...[origin/main]`).
- Build e push de imagens Docker (Core + cada plugin `service`) disparado em tag/release, não em todo push.
- Release automatizado via Changesets (`changesets/action`), gerando changelog por pacote.

## 6. Estrutura de um plugin (convenção)

```
plugins/<nome>/
├── src/
│   ├── manifest.ts       # PluginManifest
│   ├── routes/           # rotas Fastify contribuídas
│   ├── mcp-tools/         # ferramentas MCP contribuídas
│   ├── dashboard/         # rotas/páginas React (lazy)
│   └── migrations/        # migrações próprias do plugin (se houver estado)
├── compose.fragment.yml
├── package.json
└── README.md              # o que o plugin faz, quais env vars/segredos gera
```

## 7. Documentação obrigatória por pacote

Todo pacote em `apps/*`, `packages/*` e `plugins/*` tem um `README.md` com: propósito, como rodar localmente, variáveis de ambiente relevantes. Decisões que afetam mais de um pacote viram um ADR em `docs/adr/`, não um comentário de código.
