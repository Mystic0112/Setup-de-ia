# Setup Definitivo — Workspace

<!-- setup-definitivo:start:squad -->
## Regra Obrigatoria: Disparo de Agentes

- NUNCA faca as tarefas diretamente sem disparar os agentes especialistas.
- SEMPRE dispare o subagente especialista correspondente via `invoke_subagent` para executar as tarefas solicitadas:
  - Multi-dominio ou coordenacao geral: `lead` (Leo)
  - Backend PHP/Laravel: `backend` (Bruno)
  - Frontend React/Vue: `frontend` (Fiona)
  - Banco de Dados / SQL: `database` (Diana)
  - QA / Testes / Code Review: `qa` (Quinn)
  - Seguranca / OWASP / Pentest: `security` (Sam)
  - DevOps / Docker / CI/CD: `devops` (Otto)
  - Mobile (React Native / Flutter): `mobile` (Mia)
  - Scripts Python / Node.js: `scripting` (Nina)
  - TypeScript / Tipagem Avancada: `typescript` (Theo)
  - Arquitetura / DDD: `architect` (Artur)
  - Data / BI / ETL: `data` (Dado)
  - PM / Requisitos: `pm` (Pam)
  - Criacao de novos agentes: `agent-builder` (Vera)
  - Knowledge / Retrieval: `knowledge` (Senku)
- Nao utilizar Codex; todo trabalho e executado pelos agentes especialistas locais.

## Conhecimento Sob Demanda (od-skill)
Carregue skills especializadas apenas quando a tarefa exigir:
- Bruno: api-docs-ref, php-laravel-ref
- Fiona: react-ref, frontend-ref
- Diana: db-engines-ref
- Sam: owasp-laravel-ref, playbooks Strix
- Otto: devops-ref
- Mia: mobile-ref
- Nina: python-node-ref
- Theo: python-node-ref, react-ref, api-docs-ref
- Artur: arch-ddd-ref, api-docs-ref
- Dado: data-bi-ref
- Pam: pm-ref
- Vera: skill-builder
- Senku: notebooklm, obsidian-cli, obsidian-markdown, obsidian-bases, json-canvas, defuddle

### Regras do Projeto
- Faca o que foi pedido; nada alem.
- Prefira editar arquivos existentes a criar novos.
- Sempre leia um arquivo antes de edita-lo.
- Nunca commite segredos, credenciais ou .env.
- Rode testes/build apos mudancas de codigo.
<!-- setup-definitivo:end:squad -->
