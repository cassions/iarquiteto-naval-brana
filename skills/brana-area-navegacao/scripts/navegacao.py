# -*- coding: utf-8 -*-
"""Biblioteca da skill brana-area-navegacao.

Reune tudo o que o relatorio precisa e que nao e desenho de pagina:

  - resolucao de locais (nome ou "lat,lon") e derrota loxodromica
  - escolha e recorte das cartas nauticas do CHM, com a derrota tracada
  - leitura do banco de clima nautico (data/clima_nautico_brasil.md)
  - classificacao NORMAM (area de navegacao) e categoria de projeto ISO

Nenhuma funcao aqui imprime nada por conta propria: quem fala com o usuario
e o gerar_relatorio.py.
"""

import math
import os
import re
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
CLIMA_MD = os.path.join(RAIZ, "data", "clima_nautico_brasil.md")
CARTAS_CSV = os.path.join(RAIZ, "data", "cartas_dhn.csv")
TIMBRADO = os.path.join(RAIZ, "assets", "timbrado_brana.pdf")

sys.path.insert(0, AQUI)
import carta as C  # noqa: E402  (decodificador BSB/KAP do acervo do CHM)

R_TERRA_KM = 6371.0088
MN_KM = 1.852


class ErroDeUso(C.ErroDeUso):
    """Erro previsivel, para mostrar ao usuario sem traceback. Herda do erro do
    carta.py para que um unico except pegue os dois."""


def _painel(cand):
    """Abre um painel do acervo; devolve None se o arquivo faltar ou estiver
    corrompido, para que a escolha de carta caia na proxima candidata."""
    try:
        return C.painel_do_indice(cand)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# acervo de cartas
# ---------------------------------------------------------------------------

def abrir_acervo(caminho=None):
    """Aponta o carta.py para o acervo raster e confirma que ele existe."""
    base = C.definir_base(caminho)
    try:
        C.exigir_acervo()
    except C.ErroDeUso as e:
        raise ErroDeUso(str(e))
    if not os.path.isfile(os.path.join(base, "indice.json")):
        raise ErroDeUso(
            "O acervo em %s nao tem indice.json.\n"
            "Rode uma vez:  python \"%s\" --dados \"%s\" indexar"
            % (base, os.path.join(AQUI, "carta.py"), base))
    return base


# ---------------------------------------------------------------------------
# geometria da derrota
# ---------------------------------------------------------------------------

def resolver(texto, indice=None):
    """Aceita "lat,lon", "lat,lon:Rotulo" ou um nome de lugar (geocodificado).
    Devolve (lat, lon, rotulo)."""
    texto = (texto or "").strip()
    if not texto:
        raise ErroDeUso("ponto vazio")
    rotulo_dado = None
    if ":" in texto:
        antes, _, depois = texto.partition(":")
        if re.match(r"^\s*-?\d+(?:[.,]\d+)?\s*[,;]\s*-?\d+(?:[.,]\d+)?\s*$", antes):
            texto, rotulo_dado = antes.strip(), depois.strip() or None
    m = re.match(r"^\s*(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)\s*$", texto)
    if m:
        lat = float(m.group(1).replace(",", "."))
        lon = float(m.group(2).replace(",", "."))
        return (lat, lon, rotulo_dado or "%s / %s" % (gms(lat, "lat"), gms(lon, "lon")))
    if indice is None:
        indice = C.carregar_indice()
    try:
        lat, lon, rotulo = C.resolver_local(texto, indice)
    except C.ErroDeUso as e:
        raise ErroDeUso(str(e))
    return lat, lon, rotulo


def rumo_e_distancia(lat1, lon1, lat2, lon2):
    """Loxodromica: devolve (rumo verdadeiro em graus, distancia em MN)."""
    return C.rumo_e_distancia(lat1, lon1, lat2, lon2)


