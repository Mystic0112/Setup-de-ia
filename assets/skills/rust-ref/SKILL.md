---
name: rust-ref
description: Referência de backend Rust — tokio (canais, cancelamento, spawn_blocking para PTY), FFI e unsafe (fronteira mínima), RustCrypto (AES-256-GCM, PBKDF2), erros (thiserror/anyhow), config com serde e recarga, workspace Cargo e checagens. Carregue ao implementar PTY, socket, motor, cifra de protocolo, config ou erro tipado em Rust; o agente já conhece o núcleo, isto é o detalhe de crate.
user-invocable: false
---

# Rust — referência de backend

Carregada sob demanda pelo agente `rust`. Não é regra geral: use só o trecho que a tarefa exige.

## Tokio — runtime, canais e cancelamento

- Um runtime por processo, criado no `main` do binário. Biblioteca não cria runtime.
- Trabalho bloqueante (leitura de PTY, `waitpid`, I/O de arquivo síncrono) vai para `tokio::task::spawn_blocking`, nunca direto numa task async.
- Canais: `tokio::sync::mpsc` para eventos de um produtor, `broadcast` para vários ouvintes, `watch` para estado atual que ouvintes leem. Canal limitado por padrão; ilimitado só com motivo escrito.
- Cancelamento: `tokio_util::sync::CancellationToken` passado para as tasks; `tokio::select!` com o token em todo await longo.
- Nunca segure `std::sync::Mutex` atravessando `.await`. Se precisar, use `tokio::sync::Mutex` ou reestruture para trocar mensagens.

## FFI e unsafe

- `unsafe` só na borda de FFI/PTY, em crate dedicado (ex.: `<projeto>-ffi`) ou módulo `pty` isolado. O domínio não vê ponteiro cru.
- Todo bloco `unsafe` tem comentário `// SAFETY:` dizendo qual invariante vale e por quê.
- Converta ponteiro e tamanho para tipo seguro logo na entrada (slice, `CStr`, `NonNull`) e devolva tipos próprios.
- Binding de biblioteca C: gere com `bindgen` no `build.rs` ou escreva o `extern "C"` mínimo à mão. Trave a versão do header; mudança de header quebra em silêncio.
- Teste a fronteira pelo wrapper seguro, com entradas de borda (vazio, tamanho zero, byte nulo), não pelo `extern` direto.

## RustCrypto — cifra de protocolo

A especificação do protocolo é a fonte de verdade para formato, AAD, salt e número de iterações. Não invente parâmetros. Qualquer mudança passa pelo agente `security` antes de entrar.

- AES-256-GCM: crate `aes-gcm`, tipo `Aes256Gcm`, nonce de **12 bytes** gerado aleatório por mensagem (`OsRng`), nunca reutilizado com a mesma chave.
- Formato versionado, por exemplo `[versão][nonce 12][cifra + tag 16]`, com AAD fixada pela especificação.
- Derivação de chave: crate `pbkdf2`, `pbkdf2_hmac::<Sha256>` com o número de iterações da especificação. Cacheie a chave derivada por sessão ou grupo, não por mensagem.
- Comparação de tag e de segredo: nunca `==` sobre bytes de segredo; use `subtle::ConstantTimeEq` quando comparar fora do GCM.
- Zeroize: `zeroize` para chave e senha em memória.

## Erros

- Biblioteca: enum tipado com `thiserror`. Cada variante carrega o dado que a UI ou a CLI precisa, sem frase pronta em inglês (a tradução não é do backend).
- Binário: `anyhow::Result` só na borda `main`. Biblioteca nunca retorna `anyhow::Error`.
- Sem `unwrap()` / `expect()` em código de produção. Em teste pode.
- `?` com `From` para converter entre camadas; não engula erro com `let _ =` sem comentário.

## Config com serde (TOML ou JSON)

- `#[derive(Deserialize, Serialize)]` com `#[serde(default)]` para que arquivo antigo continue válido.
- Campo novo = default novo; nunca remova campo sem migração.
- Recarga ao salvar: crate `notify` observando o arquivo, reparse e troca atômica (`Arc<Config>` ou `watch`). Config inválida mantém a última válida e loga o erro.
- Caminho de config: `dirs` para o diretório do SO. Caminho de socket ou de estado segue a especificação do projeto, não um valor inventado.

## Workspace Cargo

- `Cargo.toml` na raiz com `resolver = "2"`.
- Versões de dependência em `[workspace.dependencies]`; cada crate usa `dep.workspace = true`.
- Feature só quando há consumidor real. Feature padrão mínima.
- `Cargo.lock` vai no commit quando o workspace tem binário.

## Como conferir (antes de dizer que está pronto)

```bash
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Para mudança de cifra ou protocolo, adicione teste de vetor fixo (texto, chave e nonce conhecidos) e teste de rejeição (tag adulterada, grupo errado, versão antiga).

## Quando NÃO usar esta skill

- Interface gráfica em Rust: vai para o frontend (ver a skill `rust-gui`).
- CI, cross-compile, release: `devops`.
- Estratégia de testes e revisão: `qa`.
