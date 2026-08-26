#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baixa uma planta publicada (PDF ou imagem) e prepara o JPEG da prancha.

Fluxo recomendado — duas chamadas, sem tentativa e erro:

  1) descobrir o recorte (uma unica olhada):
     python scripts/coletar.py URL --page 0 --probe img/_probe.jpg
     Abra _probe.jpg: ele traz uma grade com as fracoes 0.1 ... 0.9 marcadas.
     Leia as fracoes da regiao do desenho.

  2) gerar a imagem final:
     python scripts/coletar.py URL --page 0 --crop 0.0,0.0,1.0,0.38 -o img/nome.jpg

Varias URLs de uma vez empilham na vertical (planta em cima, perfil embaixo) —
e o caso da Orkney, que publica os dois desenhos separados:

     python scripts/coletar.py URL_PLANTA URL_PERFIL --trim --pad 24 -o img/ork_522.jpg

Opcoes uteis:
  --trim       corta margens brancas automaticamente (bom para PNG de estaleiro)
  --pad 24     borda branca; tambem e o espaco entre imagens empilhadas
  --maxw 2300  largura maxima do JPEG (padrao 2300)
  --referer U  manda Referer, para host que bloqueia hotlink
  --info       so imprime paginas/tamanho da fonte, sem gravar nada

