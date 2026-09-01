#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Monta o painel de plano vélico da Brana a partir de uma tabela de cotas.

    python scripts/montar.py --nome "Ana Ribeiro" --cotas cotas.txt

Um comando resolve tudo: lê a tabela, descobre o formato, converte se
precisar, acerta a unidade, embute no modelo do painel e escreve o HTML.
Não precisa de rede, nem de biblioteca de terceiros, nem que o agente leia
o modelo — que tem 400 KB e faria a conversa engordar sem nenhum proveito.

Formatos de tabela aceitos (detectados sozinho):

  1. BALIZAS, bojo redondo:  baliza x altura_quilha altura_borda mb... meia_boca_borda
  2. BALIZAS, casco quinado: stn x sheer_hb chine_hb sheer_ht chine_ht keel_ht
  3. LINHAS D'ÁGUA (exportação estilo DELFTship/FREE!ship): cabeçalho com
     "Number of waterlines / stations", uma linha por baliza com as meias-bocas
     em cada linha d'água, e os contornos de popa e de proa em linhas soltas.

O formato 3 é convertido para o 1, que é o que o painel lê.
"""
import argparse
import io
import os
import re
import shutil
import sys
import unicodedata

MARCA_COTAS = '@@COTAS@@'
MARCA_NOME = '@@NOME@@'
TAB = chr(9)
NF = 7                       # meias-bocas intermediárias geradas na conversão


# ====================================================================
# leitura crua
# ====================================================================
def le_texto(caminho):
    if caminho == '-':
        dado = sys.stdin.buffer.read()
    else:
        if not os.path.exists(caminho):
            raise SystemExit('erro: nao achei a tabela de cotas em %s' % caminho)
        if os.path.isdir(caminho):
            raise SystemExit('erro: %s e uma pasta; --cotas quer o arquivo da tabela' % caminho)
        try:
            with open(caminho, 'rb') as f:
                dado = f.read()
        except OSError as e:
            raise SystemExit('erro: nao consegui ler %s (%s)' % (caminho, e))
    for cod in ('utf-8-sig', 'utf-8', 'cp1252', 'latin-1'):
        try:
            return dado.decode(cod)
        except UnicodeDecodeError:
            continue
    return dado.decode('latin-1', 'replace')


def csv_mesmo(txt):
    """A vírgula é ambígua: pode ser separador de campo (planilha exportada em
       CSV) ou separador decimal (teclado brasileiro). Quem decide é a companhia:
       CSV de verdade traz muitas vírgulas E pontos decimais; tabela com vírgula
       decimal traz vírgulas e nenhum ponto."""
    corpo = '\n'.join(l for l in txt.splitlines() if l.strip() and not l.strip().startswith('#'))
    return corpo.count(',') >= 4 and corpo.count('.') >= 1


def campos(linha, csv=False):
    sep = r'[\s;,]+' if csv else r'[\s;]+'
    return [c for c in re.split(sep, linha.strip()) if c]


def para_numero(t):
    """aceita 1234.5, 1234,5 e 1.234,5"""
    t = t.strip()
    if ',' in t:
        t = t.replace('.', '').replace(',', '.') if t.count(',') == 1 and t.rfind(',') > t.rfind('.') \
            else t.replace(',', '')
    return float(t)


def numeros(linha, csv=False):
    """os números de uma linha, parando no comentário // do formato 3"""
    out = []
    for t in campos(linha.split('//')[0], csv):
        try:
            out.append(para_numero(t))
        except ValueError:
            pass
    return out


# ====================================================================
# formato
# ====================================================================
def detecta_formato(txt):
    baixo = txt.lower()
    if 'waterline' in baixo and 'station' in baixo:
        return 'linhas_dagua'
    # sem os comentários do cabeçalho: dez linhas de um número só no começo
    solt = 0
    for l in txt.splitlines():
        n = numeros(l)
        if not n:
            continue
        if len(n) == 1:
            solt += 1
            if solt >= 8:
                return 'linhas_dagua'
        else:
            break
    return 'balizas'


