# -*- coding: utf-8 -*-
"""Gera o relatorio PDF de Area de Navegacao da Brana.

Uso minimo:
    python gerar_relatorio.py --nome "Fulano" --partida "Salvador" --chegada "Itacare"

Ver `python gerar_relatorio.py --ajuda-longa` para todas as opcoes.
"""

import argparse
import io
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import navegacao as N  # noqa: E402

from reportlab.lib import colors                                    # noqa: E402
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER               # noqa: E402
from reportlab.lib.pagesizes import A4                              # noqa: E402
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # noqa: E402
from reportlab.lib.units import cm                                  # noqa: E402
from reportlab.pdfbase import pdfmetrics                            # noqa: E402
from reportlab.pdfbase.ttfonts import TTFont                        # noqa: E402
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,  # noqa: E402
                                Table, TableStyle, Image, PageBreak)
from PIL import Image as PILImage                                   # noqa: E402
from pypdf import PdfReader, PdfWriter                              # noqa: E402

# --------------------------------------------------------------------------
# identidade Brana
# --------------------------------------------------------------------------
VERMELHO = colors.HexColor("#9B3133")
OURO = colors.HexColor("#FBF3E3")
GRADE = colors.HexColor("#D9C9A8")
CINZA = colors.HexColor("#595959")
FUNDO_CAIXA = colors.HexColor("#FBF6EC")

MARG_LAT, MARG_TOPO, MARG_BASE = 2.0 * cm, 3.2 * cm, 3.2 * cm
LARG = A4[0] - 2 * MARG_LAT

INSTRUCOES = (
    "Despenda algum tempo refletindo sobre os requisitos e uso da embarcação a ser "
    "desenvolvida. Uma embarcação é uma solução de compromisso entre requisitos "
    "conflitantes, este questionário irá nos ajudar a priorizar estas demandas. "
    "Lembre que um barco precisa de uma missão, tarefa ou propósito a ser cumprido, "
    "este será nosso norte nas escolhas de projeto."
)


def _fontes():
    """Calibri quando existir (padrao Brana); Helvetica como reserva."""
    pastas = [r"C:\Windows\Fonts", "/usr/share/fonts/truetype/msttcorefonts",
              "/Library/Fonts", os.path.expanduser("~/Library/Fonts")]
    arqs = {"Calibri": "calibri.ttf", "Calibri-Bold": "calibrib.ttf",
            "Calibri-Italic": "calibrii.ttf", "Calibri-BoldItalic": "calibriz.ttf"}
    achou = {}
    for nome, arq in arqs.items():
        for pasta in pastas:
            caminho = os.path.join(pasta, arq)
            if os.path.isfile(caminho):
                pdfmetrics.registerFont(TTFont(nome, caminho))
                achou[nome] = True
                break
    if len(achou) == 4:
        pdfmetrics.registerFontFamily("Calibri", normal="Calibri",
                                      bold="Calibri-Bold", italic="Calibri-Italic",
                                      boldItalic="Calibri-BoldItalic")
        return "Calibri", "Calibri-Bold", "Calibri-Italic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


REG, NEG, ITA = _fontes()
ss = getSampleStyleSheet()
S = {
    "titulo": ParagraphStyle("t", parent=ss["Title"], fontName=NEG, fontSize=20,
                             leading=24, textColor=VERMELHO, alignment=0, spaceAfter=1),
    "sub": ParagraphStyle("s", parent=ss["Normal"], fontName=REG, fontSize=11.5,
                          leading=15, textColor=CINZA, spaceAfter=3),
    "ident": ParagraphStyle("id", parent=ss["Normal"], fontName=REG, fontSize=9.5,
                            leading=13, textColor=CINZA, spaceAfter=6),
    "h1": ParagraphStyle("h1", parent=ss["Heading1"], fontName=NEG, fontSize=14,
                         leading=18, textColor=VERMELHO, spaceBefore=11, spaceAfter=4),
    "h2": ParagraphStyle("h2", parent=ss["Heading2"], fontName=NEG, fontSize=11,
                         leading=14.5, textColor=VERMELHO, spaceBefore=8, spaceAfter=3),
    "p": ParagraphStyle("p", parent=ss["Normal"], fontName=REG, fontSize=10,
                        leading=13.2, alignment=TA_JUSTIFY, spaceAfter=4),
    "cap": ParagraphStyle("cap", parent=ss["Normal"], fontName=REG, fontSize=8.2,
                          leading=10.8, alignment=TA_CENTER, textColor=CINZA,
                          spaceBefore=4, spaceAfter=6),
    "cel": ParagraphStyle("cel", parent=ss["Normal"], fontName=REG, fontSize=8.8,
                          leading=11.4),
}
S["li"] = ParagraphStyle("li", parent=S["p"], leftIndent=12, bulletIndent=2, spaceAfter=3)
S["celb"] = ParagraphStyle("celb", parent=S["cel"], fontName=NEG, textColor=colors.white)
S["nota"] = ParagraphStyle("nota", parent=S["p"], fontSize=8.8, leading=11.6,
                           textColor=CINZA)
S["instr"] = ParagraphStyle("instr", parent=S["p"], fontName=ITA, fontSize=9.5,
                            leading=13, textColor=CINZA)

f = N._fmt


def esc(t):
    """Escapa & < > para o mini-XML do reportlab, preservando as poucas tags
    que a skill usa de proposito (<b>, <i>, <br/>)."""
    if t is None:
        return ""
    t = str(t)
    guardadas = (("<b>", "b"), ("</b>", "/b"),
                 ("<i>", "i"), ("</i>", "/i"),
                 ("<br/>", "br/"))
    for tag, marca in guardadas:
        t = t.replace(tag, marca)
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for tag, marca in guardadas:
        t = t.replace(marca, tag)
    return t


def P(t, e="p"):
    return Paragraph(t, S[e])


def LI(t, e="li"):
    return Paragraph(t, S[e], bulletText="\u2022")


def img(nome, larg_cm=None, alt_cm=None):
    """Encaixa a imagem respeitando ao mesmo tempo a largura e a altura maximas.
    Passar so uma das duas equivale a nao limitar a outra."""
    w, h = PILImage.open(nome).size
    larg_max = (larg_cm or 99) * cm
    alt_max = (alt_cm or 99) * cm
    escala = min(larg_max / float(w), alt_max / float(h))
    return Image(nome, width=w * escala, height=h * escala)