def pernas(wps, declinacao=None):
    """wps: [(lat, lon, rotulo), ...]. Devolve (lista de pernas, total em MN)."""
    saida, total = [], 0.0
    for i, (a, b) in enumerate(zip(wps, wps[1:]), 1):
        rumo, d = rumo_e_distancia(a[0], a[1], b[0], b[1])
        total += d
        saida.append({
            "n": i, "de": a[2], "para": b[2],
            "lat": a[0], "lon": a[1],
            "rumo_v": rumo,
            "rumo_m": (rumo + declinacao) % 360 if declinacao is not None else None,
            "mn": d, "acumulado": total,
        })
    return saida, total


def declinacao_da_carta(numero_carta, acervo_indice=None):
    """A declinacao magnetica quase nunca vem no cabecalho BSB: ela e impressa
    na rosa desenhada na carta. So devolve valor quando o cabecalho traz um
    campo explicito (MAGVAR/VAR); caso contrario devolve None e o relatorio
    pede para ler a rosa e passar --declinacao."""
    try:
        indice = acervo_indice or C.carregar_indice()
        crt = C.painel_do_indice(C.por_numero(indice, numero_carta)[0])
        bruto = " ".join(" ".join(v) for v in getattr(crt, "bruto", {}).values())
    except Exception:
        return None
    m = re.search(r"(?:MAGVAR|MAG_VAR|VAR)\s*=\s*(-?\d+(?:\.\d+)?)\s*([WE])?",
                  bruto or "", re.I)
    if not m:
        return None
    g = float(m.group(1))
    if m.group(2) and m.group(2).upper() == "E":
        g = -g
    return g


def tempos(total_mn, velocidades):
    """[(nos, km/h, horas, 'XhYY'), ...]"""
    out = []
    for v in velocidades:
        horas = total_mn / float(v)
        inteiro = int(horas)
        minutos = int(round((horas - inteiro) * 60))
        if minutos == 60:
            inteiro, minutos = inteiro + 1, 0
        out.append((v, v * MN_KM, horas, "%d h %02d min" % (inteiro, minutos)))
    return out


def gms(valor, eixo):
    """Grau e minuto decimal, no formato das cartas: 13° 02,7' S"""
    hemi = ("S" if valor < 0 else "N") if eixo == "lat" else ("W" if valor < 0 else "E")
    valor = abs(valor)
    g = int(valor)
    return "%02d° %04.1f' %s" % (g, (valor - g) * 60, hemi)


# ---------------------------------------------------------------------------
# cartas
# ---------------------------------------------------------------------------

def _km_em_pixels(crt, lat, km):
    graus = km / (R_TERRA_KM * math.pi / 180 * math.cos(math.radians(lat)))
    x1, _ = crt.para_pixel(lat, 0.0)
    x2, _ = crt.para_pixel(lat, graus)
    return abs(x2 - x1)


def cartas_que_cobrem(lat, lon, indice=None):
    """Da mais detalhada para a mais geral."""
    return C.cartas_que_cobrem(indice or C.carregar_indice(), lat, lon)


def carta_do_percurso(wps, indice=None):
    """Carta mais detalhada que contem TODOS os pontos da derrota."""
    indice = indice or C.carregar_indice()
    candidatas = C.cartas_que_cobrem(indice, wps[0][0], wps[0][1])
    for cand in candidatas:
        crt = _painel(cand)
        if crt and all(crt.contem(w[0], w[1]) for w in wps):
            return cand
    raise ErroDeUso(
        "Nenhuma carta do acervo cobre a derrota inteira, ou os arquivos das "
        "cartas candidatas faltam no acervo. Confira as coordenadas, rode "
        "scripts/baixar.py para completar o acervo, ou divida a viagem em "
        "duas etapas.")