# ====================================================================
# formato 3 -> formato 1
# ====================================================================
def converte_linhas_dagua(txt):
    """Cada linha de baliza traz x, as meias-bocas em cada linha d'água e, se o
       cabeçalho pedir, a altura e a meia-boca do convés e a altura do fundo.
       As linhas soltas de contorno dão o x onde o casco termina em cada linha
       d'água — é com elas que se fecham o espelho de popa e o talha-mar, que
       ficam fora da grade de balizas."""
    linhas = txt.splitlines()

    cab = []
    for l in linhas:
        n = numeros(l)
        if len(n) == 1:
            cab.append(n[0])
        elif n:
            break
    if len(cab) < 10:
        raise SystemExit('erro: cabecalho do formato de linhas d agua incompleto '
                         '(esperava 10 valores, achei %d)' % len(cab))

    nWL, nST = int(cab[0]), int(cab[1])
    fDeck, fCont, fPopa, fProa, fFlat = [int(round(v)) for v in cab[2:7]]
    LOA_dec, BOCA_dec, CAL_dec = cab[7], cab[8], cab[9]

    blocos = [numeros(l) for l in linhas if len(numeros(l)) > 1]
    if not blocos:
        raise SystemExit('erro: nao achei os blocos de numeros da tabela')

    k = 0
    wl = blocos[k]
    k += 1
    if len(wl) != nWL:
        raise SystemExit('erro: a linha das alturas de linha d agua tem %d valores, '
                         'o cabecalho declara %d' % (len(wl), nWL))
    popa = None
    if fPopa:
        popa = blocos[k]
        k += 1
    balizas = blocos[k:k + nST]
    k += nST
    proa = None
    if fProa:
        proa = blocos[k] if k < len(blocos) else None
        k += 1

    if len(balizas) != nST:
        raise SystemExit('erro: achei %d balizas, o cabecalho declara %d'
                         % (len(balizas), nST))
    extra = (2 if fDeck else 0) + (1 if fCont else 0)
    for b in balizas:
        if len(b) != 1 + nWL + extra:
            raise SystemExit('erro: a baliza em x=%s tem %d numeros; com %d linhas d agua '
                             'e as opcoes do cabecalho, o esperado era %d'
                             % (b[0], len(b), nWL, 1 + nWL + extra))

    est = []
    for b in balizas:
        x = b[0]
        ys = b[1:1 + nWL]
        p = 1 + nWL
        zConv = b[p] if fDeck else None
        yConv = b[p + 1] if fDeck else None
        zFundo = b[p + (2 if fDeck else 0)] if fCont else None

        uteis = [(wl[i], ys[i]) for i in range(nWL) if ys[i] > 1e-9]
        if not uteis:
            continue                                  # baliza sem casco: fora
        if zConv is None:                             # sem deckline: o topo é a borda
            zConv, yConv = uteis[-1]
        if zFundo is None:                            # sem contorno: pouco abaixo do 1º ponto
            passo = (wl[1] - wl[0]) if nWL > 1 else 0.1
            zFundo = max(0.0, uteis[0][0] - passo*0.5)

        pts = [(zFundo, 0.0)]
        for z, y in uteis:
            if zFundo + 1e-9 < z < zConv - 1e-9:
                pts.append((z, y))
        pts.append((zConv, yConv))
        pts.sort()
        limpo = []
        for z, y in pts:
            if limpo and abs(z - limpo[-1][0]) < 1e-9:
                limpo[-1] = (z, max(y, limpo[-1][1]))
            else:
                limpo.append((z, y))
        est.append({'x': x, 'zk': zFundo, 'zs': zConv, 'ys': yConv, 'pts': limpo})

    if len(est) < 3:
        raise SystemExit('erro: sobraram %d balizas com casco' % len(est))
    est.sort(key=lambda e: e['x'])

    def meiaBoca(e, z):
        p = e['pts']
        if z <= p[0][0]:
            return p[0][1]
        if z >= p[-1][0]:
            return p[-1][1]
        for j in range(1, len(p)):
            if z <= p[j][0]:
                z0, y0 = p[j - 1]
                z1, y1 = p[j]
                return y0 + (y1 - y0)*(z - z0)/max(1e-9, z1 - z0)
        return p[-1][1]

    frac = [(i + 1.0)/(NF + 1) for i in range(NF)]

    def mids(e):
        return [meiaBoca(e, e['zk'] + f*(e['zs'] - e['zk'])) for f in frac]

    saida = []
    notas = []

    # espelho de popa: a altura do fundo vem do contorno de popa (onde ele
    # chega a x=0); convés e meias-bocas saem da extrapolação das duas
    # primeiras balizas, que é como se fecha um espelho só com balizas
    if popa:
        zPopa = None
        for i in range(nWL):
            if popa[i] <= 1e-9:
                zPopa = wl[i]
                break
        if zPopa is not None and est[0]['x'] > 1e-9:
            e1, e2 = est[0], est[1]
            def ex(v1, v2):
                return v1 + (v2 - v1)*(0.0 - e1['x'])/(e2['x'] - e1['x'])
            m1, m2 = mids(e1), mids(e2)
            saida.append({'x': 0.0, 'zk': zPopa,
                          'zs': ex(e1['zs'], e2['zs']),
                          'mids': [max(0.0, ex(m1[i], m2[i])) for i in range(NF)],
                          'ys': max(0.02, ex(e1['ys'], e2['ys']))})
            notas.append('espelho de popa fechado em x=0, fundo a %.3f' % zPopa)

    for e in est:
        saida.append({'x': e['x'], 'zk': e['zk'], 'zs': e['zs'],
                      'mids': mids(e), 'ys': e['ys']})

    # talha-mar: o topo do contorno de proa, onde o casco termina em ponta
    if proa:
        xProa, zProa = proa[-1], wl[-1]
        if xProa > est[-1]['x'] + 1e-9:
            saida.append({'x': xProa, 'zk': zProa,
                          'zs': max(zProa, est[-1]['zs']),
                          'mids': [0.0]*NF, 'ys': 0.0})
            notas.append('talha-mar fechado em x=%.3f, topo a %.3f' % (xProa, zProa))

    info = {'origem': "linhas d'agua (%d linhas x %d balizas)" % (nWL, nST),
            'notas': notas,
            'declarado': (LOA_dec, BOCA_dec, CAL_dec),
            'wl': wl}
    return saida, info


