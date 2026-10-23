# Recon de superfície / descoberta de asset (defesa)

Origem: `bbot-recon`, `scopesentry` (ARTEX). Primeiro passo de todo ataque automatizado: mapear o
que você expõe antes de atacar. Defesa = **encolher a superfície** e **ver o recon acontecendo**.

## Como o ataque automatizado chega lá (TTP)
1. **Descoberta de subdomínio** — DNS brute, cert transparency, scraping → acha `staging.`, `old.`, `api-v1.`, `admin.` que você esqueceu no ar.
2. **Enumeração de porta/serviço e fingerprint** de tecnologia e versão.
3. **Content discovery** — fuzz de caminho (`/admin`, `/debug`, `/backup`, `/.env`, `/telescope`, `/horizon`, `/actuator`).
4. Sincroniza tudo num grafo de asset e alimenta o planner com os alvos "mais moles".

## Detecção (assinatura no log)
- **Pico de 404/403** em caminhos de admin/debug/backup num curto intervalo = content discovery.
- Consultas DNS/subdomínio anômalas; bater em subdomínio que não deveria ter tráfego.
- User-Agent de ferramenta (`bbot`, `httpx`, `nuclei`, `ffuf`, `katana`) — forjável, mas sinal barato quando aparece.
- Varredura de porta no edge (fora do WAF).

## Hardening (concreto)
- **Matar asset morto:** inventário de subdomínio; derrubar `staging`/`old`/`v1` público; nada de ambiente de teste exposto à internet (VPN/allowlist).
- **Zero endpoint de debug público:** Telescope/Horizon/Actuator/phpinfo/`/debug` atrás de auth+rede interna ou fora de produção.
- **Esconder versão/stack:** remover headers reveladores; página de erro genérica.
- **DNS/cert:** wildcard com cuidado; monitorar cert transparency pra pegar subdomínio que não foi você que criou (takeover).
- **Subdomain takeover:** remover CNAME apontando pra serviço desprovisionado.
- **WAF/rate limit no edge** pra encarecer o fuzz de conteúdo.

Playbook strix: `reconnaissance/`, `tooling/` (sintaxe das ferramentas que o atacante usa — útil pra reconhecer no log).