def carta_para_caixa(ponto, wps, zoom_km, indice=None, minimo=0.55):
    """Escolhe a carta e o recorte de uma ponta da derrota.

    Vai da mais detalhada para a mais geral e fica com a primeira em que cabe,
    inteiro e sem invadir a margem da carta, um recorte centrado no ponto com
    pelo menos `minimo` do lado pedido. Devolve (carta, caixa).
    """
    indice = indice or C.carregar_indice()
    candidatas = C.cartas_que_cobrem(indice, ponto[0], ponto[1])
    if not candidatas:
        raise ErroDeUso(
            "Nenhuma carta do acervo cobre %s. Confira as coordenadas: o ponto "
            "pode estar em terra, longe da costa."
            % (ponto[2] if len(ponto) > 2 else ""))
    lat, lon = ponto[0], ponto[1]
    reserva = None
    for cand in candidatas:
        crt = _painel(cand)
        if crt is None:
            continue
        c_s, c_n, c_o, c_l = crt.limites()   # (lat_min, lat_max, lon_min, lon_max)
        # maior recorte quadrado centrado no ponto que cabe dentro da carta
        folga_km = min((c_n - lat) * 110.574, (lat - c_s) * 110.574,
                       (lon - c_o) * 111.320 * math.cos(math.radians(lat)),
                       (c_l - lon) * 111.320 * math.cos(math.radians(lat)))
        lado = min(zoom_km, max(0.0, folga_km) * 2.0)
        if reserva is None:
            reserva = (cand, lado)
        if lado >= zoom_km * minimo:
            return cand, caixa_de_zoom(lat, lon, wps, lado)
    if reserva is None:
        raise ErroDeUso(
            "As cartas que cobrem %s existem no indice mas os arquivos faltam no "
            "acervo. Rode scripts/baixar.py para completar."
            % (ponto[2] if len(ponto) > 2 else "o ponto"))
    cand, lado = reserva
    return cand, caixa_de_zoom(lat, lon, wps, max(lado, zoom_km * 0.25))