# ====================================================================
# formato 1 e 2: passam direto, só conferidos
# ====================================================================
def le_balizas(txt):
    """Formatos 1 e 2. A tabela e normalizada aqui: tabulacao como separador e
       ponto decimal. Assim entram planilha exportada em CSV, ponto-e-virgula e
       virgula decimal, e o painel sempre recebe a mesma coisa."""
    csv = csv_mesmo(txt)
    coment, cabecalho, dados, perdidas = [], None, [], []
    for l in txt.splitlines():
        s2 = l.strip()
        if not s2:
            continue
        if s2.startswith('#'):
            coment.append(s2)
            continue
        c = campos(s2, csv)
        if len(c) < 5:
            if len(numeros(s2, csv)) >= 2:
                perdidas.append(s2)
            continue
        try:
            dados.append([para_numero(v) for v in c])
        except ValueError:
            if cabecalho is None:
                cabecalho = c
            continue
    if perdidas:
        raise SystemExit('erro: esta linha tem numeros mas menos de 5 colunas, entao nao e '
                         'uma baliza inteira nem um comentario: %s' % perdidas[0])
    if len(dados) < 3:
        raise SystemExit('erro: preciso de ao menos 3 balizas na tabela; achei %d. '
                         'Confira o separador de colunas e veja references/formatos-tabela.md'
                         % len(dados))
    ncols = sorted(set(len(d) for d in dados))
    if len(ncols) > 1:
        raise SystemExit('erro: as balizas tem numeros de colunas diferentes (%s). '
                         'Falta ou sobra um campo em alguma delas; se a tabela e por linhas '
                         'd agua, confira o cabecalho. Veja references/formatos-tabela.md'
                         % ', '.join(str(n) for n in ncols))
    n = ncols[0]
    dados.sort(key=lambda d: d[1])
    for i in range(1, len(dados)):
        if abs(dados[i][1] - dados[i-1][1]) < 1e-9:
            raise SystemExit('erro: duas balizas na mesma posicao x = %g' % dados[i][1])

    # Bojo redondo e casco quinado podem ter as mesmas 7 colunas, entao o formato
    # se descobre pelo cabecalho e, na falta dele, pela forma da primeira baliza.
    # A regra e a MESMA do painel (detectFormat), de proposito: se as duas
    # discordassem, o relatorio falaria de um casco e o painel desenharia outro.
    # Aqui isso decide duas coisas: o rotulo do relatorio e de qual coluna sai a
    # boca — a ultima no bojo redondo, a terceira no quinado, onde a ultima e uma
    # altura de quilha.
    cab = ' '.join(cabecalho or []).lower()
    d0 = dados[0]
    if re.search(r'altura_quilha|altura de quilha|mb_|meia_boca|meia-boca|baliza', cab):
        quinado = False
    elif re.search(r'sheer_hb|chine_hb|keel_ht|deadrise|chine', cab):
        quinado = True
    else:
        subindo = (len(d0) >= 8 and d0[4] <= d0[5] + 1e-6
                   and d0[5] <= d0[6] + 1e-6 and d0[6] <= d0[7] + 1e-6)
        quinado = (d0[2] > d0[3]) and not (d0[2] < d0[3] and subindo)
    tipo = 'casco quinado' if quinado else 'bojo redondo'
    if not cab:
        tipo += ' (deduzido da forma da baliza: sem cabecalho na tabela)'
    if csv:
        tipo += ', separado por virgula'

    linha_dagua = None
    for c in coment:
        m = re.search(r'linha[ _]?d.?agua\s*[:=]?\s*([-+]?[\d.,]+)', c, re.I)
        if m:
            try:
                linha_dagua = para_numero(m.group(1))
            except ValueError:
                pass
    return ({'coment': coment, 'cabecalho': cabecalho, 'dados': dados},
            {'origem': 'balizas, %s (%d colunas, %d balizas)' % (tipo, n, len(dados)),
             'notas': [], 'declarado': None, 'zw': linha_dagua, 'quinado': quinado})


