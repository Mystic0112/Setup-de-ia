# Automação de browser — credential stuffing, abuso de formulário (defesa)

Origem: `playwright-cli` (ARTEX). Browser headless dirigido por agente: faz o que um usuário faz,
mas em escala — login, formulário, fluxo multi-etapa — passando proteções que só olham request cru.

## Como o ataque automatizado chega lá (TTP)
1. **Credential stuffing** — testa pares usuário/senha vazados em outros sites, via browser real (executa JS, pega CSRF token, parece humano).
2. **Abuso de fluxo de negócio** — repete cupom, cadastro, checkout, reset de senha em massa (business logic).
3. **Captura de sessão autenticada** — depois do login, exporta cookie/token pra alimentar o replay de API (ver `api-authz-abuse`).
4. Passa CAPTCHA/2FA **reusando a sessão já autenticada**, não quebrando o fator.

## Detecção (assinatura no log)
- Muitas **tentativas de login falhas** espalhadas por muitos usuários (stuffing é largo, não brute num só).
- Logins de sucesso de **IP/geolocalização/UA novo** pra conta — alimentar alerta de "sessão reusada em outro lugar".
- Headless fingerprint: Chrome sem plugins/WebGL/features esperadas, timing robótico.
- Burst em endpoint de negócio (cupom/reset) além do padrão humano.

## Hardening (concreto)
- **MFA resistente a replay:** preferir WebAuthn/passkey a OTP por SMS; **vincular sessão a device/IP** e exigir reauth em mudança sensível.
- **Rotacionar/expirar sessão:** TTL curto, invalidar no logout server-side, detectar mesmo token em contexto novo.
- **Credential stuffing:** rate limit por conta **e** por IP; bloqueio progressivo; checar senha contra base de vazados (HIBP); CAPTCHA adaptativo após falha.
- **Business logic:** idempotência e limite server-side em cupom/reset/cadastro (não confiar no front); throttle por identidade.
- **Bot management:** detecção de headless no edge; nunca depender só de CAPTCHA (sessão reusada passa).

Playbook strix: `vulnerabilities/authentication_jwt`, `vulnerabilities/business_logic`.