def tabela(dados, larguras, centro=()):
    linhas = [[Paragraph(esc(c), S["celb"] if i == 0 else S["cel"]) for c in ln]
              for i, ln in enumerate(dados)]
    t = Table(linhas, colWidths=[w * cm for w in larguras], repeatRows=1)
    cmd = [("BACKGROUND", (0, 0), (-1, 0), VERMELHO),
           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
           ("GRID", (0, 0), (-1, -1), 0.4, GRADE),
           ("TOPPADDING", (0, 0), (-1, -1), 3),
           ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
           ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
           ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
           ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, OURO])]
    for c in centro:
        cmd.append(("ALIGN", (c, 0), (c, -1), "CENTER"))
    t.setStyle(TableStyle(cmd))
    return t


def caixa(titulo, itens, fonte=9.2):
    """Bloco destacado. Uma linha de tabela por paragrafo, para que o reportlab
    possa quebrar a caixa entre paginas - com uma linha so, um texto comprido
    derruba o build."""
    est = ParagraphStyle("bx", parent=S["li"], fontSize=fonte, leading=fonte * 1.33)
    corpo = [Paragraph(esc(titulo), S["h2"])]
    corpo += [Paragraph(esc(x), est, bulletText="•") for x in itens]
    t = Table([[c] for c in corpo], colWidths=[LARG], repeatRows=0)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), FUNDO_CAIXA),
                           ("BOX", (0, 0), (-1, -1), 0.7, GRADE),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, -1), (-1, -1), 8)]))
    return t


def lado_a_lado(imagem, titulo, itens, extra, larg_img_cm, fonte=8.6):
    est = ParagraphStyle("bl", parent=S["li"], fontSize=fonte, leading=fonte * 1.34,
                         leftIndent=10, bulletIndent=1)
    bloco = [Paragraph(titulo, S["h2"])]
    bloco += [Paragraph(x, est, bulletText="\u2022") for x in itens]
    if extra:
        bloco += [Spacer(1, 6),
                  Paragraph(extra, ParagraphStyle("ex", parent=S["nota"],
                                                  fontSize=8.0, leading=10.6))]
    t = Table([[imagem, bloco]], colWidths=[larg_img_cm * cm, LARG - larg_img_cm * cm])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                           ("LEFTPADDING", (0, 0), (0, 0), 0),
                           ("RIGHTPADDING", (0, 0), (0, 0), 7),
                           ("LEFTPADDING", (1, 0), (1, 0), 9),
                           ("RIGHTPADDING", (1, 0), (1, 0), 9),
                           ("TOPPADDING", (1, 0), (1, 0), 2),
                           ("BOTTOMPADDING", (1, 0), (1, 0), 9),
                           ("BACKGROUND", (1, 0), (1, 0), FUNDO_CAIXA),
                           ("BOX", (1, 0), (1, 0), 0.7, GRADE)]))
    return t


def proc(c):
    """Linha de procedencia de uma carta."""
    return ("<b>Carta %s \u2014 %s</b>, escala 1:%s, DHN/CHM \u2013 Marinha do Brasil. "
            "Edição %s, Aviso aos Navegantes %s. Datum %s. Linha tracejada roxa = "
            "derrota aproximada." % (c["numero"], c["titulo"], c["escala"] or "?",
                                     c["edicao"] or "?", c["aviso"] or "?",
                                     c["datum"] or "WGS-84"))


# --------------------------------------------------------------------------
# montagem
# --------------------------------------------------------------------------

