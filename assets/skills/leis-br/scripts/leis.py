#!/usr/bin/env python3
"""Busca uma norma brasileira no acervo ctresb/leis SEM baixar o repositório.

  leis.py lei 13709 2018 --artigo 5        # Lei federal, só o Art. 5º
  leis.py const --artigo 5                 # Constituição Federal
  leis.py --uf SP lei 17000 2018           # lei estadual
  leis.py ls reguladores/anpd              # navegar uma pasta do acervo

Tipos: lei, lc, dl, delegada, ec, decreto, resolucao, const.
Saída sempre abre com o cabeçalho (fonte oficial, revogada?). Texto é espelho NÃO oficial.
"""
import argparse, json, os, re, subprocess, sys, urllib.request, urllib.error

REPO = "ctresb/leis"
RAW = f"https://raw.githubusercontent.com/{REPO}/main/"
API = f"https://api.github.com/repos/{REPO}/contents/"
CACHE = os.path.expanduser("~/.cache/leis-br")
PASTA = {"lei": "leis-ordinarias", "lc": "leis-complementares", "dl": "decretos-lei",
         "delegada": "leis-delegadas", "ec": "emendas-constitucionais",
         "decreto": "decretos", "resolucao": "resolucoes"}


def _token():
    t = os.environ.get("GITHUB_TOKEN")
    if t:
        return t
    try:  # ponytail: sem token são 60 req/h; com o do gh são 5000
        return subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=5).stdout.strip() or None
    except Exception:
        return None


def _get(url, api=False):
    h = {"User-Agent": "leis-br-skill"}
    if api and (t := _token()):
        h["Authorization"] = f"Bearer {t}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=30) as r:
            return r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        if e.code == 403 and api:
            sys.exit("limite da API do GitHub estourou; defina GITHUB_TOKEN ou rode `gh auth login`")
        raise


def listar(path):
    body = _get(API + path + "?ref=main", api=True)
    if body is None:
        return None
    d = json.loads(body)
    return d if isinstance(d, list) else None


def texto(path):
    cache = os.path.join(CACHE, path.replace("/", "__"))
    if os.path.exists(cache):
        return open(cache, encoding="utf-8").read()
    t = _get(RAW + path)
    if t is not None:
        os.makedirs(CACHE, exist_ok=True)
        open(cache, "w", encoding="utf-8").write(t)
    return t


def cabecalho(t):
    m = re.match(r"---\n(.*?)\n---\n", t, re.S)
    return m.group(1) if m else "(sem frontmatter)"


def artigo(t, n):
    d, suf = re.match(r"(\d+)(?:-?([A-Za-z]))?$", n.strip().replace("º", "")).groups()
    suf_rx = "-%s" % suf if suf else ""  # "Art. 5º-A" / "Artigo 1º -" (estaduais)
    ini = re.compile(r"^\*\*Art(?:igo|\.)\s*%s[º°]?%s\s*[.\-–]*\s*\*\*" % (d, suf_rx))
    blocos, atual = [], None
    for ln in t.splitlines():
        if ini.match(ln):
            atual = [ln]
            blocos.append(atual)
        elif atual is not None and (ln.startswith("**Art") or ln.startswith("#")):
            atual = None
        elif atual is not None:
            atual.append(ln)
    return ["\n".join(b).strip() for b in blocos]


def achar(args):
    if args.tipo == "const":
        return "constituicao.md"
    if not (args.numero and args.ano):
        sys.exit("informe NUMERO e ANO (ex.: lei 13709 2018) — a citação da norma sempre traz o ano")
    base = f"estaduais/{args.uf.upper()}" if args.uf else "federal"
    pasta = f"{base}/{PASTA[args.tipo]}/{args.ano}"
    itens = listar(pasta)
    if itens is None:
        sys.exit(f"não existe {pasta} no acervo (norma ainda não coletada?)")
    num = args.numero.replace(".", "")
    rx = re.compile(r"-%s-%s-\d\d-\d\d(?:-id\d+)?\.md$" % (num, args.ano))  # estaduais trazem sufixo -idNNN
    ach = [i["path"] for i in itens if rx.search(i["name"])]
    if not ach:
        sys.exit(f"{args.tipo} {args.numero}/{args.ano} não está em {pasta} (ausente do acervo — buscar na fonte oficial)")
    if len(ach) > 1:
        sys.exit("mais de uma correspondência:\n" + "\n".join(ach))
    return ach[0]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tipo", choices=[*PASTA, "const", "ls"])
    ap.add_argument("numero", nargs="?")
    ap.add_argument("ano", nargs="?")
    ap.add_argument("--uf")
    ap.add_argument("--artigo")
    ap.add_argument("--tudo", action="store_true", help="imprime o texto inteiro (pode ser grande)")
    a = ap.parse_args()

    if a.tipo == "ls":
        itens = listar(a.numero or "")
        if itens is None:
            sys.exit("pasta inexistente")
        print("\n".join(i["name"] + ("/" if i["type"] == "dir" else "") for i in itens))
        return

    path = achar(a)
    t = texto(path)
    if t is None:
        sys.exit(f"arquivo não encontrado: {path}")
    print(f"# arquivo: {path}\n# url: {RAW}{path}\n")
    print(cabecalho(t), "\n")
    if a.artigo:
        blocos = artigo(t, a.artigo)
        if not blocos:
            sys.exit(f"Art. {a.artigo} não encontrado (texto pode estar revogado/ausente — conferir na fonte)")
        for i, b in enumerate(blocos, 1):
            print(("--- ocorrência %d/%d (a 1ª costuma ser o corpo da norma; as demais, ADCT/transitórias) ---\n" % (i, len(blocos)) if len(blocos) > 1 else "") + b + "\n")
    elif a.tudo:
        print(t)
    else:
        print("\n".join(t.splitlines()[len(cabecalho(t).splitlines()) + 3:][:40]))
        print("\n[... use --artigo N para um artigo, ou --tudo]")
    print("AVISO: espelho não oficial (conversão/OCR). Conferir o artigo na URL de `fonte` antes de citar.")


if __name__ == "__main__":
    main()
