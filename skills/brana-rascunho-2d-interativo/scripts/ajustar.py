#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dos pontos medidos para os nos da spline, prontos para o projeto.json.

  python scripts/ajustar.py --loa-sq 20 \
      --curva planSheer 0,2.542 3.96,3.288 8.00,3.455 11.94,2.994 15.98,1.826 20,0 \
      --curva profSheer 0,2.969 8.06,3.369 15.98,3.791 20,4.011 \
      --curva profKeel  0,0.945 4.25,0.203 8.06,0.000 12.12,0.104 20,4.011

Faz o que dava mais trabalho de fazer na mao: confere se os dados ja sao livres de
inflexao, resolve as declividades de cada no, e imprime o bloco "curvas" do projeto.json.

Com --projeto ele grava direto no arquivo, em vez de imprimir para o agente copiar:

  python scripts/ajustar.py --loa-sq 16 --projeto projeto.json \
      --curva planSheer 0,1.6328 1.865,2.2898 ... \
      --medidos planSheer 0,1.637 1.865,2.284 ...

Grava "curvas" (os nos com declividade) e "medidos" (o que foi lido da foto). Os dois
sao a mesma coisa na maioria das curvas, e ai --medidos nem precisa existir; quando um
no teve de ser deslocado para fechar a convexidade, ou quando a foto deu mais pontos do
que os nos que a spline precisa, --medidos guarda a leitura original — sao as cruzes do
desenho, e elas nao podem mentir. A saida em tela encolhe para o veredito de cada curva.

Regras que ele aplica, e que sao as mesmas da referencia 02:
  * as cordas entre pontos tem de ser monotonas (senao a LEITURA esta errada);
  * em cada trecho, m[i] + m[i+1] = 2 * corda[i], para a spline de Hermite passar
    pelos pontos;
  * a sequencia de declividades tem de sair monotona no mesmo sentido das cordas.
