---
name: rust-gui
description: Referência de interface gráfica em Rust — escolha entre Slint, iced, egui, Dioxus e Tauri, e como separar o núcleo (agente rust) da tela. Carregue quando a tarefa for construir ou alterar UI desktop/mobile escrita em Rust, ou quando for preciso decidir qual framework de UI usar.
user-invocable: false
---

# Interface gráfica em Rust

Carregada sob demanda pela `BULMA`. O núcleo de domínio, PTY, socket e motor de chat são da `RUST` (Ferro), não daqui. Aqui fica a tela, e a regra de fronteira entre as duas.

Versões e licenças mudam rápido. Antes de fixar uma versão no `Cargo.toml`, confira a release atual no crates.io e as notas da release. O que está abaixo é o perfil de cada framework, não um número de versão.

## Escolha do framework

| Framework | Modelo | Renderização | Quando usar | Cuidado |
|---|---|---|---|---|
| **Slint** | markup declarativo `.slint` + lógica em Rust (também tem bindings C++, JS e Python) | própria, nativa | app desktop ou embarcado com layout fixo, quando o time quer separar design (markup) de lógica | licença: GPLv3, royalty-free ou comercial. App fechado precisa de uma das duas últimas. Confira a página oficial de licenciamento antes de escolher |
| **iced** | Elm: `Message` → `update` → `view` | wgpu (GPU) | app desktop em Rust puro, com estado explícito e tipado | API ainda muda entre versões. Fixe a versão |
| **egui** | modo imediato: a tela é redesenhada a cada frame a partir do estado | própria | ferramenta interna, painel de debug, overlay, protótipo rápido | aparência padrão é "de ferramenta"; design fino custa código |
| **Dioxus** | sintaxe parecida com React (RSX), hooks | webview ou renderização nativa (depende do alvo) | quem vem de React e quer desktop, web e mobile com um código | ecossistema menor que React |
| **Tauri** | frontend em HTML/CSS/JS (ou React/Vue) + backend em Rust, via comandos IPC | webview do sistema | time web que precisa de app desktop; a UI é do stack web | o frontend é JS, não Rust. Fora do escopo de "UI em Rust" puro |

Regra de decisão:
- UI com layout de produto e design fino, time com cara de web → **Dioxus** ou **Tauri**.
- Desktop nativo, Rust puro, estado tipado → **iced**.
- Layout de app desktop com designer, ou embarcado → **Slint** (se a licença couber).
- Ferramenta interna ou debug → **egui**.
- Na dúvida entre dois, pergunte o alvo (desktop, mobile, web, embarcado) e a licença antes de escrever código.

## Fronteira núcleo × tela

A tela **não** guarda regra de negócio. Ela mostra estado e envia intenção.

- Núcleo (`RUST`): tipos e transições de workspaces, panes e abas, sem import de framework gráfico. Testável sem abrir janela.
- Tela (`BULMA`): converte eventos da UI em chamadas ao núcleo e converte o estado do núcleo em elementos visuais.
- Se a tela precisa de uma regra para renderizar, a regra vai pro núcleo, e a tela recebe o resultado pronto.

## Threads e I/O

- A UI roda numa thread só (a principal). Nunca bloqueie essa thread com I/O, PTY ou socket.
- Trabalho em segundo plano manda resultado de volta pela UI com o mecanismo do framework:
  - Slint: `slint::invoke_from_event_loop` (ou `Weak` + `upgrade_in_event_loop`).
  - iced: `Task::perform` ou `Subscription`, que devolvem uma `Message`.
  - egui: canal (`std::sync::mpsc` ou `crossbeam`) lido no `update` e `request_repaint()` quando chega dado.
  - Dioxus: `spawn` com `use_coroutine`, sem bloquear a thread do render.
  - Tauri: `#[tauri::command]` assíncrono, com `async` nativo do Tokio.
- Estado compartilhado entre threads: `Arc<Mutex<_>>` só se o framework não tiver o canal certo. Prefira canal.

## Regras de código

- **Uma mensagem (ou evento) por intenção do usuário.** Sem callback que muta estado escondido.
- **Componente pequeno, com estado de fora.** Nenhum widget guarda regra de negócio no próprio campo.
- **Zero `unwrap()` na tela.** Erro vai para o estado da UI (mensagem na tela), nunca `panic`.
- **Acessibilidade:** rótulo para cada controle e foco visível. Slint e iced expõem isso pela API de acessibilidade do sistema; confira o estado de suporte no framework escolhido antes de prometer.
- **Tema e tamanho:** nada de tamanho fixo em pixel para texto. Use as unidades e o tema do framework, para o zoom do sistema funcionar.
- **Teste:** testes de transição de estado (`update` puro) rodam sem janela. Teste visual é manual ou por captura de tela.

## Checagens antes de entregar

```bash
cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

Rode a aplicação e confirme o fluxo principal com os olhos. Compilar não prova que a tela está certa.
