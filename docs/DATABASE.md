# Banco de dados — Control Plane

## 1. Princípio

O control-plane (metadados do próprio OpenSpace-DB) vive num **schema dedicado `openspace`**, dentro da mesma instância PostgreSQL que hospeda os dados do usuário (schema `public` e outros). Não é um banco separado. Justificativa: [ADR-0008](adr/0008-control-plane-schema.md).

Consequência prática: o schema browser da Dashboard **oculta** o schema `openspace` por padrão (como o Supabase faz com `auth`/`storage`), para não confundir o usuário com tabelas internas.

## 2. Tabelas principais (`openspace.*`)

### `users`
`id, email, password_hash, name, avatar_url, created_at, updated_at, last_login_at`

### `roles`
`id, name (Owner|Admin|Developer|ReadOnly|ServiceAccount), description`

### `user_roles`
`user_id, role_id` (many-to-many — permite múltiplos papéis por usuário no futuro multi-projeto)

### `role_permissions`
`role_id, resource, action` (ex.: `resource=db`, `action=write`)

### `sessions`
`id, user_id, refresh_token_hash, ip, user_agent, created_at, expires_at, revoked_at`

### `api_keys`
`id, name, token_hash, role_id, scopes (text[]), created_by, expires_at, revoked_at, last_used_at`
— usada tanto para tokens de CI/automação quanto para o service token do MCP (`type = 'mcp'`).

### `plugins`
`id, version, type (library|service), status (discovered|installing|installed|enabled|disabled|uninstalling|error), installed_at, enabled_at, error_message`

### `plugin_configs`
`plugin_id, config (jsonb)` — config não-sensível; segredos ficam em env vars, não aqui (ver [SECURITY.md §6](SECURITY.md#6-segredos)).

### `audit_log`
`id, actor_type (user|service_account), actor_id, action, resource, params_redacted (jsonb), result (ok|denied|error), ip, environment, created_at`
— append-only.

### `projects`
`id, name, environment (development|staging|production), created_at`
— v1 assume single-project por instância; a tabela já existe para permitir multi-projeto sem migração de breaking change no roadmap pós-v1.

### `containers`
`id, service_name, plugin_id (nullable p/ containers do Core), status, last_health_check_at`
— cache do estado observado via Docker API, usado pelo módulo de Observabilidade e pelas ferramentas MCP `infra.*`.

### `backups`
`id, database, size_bytes, status (pending|completed|failed), storage_path, created_at, created_by`

### `migrations_history`
`id, plugin_id (nullable p/ migrations do Core), name, applied_at`

## 3. Dados do usuário

Os schemas fora de `openspace` (tipicamente `public`, e quaisquer outros criados pelo usuário) são **desconhecidos em tempo de build** — não têm modelo Prisma. O módulo "Banco de Dados" da Dashboard e as ferramentas MCP `db.*` acessam esses dados via:

- `pg` (node-postgres) para execução de queries arbitrárias (`db.run_sql`, editor SQL).
- Consultas a `information_schema` / `pg_catalog` para introspecção (tabelas, colunas, índices, FKs, views, functions, triggers, policies, extensions).

Essa é a razão de usarmos Prisma **apenas** para o control-plane — ver [ADR-0007](adr/0007-orm-strategy.md).

## 4. Extensões

`pgvector` é a única extensão gerenciada nativamente pelo Core (via plugin `pgvector`, que roda `CREATE EXTENSION IF NOT EXISTS vector` e valida a versão mínima do Postgres). Outras extensões podem ser habilitadas manualmente pelo usuário via editor SQL; a Dashboard lista extensões instaladas independentemente de terem sido habilitadas por um plugin ou manualmente.
