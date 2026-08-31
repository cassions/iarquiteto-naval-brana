# -*- coding: utf-8 -*-
"""Motor da skill brana-exportar-delftship-freeship.

Tabela de cotas -> FREE!ship partfile (.part), importavel no DELFTship e no
FREE!ship. Fecha o espelho de popa e marca como crease as arestas que sao quina
de verdade: contorno, quina costado/espelho e a linha do chine.

Layout do .part (versao 21), deduzido de um arquivo real e validado por
round-trip byte a byte:

  int32 len ; "FREE!ship partfile" ; int32 versao=21 ; int32 reservado=0
  int32 nCamadas
    por camada: int32 len ; nome ; int32 id ; byte cor[4] ; byte flags[5]
                float f1, f2 ; byte b6 ; int32 alfa
  int32 nPontos
    por ponto: float x,y,z ; byte tipoVertice ; byte pad[5]
  int32 nArestas
    por aresta: int32 p1,p2 ; byte crease
  int32 nFaces
    por face: int32 n ; int32 idx[n] ; int32 iCamada
  int32 nCurvasDeControle = 0
"""
import re, struct, math, collections

IDENT, VERSAO = b'FREE!ship partfile', 21
VT_REGULAR, VT_CREASE, VT_CORNER = 0, 1, 3
VERM_BRANA, GRAFITE, AZUL = (0x9A, 0x32, 0x31), (0x40, 0x40, 0x40), (0x2E, 0x5A, 0x78)


class Erro(Exception):
    pass


# ============================ leitura da tabela ============================

CHAVE_QUIN = ('sheer_hb', 'chine_hb', 'chine_ht', 'keel_ht', 'deadrise')
CHAVE_RED = ('altura_quilha', 'altura_borda', 'meia_boca', 'mb_', 'baliza')


def _sep_decimal(toks):
    """Decide virgula ou ponto olhando a tabela inteira, nao token a token.
       Ler '283,5' como 2835 nao daria erro: daria um casco errado em silencio."""
    virg = ponto = False
    for t in toks:
        if ',' in t and '.' in t:
            continue
        if re.search(r',\d{1,2}$', t) or re.search(r',\d{4,}$', t):
            virg = True
        if re.search(r'\.\d{1,2}$', t) or re.search(r'\.\d{4,}$', t):
            ponto = True
    if virg and not ponto:
        return ','
    if ponto and not virg:
        return '.'
    return None


def _num(s, dec):
    s = s.strip()
    tv, tp = ',' in s, '.' in s
    if tv and tp:
        d = ',' if s.rfind(',') > s.rfind('.') else '.'
        s = s.replace('.' if d == ',' else ',', '').replace(d, '.')
    elif tv:
        if dec == ',':
            s = s.replace(',', '.')
        elif dec == '.':
            s = s.replace(',', '')
        else:
            s = s.replace(',', '') if re.search(r',\d{3}$', s) else s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        raise Erro('valor nao numerico na tabela: %r' % s)