Dependencias: requests, Pillow, pypdfium2 (so para PDF).
"""
import argparse
import io
import os
import sys

import requests
from PIL import Image, ImageChops, ImageDraw, ImageOps

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122.0 Safari/537.36")


def baixar(url, referer=None):
    h = {"User-Agent": UA}
    if referer:
        h["Referer"] = referer
    r = requests.get(url, headers=h, timeout=180, allow_redirects=True)
    r.raise_for_status()
    return r.content


def texto_pdf(dados, page):
    """Devolve o texto da pagina do PDF — bem mais barato que olhar a imagem."""
    import pypdfium2 as pdfium
    doc = pdfium.PdfDocument(io.BytesIO(dados))
    try:
        if page >= len(doc):
            raise SystemExit("ERRO: pagina %d nao existe (o PDF tem %d)." % (page, len(doc)))
        pag = doc[page]
        tp = pag.get_textpage()
        t = tp.get_text_range()
        tp.close()
        pag.close()
        return t, len(doc)
    finally:
        doc.close()


def abrir(dados, page, escala):
    """Devolve (PIL.Image, n_paginas). n_paginas = 0 quando nao e PDF."""
    if dados[:4] == b"%PDF":
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(io.BytesIO(dados))
        try:
            n = len(doc)
            if page >= n:
                raise SystemExit("ERRO: pagina %d nao existe (o PDF tem %d)." % (page, n))
            pag = doc[page]
            im = pag.render(scale=escala).to_pil().convert("RGB")
            pag.close()
            return im, n
        finally:
            doc.close()
    try:
        im = Image.open(io.BytesIO(dados))
        im.load()
    except Exception:
        amostra = dados[:80].decode("utf-8", "replace").replace("\n", " ")
        raise SystemExit(
            "ERRO: a resposta nao e PDF nem imagem. Comeca com: %r\n"
            "       Provavel pagina de erro, bloqueio de hotlink ou URL errada.\n"
            "       Tente --referer com a pagina do modelo." % amostra)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        fundo = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(fundo, im)
    return im.convert("RGB"), 0


def trim_branco(im, tol=8):
    cinza = im.convert("L")
    fundo = Image.new("L", im.size, 255)
    dif = ImageChops.difference(cinza, fundo)
    caixa = dif.point(lambda p: 255 if p > tol else 0).getbbox()
    return im.crop(caixa) if caixa else im


def empilhar(ims, pad=20):
    """Empilha imagens na vertical, alinhadas pela largura, sobre fundo branco."""
    pad = max(pad, 12)
    larg = max(i.width for i in ims)
    ims = [i if i.width == larg else i.resize((larg, int(i.height * larg / i.width)), Image.LANCZOS)
           for i in ims]
    alt = sum(i.height for i in ims) + pad * (len(ims) + 1)
    tela = Image.new("RGB", (larg + pad * 2, alt), "white")
    y = pad
    for i in ims:
        tela.paste(i, (pad, y))
        y += i.height + pad
    return tela


def grade(im):
    """Sobrepoe as fracoes 0.1..0.9 nos dois eixos, para escolher o --crop."""
    im = im.copy()
    d = ImageDraw.Draw(im)
    w, h = im.size
    for f in [i / 10.0 for i in range(1, 10)]:
        y = int(h * f)
        d.line([(0, y), (w, y)], fill=(220, 30, 30), width=max(1, h // 500))
        d.text((6, y + 3), "%.1f" % f, fill=(220, 30, 30))
        x = int(w * f)
        d.line([(x, 0), (x, h)], fill=(30, 90, 220), width=max(1, w // 700))
        d.text((x + 3, 6), "%.1f" % f, fill=(30, 90, 220))
    return im


def main():
    ap = argparse.ArgumentParser(description="Baixa e prepara a imagem de uma planta publicada.")
    ap.add_argument("urls", nargs="+", help="uma ou mais URLs; com mais de uma, empilha na vertical")
    ap.add_argument("-o", "--saida", default=None, help="caminho do JPEG final")
    ap.add_argument("--page", type=int, default=0, help="pagina do PDF (0 = primeira)")
    ap.add_argument("--crop", default=None, help="L,T,R,B em fracoes de 0 a 1")
    ap.add_argument("--probe", default=None, help="grava uma previa com grade de fracoes")
    ap.add_argument("--trim", action="store_true", help="corta margens brancas")
    ap.add_argument("--pad", type=int, default=0, help="borda branca em pixels")
    ap.add_argument("--maxw", type=int, default=2300)
    ap.add_argument("--escala", type=float, default=3.2, help="escala de render do PDF")
    ap.add_argument("--referer", default=None)
    ap.add_argument("--texto", action="store_true",
                    help="imprime o texto da pagina do PDF (leia os dados daqui, nao da imagem)")
    ap.add_argument("--max-texto", dest="max_texto", type=int, default=4000)
    ap.add_argument("--info", action="store_true", help="so inspeciona a fonte")
    a = ap.parse_args()

    if a.probe and len(a.urls) > 1:
        print("AVISO: --probe examina so a primeira URL (%s)." % a.urls[0], file=sys.stderr)
    if a.page < 0:
        print("ERRO: --page nao pode ser negativo.", file=sys.stderr)
        return 2
    if not (a.saida or a.probe or a.info or a.texto):
        print("ERRO: informe -o caminho/da/imagem.jpg (ou --probe, --texto, --info).", file=sys.stderr)
        return 2

    escala = 1.4 if (a.probe or a.info) else a.escala
    crop = None
    if a.crop:
        try:
            crop = [float(v) for v in a.crop.split(",")]
            if len(crop) != 4:
                raise ValueError
        except ValueError:
            print("ERRO: --crop precisa de 4 numeros, ex.: 0,0,1,0.38", file=sys.stderr)
            return 2
        if not all(0.0 <= v <= 1.0 for v in crop):
            print("ERRO: --crop usa fracoes de 0 a 1, nao pixels. Recebi %s" % a.crop, file=sys.stderr)
            return 2
        if crop[2] <= crop[0] or crop[3] <= crop[1]:
            print("ERRO: --crop precisa de L<R e T<B. Recebi L=%g T=%g R=%g B=%g"
                  % tuple(crop), file=sys.stderr)
            return 2

    partes = []
    for url in a.urls:
        try:
            dados = baixar(url, a.referer)
        except Exception as e:
            print("ERRO ao baixar %s: %s" % (url, e), file=sys.stderr)
            return 1
        if len(dados) < 512:
            print("ERRO: %s devolveu %d bytes — bloqueio ou 404." % (url, len(dados)), file=sys.stderr)
            return 1

        if a.texto:
            if dados[:4] != b"%PDF":
                print("ERRO: --texto so funciona em PDF.", file=sys.stderr)
                return 2
            t, npag = texto_pdf(dados, a.page)
            print("=== %s  (pagina %d de %d) ===" % (url, a.page, npag))
            print(t.strip()[: a.max_texto])
            continue

        im, npag = abrir(dados, a.page, escala)

        if a.info:
            print("%s  tipo=%s paginas=%s render=%dx%d"
                  % (url, "PDF" if npag else "imagem", npag or "-", im.width, im.height))
            continue

        if a.probe:
            os.makedirs(os.path.dirname(a.probe) or ".", exist_ok=True)
            g = grade(im)
            if g.width > 1100:
                g = g.resize((1100, int(g.height * 1100 / g.width)), Image.LANCZOS)
            g.save(a.probe, quality=70)
            print("previa com grade: %s  (%dx%d)  paginas=%s" % (a.probe, im.width, im.height, npag or "-"))
            print("Leia as fracoes e chame de novo com --crop L,T,R,B")
            return 0

        if crop:
            w, h = im.size
            im = im.crop((int(w * crop[0]), int(h * crop[1]), int(w * crop[2]), int(h * crop[3])))
        if a.trim:
            im = trim_branco(im)
        partes.append(im)

    if a.info or a.texto:
        return 0

    im = empilhar(partes, a.pad) if len(partes) > 1 else partes[0]
    if len(partes) == 1 and a.pad:
        im = ImageOps.expand(im, border=a.pad, fill="white")
    if im.width > a.maxw:
        im = im.resize((a.maxw, int(im.height * a.maxw / im.width)), Image.LANCZOS)

    os.makedirs(os.path.dirname(a.saida) or ".", exist_ok=True)
    im.save(a.saida, quality=88, optimize=True)
    print("%s  %dx%d  %.0f kB%s"
          % (a.saida, im.width, im.height, os.path.getsize(a.saida) / 1024.0,
             ("  (%d imagens empilhadas)" % len(partes)) if len(partes) > 1 else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
