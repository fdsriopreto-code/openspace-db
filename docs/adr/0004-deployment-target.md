# ADR-0004 — Deploy v1: Docker Compose single-node

**Status:** Aceito

## Contexto

O requisito central do projeto é "instalar toda a infraestrutura em poucos minutos" com um comando único. É preciso decidir a unidade de deploy prioritária para a versão 1.0.

## Decisão

O v1.0 tem como alvo exclusivo **self-host single-node via Docker Compose**. Kubernetes/Helm fica fora do escopo do v1.0.

## Justificativa

- O caso de uso primário descrito na especificação (`curl ... | bash`, instalador que sobe tudo automaticamente, "sem que o usuário precise configurar dezenas de arquivos") é diretamente resolvido por Docker Compose num único host — é o modelo mental mais simples possível de instalação e o que mais rapidamente entrega a experiência "poucos minutos".
- Kubernetes traria complexidade desproporcional nesta fase: Helm charts, operators, gestão de storage classes, ingress — nenhum desses problemas existe no público-alvo inicial (devs e pequenos times rodando em uma VPS ou máquina local).
- Compose permite compor dinamicamente `docker-compose.yml` (Core) + fragmentos por plugin habilitado, que é exatamente o modelo de instalação incremental de plugins descrito em [docs/PLUGINS.md](../PLUGINS.md) — não exige reescrever a estratégia de deploy para suportar o sistema de plugins.

## Alternativas consideradas

- **Kubernetes/Helm desde o v1** — mais adequado para produção multi-nó e alta disponibilidade, mas dobraria o escopo de engenharia necessário para a primeira versão estável (duas estratégias de deploy para manter em paralelo, testar e documentar). Adiado para pós-v1.0 como um plugin/operator dedicado (`openspace-k8s-operator`, ver [ROADMAP.md](../ROADMAP.md)), quando o Core e o sistema de plugins já estiverem estáveis o suficiente para não mudar sob o operator.

## Consequências

- A CLI e o Core API orquestram `docker compose -f docker-compose.yml -f docker-compose.<plugin>.yml ...` diretamente — não há camada de abstração de orquestrador genérica no v1.
- Escalabilidade horizontal e alta disponibilidade não são garantias do v1.0; isso deve ser comunicado claramente na documentação pública para não gerar expectativa incorreta.
- A arquitetura interna (Core API stateless, plugins `service` isolados por container) é desenhada para não impedir uma futura migração para Kubernetes — mas essa migração não é implementada nem testada até o roadmap indicar.