def ler_tabela(texto):
    """-> (estacoes, formato). estacoes: [{'x':mm, 'niveis':[(y,z), ...]}] da quilha
       para a borda. formato: 'quinado' ou 'redondo'."""
    linhas = [l for l in texto.splitlines()
              if l.strip() and not l.strip().startswith('#')]
    if not linhas:
        raise Erro('a tabela esta vazia (so comentarios ou linhas em branco)')

    cab, dados = None, []
    for l in linhas:
        t = re.split(r'[\t;]|\s{1,}', l.strip())
        t = [x for x in t if x]
        if any(re.search(r'[A-Za-z_]', x) for x in t):
            if cab is None and not dados:
                cab = [x.lower() for x in t]
                continue
            raise Erro('linha com texto no meio dos dados: %r' % l.strip())
        dados.append(t)
    if len(dados) < 3:
        raise Erro('sao necessarias ao menos 3 balizas; encontrei %d' % len(dados))

    n = len(dados[0])
    for i, d in enumerate(dados):
        if len(d) != n:
            raise Erro('a baliza %d tem %d colunas, as outras tem %d' % (i + 1, len(d), n))

    dec = _sep_decimal([x for d in dados for x in d])
    V = [[_num(x, dec) for x in d] for d in dados]

    fmt = None
    if cab:
        j = ' '.join(cab)
        if any(k in j for k in CHAVE_QUIN):
            fmt = 'quinado'
        elif any(k in j for k in CHAVE_RED):
            fmt = 'redondo'
    if fmt is None:                       # sem cabecalho util: decide por votacao
        q = sum(1 for v in V if v[2] > v[3])
        r = sum(1 for v in V if v[2] < v[3])
        if q == r:
            raise Erro('nao consegui distinguir quinado de redondo; acrescente a '
                       'linha de cabecalho da tabela (veja references/formato-da-tabela.md)')
        fmt = 'quinado' if q > r else 'redondo'

    est = []
    if fmt == 'quinado':
        if n not in (7, 8):
            raise Erro('formato quinado pede 7 colunas (ou 8 com deadrise_deg); '
                       'a tabela tem %d' % n)
        for v in V:
            _, x, shb, chb, sht, cht, kh = v[:7]
            est.append(dict(x=x, niveis=[(0.0, kh), (chb, cht), (shb, sht)]))
    else:
        if n < 6:
            raise Erro('formato redondo pede ao menos 6 colunas '
                       '(baliza x altura_quilha altura_borda + meias-bocas); tem %d' % n)
        for v in V:
            x, zk, zs = v[1], v[2], v[3]
            mb = v[4:]
            k = len(mb)
            niv = [(0.0, zk)]
            for i in range(k - 1):
                niv.append((mb[i], zk + (i + 1) / float(k) * (zs - zk)))
            niv.append((mb[-1], zs))
            est.append(dict(x=x, niveis=niv))

    est.sort(key=lambda e: e['x'])
    for i in range(1, len(est)):
        if abs(est[i]['x'] - est[i - 1]['x']) < 1e-9:
            raise Erro('duas balizas na mesma posicao x = %g' % est[i]['x'])
    pontal = max(max(z for _, z in e['niveis']) for e in est) - \
             min(min(z for _, z in e['niveis']) for e in est)
    if pontal <= 0:
        raise Erro('o pontal saiu zero: confira as colunas de altura')
    return est, fmt


# ============================== interpolacao ==============================

