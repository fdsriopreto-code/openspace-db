# ADR-0003 — Backend: Fastify em vez de Express

**Status:** Aceito

## Contexto

O Core API precisa suportar um volume alto de plugins registrando rotas dinamicamente, validação de schema rigorosa (entrada de ferramentas MCP e de formulários da Dashboard), e streaming/WebSocket para logs e métricas em tempo real.

## Decisão

Usar **Fastify** como framework HTTP do Core API e de qualquer plugin `service` que exponha uma API própria.

## Justificativa

- **Encapsulamento de plugins nativo**: o sistema de plugins do próprio Fastify (`fastify.register()`, contexto isolado por encapsulamento) mapeia quase 1:1 para o modelo de plugins do OpenSpace-DB descrito em [docs/PLUGINS.md](../PLUGINS.md) — cada plugin registra suas rotas num contexto isolado, sem vazar decorators/hooks para o resto da aplicação por acidente.
- **Validação de schema em primeira classe** (JSON Schema / TypeBox / Zod via adapter): crítico porque toda ferramenta MCP e todo endpoint mutável precisa de validação de entrada rigorosa antes de tocar RBAC e auditoria.
- **Performance**: benchmarks consistentes mostram Fastify com throughput significativamente maior que Express para o padrão de carga esperado (muitas rotas pequenas, JSON in/out, WebSocket).
- **Suporte de primeira classe a plugins de terceiros do ecossistema** (`@fastify/websocket`, `@fastify/jwt`, `@fastify/swagger` para gerar o OpenAPI automaticamente do v0.9).

## Alternativas consideradas

- **Express** — ecossistema maior e mais familiar, mas sem sistema de encapsulamento/plugin nativo equivalente; validação de schema é sempre um pacote de terceiros com integração mais frouxa. Descartado porque o encapsulamento nativo do Fastify é uma correspondência direta e não-acidental com o requisito central do projeto (plugins isolados).

## Consequências

- Toda a equipe (e contribuidores de plugin) precisa aprender o modelo de encapsulamento do Fastify (`register`, `decorate`, hooks por contexto) — documentado em [docs/PLUGINS.md](../PLUGINS.md) e no guia de contribuição de plugins.
- Geração de OpenAPI (`docs/ARCHITECTURE.md §9`, roadmap v0.9) usa `@fastify/swagger`, evitando manter spec OpenAPI manualmente.
