# RFC-0001 — Arquitetura do OpenSpace-DB

**Status:** Proposto
**Autor:** Arquitetura inicial (assistida por IA), a validar com o time
**Data:** 2026-07-21

## 1. Visão e princípios

OpenSpace-DB é uma plataforma de infraestrutura de backend self-hosted, modular e nativa para IA. Quatro princípios guiam toda decisão técnica deste documento:

1. **Core mínimo, tudo mais é plugin.** O Core nunca depende de um plugin. Um plugin pode depender de outro plugin ou do Core, nunca o contrário.
2. **Um único plano de autorização.** Dashboard (humano), CLI (humano/script) e MCP (IA) são três *entradas* para a mesma API. Nenhuma delas tem um caminho privilegiado que pule RBAC ou auditoria.
3. **Zero-config para o caminho feliz, config total para quem quiser.** `openspace-db install` deve funcionar sem perguntas, mas cada decisão automática deve ser sobrescrevível.
4. **Nada de mágica não observável.** Toda ação (humana ou de IA) é auditável, reversível quando possível, e nunca destrutiva sem confirmação explícita.

## 2. Estrutura do monorepo

Ferramenta: **Turborepo + pnpm workspaces** (justificativa em [ADR-0002](adr/0002-monorepo-tooling.md)).