def pchip(xs, ys):
    n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    m[0], m[n - 1] = d[0], d[n - 2]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    for i in range(n - 1):
        if d[i] == 0:
            m[i] = m[i + 1] = 0.0
            continue
        a, b = m[i] / d[i], m[i + 1] / d[i]
        s = a * a + b * b
        if s > 9:
            t = 3 / math.sqrt(s)
            m[i] = t * a * d[i]
            m[i + 1] = t * b * d[i]

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        k = 0
        while k < n - 2 and x > xs[k + 1]:
            k += 1
        t = (x - xs[k]) / h[k]
        t2 = t * t
        t3 = t2 * t
        return ((2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h[k] * m[k] +
                (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h[k] * m[k + 1])
    return f


# =============================== geometria ===============================

class Casco:
    def __init__(self, est, fmt, nz=21, nzq=8):
        self.est, self.fmt = est, fmt
        self.nLv = len(est[0]['niveis'])
        self.XS = [e['x'] for e in est]
        self.LOA = self.XS[-1]
        self.quinado = (fmt == 'quinado')
        self.nz = nzq if self.quinado else nz
        self.fy = [pchip(self.XS, [e['niveis'][j][0] for e in est]) for j in range(self.nLv)]
        self.fz = [pchip(self.XS, [e['niveis'][j][1] for e in est]) for j in range(self.nLv)]
        ult = est[-1]['niveis']
        self.proaPonto = (all(abs(y) < 1e-9 for y, _ in ult) and
                          abs(ult[-1][1] - ult[0][1]) < 1e-9)
        self.sub = max(2, int(round(30.0 / (len(est) - 1))))

    @property
    def npv(self):
        return 2 * self.nz + 1 if self.quinado else self.nz

    @property
    def iQuina(self):
        return self.nz if self.quinado else None

    def anel(self, x):
        niv = [(max(0.0, self.fy[j](x)), self.fz[j](x)) for j in range(self.nLv)]
        if self.quinado:
            a, b, c = niv[0], niv[1], niv[2]
            K = self.nz
            pts = [(x, a[0] + (b[0] - a[0]) * t / float(K), a[1] + (b[1] - a[1]) * t / float(K))
                   for t in range(K + 1)]
            pts += [(x, b[0] + (c[0] - b[0]) * t / float(K), b[1] + (c[1] - b[1]) * t / float(K))
                    for t in range(1, K + 1)]
            return pts
        zs = [z for _, z in niv]
        ys = [y for y, _ in niv]
        d = zs[-1] - zs[0]
        if d <= 1e-12:
            return [(x, 0.0, zs[0])] * self.nz
        # Cada nivel e interpolado longitudinalmente por conta propria, entao entre
        # balizas dois niveis podem se cruzar. Se isso acontecer, cai na convencao
        # declarada da tabela: niveis igualmente espacados no pontal local.
        if any(zs[j + 1] <= zs[j] for j in range(len(zs) - 1)):
            n = len(zs) - 1
            zs = [zs[0] + (j / float(n)) * d for j in range(n + 1)]
        f = pchip(zs, ys)
        return [(x, 0.0 if j == 0 else max(0.0, f(zs[0] + (j / float(self.nz - 1)) * d)),
                 zs[0] + (j / float(self.nz - 1)) * d) for j in range(self.nz)]

    def xrings(self):
        xs = []
        for i in range(len(self.XS) - 1):
            a, b = self.XS[i], self.XS[i + 1]
            for k in range(self.sub):
                xs.append(a + (b - a) * k / float(self.sub))
        if not self.proaPonto:
            xs.append(self.XS[-1])
        return xs


def _volume(V, F):
    v = 0.0
    for ii, _ in F:
        for k in range(1, len(ii) - 1):
            a, b, c = V[ii[0]], V[ii[k]], V[ii[k + 1]]
            v += ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])) \
                 * (a[1] + b[1] + c[1]) / 6.0
    return v


def montar(c):
    NZ = c.npv
    XR = c.xrings()
    V, idx = [], []
    for x in XR:
        linha = []
        for p in c.anel(x):
            linha.append(len(V))
            V.append(p)
        idx.append(linha)
    iProa = None
    if c.proaPonto:
        iProa = len(V)
        V.append((c.LOA, 0.0, c.est[-1]['niveis'][0][1]))

    out = idx[0]
    cen = [out[0]]
    for j in range(1, NZ):
        cen.append(len(V))
        V.append((V[out[0]][0], 0.0, V[out[j]][2]))

    if c.quinado:
        cams = [('Fundo', AZUL), ('Costado', GRAFITE), ('Espelho', VERM_BRANA)]
        LESP = 2
        cam = lambda j: 0 if j < c.iQuina else 1
    else:
        cams = [('Casco', GRAFITE), ('Espelho', VERM_BRANA)]
        LESP = 1
        cam = lambda j: 0

    F = []
    for i in range(len(XR) - 1):
        for j in range(NZ - 1):
            F.append(([idx[i][j], idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]], cam(j)))
    if iProa is not None:
        for j in range(NZ - 1):
            F.append(([idx[-1][j], iProa, idx[-1][j + 1]], cam(j)))
    F.append(([cen[0], out[1], cen[1]], LESP))
    for j in range(1, NZ - 1):
        F.append(([cen[j], out[j], out[j + 1], cen[j + 1]], LESP))

    if _volume(V, F) < 0:
        F = [(list(reversed(i)), l) for i, l in F]

    uso = collections.Counter()
    for ii, _ in F:
        for k in range(len(ii)):
            a, b = ii[k], ii[(k + 1) % len(ii)]
            uso[(min(a, b), max(a, b))] += 1

    quina = set()
    for j in range(NZ - 1):
        a, b = out[j], out[j + 1]
        quina.add((min(a, b), max(a, b)))
    if c.iQuina is not None:
        K = c.iQuina
        for i in range(len(XR) - 1):
            a, b = idx[i][K], idx[i + 1][K]
            quina.add((min(a, b), max(a, b)))
        if iProa is not None:
            a, b = idx[-1][K], iProa
            quina.add((min(a, b), max(a, b)))

    E = [(a, b, 1 if (uso[(a, b)] == 1 or (a, b) in quina) else 0) for (a, b) in sorted(uso)]
    ncre = collections.Counter()
    for a, b, cr in E:
        if cr:
            ncre[a] += 1
            ncre[b] += 1
    TIPO = [VT_REGULAR if ncre[i] < 2 else (VT_CREASE if ncre[i] == 2 else VT_CORNER)
            for i in range(len(V))]
    return dict(V=V, E=E, F=F, idx=idx, out=out, cen=cen, XR=XR, NZ=NZ, uso=uso,
                quina=quina, iProa=iProa, LESP=LESP, cams=cams, TIPO=TIPO,
                vol=_volume(V, F) / 1e9)


