#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dos pontos medidos para os nos da spline, prontos para o projeto.json.

  python scripts/ajustar.py --loa-sq 20 \
      --curva planSheer 0,2.542 3.96,3.288 8.00,3.455 11.94,2.994 15.98,1.826 20,0 \
      --curva profSheer 0,2.969 8.06,3.369 15.98,3.791 20,4.011 \
      --curva profKeel  0,0.945 4.25,0.203 8.06,0.000 12.12,0.104 20,4.011

Faz o que dava mais trabalho de fazer na mao: confere se os dados ja sao livres de
inflexao, resolve as declividades de cada no, e imprime o bloco "curvas" do projeto.json.

Regras que ele aplica, e que sao as mesmas da referencia 02:
  * as cordas entre pontos tem de ser monotonas (senao a LEITURA esta errada);
  * em cada trecho, m[i] + m[i+1] = 2 * corda[i], para a spline de Hermite passar
    pelos pontos;
  * a sequencia de declividades tem de sair monotona no mesmo sentido das cordas.
"""
import argparse, json, sys


def cordas(P):
    return [(P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]) for i in range(len(P) - 1)]


def convexa(P, m):
    """Mesmo teste do motor: as arestas do poligono de controle, com punhos a 1/3 da
    corda, tem de estar em ordem ao longo de toda a cadeia."""
    arestas = []
    for i in range(len(P) - 1):
        c = (P[i+1][1] - P[i][1]) / (P[i+1][0] - P[i][0])
        arestas += [m[i], 3 * c - m[i] - m[i+1], m[i+1]]
    return monotona(arestas, tol=1e-7), arestas


def monotona(v, tol=1e-9):
    cres = all(v[i + 1] >= v[i] - tol for i in range(len(v) - 1))
    decr = all(v[i + 1] <= v[i] + tol for i in range(len(v) - 1))
    return cres or decr


def declividades(P):
    """Resolve as declividades dos nos.

    Impor m[i] + m[i+1] = 2*c[i] em cada trecho faz a spline de Hermite passar pelos
    pontos, mas o sistema tem UM grau de liberdade: fixado m[0] = t, todos os outros
    seguem alternando. O bom valor de t nao e qualquer um — e o que deixa o poligono de
    controle convexo, que e exatamente o que o motor verifica. Com punhos a 1/3 da corda,
    a declividade da aresta do meio de cada trecho vale 3*c[i] - m[i] - m[i+1], e a
    convexidade pede que as tres arestas fiquem em ordem. Como tudo e linear em t, isso
    vira um intervalo; pega-se o meio dele.
    """
    c = cordas(P)
    n = len(P)
    # m[i] = (-1)^i * t + b[i]
    b = [0.0] * n
    for i in range(1, n):
        b[i] = 2 * c[i - 1] - b[i - 1]

    # sentido da curva: cordas crescentes = concava para cima
    sobe = c[-1] > c[0]
    sg = 1.0 if sobe else -1.0

    lo, hi = -1e9, 1e9
    for i in range(n - 1):
        par = 1.0 if i % 2 == 0 else -1.0
        K = 2 * b[i] + b[i + 1] - 3 * c[i]      # sg*(par*t + K) <= 0  (aresta do meio ordenada)
        L = b[i] + 2 * b[i + 1] - 3 * c[i]      # sg*(-par*t + L) >= 0
        for coef, const, maior_igual in ((sg * par, sg * K, not sobe),
                                         (-sg * par, sg * L, sobe)):
            if abs(coef) < 1e-12:
                continue
            lim = -const / coef
            if (coef > 0) == maior_igual:
                lo = max(lo, lim)
            else:
                hi = min(hi, lim)

    if lo <= hi:
        t = (lo + hi) / 2.0
        folga = hi - lo
    else:                                        # sem solucao exata: fica no meio termo
        t = (lo + hi) / 2.0
        folga = hi - lo
    m = [((-1.0) ** i) * t + b[i] for i in range(n)]
    return m, c, folga


def main():
    ap = argparse.ArgumentParser(description='Ajusta nos de spline a partir dos pontos medidos')
    ap.add_argument('--loa-sq', type=float, required=True)
    ap.add_argument('--curva', nargs='+', action='append', required=True,
                    metavar='NOME x,y ...', help='nome da curva seguido dos pontos x,y')
    ap.add_argument('--json', action='store_true', help='imprime so o bloco JSON')
    args = ap.parse_args()

    saida, problemas = {}, []
    relato = []

    for grupo in args.curva:
        nome, brutos = grupo[0], grupo[1:]
        P = []
        for t in brutos:
            a, b = t.split(',')
            P.append((float(a), float(b)))
        P.sort(key=lambda t: t[0])
        if len(P) < 3:
            problemas.append('%s: precisa de ao menos 3 pontos' % nome)
            continue

        m, c, folga = declividades(P)
        relato.append('%s: %d pontos' % (nome, len(P)))
        relato.append('  cordas:       ' + '  '.join('%+.4f' % v for v in c))
        relato.append('  declividades: ' + '  '.join('%+.4f' % v for v in m))

        if not monotona(c):
            problemas.append('%s: as CORDAS nao sao monotonas — os dados medidos ja '
                             'inflexionam. Refaca a leitura do ponto que quebra a '
                             'sequencia antes de seguir.' % nome)
        elif not monotona(m):
            problemas.append('%s: as declividades sairam nao monotonas. Normalmente e um '
                             'ponto medido fora de linha, ou nos demais na posicao.' % nome)
        else:
            conv, arestas = convexa(P, m)
            if conv:
                relato.append('  ok: poligono de controle convexo — o motor vai aceitar')
            else:
                problemas.append('%s: o poligono de controle nao fica convexo com estes '
                                 'pontos. Tente mover, juntar ou tirar um no.' % nome)

        saida[nome] = [[round(P[i][0], 4), round(P[i][1], 4), round(m[i], 5)] for i in range(len(P))]

    if not args.json:
        print('\n'.join(relato))
        print()

    if problemas:
        print('PROBLEMAS:')
        for p in problemas:
            print('  * ' + p)
        sys.exit(1)

    print('"curvas": ' + json.dumps(saida, indent=2, ensure_ascii=False))
    if not args.json:
        print('\nCole isso no projeto.json. Rode montar.py e depois verificar.js.')


if __name__ == '__main__':
    main()
