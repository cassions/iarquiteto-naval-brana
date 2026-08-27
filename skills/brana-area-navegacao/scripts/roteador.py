# -*- coding: utf-8 -*-
"""Acha caminho pela agua entre dois pontos, lendo o raster da carta do CHM.

O gerar_relatorio.py usa isto para corrigir sozinho as pernas da derrota que
cruzam terra. Antes era preciso olhar a imagem da carta, escolher um ponto na
mao, rodar de novo e repetir - varias voltas caras. Aqui a propria carta
responde.

Como funciona: a carta mais detalhada que contem a perna e decodificada no
recorte da perna, a paleta vira classes (terra, agua rasa, agua funda), o
recorte e reduzido a uma grade de celulas e uma busca de menor custo (A*)
atravessa essa grade. Terra e intransponivel, agua rasa custa mais que agua
funda e passar perto da costa custa mais que ir ao largo. O caminho achado e
depois enxugado: sobra so o minimo de pontos que ainda se enxergam em linha
reta pela agua.

O que a grade NAO enxerga: pedra isolada, laje, balizamento, area restrita e
profundidade em numero. O caminho e ilustrativo e continua exigindo leitura da
carta oficial.
"""

import heapq
import math
import os
import sys
import time

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
if AQUI not in sys.path:
    sys.path.insert(0, AQUI)

import carta as C      # noqa: E402
import navegacao as N  # noqa: E402

LADOS = (260, 520, 820)  # celulas no maior lado; refina se nao achar caminho
LIMITE_PX = 26e6        # teto de pontos guardados por perna
FAIXA_LINHAS = 512      # linhas lidas por vez; o pico de memoria e uma faixa
FOLGA_KM = 0.25         # afastamento minimo da costa que o caminho respeita
PISO_TERRA = 0.5        # fracao de terra que condena uma celula (maioria)
CUSTO_RASO = 0.40       # quanto agua rasa custa a mais que agua funda
CUSTO_PERTO = 3.0       # empurra o caminho para longe da costa
CUSTO_INCERTO = 5.0     # celula que o raster nao deixou classificar
ANEIS = 12              # ate quantas celulas medir a distancia da costa
FOLGA_CEL_MAX = 60      # teto de celulas de folga, para o campo de distancia caber
ENCOSTAR_KM = 2.0       # quanto a ponta pode ser puxada para a agua
MINIMO_KM = 0.5         # distancia minima entre pontos inseridos
PERDAO_KM = 0.55        # terra perdoada junto ao cais; a conferencia perdoa 0,6
MAX_PONTOS = 12         # pontos que o roteador aceita inserir numa perna
MAX_TOTAL = 18          # pontos de passagem que a derrota inteira aceita ter
RODADAS = 6             # rodadas de correcao (cada uma em carta mais detalhada)
LIMITE_S = 300          # teto de tempo do contorno; o que sobrar vai para a nota


# ---------------------------------------------------------------------------
# grade de navegabilidade
# ---------------------------------------------------------------------------

