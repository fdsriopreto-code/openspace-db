# ADR-0006 — MCP Server como thin client do Core API

**Status:** Aceito

## Contexto

O MCP Server é o principal diferencial do projeto: permitir que uma IA administre toda a infraestrutura. É preciso decidir se o MCP Server implementa sua própria lógica de acesso a Postgres/MinIO/Redis/Docker, ou se delega tudo ao Core API.

## Decisão

O `apps/mcp-server` **não contém lógica de negócio nem acesso direto a nenhum serviço de dados**. Toda ferramenta MCP é um wrapper tipado sobre um endpoint HTTP do Core API, autenticado com um service token de role `ServiceAccount`.

## Justificativa

- **Um único plano de autorização** (princípio nº 2 de [docs/ARCHITECTURE.md](../ARCHITECTURE.md)): se o MCP Server tivesse acesso direto a Postgres/Redis/Docker, RBAC e auditoria teriam que ser reimplementados (ou, pior, esquecidos) numa segunda superfície de código. Isso criaria exatamente o cenário que a especificação pede para evitar: "a IA nunca deve executar operações destrutivas sem confirmação" só é uma garantia real do sistema se for impossível de contornar, e ela só é impossível de contornar se existir um único caminho de execução.
- Facilita testar o comportamento de segurança uma única vez (nas rotas do Core API) em vez de duplicar testes de RBAC/confirmação para cada ferramenta MCP.
- Mantém o MCP Server extremamente simples de auditar por conta própria — qualquer pessoa revisando o código do MCP Server vê imediatamente que ele não tem nenhum poder que não venha de um token de API.
- Permite reaproveitar automaticamente qualquer capacidade nova exposta pelo Core API como ferramenta MCP, sem reimplementação — novas ferramentas MCP tendem a ser um mapeamento fino sobre endpoints já existentes.

## Alternativas consideradas

- **MCP Server com acesso direto aos serviços** (conectando diretamente ao Postgres, ao SDK do MinIO, ao socket do Docker) — mais "eficiente" em teoria (menos um hop de rede), mas introduz uma segunda superfície de autorização que precisa ser mantida em paridade perfeita com a API principal para sempre. Rejeitado: o risco de paridade quebrar silenciosamente (alguém adiciona uma checagem de RBAC na API e esquece de replicar no MCP Server) é inaceitável para um sistema cujo argumento de venda é justamente "seguro para IA administrar produção".

## Consequências

- Toda nova ferramenta MCP exige (ou reaproveita) um endpoint correspondente no Core API — não existe atalho de "só para o MCP".
- Latência de cada chamada de ferramenta inclui o hop de rede até o Core API; aceitável dado que a maioria das ferramentas não está no caminho crítico de latência de uma aplicação, e sim numa conversa assistida por IA.
- O fluxo de confirmação de ações destrutivas (dois passos, [docs/MCP.md §6](../MCP.md#6-confirmação-de-ações-destrutivas)) é implementado uma única vez no Core API e vale automaticamente para Dashboard, CLI e MCP.
