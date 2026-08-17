#!/usr/bin/env python3
"""
Lista canonica de parametros do estudo de similares.

Os dois geradores (gerar_planilha.py e gerar_documento.py) importam daqui, para
que a planilha e o documento nunca saiam fora de sincronia.

Cada parametro tem:
  key        chave usada no JSON de dados
  pt         rotulo em portugues
  en         rotulo em ingles (reproduz a grafia do modelo original da Brana)
  unid_imp   unidade quando a fonte publica em imperial
  unid_si    unidade no sistema metrico
  fator      chave do fator de conversao imperial -> SI, ou None
  tipo       "num" | "texto"

Quais destes parametros aparecem na tabela do documento .docx e definido em
gerar_documento.py (MAPA_TABELA), porque quem manda ali sao os rotulos do modelo
em branco da Brana. O restante e coletado, entra na planilha e aparece na secao
de cada embarcacao como "Outros dados publicados".
"""

# Fatores de conversao. Valores exatos onde a definicao e exata.
FATORES = [
    ("FT_M", "Comprimento", "ft", "m", 0.3048,
     "Exato (definicao internacional do pe)"),
    ("LB_KG", "Massa / peso", "lb", "kg", 0.45359237,
     "Exato (libra avoirdupois)"),
    ("GAL_L", "Volume", "US gal", "L", 3.785411784,
     "Galao americano"),
    ("HP_KW", "Potencia", "hp", "kW", 0.745699872,
     "Horsepower mecanico (550 ft.lbf/s)"),
    ("MPH_KN", "Velocidade", "mph", "kn", 0.868976242,
     "Milha terrestre/h para no (1 kn = 1,852 km/h)"),
    ("FT2_M2", "Area", "ft2", "m2", 0.09290304,
     "Exato (0,3048^2)"),
    ("LT_KG", "Massa (tonelada longa)", "long ton", "kg", 1016.0469088,
     "Exato (2240 lb). Usado para recompor o DLR"),
    ("LBHP_KGKW", "Densidade de massa", "lb/hp", "kg/kW", None,
     "Derivado: fator lb->kg dividido por fator hp->kW"),
]

FATOR_VALOR = {k: v for k, _, _, _, v, _ in FATORES if v is not None}
FATOR_VALOR["LBHP_KGKW"] = FATOR_VALOR["LB_KG"] / FATOR_VALOR["HP_KW"]

# Linha da aba Fatores onde cada fator fica (usado para montar as formulas).
FATOR_LINHA = {k: 5 + i for i, (k, *_rest) in enumerate(FATORES)}


def _p(key, pt, en, unid_imp, unid_si, fator, tipo="num"):
    return {
        "key": key, "pt": pt, "en": en,
        "unid_imp": unid_imp, "unid_si": unid_si,
        "fator": fator, "tipo": tipo,
    }


# Dimensoes e dados coletados da fonte.
PARAMETROS = [
    _p("loa", "Comprimento total (LOA)", "LOA", "ft", "m", "FT_M"),
    _p("lwl", "Comprimento na linha d'agua (LWL)", "LWL", "ft", "m", "FT_M"),
    _p("boa", "Boca maxima (BOA)", "BOA", "ft", "m", "FT_M"),
    _p("calado", "Calado", "Draft", "ft", "m", "FT_M"),
    _p("pontal", "Pontal (fundo ate o conves)", "Depth", "ft", "m", "FT_M"),
    _p("deslocamento", "Deslocamento", "Displ.", "lbs", "kg", "LB_KG"),
    _p("deadrise", "Angulo de V do fundo (deadrise)", "Deadrise", "deg",
       "graus", None),
    _p("pe_direito", "Altura livre interna (pe-direito)", "Head Room",
       "ft", "m", "FT_M"),
    _p("area_velica", "Area velica (se veleiro)", "Sail Area",
       "ft2", "m2", "FT2_M2"),
    _p("combustivel", "Combustivel", "Fuel", "GAL", "L", "GAL_L"),
    _p("agua", "Agua doce", "Water", "GAL", "L", "GAL_L"),
    _p("dejetos", "Tanque de dejetos (aguas negras)", "Holding Tank",
       "GAL", "L", "GAL_L"),
    _p("potencia", "Potencia instalada", "HP", "HP", "kW", "HP_KW"),
    _p("motorizacao", "Motorizacao (marca / modelo / qtd.)", "Engine",
       "texto", "texto", None, tipo="texto"),
    _p("motorizacao_det", "Motorizacao (detalhe)", "Engine (cont.)",
       "texto", "texto", None, tipo="texto"),
    _p("vel_max", "Velocidade maxima", "Max Speed", "MPH", "kn", "MPH_KN"),
    _p("vel_cruzeiro", "Velocidade de cruzeiro", "Cruise Speed", "MPH", "kn",
       "MPH_KN"),
    _p("autonomia", "Autonomia", "Range", "NM", "NM", None),
    _p("ff", "Borda livre a proa (FF)", "FF", "ft", "m", "FT_M"),
    _p("fm", "Borda livre a meia-nau (FM)", "FM", "ft", "m", "FT_M"),
    _p("para_brisa", "Altura do para-brisa", "Windshild Height", "ft", "m",
       "FT_M"),
    _p("deck_cl", "Altura maxima do deck na linha de centro",
       "Deck @CL Max Height", "ft", "m", "FT_M"),
    _p("plataforma_wl", "Plataforma de banho: topo ate a linha d'agua",
       "Swim Plat. Top to WL", "ft", "m", "FT_M"),
    _p("balaustre", "Altura do balaustre (corrimao)", "Rail Height", "ft", "m",
       "FT_M"),
]

