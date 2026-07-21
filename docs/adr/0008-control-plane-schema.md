# ADR-0008 — Control-plane em schema dedicado, não banco separado

**Status:** Aceito

## Contexto

Os metadados do OpenSpace-DB (usuários, roles, plugins, audit log) precisam viver em algum lugar do Postgres. As opções são: um banco de dados Postgres totalmente separado (`openspace_control`) ou um schema dedicado (`openspace`) dentro do mesmo banco/instância que hospeda os dados do usuário.

## Decisão

Control-plane vive no schema **`openspace`**, dentro da mesma instância e do mesmo banco lógico usado pelo usuário.

## Justificativa

- Simplicidade operacional: o instalador provisiona **uma** instância Postgres, não duas. Isso é diretamente alinhado ao requisito de instalação em poucos minutos sem configuração manual.
- Backups, réplicas e monitoramento de disco cobrem automaticamente tanto o control-plane quanto os dados do usuário sem configuração dupla.
- Padrão já validado por ferramentas comparáveis (o Supabase usa schemas internos como `auth`, `storage`, `realtime` dentro do mesmo banco) — reduz risco de superfície nova de bugs de infraestrutura.
- Isolamento lógico (não físico) via schema já é suficiente para o objetivo real: impedir que o usuário edite acidentalmente tabelas internas pela Dashboard, o que é resolvido simplesmente ocultando `openspace` do schema browser por padrão (ver [docs/DATABASE.md](../DATABASE.md)).

## Alternativas consideradas

- **Banco separado dedicado ao control-plane** — isolamento mais forte (útil se algum dia o control-plane precisar escalar/replicar independentemente dos dados do usuário), mas dobra a complexidade de provisionamento e de connection pooling no instalador desde o v0.1, sem benefício percebido pelo usuário nesta fase. Fica como possível evolução se um cenário de multi-tenant/multi-projeto (roadmap pós-v1) exigir isolamento mais forte entre o control-plane e N bancos de projeto.

## Consequências

- Todo acesso do Prisma ao control-plane é explicitamente escopado ao schema `openspace` (`schema.prisma` com `@@schema("openspace")` via *multi-schema support* do Prisma).
- Um usuário com acesso direto ao Postgres (fora da Dashboard) pode, tecnicamente, ver e alterar o schema `openspace` — isso é aceito como trade-off de simplicidade; a documentação deve alertar claramente que o schema `openspace` é gerenciado pelo sistema e não deve ser editado manualmente.
- Migração futura para banco separado (se necessária) é possível sem mudança de modelo de dados, apenas de connection string — o desenho não impede essa evolução.
