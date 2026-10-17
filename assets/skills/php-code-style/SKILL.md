---
name: php-code-style
description: Tooling de estilo PSR em PHP — Laravel Pint, PHP_CodeSniffer (phpcs/phpcbf) e php-cs-fixer. Config de ruleset, como rodar, autofix e gate em CI/pre-commit. Carregue quando a tarefa for impor, consertar ou revisar conformidade de estilo (PSR-12), não quando for só recitar a regra — a regra PSR o agente já tem.
user-invocable: false
---

# PHP Code Style (PSR tooling)

A regra PSR-1/4/12 é núcleo do agente. **Esta skill é a ferramenta que a automatiza** —
detecta, conserta e barra desvio de estilo sem revisão manual linha a linha.

## Qual ferramenta

| Situação | Ferramenta |
|---|---|
| Projeto Laravel (ou novo) | **Pint** — já vem no Laravel, zero setup, autofix |
| Ruleset granular, sniffs custom, projeto legado, regra da empresa | **PHP_CodeSniffer** (`phpcs`/`phpcbf`) |
| Fixer avançado fora de Laravel, risco de regra fora do PSR | **php-cs-fixer** (Pint é wrapper dele) |

Não rode as três. Pint e php-cs-fixer brigam (mesmo motor). Regra: **Pint em Laravel, phpcs quando
precisa de sniff que o Pint não expõe.** phpcs só detecta/conserta estilo; análise de tipo/bug é
PHPStan (outra ferramenta, não confundir).

---

## Laravel Pint

Já instalado em Laravel 9+. Standalone: `composer require laravel/pint --dev`.

```bash
./vendor/bin/pint              # conserta tudo in-place
./vendor/bin/pint --dirty      # só arquivos modificados (git) — rápido no dev
./vendor/bin/pint --test       # NÃO altera, só reporta e falha se sujo — isto é o gate de CI
./vendor/bin/pint -v           # mostra cada regra aplicada por arquivo
```

`pint.json` na raiz (presets: `laravel` default, `psr12`, `symfony`):

```json
{
  "preset": "psr12",
  "rules": {
    "declare_strict_types": true,
    "ordered_imports": { "sort_algorithm": "alpha" },
    "no_unused_imports": true,
    "not_operator_with_successor_space": false
  },
  "exclude": ["bootstrap", "storage"]
}
```

- **Codar no padrão (autofix):** rode `pint --dirty` antes de entregar. Entrega sempre limpa.
- **Gate:** `pint --test` no CI/pre-commit — exit ≠ 0 se algum arquivo divergir.

---

## PHP_CodeSniffer (phpcs / phpcbf)

```bash
composer require squizlabs/php_codesniffer --dev
./vendor/bin/phpcs                 # detecta violações (relatório)
./vendor/bin/phpcbf                # conserta o que é auto-corrigível
./vendor/bin/phpcs --report=summary   # resumo por arquivo
./vendor/bin/phpcs -q --report=full path/to/File.php
```

`phpcs.xml` (ou `phpcs.xml.dist`) na raiz:

```xml
<?xml version="1.0"?>
<ruleset name="Projeto">
    <description>PSR-12 + ajustes</description>

    <file>app</file>
    <file>src</file>
    <file>tests</file>
    <exclude-pattern>*/vendor/*</exclude-pattern>
    <exclude-pattern>*/database/migrations/*</exclude-pattern>

    <arg name="colors"/>
    <arg value="p"/>              <!-- progress -->
    <arg name="parallel" value="8"/>

    <rule ref="PSR12"/>

    <!-- afrouxar/apertar sniff pontual -->
    <rule ref="Generic.Files.LineLength">
        <properties>
            <property name="lineLimit" value="120"/>
            <property name="absoluteLineLimit" value="0"/>
        </properties>
    </rule>
</ruleset>
```

- **Severity:** `phpcs --severity=1` pega tudo; subir `error-severity`/`warning-severity` filtra ruído.
- **Baseline em legado:** não dá pra limpar tudo de uma vez → gere erros atuais e ignore, barrando só
  novos. phpcs não tem baseline nativo robusto; nesse caso prefira `phpcs` só em arquivos do diff
  (ver gate abaixo) ou migre o ruleset pra Pint.
- **Sniff custom:** `phpcs` aceita sniffs próprios (classe `Sniff` em `Standards/`) — use quando a
  regra da empresa não existe no PSR. É o motivo nº1 pra escolher phpcs em vez de Pint.

---

## Gate — CI e pre-commit

**Só no diff** (rápido, não varre o mundo em PR):

```bash
# Pint — só arquivos alterados vs main
git diff --name-only --diff-filter=ACM origin/main...HEAD -- '*.php' \
  | xargs -r ./vendor/bin/pint --test

# phpcs — idem
git diff --name-only --diff-filter=ACM origin/main...HEAD -- '*.php' \
  | xargs -r ./vendor/bin/phpcs -q
```

GitHub Actions (Pint):

```yaml
- uses: shivammathur/setup-php@v2
  with: { php-version: '8.3' }
- run: composer install --no-interaction --prefer-dist
- run: ./vendor/bin/pint --test
```

Pre-commit (`.git/hooks/pre-commit` ou husky/lint-staged): `pint --dirty` conserta antes do commit;
`pint --test` barra. Preferir **conserta no commit, barra no CI** — dev não perde tempo, PR não entra sujo.

---

## Ângulo por agente

- **Backend (codar):** `pint --dirty` antes de entregar. Código sai no padrão, não depende de review pegar estilo.
- **QA (review):** estilo não é opinião no PR — rode `pint --test`/`phpcs` e trate divergência como
  bloqueio automático. Review humano foca em lógica/SOLID/segurança, não em vírgula. Se o projeto não
  tem ferramenta de estilo configurada, **o achado do review é "falta o gate"** — propor `pint.json` +
  CI vale mais que apontar 40 desvios de indentação na mão.
