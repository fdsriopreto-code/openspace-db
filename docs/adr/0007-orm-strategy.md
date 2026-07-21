# ADR-0007 — Prisma só para control-plane; introspecção crua para dados do usuário

**Status:** Aceito

## Contexto

O Core precisa gerenciar dois tipos de dado no mesmo Postgres: (1) seu próprio metadado (usuários, plugins, audit log) e (2) o schema arbitrário e desconhecido do usuário, que o módulo "Banco de Dados" e as ferramentas MCP `db.*` precisam explorar e manipular livremente.

## Decisão

**Prisma** é usado exclusivamente para o schema `openspace` (control-plane), com um `schema.prisma` fixo versionado em `packages/core-db`. Todo acesso a dados do usuário (schemas fora de `openspace`) usa **`pg` (node-postgres) diretamente**, com introspecção via `information_schema`/`pg_catalog`.

## Justificativa

- Prisma exige um schema conhecido em tempo de geração de client — incompatível por definição com o requisito de administrar *qualquer* schema que o usuário criar, incluindo tabelas criadas depois da instalação. Usar Prisma para dados do usuário exigiria regenerar e re-buildar o client a cada mudança de schema do usuário, o que é inviável para um editor SQL genérico.
- Para o control-plane, que **é** um schema fixo e controlado pelo projeto, Prisma dá migrações tipadas, type-safety e DX excelente — exatamente o cenário para o qual a ferramenta foi desenhada.
- Separar claramente "o que é meu schema" (Prisma) de "o que é schema do usuário" (SQL cru + introspecção) evita a tentação de misturar as duas responsabilidades no mesmo client, o que historicamente gera bugs sutis de permissão (uma query genérica "vazando" para dentro do schema de controle).

## Alternativas consideradas

- **Prisma para tudo, com introspecção dinâmica (`prisma db pull` sob demanda)** — tecnicamente possível, mas caro (regenerar client em runtime não é um caso de uso suportado de forma robusta pelo Prisma) e ainda assim não resolveria queries verdadeiramente arbitrárias digitadas no editor SQL. Rejeitado.
- **Knex ou Drizzle para tudo** — unificaria a stack de acesso a dados, mas perderia a DX de migração declarativa do Prisma para o control-plane, que é pequeno, estável e se beneficia exatamente dessa robustez. Rejeitado por não trazer ganho real dado que os dois domínios (control-plane vs. dados do usuário) já são naturalmente separados.

## Consequências

- Dois padrões de acesso a dados coexistem no Core API — deve ficar claro em `docs/CODING_STANDARDS.md` e no código (`packages/core-db` vs. um módulo `db-introspection` dedicado) qual usar em cada caso, para não haver ambiguidade para novos contribuidores.
- Migrações do control-plane seguem o fluxo padrão do Prisma (`prisma migrate`); migrações do usuário (`deploy.run_migrations` via MCP) são responsabilidade do próprio usuário/projeto, o Core apenas executa o que for configurado (ex.: um diretório de migrations SQL do projeto do usuário).
