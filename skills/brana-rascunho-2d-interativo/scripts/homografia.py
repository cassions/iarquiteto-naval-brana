#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Calibracao da fotografia de um croqui em papel quadriculado.

Resolve a homografia plano-a-papel a partir de quatro pontos, devolve pontos lidos em
pixels para coordenadas de papel, e confere se as balizas caem onde deveriam.

  # calibrar e conferir as balizas
  python homografia.py --loa-sq 20 --h-marcas 4.38 \
      --p1 452,216 --p2 1471,213 --p3 1470,437 --p4 447,440 \
      --balizas 452,657,860,1062,1267,1470

  # devolver pontos lidos (u,v em pixels) para papel
  python homografia.py ... --pontos 860,38 860,390 443,810

  # ajustar a super-elipse da secao mestra de um casco redondo
  python homografia.py --secao 862,650 900,648 950,638 990,615 1020,580 1040,540 1045,492

Os quatro pontos, nesta ordem:
  p1 = baliza 1    x linha de centro da planta
  p2 = ultima      x linha de centro da planta
  p3 = ultima      x linha das marcas
  p4 = baliza 1    x linha das marcas
"""
import argparse, math, sys


def par(s):
    a, b = s.split(',')
    return float(a), float(b)


def homografia(p1, p2, p3, p4, loa_sq, h_marcas):
    """Quadrado unitario -> quadrilatero, depois reescalado para quadrados de papel."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = p1, p2, p3, p4
    sx = x0 - x1 + x2 - x3
    sy = y0 - y1 + y2 - y3
    dx1, dx2 = x1 - x2, x3 - x2
    dy1, dy2 = y1 - y2, y3 - y2
    den = dx1 * dy2 - dx2 * dy1
    if abs(den) < 1e-9:
        sys.exit('ERRO: os quatro pontos sao degenerados (colineares?).')
    g = (sx * dy2 - sy * dx2) / den
    h = (dx1 * sy - dy1 * sx) / den
    a = x1 - x0 + g * x1
    b = x3 - x0 + h * x3
    d = y1 - y0 + g * y1
    e = y3 - y0 + h * y3
    # unitario -> papel em quadrados
    return dict(a=a / loa_sq, b=b / h_marcas, c=x0,
                d=d / loa_sq, e=e / h_marcas, f=y0,
                g=g / loa_sq, h=h / h_marcas)


def inverter(H, u, v):
    A = H['a'] - u * H['g']
    B = H['b'] - u * H['h']
    C = H['d'] - v * H['g']
    D = H['e'] - v * H['h']
    det = A * D - B * C
    du, dv = u - H['c'], v - H['f']
    return (du * D - B * dv) / det, (A * dv - C * du) / det


def sect_y(u, p):
    if u <= 0:
        return 0.0
    if u >= 1:
        return 1.0
    return (1 - (1 - u) ** p) ** (1 / p)


def cm(p, n=4000):
    return sum(sect_y((i + 0.5) / n, p) for i in range(n)) / n


