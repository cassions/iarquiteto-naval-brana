# -*- coding: utf-8 -*-
"""Mapa de texto de agua e terra em volta de um ponto, lido do raster da carta.

Serve para achar por onde desviar a derrota sem abrir a imagem da carta - o que
custaria milhares de tokens. Uso:

    python sondar.py -23.90 -45.45 --raio 12
    python sondar.py -23.90 -45.45 --raio 12 --carta 164001
"""

import argparse
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import navegacao as N  # noqa: E402

SIMBOLO = {N.TERRA: "#", N.RASO: "-", N.FUNDO: ".", N.OUTRO: "?"}


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Mapa de texto de agua e terra em volta de um ponto.")
    ap.add_argument("lat", type=float)
    ap.add_argument("lon", type=float)
    ap.add_argument("--raio", type=float, default=10.0,
                    help="metade do lado do mapa, em km (padrao 10)")
    ap.add_argument("--colunas", type=int, default=45,
                    help="largura do mapa em caracteres (padrao 45)")
    ap.add_argument("--carta", default=None,
                    help="forca uma carta; sem isso usa a mais detalhada do ponto")
    ap.add_argument("--dados", default=None, help="pasta do acervo raster do CHM")
    args = ap.parse_args(argv)

    try:
        N.abrir_acervo(args.dados)
        indice = N.C.carregar_indice()
        if args.carta:
            entrada = N.C.por_numero(indice, args.carta)[0]
        else:
            ponto = (args.lat, args.lon, "ponto")
            entrada, _caixa = N.carta_para_caixa(ponto, [ponto], args.raio * 2, indice)
        crt = N.C.painel_do_indice(entrada)
    except N.C.ErroDeUso as e:
        sys.stderr.write("\nERRO: %s\n\n" % e)
        return 2

    paleta = crt.paletas.get("padrao") or {}
    numero, titulo = N.carta_oficial(crt.numero, crt.titulo)
    print("Carta %s - %s (%s), painel %s"
          % (numero, titulo, N.escala_br(crt.escala), crt.numero))
    print("Centro %s / %s, raio %g km"
          % (N.gms(args.lat, "lat"), N.gms(args.lon, "lon"), args.raio))

    graus_lat = args.raio / 110.574
    import math
    graus_lon = args.raio / (111.320 * math.cos(math.radians(args.lat)))
    colunas = max(21, args.colunas | 1)
    linhas = max(11, int(colunas * 0.5) | 1)

    def classe_em(la, lo):
        if not crt.contem(la, lo):
            return " "
        x, y = crt.para_pixel(la, lo)
        idx, _real = crt.decodificar((int(x), int(y), int(x) + 1, int(y) + 1))
        return SIMBOLO[N.classificar_cor(paleta.get(int(idx[0][0]), (255, 255, 255)))]

    print()
    for j in range(linhas):
        la = args.lat + graus_lat - 2 * graus_lat * j / (linhas - 1.0)
        faixa = "".join(classe_em(la, args.lon - graus_lon
                                  + 2 * graus_lon * i / (colunas - 1.0))
                        for i in range(colunas))
        marca = "<" if j == linhas // 2 else " "
        print("%9s %s%s" % (N.gms(la, "lat"), faixa, marca))
    print("%9s %s^" % ("", " " * (colunas // 2)))
    print("          oeste %s  ->  leste %s"
          % (N.gms(args.lon - graus_lon, "lon"), N.gms(args.lon + graus_lon, "lon")))
    print("\n  # terra    - agua rasa    . agua funda    ? texto ou linha da carta")
    print("  O ponto pedido esta no cruzamento das marcas ^ e <.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