"""
import argparse, io, json, os, sys


# ---------------------------------------------------------------------- projeto.json
# Este bloco e igual no homografia.py, de proposito: os dois scripts gravam no mesmo
# arquivo, e nao valia acrescentar um quinto arquivo ao pacote para dividir trinta
# linhas. Se mexer aqui, mexa la.
#
# Duas regras dao a economia. Chave em ordem fixa, para o arquivo nao embaralhar de uma
# rodada para outra e o diff mostrar so o que mudou. E array de numeros escrito cheio
# ate a margem, nunca um numero por linha: o mesmo projeto.json custa 1.001 tokens com
# json.dumps(indent=2) e cerca de 400 assim, sem ficar ilegivel para gente.

ORDEM_CHAVES = [
    'casco', 'nome', 'titulo', 'subtitulo', 'loa_m', 'loa_sq', 'balizas', 'mid_x',
    'curvas', 'medidos', 'secao', 'cheia', 'alefriz', 'registro',
    'planSheer', 'planChine', 'profSheer', 'profChine', 'profKeel',
    'pts', 'keel', 'chine', 'deck',
    'p', 're', 'vante', 'exp_vante',
    'z0', 'subida', 'tuck', 'extensao',
    'calibracao', 'notas',
]
MARGEM = 92


def _chaves(d):
    """As conhecidas na ordem canonica; o resto atras, na ordem em que ja estava."""
    return ([k for k in ORDEM_CHAVES if k in d] +
            [k for k in d if k not in ORDEM_CHAVES])


def _texto(v, ind=0):
    pad = ' ' * ind
    if isinstance(v, dict):
        if not v:
            return '{}'
        itens = ['%s  %s: %s' % (pad, json.dumps(k, ensure_ascii=False), _texto(v[k], ind + 2))
                 for k in _chaves(v)]
        return '{\n' + ',\n'.join(itens) + '\n' + pad + '}'
    if isinstance(v, list):
        if not v:
            return '[]'
        pecas = [_texto(x, ind + 2) for x in v]
        # so numero e ponto entram na embalagem apertada; texto e objeto ficam um por
        # linha, que e o que mantem o registro legivel
        if (any(isinstance(x, (dict, str)) for x in v) or any('\n' in q for q in pecas)):
            return '[\n' + ',\n'.join(pad + '  ' + q for q in pecas) + '\n' + pad + ']'
        uma = '[' + ','.join(pecas) + ']'
        if ind + len(uma) <= MARGEM:
            return uma
        linhas, atual = [], ''
        for i, q in enumerate(pecas):
            q += '' if i == len(pecas) - 1 else ','
            if atual and ind + 2 + len(atual) + len(q) > MARGEM:
                linhas.append(atual)
                atual = q
            else:
                atual += q
        linhas.append(atual)
        return '[\n' + '\n'.join(pad + '  ' + l for l in linhas) + '\n' + pad + ']'
    return json.dumps(v, ensure_ascii=False)


def gravar_projeto(caminho, mudancas):
    """Funde no projeto.json sem destruir nada.

    O que ja estava no arquivo e nao aparece em 'mudancas' continua la: registro,
    titulo, casco, nome, os escalares. Dicionario funde por sub-chave, entao gravar
    'curvas' com tres curvas nao apaga uma planChine que ja estivesse escrita, e gravar
    'cheia.p' nao apaga 'cheia.re'.
    """
    p = {}
    if os.path.exists(caminho):
        try:
            p = json.load(io.open(caminho, encoding='utf-8'))
        except ValueError as e:
            sys.exit('ERRO: %s nao e JSON valido (%s).\n'
                     '      Conserte o arquivo antes; gravar por cima perderia o que ha nele.'
                     % (caminho, e))
        if not isinstance(p, dict):
            sys.exit('ERRO: %s nao tem um objeto JSON na raiz.' % caminho)
    for chave, valor in mudancas.items():
        if isinstance(valor, dict) and isinstance(p.get(chave), dict):
            p[chave].update(valor)
        else:
            p[chave] = valor
    io.open(caminho, 'w', encoding='utf-8', newline='\n').write(_texto(p) + '\n')
    return p


# ------------------------------------------------------------------------- ajuste

def pontos(brutos):
    """'x,y' 'x,y' ... -> [(x, y), ...] em ordem de x."""
    P = []
    for t in brutos:
        a, b = t.split(',')
        P.append((float(a), float(b)))
    P.sort(key=lambda t: t[0])
    return P


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
    ap.add_argument('--medidos', nargs='+', action='append', metavar='NOME x,y ...',
                    help='pontos lidos da foto, quando diferem dos nos (repetivel). '
                         'Sem isso, "medidos" recebe os proprios pontos de --curva')
    ap.add_argument('--projeto', metavar='projeto.json',
                    help='grava "curvas" e "medidos" neste arquivo, fundindo com o que '
                         'ja estiver la, e imprime so o veredito de cada curva')
    ap.add_argument('--json', action='store_true', help='imprime so o bloco JSON')
    args = ap.parse_args()

    # leituras da foto que nao sao os nos: guardadas a parte, uma lista por curva
    lidos = {}
    for grupo in (args.medidos or []):
        lidos[grupo[0]] = [[x, y] for x, y in pontos(grupo[1:])]

    saida, medidos, problemas = {}, {}, []
    relato, veredito = [], []

    for grupo in args.curva:
        nome, brutos = grupo[0], grupo[1:]
        P = pontos(brutos)
        if len(P) < 3:
            problemas.append('%s: precisa de ao menos 3 pontos' % nome)
            veredito.append((nome, len(P), 0, False))
            continue

        m, c, folga = declividades(P)
        relato.append('%s: %d pontos' % (nome, len(P)))
        relato.append('  cordas:       ' + '  '.join('%+.4f' % v for v in c))
        relato.append('  declividades: ' + '  '.join('%+.4f' % v for v in m))

        bem = True
        if not monotona(c):
            problemas.append('%s: as CORDAS nao sao monotonas — os dados medidos ja '
                             'inflexionam. Refaca a leitura do ponto que quebra a '
                             'sequencia antes de seguir.' % nome)
            bem = False
        elif not monotona(m):
            problemas.append('%s: as declividades sairam nao monotonas. Normalmente e um '
                             'ponto medido fora de linha, ou nos demais na posicao.' % nome)
            bem = False
        else:
            conv, arestas = convexa(P, m)
            if conv:
                relato.append('  ok: poligono de controle convexo — o motor vai aceitar')
            else:
                problemas.append('%s: o poligono de controle nao fica convexo com estes '
                                 'pontos. Tente mover, juntar ou tirar um no.' % nome)
                bem = False

        saida[nome] = [[round(P[i][0], 4), round(P[i][1], 4), round(m[i], 5)] for i in range(len(P))]
        # sem --medidos a leitura E o no; os numeros nao sao arredondados porque sao a
        # cruz que o desenho mostra, e ela tem de ficar onde o agente leu
        medidos[nome] = lidos.get(nome) or [[x, y] for x, y in P]
        veredito.append((nome, len(P), len(medidos[nome]), bem))

    orfas = [n for n in lidos if n not in saida]
    if orfas:
        problemas.append('--medidos %s sem --curva do mesmo nome. Provavelmente e erro de '
                         'digitacao: medida de uma curva que nao existe nao vai para lugar '
                         'nenhum.' % ', '.join(orfas))

    if args.projeto:
        for nome, nnos, nmed, bem in veredito:
            print('%-11s %2d nos  %2d medidos  %s' % (nome, nnos, nmed,
                                                      'ok' if bem else 'PROBLEMA'))
    elif not args.json:
        print('\n'.join(relato))
        print()

    if problemas:
        print('PROBLEMAS:')
        for p in problemas:
            print('  * ' + p)
        sys.exit(1)

    if args.projeto:
        # so grava depois de aprovar tudo: meia curva boa no arquivo e pior que nenhuma
        gravar_projeto(args.projeto, {'curvas': saida, 'medidos': medidos})
        print('%s: curvas e medidos de %d curva%s'
              % (args.projeto, len(saida), 's' if len(saida) != 1 else ''))
        return

    print('"curvas": ' + json.dumps(saida, indent=2, ensure_ascii=False))
    if not args.json:
        print('\nCole isso no projeto.json. Rode montar.py e depois verificar.js.')


if __name__ == '__main__':
    main()
