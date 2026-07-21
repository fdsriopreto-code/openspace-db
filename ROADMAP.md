# Roadmap

Cada versão é entregável e usável isoladamente — nenhuma depende de trabalho "invisível" acumulado de versões futuras.

## v0.1 — Fundação
- Scaffold do monorepo (Turborepo + pnpm, `packages/config`, `packages/shared-types`).
- Core API (Fastify) com health check e estrutura de plugin registry (vazia).
- Schema `openspace` inicial via Prisma: `users`, `roles`, `sessions`, `audit_log`.
- Auth básica: email/senha, JWT + refresh, primeiro admin criado no install.
- Dashboard shell: login, layout com menu lateral, tema claro/escuro.
- CLI: `openspace init` e `openspace install` (só Core: Postgres + API + Dashboard via Docker Compose).
- **Sem plugins ainda.**

## v0.2 — Módulo de Banco de Dados
- Schema browser: bancos, schemas, tabelas, colunas, índices, FKs, views, functions, triggers, extensions.
- Editor SQL com histórico e autocomplete básico.
- Explain Analyze, queries lentas, locks, conexões, tamanho de tabelas/disco.
- CRUD visual sobre registros, exportação e importação CSV.

## v0.3 — Sistema de Plugins + Storage
- `packages/plugin-sdk` v1 e motor de ciclo de vida (`install/enable/disable/uninstall`) no Core API.
- UI de gestão de plugins na Dashboard.
- Plugin `storage-minio` completo: buckets, pastas, arquivos, preview (imagem/PDF/vídeo), upload/download, mover, excluir, espaço usado, permissões, logs.

## v0.4 — Redis + Filas
- Plugin `redis`: uso de memória, keys, TTL, namespaces, busca/edição/exclusão de chave, flush, monitor.
- Plugin `queue-bullmq`: filas, jobs (ativos/falhados/concluídos), retry, cancelar, criar fila, monitoramento em tempo real via WebSocket.

## v0.5 — MCP Server v1
- `apps/mcp-server` com transporte `stdio`.
- Namespaces `db.*`, `storage.*`, `redis.*`, `queue.*`.
- Service tokens com escopos, fluxo de confirmação de ações destrutivas, auditoria ponta a ponta.
- CLI: `openspace mcp start`.

## v0.6 — Auth expandida + RBAC completo
- OAuth (Google, GitHub, Microsoft), Magic Link, OTP (requer plugin `smtp`).
- UI completa de papéis/permissões, gestão de usuários.
- Modo "produção" com travas configuráveis.

## v0.7 — Observabilidade + Gestão de Docker
- Plugin `observability` (Prometheus + Grafana opcional).
- Lista de containers, logs, restart, CPU/RAM/disco, health checks.
- Namespace MCP `infra.*` (`docker_logs`, `restart_container`, `server_metrics`, `tail_logs`, `health_check`).

## v0.8 — pgvector + AI Gateway
- Plugin `pgvector`: instalação da extensão, validação de versão, API de embeddings, busca vetorial na Dashboard.
- Plugin `ai-gateway`: proxy para provedores de modelo, gestão de chaves.
- Namespace MCP `test.*`.

## v0.9 — APIs, SDKs e Backups
- Geração automática de REST API documentada (OpenAPI) por projeto.
- SDKs gerados: TypeScript, Node, Python, Go.
- Plugin `backups`: backup/restore agendado e sob demanda, namespace MCP `backup.*`.
- Plugin `edge-functions` (primeira versão, execução simples).
- Transporte MCP HTTP/Streamable HTTP (uso remoto).

## v1.0 — Hardening e GA
- Auditoria de segurança completa (interna + idealmente externa antes do anúncio público).
- Cobertura de testes em Core + todos os plugins oficiais, com foco em fluxos destrutivos/confirmação.
- Site de documentação público (`apps/docs-site`) completo.
- Garantias de compatibilidade de upgrade entre versões (migrações testadas).
- SDK de plugins estável sob semver — plugins de terceiros passam a ser suportados oficialmente.
- Lançamento público.

## Pós-v1.0 (v1.x / v2 — não comprometido)
- Kubernetes/Helm chart ou operator.
- Multi-projeto / multi-tenant.
- Plugins: Elasticsearch, RabbitMQ, Kafka, Realtime (replicação lógica → WebSocket).
- Marketplace/registro remoto de plugins de terceiros.
- Runtime hot-load de plugins (module federation), substituindo o modelo build-time do v1.
