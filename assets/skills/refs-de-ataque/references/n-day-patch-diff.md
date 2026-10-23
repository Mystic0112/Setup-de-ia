# N-day via patch diffing (defesa)

Origem: `patch-diff` (ARTEX). Explora a janela entre "patch existe" e "você aplicou".

## Como o ataque automatizado chega lá (TTP)
1. Sai um patch (teu commit de fix, ou CVE de dependência). A automação **diffa** o antes/depois e deduz **qual era a vuln** — o patch mostra exatamente o que estava quebrado.
2. Escaneia teus hosts procurando os que **ainda não aplicaram** (versão antiga no header, hash de asset antigo, comportamento pré-fix).
3. Explora o n-day no host atrasado antes da janela de patch fechar.
Vazamento de código acelera: `.git` exposto, source map em produção, `composer.lock`/`vendor` legível dão o diff de graça.

## Detecção (assinatura no log)
- Varredura de `/.git/`, `/.env`, `*.map`, `composer.lock`, `/vendor/` = tentativa de pegar fonte/versão → **404/403 em lote nesses caminhos**.
- Probe de versão: requisições que batem só pra ler header de versão ou arquivo de changelog.
- Exploração chegando **logo após** teu deploy de fix = alguém diffou o patch.

## Hardening (concreto)
- **Patch rápido e uniforme:** mesma versão em TODA máquina; sem host "esquecido". Automatizar o rollout (um pipeline, não deploy manual por servidor).
- **Não vazar fonte/versão:** bloquear `.git`, `.env`, `vendor/`, `storage/` no servidor web; `APP_DEBUG=false`; **sem source map** de produção público; remover header `X-Powered-By`/versão de framework.
- **Dependência:** `composer audit` no CI; Dependabot/Renovate; agir em CVE de lib **no dia**, não no sprint.
- **Fix discreto:** commit de segurança sem descrever o exploit no título público; coordenar deploy antes de tornar o fix óbvio.

Playbook strix: `custom/dependency_cve_scanning`, `custom/source_aware_sast`.