def desenhar(numero, wps, saida, caixa_graus=None, margem_km=9, largura=2000,
             rotulo_a=None, rotulo_b=None, numerar=True, nota=""):
    """Renderiza um recorte da carta com a derrota tracada.

    caixa_graus: (lat_norte, lon_oeste, lat_sul, lon_leste) para recorte fixo;
    sem ela o recorte e a caixa dos pontos mais margem_km de folga.
    Devolve um dicionario com a procedencia da carta.
    """
    from PIL import Image, ImageDraw

    indice = C.carregar_indice()
    crt = _painel(C.por_numero(indice, numero)[0])
    if crt is None:
        raise ErroDeUso("Nao consegui abrir a carta %s do acervo. Rode "
                        "scripts/baixar.py para completar." % numero)
    pix = [crt.para_pixel(w[0], w[1]) for w in wps]

    if caixa_graus:
        ln, ow, ls, oe = caixa_graus
        x0, y0 = crt.para_pixel(ln, ow)
        x1, y1 = crt.para_pixel(ls, oe)
        caixa = (int(min(x0, x1)), int(min(y0, y1)), int(max(x0, x1)), int(max(y0, y1)))
    else:
        xs = [p[0] for p in pix]
        ys = [p[1] for p in pix]
        lat_meio = sum(w[0] for w in wps) / len(wps)
        m = _km_em_pixels(crt, lat_meio, margem_km)
        m = max(m, max(max(xs) - min(xs), max(ys) - min(ys)) * 0.10, 60)
        caixa = (int(min(xs) - m), int(min(ys) - m), int(max(xs) + m), int(max(ys) + m))

    indices, real = crt.decodificar(caixa)
    img = crt.colorir(indices, "padrao")
    pix = [(x - real[0], y - real[1]) for (x, y) in pix]

    # amplia ANTES de desenhar: em carta de escala pequena o recorte rende
    # poucos pixels e os marcadores sairiam desproporcionais.
    if largura and img.size[0] < largura:
        k = largura / float(img.size[0])
        img = img.resize((largura, int(img.size[1] * k)), Image.LANCZOS)
        pix = [(x * k, y * k) for (x, y) in pix]

    d = ImageDraw.Draw(img, "RGBA")
    lw = max(3, int(min(img.size) * 0.005))
    magenta = (190, 0, 160)
    for a, b in zip(pix, pix[1:]):
        C._linha_tracejada(d, a, b, magenta, lw, traco=lw * 7, vao=lw * 4)

    r = max(6, int(min(img.size) * 0.008))
    f = C._fonte(max(16, int(min(img.size) * 0.020)))
    for i, (x, y) in enumerate(pix):
        if i in (0, len(pix) - 1):
            continue
        d.ellipse([x - r, y - r, x + r, y + r], fill=magenta + (255,),
                  outline=(255, 255, 255, 255), width=2)
        if numerar:
            d.text((x + r * 1.6, y - r * 2.2), "P%d" % i, font=f,
                   fill=(120, 0, 100, 255), stroke_width=3,
                   stroke_fill=(255, 255, 255, 220))

    if rotulo_a:
        C._marcar(img, pix[0][0], pix[0][1], rotulo_a, (0, 130, 40),
                  "esquerda" if pix[-1][0] > pix[0][0] else "direita")
    if rotulo_b:
        C._marcar(img, pix[-1][0], pix[-1][1], rotulo_b, (200, 0, 0),
                  "direita" if pix[-1][0] > pix[0][0] else "esquerda")

    if largura and img.size[0] > largura:
        img = img.resize((largura, int(img.size[1] * largura / img.size[0])),
                         Image.LANCZOS)

    img = C._rodape(img, [
        nota or "Derrota aproximada",
        "Carta %s - %s (1:%s) | DHN/CHM - Marinha do Brasil | %s | ed. %s | "
        "ultimo aviso %s | derrota ilustrativa - NAO USAR PARA NAVEGACAO"
        % (crt.numero, crt.titulo, crt.escala or "?", crt.datum,
           crt.edicao or "?", crt.aviso or "?"),
    ])
    os.makedirs(os.path.dirname(os.path.abspath(saida)) or ".", exist_ok=True)
    img.save(saida)
    return {"arquivo": saida, "numero": crt.numero, "titulo": crt.titulo,
            "escala": crt.escala, "edicao": crt.edicao, "aviso": crt.aviso,
            "datum": crt.datum, "residuo_px": round(crt.residuo_px, 2),
            "px": img.size}


def caixa_de_zoom(lat, lon, wps, zoom_km):
    """Caixa geografica de lado ~zoom_km centrada no ponto, esticada o
    suficiente para conter os pontos da derrota que estiverem por perto."""
    meio_lat = zoom_km / 2.0 / 110.574
    meio_lon = zoom_km / 2.0 / (111.320 * math.cos(math.radians(lat)))
    n, s = lat + meio_lat, lat - meio_lat
    o, l = lon - meio_lon, lon + meio_lon
    for w in wps:
        if abs(w[0] - lat) < meio_lat * 1.5 and abs(w[1] - lon) < meio_lon * 1.5:
            n, s = max(n, w[0] + meio_lat * 0.12), min(s, w[0] - meio_lat * 0.12)
            o, l = min(o, w[1] - meio_lon * 0.12), max(l, w[1] + meio_lon * 0.12)
    # nao deixa o recorte esticar demais: no maximo 1,5x o lado pedido
    n = min(n, lat + meio_lat * 1.5)
    s = max(s, lat - meio_lat * 1.5)
    o = max(o, lon - meio_lon * 1.5)
    l = min(l, lon + meio_lon * 1.5)
    return (n, o, s, l)


# ---------------------------------------------------------------------------
# clima nautico
# ---------------------------------------------------------------------------

def _num(txt):
    try:
        return float(str(txt).strip().replace(".", "").replace(",", ".")
                     .replace("%", "").replace("m", "").replace("s", "").strip())
    except Exception:
        return None


