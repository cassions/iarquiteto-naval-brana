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

  # ajustar as duas familias a secao mestra e escolher entre redondo e quilha cheia
  python homografia.py --secao 862,650 900,648 950,638 990,615 1020,580 1040,540 1045,492

  # os pontos da secao podem vir em pixels ou ja em quadrados (meia-boca,altura):
  # so a forma normalizada entra no ajuste, entao a unidade nao importa
  python homografia.py --secao 0,0 0.340,0.542 0.683,0.948 1.026,1.149 \
      1.711,1.484 2.328,2.024 2.740,2.838 2.973,3.654 3.083,4.198

  # gravar o ajuste direto no projeto.json, em vez de imprimir para o agente copiar.
  # ai a secao TEM de vir em quadrados: e assim que ela vai para o arquivo.
  python homografia.py --secao 0,0 ... --projeto projeto.json --meia-nau 0.0817,4.5915

Com --projeto vao para o arquivo "secao.pts" e "cheia.p" da familia recomendada; com
--meia-nau z_quilha,z_borda (as duas cotas na meia-nau, em quadrados, lidas de profKeel
e profSheer) vai tambem "alefriz.z0", que ate agora o agente calculava a mao.

Os quatro pontos, nesta ordem:
  p1 = baliza 1    x linha de centro da planta
  p2 = ultima      x linha de centro da planta
  p3 = ultima      x linha das marcas
  p4 = baliza 1    x linha das marcas