def main():
    ap = argparse.ArgumentParser(description='Calibracao de croqui em papel quadriculado')
    ap.add_argument('--loa-sq', type=float, help='comprimento do casco em quadrados')
    ap.add_argument('--h-marcas', type=float, help='quadrados da linha de centro ate a linha das marcas')
    for n in ('p1', 'p2', 'p3', 'p4'):
        ap.add_argument('--' + n, type=par, help='u,v em pixels')
    ap.add_argument('--balizas', help='us das marcas de baliza, separados por virgula')
    ap.add_argument('--pontos', nargs='*', type=par, help='pontos u,v para devolver ao papel')
    ap.add_argument('--secao', nargs='*', type=par,
                    help='pontos u,v da meia-secao mestra, da quilha para o conves')
    args = ap.parse_args()

    if args.secao:
        pts = args.secao
        (uk, vk), (ud, vd) = pts[0], pts[-1]
        Y, D = abs(ud - uk), abs(vk - vd)
        if Y < 1e-6 or D < 1e-6:
            sys.exit('ERRO: primeiro ponto deve ser a quilha e o ultimo o conves.')
        nrm = [(abs(u - uk) / Y, abs(vk - v) / D) for u, v in pts]
        melhor = min(((p / 100.0,
                       sum((sect_y(z, p / 100.0) - y) ** 2 for y, z in nrm))
                      for p in range(100, 601)), key=lambda t: t[1])
        p, err = melhor
        print('secao mestra: %d pontos · meia-boca %.1f px · pontal %.1f px · razao %.3f'
              % (len(pts), Y, D, D / Y))
        print('  super-elipse ajustada: p = %.2f' % p)
        print('  residuo eficaz: %.1f %% da meia-boca' % (100 * math.sqrt(err / len(nrm))))
        pior = max(abs(sect_y(z, p) - y) for y, z in nrm)
        print('  pior ponto:     %.1f %%' % (100 * pior))
        print('  Cm = %.3f   (p=2 da a semi-elipse, Cm=%.3f)' % (cm(p), math.pi / 4))
        if 100 * math.sqrt(err / len(nrm)) > 4:
            print('  AVISO: residuo alto. A secao pode nao ser uma super-elipse —')
            print('         talvez tenha chine suave ou tumblehome. Diga isso ao usuario.')
        if not args.p1:
            return

    faltando = [n for n in ('loa_sq', 'h_marcas', 'p1', 'p2', 'p3', 'p4')
                if getattr(args, n) is None]
    if faltando:
        sys.exit('ERRO: faltam argumentos: ' + ', '.join('--' + f.replace('_', '-') for f in faltando))

    H = homografia(args.p1, args.p2, args.p3, args.p4, args.loa_sq, args.h_marcas)
    print('homografia papel(X,Y em quadrados) -> imagem(u,v em pixels)')
    print('  [ %10.5f %10.5f %10.4f ]' % (H['a'], H['b'], H['c']))
    print('  [ %10.5f %10.5f %10.4f ]' % (H['d'], H['e'], H['f']))
    print('  [ %10.3e %10.3e %10.4f ]' % (H['g'], H['h'], 1.0))

    ex = math.hypot(H['a'], H['d'])
    ey = math.hypot(H['b'], H['e'])
    print('\nescala na origem: %.2f px/quadrado em X · %.2f em Y  (anisotropia %.1f %%)'
          % (ex, ey, 100 * abs(ey - ex) / max(ex, ey)))
    razao = min(ex, ey) / max(ex, ey)
    print('inclinacao fora do plano: ~%.0f°' % math.degrees(math.acos(min(1.0, razao))))
    print('rotacao no plano: %.2f°  ·  cisalhamento: %.2f°'
          % (math.degrees(math.atan2(H['d'], H['a'])), math.degrees(math.atan2(-H['b'], H['e']))))

    if args.balizas:
        us = [float(x) for x in args.balizas.split(',')]
        n = len(us)
        passo = args.loa_sq / (n - 1)
        print('\nverificacao das balizas (%d, a %.2f quadrados):' % (n, passo))
        pior = 0.0
        for i, u in enumerate(us):
            X, _ = inverter(H, u, args.p1[1])
            nominal = i * passo
            erro = X - nominal
            pior = max(pior, abs(erro))
            print('  baliza %d  X = %7.3f   nominal %6.2f   erro %+.3f qd' % (i + 1, X, nominal, erro))
        print('  erro maximo: %.3f quadrado' % pior)
        if pior > 0.05:
            print('  REPROVADO: acima de 0,05 qd. Alguma leitura esta errada — refaca antes de seguir.')
        elif pior > 0.03:
            print('  aceitavel.')
        else:
            print('  otimo: foto quase perpendicular.')

    if args.pontos:
        print('\npontos devolvidos ao papel (X, Y em quadrados):')
        for u, v in args.pontos:
            X, Y = inverter(H, u, v)
            print('  (%7.1f, %7.1f) px  ->  X = %7.3f   Y = %7.3f' % (u, v, X, Y))


if __name__ == '__main__':
    main()