def _tabela(bloco, titulo_contem):
    """Le a primeira tabela markdown que vem depois de um trecho de texto."""
    i = bloco.find(titulo_contem)
    if i < 0:
        return []
    linhas = bloco[i:].split("\n")
    tabela, dentro = [], False
    for ln in linhas:
        if ln.startswith("|"):
            dentro = True
            celulas = [c.strip() for c in ln.strip().strip("|").split("|")]
            if all(set(c) <= set("-: ") for c in celulas):
                continue
            tabela.append(celulas)
        elif dentro and ln.strip() == "":
            break
    return tabela


def _lista(bloco, cabecalho):
    i = bloco.find(cabecalho)
    if i < 0:
        return []
    itens = []
    for ln in bloco[i + len(cabecalho):].split("\n"):
        if ln.startswith("#"):
            break
        if ln.strip().startswith("- "):
            itens.append(re.sub(r"\*\*(.+?)\*\*", r"\1", ln.strip()[2:]).strip())
    return itens


def carregar_setores(caminho=None):
    """Le o banco de clima e devolve {codigo: dicionario do setor}."""
    caminho = caminho or CLIMA_MD
    if not os.path.isfile(caminho):
        raise ErroDeUso("Banco de clima nao encontrado em %s" % caminho)
    texto = open(caminho, encoding="utf-8").read()
    partes = re.split(r"^### ([A-Z]{1,2}\d+) — (.+)$", texto, flags=re.M)
    setores = {}
    for k in range(1, len(partes), 3):
        codigo, nome, bloco = partes[k], partes[k + 1].strip(), partes[k + 2]
        p_porto = re.search(r"\*\*Ponto de referência \(porto/canal\):\*\* "
                            r"(-?[\d,\.]+)°, (-?[\d,\.]+)°", bloco)
        p_mar = re.search(r"\*\*Ponto de referência \(mar aberto\):\*\* "
                          r"(-?[\d,\.]+)°, (-?[\d,\.]+)°", bloco)
        metarea = re.search(r"\*\*Área de previsão do CHM \(METAREA V\):\*\* (.+)", bloco)
        melhor = re.search(r"\*\*Melhor época:\*\* (.+)", bloco)
        pior = re.search(r"\*\*Pior época:\*\* (.+)", bloco)
        obs = re.search(r"\*\*Observação operacional:\*\* (.+)", bloco)
        corr = re.search(r"#### Correntes\s+(.+?)\s*\n\s*\n", bloco, re.S)
        sizigia = re.search(r"\*\*Amplitude média de sizígia: ([\d,]+) m\*\*", bloco)
        if not sizigia:
            sizigia = re.search(r"Amplitude de sizígia: \*\*([\d,]+) m\*\*", bloco)
        quadratura = re.search(r"Amplitude média de quadratura: ([\d,]+) m", bloco)
        if not quadratura:
            quadratura = re.search(r"quadratura: ([\d,]+) m", bloco)
        diaria = re.search(r"Amplitude diária média: ([\d,]+) m", bloco)
        max24 = re.search(r"\*\*Amplitude máxima observada em 24 h: ([\d,]+) m\*\*", bloco)
        if not max24:
            max24 = re.search(r"máxima em 24 h: ([\d,]+) m", bloco)
        maregrafo = re.search(r"\*\*Marégrafo de referência: (.+?)\*\*", bloco)
        tipo_mare = re.search(r"Tipo de maré: \*\*(\w+)\*\*", bloco)
        chuva_ano = re.search(r"Total anual médio de \*\*(\d+) mm\*\*", bloco)

        setores[codigo] = {
            "codigo": codigo, "nome": nome,
            "lat": _num(p_porto.group(1)) if p_porto else None,
            "lon": _num(p_porto.group(2)) if p_porto else None,
            "lat_mar": _num(p_mar.group(1)) if p_mar else None,
            "lon_mar": _num(p_mar.group(2)) if p_mar else None,
            "metarea": metarea.group(1).strip() if metarea else None,
            "sistemas": _lista(bloco, "#### Sistemas meteorológicos"),
            "correntes": corr.group(1).strip().replace("\n", " ") if corr else None,
            "alertas": _lista(bloco, "#### Alertas e particularidades náuticas"),
            "melhor_epoca": melhor.group(1).strip() if melhor else None,
            "pior_epoca": pior.group(1).strip() if pior else None,
            "obs_operacional": obs.group(1).strip() if obs else None,
            "vento": _tabela(bloco, "**Vento mês a mês"),
            "ondas": _tabela(bloco, "**Ondas mês a mês"),
            "chuva": _tabela(bloco, "**Chuva mês a mês"),
            "chuva_anual": _num(chuva_ano.group(1)) if chuva_ano else None,
            "mare": {
                "maregrafo": maregrafo.group(1) if maregrafo else None,
                "tipo": tipo_mare.group(1) if tipo_mare else None,
                "sizigia": _num(sizigia.group(1)) if sizigia else None,
                "quadratura": _num(quadratura.group(1)) if quadratura else None,
                "diaria": _num(diaria.group(1)) if diaria else None,
                "max24": _num(max24.group(1)) if max24 else None,
            },
        }
    return setores


