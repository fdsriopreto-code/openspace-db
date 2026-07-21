# OpenSpace-DB

> Infraestrutura de backend modular, open source e nativa para IA — instale Postgres, Storage, Redis, Filas, Auth e mais em minutos, e deixe agentes de IA administrarem tudo via MCP.

OpenSpace-DB **não é um clone do Supabase**. É uma plataforma de infraestrutura para desenvolvedores construída em torno de três ideias centrais:

1. **Modularidade radical** — nada além do Core é obrigatório. Cada peça (Storage, Redis, Filas, pgvector, Observabilidade...) é um plugin instalável/removível independentemente.
2. **Nativa para IA desde o design** — um MCP Server oficial expõe toda a infraestrutura como ferramentas que um agente de IA pode chamar com segurança, com confirmação obrigatória para ações destrutivas e auditoria completa.
3. **Developer experience em primeiro lugar** — instalação em um comando, dashboard moderno, CLI completa, SDKs gerados automaticamente.

## Status do projeto

📐 **Fase de arquitetura.** Este repositório contém a especificação técnica completa (RFC/ADRs) antes de qualquer implementação. Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para o documento principal.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | RFC completo: monorepo, módulos, comunicação, deploy |
| [docs/PLUGINS.md](docs/PLUGINS.md) | Sistema de plugins: manifesto, ciclo de vida, SDK |
| [docs/MCP.md](docs/MCP.md) | MCP Server: ferramentas, transporte, segurança |
| [docs/SECURITY.md](docs/SECURITY.md) | RBAC, auditoria, confirmação de ações destrutivas |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema do control-plane |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Padrões de código, testes, CI/CD |
| [ROADMAP.md](ROADMAP.md) | Versões v0.1 → v1.0 |
| [docs/adr/](docs/adr/) | Registro das decisões arquiteturais (ADRs) |

## Stack

**Frontend:** React · Vite · TypeScript · Tailwind · shadcn/ui · React Query
**Backend:** Node.js · Fastify · TypeScript · Prisma
**Infra:** PostgreSQL · MinIO · Redis · BullMQ · Docker Compose
**IA:** MCP Server oficial (TypeScript SDK)
**Monorepo:** Turborepo + pnpm

## Licença

[Apache License 2.0](LICENSE) — ver [ADR-0001](docs/adr/0001-license.md) para a justificativa.
