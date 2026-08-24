#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Monta/atualiza o acervo de cartas nauticas raster do CHM/Marinha do Brasil.

A pagina de listagem (www.marinha.mil.br) fica atras de um desafio Cloudflare
que exige verificacao humana, entao por padrao a lista de cartas vem do snapshot
mais recente do Internet Archive. Os arquivos em si vem direto de
assets.marinha.mil.br, que responde normalmente.

Para usar a listagem ao vivo: abra a pagina no navegador, passe pela verificacao,
salve o HTML e rode com --html arquivo.html. Isso pega cartas publicadas depois
do ultimo snapshot.

Uso:
    python baixar.py
    python baixar.py --destino "D:\\cartas" --geotiff
    python baixar.py --html cartas-raster.html
    python baixar.py --listar
"""

import argparse
import concurrent.futures as cf
import csv
import html as html_mod
import io
import json
import os
import re
import sys
import time
import urllib.request

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

PAGINA = "www.marinha.mil.br/chm/dados-do-segnav/cartas-raster"
CDX = ("https://web.archive.org/cdx/search/cdx?url=%s&output=text"
       "&filter=statuscode:200&limit=-3" % PAGINA)
ASSETS = "https://assets.marinha.mil.br"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")


def buscar(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        dados = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            import gzip
            dados = gzip.decompress(dados)
    return dados


def html_da_listagem(caminho_local=None):
    if caminho_local:
        print("lista: arquivo local %s" % caminho_local)
        return open(caminho_local, encoding="utf-8", errors="replace").read()

    print("lista: procurando o snapshot mais recente no Internet Archive...")
    linhas = [l for l in buscar(CDX).decode("utf-8", "replace").splitlines() if l.strip()]
    if not linhas:
        sys.exit("nao achei snapshot da pagina do CHM. Use --html com a pagina salva.")
    carimbo = linhas[-1].split()[1]
    print("lista: snapshot de %s-%s-%s" % (carimbo[:4], carimbo[4:6], carimbo[6:8]))
    url = "https://web.archive.org/web/%sid_/https://%s" % (carimbo, PAGINA)
    return buscar(url).decode("utf-8", "replace")


def _texto(c):
    return re.sub(r"\s+", " ", html_mod.unescape(re.sub(r"<[^>]+>", " ", c))).strip()


def _bytes(t):
    m = re.search(r"\(([\d.,]+)\s*(KB|MB|GB)\)", t)
    if not m:
        return None
    return int(float(m.group(1).replace(",", "")) *
               {"KB": 1024, "MB": 1048576, "GB": 1073741824}[m.group(2)])


def parsear(texto):
    """Extrai a tabela de cartas. Colunas: numero, titulo, raster, data, aviso, geotiff."""
    cartas = []
    for linha in re.findall(r"(?s)<tr[^>]*>(.*?)</tr>", texto):
        celulas = [_texto(c) for c in re.findall(r"(?s)<t[dh][^>]*>(.*?)</t[dh]>", linha)]
        if len(celulas) < 6:
            continue
        ras = re.findall(r'href="([^"]*?/files/raster/[^"]+)"', linha)
        geo = re.findall(r'href="([^"]*?/files/geotiff/[^"]+)"', linha)
        if not ras:
            continue
        cartas.append({
            "numero": celulas[0], "titulo": celulas[1],
            "raster": re.sub(r"^https?://[^/]+", "", ras[0]),
            "bytes_raster": _bytes(celulas[2]),
            "data": celulas[3], "aviso": celulas[4],
            "geotiff": re.sub(r"^https?://[^/]+", "", geo[0]) if geo else None,
            "bytes_geotiff": _bytes(celulas[5]),
        })
    return cartas


def baixar_um(url, alvo, esperado):
    if os.path.exists(alvo):
        real = os.path.getsize(alvo)
        if real > 0 and (esperado is None or abs(real - esperado) <= max(2048, esperado * 0.02)):
            return "existente", real, ""
    ultimo = ""
    for tentativa in range(3):
        try:
            dados = buscar(url, timeout=180)
            if len(dados) < 200 or dados[:2] != b"PK":
                raise ValueError("resposta nao e um zip (%d bytes)" % len(dados))
            tmp = alvo + ".part"
            with open(tmp, "wb") as f:
                f.write(dados)
            os.replace(tmp, alvo)
            return "baixado", len(dados), ""
        except Exception as e:
            ultimo = "%s: %s" % (type(e).__name__, e)
            time.sleep(1.5 * (tentativa + 1))
    return "erro", 0, ultimo


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    padrao = os.environ.get("CARTAS_NAUTICAS_DIR") or \
        os.path.join(os.path.expanduser("~"), "Downloads", "cartas-nauticas")
    p.add_argument("--destino", default=padrao, help="pasta do acervo (padrao: %s)" % padrao)
    p.add_argument("--html", help="usar uma pagina de listagem salva localmente")
    p.add_argument("--geotiff", action="store_true", help="baixar tambem os GeoTIFF (~4 GB)")
    p.add_argument("--listar", action="store_true", help="so mostrar o que seria baixado")
    p.add_argument("--paralelo", type=int, default=6)
    args = p.parse_args()

    cartas = parsear(html_da_listagem(args.html))
    if not cartas:
        sys.exit("nao consegui extrair a tabela de cartas da pagina.")
    tot_r = sum(c["bytes_raster"] or 0 for c in cartas) / 1048576
    tot_g = sum(c["bytes_geotiff"] or 0 for c in cartas) / 1048576
    print("%d cartas | raster %.0f MB | geotiff %.0f MB" % (len(cartas), tot_r, tot_g))

    if args.listar:
        for c in cartas[:20]:
            print("  %-16s %-46s %s" % (c["numero"], c["titulo"][:46], c["data"]))
        print("  ... (%d no total)" % len(cartas))
        return

    dir_raster = os.path.join(args.destino, "raster")
    os.makedirs(dir_raster, exist_ok=True)
    tarefas = [(ASSETS + c["raster"],
                os.path.join(dir_raster, c["raster"].rsplit("/", 1)[-1]),
                c["bytes_raster"], c["numero"]) for c in cartas]
    if args.geotiff:
        dir_geo = os.path.join(args.destino, "geotiff")
        os.makedirs(dir_geo, exist_ok=True)
        tarefas += [(ASSETS + c["geotiff"],
                     os.path.join(dir_geo, c["geotiff"].rsplit("/", 1)[-1]),
                     c["bytes_geotiff"], c["numero"])
                    for c in cartas if c["geotiff"]]

    t0 = time.time()
    contagem = {"baixado": 0, "existente": 0, "erro": 0}
    falhas = []
    with cf.ThreadPoolExecutor(max_workers=args.paralelo) as ex:
        futuros = {ex.submit(baixar_um, u, a, b): n for u, a, b, n in tarefas}
        for i, fut in enumerate(cf.as_completed(futuros), 1):
            estado, _, msg = fut.result()
            contagem[estado] += 1
            if estado == "erro":
                falhas.append((futuros[fut], msg))
                print("ERRO carta %s: %s" % (futuros[fut], msg))
            if i % 50 == 0 or i == len(tarefas):
                print("... %d/%d (%.0fs)" % (i, len(tarefas), time.time() - t0), flush=True)

    with open(os.path.join(args.destino, "catalogo.csv"), "w", newline="",
              encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["numero", "titulo", "arquivo", "data_arquivo", "aviso"])
        for c in cartas:
            w.writerow([c["numero"], c["titulo"], c["raster"].rsplit("/", 1)[-1],
                        c["data"], c["aviso"]])
    json.dump(cartas, open(os.path.join(args.destino, "catalogo.json"), "w",
                           encoding="utf-8"), ensure_ascii=False, indent=1)

    print("\nbaixados %d | ja existiam %d | falharam %d" % (
        contagem["baixado"], contagem["existente"], contagem["erro"]))
    print("acervo em %s" % args.destino)
    if falhas:
        print("falhas: %s" % ", ".join(n for n, _ in falhas))
    print("\nProximo passo:  python carta.py --dados \"%s\" indexar" % args.destino)


if __name__ == "__main__":
    main()