"""
import argparse, io, json, math, os, sys


# ---------------------------------------------------------------------- projeto.json
# Este bloco e igual no ajustar.py, de proposito: os dois scripts gravam no mesmo
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
    'cheia.p' nao apaga 'cheia.re', e gravar 'alefriz.z0' nao apaga o tuck.
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


# ---------------------------------------------------------------- secao mestra
# Duas familias de meia-baliza, normalizadas com u=0 na quilha e u=1 no conves:
#
#   (a) super-elipse    s(u) = (1-(1-u)^p)^(1/p)     1 parametro, bojo redondo
#   (b) dois expoentes  s(u) = [1-(1-u)^p]^k         2 parametros, quilha cheia
#
# (a) e o caso particular de (b) com k = 1/p. Como p>1 implica k<1, a super-elipse
# e concava em TODO o dominio: nunca tem garganta. Foi esse o defeito que motivou
# a familia de dois expoentes: o wineglass precisa de um trecho convexo junto a
# quilha (a lamina do madeiramento morto) antes de abrir na taca.

def sect_pk(u, p, k):
    """Dois expoentes: s(u) = [1-(1-u)^p]^k. Com k>1 tem exatamente uma inflexao."""
    if u <= 0:
        return 0.0
    if u >= 1:
        return 1.0
    return (1 - (1 - u) ** p) ** k


def sect_y(u, p):
    """Super-elipse. Mesma expressao de sempre, escrita como o caso k = 1/p."""
    return sect_pk(u, p, 1.0 / p)


def cm(p, n=4000):
    return sum(sect_y((i + 0.5) / n, p) for i in range(n)) / n


def cm_pk(p, k, n=4000):
    """Cm e a media de s em u: a area da meia-baliza sobre o retangulo meia-boca x pontal."""
    return sum(sect_pk((i + 0.5) / n, p, k) for i in range(n)) / n


def erro_quad(f, nrm):
    """Soma dos quadrados do residuo horizontal: meia-boca medida contra a modelada."""
    return sum((f(z) - y) ** 2 for y, z in nrm)


def eficaz(err, n):
    """Residuo eficaz em % da meia-boca. RMS sobre todos os pontos, inclusive as
    duas pontas, que a normalizacao prende em (0,0) e (1,1) e nunca erram."""
    return 100 * math.sqrt(err / n)


def refina(v0, obj, minimos, passo=0.05, piso=1e-6):
    """Descida por coordenada com passo que encolhe pela metade. Sem numpy nem scipy.

    A grade grossa ja poe o palpite na bacia certa; aqui so se acerta a casa
    decimal. Encolher o passo quando nenhuma coordenada anda e o que resolve o
    vale diagonal e raso de (p,k), onde a descida por coordenada empacaria.
    """
    v = list(v0)
    e = obj(v)
    while passo > piso:
        andou = False
        for i in range(len(v)):
            for d in (passo, -passo):
                cand = list(v)
                cand[i] += d
                if cand[i] <= minimos[i]:
                    continue
                ec = obj(cand)
                if ec < e:
                    v, e, andou = cand, ec, True
        if not andou:
            passo /= 2
    return v, e


def ajuste_superelipse(nrm):
    """(a) um parametro, na grade de 0,01 de sempre.

    Sem refino continuo de proposito: quem ja usa --secao para casco redondo tem
    de continuar vendo o mesmo p. Com um parametro so a grade de 0,01 ja e mais
    fina que a leitura do croqui, entao o refino nao compraria nada e mexeria na
    segunda casa de resultados antigos.
    """
    p = min((i / 100.0 for i in range(100, 601)),
            key=lambda p: erro_quad(lambda u: sect_y(u, p), nrm))
    return p, erro_quad(lambda u: sect_y(u, p), nrm)


def ajuste_dois(nrm):
    """(b) dois parametros. Grade grossa, refino, e k reajustado ao p arredondado.

    O vale de (p,k) e raso e diagonal: mover p em 0,01 e compensar em k muda o
    residuo na quinta casa. Por isso o par impresso tem de ser otimo ele mesmo:
    senao quem reconstruir a curva pelos dois numeros impressos nao chega na
    curva que foi ajustada. Arredonda-se p para as duas casas da impressao e
    reajusta-se k naquele p.
    """
    def obj(v):
        return erro_quad(lambda u: sect_pk(u, v[0], v[1]), nrm)

    melhor = None
    for i in range(20, 161):          # p de 1,00 a 8,00
        for j in range(6, 121):       # k de 0,30 a 6,00
            v = [i / 20.0, j / 20.0]
            e = obj(v)
            if melhor is None or e < melhor[1]:
                melhor = (v, e)
    fino, _ = refina(melhor[0], obj, [1.0, 0.0])
    p = round(fino[0], 2)
    kf, err = refina([fino[1]], lambda v: obj([p, v[0]]), [0.0], passo=0.01)
    return p, kf[0], err


def garganta(p, k):
    """Altura relativa da inflexao pela forma fechada (especificacao, secao 3):

        u = 1 - [ (p-1) / (k*p - 1) ]^(1/p)

    Nao precisa de busca. So existe com p>1 e k>1; com k<=1 a curva e concava
    pura e nao ha garganta nenhuma.
    """
    if p <= 1 or k <= 1:
        return None
    return 1 - ((p - 1) / (k * p - 1)) ** (1 / p)


def inflexoes(f, n=1500, borda=0.004, h=1e-3):
    """Conta inflexoes varrendo a segunda derivada por diferenca central.

    E a conferencia numerica da forma fechada acima: se a formula anuncia uma
    garganta e a varredura nao acha troca de sinal, uma das duas esta errada e o
    agente tem de olhar antes de gerar o casco. A borda descarta as pontas, onde
    s'' diverge e so mede o proprio expoente. O piso de 1e-6 e ruido de diferenca
    finita (eps/h^2 ~ 2e-10), nao curvatura. Uma garganta abaixo de u=0,004 seria
    perdida, mas essa nem seria garganta: seria a quilha.
    """
    d2 = []
    for i in range(n):
        u = borda + (1 - 2 * borda) * i / (n - 1)
        d2.append((f(u + h) - 2 * f(u) + f(u - h)) / (h * h))
    trocas, sinal = 0, 0
    for v in d2:
        if abs(v) < 1e-6:
            continue
        s = 1 if v > 0 else -1
        if sinal and s != sinal:
            trocas += 1
        sinal = s
    return trocas


def relatorio_secao(r):
    """A saida de sempre: as duas familias abertas, com o criterio impresso para
    conferencia. E o que se ve quando o ajuste NAO vai para o projeto.json."""
    print('secao mestra: %d pontos · meia-boca %.1f px · pontal %.1f px · razao %.3f'
          % (len(r['pts']), r['Y'], r['D'], r['D'] / r['Y']))

    # (a) super-elipse: 1 parametro, casco de bojo redondo
    print('  super-elipse ajustada: p = %.2f' % r['p'])
    print('  residuo eficaz: %.1f %% da meia-boca' % r['ra'])
    print('  pior ponto:     %.1f %%' % (100 * r['piora']))
    print('  Cm = %.3f   (p=2 da a semi-elipse, Cm=%.3f)' % (r['cma'], math.pi / 4))
    if r['ra'] > 4:
        print('  AVISO: residuo alto. A secao pode nao ser uma super-elipse —')
        print('         talvez tenha chine suave ou tumblehome. Diga isso ao usuario.')

    # (b) dois expoentes: 2 parametros, quilha cheia
    print('\n  dois expoentes ajustados: p = %.2f   k = %.3f    s(u) = [1-(1-u)^p]^k'
          % (r['pb'], r['kb']))
    print('  residuo eficaz: %.1f %% da meia-boca' % r['rb'])
    print('  pior ponto:     %.1f %%' % (100 * r['piorb']))
    print('  Cm = %.3f' % r['cmb'])
    if r['ug'] is None:
        print('  garganta: nao existe (k <= 1) — o ajuste degenerou em baliza concava pura')
    else:
        print('  garganta: u = %.3f do pontal local (%.1f %% acima da quilha), forma fechada'
              % (r['ug'], 100 * r['ug']))
    print('  inflexoes na varredura da segunda derivada: %d' % r['trocas'])

    # comparacao e recomendacao, com o criterio impresso para conferencia
    print('\n  criterio: (b) tem um parametro a mais, entao tem de pagar por ele. So vale')
    print('            se derrubar o residuo em 25 % ou mais E puser a garganta entre')
    print('            0,10 e 0,50 do pontal. Fora disso a garganta esta no excesso de')
    print('            parametros, nao nos dados.')
    print('  residuo: %.1f %% (super-elipse) -> %.1f %% (dois expoentes), queda de %.0f %%'
          % (r['ra'], r['rb'], r['queda']))
    if r['rec'] == 'redondo':
        print('  RECOMENDACAO: REDONDO. O segundo expoente nao pagou por si — a garganta')
        print('                nao esta nos pontos medidos. Use casco "redondo" com')
        print('                cheia.p = %.2f.' % r['p'])
    elif r['rec'] == 'quilha-cheia':
        print('  RECOMENDACAO: QUILHA CHEIA. A garganta esta nos dados e cai onde a linha')
        print('                de alefriz de uma quilha corrida cai de verdade.')
        print('  daqui saem os campos do projeto.json (especificacao, secao 5):')
        print('    cheia.p    = %.2f' % r['pb'])
        if r['z0'] is None:
            print('    alefriz.z0 = z_quilha(mid_x) + %.4f * [ z_borda(mid_x) - z_quilha(mid_x) ]'
                  % r['ug'])
            print('                 com z_quilha e z_borda em quadrados, lidos de profKeel e')
            print('                 profSheer na meia-nau. k NAO vai no json: montar.py o refaz')
            print('                 por pinchAt a partir do alefriz, com k = [(p-1)/(1-u)^p + 1]/p.')
        else:
            zq, zb = r['meia_nau']
            print('    alefriz.z0 = %.4f   (%.4f + %.4f * [%.4f - %.4f], de --meia-nau)'
                  % (r['z0'], zq, r['ug'], zb, zq))
            print('                 k NAO vai no json: montar.py o refaz por pinchAt a partir')
            print('                 do alefriz, com k = [(p-1)/(1-u)^p + 1]/p.')
    else:
        if r['ug'] is None:
            onde = 'a garganta nao existe (k <= 1)'
        else:
            onde = 'a garganta saiu em u = %.3f, fora de 0,10 a 0,50' % r['ug']
        print('  RECOMENDACAO: AMBIGUO. O residuo caiu %.0f %%, mas %s.' % (r['queda'], onde))
        print('                Olhe a secao mestra do croqui de novo antes de escolher: o')
        print('                ganho pode ser tumblehome, chine suave ou ponto mal lido.')


def resumo_secao(r, caminho, gravados):
    """A saida curta, de quando os numeros vao para o arquivo.

    Fica so o que o agente ainda tem de julgar com os olhos: quanto cada familia erra,
    onde caiu a garganta, e a recomendacao. O resto do relatorio virou numero dentro do
    projeto.json — imprimi-lo tambem seria pagar duas vezes pelo mesmo dado.
    """
    print('super-elipse:   p = %.2f%sresiduo %.1f %%  pior %.1f %%  Cm %.3f'
          % (r['p'], ' ' * 13, r['ra'], 100 * r['piora'], r['cma']))
    g = 'sem garganta' if r['ug'] is None else 'garganta u = %.3f' % r['ug']
    print('dois expoentes: p = %.2f  k = %.3f  residuo %.1f %%  pior %.1f %%  Cm %.3f  %s'
          % (r['pb'], r['kb'], r['rb'], 100 * r['piorb'], r['cmb'], g))
    if r['rec'] == 'redondo':
        print('RECOMENDACAO: REDONDO - o residuo caiu so %.0f %%, entao a garganta esta no '
              'excesso de parametros, nao nos dados.' % r['queda'])
        # com (b) descartado, o residuo de (a) e o residuo do casco que vai ser gerado
        if r['ra'] > 4:
            print('  AVISO: %.1f %% e residuo alto. A secao pode ter chine suave ou '
                  'tumblehome. Diga isso ao usuario.' % r['ra'])
    elif r['rec'] == 'quilha-cheia':
        print('RECOMENDACAO: QUILHA CHEIA - o residuo caiu %.0f %% e a garganta caiu em '
              '%.3f do pontal, onde o alefriz de uma quilha corrida cai de verdade.'
              % (r['queda'], r['ug']))
    else:
        onde = ('a garganta nao existe (k <= 1)' if r['ug'] is None
                else 'a garganta saiu em u = %.3f, fora de 0,10 a 0,50' % r['ug'])
        print('RECOMENDACAO: AMBIGUO - o residuo caiu %.0f %%, mas %s. Olhe a secao mestra '
              'do croqui de novo: o ganho pode ser tumblehome, chine suave ou ponto mal '
              'lido.' % (r['queda'], onde))
    # a varredura da segunda derivada e a conferencia numerica da forma fechada; so
    # interessa quando as duas discordam
    esperadas = 0 if r['ug'] is None else 1
    if r['trocas'] != esperadas:
        print('  AVISO: a forma fechada anuncia %d inflexao(oes) e a varredura da segunda '
              'derivada achou %d. Olhe antes de gerar o casco.' % (esperadas, r['trocas']))
    print('%s: %s' % (caminho, ', '.join(gravados)))
    if r['rec'] == 'quilha-cheia' and r['z0'] is None:
        print('  alefriz.z0 NAO gravado: z0 = z_quilha(mid_x) + %.4f * [ z_borda(mid_x) - '
              'z_quilha(mid_x) ], em quadrados.' % r['ug'])
        print('  Passe --meia-nau z_quilha,z_borda para gravar. k nao vai no json: '
              'montar.py o refaz por pinchAt.')


def secao_para_projeto(caminho, r):
    """Grava secao.pts, cheia.p e (com --meia-nau) alefriz.z0, e imprime o resumo."""
    pts = r['pts']
    grande = max(max(abs(a), abs(b)) for a, b in pts)
    if grande > 50:
        sys.exit('ERRO: --projeto grava "secao.pts", e o modelo le esses pontos em\n'
                 '      QUADRADOS (meia-boca, altura acima da quilha). Estes estao em\n'
                 '      pixels (maior valor %.0f). A secao mestra e desenhada a parte no\n'
                 '      croqui, quase sempre em outra escala, entao a homografia da planta\n'
                 '      nao serve para converte-la: leia a secao em quadrados na propria\n'
                 '      foto e passe assim.' % grande)
    uk, vk = pts[0]
    mud = {'secao': {'pts': [[round(abs(a - uk), 4), round(abs(b - vk), 4)] for a, b in pts]}}
    gravados = ['secao.pts %d pontos' % len(pts)]
    # so o p da familia recomendada vai para o arquivo; no caso ambiguo nao vai nenhum,
    # porque escolher por conta seria decidir o casco no lugar de quem esta olhando
    if r['rec'] == 'redondo':
        mud['cheia'] = {'p': round(r['p'], 2)}
        gravados.append('cheia.p = %.2f' % r['p'])
    elif r['rec'] == 'quilha-cheia':
        mud['cheia'] = {'p': round(r['pb'], 2)}
        gravados.append('cheia.p = %.2f' % r['pb'])
        if r['z0'] is not None:
            mud['alefriz'] = {'z0': r['z0']}
            gravados.append('alefriz.z0 = %.4f' % r['z0'])
    else:
        gravados.append('cheia.p NAO gravado (recomendacao ambigua)')
    gravar_projeto(caminho, mud)
    resumo_secao(r, caminho, gravados)


def px(v):
    """Pixel do jeito que o agente digitou: sem o ".0" que nao diz nada."""
    return ('%.4f' % v).rstrip('0').rstrip('.')


def qd(v):
    """Quadrado com tres casas. O + 0.0 mata o "-0.000", que so confunde."""
    return '%.3f' % (round(v, 3) + 0.0)


def main():
    ap = argparse.ArgumentParser(description='Calibracao de croqui em papel quadriculado')
    ap.add_argument('--loa-sq', type=float, help='comprimento do casco em quadrados')
    ap.add_argument('--h-marcas', type=float, help='quadrados da linha de centro ate a linha das marcas')
    for n in ('p1', 'p2', 'p3', 'p4'):
        ap.add_argument('--' + n, type=par, help='u,v em pixels')
    ap.add_argument('--balizas', help='us das marcas de baliza, separados por virgula')
    ap.add_argument('--pontos', nargs='*', type=par, help='pontos u,v para devolver ao papel')
    ap.add_argument('--secao', nargs='*', type=par,
                    help='pontos da meia-secao mestra, da quilha para o conves; '
                         'u,v em pixels ou meia-boca,altura em quadrados')
    ap.add_argument('--projeto', metavar='projeto.json',
                    help='grava o ajuste da secao neste arquivo, fundindo com o que ja '
                         'estiver la, e imprime so os dois ajustes e a recomendacao')
    ap.add_argument('--meia-nau', type=par, metavar='z_quilha,z_borda',
                    help='cotas da quilha e da borda na meia-nau, em quadrados, para '
                         'calcular alefriz.z0 em vez de imprimir a formula')
    args = ap.parse_args()

    if args.projeto and not args.secao:
        sys.exit('ERRO: --projeto so tem o que gravar junto de --secao. A calibracao e os\n'
                 '      pontos devolvidos ao papel voltam para a tela: e o agente que decide\n'
                 '      espelhamento e normalizacao entre vistas antes de escrever qualquer\n'
                 '      coisa no arquivo.')

    if args.secao:
        pts = args.secao
        (uk, vk), (ud, vd) = pts[0], pts[-1]
        Y, D = abs(ud - uk), abs(vk - vd)
        if Y < 1e-6 or D < 1e-6:
            sys.exit('ERRO: primeiro ponto deve ser a quilha e o ultimo o conves.')
        nrm = [(abs(u - uk) / Y, abs(vk - v) / D) for u, v in pts]
        n = len(nrm)

        # (a) super-elipse: 1 parametro, casco de bojo redondo
        p, err = ajuste_superelipse(nrm)
        # (b) dois expoentes: 2 parametros, quilha cheia
        pb, kb, errb = ajuste_dois(nrm)
        ra, rb = eficaz(err, n), eficaz(errb, n)
        ug = garganta(pb, kb)

        # (b) tem um parametro a mais, entao tem de pagar por ele: so vale se derrubar o
        # residuo em 25 % ou mais E puser a garganta entre 0,10 e 0,50 do pontal
        queda = 100 * (1 - rb / ra) if ra > 1e-9 else 0.0
        if queda < 25:
            rec = 'redondo'
        elif ug is not None and 0.10 <= ug <= 0.50:
            rec = 'quilha-cheia'
        else:
            rec = 'ambiguo'

        z0 = None
        if args.meia_nau and ug is not None:
            zq, zb = args.meia_nau
            z0 = round(zq + ug * (zb - zq), 4)

        r = dict(pts=pts, Y=Y, D=D, p=p, ra=ra, cma=cm(p),
                 piora=max(abs(sect_y(z, p) - y) for y, z in nrm),
                 pb=pb, kb=kb, rb=rb, cmb=cm_pk(pb, kb),
                 piorb=max(abs(sect_pk(z, pb, kb) - y) for y, z in nrm),
                 ug=ug, trocas=inflexoes(lambda u: sect_pk(u, pb, kb)),
                 queda=queda, rec=rec, z0=z0, meia_nau=args.meia_nau)

        if args.projeto:
            secao_para_projeto(args.projeto, r)
        else:
            relatorio_secao(r)
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
        # px -> quadrados, sem moldura: o agente ainda precisa VER estes pontos, porque e
        # ele quem decide o espelhamento e a normalizacao entre vistas, mas nao precisa
        # dos rotulos repetidos em cada linha
        print('\npontos devolvidos ao papel, u,v px -> X,Y quadrados:')
        for u, v in args.pontos:
            X, Y = inverter(H, u, v)
            print('  %s,%s -> %s,%s' % (px(u), px(v), qd(X), qd(Y)))


if __name__ == '__main__':
    main()