# ====================================================================
# unidades
# ====================================================================
def escala(saida, info):
    """A tabela do painel e em milimetros. Exportacao em metros e o engano mais
       comum, e daria um barco de 12 mm — entao o tamanho e conferido aqui."""
    xs = [e['x'] for e in saida]
    if not xs:
        return 1.0
    loa = max(xs) - min(xs)
    if loa <= 0:
        raise SystemExit('erro: todas as balizas estao no mesmo x')
    if loa < 120:                                    # nenhum barco tem 12 cm
        for e in saida:
            for k in ('x', 'zk', 'zs', 'ys'):
                e[k] *= 1000.0
            e['mids'] = [v*1000.0 for v in e['mids']]
        info['notas'].append('tabela em metros: multipliquei tudo por 1000')
        return 1000.0
    return 1.0


def normaliza_balizas(pack, info):
    """escreve a tabela de volta em tabulacao e ponto decimal, na escala certa"""
    dados = pack['dados']
    xs = [d[1] for d in dados]
    k = 1.0
    if (max(xs) - min(xs)) < 120:
        k = 1000.0
        info['notas'].append('tabela em metros: multipliquei tudo por 1000')
    out = list(pack['coment'])
    if info.get('zw') and k != 1.0:
        out = [c for c in out if 'linha_dagua' not in c.lower()]
        out.append('# linha_dagua %.0f' % (info['zw']*k))
    if pack['cabecalho']:
        out.append(TAB.join(pack['cabecalho']))
    for i, d in enumerate(dados):
        v = ['%d' % round(d[0]) if abs(d[0] - round(d[0])) < 1e-9 else '%g' % d[0]]
        v += ['%.1f' % (x*k) for x in d[1:]]
        out.append(TAB.join(v))
    return out


