# Sistema de Plugins

## 1. Tipos de plugin

| Tipo | Onde roda | Exemplos | Como se comunica com o Core API |
|---|---|---|---|
| **Library** | No mesmo processo do Core API, como um plugin Fastify encapsulado | pgvector, AI Gateway (proxy fino) | Chamada de função direta |
| **Service** | Container Docker próprio, processo independente | MinIO, Redis, BullMQ, Elasticsearch, RabbitMQ, Kafka | HTTP interno na rede Docker `openspace_internal` |

Essa distinção existe porque forçar tudo a rodar in-process acoplaria o Core à disponibilidade de cada dependência pesada (ex.: um crash do driver do Elasticsearch não pode derrubar a API). Plugins `service` isolam blast radius; plugins `library` evitam overhead de rede para operações triviais.

## 2. Manifesto do plugin

Todo plugin exporta um objeto `PluginManifest` (tipado em `packages/plugin-sdk`):

```ts
export interface PluginManifest {
  id: string;                    // "storage-minio" — único, kebab-case
  name: string;                  // "MinIO Storage"
  version: string;               // semver do plugin
  type: "library" | "service";
  icon: string;                  // nome do ícone (lucide-react)
  provides: string[];            // tags de capacidade: ["storage"]
  requires?: string[];           // ids de outros plugins exigidos
  conflictsWith?: string[];      // ids incompatíveis

  install(ctx: InstallContext): Promise<void>;
  uninstall(ctx: InstallContext): Promise<void>;
  migrate?(ctx: MigrateContext): Promise<void>;
  healthCheck(ctx: RuntimeContext): Promise<HealthStatus>;

  registerApi?(app: FastifyInstance, ctx: RuntimeContext): void;
  registerMcpTools?(registry: McpToolRegistry, ctx: RuntimeContext): void;

  dashboard?: {
    navItem: { label: string; icon: string; path: string };
    routes: DashboardRouteDescriptor[];  // lazy-loaded via import()
  };

  compose?: ComposeFragment;      // serviços docker-compose contribuídos
  permissions?: PermissionDescriptor[]; // permissões próprias do plugin (RBAC)
  configSchema?: ZodSchema;       // validação da config do plugin
}
```

## 3. Ciclo de vida

```
discovered → installing → installed → migrating → enabled ⇄ disabled → uninstalling → removed
                  │                                    │
                  └──────────── falha ─────────────────┘
                           (rollback automático)
```

- **discovered**: plugin presente no workspace `plugins/*`, ainda não ativado nesta instância.
- **installing**: `install()` roda — sobe container(s) via `compose`, gera credenciais/segredos, cria volumes/buckets iniciais, testa conectividade.
- **migrating**: `migrate()` roda migrações de schema (se o plugin tiver estado próprio no Postgres, ex.: tabela de config).
- **enabled**: plugin ativo — rotas de API, ferramentas MCP e rotas de Dashboard registradas.
- **disabled**: containers parados, mas dados e config preservados (permite reativar sem reinstalar).
- **uninstalling**: `uninstall()` roda — por padrão preserva dados; purge total exige confirmação explícita separada ("Remover e apagar dados").

Todo o ciclo é orquestrado pelo Core API (`POST /api/plugins/:id/{install,enable,disable,uninstall}`), nunca diretamente pela CLI ou Dashboard — ambos apenas chamam esse endpoint. Isso elimina divergência entre "instalar pela UI" e "instalar pela CLI".

## 4. Registro em runtime (decisão v1)

Ver [ADR-0005](adr/0005-plugin-architecture.md). Em v1, habilitar/desabilitar um plugin:

1. Atualiza a linha do plugin na tabela `openspace.plugins` (status).
2. Regenera `plugin-registry.generated.ts` (lista de plugins habilitados e seus imports estáticos).
3. Reinicia os containers `api` e `dashboard` de forma controlada (o usuário vê um toast "Aplicando plugin... reiniciando serviços", não um erro).

Isso é mais simples e previsível do que module federation em runtime, ao custo de um restart curto (segundos) ao (des)ativar um plugin. Runtime hot-load fica para v2, quando plugins de terceiros passarem a ser instalados fora do monorepo.

## 5. Contrato de permissões

Cada plugin declara suas próprias permissões RBAC (ex.: `storage:upload`, `storage:delete`), que são registradas no motor central de autorização (`packages/auth-core`) no momento do `install()`. O plugin nunca implementa seu próprio middleware de autorização — sempre delega ao Core.

## 6. Plugins do catálogo inicial

| Plugin | Tipo | Capacidade (`provides`) |
|---|---|---|
| storage-minio | service | storage |
| redis | service | cache, kv |
| queue-bullmq | service | queue (requer `redis`) |
| pgvector | library | vector-search (requer Postgres ≥ versão X) |
| realtime | service | realtime (roadmap pós-v1) |
| smtp | library | email |
| s3-external | library | storage-external (alternativa a MinIO) |
| elasticsearch | service | search |
| rabbitmq | service | queue-alt |
| kafka | service | streaming |
| edge-functions | service | compute |
| ai-gateway | library | ai-proxy |
| backups | library | backup |
| observability | service | metrics (Prometheus + Grafana opcional) |
