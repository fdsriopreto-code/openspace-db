# ADR-0001 — Licença: Apache 2.0

**Status:** Aceito

## Contexto

O projeto precisa de uma licença open source antes do primeiro commit público. As alternativas consideradas foram MIT, Apache 2.0 e AGPL-3.0.

## Decisão

Adotar **Apache License 2.0**.

## Justificativa

- Inclui concessão explícita de patente e cláusula de retaliação (Seção 3), o que protege o projeto e seus contribuidores de litígios de patente por parte de empresas que adotarem o código — relevante para um projeto de infraestrutura que empresas vão rodar em produção.
- Permissiva o bastante para maximizar adoção e contribuição externa, ao contrário de copyleft forte.
- Padrão de facto para projetos de infraestrutura cloud-native (Kubernetes, Kafka, Prometheus) — familiar para o público-alvo (desenvolvedores de plataforma).

## Alternativas consideradas

- **MIT** — mais simples, mas sem cláusula de patente. Descartada por não oferecer a mesma proteção legal em um domínio (infra/backend) onde disputas de patente são mais comuns que em bibliotecas de aplicação.
- **AGPL-3.0** — usada pelo Supabase em componentes centrais justamente para impedir que provedores de nuvem ofereçam o software como serviço sem contribuir de volta. Descartada porque o objetivo declarado do OpenSpace-DB é maximizar adoção e contribuição de plugins de terceiros; AGPL introduz atrito legal para empresas avaliarem uso interno, o que conflita com a filosofia "extremamente amigável para desenvolvedores". Pode ser revisitada no futuro para um componente "cloud" separado, se a estratégia de monetização evoluir para SaaS oficial.

## Consequências

- Contribuições de terceiros devem ser feitas sob os mesmos termos (sem CLA definido nesta fase — a definir se necessário).
- Forks fechados são permitidos; o projeto compete por adoção via qualidade e comunidade, não via restrição legal.