# ====================================================================
# saída
# ====================================================================
def linhas_tsv(saida, info):
    frac = [(i + 1.0)/(NF + 1) for i in range(NF)]
    out = []
    out.append('# Tabela de cotas convertida de %s.' % info['origem'])
    out.append('# Alturas acima da linha de base, meias-bocas a partir da linha de')
    out.append('# centro, em milimetros. Baliza 1 = popa.')
    for nota in info['notas']:
        out.append('# %s' % nota)
    if info.get('zw'):
        out.append('#')
        out.append('# linha_dagua %.0f   <- flutuacao de projeto declarada na origem'
                   % info['zw'])
    out.append('\t'.join(['baliza', 'x', 'altura_quilha', 'altura_borda'] +
                         ['mb_%dpc' % round(f*100) for f in frac] +
                         ['meia_boca_borda']))
    for i, e in enumerate(saida):
        v = ['%d' % (i + 1), '%.1f' % e['x'], '%.1f' % e['zk'], '%.1f' % e['zs']]
        v += ['%.1f' % m for m in e['mids']]
        v += ['%.1f' % e['ys']]
        out.append('\t'.join(v))
    return out


def literal_js(linhas):
    """A tabela vira literal de JavaScript DENTRO de um bloco <script>. Além dos
       escapes de string, o '<' tem de sair de cena: o analisador de HTML fecha o
       bloco no primeiro '</script', mesmo dentro de uma string — bastaria um
       comentário com '</script>' na tabela para matar o painel inteiro. Escrito
       como \\x3c, o JavaScript lê o mesmo caractere e o HTML não vê nada."""
    corpo = []
    for l in linhas:
        t = l.replace('\\', '\\\\').replace("'", "\\'").replace('\t', '\\t')
        t = t.replace('<', '\\x3c')
        corpo.append("  '" + t + "'")
    return '[\n' + ',\n'.join(corpo) + "\n].join('\\n')"


