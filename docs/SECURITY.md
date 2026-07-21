# Segurança

## 1. Papéis (RBAC)

| Papel | Descrição |
|---|---|
| `Owner` | Controle total, único papel que pode remover a instância ou transferir ownership |
| `Admin` | Gestão total de plugins, usuários, config — exceto operações de ownership |
| `Developer` | Leitura/escrita em dados e recursos de dev (DB, storage, filas), sem gestão de usuários/plugins |
| `ReadOnly` | Apenas leitura em todos os módulos |
| `ServiceAccount` | Papel para tokens de serviço (CI, MCP). Sempre escopado explicitamente (`read`/`write`/`admin`/`destructive`), nunca herda papel humano por padrão |

Permissões são resource-scoped (`db:*`, `storage:*`, `redis:*`, `queue:*`, `infra:*`, `plugins:*`, `users:*`) e compostas por papel + escopos do token. O motor de autorização vive em `packages/auth-core` e é o **único** ponto de decisão de acesso — REST, WebSocket e MCP chamam a mesma função `can(actor, action, resource)`.

## 2. Autenticação

- Login por email/senha (Argon2id para hash) no Core.
- JWT de acesso, curto (15 min), assinado com segredo gerado na instalação.
- Refresh token rotativo, httpOnly + Secure cookie, revogável via tabela `sessions`.
- OAuth (Google, GitHub, Microsoft), Magic Link e OTP são capacidades habilitáveis (dependem do plugin SMTP para envio), mas o motor de sessão/JWT é sempre o do Core — plugins de auth não reimplementam emissão de token.
- Tokens de serviço (API Keys / MCP) são opacos, hash armazenado (nunca plaintext), com escopos e expiração opcional.

## 3. Ações destrutivas

Regra transversal, válida para Dashboard, CLI **e** MCP:

> Qualquer ação que apague dados, sobrescreva irreversivelmente, ou pare um serviço em produção exige confirmação explícita em duas fases.

Para humanos: modal de confirmação com o preview do impacto (ex.: "3.204 linhas serão apagadas"). Para IA via MCP: fluxo de `confirmation_token` descrito em [docs/MCP.md §6](MCP.md#6-confirmação-de-ações-destrutivas). O mesmo endpoint de backend (`POST /api/actions/:token/confirm`) atende os dois casos — não há dois mecanismos de confirmação.

## 4. Modo produção

Um projeto marcado `production` no Dashboard:

- Exige confirmação em 100% das ações destrutivas, independentemente de papel ou escopo.
- Permite travar operações específicas (flush de cache, restore de backup, redeploy) até destrave manual.
- Reduz automaticamente o TTL de tokens de serviço recém-criados.
- É exibido com um indicador visual persistente no Dashboard (evita "cliquei sem perceber que era prod").

## 5. Auditoria

- `openspace.audit_log` é append-only (sem `UPDATE`/`DELETE` a nível de aplicação; a tabela pode ter uma política Postgres que rejeita esses comandos mesmo para o role de aplicação).
- Cada linha: `actor_type` (user | service_account), `actor_id`, `action`, `resource`, `params_redacted`, `result`, `ip`, `environment`, `created_at`.
- Toda chamada MCP e toda operação mutável do Core API grava uma linha, sem exceção — inclusive tentativas negadas por RBAC (`result: denied`), o que é o principal sinal para detectar uso indevido de um token de IA.

## 6. Segredos

- Gerados no `install()` de cada módulo/plugin: senha do Postgres, secret de assinatura JWT, access/secret key do MinIO, senha do Redis.
- Armazenados em `.env` na raiz da instalação (fora do controle de versão), montado como env vars nos containers.
- Nunca persistidos em texto plano em nenhuma tabela do control-plane — a tabela `plugin_configs` guarda apenas referências/metadata, não o segredo bruto, quando o segredo já existe como env var do container correspondente.
- Um plugin "Vault" (HashiCorp Vault ou similar) é candidato de roadmap pós-v1 para instalações que exigem rotação/gestão centralizada de segredos.

## 7. Superfície de rede

- Apenas Dashboard, Core API e (opcionalmente) MCP em modo HTTP são expostos fora da rede Docker interna.
- MinIO, Redis, BullMQ, Elasticsearch, Postgres etc. residem exclusivamente na rede `openspace_internal` — nenhuma porta é publicada no host por padrão. Acesso direto (ex.: para debug com um client Redis externo) é uma escolha explícita via config, nunca o padrão.
