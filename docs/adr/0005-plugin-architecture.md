# ADR-0005 — Plugins: registro build-time/restart-time, não hot-load em runtime (v1)

**Status:** Aceito

## Contexto

O sistema de plugins precisa decidir *quando* e *como* uma rota de Dashboard ou API contribuída por um plugin passa a existir de fato: em tempo real sem reiniciar nada (module federation / carregamento dinâmico verdadeiro) ou via um passo de rebuild/restart controlado.

## Decisão

No v1, (des)ativar um plugin **regenera um registro estático** (`plugin-registry.generated.ts`) e reinicia de forma controlada os containers `api` e `dashboard`. Não há carregamento dinâmico de código em runtime (sem module federation, sem `import()` de pacotes ainda não presentes na imagem).

## Justificativa

- Module federation (Webpack/Vite) para plugins de frontend e um sistema de carregamento dinâmico de módulos Node no backend são soluções complexas, com superfície grande de bugs sutis (versões de dependências compartilhadas divergentes, isolamento de erro entre plugins, cache-busting). Resolver isso corretamente é um projeto por si só.
- O ciclo de vida real do usuário ("clico em Instalar Storage, espero um pouco, está pronto") já tolera um restart de poucos segundos — a especificação não exige zero-downtime na instalação de plugin, exige *simplicidade percebida*. Um restart com feedback visual claro ("Aplicando plugin... reiniciando serviços") atende isso sem a complexidade de hot-load.
- Manter o registro de plugins habilitados como um arquivo gerado e versionável simplifica debugging: o estado "quais plugins estão ativos nesta build" é sempre inspecionável como um arquivo comum, não um estado dinâmico em memória.

## Alternativas consideradas

- **Runtime hot-load via module federation** — necessário no cenário pós-v1 de "marketplace de plugins de terceiros instalados sem rebuild da imagem oficial", mas é prematuro enquanto todos os plugins do catálogo inicial vivem no próprio monorepo e são buildados junto com o Core. Fica registrado como direção de v2 no [ROADMAP.md](../ROADMAP.md), quando plugins de terceiros fora do monorepo se tornarem um requisito real.

## Consequências

- Instalar/desinstalar um plugin tem um custo perceptível (restart de containers), que deve ser comunicado na UI (estado de loading explícito, não apenas um spinner genérico).
- O `plugin-registry.generated.ts` nunca deve ser editado manualmente — é responsabilidade do orquestrador do Core API regenerá-lo a cada mudança de estado de plugin.
- Plugins de terceiros publicados fora do monorepo oficial não são suportados no v1 (exigiriam rebuild manual da imagem incluindo o pacote) — suporte oficial a isso é uma entrega do v1.0 (SDK estável) combinada com o hot-load do v2.