def _dist_km(la1, lo1, la2, lo2):
    dx = (lo2 - lo1) * 111.320 * math.cos(math.radians((la1 + la2) / 2))
    dy = (la2 - la1) * 110.574
    return math.hypot(dx, dy)


def setores_da_rota(wps, setores):
    """Setores costeiros mais proximos de cada ponto da derrota, em ordem."""
    escolhidos = []
    for w in wps:
        melhor, menor = None, 1e9
        for s in setores.values():
            if s["lat"] is None:
                continue
            d = _dist_km(w[0], w[1], s["lat"], s["lon"])
            if s["lat_mar"] is not None:
                d = min(d, _dist_km(w[0], w[1], s["lat_mar"], s["lon_mar"]))
            if d < menor:
                melhor, menor = s, d
        if melhor and (not escolhidos or escolhidos[-1]["codigo"] != melhor["codigo"]):
            if melhor["codigo"] not in [e["codigo"] for e in escolhidos]:
                escolhidos.append(melhor)
    return escolhidos


MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul",
         "Ago", "Set", "Out", "Nov", "Dez"]


def resumo_mensal(setores_rota):
    """Junta os setores num quadro mensal unico: faixa de vento (nos e km/h),
    direcao, onda no primeiro e no ultimo setor, chuva nos dois."""
    def col(tab, mes, i):
        for linha in tab[1:]:
            if linha and linha[0].strip()[:3].lower() == mes.lower()[:3]:
                return linha[i] if i < len(linha) else None
        return None

    a, b = setores_rota[0], setores_rota[-1]
    linhas = []
    for mes in MESES:
        ventos = [_num(col(s["vento"], mes, 1)) for s in setores_rota if s["vento"]]
        ventos = [v for v in ventos if v]
        direcoes = [col(s["vento"], mes, 7) for s in setores_rota if s["vento"]]
        direcoes = [d for d in direcoes if d]
        onda_a = _num(col(a["ondas"], mes, 1)) if a["ondas"] else None
        onda_b = _num(col(b["ondas"], mes, 1)) if b["ondas"] else None
        chuva_a = _num(col(a["chuva"], mes, 1)) if a["chuva"] else None
        chuva_b = _num(col(b["chuva"], mes, 1)) if b["chuva"] else None
        vmin, vmax = (min(ventos), max(ventos)) if ventos else (None, None)
        linhas.append({
            "mes": mes, "vento_min": vmin, "vento_max": vmax,
            "direcoes": sorted(set(direcoes), key=direcoes.index),
            "onda_a": onda_a, "onda_b": onda_b,
            "chuva_a": chuva_a, "chuva_b": chuva_b,
        })
    return linhas