```
openspace-db/
├── apps/
│   ├── dashboard/            # SPA React (Vite + TS + Tailwind + shadcn/ui + React Query)
│   ├── api/                  # Core API — Fastify, control plane
│   ├── mcp-server/           # MCP Server oficial
│   └── docs-site/            # site público de documentação (pós-v0.5)
│
├── packages/
│   ├── core-db/              # Prisma schema + migrations do control-plane
│   ├── plugin-sdk/           # Contratos/tipos para autores de plugins
│   ├── ui/                   # Design system compartilhado (wrappers shadcn, tema)
│   ├── config/               # eslint/tsconfig/tailwind/prettier compartilhados
│   ├── shared-types/         # DTOs, eventos, tipos cross-cutting
│   ├── auth-core/            # JWT, sessões, providers OAuth, magic link, OTP
│   ├── event-bus/            # Abstração de pub/sub (Redis Streams por baixo)
│   └── cli/                  # CLI `openspace`
│
├── plugins/
│   ├── storage-minio/
│   ├── redis/
│   ├── queue-bullmq/
│   ├── pgvector/
│   ├── realtime/
│   ├── smtp/
│   ├── s3-external/
│   ├── elasticsearch/
│   ├── rabbitmq/
│   ├── kafka/
│   ├── edge-functions/
│   ├── ai-gateway/
│   ├── backups/
│   └── observability/        # Prometheus + Grafana opcional
│
├── infra/
│   ├── docker/                # docker-compose base + fragmentos por plugin
│   └── installer/             # install.sh, install.ps1
│
├── docs/
├── examples/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

Cada pacote em `plugins/*` é um workspace independente, com seu próprio `package.json`, versionado separadamente via Changesets. Isso permite que plugins de terceiros sigam exatamente a mesma estrutura e, no futuro (pós-v1), sejam publicados fora do monorepo principal.

## 3. Módulos: Core vs. Plugins

### Core (sempre presente)

| Módulo | Responsabilidade |
|---|---|
| PostgreSQL | Banco principal do usuário + schema `openspace` (control plane) |
| API (`apps/api`) | Ponto único de autorização, orquestração de plugins, REST + WS |
| Dashboard (`apps/dashboard`) | UI de administração |
| Auth (`packages/auth-core`) | Login, JWT, sessões, RBAC base (OAuth/Magic Link entram como capacidades habilitáveis, mas o motor de auth é Core) |
| CLI (`packages/cli`) | Instalação, gestão de plugins, operações administrativas |

### Plugins (opcionais, instaláveis independentemente)

MinIO (Storage) · Redis · BullMQ (Filas) · pgvector · Realtime · SMTP · S3 Externo · Elasticsearch · RabbitMQ · Kafka · Edge Functions · AI Gateway · Backups · Observabilidade (Prometheus/Grafana)

Cada plugin declara seu **tipo** (ver [docs/PLUGINS.md](PLUGINS.md)):

- **Library plugin** — roda no mesmo processo do Core API (ex.: pgvector, que é essencialmente `CREATE EXTENSION` + algumas rotas finas).
- **Service plugin** — sobe seu próprio container e processo, expõe uma API interna que o Core API consome como client (ex.: MinIO, Redis, BullMQ, Elasticsearch, Kafka).

## 4. Sistema de plugins (resumo)

Detalhado em [docs/PLUGINS.md](PLUGINS.md). Pontos-chave:

- Manifesto tipado (`PluginManifest`) define ciclo de vida: `install → migrate → enable → healthCheck → disable → uninstall`.
- Plugins contribuem: rotas de API (Fastify encapsulation), ferramentas MCP, rotas de Dashboard, fragmentos de `docker-compose`, permissões próprias.
- **Decisão v1:** registro de plugins é *build-time/restart-time*, não *runtime hot-load* (module federation fica para v2 — ver [ADR-0005](adr/0005-plugin-architecture.md)). Instalar um plugin gera um `plugin-registry.generated.ts`, roda migrações, sobe o container e reinicia API+Dashboard de forma controlada pelo próprio orquestrador — o usuário não faz isso manualmente.
- Todo plugin é instalável tanto pela Dashboard quanto pela CLI, e ambos chamam o **mesmo endpoint** `POST /api/plugins/:id/install` do Core API — não existem dois caminhos de instalação.

## 5. Comunicação entre serviços

```
┌─────────────┐        REST + WS         ┌─────────────┐
│  Dashboard  │ ───────────────────────▶ │             │
└─────────────┘                          │             │
                                          │   Core API   │──── Prisma ───▶ PostgreSQL (schema openspace)
┌─────────────┐   REST (service token)   │  (Fastify)   │──── pg (raw) ─▶ PostgreSQL (dados do usuário)
│  MCP Server │ ───────────────────────▶ │             │
└─────────────┘                          │             │──── HTTP interno ─▶ Service plugins (MinIO/Redis/BullMQ/...)
                                          │             │
┌─────────────┐        REST + WS         │             │──── Redis Streams ─▶ Event Bus ─▶ WS Gateway / MCP notifications
│     CLI     │ ───────────────────────▶ │             │
└─────────────┘                          └─────────────┘
```

Regras:

1. **Dashboard ↔ API:** REST documentado via OpenAPI + WebSocket para dados em tempo real (tail de logs, progresso de jobs, métricas, resultados de query longos).
2. **MCP ↔ API:** o MCP Server **não tem lógica de negócio própria**. Cada ferramenta MCP é um wrapper tipado sobre um endpoint do Core API, autenticado com um *service token* de role `mcp-agent`. Isso garante que RBAC e auditoria valem igualmente para humanos e IA (ver [ADR-0006](adr/0006-mcp-thin-client.md)).
3. **API ↔ Service plugins:** HTTP interno dentro da rede Docker (`openspace_internal`), nunca exposto publicamente. O Core API é o único componente que fala diretamente com MinIO/Redis/BullMQ/etc — Dashboard e MCP nunca acessam esses serviços diretamente.
4. **Event bus:** Redis Streams para eventos internos (status de job, health de container, eventos de auditoria) consumidos por múltiplos assinantes (WS Gateway, futuras notificações MCP, observabilidade).

## 6. Segurança

Detalhado em [docs/SECURITY.md](SECURITY.md). Resumo:

- RBAC com papéis: `Owner`, `Admin`, `Developer`, `ReadOnly`, `ServiceAccount` (usado por MCP/CI).
- Um único módulo de autorização (`packages/auth-core`) usado pelos três entry points (REST, WS, MCP) — nenhuma rota bypassa esse módulo.
- Ações destrutivas (DROP, DELETE em massa, flush, restore, restart em produção) exigem confirmação explícita em duas fases, tanto para humanos quanto para IA via MCP.
- Auditoria append-only de toda ação mutável, incluindo chamadas de ferramentas MCP.
- Modo "produção" trava certas operações independentemente do papel do chamador.

## 7. Estratégia de deploy (v1)

Unidade de deploy: **Docker Compose**, single-node. Justificativa em [ADR-0004](adr/0004-deployment-target.md).

- `docker-compose.yml` (Core, sempre presente) + `docker-compose.<plugin>.yml` (um fragmento por plugin habilitado), combinados via `-f` pelo próprio CLI/API — o usuário nunca edita esses arquivos manualmente.
- Instalador (`install.sh` / `install.ps1`): detecta/instala Docker, baixa artefatos de release, chama `openspace init` (gera `.env`, segredos, primeiro admin), sobe o stack Core, abre o Dashboard no browser.
- Atualizações: `openspace update` puxa novas imagens, roda migrações pendentes do control-plane, reinicia apenas os containers afetados.
- Kubernetes/Helm: fora do escopo do v1.0, planejado como plugin/operator pós-v1 (roadmap).

## 8. Banco de dados

Detalhado em [docs/DATABASE.md](DATABASE.md). Decisão central: o control-plane (usuários, roles, plugins, audit_log, api_keys) vive num **schema dedicado `openspace`** dentro da mesma instância Postgres gerenciada pelo Core, não num banco separado — ver [ADR-0008](adr/0008-control-plane-schema.md). Dados do usuário (schemas `public` e outros) são acessados via introspecção dinâmica (`pg` driver), não via Prisma, porque o schema do usuário é arbitrário e desconhecido em tempo de build.

## 9. Padrões de código

Detalhado em [docs/CODING_STANDARDS.md](CODING_STANDARDS.md). Resumo: TypeScript strict em todo lugar, ESLint flat config + Prettier compartilhados via `packages/config`, Conventional Commits + commitlint + husky, Vitest (unit) + Playwright (e2e dashboard) + Fastify `inject` (integração de API), Changesets para versionamento independente de pacotes/plugins, CI no GitHub Actions rodando apenas o *affected graph* via Turborepo.

## 10. Roadmap

Ver [ROADMAP.md](../ROADMAP.md) para o detalhamento por versão, de v0.1 (esqueleto do Core) até v1.0 (GA).

## 11. Decisões arquiteturais (ADRs)

| ADR | Decisão |
|---|---|
| [0001](adr/0001-license.md) | Licença: Apache 2.0 |
| [0002](adr/0002-monorepo-tooling.md) | Monorepo: Turborepo + pnpm |
| [0003](adr/0003-backend-framework.md) | Backend: Fastify em vez de Express |
| [0004](adr/0004-deployment-target.md) | Deploy v1: Docker Compose single-node |
| [0005](adr/0005-plugin-architecture.md) | Plugins: registro build-time, não hot-load em runtime (v1) |
| [0006](adr/0006-mcp-thin-client.md) | MCP Server como thin client do Core API |
| [0007](adr/0007-orm-strategy.md) | Prisma só para control-plane; introspecção crua para dados do usuário |
| [0008](adr/0008-control-plane-schema.md) | Control-plane em schema dedicado, não banco separado |
| [0009](adr/0009-auth-strategy.md) | JWT curto + refresh rotativo, sessões revogáveis no control-plane |
