# ADR-0002 — Monorepo: Turborepo + pnpm

**Status:** Aceito

## Contexto

O projeto terá dezenas de pacotes independentes (apps, packages internos, plugins) que precisam ser buildados, testados e versionados de forma eficiente, com plugins evoluindo em ritmos diferentes do Core.

## Decisão

Usar **pnpm workspaces** para gestão de dependências e **Turborepo** para orquestração de build/test/lint com cache incremental.

## Justificativa

- pnpm usa hard links/symlinks e um store de conteúdo endereçável — instalação de dependências drasticamente mais rápida e econômica em disco do que npm/yarn clássico, importante com dezenas de pacotes de plugin.
- Turborepo calcula o *affected graph*: um PR que só muda `plugins/redis` não re-testa o monorepo inteiro. Isso é essencial dado o volume de plugins independentes planejado.
- Curva de aprendizado baixa e configuração declarativa simples (`turbo.json`), adequada para um projeto que quer atrair contribuidores externos rapidamente.
- Mantido ativamente pela Vercel, com bom suporte a cache remoto caso o projeto queira acelerar CI no futuro.

## Alternativas consideradas

- **Nx + pnpm** — mais robusto (geradores de código, grafo de dependência visual, melhor para monorepos enterprise muito grandes), mas com complexidade de configuração maior e opinião mais forte sobre estrutura de projeto. Descartado por ora: o ganho de robustez do Nx não compensa o atrito extra de configuração numa fase em que o projeto quer maximizar velocidade de contribuição externa. Pode ser revisitado se o número de pacotes ultrapassar a centena.
- **pnpm workspaces puro (sem orquestrador)** — mais simples, mas perde cache incremental e execução paralela inteligente. Descartado porque o cenário central do projeto (plugins isolados, builds frequentes e parciais) é exatamente o caso de uso que Turborepo otimiza.

## Consequências

- Todo pacote precisa de `package.json` com scripts padronizados (`build`, `test`, `lint`, `typecheck`) para o Turborepo orquestrar corretamente.
- CI usa `turbo run ... --filter=...[origin/main]` para rodar apenas o necessário por PR.