def construir(d, destino, timbrado=None):
    """d: dicionario com todos os dados apurados. Escreve o PDF em `destino`."""
    total_paginas = [10]

    def cabecalho(canv, doc):
        canv.saveState()
        canv.setFont(REG, 8.2)
        canv.setFillColor(CINZA)
        canv.drawRightString(A4[0] - MARG_LAT, A4[1] - 44,
                             "Área de Navegação  \u2014  %s \u2194 %s"
                             % (d["partida_curto"], d["chegada_curto"]))
        canv.drawRightString(A4[0] - MARG_LAT, A4[1] - 56,
                             "página %d de %d" % (doc.page, total_paginas[0]))
        canv.restoreState()

    h = []
    a, b = d["setores"][0], d["setores"][-1]
    ex = d["extremos"]

    # ---------------------------------------------------------------- 1 resumo
    h.append(P("Área de Navegação \u2014 %s \u2194 %s"
               % (d["partida_curto"], d["chegada_curto"]), "titulo"))
    h.append(P("Caso de Uso \u00b7 Bloco 3: área de navegação, derrota, clima, maré "
               "e classificação da embarcação", "sub"))
    h.append(P("<b>Preenchido por:</b> %s &nbsp;&nbsp;|&nbsp;&nbsp; <b>Data:</b> %s "
               "&nbsp;&nbsp;|&nbsp;&nbsp; Cartas náuticas da DHN/CHM \u2014 Marinha do "
               "Brasil" % (d["nome"], d["data"]), "ident"))
    h.append(P("Resumo", "h1"))
    h.append(tabela([
        ["A travessia em números", ""],
        ["Ponto inicial", "%s \u2014 %s / %s" % (d["partida"], N.gms(d["wps"][0][0], "lat"),
                                                 N.gms(d["wps"][0][1], "lon"))],
        ["Ponto final", "%s \u2014 %s / %s" % (d["chegada"], N.gms(d["wps"][-1][0], "lat"),
                                               N.gms(d["wps"][-1][1], "lon"))],
        ["Distância pela derrota", "<b>%s MN (%s km)</b>, em %d pernas"
         % (f(d["total_mn"]), f(d["total_mn"] * N.MN_KM, 0, True), len(d["pernas"]))],
        ["Distância em linha reta", "%s MN (%s km)"
         % (f(d["reta_mn"]), f(d["reta_mn"] * N.MN_KM, 0, True))],
        ["Rumo médio", "<b>%03.0f\u00b0 verdadeiro</b>%s" % (d["reta_rumo"],
         (" \u00b7 %03.0f\u00b0 na bússola (declinação %s\u00b0 W)"
          % ((d["reta_rumo"] + d["declinacao"]) % 360, f(d["declinacao"], 0)))
         if d["declinacao"] else "")],
        ["Maior afastamento da costa", "%s" % (("cerca de %s MN (%s km)"
         % (f(d["afastamento"]), f(d["afastamento"] * N.MN_KM, 0)))
         if d["afastamento"] is not None
         else "N/A \u2014 não determinado na carta")],
    ], [4.7, 12.3]))
    h.append(Spacer(1, 6))
    h.append(tabela(
        [["Velocidade", "Equivalente", "Tempo na derrota (%s MN)" % f(d["total_mn"]), "Observação"]] +
        [["<b>%g nós</b>" % v, "%s km/h" % f(kmh, 0), "<b>%s</b>" % txt,
          "mais de um dia de luz" if horas > 12 else
          ("uma manhã" if horas <= 5 else "um dia inteiro")]
         for v, kmh, horas, txt in d["tempos"]],
        [2.3, 2.2, 4.6, 7.9], centro=(0, 1, 2)))
    h.append(Spacer(1, 8))
    resumo = [
        "<b>Classificação NORMAM: %s</b> (NORMAM-211/DPC, esporte e recreio). %s "
        "<b>Habilitação do condutor: %s.</b> Item 8."
        % (("navegação " + d["normam"][0].upper()) if d["normam"][0] else "N/A",
           d["normam"][2], d["normam"][1] or "N/A"),
        "<b>Categoria de projeto ISO: %s recomendada</b>%s%s. Item 9."
        % (d["iso"][0],
           ("; a Categoria %s é o mínimo e só serve na janela boa do ano, com previsão "
            "confirmada" % d["iso"][1]) if d["iso"][1] and d["iso"][1] != d["iso"][0]
           else "",
           ("; para aguentar o pico já registrado seria a %s" % d["iso"][2])
           if d["iso"][2] and d["iso"][2] != d["iso"][0] else ""),
        "<b>Janela operacional: %s.</b> Pior época: %s. Item 9."
        % (a["melhor_epoca"] or "N/A", a["pior_epoca"] or "N/A"),
        "<b>Restrição de calado:</b> %s Item 7." % d["calado_resumo"],
        "<b>Vento e mar:</b> vento médio de %s a %s nós (%s a %s km/h) ao longo do ano; "
        "onda média de %s a %s m. Vento máximo já registrado: %s nós (%s km/h). Onda "
        "máxima: %s m. Item 6."
        % (f(d["vento_min"]), f(d["vento_max"]), f(d["vento_min"] * N.MN_KM, 0),
           f(d["vento_max"] * N.MN_KM, 0), f(d["onda_min"]), f(d["onda_max"]),
           f(ex["vento_max_kn"]), f((ex["vento_max_kn"] or 0) * N.MN_KM, 0),
           f(ex["onda_max_m"], 2)),
        "<b>Cartas usadas:</b> %s. Item 10." % d["cartas_resumo"],
    ]
    h.append(caixa("Respostas rápidas", resumo))
    h.append(Spacer(1, 5))
    h.append(P("Este documento não substitui a carta náutica oficial atualizada e a "
               "derrota traçada é ilustrativa. Campos sem resposta aparecem como "
               "<b>N/A</b> \u2014 nada foi inventado. Fontes e ressalvas no item 10.",
               "nota"))

    # ---------------------------------------------------------------- 2 derrota
    h.append(PageBreak())
    h.append(P("Instruções", "h1"))
    h.append(P(INSTRUCOES, "instr"))
    h.append(P("1. Região", "h1"))
    h.append(P(d["regiao"]))
    h.append(P("2. Derrota habitual", "h1"))
    h.append(P("O <b>rumo verdadeiro</b> é o ângulo medido a partir do norte geográfico, "
               "que é o norte da carta. O <b>rumo na bússola</b> (rumo magnético) é o que "
               "se lê na agulha de bordo: %s" % (
                   ("some %s graus ao rumo verdadeiro (declinação magnética lida na rosa "
                    "das cartas)." % f(d["declinacao"], 0)) if d["declinacao"] else
                   "confira a declinação magnética na rosa impressa na carta e some ao "
                   "rumo verdadeiro.")))
    linhas = [["Nº", "Ponto de passagem", "Latitude", "Longitude", "Rumo<br/>verd.",
               "Rumo<br/>bússola", "MN", "Acum.<br/>(MN)"]]
    for i, w in enumerate(d["wps"]):
        perna = d["pernas"][i] if i < len(d["pernas"]) else None
        primeiro, ultimo = i == 0, i == len(d["wps"]) - 1
        rot = w[2] if (primeiro or ultimo) else (w[2] or "Ponto intermediário")
        if primeiro:
            rot = "<b>Partida: %s</b>" % rot
        if ultimo:
            rot = "<b>Chegada: %s</b>" % rot
        linhas.append([
            "\u2014" if (primeiro or ultimo) else "P%d" % i, rot,
            N.gms(w[0], "lat"), N.gms(w[1], "lon"),
            "%03.0f\u00b0" % perna["rumo_v"] if perna else "\u2014",
            ("%03.0f\u00b0" % perna["rumo_m"]) if perna and perna["rumo_m"] is not None else "\u2014",
            f(perna["mn"]) if perna else "\u2014",
            ("<b>%s</b>" % f(d["total_mn"])) if ultimo
            else (f(0.0) if primeiro else f(d["pernas"][i - 1]["acumulado"])),
        ])
    h.append(tabela(linhas, [0.8, 4.2, 2.1, 2.3, 1.6, 1.8, 1.1, 1.6],
                    centro=(0, 2, 3, 4, 5, 6, 7)))
    h.append(P("Datum WGS-84. O rumo e as milhas de cada linha referem-se ao trecho "
               "<i>até o ponto seguinte</i>; a coluna Acum. é a distância já percorrida "
               "desde a partida até aquele ponto. No sentido contrário, percorra os "
               "pontos de baixo para cima e subtraia 180 graus de cada rumo.", "nota"))

    if d.get("conferencia_itens"):
        h.append(P("<b>Conferência da derrota.</b> " +
                   " ".join(d["conferencia_itens"]), "nota"))

    # ---------------------------------------------------------------- 3 saida
    h.append(PageBreak())
    h.append(P("3. Saída \u2014 %s" % d["partida_curto"], "h1"))
    h.append(img(d["carta_saida"]["arquivo"], larg_cm=14.3, alt_cm=13.9))
    h.append(P(proc(d["carta_saida"]), "cap"))
    h.append(caixa("Pontos de atenção na saída", d["atencao_saida"], fonte=9.0))

    # ---------------------------------------------------------------- 4 percurso
    h.append(PageBreak())
    h.append(P("4. Percurso", "h1"))
    im = d["carta_percurso"]["arquivo"]
    w, hh = PILImage.open(im).size
    if hh / float(w) > 1.35:          # carta alta: texto ao lado
        h.append(lado_a_lado(img(im, alt_cm=20.6, larg_cm=9.5), "Pontos de atenção no percurso",
                             d["atencao_percurso"], proc(d["carta_percurso"]), 9.5))
    else:
        h.append(img(im, larg_cm=LARG / cm, alt_cm=13.9))
        h.append(P(proc(d["carta_percurso"]), "cap"))
        h.append(caixa("Pontos de atenção no percurso", d["atencao_percurso"], fonte=9.0))

    # ---------------------------------------------------------------- 5 chegada
    h.append(PageBreak())
    h.append(P("5. Chegada \u2014 %s" % d["chegada_curto"], "h1"))
    h.append(img(d["carta_chegada"]["arquivo"], larg_cm=14.3, alt_cm=13.9))
    h.append(P(proc(d["carta_chegada"]), "cap"))
    h.append(caixa("Pontos de atenção na chegada", d["atencao_chegada"], fonte=9.0))

    # ---------------------------------------------------------------- 6 clima
    h.append(PageBreak())
    h.append(P("6. Clima, vento, ondas e chuva", "h1"))
    h.append(P(d["clima_texto"]))
    cab = ["Mês", "Vento médio<br/>(nós)", "Vento médio<br/>(km/h)",
           "De onde vem<br/>o vento", "Onda em<br/>%s (m)" % d["partida_curto"],
           "Onda em<br/>%s (m)" % d["chegada_curto"],
           "Chuva em<br/>%s (mm)" % d["partida_curto"],
           "Chuva em<br/>%s (mm)" % d["chegada_curto"]]
    corpo = []
    for m in d["mensal"]:
        faixa = (f(m["vento_min"]) if m["vento_min"] == m["vento_max"]
                 else "%s a %s" % (f(m["vento_min"]), f(m["vento_max"])))
        k1 = f((m["vento_min"] or 0) * N.MN_KM, 0)
        k2 = f((m["vento_max"] or 0) * N.MN_KM, 0)
        kmh = k1 if k1 == k2 else "%s a %s" % (k1, k2)
        corpo.append([m["mes"], faixa, kmh, " / ".join(m["direcoes"][:2]),
                      f(m["onda_a"], 2), f(m["onda_b"], 2),
                      f(m["chuva_a"], 0), f(m["chuva_b"], 0)])
    h.append(tabela([cab] + corpo, [1.2, 2.1, 2.0, 2.1, 2.4, 2.4, 2.1, 2.1],
                    centro=tuple(range(8))))
    h.append(P("\u201cOnda\u201d é a altura significativa (Hs): a média do terço de ondas "
               "mais altas, que é o número usado nas previsões. Uma onda isolada pode "
               "chegar ao dobro disso.", "nota"))
    for item in d["clima_itens"]:
        h.append(LI(item))

    # ---------------------------------------------------------------- 7 mare
    h.append(PageBreak())
    h.append(P("7. Maré, corrente e restrição de calado", "h1"))
    h.append(P("Maré", "h2"))
    ma, mb = a["mare"], b["mare"]
    h.append(tabela([
        ["", d["partida_curto"], d["chegada_curto"]],
        ["Marégrafo de referência", ma["maregrafo"] or "N/A", mb["maregrafo"] or "N/A"],
        ["Tipo de maré", ma["tipo"] or "N/A", mb["tipo"] or "N/A"],
        ["Variação em maré de sizígia (lua cheia e lua nova)",
         "<b>%s m</b>" % f(ma["sizigia"], 2), "<b>%s m</b>" % f(mb["sizigia"], 2)],
        ["Variação em maré de quadratura (lua crescente e minguante)",
         "%s m" % f(ma["quadratura"], 2), "%s m" % f(mb["quadratura"], 2)],
        ["Variação média de um dia", "%s m" % f(ma["diaria"], 2), "%s m" % f(mb["diaria"], 2)],
        ["Maior variação já medida em 24 h", "%s m" % f(ma["max24"], 2),
         "%s m" % f(mb["max24"], 2)],
    ], [6.2, 5.4, 5.4], centro=(1, 2)))
    h.append(P("<b>Para a altura da maré em uma data e hora específicas, use as Tábuas "
               "das Marés do CHM</b> para o porto de referência mais próximo. Isso é "
               "obrigatório para cruzar barra de rio ou baixio.", "nota"))
    h.append(P("Corrente", "h2"))
    for s in d["setores"]:
        if s["correntes"]:
            h.append(LI("<b>%s:</b> %s" % (s["nome"].split("\u2013")[0].strip(),
                                           s["correntes"])))
    h.append(P("Restrição de calado", "h2"))
    h.append(P("Calado é a parte do casco que fica debaixo d'água. As profundidades das "
               "cartas já estão no pior caso: são reduzidas ao nível da baixa-mar média "
               "de sizígia, com a maré bem baixa. Na maior parte do tempo há mais água "
               "do que o número impresso.", "nota"))
    h.append(tabela(d["calado_tabela"], [4.4, 5.2, 7.4]))
    h.append(P(d["calado_nota"], "nota"))

    # ---------------------------------------------------------------- 8 NORMAM
    h.append(PageBreak())
    h.append(P("8. Classificação da embarcação pela NORMAM", "h1"))
    h.append(P("A área de navegação determina duas coisas diferentes, que não devem ser "
               "confundidas: a <b>classificação NORMAM</b> (registro na Marinha do Brasil "
               "e habilitação de quem conduz) e a <b>categoria de projeto ISO</b> "
               "(item 9). As duas precisam ser atendidas."))
    h.append(P("Para embarcação de esporte e/ou recreio vale a <b>NORMAM-211/DPC</b>, que "
               "classifica as embarcações por área de navegação:"))
    h.append(tabela(
        [["Área de navegação", "Definição da norma", "Habilitação exigida"]] +
        [[("<b>%s</b>" % nome) if nome == d["normam"][0] else nome,
          ("<b>%s</b>" % defin) if nome == d["normam"][0] else defin,
          ("<b>%s</b>" % hab) if nome == d["normam"][0] else hab]
         for nome, defin, hab in N.NORMAM],
        [3.0, 9.6, 4.4], centro=(2,)))
    h.append(Spacer(1, 8))
    h.append(caixa("Resposta para esta derrota", d["normam_itens"], fonte=9.0))

    # ---------------------------------------------------------------- 9 ISO
    h.append(PageBreak())
    h.append(P("9. Categoria de projeto ISO e janela operacional", "h1"))
    h.append(P("A norma <b>ISO 12217</b> (Small craft \u2014 Stability and buoyancy "
               "assessment and categorization), a mesma usada na marcação CE europeia, "
               "define quatro categorias de projeto pelo vento e pela altura de onda que "
               "a embarcação tem de suportar:"))
    linhas = [["Categoria", "Vento até", "Onda (Hs) até", "Uso previsto"]]
    for c, nome, vl, ol, uso in reversed(N.ISO):
        destaque = c in (d["iso"][0], d["iso"][1])
        v = "acima de 40 nós (74 km/h)" if vl is None else "%d nós (%s km/h)" % (
            vl, f(vl * N.MN_KM, 0))
        o = "4 m ou mais" if ol is None else ("%s m" % f(ol, 1) + (
            " (onda isolada até 0,5 m)" if c == "D" else ""))
        cel = ["%s \u2014 %s" % (c, nome), v, o, uso]
        h.append(None) if False else None
        linhas.append(["<b>%s</b>" % x for x in cel] if destaque else cel)
    h.append(tabela(linhas, [3.0, 3.5, 3.8, 6.7], centro=(1, 2)))
    h.append(Spacer(1, 7))
    h.append(caixa("Resposta para esta derrota", d["iso_itens"], fonte=9.0))
    h.append(P("Janela operacional", "h2"))
    h.append(tabela([["Setor", "Melhor época", "Pior época", "Observação operacional"]] +
                    [[s["codigo"], s["melhor_epoca"] or "N/A", s["pior_epoca"] or "N/A",
                      s["obs_operacional"] or "\u2014"] for s in d["setores"]],
                    [1.4, 4.6, 4.0, 7.0]))

    # ---------------------------------------------------------------- 10 fontes
    h.append(PageBreak())
    h.append(P("10. Cartas náuticas utilizadas e fontes", "h1"))
    h.append(tabela([["Carta", "Título", "Escala", "Uso neste documento",
                      "Edição / Aviso aos Navegantes"]] + d["cartas_tabela"],
                    [1.8, 3.6, 2.0, 4.1, 4.6], centro=(0, 2)))
    h.append(P("Todas do Centro de Hidrografia da Marinha (CHM), da Diretoria de "
               "Hidrografia e Navegação (DHN) da Marinha do Brasil. Profundidades em "
               "metros, reduzidas ao nível da baixa-mar média de sizígia. Datum WGS-84, "
               "projeção Mercator. Os números são os das cartas da DHN; o rodapé de cada "
               "imagem traz o identificador do painel do arquivo raster.", "nota"))
    h.append(P("Fontes", "h2"))
    for item in d["fontes"]:
        h.append(LI(item, "nota"))
    h.append(Spacer(1, 6))
    h.append(caixa("Avisos importantes", [
        "<b>Este documento não substitui a carta náutica oficial atualizada.</b> As "
        "imagens são recortes reescalados, sem a margem da carta, e não recebem as "
        "correções semanais dos Avisos aos Navegantes. Para navegar de verdade: carta em "
        "papel corrigida ou ECDIS em dia.",
        "<b>A derrota traçada é ilustrativa.</b> Não é plano de navegação aprovado e não "
        "considera o barco, o calado nem as condições do dia. <b>Datum WGS-84</b> na "
        "carta e no GPS.",
        "<b>Direitos autorais da DHN.</b> As cartas raster do CHM não podem ser "
        "reproduzidas, compiladas nem usadas como base de produtos derivados para fins "
        "comerciais.",
    ], fonte=8.8))

    # ---------------------------------------------------------------- build
    def desenhar_pdf():
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4, leftMargin=MARG_LAT, rightMargin=MARG_LAT,
            topMargin=MARG_TOPO, bottomMargin=MARG_BASE,
            title="Area de Navegacao - %s x %s" % (N.sem_acento(d["partida_curto"]),
                                                   N.sem_acento(d["chegada_curto"])),
            author="Brana Projetos Navais",
            subject="Derrota, clima, mare, corrente e classificacao NORMAM / ISO")
        doc.build(list(h), onFirstPage=cabecalho, onLaterPages=cabecalho)
        return buf.getvalue()

    total_paginas[0] = len(PdfReader(io.BytesIO(desenhar_pdf())).pages)
    conteudo = PdfReader(io.BytesIO(desenhar_pdf()))

    escritor = PdfWriter()
    for pagina in conteudo.pages:
        if timbrado and os.path.isfile(timbrado):
            fundo = PdfReader(timbrado).pages[0]
            fundo.merge_page(pagina)
            escritor.add_page(fundo)
        else:
            escritor.add_page(pagina)
    with open(destino, "wb") as fp:
        escritor.write(fp)
    return total_paginas[0]


