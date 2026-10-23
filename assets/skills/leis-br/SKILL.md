---
name: leis-br
description: Busca sob demanda uma norma brasileira (lei federal ou estadual, Constituição, ato de regulador) no acervo aberto ctresb/leis, sem baixar nada, extrai só o artigo pedido e manda confirmar no texto oficial pelo navegador antes de citar. Carregue quando a resposta jurídica precisar do texto de uma norma que o `legal-br` não traz (lei estadual, decreto, ato de agência, lei fora das fontes curadas) ou quando precisar do artigo exato com fonte e data.
user-invocable: false
---

# Leis BR (busca sob demanda)

Acervo: [ctresb/leis](https://github.com/ctresb/leis) (MIT), ~324 mil normas em Markdown, cada uma com
frontmatter (`fonte` oficial, `revogada`, `versao_texto`). **Nada é baixado em massa**: o script busca
um arquivo por vez e guarda em cache (`~/.cache/leis-br`).

> É **espelho não oficial** de um único mantenedor, com conversão automática e parte em OCR. Serve pra
> **achar rápido**. O que vai pra resposta se confirma na `fonte` oficial (passo 2).

## Ordem de confiança

1. **Texto oficial** (link `fonte` do frontmatter, aberto no navegador) é o que vale.
2. **`legal-br`** (fontes curadas, com checksum) para o que ele já cobre: CF, Código Civil, CDC, LGPD, Marco Civil, ECA e ECA Digital, direitos autorais, lei do software, ICP-Brasil, assinaturas eletrônicas, e guias/resoluções da ANPD.
3. **Este acervo** para o resto: lei estadual, decreto, ato de regulador, lei fora do `legal-br`.

## 1. Localizar e extrair (script)

`scripts/leis.py` fica ao lado deste SKILL.md. Python 3 puro, sem instalar nada.

```bash
python3 scripts/leis.py lei 13709 2018 --artigo 18     # lei federal, só o Art. 18
python3 scripts/leis.py lei 13709 2018 --artigo 55-A   # artigo com sufixo
python3 scripts/leis.py const --artigo 5               # Constituição Federal
python3 scripts/leis.py --uf SP lei 16632 2018         # lei estadual (cabeçalho + início)
python3 scripts/leis.py lc 105 2001 --tudo             # texto inteiro (pode ser grande)
python3 scripts/leis.py ls reguladores                 # navegar o acervo: ls <pasta>
```

- **Tipos:** `lei` `lc` `dl` `delegada` `ec` `decreto` `resolucao` `const`. `--uf SP` troca federal por estadual.
- **Sempre informe número e ano** (`lei 13709 2018`): toda citação traz o ano, e o ano é o que localiza o arquivo.
- Saída abre com o frontmatter: **leia `revogada` e `versao_texto`** antes de usar o texto.
- Artigo que aparece **duas vezes** (ex.: `const --artigo 5`: corpo da CF e ADCT) sai como ocorrência 1/2, 2/2. A 1ª costuma ser o corpo.
- `não está em <pasta>`: a norma **não foi coletada ainda**. Não conclua que ela não existe; busque na fonte oficial.
- Atos de agências ficam em `reguladores/<órgão>/...`, jurisprudência em `jurisprudencia/`, tratados em `tratados/`, municipal em `municipais/UF/<município>/`. Use `ls` pra navegar. A ANPD **não** está em `reguladores/`: use o `legal-br`.
- Limite da API do GitHub: 60 req/h sem login. O script usa `gh auth token` ou `GITHUB_TOKEN` sozinho quando existem.

## 2. Confirmar na fonte oficial (navegador)

Quando o artigo for **material** pra resposta (vai citado, sustenta parecer, decide risco), abra o link
`fonte` do frontmatter e compare o trecho. O `normas.leg.br` é uma SPA: `curl` devolve só a
casca HTML, então use o navegador (Chromium headless pelo `dev-browser`, já instalado):

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("leis");
await page.goto("<URL da fonte do frontmatter>");
await page.waitForLoadState("networkidle");
await new Promise(r => setTimeout(r, 4000));          // a SPA renderiza o texto depois do load
const txt = await page.evaluate(() => document.body.innerText);
const i = txt.indexOf("Art. 18");                      // o artigo que você precisa
console.log(i >= 0 ? txt.slice(i, i + 1500) : "não achei; início: " + txt.slice(0, 300));
EOF
```

- Outras fontes oficiais (assembleias estaduais, agências): tente `WebFetch` primeiro; se voltar sem o texto da norma (casca de SPA, como a ALESP), use o mesmo script do navegador.
- Se o texto oficial **divergir** do espelho, vale o oficial, e avise o usuário da divergência.
- Sem conseguir abrir a fonte (bloqueio, offline): diga que o artigo **não foi confirmado no oficial**, não finja.

## 3. Como citar

Sempre os cinco itens: **norma (tipo, número/ano) + artigo + onde foi verificado + data da consulta + vigência**.

> Lei 13.709/2018 (LGPD), art. 18, caput. Verificado em normas.leg.br (`fonte`) em 2026-10-23; texto compilado, `revogada: false`.

- `revogada: true` ou `versao_texto: "original"` (sem alterações posteriores incorporadas): **alerte**. O texto pode estar desatualizado.
- Não invente número de artigo, nem de lei. Se o script não achou e o oficial não abriu, **escale pro advogado** (regra do Naruhodo).
- Nada disso é parecer jurídico.

Atribuição: acervo [ctresb/leis](https://github.com/ctresb/leis) (MIT). Os textos são atos oficiais; a conversão é dele.