def extremos(setores_rota):
    """Maiores valores de vento e onda registrados nos setores da rota."""
    def maior(tab, col):
        vals = []
        for linha in (tab or [])[1:]:
            if len(linha) > col:
                v = _num(linha[col])
                if v:
                    vals.append((v, linha[0]))
        return max(vals) if vals else (None, None)

    vento_max, vento_mes = (None, None)
    onda_max, onda_mes, onda_setor = (None, None, None)
    p90_max = None
    p99_max = None
    onda_p99 = None
    for s in setores_rota:
        v, m = maior(s["vento"], 5)          # maximo horario na serie
        if v and (vento_max is None or v > vento_max):
            vento_max, vento_mes = v, m
        p, _ = maior(s["vento"], 3)          # p90
        if p and (p90_max is None or p > p90_max):
            p90_max = p
        q, _ = maior(s["vento"], 4)          # p99
        if q and (p99_max is None or q > p99_max):
            p99_max = q
        o, om = maior(s["ondas"], 4)         # Hs maxima da serie
        if o and (onda_max is None or o > onda_max):
            onda_max, onda_mes, onda_setor = o, om, s["codigo"]
        o99, _ = maior(s["ondas"], 3)        # Hs p99
        if o99 and (onda_p99 is None or o99 > onda_p99):
            onda_p99 = o99
    # onda tipica da metade mais calma do ano, usada para a categoria ISO minima
    medias = []
    for s in setores_rota:
        for linha in (s["ondas"] or [])[1:]:
            v = _num(linha[1]) if len(linha) > 1 else None
            if v:
                medias.append(v)
    janela = None
    if medias:
        medias.sort()
        janela = medias[max(0, int(len(medias) * 0.5) - 1)]
    return {"vento_max_kn": vento_max, "vento_max_mes": vento_mes,
            "vento_p90_kn": p90_max, "vento_p99_kn": p99_max,
            "onda_max_m": onda_max, "onda_max_mes": onda_mes,
            "onda_max_setor": onda_setor, "onda_janela_m": janela,
            "onda_p99_m": onda_p99}


# ---------------------------------------------------------------------------
# classificacao
# ---------------------------------------------------------------------------

ISO = [
    ("D", "Águas abrigadas", 16, 0.3, "Lagos, rios, canais"),
    ("C", "Costeira", 27, 2.0, "Águas costeiras, baías grandes, estuários"),
    ("B", "Alto-mar", 40, 4.0, "Navegação afastada da costa"),
    ("A", "Oceano", None, None, "Travessia oceânica, autossuficiente"),
]


def categoria_iso(ex):
    """Categoria de projeto ISO 12217 a partir dos extremos da rota.

    RECOMENDADA: usa o p99 de vento e de onda, ou seja, a condicao superada em
    1% das horas. E a condicao de projeto defensavel: o pico absoluto de uma
    serie de reanalise nao deve, sozinho, empurrar um barco costeiro para a
    categoria oceanica.
    MINIMA: usa o p90 de vento e a onda tipica da metade mais calma do ano. So
    vale para quem so navega na janela boa, com previsao confirmada.
    O pico absoluto ja registrado vai no texto do relatorio como ressalva.
    Devolve (recomendada, minima, categoria_do_pico_absoluto).
    """
    def enquadrar(vento, onda):
        for c, _nome, v_lim, o_lim, _uso in ISO:
            if v_lim is None:
                return c
            if (vento is None or vento <= v_lim) and (onda is None or onda <= o_lim):
                return c
        return "A"

    recomendada = enquadrar(ex.get("vento_p99_kn") or ex.get("vento_max_kn"),
                            ex.get("onda_p99_m") or ex.get("onda_max_m"))
    minima = enquadrar(ex.get("vento_p90_kn"), ex.get("onda_janela_m"))
    pico = enquadrar(ex.get("vento_max_kn"), ex.get("onda_max_m"))
    return recomendada, minima, pico


