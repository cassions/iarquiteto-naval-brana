#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera o PDF de Arranjos Gerais a partir de um manifesto JSON.

Uso:
    python scripts/gerar_pdf.py manifesto.json [-o "Arranjos Gerais - Nome.pdf"]

O nome do arquivo sai de manifesto["projetista"] quando -o e omitido.
Dependencias: reportlab, Pillow.
"""
import json
import os
import sys
import argparse

from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader

# ---------------------------------------------------------------- constantes
W, H = 960.0, 540.0                     # 16:9 em pontos
INK, INK2, MUT = "#1F2429", "#5A626B", "#8E969C"
PAPER, PANEL, LINE = "#FFFFFF", "#EFF2F3", "#D3D9DC"
ACC, TEAL = "#C4262E", "#2E6B72"
ONDARK, ONDARK2 = "#E9ECEE", "#A8B0B6"
F, FB, FI = "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"

M = 36.0                                # margem
IMG_X, IMG_Y, IMG_W, IMG_H = M, 62.0, 560.0, 400.0
PAN_X, PAN_W = 612.0, 312.0
PAN_Y, PAN_H = 62.0, 400.0

# rotulos aceitos no indice -> coluna
IDX_MAP = [
    ("loa", ("comprimento", "loa", "comprimento total", "comprimento do casco", "comprimento x boca", "comprimento total (loa)")),
    ("boca", ("boca", "boca maxima", "boca externa")),
    ("pontal", ("pontal", "depth", "borda")),
    ("calado", ("calado", "draft")),
    ("peso", ("peso", "peso aproximado", "peso do casco", "deslocamento", "deslocamento seco", "peso seco", "peso seco do casco")),
    ("hp", ("potencia maxima", "potencia", "max hp", "potencia max.")),
    ("deadrise", ("deadrise", "deadrise no espelho", "angulo de v")),
    ("material", ("material", "construcao")),
]


# glifos fora do Latin-1 que a Helvetica nao desenha -> equivalente seguro
_TROCA = {
    "′": "'", "″": '"', "‘": "'", "’": "'",
    "“": '"', "”": '"', "–": "-", "—": "—",
    "…": "...", "▸": ">", "▶": ">", "▪": "-",
    "•": "·", "✓": "sim", "→": "->", "≤": "<=",
    "≥": ">=", "≈": "~", " ": " ", "−": "-",
    " ": " ", " ": " ", "​": "",
}


def limpar(t):
    """Troca glifos que a fonte nao tem. Acentos latinos passam intactos."""
    if not isinstance(t, str):
        return t
    for a, b in _TROCA.items():
        if a in t:
            t = t.replace(a, b)
    try:
        t.encode("cp1252")
    except UnicodeEncodeError:
        t = "".join(ch if ch.encode("cp1252", "ignore") else "?" for ch in t)
    return t


def limpar_tudo(o):
    """Aplica limpar() em todo texto do manifesto, recursivamente."""
    if isinstance(o, str):
        return limpar(o)
    if isinstance(o, list):
        return [limpar_tudo(v) for v in o]
    if isinstance(o, dict):
        return {k: limpar_tudo(v) for k, v in o.items()}
    return o


def par2(x, pad=""):
    """Normaliza uma linha para exatamente 2 campos, sem quebrar."""
    if isinstance(x, str):
        return [x, pad]
    if isinstance(x, (list, tuple)):
        v = list(x) + [pad, pad]
        return [str(v[0]), str(v[1])]
    return [str(x), pad]


def _norm(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return s.strip().lower().rstrip(":").strip()


# ---------------------------------------------------------------- utilitarios
def wrap(c, text, font, size, maxw):
    """Quebra texto em linhas que cabem em maxw."""
    c.setFont(font, size)
    out, linha = [], ""
    for palavra in str(text).split():
        teste = (linha + " " + palavra).strip()
        if c.stringWidth(teste, font, size) <= maxw or not linha:
            linha = teste
        else:
            out.append(linha)
            linha = palavra
    if linha:
        out.append(linha)
    return out


def par(c, text, x, y, maxw, font=F, size=9.5, cor=INK2, leading=None, maxlines=None):
    """Escreve paragrafo descendo a partir de y. Devolve o y final."""
    leading = leading or size * 1.38
    linhas = wrap(c, text, font, size, maxw)
    if maxlines and len(linhas) > maxlines:
        linhas = linhas[:maxlines]
        linhas[-1] = linhas[-1][: max(0, len(linhas[-1]) - 1)] + "..."
    c.setFillColor(cor)
    c.setFont(font, size)
    for ln in linhas:
        c.drawString(x, y, ln)
        y -= leading
    return y


def rect(c, x, y, w, h, fill=None, stroke=None, lw=0.6, r=None):
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(lw)
    if r:
        c.roundRect(x, y, w, h, r, stroke=1 if stroke else 0, fill=1 if fill else 0)
    else:
        c.rect(x, y, w, h, stroke=1 if stroke else 0, fill=1 if fill else 0)


def rodape(c, txt):
    if not txt:
        return
    c.setFillColor(MUT)
    c.setFont(F, 6.9)
    linhas = wrap(c, txt, F, 6.9, W - 2 * M)
    y = 36.0
    for ln in linhas[:2]:
        c.drawString(M, y, ln)
        y -= 9.0


def cabecalho(c, chip, titulo, sub=None):
    x = M
    if chip:
        cw = c.stringWidth(chip, FB, 8) + 16
        rect(c, M, H - 44, cw, 15, fill=ACC, r=2)
        c.setFillColor("#FFFFFF")
        c.setFont(FB, 8)
        c.drawString(M + 8, H - 39.5, chip)
        x = M + cw + 12
    c.setFillColor(INK)
    c.setFont(FB, 17)
    for ln in wrap(c, titulo, FB, 17, W - x - M)[:1]:
        c.drawString(x, H - 40, ln)
    if sub:
        c.setFillColor(INK2)
        c.setFont(F, 8.6)
        for ln in wrap(c, sub, F, 8.6, W - x - M)[:1]:
            c.drawString(x, H - 54, ln)


def img_fit(path, bx, by, bw, bh):
    """Devolve (x, y, w, h) da imagem ajustada e centrada na caixa."""
    from PIL import Image
    with Image.open(path) as im:
        iw, ih = im.size
    r = iw / float(ih)
    w, h = bw, bw / r
    if h > bh:
        h, w = bh, bh * r
    return bx + (bw - w) / 2.0, by + (bh - h) / 2.0, w, h


# ---------------------------------------------------------------- paginas
def pg_capa(c, m):
    rect(c, 0, 0, W, H, fill=INK)
    c.setFillColor(ACC)
    c.setFont(FB, 8)
    c.drawString(M + 20, H - 96, m.get("eyebrow", "BRANA  ·  ARQUITETURA NAVAL  ·  ESTUDO DE SIMILAR").upper())
    c.setFillColor("#FFFFFF")
    c.setFont(FB, 38)
    y = H - 140
    for ln in wrap(c, m.get("titulo", "Arranjos Gerais Encontrados"), FB, 38, W - 2 * M - 40)[:2]:
        c.drawString(M + 20, y, ln)
        y -= 44
    par(c, m.get("resumo", ""), M + 20, y - 12, 560, F, 11, ONDARK2, 16, maxlines=4)

    stats = m.get("stats") or []
    if not stats:
        n = sum(len(s.get("pranchas", [])) for s in m.get("secoes", []))
        stats = [[str(n), "pranchas cotadas"], [str(len(m.get("secoes", []))), "grupos de fonte"]]
    for i, st in enumerate(stats[:4]):
        sx = M + 20 + i * 200
        c.setFillColor(ACC)
        c.setFont(FB, 32)
        c.drawString(sx, 128, str(st[0]))
        c.setFillColor(ONDARK2)
        c.setFont(F, 8.5)
        c.drawString(sx, 112, str(st[1]))
    c.setFillColor(MUT)
    c.setFont(F, 8.5)
    c.drawString(M + 20, 62, "Projetista: %s          %s" % (m.get("projetista", ""), m.get("data", "")))
    c.showPage()


def pg_secao(c, num, titulo, sub, bullets):
    rect(c, 0, 0, W, H, fill=INK)
    c.setFillColor(ACC)
    c.setFont(FB, 68)
    c.drawString(M + 20, H - 190, str(num))
    c.setFillColor(ONDARK)
    c.setFont(FB, 30)
    c.drawString(M + 20, H - 250, titulo)
    c.setFillColor(ONDARK2)
    c.setFont(F, 10.5)
    c.drawString(M + 20, H - 272, sub or "")
    y = H - 306
    for b in (bullets or [])[:4]:
        c.setFillColor(ACC)
        c.setFont(FB, 9)
        c.drawString(M + 20, y, "—")
        y = par(c, b, M + 38, y, 760, F, 9.3, ONDARK2, 13, maxlines=2) - 6
    c.showPage()


def pg_prancha(c, p):
    rect(c, 0, 0, W, H, fill=PAPER)
    cabecalho(c, p.get("id"), p.get("nome", ""), p.get("sub"))

    img = p.get("img")
    if img and os.path.exists(img):
        x, y, w, h = img_fit(img, IMG_X, IMG_Y, IMG_W, IMG_H)
        c.drawImage(ImageReader(img), x, y, w, h, mask=None)
        rect(c, x, y, w, h, stroke=LINE, lw=0.6)
    else:
        rect(c, IMG_X, IMG_Y, IMG_W, IMG_H, fill=PANEL, stroke=LINE)
        c.setFillColor(MUT)
        c.setFont(F, 9)
        c.drawCentredString(IMG_X + IMG_W / 2, IMG_Y + IMG_H / 2, "imagem nao encontrada: %s" % (img or "-"))

    # painel
    rect(c, PAN_X, PAN_Y, PAN_W, PAN_H, fill=PANEL, stroke=LINE, r=3)
    ix, iw = PAN_X + 16, PAN_W - 32
    y = PAN_Y + PAN_H - 22
    c.setFillColor(TEAL)
    c.setFont(FB, 7.2)
    c.drawString(ix, y, "DADOS PUBLICADOS")
    y -= 16

    dados = [par2(d) for d in (p.get("dados") or [])]
    rh = 13.2 if len(dados) > 9 else 14.4
    for d in dados[:12]:
        c.setFillColor(INK2)
        c.setFont(F, 8)
        c.drawString(ix, y, str(d[0])[:34])
        c.setFillColor(INK)
        c.setFont(FB, 8)
        c.drawRightString(ix + iw, y, str(d[1])[:24])
        c.setStrokeColor(LINE)
        c.setLineWidth(0.4)
        c.line(ix, y - 4.5, ix + iw, y - 4.5)
        y -= rh
    y -= 6

    blocos = p.get("notas") or ([p["nota"]] if p.get("nota") else [])
    for bloco in [par2(b, " ") for b in blocos]:
        if y < PAN_Y + 34:
            break
        c.setFillColor(ACC)
        c.setFont(FB, 7.2)
        c.drawString(ix, y, str(bloco[0])[:44])
        y -= 12
        lim = max(1, int((y - PAN_Y - 14) / 11.0))
        y = par(c, bloco[1], ix, y, iw, F, 8, INK, 11, maxlines=lim) - 6

    rodape(c, p.get("fonte"))
    c.showPage()


def pg_indice(c, linhas, titulo, sub, nota):
    rect(c, 0, 0, W, H, fill=PAPER)
    cabecalho(c, None, titulo, sub)
    cols = [("", 52), ("Embarcacao", 236), ("LOA", 62), ("Boca", 52), ("Pontal", 46),
            ("Calado", 46), ("Peso", 60), ("Max HP", 44), ("Deadrise", 48), ("Material", 74), ("Pais", 34)]
    x0, top = M, H - 72
    rect(c, x0, top - 17, sum(w for _, w in cols), 17, fill=INK)
    x = x0
    for i, (nome, w) in enumerate(cols):
        c.setFillColor(ONDARK)
        c.setFont(FB, 6.6)
        if i <= 1 or i >= 9:
            c.drawString(x + 4, top - 12, nome)
        else:
            c.drawRightString(x + w - 4, top - 12, nome)
        x += w
    y = top - 17
    rh = min(24.0, max(14.0, (top - 17 - 58.0) / max(1, len(linhas))))
    for k, ln in enumerate(linhas):
        y -= rh
        rect(c, x0, y, sum(w for _, w in cols), rh, fill=(PANEL if k % 2 else "#FFFFFF"), stroke=LINE, lw=0.3)
        x = x0
        for i, (_, w) in enumerate(cols):
            v = str(ln[i]) if i < len(ln) else ""
            c.setFillColor(ACC if i == 0 else (MUT if v in ("-", "—", "") else INK))
            c.setFont(FB if i <= 1 else F, 6.9)
            ty = y + rh / 2 - 2.4
            if i <= 1 or i >= 9:
                c.drawString(x + 4, ty, v[:52])
            else:
                c.drawRightString(x + w - 4, ty, v[:18])
            x += w
    rodape(c, nota)
    c.showPage()


def pg_comparativo(c, titulo, sub, linhas, nota):
    rect(c, 0, 0, W, H, fill=PAPER)
    cabecalho(c, None, titulo, sub)
    y = H - 84
    for i, r in enumerate(linhas[:7]):
        h = 46.0
        y -= h
        rect(c, M, y, W - 2 * M, h, fill=(PANEL if i % 2 else "#FFFFFF"), stroke=LINE, lw=0.4, r=2)
        c.setFillColor(INK)
        c.setFont(FB, 9.5)
        c.drawString(M + 14, y + h / 2 - 3, str(r[0])[:26])
        c.setFillColor(MUT)
        c.setFont(F, 6.2)
        c.drawString(M + 190, y + h - 14, "NAS PRANCHAS")
        c.drawString(M + 350, y + h - 14, "SEU PROJETO")
        c.setFillColor(TEAL)
        c.setFont(FB, 9.5)
        c.drawString(M + 190, y + 14, str(r[1])[:26] if len(r) > 1 else "")
        c.setFillColor(ACC)
        c.setFont(FB, 9.5)
        c.drawString(M + 350, y + 14, str(r[2])[:26] if len(r) > 2 else "")
        par(c, r[3] if len(r) > 3 else "", M + 510, y + h - 16, W - 2 * M - 524, F, 8.2, INK2, 11, maxlines=3)
    rodape(c, nota)
    c.showPage()


def pg_leituras(c, titulo, sub, itens, nota):
    rect(c, 0, 0, W, H, fill=PAPER)
    cabecalho(c, None, titulo, sub)
    cw, ch = (W - 2 * M - 18) / 2.0, 118.0
    for i, it in enumerate(itens[:6]):
        cx = M + (i % 2) * (cw + 18)
        cy = H - 84 - (i // 2 + 1) * (ch + 12) + 12
        rect(c, cx, cy, cw, ch, fill=PANEL, stroke=LINE, lw=0.5, r=3)
        c.setFillColor(ACC)
        c.circle(cx + 22, cy + ch - 22, 10, stroke=0, fill=1)
        c.setFillColor("#FFFFFF")
        c.setFont(FB, 7.5)
        it = list(it) + ["", "", ""]
        c.drawCentredString(cx + 22, cy + ch - 24.5, str(it[0]))
        c.setFillColor(INK)
        c.setFont(FB, 10)
        for ln in wrap(c, it[1], FB, 10, cw - 60)[:1]:
            c.drawString(cx + 40, cy + ch - 25, ln)
        par(c, it[2], cx + 40, cy + ch - 42, cw - 56, F, 7.8, INK2, 10.4, maxlines=6)
    rodape(c, nota)
    c.showPage()


def pg_fontes(c, titulo, nota, grupos):
    rect(c, 0, 0, W, H, fill=INK)
    c.setFillColor("#FFFFFF")
    c.setFont(FB, 24)
    c.drawString(M + 12, H - 62, titulo)
    y = H - 84
    if nota:
        y = par(c, nota, M + 12, y, 740, F, 8.4, ONDARK2, 11.6, maxlines=2) - 8
    for g in grupos:
        if y < 50:
            break
        c.setFillColor(ACC)
        c.setFont(FB, 7.4)
        c.drawString(M + 12, y, str(g[0]).upper())
        y -= 13
        c.setFillColor(ONDARK2)
        c.setFont(F, 7.4)
        for ln in g[1]:
            if y < 42:
                break
            for w in wrap(c, ln, F, 7.4, W - 2 * M - 24)[:2]:
                c.drawString(M + 12, y, w)
                y -= 10
        y -= 8
    c.showPage()


# ---------------------------------------------------------------- indice auto
def linha_indice(p):
    if p.get("idx"):
        return [p.get("id", "")] + list(p["idx"])
    campos = {k: "—" for k, _ in IDX_MAP}
    for rot, val in [par2(d) for d in (p.get("dados") or [])]:
        n = _norm(rot)
        for chave, aliases in IDX_MAP:
            if campos[chave] == "—" and (n in aliases or any(n.startswith(a) for a in aliases)):
                campos[chave] = str(val)
                break
    return [p.get("id", ""), p.get("nome", "")] + [campos[k] for k, _ in IDX_MAP] + [p.get("pais", "—")]


# ---------------------------------------------------------------- principal
def gerar(man, saida):
    c = rl_canvas.Canvas(saida, pagesize=(W, H))
    c.setTitle(man.get("titulo", "Arranjos Gerais Encontrados"))
    c.setAuthor(man.get("projetista", ""))

    pg_capa(c, man)

    todas = [p for s in man.get("secoes", []) for p in s.get("pranchas", [])]
    linhas = [linha_indice(p) for p in todas]
    nota_idx = man.get("nota_indice", "Celula vazia significa que o desenho nao informa o dado.")
    for i in range(0, len(linhas), 16):
        bloco = linhas[i:i + 16]
        tit = "Indice das %d pranchas" % len(linhas)
        if len(linhas) > 16:
            tit += "  (%d de %d)" % (i // 16 + 1, (len(linhas) + 15) // 16)
        pg_indice(c, bloco, tit, man.get("sub_indice", "Ordenadas pela ordem das secoes."), nota_idx)

    for i, s in enumerate(man.get("secoes", []), start=1):
        pg_secao(c, s.get("num", "%02d" % i), s.get("titulo", ""), s.get("sub", ""), s.get("bullets"))
        for p in s.get("pranchas", []):
            pg_prancha(c, p)

    for p in man.get("sem_planta", []):
        pg_prancha(c, p)

    if man.get("comparativo"):
        pg_comparativo(c, man.get("titulo_comparativo", "As pranchas contra o seu projeto"),
                       man.get("sub_comparativo", "Onde o seu projeto cai dentro do que os desenhos publicados mostram"),
                       man["comparativo"], man.get("nota_comparativo", ""))
    if man.get("leituras"):
        pg_leituras(c, man.get("titulo_leituras", "O que estas plantas mudam no projeto"),
                    man.get("sub_leituras", "Leituras que so aparecem depois de ver os desenhos cotados"),
                    man["leituras"], man.get("nota_leituras", ""))
    for i, bloco in enumerate(man.get("fontes", [])):
        pg_fontes(c, bloco.get("titulo", "Fontes"), bloco.get("nota") if i == 0 else None, bloco.get("grupos", []))

    c.save()
    return saida


def faixas(pranchas):
    """Imprime min/max de cada parametro nas pranchas, para preencher o comparativo."""
    import re
    col = {k: [] for k, _ in IDX_MAP}
    for p in pranchas:
        ln = linha_indice(p)
        for i, (k, _) in enumerate(IDX_MAP):
            v = ln[2 + i]
            m = re.search(r"-?\d+[.,]?\d*", str(v).replace(".", ""))
            if m and v != "—":
                col[k].append((float(m.group(0).replace(",", ".")), str(v)))
    print("Faixas nas %d pranchas — cole no 'comparativo':" % len(pranchas))
    for k, vals in col.items():
        if not vals:
            print("  %-10s —  (nenhuma prancha informa)" % k)
            continue
        vals.sort()
        lo, hi = vals[0][1], vals[-1][1]
        print("  %-10s %s a %s   (%d de %d pranchas informam)"
              % (k, lo, hi, len(vals), len(pranchas)))


def main():
    ap = argparse.ArgumentParser(description="Gera o PDF de Arranjos Gerais.")
    ap.add_argument("manifesto")
    ap.add_argument("-o", "--saida", default=None)
    ap.add_argument("--faixas", action="store_true",
                    help="so calcula min/max de cada parametro nas pranchas, para o comparativo")
    a = ap.parse_args()

    try:
        with open(a.manifesto, encoding="utf-8") as fh:
            man = limpar_tudo(json.load(fh))
    except FileNotFoundError:
        print("ERRO: manifesto nao encontrado: %s" % a.manifesto, file=sys.stderr)
        return 2
    except json.JSONDecodeError as e:
        print("ERRO: JSON invalido em %s, linha %d coluna %d: %s"
              % (a.manifesto, e.lineno, e.colno, e.msg), file=sys.stderr)
        print("      Causa comum: virgula sobrando antes de ] ou }, ou aspas nao fechadas.", file=sys.stderr)
        return 2
    if not isinstance(man, dict):
        print("ERRO: o manifesto precisa ser um objeto JSON, veio %s." % type(man).__name__, file=sys.stderr)
        return 2
    if not man.get("secoes"):
        print("AVISO: manifesto sem 'secoes' — o PDF vai sair so com a capa.", file=sys.stderr)

    nome = str(man.get("projetista") or "").strip()
    if not nome and not a.saida:
        print("ERRO: manifesto sem 'projetista'. Pergunte o nome de quem usa a skill.", file=sys.stderr)
        return 2
    saida = a.saida or ("Arranjos Gerais - %s.pdf" % nome)

    todas_p = [p for s in man.get("secoes", []) for p in s.get("pranchas", [])] + man.get("sem_planta", [])
    faltando = [p.get("img") for p in todas_p if p.get("img") and not os.path.exists(p["img"])]
    if faltando:
        print("AVISO: %d imagem(ns) nao encontrada(s): %s" % (len(faltando), ", ".join(faltando[:5])), file=sys.stderr)

    excesso = [p.get("id", p.get("nome", "?")) for p in todas_p if len(p.get("dados") or []) > 12]
    if excesso:
        print("AVISO: %s tem mais de 12 linhas de 'dados'; o painel mostra so as 12 primeiras."
              % ", ".join(excesso[:5]), file=sys.stderr)

    n = sum(len(s.get("pranchas", [])) for s in man.get("secoes", []))
    if n < 10:
        print("AVISO: so %d pranchas. A skill exige no minimo 10." % n, file=sys.stderr)

    if a.faixas:
        faixas(todas_p)
        return 0

    gerar(man, saida)
    print("PDF gerado: %s  (%d pranchas)" % (saida, n))
    return 0


if __name__ == "__main__":
    sys.exit(main())
