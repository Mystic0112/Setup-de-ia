# RCE / webshell em PHP (defesa)

Origem: `php2shell` (ARTEX). Classe mais perigosa pro stack Laravel/PHP — leva a execução remota.

## Como o ataque automatizado chega lá (TTP)
O atacante não precisa de 0-day. A automação procura, em ordem, um caminho pra **escrever um
arquivo PHP dentro do webroot** e depois acessá-lo:
1. **Upload sem validação** — endpoint que aceita arquivo e grava em `public/` ou dir servido, sem checar tipo real/extensão → sobe `.php` disfarçado.
2. **Path traversal na escrita** — parâmetro de nome de arquivo com `../` escapa pra pasta servida.
3. **Função perigosa exposta** — `eval`, `system`, `exec`, `shell_exec`, `passthru`, `unserialize` de input, `assert` com string.
4. **LFI + log poisoning** — inclui arquivo controlado (log, upload) como código.
Depois é só requisitar o arquivo plantado = shell.

## Detecção (assinatura no log)
- **Arquivo novo em `public/`/webroot** com mtime recente e extensão executável (`.php`, `.phtml`, `.phar`) — watcher de FS alerta na hora.
- Requisição `POST` de upload seguida, minutos depois, de `GET` a um caminho **novo e incomum** em `public/`.
- Acesso a `.php` fora das rotas do Laravel (arquivo solto, não via `index.php`/router).
- String de comando em parâmetro (`;id`, `|whoami`, `$(...)`, `base64_decode`) no log de request.

## Hardening (concreto, Laravel/PHP)
- **Upload:** nunca gravar no webroot. Salvar fora de `public/` (disk `local`/S3), validar **MIME real** (`finfo`), whitelist de extensão, renomear com hash, servir via rota controlada. `Storage::` em vez de `move` manual.
- **`php.ini`:** `disable_functions = exec,passthru,shell_exec,system,proc_open,popen,eval` quando a app não precisa; `open_basedir` travando no dir da app; `allow_url_include = Off`, `allow_url_fopen = Off`.
- **Container:** dir da aplicação **read-only** (`:ro`), só `storage/` e `bootstrap/cache` graváveis; usuário não-root; `public/` sem permissão de escrita do processo web.
- **Nunca** `eval`/`unserialize` de input; `unserialize($x, ['allowed_classes'=>false])` se inevitável.
- **Deploy:** `php artisan config:cache`; `APP_DEBUG=false`; remover Telescope/Horizon de produção pública.

Playbook strix: `vulnerabilities/rce`, `vulnerabilities/insecure_file_uploads`, `vulnerabilities/path_traversal_lfi_rfi`.