NORMAM = [
    ("Interior", "Águas abrigadas ou parcialmente abrigadas. Área 1 = abrigada "
                 "(lagos, lagoas, baías, rios, canais). Área 2 = parcialmente "
                 "abrigada, onde eventualmente há ondas ou combinação adversa de "
                 "vento, correnteza e maré.", "Arrais-Amador"),
    ("Costeira", "Entre portos nacionais e estrangeiros, dentro do limite de "
                 "visibilidade da costa, não excedendo 20 milhas náuticas.",
     "Mestre-Amador"),
    ("Oceânica", "Sem restrições: fora dos limites de visibilidade da costa e "
                 "sem outros limites estabelecidos.", "Capitão-Amador"),
]


def classificacao_normam(afastamento_mn, so_aguas_abrigadas=False):
    """Area de navegacao da NORMAM-211/DPC (esporte e recreio).
    Devolve (area, habilitacao, motivo) ou (None, None, motivo) se faltar dado."""
    if so_aguas_abrigadas:
        return ("Interior", "Arrais-Amador",
                "A derrota fica toda em águas abrigadas ou parcialmente abrigadas.")
    if afastamento_mn is None:
        return (None, None,
                "N/A — o afastamento máximo da costa não foi informado. Meça na "
                "carta do percurso (1 minuto de latitude = 1 milha náutica) e "
                "rode de novo com --afastamento-mn.")
    if afastamento_mn <= 20:
        return ("Costeira", "Mestre-Amador",
                "O ponto mais afastado da derrota fica a cerca de %s MN da costa, "
                "dentro do limite de 20 milhas e da visibilidade da costa."
                % _fmt(afastamento_mn))
    return ("Oceânica", "Capitão-Amador",
            "O ponto mais afastado da derrota fica a cerca de %s MN da costa, "
            "além do limite de 20 milhas da navegação costeira." % _fmt(afastamento_mn))


def _fmt(v, casas=1, milhar=False):
    """Numero no padrao brasileiro: virgula decimal e, com milhar=True, ponto
    de milhar. None vira N/A."""
    if v is None:
        return "N/A"
    inteiro, _, resto = ("%.*f" % (casas, v)).partition(".")
    if milhar:
        sinal, digitos = ("-", inteiro[1:]) if inteiro.startswith("-") else ("", inteiro)
        blocos = []
        while len(digitos) > 3:
            blocos.insert(0, digitos[-3:])
            digitos = digitos[:-3]
        blocos.insert(0, digitos)
        inteiro = sinal + ".".join(blocos)
    return inteiro + ("," + resto if resto else "")


_CATALOGO = None


def carta_oficial(numero_painel, titulo_kap=""):
    """O acervo nomeia os paineis como <numero da carta> + 2 digitos de painel.
    Devolve (numero oficial da DHN, titulo oficial) usando o catalogo em
    data/cartas_dhn.csv; cai para o numero do painel e o titulo do KAP."""
    global _CATALOGO
    if _CATALOGO is None:
        _CATALOGO = {}
        try:
            with open(CARTAS_CSV, encoding="utf-8") as fp:
                for linha in fp:
                    num, _, tit = linha.strip().partition(";")
                    chave = num.strip().split()[0] if num.strip() else ""
                    if chave and chave.lower() != "numero":
                        _CATALOGO[chave] = tit.strip()
        except Exception:
            _CATALOGO = {}
    painel = str(numero_painel or "")
    oficial = painel[:-2] if len(painel) > 2 else painel
    titulo = _CATALOGO.get(oficial)
    if titulo:
        return oficial, titulo
    if painel in _CATALOGO:
        return painel, _CATALOGO[painel]
    return oficial or painel, titulo_kap or "?"


def escala_br(valor):
    if not valor:
        return "?"
    return "1:" + _fmt(float(valor), 0, True)


def sem_acento(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")
