#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Gera imagens PNG das cartas nauticas raster (BSB/KAP) do CHM/Marinha do Brasil.

Le os .zip baixados de assets.marinha.mil.br, decodifica o raster BSB em Python
puro (sem GDAL), localiza qual carta cobre a regiao pedida e recorta um trecho
ao redor do ponto.

Uso:
    python carta.py indexar
    python carta.py buscar itacare
    python carta.py imagem itacare
    python carta.py imagem "-14.2769,-38.9964" --raio 25
    python carta.py rota salvador itacare
    python carta.py imagem 22500 --completa --largura 3000

O acervo (os .zip do CHM) e procurado nesta ordem: --dados, a variavel de
ambiente CARTAS_NAUTICAS_DIR, ./raster ao lado deste script, e por fim
~/Downloads/cartas-nauticas e ~/cartas-nauticas. Use baixar.py para monta-lo.

Requer: Pillow, numpy. Rede so e usada para geocodificar nomes ainda nao
conhecidos (Nominatim/OpenStreetMap); resultados ficam em cache em locais.json.
"""

import argparse
import functools
import io
import json
import math
import os
import re
import struct
import sys
import threading
import time
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

R_TERRA_KM = 6371.0

# Preenchidos por definir_base(). O script fica ao lado da skill, mas o acervo
# (300 MB de zips) mora fora dela, entao os dois precisam ser independentes.
BASE = DIR_RASTER = DIR_SAIDA = ARQ_INDICE = ARQ_LOCAIS = None

_trava_locais = threading.Lock()
_indice_memo = None

# A politica de uso do Nominatim exige no maximo 1 req/s e um User-Agent que
# identifique a aplicacao com contato. Servindo isso na web sem respeitar as
# duas coisas, o IP e bloqueado. Defina CARTAS_UA com um e-mail real.
UA_GEO = os.environ.get(
    "CARTAS_UA", "cartas-nauticas-chm/1.0 (+contato nao informado)")
INTERVALO_GEO = float(os.environ.get("CARTAS_INTERVALO_GEO", "1.1"))
_trava_geo = threading.Lock()
_ultimo_geo = [0.0]


def _esperar_vez_geo():
    with _trava_geo:
        espera = INTERVALO_GEO - (time.monotonic() - _ultimo_geo[0])
        if espera > 0:
            time.sleep(espera)
        _ultimo_geo[0] = time.monotonic()


class ErroDeUso(Exception):
    """Entrada invalida do usuario. No CLI virou mensagem de erro; importado por
    um servidor, vira resposta 400. Por isso nada aqui chama sys.exit fora de
    main() -- num processo servidor isso mataria o worker."""


class Opcoes(object):
    """Opcoes de renderizacao com os mesmos padroes do CLI. Existe para que o
    modulo possa ser usado como biblioteca (ex.: pelo app.py) sem argparse."""

    def __init__(self, **kw):
        self.raio = 15.0
        self.margem = 8.0
        self.completa = False
        self.todas = False
        self.carta = None
        self.largura = 2400
        self.paleta = "padrao"
        self.saida = None
        self.sem_marcador = False
        self.sem_rodape = False
        self.sem_linha = False
        for k, v in kw.items():
            if not hasattr(self, k):
                raise ErroDeUso("opcao desconhecida: %s" % k)
            setattr(self, k, v)


def candidatos_base():
    """Lugares onde procurar o acervo quando ninguem disse onde ele esta."""
    aqui = os.path.dirname(os.path.abspath(__file__))
    lar = os.path.expanduser("~")
    return [aqui, os.path.join(lar, "Downloads", "cartas-nauticas"),
            os.path.join(lar, "cartas-nauticas")]


def definir_base(escolhido=None):
    global BASE, DIR_RASTER, DIR_SAIDA, ARQ_INDICE, ARQ_LOCAIS, _indice_memo
    _indice_memo = None
    abrir_painel.cache_clear()
    # Caminho dito na mao (--dados) ou em CARTAS_NAUTICAS_DIR e autoritativo.
    # Cair para outro acervo so porque esse nao tem raster/ seria pior que falhar:
    # o usuario leria dados de um lugar que nao pediu, sem perceber. So quando
    # ninguem disse nada vale procurar nos lugares de costume.
    explicito = escolhido or os.environ.get("CARTAS_NAUTICAS_DIR")
    if explicito:
        base = explicito
    else:
        base = next((c for c in candidatos_base()
                     if os.path.isdir(os.path.join(c, "raster"))), None)
        if base is None:
            base = os.path.join(os.path.expanduser("~"), "cartas-nauticas")
    BASE = os.path.abspath(base)
    DIR_RASTER = os.path.join(BASE, "raster")
    DIR_SAIDA = os.path.join(BASE, "imagens")
    ARQ_INDICE = os.path.join(BASE, "indice.json")
    ARQ_LOCAIS = os.path.join(BASE, "locais.json")
    return BASE


def exigir_acervo():
    if not os.path.isdir(DIR_RASTER) or not any(
            f.lower().endswith(".zip") for f in os.listdir(DIR_RASTER)):
        raise ErroDeUso(
            "Acervo nao encontrado em %s.\n"
            "Baixe as cartas primeiro:  python \"%s\" --destino \"%s\"\n"
            "Ou aponte para um acervo existente com --dados / CARTAS_NAUTICAS_DIR."
            % (DIR_RASTER,
               os.path.join(os.path.dirname(os.path.abspath(__file__)), "baixar.py"),
               BASE))


# --------------------------------------------------------------------------
# leitura do formato BSB/KAP
# --------------------------------------------------------------------------

def _ler_cabecalho(dados):
    """Extrai o cabecalho de texto do KAP como dict {chave: [linhas]}."""
    fim = dados.find(b"\x1a")
    if fim < 0:
        raise ValueError("cabecalho BSB nao encontrado (falta o terminador 0x1A)")
    texto = dados[:fim].decode("latin-1")

    registros = {}
    atual = None
    for linha in texto.splitlines():
        if not linha.strip():
            continue
        if linha[0].isspace() and atual:
            # continuacao do registro anterior
            registros[atual][-1] += "," + linha.strip()
            continue
        m = re.match(r"^([A-Z0-9]{3})/(.*)$", linha)
        if m:
            atual = m.group(1)
            registros.setdefault(atual, []).append(m.group(2))
        else:
            atual = None
    return registros


def _campos(linha):
    """'SC=300000,GD=WGS84' -> {'SC': '300000', 'GD': 'WGS84'}"""
    out = {}
    for parte in linha.split(","):
        if "=" in parte:
            k, v = parte.split("=", 1)
            out[k.strip()] = v.strip()
    return out


class Carta(object):
    """Uma carta raster BSB (um painel KAP)."""

    def __init__(self, dados, origem=""):
        self.origem = origem
        h = _ler_cabecalho(dados)
        self.dados = dados
        self.bruto = h

        # RA=largura,altura tem virgula dentro do valor, e NA= (titulo) pode ter
        # virgula tambem, entao aqui nao da para usar o split generico.
        bsb = ",".join(h.get("BSB") or h.get("NOS") or [])
        na = re.search(r"NA=(.*?)(?:,\s*(?:NU|RA|DU|NX|NY)=|$)", bsb)
        self.titulo = na.group(1).strip() if na else "?"
        nu = re.search(r"NU=([^,]*)", bsb)
        self.numero = nu.group(1).strip() if nu else "?"
        ra = re.search(r"RA=\s*(\d+)\s*,\s*(\d+)", bsb)
        if not ra:
            raise ValueError("campo RA (dimensoes) ausente ou invalido")
        self.largura, self.altura = int(ra.group(1)), int(ra.group(2))

        knp = _campos(",".join(h.get("KNP", [""])))
        self.escala = int(float(knp.get("SC", 0) or 0))
        self.projecao = knp.get("PR", "?")
        self.datum = knp.get("GD", "?")

        self.profundidade = int(h.get("IFM", ["1"])[0].split(",")[0])
        self.edicao = _campos(",".join(h.get("CED", [""]))).get("ED", "")
        self.aviso = _campos(",".join(h.get("NTM", [""]))).get("NE", "")

        self.paletas = {}
        for chave, nome in (("RGB", "padrao"), ("DAY", "dia"), ("DSK", "crepusculo"),
                            ("NGT", "noite")):
            cores = {}
            for linha in h.get(chave, []):
                p = linha.split(",")
                if len(p) >= 4:
                    cores[int(p[0])] = (int(p[1]), int(p[2]), int(p[3]))
            if cores:
                self.paletas[nome] = cores

        self.ref = []
        for linha in h.get("REF", []):
            p = linha.split(",")
            if len(p) >= 5:
                self.ref.append((float(p[1]), float(p[2]), float(p[3]), float(p[4])))

        self.poligono = []
        for linha in h.get("PLY", []):
            p = linha.split(",")
            if len(p) >= 3:
                self.poligono.append((float(p[1]), float(p[2])))

        self._tabela = None
        self._geo = None

    # -- georreferenciamento ------------------------------------------------

    @staticmethod
    def _mercator_y(lat):
        lat = max(min(lat, 89.5), -89.5)
        return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

    @staticmethod
    def _mercator_lat(y):
        return math.degrees(2 * math.atan(math.exp(y)) - math.pi / 2)

    def _ajustar_geo(self):
        """Ajusta transformacoes lineares px<->(lon, mercator_y) por minimos
        quadrados sobre os pontos REF. Exato para Mercator, aproximado para as
        demais projecoes (o residuo em pixels e reportado)."""
        if self._geo is not None:
            return self._geo
        if len(self.ref) < 3:
            raise ValueError("carta sem pontos REF suficientes para georreferenciar")

        px = np.array([r[0] for r in self.ref])
        py = np.array([r[1] for r in self.ref])
        lon = np.array([r[3] for r in self.ref])
        my = np.array([self._mercator_y(r[2]) for r in self.ref])

        A_pix = np.column_stack([np.ones_like(px), px, py])
        A_geo = np.column_stack([np.ones_like(lon), lon, my])

        para_geo = np.linalg.lstsq(A_pix, np.column_stack([lon, my]), rcond=None)[0]
        para_pix = np.linalg.lstsq(A_geo, np.column_stack([px, py]), rcond=None)[0]

        residuo = float(np.sqrt(np.mean(np.sum((A_geo.dot(para_pix) -
                                                np.column_stack([px, py])) ** 2, axis=1))))
        self._geo = (para_geo, para_pix, residuo)
        return self._geo

    @property
    def residuo_px(self):
        return self._ajustar_geo()[2]

    def para_pixel(self, lat, lon):
        _, para_pix, _ = self._ajustar_geo()
        v = np.array([1.0, lon, self._mercator_y(lat)])
        x, y = v.dot(para_pix)
        return float(x), float(y)

    def para_latlon(self, x, y):
        para_geo, _, _ = self._ajustar_geo()
        v = np.array([1.0, x, y])
        lon, my = v.dot(para_geo)
        return self._mercator_lat(float(my)), float(lon)

    # -- cobertura ----------------------------------------------------------

    def limites(self):
        """(lat_min, lat_max, lon_min, lon_max) da area util."""
        pts = self.poligono or [(r[2], r[3]) for r in self.ref]
        lats = [p[0] for p in pts]
        lons = [p[1] for p in pts]
        return min(lats), max(lats), min(lons), max(lons)

    def contem(self, lat, lon):
        pts = self.poligono
        if len(pts) < 3:
            la0, la1, lo0, lo1 = self.limites()
            return la0 <= lat <= la1 and lo0 <= lon <= lo1
        dentro = False
        j = len(pts) - 1
        for i in range(len(pts)):
            yi, xi = pts[i]
            yj, xj = pts[j]
            if (yi > lat) != (yj > lat):
                if lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                    dentro = not dentro
            j = i
        return dentro

    # -- decodificacao do raster -------------------------------------------

    def _indice_linhas(self):
        if self._tabela is None:
            fim = struct.unpack(">I", self.dados[-4:])[0]
            self._tabela = struct.unpack(">%dI" % self.altura,
                                         self.dados[fim:fim + 4 * self.altura])
        return self._tabela

    def decodificar(self, caixa=None):
        """Decodifica o raster (ou so a caixa (x0, y0, x1, y1)) para RGB.

        Decodificar apenas as linhas necessarias e o que torna o recorte rapido:
        uma carta de 7518x10786 inteira leva ~20 s, um recorte tipico <1 s.
        """
        x0, y0, x1, y1 = caixa or (0, 0, self.largura, self.altura)
        x0 = max(0, min(x0, self.largura))
        x1 = max(x0 + 1, min(x1, self.largura))
        y0 = max(0, min(y0, self.altura))
        y1 = max(y0 + 1, min(y1, self.altura))

        tabela = self._indice_linhas()
        dados = self.dados
        prof = self.profundidade
        desloc = 7 - prof
        mascara = 0x7F >> prof
        larg = x1 - x0
        saida = np.zeros((y1 - y0, larg), dtype=np.uint8)

        for y in range(y0, y1):
            p = tabela[y]
            while dados[p] & 0x80:          # numero da linha (7 bits por byte)
                p += 1
            p += 1
            linha = saida[y - y0]
            x = 0
            while x < self.largura:
                c = dados[p]
                p += 1
                if c == 0:                  # fim da linha
                    break
                cor = (c & 0x7F) >> desloc
                n = c & mascara
                while c & 0x80:             # contador multi-byte
                    c = dados[p]
                    p += 1
                    n = (n << 7) + (c & 0x7F)
                n += 1
                fim = x + n
                if fim > x0 and x < x1:     # sobrepoe a janela pedida
                    linha[max(x, x0) - x0:min(fim, x1) - x0] = cor
                x = fim
        return saida, (x0, y0, x1, y1)

    def colorir(self, indices, paleta="padrao"):
        cores = self.paletas.get(paleta) or self.paletas.get("padrao") or {}
        lut = np.zeros((256, 3), dtype=np.uint8)
        lut[:] = 255
        for i, rgb in cores.items():
            if 0 <= i < 256:
                lut[i] = rgb
        return Image.fromarray(lut[indices], "RGB")


@functools.lru_cache(maxsize=12)
def abrir_painel(zip_nome, painel):
    """Abre um painel especifico, com cache. Evita reabrir o zip e reparsear o
    cabecalho a cada pedido -- num servidor a mesma carta repete muito."""
    with zipfile.ZipFile(os.path.join(DIR_RASTER, zip_nome)) as z:
        dados = z.read(painel)
    return Carta(dados, "%s!%s" % (zip_nome, painel))


def painel_do_indice(entrada):
    try:
        return abrir_painel(entrada["zip"], entrada["painel"])
    except KeyError:
        raise ErroDeUso("entrada de indice invalida: %r" % entrada)
    except Exception as e:
        raise ErroDeUso("nao consegui abrir %s!%s (%s: %s)" % (
            entrada.get("zip"), entrada.get("painel"), type(e).__name__, e))


def abrir_cartas(caminho_zip):
    """Devolve a lista de paineis KAP de um .zip de carta."""
    saida = []
    with zipfile.ZipFile(caminho_zip) as z:
        for nome in z.namelist():
            if nome.lower().endswith(".kap"):
                try:
                    saida.append(Carta(z.read(nome), "%s!%s" % (os.path.basename(caminho_zip), nome)))
                except Exception as e:
                    print("  aviso: %s -> %s: %s" % (nome, type(e).__name__, e))
    return saida


# --------------------------------------------------------------------------
# indice
# --------------------------------------------------------------------------

def cmd_indexar(args):
    exigir_acervo()
    zips = sorted(f for f in os.listdir(DIR_RASTER) if f.lower().endswith(".zip"))
    indice = []
    for i, nome in enumerate(zips, 1):
        caminho = os.path.join(DIR_RASTER, nome)
        for c in abrir_cartas(caminho):
            la0, la1, lo0, lo1 = c.limites()
            indice.append({
                "numero": c.numero, "titulo": c.titulo, "zip": nome,
                "painel": c.origem.split("!", 1)[-1], "escala": c.escala,
                "projecao": c.projecao, "datum": c.datum,
                "largura": c.largura, "altura": c.altura,
                "edicao": c.edicao, "aviso": c.aviso,
                "lat_min": la0, "lat_max": la1, "lon_min": lo0, "lon_max": lo1,
                "poligono": c.poligono,
            })
        if i % 50 == 0 or i == len(zips):
            print("... %d/%d zips (%d paineis)" % (i, len(zips), len(indice)))

    json.dump(indice, open(ARQ_INDICE, "w", encoding="utf-8"), ensure_ascii=False)
    print("\nindice com %d paineis -> %s" % (len(indice), ARQ_INDICE))


def carregar_indice():
    """Mantido em memoria: um servidor com varios pedidos nao precisa reler o
    JSON (631 paineis com poligonos) a cada requisicao."""
    global _indice_memo
    if _indice_memo is not None:
        return _indice_memo
    if not os.path.exists(ARQ_INDICE):
        exigir_acervo()
        raise ErroDeUso("Indice ausente. Rode primeiro:  "
                        "python carta.py --dados \"%s\" indexar" % BASE)
    _indice_memo = json.load(open(ARQ_INDICE, encoding="utf-8"))
    return _indice_memo


# --------------------------------------------------------------------------
# resolucao de local
# --------------------------------------------------------------------------

def _cache_locais():
    if os.path.exists(ARQ_LOCAIS):
        return json.load(open(ARQ_LOCAIS, encoding="utf-8"))
    return {}


def _rotular(pedido, display_name):
    """Escolhe o rotulo que vai impresso na imagem.

    O primeiro componente do display_name do Nominatim costuma ser melhor que o
    que o usuario digitou (traz acento e caixa certos: 'itacare' -> 'Itacare').
    Mas quando o geocoder casa com outra coisa -- 'porto de ilheus' cai numa
    'Avenida Brasil' -- carimbar esse nome na carta seria mentir sobre o que foi
    pedido. Entao so aceita o nome do geocoder se ele conversar com o pedido.
    """
    primeiro = (display_name or "").split(",")[0].strip()
    if not primeiro:
        return pedido
    a, b = _sem_acento(primeiro), _sem_acento(pedido)
    return primeiro if (a in b or b in a) else pedido


def resolver_local(texto, indice):
    """Devolve (lat, lon, rotulo). Aceita 'lat,lon', nome em cache, nome via
    Nominatim, ou o titulo/numero de uma carta."""
    texto = texto.strip()

    m = re.match(r"^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$", texto)
    if m:
        return float(m.group(1)), float(m.group(2)), "%s, %s" % (m.group(1), m.group(2))

    cache = _cache_locais()
    chave = texto.lower()
    if chave in cache:
        c = cache[chave]
        return c["lat"], c["lon"], c.get("rotulo", texto)

    try:
        import requests
        _esperar_vez_geo()
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": texto + ", Brasil", "format": "json", "limit": 1},
            headers={"User-Agent": UA_GEO},
            timeout=20)
        r.raise_for_status()
        j = r.json()
        if j:
            lat, lon = float(j[0]["lat"]), float(j[0]["lon"])
            nome_geo = j[0].get("display_name", "")
            rotulo = _rotular(texto, nome_geo)
            if rotulo == texto and nome_geo:
                # o geocoder achou outra coisa; a carta pode estar certa mesmo
                # assim, mas quem pediu precisa poder conferir onde caiu
                print("aviso: '%s' foi geocodificado como %s" % (texto, nome_geo))
            # relido dentro da trava: com varios pedidos simultaneos, dois
            # writers em cima do mesmo dict perdem entradas
            with _trava_locais:
                atual = _cache_locais()
                atual[chave] = {"lat": lat, "lon": lon, "rotulo": rotulo,
                                "fonte": "nominatim"}
                tmp = ARQ_LOCAIS + ".tmp"
                json.dump(atual, open(tmp, "w", encoding="utf-8"),
                          ensure_ascii=False, indent=1)
                os.replace(tmp, ARQ_LOCAIS)
            return lat, lon, rotulo
    except Exception as e:
        print("aviso: geocodificacao indisponivel (%s: %s)" % (type(e).__name__, e))

    alvo = _sem_acento(texto)
    for c in indice:
        if alvo == _sem_acento(str(c["numero"])) or alvo in _sem_acento(c["titulo"]):
            lat = (c["lat_min"] + c["lat_max"]) / 2
            lon = (c["lon_min"] + c["lon_max"]) / 2
            return lat, lon, c["titulo"]

    raise ErroDeUso("nao consegui localizar '%s'. "
                    "Passe coordenadas: \"-14.2769,-38.9964\"" % texto)


def _sem_acento(s):
    import unicodedata
    return "".join(ch for ch in unicodedata.normalize("NFD", s.lower())
                   if unicodedata.category(ch) != "Mn")


def cartas_que_cobrem(indice, lat, lon):
    achadas = []
    for c in indice:
        if not (c["lat_min"] <= lat <= c["lat_max"] and c["lon_min"] <= lon <= c["lon_max"]):
            continue
        pts = c.get("poligono") or []
        if len(pts) >= 3:
            dentro = False
            j = len(pts) - 1
            for i in range(len(pts)):
                yi, xi = pts[i]
                yj, xj = pts[j]
                if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                    dentro = not dentro
                j = i
            if not dentro:
                continue
        achadas.append(c)
    # escala menor = mais detalhe
    return sorted(achadas, key=lambda c: (c["escala"] or 10 ** 9))


def cmd_buscar(args):
    indice = carregar_indice()
    lat, lon, rotulo = resolver_local(args.local, indice)
    achadas = cartas_que_cobrem(indice, lat, lon)
    print("%s -> %.5f, %.5f" % (rotulo, lat, lon))
    if not achadas:
        print("nenhuma carta cobre esse ponto.")
        return
    print("\n%-16s %-11s %-46s %s" % ("CARTA", "ESCALA", "TITULO", "AVISO"))
    for c in achadas:
        print("%-16s 1:%-9s %-46s %s" % (c["numero"], c["escala"] or "?",
                                         c["titulo"][:46], c["aviso"] or "-"))


# --------------------------------------------------------------------------
# geracao da imagem
# --------------------------------------------------------------------------

def _fonte(tam):
    for nome in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(nome, tam)
        except Exception:
            pass
    return ImageFont.load_default()


def _marcar(img, x, y, rotulo, cor=(220, 0, 0), lado="direita"):
    d = ImageDraw.Draw(img, "RGBA")
    rgba = cor + (255,)
    r = max(14, int(min(img.size) * 0.02))
    d.ellipse([x - r, y - r, x + r, y + r], outline=rgba, width=3)
    d.line([x - r * 2, y, x - r * 0.5, y], fill=rgba, width=3)
    d.line([x + r * 0.5, y, x + r * 2, y], fill=rgba, width=3)
    d.line([x, y - r * 2, x, y - r * 0.5], fill=rgba, width=3)
    d.line([x, y + r * 0.5, x, y + r * 2], fill=rgba, width=3)
    if not rotulo:
        return
    f = _fonte(max(15, int(min(img.size) * 0.022)))
    cx0, cy0, cx1, cy1 = d.textbbox((0, 0), rotulo, font=f)
    larg, alt = cx1 - cx0, cy1 - cy0
    W, H = img.size

    # lado preferido; se nao couber, tenta o oposto; se nao couber nenhum, gruda na borda
    cx = x + r * 2.2 if lado == "direita" else x - r * 2.2 - larg
    if cx + larg > W - 8 or cx < 8:
        cx = x - r * 2.2 - larg if lado == "direita" else x + r * 2.2
    cx = max(8, min(cx, W - larg - 8))
    cy = max(8, min(y - r, H - alt - 8))

    d.rectangle([cx - 6, cy - 4, cx + larg + 6, cy + alt + 8], fill=(255, 255, 255, 230))
    d.text((cx, cy), rotulo, font=f, fill=cor + (255,))


def _linha_tracejada(d, p0, p1, cor, largura, traco=18, vao=12):
    x0, y0 = p0
    x1, y1 = p1
    total = math.hypot(x1 - x0, y1 - y0)
    if total < 1:
        return
    ux, uy = (x1 - x0) / total, (y1 - y0) / total
    pos = 0.0
    while pos < total:
        fim = min(pos + traco, total)
        d.line([x0 + ux * pos, y0 + uy * pos, x0 + ux * fim, y0 + uy * fim],
               fill=cor + (255,), width=largura)
        pos = fim + vao


def rumo_e_distancia(lat1, lon1, lat2, lon2):
    """Loxodromica (rumo constante): devolve (rumo_verdadeiro_graus, milhas_nauticas)."""
    f1, f2 = math.radians(lat1), math.radians(lat2)
    dfi = f2 - f1
    dlon = math.radians(lon2 - lon1)
    if abs(dlon) > math.pi:
        dlon -= math.copysign(2 * math.pi, dlon)
    dpsi = math.log(math.tan(math.pi / 4 + f2 / 2) / math.tan(math.pi / 4 + f1 / 2))
    q = dfi / dpsi if abs(dpsi) > 1e-12 else math.cos(f1)
    dist_km = math.hypot(dfi, q * dlon) * R_TERRA_KM
    rumo = (math.degrees(math.atan2(dlon, dpsi)) + 360) % 360
    return rumo, dist_km / 1.852


def _quebrar(d, texto, fonte, largura):
    linhas, atual = [], ""
    for palavra in texto.split(" "):
        teste = (atual + " " + palavra).strip()
        if atual and d.textlength(teste, font=fonte) > largura:
            linhas.append(atual)
            atual = palavra
        else:
            atual = teste
    if atual:
        linhas.append(atual)
    return linhas


def _rodape(img, linhas):
    W = img.size[0]
    base = max(52, int(W * 0.045))
    f1 = _fonte(max(13, int(base * 0.33)))
    f2 = _fonte(max(11, int(base * 0.24)))

    medida = ImageDraw.Draw(img)
    titulo = _quebrar(medida, linhas[0], f1, W - 24)
    detalhe = _quebrar(medida, linhas[1], f2, W - 24)

    h1 = int(f1.size * 1.35) if hasattr(f1, "size") else 20
    h2 = int(f2.size * 1.35) if hasattr(f2, "size") else 16
    alt = int(base * 0.22) + len(titulo) * h1 + len(detalhe) * h2 + int(base * 0.22)

    nova = Image.new("RGB", (W, img.size[1] + alt), (255, 255, 255))
    nova.paste(img, (0, 0))
    d = ImageDraw.Draw(nova)
    d.line([0, img.size[1], W, img.size[1]], fill=(150, 150, 150), width=2)

    y = img.size[1] + int(base * 0.22)
    for t in titulo:
        d.text((12, y), t, font=f1, fill=(20, 20, 20))
        y += h1
    for t in detalhe:
        d.text((12, y), t, font=f2, fill=(110, 110, 110))
        y += h2
    return nova


def montar_ponto(entrada, lat, lon, rotulo, args):
    """Renderiza o recorte ao redor de um ponto. Devolve (Image, info) sem
    tocar no disco -- quem salva e gerar(), quem serve e o app.py."""
    carta = painel_do_indice(entrada)

    if args.completa:
        caixa = (0, 0, carta.largura, carta.altura)
        cx = cy = None
    else:
        cx, cy = carta.para_pixel(lat, lon)
        # quantos pixels correspondem ao raio pedido, medido na horizontal
        graus_lon = args.raio / (R_TERRA_KM * math.pi / 180 * math.cos(math.radians(lat)))
        x2, _ = carta.para_pixel(lat, lon + graus_lon)
        meio = abs(x2 - cx)
        if meio < 5:
            meio = min(carta.largura, carta.altura) / 4.0
        caixa = (int(cx - meio), int(cy - meio), int(cx + meio), int(cy + meio))

    indices, real = carta.decodificar(caixa)
    img = carta.colorir(indices, args.paleta)

    if cx is not None:
        _marcar(img, cx - real[0], cy - real[1], rotulo if not args.sem_marcador else "")

    if args.largura and img.size[0] > args.largura:
        h = int(img.size[1] * args.largura / img.size[0])
        img = img.resize((args.largura, h), Image.LANCZOS)

    if not args.sem_rodape:
        cobertura = ("recorte de %g km de raio em %.4f, %.4f" % (args.raio, lat, lon)
                     if cx is not None else "carta completa")
        img = _rodape(img, [
            "Carta %s - %s   (1:%s)" % (carta.numero, carta.titulo, carta.escala or "?"),
            "DHN/CHM - Marinha do Brasil | %s | ed. %s | ultimo aviso %s | %s | "
            "NAO USAR PARA NAVEGACAO" % (carta.datum, carta.edicao or "?",
                                         carta.aviso or "?", cobertura),
        ])

    return img, {"numero": carta.numero, "titulo": carta.titulo,
                 "escala": carta.escala, "projecao": carta.projecao,
                 "edicao": carta.edicao, "aviso": carta.aviso,
                 "residuo_px": round(carta.residuo_px, 2),
                 "lat": lat, "lon": lon, "rotulo": rotulo}


def gerar(entrada, lat, lon, rotulo, args):
    """Wrapper de CLI: monta, salva em DIR_SAIDA e imprime o resumo."""
    img, info = montar_ponto(entrada, lat, lon, rotulo, args)

    os.makedirs(DIR_SAIDA, exist_ok=True)
    if args.saida and not args.todas:
        destino = args.saida
    else:
        seguro = re.sub(r"[^A-Za-z0-9]+", "-", _sem_acento(rotulo)).strip("-") or "carta"
        destino = os.path.join(DIR_SAIDA, "%s-carta-%s.png" % (seguro, info["numero"]))
    img.save(destino)

    print("  carta %-14s 1:%-8s %-42s residuo %.2f px  ->  %s (%dx%d)" % (
        info["numero"], info["escala"] or "?", info["titulo"][:42], info["residuo_px"],
        os.path.relpath(destino, BASE), img.size[0], img.size[1]))
    return destino


def montar_rota(entrada, pa, pb, args):
    """pa/pb: (lat, lon, rotulo) de partida e chegada. Devolve (Image, info)."""
    carta = painel_do_indice(entrada)

    ax, ay = carta.para_pixel(pa[0], pa[1])
    bx, by = carta.para_pixel(pb[0], pb[1])

    # margem: o maior entre --margem km e uma folga proporcional ao percurso
    lat_meio = (pa[0] + pb[0]) / 2
    graus_lon = args.margem / (R_TERRA_KM * math.pi / 180 * math.cos(math.radians(lat_meio)))
    ref_x, _ = carta.para_pixel(lat_meio, 0.0)
    ref_x2, _ = carta.para_pixel(lat_meio, graus_lon)
    margem_px = abs(ref_x2 - ref_x)
    vao = max(abs(bx - ax), abs(by - ay))
    margem_px = max(margem_px, vao * 0.12, 60)

    caixa = (int(min(ax, bx) - margem_px), int(min(ay, by) - margem_px),
             int(max(ax, bx) + margem_px), int(max(ay, by) + margem_px))

    indices, real = carta.decodificar(caixa)
    img = carta.colorir(indices, args.paleta)

    ax, ay = ax - real[0], ay - real[1]
    bx, by = bx - real[0], by - real[1]

    verde, vermelho = (0, 130, 40), (200, 0, 0)
    if not args.sem_linha:
        d = ImageDraw.Draw(img, "RGBA")
        largura = max(3, int(min(img.size) * 0.004))
        _linha_tracejada(d, (ax, ay), (bx, by), (170, 0, 170), largura,
                         traco=largura * 6, vao=largura * 4)

    # rotulo de cada ponto do lado oposto ao outro, para nao cobrir a linha
    _marcar(img, ax, ay, "Partida: %s" % pa[2], verde,
            "esquerda" if bx > ax else "direita")
    _marcar(img, bx, by, "Chegada: %s" % pb[2], vermelho,
            "direita" if bx > ax else "esquerda")

    if args.largura and img.size[0] > args.largura:
        h = int(img.size[1] * args.largura / img.size[0])
        img = img.resize((args.largura, h), Image.LANCZOS)

    rumo, milhas = rumo_e_distancia(pa[0], pa[1], pb[0], pb[1])
    mercator = "mercator" in (carta.projecao or "").lower()

    if not args.sem_rodape:
        nota = ("linha tracejada = loxodromica (rumo constante %03.0f)" % rumo
                if mercator else
                "linha tracejada = reta na projecao %s, nao e loxodromica" % carta.projecao)
        img = _rodape(img, [
            "%s  ->  %s   |   %.1f MN   |   rumo verdadeiro %03.0f" % (
                pa[2], pb[2], milhas, rumo),
            "Carta %s - %s (1:%s) | DHN/CHM - Marinha do Brasil | ed. %s | ultimo aviso %s | "
            "%s | NAO E DERROTA: nao considera profundidade, perigos nem areas restritas" % (
                carta.numero, carta.titulo, carta.escala or "?", carta.edicao or "?",
                carta.aviso or "?", nota),
        ])

    return img, {"numero": carta.numero, "titulo": carta.titulo,
                 "escala": carta.escala, "projecao": carta.projecao,
                 "edicao": carta.edicao, "aviso": carta.aviso,
                 "residuo_px": round(carta.residuo_px, 2),
                 "milhas": round(milhas, 1), "rumo": round(rumo),
                 "loxodromica": mercator,
                 "partida": {"lat": pa[0], "lon": pa[1], "rotulo": pa[2]},
                 "chegada": {"lat": pb[0], "lon": pb[1], "rotulo": pb[2]}}


def gerar_rota(entrada, pa, pb, args):
    """Wrapper de CLI: monta, salva em DIR_SAIDA e imprime o resumo."""
    img, info = montar_rota(entrada, pa, pb, args)

    os.makedirs(DIR_SAIDA, exist_ok=True)
    if args.saida and not args.todas:
        destino = args.saida
    else:
        sa = re.sub(r"[^A-Za-z0-9]+", "-", _sem_acento(pa[2])).strip("-") or "partida"
        sb = re.sub(r"[^A-Za-z0-9]+", "-", _sem_acento(pb[2])).strip("-") or "chegada"
        destino = os.path.join(DIR_SAIDA, "rota-%s-%s-carta-%s.png" % (sa, sb, info["numero"]))
    img.save(destino)

    print("  carta %-14s 1:%-8s %-42s residuo %.2f px  ->  %s (%dx%d)" % (
        info["numero"], info["escala"] or "?", info["titulo"][:42], info["residuo_px"],
        os.path.relpath(destino, BASE), img.size[0], img.size[1]))
    return destino


def por_numero(indice, numero):
    alvo = _sem_acento(str(numero))
    achadas = [c for c in indice if _sem_acento(str(c["numero"])) == alvo]
    if not achadas:
        raise ErroDeUso("carta '%s' nao existe no indice" % numero)
    return achadas


def cartas_da_rota(indice, la1, lo1, la2, lo2):
    """Cartas que cobrem os DOIS pontos, mais detalhada primeiro. Compartilhada
    entre o CLI e o servidor para os dois darem a mesma resposta."""
    cobrem_a = cartas_que_cobrem(indice, la1, lo1)
    cobrem_b = cartas_que_cobrem(indice, la2, lo2)
    chaves_b = {(c["zip"], c["painel"]) for c in cobrem_b}
    comuns = [c for c in cobrem_a if (c["zip"], c["painel"]) in chaves_b]
    if not comuns:
        raise ErroDeUso(
            "Nenhuma carta cobre os dois pontos ao mesmo tempo.\n"
            "Cartas na partida: %s\nCartas na chegada: %s\n"
            "Gere as pontas separadamente com 'imagem', ou force uma carta de "
            "escala menor com --carta." % (
                ", ".join(str(c["numero"]) for c in cobrem_a[:6]) or "nenhuma",
                ", ".join(str(c["numero"]) for c in cobrem_b[:6]) or "nenhuma"))
    return comuns


def cmd_rota(args):
    indice = carregar_indice()
    la1, lo1, r1 = resolver_local(args.partida, indice)
    la2, lo2, r2 = resolver_local(args.chegada, indice)
    rumo, milhas = rumo_e_distancia(la1, lo1, la2, lo2)

    print("partida  %-28s %.5f, %.5f" % (r1, la1, lo1))
    print("chegada  %-28s %.5f, %.5f" % (r2, la2, lo2))
    print("percurso %.1f MN, rumo verdadeiro %03.0f\n" % (milhas, rumo))

    if args.carta:
        achadas = por_numero(indice, args.carta)
    else:
        achadas = cartas_da_rota(indice, la1, lo1, la2, lo2)
        if not args.todas:
            achadas = achadas[:1]

    print("%d carta(s) cobrindo o percurso inteiro:" % len(achadas))
    for c in achadas:
        gerar_rota(c, (la1, lo1, r1), (la2, lo2, r2), args)


def cmd_imagem(args):
    indice = carregar_indice()
    lat, lon, rotulo = resolver_local(args.local, indice)

    if args.carta:
        achadas = por_numero(indice, args.carta)
    else:
        achadas = cartas_que_cobrem(indice, lat, lon)
        if not achadas:
            raise ErroDeUso("nenhuma carta cobre %.5f, %.5f" % (lat, lon))
        if not args.todas:
            achadas = achadas[:1]

    print("%s -> %.5f, %.5f  (%d carta(s))" % (rotulo, lat, lon, len(achadas)))
    for c in achadas:
        gerar(c, lat, lon, rotulo, args)


# --------------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dados", help="pasta do acervo (contendo raster/); "
                                   "tambem lida de CARTAS_NAUTICAS_DIR")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("indexar", help="le os .zip e monta o indice geografico")

    b = sub.add_parser("buscar", help="lista as cartas que cobrem um local")
    b.add_argument("local", help="nome do lugar ou 'lat,lon'")

    g = sub.add_parser("imagem", help="gera o PNG da carta")
    g.add_argument("local", help="nome do lugar ou 'lat,lon'")
    g.add_argument("--raio", type=float, default=15.0,
                   help="raio do recorte em km (padrao 15)")
    g.add_argument("--completa", action="store_true", help="carta inteira, sem recorte")
    g.add_argument("--todas", action="store_true",
                   help="uma imagem por carta que cobre o ponto")
    g.add_argument("--carta", help="forcar um numero de carta especifico")
    g.add_argument("--largura", type=int, default=2400,
                   help="largura maxima em px (padrao 2400; 0 = sem limite)")
    g.add_argument("--paleta", default="padrao",
                   choices=["padrao", "dia", "crepusculo", "noite"])
    g.add_argument("--saida", help="caminho do PNG de saida")
    g.add_argument("--sem-marcador", action="store_true")
    g.add_argument("--sem-rodape", action="store_true")

    r = sub.add_parser("rota", help="carta cobrindo o percurso entre dois pontos")
    r.add_argument("partida", help="nome do lugar ou 'lat,lon'")
    r.add_argument("chegada", help="nome do lugar ou 'lat,lon'")
    r.add_argument("--margem", type=float, default=8.0,
                   help="folga minima em km ao redor do percurso (padrao 8)")
    r.add_argument("--todas", action="store_true",
                   help="uma imagem por carta que cobre o percurso")
    r.add_argument("--carta", help="forcar um numero de carta especifico")
    r.add_argument("--largura", type=int, default=2400,
                   help="largura maxima em px (padrao 2400; 0 = sem limite)")
    r.add_argument("--paleta", default="padrao",
                   choices=["padrao", "dia", "crepusculo", "noite"])
    r.add_argument("--saida", help="caminho do PNG de saida")
    r.add_argument("--sem-linha", action="store_true",
                   help="marca so os dois pontos, sem a loxodromica")
    r.add_argument("--sem-rodape", action="store_true")

    args = p.parse_args()
    definir_base(args.dados)
    try:
        {"indexar": cmd_indexar, "buscar": cmd_buscar, "imagem": cmd_imagem,
         "rota": cmd_rota}[args.cmd](args)
    except ErroDeUso as e:
        sys.exit(str(e))


if __name__ == "__main__":
    main()