# --------------------------------------------------------------------------
# apuracao dos dados
# --------------------------------------------------------------------------

def curto(rotulo):
    return (rotulo or "").split(",")[0].split("(")[0].strip() or rotulo


def apurar(args):
    N.abrir_acervo(args.dados)
    indice = N.C.carregar_indice()

    partida = N.resolver(args.partida, indice)
    chegada = N.resolver(args.chegada, indice)
    wps = [partida]
    for w in (args.wp or []):
        texto, _, rot = w.partition(":")
        lat, lon, _r = N.resolver(texto, indice)
        wps.append((lat, lon, rot.strip() or None))
    wps.append(chegada)

    carta_perc = N.carta_do_percurso(wps, indice)
    declinacao = args.declinacao
    if declinacao is None:
        declinacao = N.declinacao_da_carta(carta_perc["numero"], indice)

    lista_pernas, total = N.pernas(wps, declinacao)
    reta_rumo, reta_mn = N.rumo_e_distancia(wps[0][0], wps[0][1], wps[-1][0], wps[-1][1])

    pasta = os.path.join(args.saida, "cartas")
    os.makedirs(pasta, exist_ok=True)
    base = N.sem_acento(curto(partida[2]) + "_" + curto(chegada[2]))

    cp = N.desenhar(carta_perc["numero"], wps,
                    os.path.join(pasta, base + "_percurso.png"),
                    margem_km=args.margem_km, largura=1800,
                    rotulo_a=curto(partida[2]), rotulo_b=curto(chegada[2]),
                    nota="Derrota aproximada - %s MN em %d pernas | PERCURSO"
                         % (f(total), len(lista_pernas)))

    def ponta(ponto, nome, rot_a, rot_b):
        escolhida, cx = N.carta_para_caixa(ponto, wps, args.zoom_km, indice)
        return N.desenhar(escolhida["numero"], wps,
                          os.path.join(pasta, base + "_" + nome + ".png"),
                          caixa_graus=cx, largura=2000,
                          rotulo_a=rot_a, rotulo_b=rot_b,
                          nota="Derrota aproximada | %s" % nome.upper())

    cs = ponta(partida, "saida", "Partida: " + curto(partida[2]), None)
    cc = ponta(chegada, "chegada", None, "Chegada: " + curto(chegada[2]))

    conferencia = N.conferir_derrota(carta_perc["numero"], wps, indice=indice)
    if args.afastamento_mn is None and conferencia.get("afastamento_mn") is not None:
        args.afastamento_mn = round(conferencia["afastamento_mn"], 1)

    setores_todos = N.carregar_setores()
    setores = N.setores_da_rota(wps, setores_todos)
    mensal = N.resumo_mensal(setores)
    ex = N.extremos(setores)
    iso = N.categoria_iso(ex)
    normam = N.classificacao_normam(args.afastamento_mn, args.so_abrigado)

    ventos = [m["vento_min"] for m in mensal if m["vento_min"]]
    ventos += [m["vento_max"] for m in mensal if m["vento_max"]]
    ondas = [m[k] for m in mensal for k in ("onda_a", "onda_b") if m[k]]
    if not ventos or not ondas:
        raise N.ErroDeUso(
            "O banco de clima nao trouxe serie de vento ou de onda para os setores %s. "
            "Confira se os pontos estao no litoral brasileiro."
            % ", ".join(s["codigo"] for s in setores))

    a, b = setores[0], setores[-1]
    regiao = ("A derrota (o trajeto habitual) atravessa %d %s do banco de clima nautico "
              "da costa brasileira: %s. Areas de previsao do tempo da Marinha "
              "(METAREA V): %s." % (
                  len(setores), "setor" if len(setores) == 1 else "setores",
                  "; ".join("<b>%s</b> — %s" % (s["codigo"], s["nome"])
                            for s in setores),
                  " e ".join(sorted({s["metarea"] for s in setores if s["metarea"]}))
                  or "N/A"))
    regiao = (regiao.replace("nautico", "náutico").replace("Areas", "Áreas")
              .replace("previsao", "previsão"))

    # a derrota mistura hidrovia interior (setores R) com litoral (setores C)?
    tipos = {s["codigo"][0] for s in setores}
    aviso_rota = None
    if len(tipos) > 1:
        aviso_rota = ("<b>Atenção:</b> a derrota mistura setores de hidrovia interior "
                      "(R) com setores costeiros (C). Confirme que existe caminho "
                      "navegável de verdade entre os dois pontos antes de usar este "
                      "relatório — a linha traçada é geométrica, não hidrográfica.")
    elif reta_mn > 400:
        aviso_rota = ("<b>Atenção:</b> a derrota tem %s MN. Numa distância dessas a "
                      "carta do percurso é de escala pequena e serve só para "
                      "planejamento; divida a viagem em etapas para ter detalhe."
                      % f(reta_mn))
    if aviso_rota:
        regiao = regiao + " " + aviso_rota

    usados = set()

    def alertas(setor, extras, limite):
        out = []
        for x in setor["alertas"]:
            if x not in usados and len(out) < limite:
                usados.add(x)
                out.append(x)
        out += list(extras or [])
        if not out:
            out = ["Sem alerta especifico no banco de clima para este setor. Confira a "
                   "carta e o Roteiro da DHN antes de navegar."]
        return out

    at_saida = alertas(a, args.atencao_saida, 5)
    at_chegada = alertas(b, args.atencao_chegada, 5)
    restantes = []
    for s in setores:
        for x in s["alertas"]:
            if x not in usados:
                usados.add(x)
                restantes.append(x)
    at_percurso = restantes[:6] or [x for s in setores for x in s["sistemas"]][:5]
    at_percurso = list(at_percurso) + list(args.atencao_percurso or [])
    at_percurso.append(
        "A linha tracejada é loxodrômica (rumo constante): ela ignora "
        "profundidade, perigos isolados, áreas restritas e balizamento. Confira "
        "cada perna na carta antes de adotar.")

    clima_texto = ("O tempo da região é governado pelos sistemas que o banco "
                   "de clima náutico lista para os setores da derrota: %s"
                   % " ".join(x if x.endswith(".") else x + "."
                              for x in a["sistemas"][:3]))
    clima_itens = [
        "<b>Vento.</b> A média mensal fica entre %s e %s nós (%s a %s km/h) ao "
        "longo do ano. O maior vento de uma hora já registrado no mar aberto dos "
        "setores da rota foi de <b>%s nós (%s km/h)</b>, em %s. O p99 (valor "
        "superado em 1%% das horas) chega a %s nós (%s km/h)."
        % (f(min(ventos)), f(max(ventos)), f(min(ventos) * N.MN_KM, 0),
           f(max(ventos) * N.MN_KM, 0), f(ex["vento_max_kn"]),
           f((ex["vento_max_kn"] or 0) * N.MN_KM, 0), ex["vento_max_mes"] or "N/A",
           f(ex["vento_p99_kn"]), f((ex["vento_p99_kn"] or 0) * N.MN_KM, 0)),
        "<b>Ondas.</b> A altura significativa média varia de %s a %s m ao longo do "
        "ano. A maior onda registrada nos setores da rota foi de <b>%s m</b>, em %s "
        "(setor %s)."
        % (f(min(ondas), 2), f(max(ondas), 2), f(ex["onda_max_m"], 2),
           ex["onda_max_mes"] or "N/A", ex["onda_max_setor"] or "N/A"),
        "<b>Chuva.</b> %s" % " ".join(
            "O setor %s acumula %s mm por ano." % (s["codigo"], f(s["chuva_anual"], 0, True))
            for s in setores if s["chuva_anual"]),
        "<b>Janela.</b> Melhor época em %s: %s. Pior época: %s.%s"
        % (a["codigo"], a["melhor_epoca"] or "N/A", a["pior_epoca"] or "N/A",
           (" " + a["obs_operacional"]) if a["obs_operacional"] else ""),
    ]

    calado_tabela = [
        ["Trecho", "Profundidade", "Restrição de calado"],
        ["Derrota em mar aberto",
         "ver as sondagens impressas na carta do percurso (item 4)",
         "Nenhuma restrição conhecida para embarcação de recreio "
         "ou pesca"],
        ["Saída e chegada (portos, barras e canais)",
         "ver as cartas dos itens 3 e 5",
         "É onde a restrição aparece; confirme na carta de maior escala "
         "e na Tábua das Marés"]]
    for linha in (args.calado_linha or []):
        calado_tabela.append([c.strip() for c in linha.split("|")][:3])
    if args.calado_max:
        calado_nota = ("<b>Calado máximo admissível na derrota: %s.</b> Valor "
                       "informado por quem preencheu; confirme na carta e com a "
                       "autoridade local." % args.calado_max)
        calado_resumo = "calado máximo admissível de %s. " % args.calado_max
    else:
        calado_nota = ("<b>Calado máximo admissível: N/A</b> — não "
                       "informado. Em mar aberto a derrota não impõe "
                       "restrição; o limite real fica nas pontas (portos, "
                       "barras e canais). Meça as sondagens nas cartas dos itens 3 "
                       "e 5 e confirme localmente antes de fixar o calado de projeto.")
        calado_resumo = ("nenhuma em mar aberto; o limite real fica nas pontas (portos, "
                         "barras e canais) e ainda é <b>N/A</b>. ")

    cartas = [(cs, "Carta da saída (item 3)"),
              (cp, "Carta do percurso (item 4)"),
              (cc, "Carta da chegada (item 5)")]
    vistas, cartas_tabela = {}, []
    for c, uso in cartas:
        if c["numero"] in vistas:
            vistas[c["numero"]][3] += "; " + uso[0].lower() + uso[1:]
            continue
        num, tit = N.carta_oficial(c["numero"], c["titulo"])
        linha = ["<b>%s</b>" % num, tit, N.escala_br(c["escala"]),
                 uso, "Ed. %s · Aviso %s" % (c["edicao"] or "?", c["aviso"] or "?")]
        vistas[c["numero"]] = linha
        cartas_tabela.append(linha)
    meio = wps[len(wps) // 2]
    for cand in N.cartas_que_cobrem(meio[0], meio[1], indice):
        if len(cartas_tabela) >= 6:
            break
        if cand["numero"] in vistas:
            continue
        vistas[cand["numero"]] = True
        num, tit = N.carta_oficial(cand["numero"], cand.get("titulo") or "")
        cartas_tabela.append(["<b>%s</b>" % num, tit,
                              N.escala_br(cand.get("escala")),
                              "Planejamento geral da costa",
                              "Aviso %s" % (cand.get("aviso") or "?")])

    fontes = [
        "<b>Cartas, profundidades, faróis, balizamento e perigos:</b> Diretoria de "
        "Hidrografia e Navegação (DHN) / Centro de Hidrografia da Marinha "
        "(CHM) — Marinha do Brasil, cartas raster oficiais em formato BSB/KAP "
        "(tabela acima; edições e Avisos aos Navegantes também carimbados "
        "no rodapé de cada imagem). <b>Tábuas das Marés do CHM</b> para "
        "altura de maré em data e hora específicas.",
        "<b>Vento, ondas, chuva, corrente e maré:</b> “Clima Náutico do "
        "Brasil — Regime de Ventos, Chuvas e Marés por Região”, %s "
        "%s. Vento e onda de mar aberto em pontos de grade de reanálise; vento "
        "medido em terra em estações de superfície; maré em "
        "marégrafos observados (%s)."
        % ("setor" if len(setores) == 1 else "setores",
           " e ".join("%s (%s)" % (s["codigo"], s["nome"]) for s in setores),
           ", ".join(sorted({s["mare"]["maregrafo"] for s in setores
                             if s["mare"]["maregrafo"]})) or "N/A"),
        "<b>Classificação da embarcação:</b> NORMAM-211/DPC — "
        "Normas da Autoridade Marítima para Embarcações de Esporte e/ou "
        "Recreio, Diretoria de Portos e Costas, Marinha do Brasil, Seção II "
        "(Áreas de Navegação, item 2.15) e Seção V (itens 4.33 "
        "a 4.35). Para uso comercial vale a NORMAM-201/DPC — Embarcações "
        "Empregadas na Navegação em Mar Aberto. ISO 12217 — Small craft: "
        "stability and buoyancy assessment and categorization, categorias A, B, C e D "
        "(mesmas definições da Diretiva 2013/53/UE).",
        "<b>Cálculos deste documento:</b> distâncias e rumos por "
        "loxodrômica (rumo constante) sobre datum WGS-84; 1 nó = 1,852 km/h. "
        "Resíduo do georreferenciamento das cartas: %s px (percurso), %s px "
        "(saída), %s px (chegada)."
        % (f(cp["residuo_px"], 2), f(cs["residuo_px"], 2), f(cc["residuo_px"], 2)),
    ]

    normam_itens = []
    if normam[0]:
        normam_itens.append("<b>Classificação: NAVEGAÇÃO %s.</b> %s"
                            % (normam[0].upper(), normam[2]))
        normam_itens.append("<b>Habilitação do condutor: %s.</b>" % normam[1])
        normam_itens.append(
            "<b>Equipamentos:</b> os da tabela da NORMAM-211/DPC para a "
            "classificação %s (Seção V). Desde 1º de junho de "
            "2024 a embarcação deve portar todos os itens da "
            "classificação que consta do seu TIE (Título de "
            "Inscrição de Embarcação), independentemente da "
            "navegação que estiver fazendo naquele dia." % normam[0].lower())
    else:
        normam_itens.append("<b>Classificação: N/A.</b> %s" % normam[2])
    normam_itens.append(
        "<b>Porte pela NORMAM-211:</b> miúda até 6 m; médio porte abaixo "
        "de 24 m; grande porte ou iate a partir de 24 m. O porte define os quadros e "
        "equipamentos obrigatórios a bordo. <b>Porte desta embarcação: "
        "N/A</b> — depende do bloco 7 do Caso de Uso (Dimensões Principais).")
    normam_itens.append(
        "<b>Se o uso for comercial</b> (transporte de passageiros ou carga, turismo, "
        "pesca profissional), a NORMAM-211 não se aplica: vale a "
        "<b>NORMAM-201/DPC — Embarcações Empregadas na Navegação "
        "em Mar Aberto</b>. Nesse caso a área de navegação e a lista de "
        "equipamentos saem do TIE emitido pela Capitania dos Portos.")

    iso_itens = [
        "<b>Categoria %s é a recomendada.</b> A condição de projeto usada é o p99 "
        "(o valor superado em 1%% das horas) dos setores da rota: vento de %s nós "
        "(%s km/h) e onda de %s m."
        % (iso[0], f(ex["vento_p99_kn"]), f((ex["vento_p99_kn"] or 0) * N.MN_KM, 0),
           f(ex["onda_p99_m"], 2))]
    if iso[1] and iso[1] != iso[0]:
        iso_itens.append(
            "<b>Categoria %s é o mínimo aceitável</b> — e só serve para quem "
            "navega na metade mais calma do ano, com previsão confirmada e a regra de "
            "não sair com onda acima do limite da categoria. Nessa janela a onda "
            "típica é de %s m e o vento p90 é de %s nós (%s km/h)."
            % (iso[1], f(ex["onda_janela_m"], 2), f(ex["vento_p90_kn"]),
               f((ex["vento_p90_kn"] or 0) * N.MN_KM, 0)))
    if iso[2] and iso[2] != iso[0]:
        iso_itens.append(
            "<b>Se o barco tiver de aguentar o pico já registrado, suba para a "
            "categoria %s.</b> O maior vento de uma hora da série foi de %s nós "
            "(%s km/h) e a maior onda foi de %s m — acima do limite da categoria %s. "
            "São valores extremos e raros; a decisão é de projeto."
            % (iso[2], f(ex["vento_max_kn"]), f((ex["vento_max_kn"] or 0) * N.MN_KM, 0),
               f(ex["onda_max_m"], 2), iso[0]))
    iso_itens.append(
        "A categoria ISO é de <b>projeto e construção</b> do barco; a "
        "classificação NORMAM é de <b>registro e habilitação</b>. "
        "São sistemas diferentes e os dois precisam ser atendidos.")

    itens_conferencia = []
    if conferencia.get("afastamento_mn") is not None:
        la, lo = conferencia["afastamento_em"]
        itens_conferencia.append(
            "Afastamento máximo da costa: <b>%s MN</b>, medido pixel a pixel no raster "
            "das cartas, em %s / %s — é esse número que define a área de navegação da "
            "NORMAM (item 8)." % (f(conferencia["afastamento_mn"]),
                                  N.gms(la, "lat"), N.gms(lo, "lon")))
    if conferencia.get("km_raso", 0) > 0.5:
        itens_conferencia.append(
            "%s km correm pela faixa de água rasa da carta (a tinta azul): confira a "
            "sondagem contra o calado." % f(conferencia["km_raso"], 1))
    if conferencia.get("problemas"):
        for p in conferencia["problemas"]:
            itens_conferencia.append(
                "<b>ATENÇÃO: a perna %d passa por TERRA</b> por %s km, a partir de "
                "%s / %s. Acrescente um ponto intermediário para desviar."
                % (p["perna"], f(p["extensao_km"], 1), N.gms(p["lat"], "lat"),
                   N.gms(p["lon"], "lon")))
    elif itens_conferencia:
        itens_conferencia.append(
            "Nenhuma perna passa por terra, conferido nas cartas %s."
            % ", ".join(N.carta_oficial(n, "")[0]
                        for n in sorted(conferencia.get("cartas", {}))))

    from datetime import date
    resumo_cartas = []
    for c in (cs, cp, cc):
        txt = "carta <b>%s</b> (%s)" % (N.carta_oficial(c["numero"], "")[0],
                                        N.escala_br(c["escala"]))
        if txt not in resumo_cartas:
            resumo_cartas.append(txt)

    return {
        "nome": args.nome, "data": args.data or date.today().strftime("%d/%m/%Y"),
        "partida": partida[2], "chegada": chegada[2],
        "partida_curto": curto(partida[2]), "chegada_curto": curto(chegada[2]),
        "wps": wps, "pernas": lista_pernas, "total_mn": total,
        "reta_mn": reta_mn, "reta_rumo": reta_rumo, "declinacao": declinacao,
        "tempos": N.tempos(total, args.velocidades),
        "afastamento": args.afastamento_mn,
        "carta_saida": cs, "carta_percurso": cp, "carta_chegada": cc,
        "setores": setores, "mensal": mensal, "extremos": ex,
        "vento_min": min(ventos), "vento_max": max(ventos),
        "onda_min": min(ondas), "onda_max": max(ondas),
        "iso": iso, "normam": normam,
        "conferencia_itens": itens_conferencia, "conferencia": conferencia,
        "regiao": regiao, "aviso_rota": aviso_rota,
        "clima_texto": clima_texto, "clima_itens": clima_itens,
        "atencao_saida": at_saida, "atencao_percurso": at_percurso,
        "atencao_chegada": at_chegada,
        "calado_tabela": calado_tabela, "calado_nota": calado_nota,
        "calado_resumo": calado_resumo,
        "cartas_tabela": cartas_tabela, "cartas_resumo": ", ".join(resumo_cartas),
        "normam_itens": normam_itens, "iso_itens": iso_itens, "fontes": fontes,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Relatorio PDF de Area de Navegacao (padrao Brana).")
    ap.add_argument("--nome", required=True,
                    help="nome de quem esta preenchendo; entra no nome do arquivo")
    ap.add_argument("--partida", required=True, help="nome do lugar ou \"lat,lon\"")
    ap.add_argument("--chegada", required=True, help="nome do lugar ou \"lat,lon\"")
    ap.add_argument("--wp", action="append", default=[],
                    help="ponto intermediario \"lat,lon\" ou \"lat,lon:Rotulo\" (repetivel)")
    ap.add_argument("--velocidades", default="5,10,20,30")
    ap.add_argument("--afastamento-mn", type=float, default=None,
                    help="maior afastamento da costa em MN, medido na carta do percurso")
    ap.add_argument("--so-abrigado", action="store_true",
                    help="derrota inteira em aguas abrigadas (NORMAM interior)")
    ap.add_argument("--declinacao", type=float, default=None,
                    help="declinacao magnetica em graus (W positivo)")
    ap.add_argument("--zoom-km", type=float, default=12.0,
                    help="lado do recorte das cartas de saida e chegada (padrao 12 km)")
    ap.add_argument("--margem-km", type=float, default=9.0)
    ap.add_argument("--atencao-saida", action="append", default=[])
    ap.add_argument("--atencao-percurso", action="append", default=[])
    ap.add_argument("--atencao-chegada", action="append", default=[])
    ap.add_argument("--calado-max", default=None)
    ap.add_argument("--calado-linha", action="append", default=[],
                    help="linha extra da tabela de calado: \"trecho|profundidade|restricao\"")
    ap.add_argument("--data", default=None, help="dd/mm/aaaa (padrao: hoje)")
    ap.add_argument("--dados", default=None, help="pasta do acervo raster do CHM")
    ap.add_argument("--saida", default=".", help="pasta de saida")
    ap.add_argument("--sem-timbrado", action="store_true",
                    help="nao aplica o papel timbrado Brana")
    args = ap.parse_args(argv)
    args.velocidades = [float(v) for v in
                        str(args.velocidades).replace(";", ",").split(",") if v.strip()]

    try:
        os.makedirs(args.saida, exist_ok=True)
        d = apurar(args)
    except N.ErroDeUso as e:
        sys.stderr.write("\nERRO: %s\n\n" % e)
        return 2

    arquivo = os.path.join(args.saida,
                           "Area_de_Navegacao_%s.pdf" % N.sem_acento(args.nome))
    paginas = construir(d, arquivo, None if args.sem_timbrado else N.TIMBRADO)

    print("Relatorio: %s (%d paginas)" % (arquivo, paginas))
    print("Derrota: %s MN em %d pernas | rumo verdadeiro medio %03.0f"
          % (f(d["total_mn"]), len(d["pernas"]), d["reta_rumo"]))
    print("Cartas: saida %s (1:%s) | percurso %s (1:%s) | chegada %s (1:%s)"
          % (d["carta_saida"]["numero"], d["carta_saida"]["escala"],
             d["carta_percurso"]["numero"], d["carta_percurso"]["escala"],
             d["carta_chegada"]["numero"], d["carta_chegada"]["escala"]))
    for linha in N.texto_da_conferencia(d["conferencia"]):
        print(linha)
    print("Setores de clima: %s" % ", ".join(s["codigo"] for s in d["setores"]))
    if d.get("aviso_rota"):
        import re as _re
        print("AVISO: " + _re.sub(r"<[^>]+>", "", d["aviso_rota"]))
    print("NORMAM: %s | ISO: %s recomendada, %s minima"
          % (d["normam"][0] or "N/A", d["iso"][0], d["iso"][1] or "-"))
    if paginas > 10:
        print("AVISO: passou de 10 paginas (%d). Reduza os textos --atencao-* ou o "
              "numero de pontos intermediarios." % paginas)
    return 0


if __name__ == "__main__":
    sys.exit(main())
