---
name: refs-de-ataque
description: Referência defensiva de ataque automatizado por IA — como um pentest autônomo (modelo planner-worker tipo ARTEX) encadeia recon, exploração e replay de sessão, com assinatura de detecção e hardening por técnica. Carregue quando a defesa precisar pensar como o atacante automatizado: priorizar auditoria, caçar o ataque no log, ou fechar a superfície que a automação varre. NÃO é ferramenta ofensiva — é threat intel pra defender.
user-invocable: false
---

# Refs de Ataque (threat intel defensivo)

Modelado sobre **ARTEX** (plataforma de pentest autônomo com IA, Go/Next.js) e classes de
ataque automatizado equivalentes. **Propósito: defesa.** Cada referência descreve a técnica em
nível de TTP (o suficiente pra reconhecer e barrar), a **assinatura de detecção** no log, e o
**hardening** concreto — sem payload operacional. Não gere webshell, evasão de EDR nem exploit a
partir daqui; isto serve pra fechar porta, não pra abrir.

## O modelo de ataque automatizado

Não é exploit novo. É **orquestração**: um **planner** (LLM) encadeia passos — recon → achar
vuln → explorar → pivotar — e **workers** rodam ferramentas em paralelo, compartilhando o que
acharam pra não repetir. Captura **tráfego autenticado** (MITM proxy + extensão de browser, passa
2FA/CAPTCHA porque reusa a sessão real) e **replica** requisições mexendo em parâmetro pra achar
falha de autorização.

**Consequência pra defesa:** o atacante agora é barato, 24/7, paralelo e rápido a encadear bug
**conhecido**. Logo:
- Vuln que "ninguém ia achar na mão" é achada em minutos. Não existe mais segurança por obscuridade.
- Autenticação não basta — **autorização por objeto** é o que segura replay de sessão.
- Patch lento = n-day explorado antes de você aplicar.
- A defesa que funciona é a conhecida (OWASP, least privilege, detecção) — só precisa estar **no lugar e monitorada**.

## Índice — carregue a referência da técnica

| Técnica (origem ARTEX) | Referência | Playbook strix correlato |
|---|---|---|
| RCE / webshell em PHP (`php2shell`) | `references/rce-php-webshell.md` | `vulnerabilities/rce`, `insecure_file_uploads` |
| Abuso de autorização em API — BOLA/IDOR, mass assignment (`api-recon`, `api-security`) | `references/api-authz-abuse.md` | `vulnerabilities/idor`, `broken_function_level_authorization`, `mass_assignment` |
| N-day via patch diffing (`patch-diff`) | `references/n-day-patch-diff.md` | `custom/dependency_cve_scanning` |
| Recon de superfície / descoberta de asset (`bbot-recon`, `scopesentry`) | `references/recon-superficie.md` | `reconnaissance/` |
| Automação de browser — credential stuffing, abuso de formulário (`playwright-cli`) | `references/automacao-browser.md` | `vulnerabilities/authentication_jwt`, `business_logic` |

## Assinaturas de detecção transversais (o ataque automatizado deixa rastro)

Independente da técnica, a **automação** tem cara no log — cace isto:
- **Mesmo token/cookie de sessão** vindo de **IP ou User-Agent rotativo** em janela curta = replay de sessão capturada.
- **Varredura de ID sequencial ou enumerável** (`/pedido/1001`, `1002`, `1003`...) num mesmo endpoint = sweep de BOLA/IDOR.
- **Burst de requisições** com timing regular demais (intervalo quase constante) = worker automatizado, não humano.
- **Mesma rota, muitos valores de parâmetro** trocando só um campo = fuzzing de autorização/injeção.
- **Recon:** pico de 404/403 em caminhos de admin/debug/backup (`.git`, `.env`, `/actuator`, `/telescope`) e varredura de subdomínio.
- **User-Agent de ferramenta** (`bbot`, `httpx`, `nuclei`, headless Chrome sem features) — fácil de forjar, mas quando aparece é sinal barato.

Regra: **autorização nega por padrão + rate limit por identidade + log dessas assinaturas com alerta**. Detecção aqui vale mais que mais um WAF genérico.

## Como a NEZUKO usa isto

1. **Priorizar auditoria** pela superfície que a automação ataca primeiro: upload/RCE → authz/IDOR → API → recon.
2. Em cada auditoria, puxar a referência da técnica + o playbook strix correlato (coluna da tabela) — a ref dá o ângulo de **detecção**; o playbook dá a metodologia de teste.
3. Entregar sempre os **três**: o fix (fechar a vuln), a **detecção** (assinatura no log pra pegar tentativa) e o **least privilege** (reduzir o que o atacante alcança se entrar).

Atribuição: TTPs modelados sobre [BaaRai/ARTEX](https://github.com/BaaRai/ARTEX) como fonte de
inteligência de ameaça. Nenhum código ofensivo do projeto foi redistribuído — só defesa e detecção.
