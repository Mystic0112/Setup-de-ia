---
description: Invoca o Rust (Ferro), agente especialista em Rust sem UI — núcleo de domínio, PTY, sockets, cifra e configuração
argument-hint: <descreva a tarefa de Rust, núcleo, crate ou porte>
---

Invoque o subagente **rust** para resolver a seguinte tarefa de desenvolvimento em Rust:

$ARGUMENTS

O Ferro irá modelar o domínio antes do adaptador, provar a paridade com a referência quando ela existir, e só declarar pronto com o gate do Cargo (fmt, clippy com `-D warnings` e testes) limpo.
