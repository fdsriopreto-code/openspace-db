# MCP Server

## 1. Princípio central

> O MCP Server não é um caminho privilegiado. É um cliente autenticado do Core API, como qualquer outro.

Toda ferramenta MCP é implementada como uma chamada HTTP ao Core API usando um **service token** com role `ServiceAccount`. Isso significa: se uma ação está bloqueada para o papel `Developer` via RBAC, ela também está bloqueada para uma ferramenta MCP chamada por um agente autenticado com um token de papel equivalente. Não existe lógica de negócio duplicada no MCP Server — ver [ADR-0006](adr/0006-mcp-thin-client.md).

## 2. Transporte

- **v0.5 (primeira versão):** `stdio` — para uso local com Claude Code / Claude Desktop, processo filho spawnado pela CLI (`openspace mcp start`).
- **v0.9+:** HTTP + Streamable HTTP (substituindo SSE legado) — para uso remoto/multiusuário, embutido como um "AI Chat" opcional dentro da própria Dashboard.

Ambos os transportes usam o mesmo core de ferramentas (`packages/plugin-sdk` + registro central) — o transporte é só a camada de borda.

## 3. Autenticação

- Cada instância de MCP Server é provisionada com um **service token** gerado no momento da instalação (`openspace mcp start` gera um token com role `mcp-agent` se ainda não existir, escopado ao projeto).
- O token é passado via variável de ambiente ao processo MCP, nunca hardcoded.
- Tokens de serviço são revogáveis a qualquer momento pelo Dashboard (`Settings → API Keys`), sem precisar reiniciar o Core.
- Cada role pode ter um conjunto de escopos: `read`, `write`, `admin`, `destructive`. Um token `mcp-agent` padrão nasce com `read + write`, sem `destructive` — habilitar ações destrutivas via IA é uma escolha explícita do administrador.

## 4. Catálogo de ferramentas

Organizadas por namespace, mapeando 1:1 para grupos de endpoints do Core API:

### `db.*`
- `db.list_tables()`
- `db.describe_table(schema, table)`
- `db.get_schema()`
- `db.run_sql(query)` — `SELECT` executa direto; DDL/DML mutável exige confirmação (§6)
- `db.explain_analyze(query)`
- `db.slow_queries()`
- `db.locks()`
- `db.connections()`

### `storage.*`
- `storage.list_buckets()`
- `storage.list_files(bucket, prefix?)`
- `storage.upload_file(bucket, path, content)`
- `storage.download_file(bucket, path)`
- `storage.delete_file(bucket, path)` — destrutivo

### `redis.*`
- `redis.keys(pattern?)`
- `redis.get(key)`
- `redis.set(key, value, ttl?)`
- `redis.delete(key)` — destrutivo
- `redis.flush()` — destrutivo, bloqueado por padrão em produção
- `redis.monitor(durationSeconds)`

### `queue.*`
- `queue.list_jobs(queueName, status?)`
- `queue.retry_job(jobId)`
- `queue.cancel_job(jobId)` — destrutivo

### `infra.*`
- `infra.docker_logs(containerId, lines?)`
- `infra.restart_container(containerId)` — destrutivo em produção
- `infra.health_check()`
- `infra.server_metrics()`
- `infra.tail_logs(service, durationSeconds)`

### `deploy.*`
- `deploy.run_migrations()` — destrutivo
- `deploy.run_seed()` — destrutivo
- `deploy.deploy_project()` — destrutivo

### `backup.*`
- `backup.backup_database()`
- `backup.restore_database(backupId)` — destrutivo, sempre exige confirmação mesmo com escopo `destructive` habilitado

### `test.*`
- `test.test_storage()`, `test.test_redis()`, `test.test_database()`, `test.test_api()` — somente leitura, sempre permitido

## 5. Descoberta dinâmica de ferramentas

Cada plugin habilitado pode contribuir suas próprias ferramentas via `registerMcpTools()` no manifesto ([docs/PLUGINS.md](PLUGINS.md)). O MCP Server consulta o Core API na inicialização (`GET /api/mcp/tools`) para montar a lista de ferramentas disponíveis **para aquela instância especificamente** — um usuário sem o plugin Kafka habilitado nunca vê ferramentas `kafka.*`. Isso mantém o "contexto" oferecido à IA proporcional ao que está realmente instalado.

## 6. Confirmação de ações destrutivas

Toda ferramenta marcada `destructive: true` no registro segue um fluxo de duas fases, independente do cliente MCP usado (garante funcionamento mesmo em clientes sem suporte a *elicitation*):

1. A IA chama a ferramenta normalmente (ex.: `redis.flush()`).
2. O Core API **não executa** — responde com um preview legível (`"Isso vai apagar 14.302 chaves do Redis em produção. Confirme com confirm_action(token)"`) e um `confirmation_token` de curta duração (2 minutos).
3. A IA (ou o humano supervisionando a conversa) chama `confirm_action(token)`.
4. Só então o Core API executa e grava no `audit_log`.

Em clientes MCP que suportam *elicitation* (MCP spec), o passo 2–3 pode ser substituído por um prompt nativo ao usuário; o fallback token-based garante que a garantia de segurança não dependa de suporte opcional do cliente.

## 7. Modo produção

Quando o projeto está marcado como `environment: production` (`Settings → Environment`):

- Todas as ferramentas destrutivas exigem confirmação, **mesmo que o token tenha escopo `destructive`**.
- Um subconjunto configurável (`redis.flush`, `backup.restore_database`, `deploy.deploy_project` por padrão) pode ser **travado** via toggle no Dashboard — travado significa que nem confirmação resolve; é preciso destravar manualmente primeiro.

## 8. Auditoria

Toda chamada de ferramenta MCP grava em `openspace.audit_log`: identidade do token de serviço, nome da ferramenta, parâmetros (com redaction de campos sensíveis), resultado, timestamp, ambiente. O mesmo registro é usado pelo Dashboard para mostrar "atividade recente de IA" lado a lado com atividade humana.