class Recorte(object):
    """Decodifica UMA vez o pedaco da carta que interessa e guarda a classe de
    cada pixel. Decodificar e a parte cara; a partir daqui da para montar
    grades de varias resolucoes de graca."""

    def __init__(self, crt, pontos, margem_km):
        self.crt = crt
        lat_meio = sum(p[0] for p in pontos) / float(len(pontos))
        self.px_km = N._km_em_pixels(crt, lat_meio, 1.0)
        pix = [crt.para_pixel(p[0], p[1]) for p in pontos]

        # o recorte nao passa da area util da carta: a moldura branca em volta
        # da carta seria lida como agua funda e o caminho fugiria por ela
        la0, la1, lo0, lo1 = crt.limites()
        cantos = [crt.para_pixel(la, lo)
                  for la in (la0, la1) for lo in (lo0, lo1)]
        ux0 = max(0, int(min(c[0] for c in cantos)))
        ux1 = min(crt.largura, int(max(c[0] for c in cantos)) + 1)
        uy0 = max(0, int(min(c[1] for c in cantos)))
        uy1 = min(crt.altura, int(max(c[1] for c in cantos)) + 1)

        margem = margem_km * self.px_km
        for _ in range(8):
            x0 = max(ux0, int(min(p[0] for p in pix) - margem))
            x1 = min(ux1, int(max(p[0] for p in pix) + margem))
            y0 = max(uy0, int(min(p[1] for p in pix) - margem))
            y1 = min(uy1, int(max(p[1] for p in pix) + margem))
            if (x1 - x0) * (y1 - y0) <= LIMITE_PX or margem <= 1:
                break
            margem *= 0.75
        self.margem_km = margem / self.px_km

        self.real = (x0, y0, x1, y1)
        paleta = crt.paletas.get("padrao") or {}
        codigo = {N.OUTRO: 0, N.TERRA: 1, N.RASO: 2, N.FUNDO: 3}
        lut = np.zeros(256, dtype=np.uint8)
        for i in range(256):
            lut[i] = codigo[N.classificar_cor(paleta.get(i, (255, 255, 255)))]

        # O vao entre as duas pontas e o piso do recorte, e a margem nao o
        # alcanca - conferir so a margem deixava o teto de pixels decorativo.
        # A grade mais fina que existe usa passo de ceil(lado/LADOS[-1]) pixels,
        # entao ler de `salto` em `salto` pixels nao perde nada e limita a
        # memoria. E le em faixas: o pico passa a ser uma faixa, nao o recorte.
        alt_px, larg_px = y1 - y0, x1 - x0
        fino = max(1, int(math.ceil(max(alt_px, larg_px) / float(LADOS[-1]))))
        salto = 1
        while salto < fino and (larg_px // salto) * (alt_px // salto) > LIMITE_PX:
            salto += 1
        if (larg_px // salto) * (alt_px // salto) > LIMITE_PX:
            raise N.ErroDeUso(
                "a perna e grande demais para rotear na carta %s (1:%s): mesmo "
                "reduzido, o recorte tem %.0f milhoes de pontos. Divida a "
                "viagem em etapas."
                % (crt.numero, crt.escala,
                   (larg_px // salto) * (alt_px // salto) / 1e6))
        self.salto = salto

        nl, nc = alt_px // salto, larg_px // salto
        self.classes = np.zeros((nl, nc), dtype=np.uint8)
        for r0 in range(0, nl, FAIXA_LINHAS):
            r1 = min(nl, r0 + FAIXA_LINHAS)
            bruto, _r = crt.decodificar((x0, y0 + r0 * salto,
                                         x1, y0 + r1 * salto))
            sub = bruto[::salto, ::salto][:r1 - r0, :nc]
            self.classes[r0:r0 + sub.shape[0], :sub.shape[1]] = lut[sub]


class Grade(object):
    """Recorte reduzido a uma grade de celulas navegaveis.

    Uma celula e terra quando a MAIORIA dos seus pixels classificados e terra.
    Em celula grande isso deixa canal estreito aberto, o que e proposital: a
    grade grossa serve para decidir por qual lado da ilha passar, e a
    conferencia depois refaz a conta na carta de maior escala, onde a rodada
    seguinte corrige o detalhe.
    """

    def __init__(self, recorte, lado_max, folga_km=FOLGA_KM):
        self.crt = recorte.crt
        self.real = recorte.real
        self.px_km = recorte.px_km
        self.salto = recorte.salto
        classes = recorte.classes

        alt, larg = classes.shape
        self.passo = max(1, int(math.ceil(max(alt, larg) / float(lado_max))))
        # um elemento de `classes` vale `salto` pixels da carta
        self.passo_px = self.passo * self.salto
        nl, nc = alt // self.passo, larg // self.passo
        if nl < 3 or nc < 3:
            raise N.ErroDeUso("recorte da carta pequeno demais para rotear")
        bl = classes[:nl * self.passo, :nc * self.passo].reshape(
            nl, self.passo, nc, self.passo)
        terra = (bl == 1).sum(axis=(1, 3)).astype(np.float32)
        raso = (bl == 2).sum(axis=(1, 3)).astype(np.float32)
        fundo = (bl == 3).sum(axis=(1, 3)).astype(np.float32)

        self.km_celula = self.passo_px / self.px_km
        area = float(self.passo * self.passo)
        conhecido = terra + raso + fundo
        self.incerto = conhecido < 0.20 * area
        frac = np.where(conhecido > 0, terra / np.maximum(conhecido, 1.0), 0.0)
        self.terra = (~self.incerto) & (frac >= PISO_TERRA)
        self.raso = (~self.terra) & (raso > fundo)

        self.terra |= self._fora_da_carta()
        # a folga vem PRIMEIRO e o campo de distancia e dimensionado por ela.
        # Ao contrario, com o campo saturando em ANEIS=12 e a folga passando de
        # 12 celulas (celula miuda das cartas de grande escala), `dist < folga`
        # dava True em toda a grade: tudo impedido, e pedir mais folga entregava
        # menos folga.
        self.folga_cel = max(1, min(FOLGA_CEL_MAX,
                                    int(round(folga_km / self.km_celula))))
        self.dist = self._distancias(max(ANEIS, self.folga_cel + 1))
        self.impedido = self.terra | (self.dist < self.folga_cel)
        self.custo = (1.0 + CUSTO_RASO * self.raso
                      + CUSTO_PERTO / (1.0 + self.dist.astype(np.float64))
                      + CUSTO_INCERTO * self.incerto)

    # -- geometria ----------------------------------------------------------

    def latlon_das_celulas(self):
        """(lat, lon) do centro de cada celula, em dois arrays 2D."""
        para_geo = self.crt._ajustar_geo()[0]
        nl, nc = self.terra.shape
        x = self.real[0] + (np.arange(nc) + 0.5) * self.passo_px
        y = self.real[1] + (np.arange(nl) + 0.5) * self.passo_px
        X, Y = np.meshgrid(x, y)
        lon = para_geo[0, 0] + para_geo[1, 0] * X + para_geo[2, 0] * Y
        my = para_geo[0, 1] + para_geo[1, 1] * X + para_geo[2, 1] * Y
        lat = np.degrees(2 * np.arctan(np.exp(my)) - math.pi / 2)
        return lat, lon

    def _fora_da_carta(self):
        """Celulas fora da linha de recorte da carta. Sao intransponiveis: ali
        o raster e moldura, nao mar."""
        pts = self.crt.poligono
        lat, lon = self.latlon_das_celulas()
        if len(pts) < 3:
            la0, la1, lo0, lo1 = self.crt.limites()
            return (lat < la0) | (lat > la1) | (lon < lo0) | (lon > lo1)
        dentro = np.zeros(lat.shape, dtype=bool)
        j = len(pts) - 1
        for i in range(len(pts)):
            yi, xi = pts[i]
            yj, xj = pts[j]
            j = i
            if yj == yi:
                continue
            cruza = (yi > lat) != (yj > lat)
            xint = (xj - xi) * (lat - yi) / (yj - yi) + xi
            dentro ^= cruza & (lon < xint)
        return ~dentro

    def celula(self, ponto):
        x, y = self.crt.para_pixel(ponto[0], ponto[1])
        nl, nc = self.terra.shape
        cy = int((y - self.real[1]) // self.passo_px)
        cx = int((x - self.real[0]) // self.passo_px)
        return (max(0, min(nl - 1, cy)), max(0, min(nc - 1, cx)))

    def ponto(self, cel):
        x = self.real[0] + (cel[1] + 0.5) * self.passo_px
        y = self.real[1] + (cel[0] + 0.5) * self.passo_px
        return self.crt.para_latlon(x, y)

    def _distancias(self, aneis=ANEIS):
        """Quantas celulas ate a terra mais perto, saturando em `aneis`."""
        dist = np.full(self.terra.shape, aneis, dtype=np.int32)
        dist[self.terra] = 0
        frente = self.terra.copy()
        for d in range(1, aneis):
            viz = np.zeros_like(frente)
            viz[1:, :] |= frente[:-1, :]
            viz[:-1, :] |= frente[1:, :]
            viz[:, 1:] |= frente[:, :-1]
            viz[:, :-1] |= frente[:, 1:]
            novo = viz & (dist > d)
            if not novo.any():
                break
            dist[novo] = d
            frente = novo
        return dist

    def encostar(self, cel, max_km=ENCOSTAR_KM, impedido=None):
        """Puxa uma ponta que caiu em terra para a agua navegavel mais perto."""
        imp = self.impedido if impedido is None else impedido
        if not imp[cel]:
            return cel
        nl, nc = imp.shape
        limite = max(1, int(round(max_km / self.km_celula)))
        for r in range(1, limite + 1):
            y0, y1 = max(0, cel[0] - r), min(nl, cel[0] + r + 1)
            x0, x1 = max(0, cel[1] - r), min(nc, cel[1] + r + 1)
            livre = ~imp[y0:y1, x0:x1]
            if livre.any():
                ys, xs = np.nonzero(livre)
                d = (ys + y0 - cel[0]) ** 2 + (xs + x0 - cel[1]) ** 2
                k = int(np.argmin(d))
                return (int(ys[k]) + y0, int(xs[k]) + x0)
        return None


# ---------------------------------------------------------------------------
# busca
# ---------------------------------------------------------------------------

def _astar(custo, impedido, ini, fim):
    """Menor custo de `ini` a `fim` na grade, 8 vizinhos. None se nao ha rota."""
    alt, larg = custo.shape
    n = alt * larg
    g = np.full(n, np.inf)
    pai = np.full(n, -1, dtype=np.int32)
    fechado = np.zeros(n, dtype=bool)
    c = custo.ravel()
    imp = impedido.ravel()
    si, sf = ini[0] * larg + ini[1], fim[0] * larg + fim[1]
    g[si] = 0.0
    fila = [(0.0, si)]
    fy, fx = fim
    raiz2 = math.sqrt(2.0)
    vizinhos = ((-1, -1, raiz2), (-1, 0, 1.0), (-1, 1, raiz2), (0, -1, 1.0),
                (0, 1, 1.0), (1, -1, raiz2), (1, 0, 1.0), (1, 1, raiz2))
    while fila:
        _f, no = heapq.heappop(fila)
        if fechado[no]:
            continue
        fechado[no] = True
        if no == sf:
            break
        y, x = divmod(no, larg)
        base = g[no]
        cno = c[no]
        for dy, dx, salto in vizinhos:
            yy, xx = y + dy, x + dx
            if yy < 0 or yy >= alt or xx < 0 or xx >= larg:
                continue
            nv = yy * larg + xx
            if imp[nv] or fechado[nv]:
                continue
            novo = base + salto * 0.5 * (cno + c[nv])
            if novo < g[nv]:
                g[nv] = novo
                pai[nv] = no
                heapq.heappush(fila, (novo + math.hypot(yy - fy, xx - fx), nv))
    if not fechado[sf]:
        return None
    caminho, no = [], sf
    while no != -1:
        caminho.append(divmod(no, larg))
        no = pai[no]
    caminho.reverse()
    return caminho


def _celulas_do_segmento(a, b):
    """Toda celula que o segmento atravessa, com o trecho (t0, t1) em que fica.

    Enumerar e exato; amostrar nao e. Amostrando de meia em meia celula pelo
    eixo dominante, uma reta quase diagonal salta de (i,j) para (i+1,j+1) e
    nunca visita as duas celulas do canto - era assim que reta cortando terra
    passava por limpa. A celula (i, j) ocupa [i-0,5, i+0,5] x [j-0,5, j+0,5].
    """
    y0, x0 = float(a[0]), float(a[1])
    dy, dx = float(b[0]) - y0, float(b[1]) - x0
    corte_y, corte_x = set(), set()
    for p0, d, onde in ((y0, dy, corte_y), (x0, dx, corte_x)):
        if d == 0.0:
            continue
        lo, hi = (p0, p0 + d) if d > 0 else (p0 + d, p0)
        k = math.floor(lo - 0.5) + 1
        while k + 0.5 < hi:
            t = round((k + 0.5 - p0) / d, 12)
            if 0.0 < t < 1.0:
                onde.add(t)
            k += 1
    ts = sorted({0.0, 1.0} | corte_y | corte_x)
    saida = []
    for t0, t1 in zip(ts, ts[1:]):
        tm = 0.5 * (t0 + t1)
        saida.append((t0, t1, (int(round(y0 + dy * tm)),
                               int(round(x0 + dx * tm)))))
    if not saida:
        saida.append((0.0, 1.0, (int(round(y0)), int(round(x0)))))
    # Canto exato: quando a reta passa pelo vertice de quatro celulas, duas
    # delas sao tocadas so no vertice e nao entram na conta dos trechos. Contar
    # as quatro e a escolha segura - enfiar a derrota exatamente pelo vertice
    # entre duas celulas de terra nao e caminho navegavel.
    for t in corte_y & corte_x:
        vy, vx = y0 + dy * t, x0 + dx * t
        by, bx = int(math.floor(vy)), int(math.floor(vx))
        for cy in (by, by + 1):
            for cx in (bx, bx + 1):
                saida.append((t, t, (cy, cx)))
    return saida


def _enxergam(impedido, a, b, folga_a=0.0, folga_b=0.0):
    """A reta entre duas celulas corre inteira pela agua?

    `folga_a` e `folga_b` sao trechos perdoados em cada ponta, medidos em
    CELULAS de distancia ao longo da reta - junto ao cais terra e esperada.
    Medir em distancia, e nao em numero de amostras, e o que mantem essa
    tolerancia igual em qualquer direcao: contada em amostras do eixo
    dominante, ela inflava raiz(2) vezes na diagonal e passava dos 0,6 km que a
    conferencia perdoa.
    """
    comp = math.hypot(b[0] - a[0], b[1] - a[1])
    alt, larg = impedido.shape

    def livre(y, x):
        return 0 <= y < alt and 0 <= x < larg and not impedido[y, x]

    if comp == 0.0:
        return livre(int(round(a[0])), int(round(a[1])))
    # nunca perdoar a reta inteira: sobra sempre um miolo para conferir, senao
    # a resposta seria verdade vacua - nenhuma celula testada
    fa = min(max(0.0, folga_a), 0.45 * comp)
    fb = min(max(0.0, folga_b), 0.45 * comp)
    for t0, t1, (y, x) in _celulas_do_segmento(a, b):
        if t1 * comp <= fa or t0 * comp >= comp - fb:
            continue
        if not livre(y, x):
            return False
    return True


def _enxugar(impedido, caminho):
    """Deixa so os pontos indispensaveis: de cada um, salta para o mais longe
    que ainda se enxerga em linha reta pela agua."""
    saida = [caminho[0]]
    i = 0
    while i < len(caminho) - 1:
        j = len(caminho) - 1
        while j > i + 1 and not _enxergam(impedido, caminho[i], caminho[j]):
            j -= 1
        saida.append(caminho[j])
        i = j
    return saida


def _podar(impedido, seq, folga_a=0.0, folga_b=0.0):
    """Tira o ponto que ficou sobrando: se do anterior ja se enxerga o
    seguinte, o do meio nao faz falta. Roda com as pontas VERDADEIRAS da perna
    na lista, e por isso perdoa o trecho junto ao cais - so nas pontas."""
    seq = [c for i, c in enumerate(seq) if i == 0 or c != seq[i - 1]]
    i = 1
    while i < len(seq) - 1:
        fa = folga_a if i - 1 == 0 else 0.0
        fb = folga_b if i + 1 == len(seq) - 1 else 0.0
        if _enxergam(impedido, seq[i - 1], seq[i + 1], fa, fb):
            del seq[i]
        else:
            i += 1
    return seq


# ---------------------------------------------------------------------------
# interface
# ---------------------------------------------------------------------------

def desviar(a, b, indice=None, carta=None, folga_km=FOLGA_KM,
            max_pontos=MAX_PONTOS, minimo_km=MINIMO_KM,
            cais_a=False, cais_b=False):
    """Pontos intermediarios que levam de `a` a `b` pela agua.

    `cais_a` e `cais_b` dizem se a ponta e o cais de partida ou de chegada da
    derrota INTEIRA. So ali terra e esperada, e so ali a conferencia perdoa os
    primeiros 600 m: perdoar na ponta de uma perna do meio jogava fora o ponto
    que tirava a perna de cima da terra.

    Devolve um dicionario com `pontos` (lista de (lat, lon), vazia se nao
    houve como), `carta`, `escala`, `celula_km` e `motivo` quando falha.
    """
    indice = indice or C.carregar_indice()
    cand = carta or N.melhor_carta_para(a, b, indice)
    if cand is None:
        return {"pontos": [], "motivo": "nenhuma carta contem as duas pontas"}
    crt = N._painel(cand)
    if crt is None:
        return {"pontos": [], "motivo": "o arquivo da carta falta no acervo"}

    _rumo, mn = N.rumo_e_distancia(a[0], a[1], b[0], b[1])
    fora = {"carta": crt.numero, "escala": crt.escala, "pontos": []}
    try:
        recorte = Recorte(crt, [a, b], margem_km=max(3.0, 0.6 * mn * N.MN_KM))
    except N.C.ErroDeUso as e:
        fora["motivo"] = str(e)
        return fora

    # A grade FINA e a arbitra: e nela que a conferencia da skill vai olhar. A
    # busca comeca na grade grossa, que custa pouco e resolve por qual lado da
    # ilha passar, mas o resultado so vale se estiver limpo na fina. Sem essa
    # arbitragem o roteador entregava caminho que a conferencia reprovava: numa
    # celula de 0,8 km uma restinga de 0,4 km e minoria e desaparece.
    fina = Grade(recorte, LADOS[-1], folga_km)

    def limpa(pontos):
        """A derrota com esses pontos corre pela agua na grade fina?"""
        seq = [a] + [(la, lo) for la, lo in pontos] + [b]
        for k in range(len(seq) - 1):
            fa = (PERDAO_KM / fina.km_celula) if (k == 0 and cais_a) else 0.0
            fb = (PERDAO_KM / fina.km_celula) \
                if (k == len(seq) - 2 and cais_b) else 0.0
            if not _enxergam(fina.terra, fina.celula(seq[k]),
                             fina.celula(seq[k + 1]), fa, fb):
                return False
        return True

    def tentar(grade):
        """Pontos que a grade `grade` propoe, ou lista vazia."""
        ca, cb = grade.celula(a), grade.celula(b)
        # primeiro com folga da costa; se nao passar, tenta rente a terra. quando
        # a folga nao chega a uma celula as duas mascaras sao a mesma coisa
        tentativas = [grade.impedido]
        if int(grade.impedido.sum()) != int(grade.terra.sum()):
            tentativas.append(grade.terra)
        caminho = impedido = None
        for imp in tentativas:
            ini = grade.encostar(ca, impedido=imp)
            fim = grade.encostar(cb, impedido=imp)
            if ini is None or fim is None:
                continue
            caminho = _astar(grade.custo, imp, ini, fim)
            if caminho:
                impedido = imp
                break
        if not caminho:
            return []
        # as pontas verdadeiras da perna entram na lista, mas as pontas
        # ENCOSTADAS do caminho ficam: se o cais nao enxergar o ponto seguinte,
        # sao elas que tiram a perna de cima da terra. A poda derruba o resto.
        bruto = _enxugar(impedido, caminho)
        seq = _podar(impedido, [grade.celula(a)] + bruto + [grade.celula(b)],
                     (PERDAO_KM / grade.km_celula) if cais_a else 0.0,
                     (PERDAO_KM / grade.km_celula) if cais_b else 0.0)

        pontos, ultimo, perto_da_ponta = [], a, []
        for cel in seq[1:-1]:
            la, lo = grade.ponto(cel)
            _r, d_ini = N.rumo_e_distancia(ultimo[0], ultimo[1], la, lo)
            _r, d_fim = N.rumo_e_distancia(la, lo, b[0], b[1])
            if d_ini * N.MN_KM < minimo_km or d_fim * N.MN_KM < minimo_km:
                perto_da_ponta.append((round(la, 4), round(lo, 4)))
                continue
            pontos.append((round(la, 4), round(lo, 4)))
            ultimo = (la, lo)
        if not pontos and perto_da_ponta:
            # o unico contorno que existe fica perto de uma ponta. Descartar por
            # estar perto seria devolver a perna por cima da terra dizendo que
            # deu certo - o `minimo_km` evita ponto INUTIL, nao este.
            pontos = perto_da_ponta
        return pontos

    melhor, melhor_grade = [], None
    for lado in LADOS:
        grade = fina if lado == LADOS[-1] else Grade(recorte, lado, folga_km)
        pontos = tentar(grade)
        if pontos and (not melhor or len(pontos) < len(melhor)):
            melhor, melhor_grade = pontos, grade
        if pontos and limpa(pontos):
            melhor, melhor_grade = pontos, grade
            break

    fora["celula_km"] = (melhor_grade or fina).km_celula
    if not melhor:
        fora["motivo"] = ("nao achei caminho pela agua na carta %s (1:%s)"
                          % (crt.numero, crt.escala))
        return fora
    fora["pontos"] = melhor[:max_pontos]
    if len(melhor) > max_pontos:
        fora["motivo"] = ("o caminho pedia %d pontos e o limite e %d; a derrota "
                          "pode continuar cruzando terra"
                          % (len(melhor), max_pontos))
    # `limpa` serve para ESCOLHER entre as resolucoes, nao para avisar: ela e
    # mais pessimista que a conferencia (celula por maioria contra pixel exato),
    # e um aviso que a conferencia depois desmente e so ruido.
    return fora


def _cercar(a, b, problemas, folga_km=3.0):
    """Dois pontos na propria reta, um antes e um depois do trecho reclamado.

    Servem para PARTIR uma perna comprida que nao limpou: na rodada seguinte o
    pedaco curto e roteado na carta de maior escala que o contem, onde o vao
    entre os bancos aparece. Numa perna de 100 MN a carta e de escala pequena
    demais para o roteador ver a saida do porto.
    """
    _r, mn = N.rumo_e_distancia(a[0], a[1], b[0], b[1])
    total = mn * N.MN_KM
    if total < 0.8:
        return []
    # numa perna ja curta a cerca encolhe junto, senao nao caberia e o cerco
    # simplesmente nao aconteceria - foi o que travou a saida da Baia Sul
    folga = min(folga_km, total / 4.0)
    distancias = []
    for p in problemas:
        _r, d = N.rumo_e_distancia(a[0], a[1], p["lat"], p["lon"])
        distancias.append(d * N.MN_KM - folga)
        distancias.append(d * N.MN_KM + p.get("extensao_km", 0.0) + folga)
    novos = []
    for dist in sorted(distancias):
        if not (folga * 0.5 < dist < total - folga * 0.5):
            continue
        t = dist / total
        ponto = (round(a[0] + (b[0] - a[0]) * t, 4),
                 round(a[1] + (b[1] - a[1]) * t, 4), None)
        if novos and N.rumo_e_distancia(novos[-1][0], novos[-1][1],
                                        ponto[0], ponto[1])[1] * N.MN_KM < 1.0:
            continue
        novos.append(ponto)
    return novos


def corrigir(wps, indice=None, numero_percurso=None, rodadas=RODADAS,
             folga_km=FOLGA_KM, limite_s=LIMITE_S):
    """Insere pontos onde a derrota cruza terra, ate limpar.

    Cada rodada reconfere a derrota inteira: a rodada seguinte trabalha nas
    cartas mais detalhadas que passaram a conter as pernas novas, de modo que o
    caminho vai sendo refinado. Devolve (pontos, notas, conferencia final).
    """
    indice = indice or C.carregar_indice()
    notas, cf = [], None

    def percurso(pontos):
        if numero_percurso:
            try:
                crt = N._painel(C.por_numero(indice, numero_percurso)[0])
                if crt and all(crt.contem(w[0], w[1]) for w in pontos):
                    return numero_percurso
            except C.ErroDeUso:
                pass
        return N.carta_do_percurso(pontos, indice)["numero"]

    def nota(i, pontos, r, motivo=None):
        notas.append({"perna": i, "pontos": pontos, "carta": r.get("carta"),
                      "escala": r.get("escala"), "celula_km": r.get("celula_km"),
                      "motivo": motivo or r.get("motivo")})

    def rotear(pontos, problemas):
        """Uma passada de desvio nas pernas sujas. Devolve (pontos, mudou)."""
        mudou = False
        for i in sorted(set(p["perna"] for p in problemas), reverse=True):
            if len(pontos) >= MAX_TOTAL:
                nota(i, 0, {}, "a derrota chegou ao limite de %d pontos de "
                              "passagem e o contorno parou aqui" % MAX_TOTAL)
                break
            try:
                r = desviar(pontos[i - 1], pontos[i], indice, folga_km=folga_km,
                            cais_a=(i == 1), cais_b=(i == len(pontos) - 1))
            except (N.C.ErroDeUso, MemoryError, ValueError) as e:
                # uma perna que nao da para rotear nao derruba o relatorio
                r = {"pontos": [],
                     "motivo": "nao deu para ler a carta desta perna (%s)" % e}
            if r.get("pontos"):
                pontos = (pontos[:i] + [(la, lo, None) for la, lo in r["pontos"]]
                          + pontos[i:])
                mudou = True
                nota(i, len(r["pontos"]), r)
            if r.get("motivo"):
                nota(i, 0, r)
        return pontos, mudou

    def partir(pontos, problemas):
        """Cerca o trecho sujo de cada perna, para a rodada seguinte rotear um
        pedaco curto - onde a carta tem escala util."""
        mudou = False
        for i in sorted(set(p["perna"] for p in problemas), reverse=True):
            if len(pontos) >= MAX_TOTAL:
                break
            novos = _cercar(pontos[i - 1], pontos[i],
                            [p for p in problemas if p["perna"] == i])
            if novos:
                pontos = pontos[:i] + novos + pontos[i:]
                mudou = True
                nota(i, len(novos), {},
                     "perna partida em %d pedaco(s) para rotear o trecho sujo "
                     "numa carta de escala util" % (len(novos) + 1))
        return pontos, mudou

    def onde(p):
        """Chave do obstaculo. Ele nao se move; a perna que o contem, sim."""
        return (round(p["lat"], 2), round(p["lon"], 2))

    sujo_antes, partiu, vistos = None, False, set()
    insistentes_roteados = [False]
    inicio = time.time()
    for _rodada in range(rodadas):
        if time.time() - inicio > limite_s:
            nota(0, 0, {}, "o contorno parou no teto de %d s; o que sobrou esta "
                           "na conferencia" % int(limite_s))
            break
        cf = N.conferir_derrota(percurso(wps), wps, indice=indice,
                                medir_afastamento=False)
        if not cf["problemas"]:
            return wps, notas, cf
        sujo = sum(p["extensao_km"] for p in cf["problemas"])
        insistentes = [p for p in cf["problemas"] if onde(p) in vistos]
        vistos |= set(onde(p) for p in cf["problemas"])
        parado = sujo_antes is not None and sujo >= sujo_antes - 0.05
        sujo_antes = sujo

        mudou = False
        # trecho que resistiu a uma rodada inteira de desvio nao cede na
        # proxima: cerca ele e deixa a rodada seguinte rotear o pedaco curto
        if insistentes and not partiu:
            partiu = True
            wps, mudou = partir(wps, insistentes)
        if not mudou and not (parado and partiu):
            wps, mudou = rotear(wps, cf["problemas"])
        if not mudou and not partiu:
            # o desvio travou sem inserir nada; cercar da a ele um pedaco curto
            partiu = True
            wps, mudou = partir(wps, cf["problemas"])
        if not mudou:
            break
        if partiu and not insistentes_roteados[0]:
            # cercar nao muda a geometria da derrota, so parte a perna: a terra
            # atravessada continua a mesma e a rodada seguinte leria isso como
            # "nao progrediu", justamente a leitura que impede de rotear o
            # pedaco recem-criado. Zera a referencia para nao travar assim.
            insistentes_roteados[0] = True
            sujo_antes = None
    cf = N.conferir_derrota(percurso(wps), wps, indice=indice,
                            medir_afastamento=False)
    return wps, notas, cf


def texto_das_notas(notas):
    """Uma linha curta por nota, para o console."""
    saida = []
    for n in notas:
        if n.get("motivo"):
            saida.append(("perna %d: %s" % (n["perna"], n["motivo"]))
                         if n.get("perna") else ("derrota: %s" % n["motivo"]))
            continue
        saida.append("perna %d: %d ponto(s) tirados da carta %s (1:%s), celula de "
                     "%s km" % (n["perna"], n["pontos"],
                                N.carta_oficial(n["carta"], "")[0], n["escala"],
                                N._fmt(n["celula_km"], 2)))
    return saida


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(
        description="Acha caminho pela agua entre dois pontos, na carta do CHM.")
    ap.add_argument("partida", help='"lat,lon" ou nome do lugar')
    ap.add_argument("chegada", help='"lat,lon" ou nome do lugar')
    ap.add_argument("--folga-km", type=float, default=FOLGA_KM)
    ap.add_argument("--dados", default=None, help="pasta do acervo raster")
    args = ap.parse_args(argv)
    try:
        N.abrir_acervo(args.dados)
        indice = C.carregar_indice()
        a = N.resolver(args.partida, indice)
        b = N.resolver(args.chegada, indice)
        wps, notas, cf = corrigir([a, b], indice, folga_km=args.folga_km)
    except N.C.ErroDeUso as e:
        sys.stderr.write("\nERRO: %s\n\n" % e)
        return 2
    for n in texto_das_notas(notas):
        print(n)
    for w in wps[1:-1]:
        print('--wp "%s,%s"' % (w[0], w[1]))
    for linha in N.texto_da_conferencia(cf):
        print(linha)
    return 0


if __name__ == "__main__":
    sys.exit(main())