def nome_limpo(n):
    """O nome entra em texto HTML, em literal de JavaScript e em string de PDF.
       Em vez de escapar para cada destino, tira-se o que pode quebrar qualquer
       um deles — e as aspas viram tipográficas, que são inofensivas. O que for
       mexido é relatado, para ninguém descobrir depois que o nome saiu diferente
       no rodapé do painel."""
    bruto = unicodedata.normalize('NFC', str(n)).strip()
    n = bruto.replace("'", '\u2019').replace('"', '\u201d')
    tirados = sorted(set(re.findall(r'[\\<>&(){}\[\]/|*?:;=$`@#%^~+]', n)))
    n = re.sub(r'[\\<>&(){}\[\]/|*?:;=$`@#%^~+]', ' ', n)
    n = re.sub(r'[\x00-\x1f\x7f]', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    if not n:
        raise SystemExit('erro: o nome ficou vazio depois de limpo')
    notas = []
    if tirados:
        notas.append('tirei %s do nome' % ' '.join(tirados))
    if len(n) > 60:
        corte = n[:60].rsplit(' ', 1)[0] or n[:60]
        n = corte
        notas.append('cortei o nome em %d caracteres' % len(n))
    return n, notas


def nome_arquivo(n):
    n = n.replace('\u2019', '').replace('\u201d', '')
    n = re.sub(r'[<>:"/\\|?*]', '', n).strip(' .')
    return 'Plano Velico - %s.html' % (n or 'sem nome')


DRIVER = """
/* Roda o motor do painel sem tela, so para o relatorio trazer os mesmos numeros
   que o painel vai mostrar. Nao ha segunda implementacao de nada: e o proprio
   arquivo gerado, com o desenho e a interface desligados por falta de DOM. */
var document = { readyState:'loading', addEventListener:function(){},
                 getElementById:function(){ return null; },
                 querySelectorAll:function(){ return []; },
                 createElement:function(){ return { style:{}, appendChild:function(){},
                                                    setAttribute:function(){} }; },
                 documentElement:{}, body:{ appendChild:function(){}, removeChild:function(){} } };
var window = { addEventListener:function(){}, devicePixelRatio:1 };
function getComputedStyle(){ return { getPropertyValue:function(){ return ''; } }; }
__PAINEL__
try{
  HULL = makeHull(parseOffsets(USER_TSV));
  buildCache(HULL, 200, 26);
  ST.casco = 'user'; TSV_ATUAL = USER_TSV;
  ST.ballast = false; ST.prog = 'cruise';
  ST.keel = 'center'; ST.rud = 'spade';
  defaultsForHull();
  abreNoCasco();
  recompute();
  var K = (APP.keel && !APP.keel.embedded) ? APP.keel.area : 0;
  console.log('@@JSON@@' + JSON.stringify({
    disp: H.disp, T: H.T, Lwl: H.Lwl, Bwl: H.Bwl, Sw: H.Sw, Alat: H.Alat,
    Cp: H.Cp, Cm: H.Cm, Cb: H.Cb,
    keel: KEEL[ST.keel].label, rud: RUD[ST.rud].label, prog: PROG[ST.prog].label,
    rig: RIGS[ST.rig].label, main: MAINK[ST.mainK].label,
    SAnom: RIG.SAnom, k: EST.kReal, saSw: RIG.SAnom/Math.max(1e-6, H.Sw),
    Ak: K, Ar: APP.rudder.area, calado: APP.draftTotal,
    lead: BAL.leadPct, faixa: [BAL.band.lo, BAL.band.hi],
    dell: BAL.dell, GM: BAL.bal.GM, avs: GZC.stats.vanish
  }));
}catch(e){ console.log('@@ERRO@@' + (e && e.message ? e.message : e)); }
"""


def numeros_do_painel(html):
    """Extrai os blocos de script do painel pronto e roda o motor em node, se
       node existir. Nao e obrigatorio: sem node o relatorio so nao traz os
       numeros, e o painel continua igual."""
    import json
    import subprocess
    import tempfile
    if not shutil.which('node'):
        return None, 'node nao encontrado'
    blocos = re.findall(r'<script>(.*?)</script>', html, re.S)
    if len(blocos) < 2:
        return None, 'nao achei os blocos de script no painel'
    js = DRIVER.replace('__PAINEL__', '\n'.join(blocos))
    d = tempfile.mkdtemp(prefix='planovelico-')
    try:
        f = os.path.join(d, 'motor.js')
        io.open(f, 'w', encoding='utf-8').write(js)
        p = subprocess.run(['node', f], capture_output=True, timeout=60)
        saida = (p.stdout or b'').decode('utf-8', 'replace')
        for l in saida.splitlines():
            if l.startswith('@@JSON@@'):
                return json.loads(l[len('@@JSON@@'):]), None
            if l.startswith('@@ERRO@@'):
                return None, l[len('@@ERRO@@'):]
        return None, ((p.stderr or b'').decode('utf-8', 'replace').strip().splitlines() or ['node nao disse nada'])[-1][:120]
    except Exception as e:
        return None, str(e)[:120]
    finally:
        shutil.rmtree(d, ignore_errors=True)


def num(v, casas=1):
    return ('%.*f' % (casas, v)) if isinstance(v, (int, float)) else '-'


# ====================================================================
def main():
    ap = argparse.ArgumentParser(
        description='Monta o painel de plano velico da Brana a partir de uma tabela de cotas.')
    ap.add_argument('--nome', required=True,
                    help='nome de quem esta usando a skill; vai no arquivo e na legenda')
    ap.add_argument('--cotas', required=True,
                    help='arquivo da tabela de cotas, ou - para ler da entrada padrao')
    ap.add_argument('--saida', default='.',
                    help='pasta de destino, ou o caminho completo do .html')
    a = ap.parse_args()

    aqui = os.path.dirname(os.path.abspath(__file__))
    modelo = os.path.join(os.path.dirname(aqui), 'assets', 'painel-modelo.html')
    if not os.path.isfile(modelo):
        raise SystemExit('erro: nao achei o modelo do painel em %s' % modelo)

    nome, ajustes = nome_limpo(a.nome)
    txt = le_texto(a.cotas)
    if not txt.strip():
        raise SystemExit('erro: a tabela de cotas esta vazia')

    formato = detecta_formato(txt)
    if formato == 'linhas_dagua':
        saida, info = converte_linhas_dagua(txt)
        k = escala(saida, info)
        cal = (info.get('declarado') or (None, None, None))[2]
        info['zw'] = (cal*k) if cal else None      # na mesma escala das cotas
        tsv = linhas_tsv(saida, info)
        nbal = len(saida)
        xs = [e['x'] for e in saida]
        boca = 2*max(e['ys'] for e in saida)
    else:
        pack, info = le_balizas(txt)
        tsv = normaliza_balizas(pack, info)
        esc = 1000.0 if any('metros' in x for x in info['notas']) else 1.0
        nbal = len(pack['dados'])
        xs = [d[1]*esc for d in pack['dados']]
        # a meia-boca da borda e a ultima coluna no bojo redondo, mas a TERCEIRA
        # no casco quinado (stn x sheer_hb chine_hb sheer_ht chine_ht keel_ht) —
        # tomar sempre a ultima faria a 'boca' sair de uma altura de quilha
        col = 2 if info.get('quinado') else -1
        boca = 2*max(d[col] for d in pack['dados'])*esc

    html = io.open(modelo, encoding='utf-8').read()
    if MARCA_COTAS not in html or MARCA_NOME not in html:
        raise SystemExit('erro: o modelo do painel esta sem os marcadores; nao mexa nele')
    html = html.replace(MARCA_COTAS, literal_js(tsv)).replace(MARCA_NOME, nome)

    dst = a.saida
    if dst.lower().endswith('.html'):
        pasta = os.path.dirname(os.path.abspath(dst)) or '.'
    else:
        pasta = os.path.abspath(dst)
        dst = os.path.join(pasta, nome_arquivo(nome))
    try:
        if not os.path.isdir(pasta):
            os.makedirs(pasta)
        with io.open(dst, 'w', encoding='utf-8') as f:
            f.write(html)
    except OSError as e:
        raise SystemExit('erro: nao consegui escrever em %s (%s). Tente um --saida mais curto '
                         'ou com permissao de escrita.' % (dst, e))

    loa = (max(xs) - min(xs))/1000.0
    print('formato       %s' % info['origem'])
    for nota in info['notas']:
        print('              %s' % nota)
    if loa < 2.0 or loa > 120.0:
        # não é erro: barco de 1,80 m existe. Mas quase sempre é unidade errada —
        # tabela em centímetros ou em polegadas passa por aqui sem tropeçar em nada.
        print('ATENCAO       o casco saiu com %.3f m de comprimento; confira a unidade da '
              'tabela (o painel quer milimetros)' % loa)
    print('casco         LOA %.3f m | boca max %.3f m | %d balizas'
          % (loa, boca/1000.0, nbal))
    zw = info.get('zw')
    print("linha d'agua  %s" % ('%.0f mm, declarada na tabela' % zw if zw else
                                'nao declarada: o painel abre no calado da esbeltez do programa'))
    print('projetista    %s%s' % (nome, ('  (%s)' % '; '.join(ajustes)) if ajustes else ''))
    print('saida         %s (%.0f KB)' % (dst, os.path.getsize(dst)/1024.0))

    # Os numeros de abertura do painel, tirados do proprio motor dele. Servem
    # para responder ao usuario sem abrir o arquivo de 400 KB.
    dados, falha = numeros_do_painel(html)
    if dados:
        print('')
        print('o painel abre assim (numeros do motor do proprio painel):')
        print('  casco        Delta %s kg | calado do casco %s m | Cp %s | Cb %s'
              % (num(dados['disp'], 0), num(dados['T'], 3), num(dados['Cp'], 3), num(dados['Cb'], 3)))
        print('  apendices    %s | quilha %s m2 | leme %s m2 | calado total %s m'
              % (dados['keel'], num(dados['Ak'], 3), num(dados['Ar'], 3), num(dados['calado'], 2)))
        print('  pano         %s m2 nominais (k %s, SA/Sw %s) | %s, %s'
              % (num(dados['SAnom'], 1), num(dados['k'], 1), num(dados['saSw'], 2),
                 dados['rig'], dados['main']))
        print('  equilibrio   lead %s%% (faixa %s a %s) | Dellenbaugh %s | GM %s m | AVS %s'
              % (num(dados['lead'], 1), num(dados['faixa'][0], 0), num(dados['faixa'][1], 0),
                 (num(dados['dell'], 1) + ' graus') if dados['dell'] else '-',
                 num(dados['GM'], 2), (num(dados['avs'], 0) + ' graus') if dados['avs'] else '>180'))
        print('  Tudo isso e ponto de partida: os oito passos existem para o aluno mudar.')
    else:
        print('')
        print('numeros do barco: abra o painel, o passo 1 mostra tudo (%s)' % falha)


if __name__ == '__main__':
    main()