# ============================== gravacao ==============================

def gravar(g):
    o = bytearray()
    i32 = lambda v: o.extend(struct.pack('<i', v))
    f32 = lambda v: o.extend(struct.pack('<f', v))
    i32(len(IDENT)); o.extend(IDENT); i32(VERSAO); i32(0)
    i32(len(g['cams']))
    for k, (nome, cor) in enumerate(g['cams']):
        b = nome.encode('latin-1')
        i32(len(b)); o.extend(b); i32(k)
        o.extend(bytes(list(cor) + [0])); o.extend(bytes([1] * 5))
        f32(0.55); f32(6.0); o.append(1); i32(255)
    i32(len(g['V']))
    for i, (x, y, z) in enumerate(g['V']):
        f32(x / 1000.0); f32(y / 1000.0); f32(z / 1000.0)
        o.append(g['TIPO'][i]); o.extend(b'\x00' * 5)
    i32(len(g['E']))
    for a, b, cr in g['E']:
        i32(a); i32(b); o.append(cr)
    i32(len(g['F']))
    for ii, ic in g['F']:
        i32(len(ii))
        for i in ii:
            i32(i)
        i32(ic)
    i32(0)
    return bytes(o)


def ler(dados):
    """Releitura, usada so para conferir que o arquivo gerado e coerente."""
    p = [0]
    def i32():
        v = struct.unpack_from('<i', dados, p[0])[0]; p[0] += 4; return v
    def f32():
        v = struct.unpack_from('<f', dados, p[0])[0]; p[0] += 4; return v
    def raw(n):
        v = dados[p[0]:p[0] + n]; p[0] += n; return v
    if raw(i32()) != IDENT:
        raise Erro('identificador do arquivo gerado esta errado')
    if i32() != VERSAO:
        raise Erro('versao do arquivo gerado esta errada')
    i32()
    cams = []
    for _ in range(i32()):
        nome = raw(i32()).decode('latin-1'); i32(); raw(4); raw(5); f32(); f32()
        raw(1); i32()
        cams.append(nome)
    pts = [(f32(), f32(), f32(), raw(1)[0], raw(5)) for _ in range(i32())]
    arr = [(i32(), i32(), raw(1)[0]) for _ in range(i32())]
    fcs = []
    for _ in range(i32()):
        n = i32(); fcs.append(([i32() for _ in range(n)], i32()))
    i32()
    if p[0] != len(dados):
        raise Erro('o arquivo gerado tem %d bytes sobrando' % (len(dados) - p[0]))
    return cams, pts, arr, fcs


# ============================== conferencias ==============================

