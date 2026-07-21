# ADR-0009 — JWT curto + refresh rotativo, sessões revogáveis

**Status:** Aceito

## Contexto

O sistema de autenticação precisa balancear performance (não bater no banco a cada request autenticado), segurança (revogação rápida em caso de comprometimento) e suporte a múltiplos métodos de login (senha, OAuth, Magic Link, OTP) sem duplicar a emissão de sessão para cada um.

## Decisão

- **Access token JWT**, TTL curto (15 minutos), assinado com segredo gerado na instalação, validado sem consulta ao banco (stateless) na maioria das requisições.
- **Refresh token** opaco, rotativo a cada uso, armazenado como hash na tabela `sessions`, entregue via cookie httpOnly + Secure.
- Todos os métodos de login (senha, OAuth, Magic Link, OTP) convergem para o **mesmo** emissor de sessão em `packages/auth-core` — nenhum método de login emite token por conta própria.

## Justificativa

- TTL curto do access token limita a janela de uso indevido de um token vazado sem exigir consulta ao banco em toda request — bom equilíbrio entre performance e segurança para uma API que serve tanto a Dashboard quanto chamadas MCP frequentes.
- Refresh rotativo com hash armazenado permite revogação imediata de uma sessão específica (`sessions.revoked_at`) sem precisar invalidar uma lista de JWKs — essencial para o requisito de auditoria/segurança do projeto (poder cortar acesso de um usuário ou de um agente comprometido na hora).
- Convergir todo método de login para o mesmo emissor evita a armadilha comum de "cada provedor OAuth implementa sua própria sessão" — mantém uma única definição do que é "estar autenticado" no sistema, consistente com o princípio de plano único de autorização.

## Alternativas consideradas

- **JWT de vida longa sem refresh** — mais simples, mas revogação exigiria blocklist checada em toda request (elimina o ganho de performance do JWT stateless) ou aceitar que um token comprometido fica válido até expirar. Rejeitado por não atender ao requisito de segurança do projeto (auditoria e controle de acesso rigorosos, inclusive para tokens de IA).
- **Sessão inteiramente stateful (sem JWT, só cookie + lookup no banco a cada request)** — revogação trivial, mas adiciona uma consulta ao banco em todo request autenticado, incluindo chamadas MCP de alta frequência. Rejeitado por custo de performance desnecessário dado que o modelo híbrido (JWT curto + refresh stateful) já entrega revogação em até 15 minutos sem esse custo constante.

## Consequências

- Comprometimento de um access token tem impacto limitado a, no máximo, 15 minutos.
- Tokens de serviço (API Keys/MCP, ver [docs/SECURITY.md](../SECURITY.md)) usam um esquema separado (opaco, hash armazenado, sem rotação automática) porque não representam uma sessão interativa — documentado explicitamente para não confundir os dois mecanismos.
- Logout, "sair de todos os dispositivos" e revogação administrativa de sessão são operações simples de `UPDATE sessions SET revoked_at = now()`.