# Razoes. Calculadas por formula, ou usadas como publicadas se a fonte trouxer.
RAZOES = [
    {"key": "loa_boa", "pt": "Comprimento total (L) / Boca (B)", "en": "LOA/BOA",
     "unid_si": "-"},
    {"key": "dlr", "pt": "Razao deslocamento-comprimento (DLR)", "en": "DLR",
     "unid_si": "-"},
    {"key": "disp_potencia", "pt": "Deslocamento / Potencia", "en": "DISP./HP",
     "unid_si": "kg/kW"},
]

POR_KEY = {p["key"]: p for p in PARAMETROS}
RAZAO_POR_KEY = {r["key"]: r for r in RAZOES}

TODAS_AS_CHAVES = list(POR_KEY) + list(RAZAO_POR_KEY)


def valida_similar(sim, idx):
    """Devolve lista de problemas encontrados num similar. Vazia = ok."""
    erros = []
    nome = sim.get("nome") or f"similar #{idx + 1}"
    if not sim.get("nome"):
        erros.append(f"{nome}: campo 'nome' ausente.")
    sistema = sim.get("sistema")
    if sistema not in ("imperial", "metrico"):
        erros.append(
            f"{nome}: campo 'sistema' deve ser 'imperial' ou 'metrico' "
            f"(recebido: {sistema!r}). Este campo diz em que unidade a FONTE "
            f"publicou os valores; errar corrompe a coluna inteira."
        )
    fontes = sim.get("fontes") or []
    if not fontes:
        erros.append(
            f"{nome}: nenhuma fonte informada. Todo similar precisa de pelo "
            f"menos uma pagina aberta e lida (regra de fidelidade 1 e 2)."
        )
    for f in fontes:
        if not f.get("url"):
            erros.append(f"{nome}: fonte sem 'url'.")
        if not f.get("data_publicacao"):
            erros.append(
                f"{nome}: fonte {f.get('url', '?')} sem 'data_publicacao'. "
                f"Use 'sem data identificavel' se a pagina nao tiver data."
            )
    dados = sim.get("dados") or {}
    if not dados:
        erros.append(f"{nome}: nenhum dado coletado.")
    for k, v in dados.items():
        if k not in POR_KEY and k not in RAZAO_POR_KEY:
            erros.append(f"{nome}: chave desconhecida em 'dados': {k!r}.")
            continue
        p = POR_KEY.get(k) or RAZAO_POR_KEY[k]
        if p.get("tipo") == "texto":
            continue
        if isinstance(v, str):
            erros.append(
                f"{nome}: '{k}' veio como texto ({v!r}). Valores numericos vao "
                f"como numero, sem unidade e sem separador de milhar."
            )
        elif v == 0:
            erros.append(
                f"{nome}: '{k}' veio como 0. Se a fonte nao informa, omita a "
                f"chave em vez de usar zero."
            )
    return erros