def conferir(c, g, dados):
    """-> lista de (ok, mensagem). Falha alguma => o arquivo nao deve ser entregue."""
    R = []
    ok = lambda cond, m: R.append((bool(cond), m))
    V, E, F, uso = g['V'], g['E'], g['F'], g['uso']

    cams, pts, arr, fcs = ler(dados)
    ok(gravar(g) == dados, 'o arquivo rele e regrava identico a si mesmo')
    ok(len(pts) == len(V) and len(arr) == len(E) and len(fcs) == len(F),
       'contagens preservadas: %d pontos, %d arestas, %d faces' % (len(V), len(E), len(F)))
    ok(len(V) - len(E) + len(F) == 1,
       'Euler de um disco: %d - %d + %d = 1' % (len(V), len(E), len(F)))
    ok(all(n in (1, 2) for n in uso.values()), 'nenhuma aresta em mais de 2 faces')
    ok(all(len(set(f[0])) == len(f[0]) for f in F), 'nenhuma face degenerada')

    d = collections.Counter()
    for ii, _ in F:
        for k in range(len(ii)):
            d[(ii[k], ii[(k + 1) % len(ii)])] += 1
    ok(all(v == 1 for v in d.values()), 'orientacao coerente entre faces vizinhas')
    ok(g['vol'] > 0, 'normais para fora: volume %.4f m3' % g['vol'])

    XR = g['XR']
    ar = lambda a: sum((a[j][1] + a[j + 1][1]) / 2 * (a[j + 1][2] - a[j][2])
                       for j in range(len(a) - 1))
    A = [ar(c.anel(x)) for x in XR]
    vs = sum((A[i] + A[i + 1]) / 2 * (XR[i + 1] - XR[i]) for i in range(len(XR) - 1))
    if g['iProa'] is not None:
        vs += A[-1] * (c.LOA - XR[-1]) / 3
    vs /= 1e9
    err = abs(g['vol'] - vs) / vs * 100 if vs else 99
    ok(err < 1.0, 'volume da malha x areas de baliza: erro %.3f%%' % err)

    out, NZ = g['out'], g['NZ']
    esp = [f for f in F if f[1] == g['LESP']]
    x0 = V[out[0]][0]
    ok(all(abs(V[i][0] - x0) < 1e-9 for f in esp for i in f[0]),
       'espelho todo no plano da baliza 1')
    aF = 0.0
    for ii, _ in esp:
        s = sum(V[ii[k]][1] * V[ii[(k + 1) % len(ii)]][2] -
                V[ii[(k + 1) % len(ii)]][1] * V[ii[k]][2] for k in range(len(ii)))
        aF += abs(s) / 2
    aE = sum((V[out[j]][1] + V[out[j + 1]][1]) / 2 * (V[out[j + 1]][2] - V[out[j]][2])
             for j in range(NZ - 1))
    ok(aE > 0 and abs(aF - aE) / aE < 1e-9,
       'espelho sem furo: %.4f m2 = integral do contorno' % (aF / 1e6))

    cont = [k for k in uso if uso[k] == 1]
    ok(all(cr == 1 for a, b, cr in E if uso[(a, b)] == 1), 'todo contorno marcado crease')
    ok(all(cr == 1 for a, b, cr in E if (a, b) in g['quina']), 'toda quina marcada crease')
    ncre = sum(1 for _, _, cr in E if cr)
    ok(ncre == len(set(cont) | g['quina']),
       'crease so onde deve: %d arestas (contorno %d + quinas %d)'
       % (ncre, len(cont), len(g['quina'])))

    ok(all(any(abs(x - e['x']) < 1e-6 for x in XR) or
           (c.proaPonto and abs(e['x'] - c.LOA) < 1e-6) for e in c.est),
       'toda baliza da tabela cai exatamente sobre um anel')
    ymax = max(max(y for y, _ in e['niveis']) for e in c.est)
    ok(abs(max(y for _, y, _ in V) - ymax) < 1e-6,
       'meia-boca maxima preservada: %.1f mm' % ymax)
    ok(min(x for x, _, _ in V) >= -1e-9 and max(x for x, _, _ in V) <= c.LOA + 1e-9,
       'tudo dentro de 0..LOA (%.1f mm)' % c.LOA)
    if c.iQuina is not None:
        ok(all(abs(V[g['idx'][i][c.iQuina]][1] - max(0.0, c.fy[1](XR[i]))) < 1e-6
               for i in range(len(XR))),
           'a linha do chine passa pelas meias-bocas de chine da tabela')
    return R
