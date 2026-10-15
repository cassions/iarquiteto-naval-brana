# -*- coding: utf-8 -*-
"""
Monta o simulador de vela da Brana a partir do PDF do plano velico.

    python montar.py --nome "Ana Ribeiro" --pdf plano.pdf --saida .

Le o PDF (so biblioteca padrao: o gerador da Brana escreve o texto com Tj,
comprimido ou nao), tira os numeros do barco, troca os tres marcadores do
modelo e escreve um HTML unico que roda offline. Nao usa rede.
"""
import argparse, io, json, os, re, sys, unicodedata, zlib
from datetime import date

AQUI = os.path.dirname(os.path.abspath(__file__))
MODELO = os.path.join(AQUI, "..", "assets", "jogo-modelo.html")


def erro(msg):
    sys.stderr.write("ERRO: " + msg + "\n")
    sys.exit(2)


# ------------------------------------------------------------------ 1. o PDF
def texto_pdf(caminho):
    """Devolve o texto do PDF em linhas, na ordem em que foram desenhadas."""
    try:
        raw = open(caminho, "rb").read()
    except Exception as e:
        erro("nao consegui abrir o PDF: %s" % e)
    if raw[:5] != b"%PDF-":
        erro("%s nao e um PDF." % os.path.basename(caminho))
    itens = []
    pad = re.compile(rb"([-\d.]+)\s+([-\d.]+)\s+(?:Td|Tm)|\(((?:\\.|[^\\()])*)\)\s*Tj")
    for pg, st in enumerate(re.findall(rb"stream\r?\n(.*?)\r?\nendstream", raw, re.S)):
        try:
            d = zlib.decompress(st)
        except Exception:
            d = st
        if b"Tj" not in d:
            continue
        x = y = 0.0
        for m in pad.finditer(d):
            if m.group(3) is None:
                try:
                    x, y = float(m.group(1)), float(m.group(2))
                except ValueError:
                    pass
            else:
                t = m.group(3)
                t = re.sub(rb"\\([()\\])", rb"\1", t)
                itens.append((pg, round(y, 1), x, t.decode("cp1252", "replace")))
    if not itens:
        erro("nao achei texto nenhum no PDF. Ele veio de um plano velico da Brana?")
    linhas, atual, chave = [], [], None
    for pg, y, x, t in sorted(itens, key=lambda i: (i[0], -i[1], i[2])):
        if (pg, y) != chave:
            if atual:
                linhas.append(" ".join(atual))
            atual, chave = [], (pg, y)
        atual.append(t)
    if atual:
        linhas.append(" ".join(atual))
    return linhas


def normaliza(linhas):
    saida = []
    for ln in linhas:
        ln = ln.replace("²", "2").replace("³", "3").replace("’", "'")
        ln = unicodedata.normalize("NFKD", ln)
        ln = "".join(c for c in ln if not unicodedata.combining(c))
        saida.append(re.sub(r"\s+", " ", ln).strip())
    return saida


# --------------------------------------------------------------- 2. numeros
N = r"(-?[\d.,]+)"


def val(s):
    s = s.strip().rstrip(".,")
    if s.count(",") and s.count("."):
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def pega(txt, padrao, n=1, tudo=False):
    ms = re.findall(padrao, txt)
    if not ms:
        return None if n == 1 and not tudo else ([] if tudo else (None,) * n)
    if tudo:
        return ms
    g = ms[0]
    if isinstance(g, tuple):
        return tuple(val(x) for x in g)
    return val(g)


PROA = re.compile(r"genoa|buja|jib|estai|balao|spinnaker|yankee|proa", re.I)


def le_barco(linhas, nome):
    t = "\n".join(linhas)
    B = {}

    def um(chave, padrao, obrig=False, pad=None):
        v = pega(t, padrao)
        if v is None and obrig:
            erro("o PDF nao traz '%s'. Esta folha de plano velico esta completa? "
                 "O montador precisa das folhas 1 a 3 do painel da Brana." % chave)
        B[chave] = pad if v is None else v
        return B[chave]

    par = pega(t, r"LOA / LWL\s+%s / %s" % (N, N))
    if not par or par[0] is None:
        erro("nao achei a linha 'LOA / LWL' no PDF - ele precisa ser o plano velico "
             "gerado pelo painel da Brana (folha 1).")
    B["LOA"], B["LWL"] = par
    par = pega(t, r"BOCA LWL / CALADO\s+%s / %s" % (N, N))
    if not par or par[0] is None:
        erro("nao achei 'BOCA LWL / CALADO' no PDF.")
    B["BWL"], B["draft"] = par
    B["BOA"] = round(B["BWL"] * 1.17, 3)

    um("disp", r"DESLOCAMENTO\s+%s kg" % N, True)
    um("draftHull", r"Calado do casco\s+%s" % N, False, round(B["draft"] * 0.28, 3))
    um("Swet", r"Superficie molhada\s+%s" % N, True)
    um("Awp", r"Area do plano d'agua\s+%s" % N, False, 0)
    c = pega(t, r"Cb / Cp / Cm / Cwp\s+%s / %s / %s / %s" % (N, N, N, N))
    B["Cb"], B["Cp"], B["Cm"], B["Cwp"] = c if c and c[0] is not None else (0.4, 0.55, 0.75, 0.70)
    c = pega(t, r"LCB / LCF \(da popa\)\s+%s / %s" % (N, N))
    if not c or c[0] is None:
        c = (0.52 * B["LOA"], 0.48 * B["LOA"])
    B["LCB"], B["LCF"] = c
    c = pega(t, r"KB / BMt\s+%s / %s" % (N, N))
    B["KB"], B["BMt"] = c if c and c[0] is not None else (0, 0)
    c = pega(t, r"GM / KG\s+%s / %s" % (N, N))
    if not c or c[0] is None:
        erro("nao achei 'GM / KG' no PDF - sem GM nao ha banda nem curva de estabilidade.")
    B["GM"], B["KG"] = c

    um("Alat", r"AREA LATERAL SUBMERSA\s+%s" % N, True)
    centros = re.findall(r"(?i)centro de area\s+%s m da popa,\s*%s m (?:abaixo|acima)" % (N, N), t)
    centros = [(val(a), val(b)) for a, b in centros]
    B["xClrHull"] = centros[0][0] if centros else 0.55 * B["LOA"]
    B["xHullLift"] = round(min(0.98 * B["LOA"], B["xClrHull"] + 0.14 * B["LWL"]), 3)

    um("Akeel", r"Area da quilha\s+%s" % N, False, 0.4 * B["Alat"])
    um("ARkeel", r"Razao de aspecto geometrica\s+%s" % N, False, 1.3)
    B["xKeel"] = centros[1][0] if len(centros) > 1 else B["xClrHull"] - 0.05 * B["LWL"]
    um("Arud", r"Area do leme\s+%s" % N, False, 0.17 * B["Alat"])
    c = pega(t, r"AR pretendida / real\s+%s / %s" % (N, N))
    B["ARrud"] = c[1] if c and c[1] is not None else 3.0
    B["xRud"] = centros[2][0] if len(centros) > 2 else 0.11 * B["LOA"]

    um("SAnom", r"AREA VELICA NOMINAL\s+%s" % N, True)
    um("SAdraw", r"Pano desenhado\s+%s" % N, False, B.get("SAnom"))
    c = pega(t, r"I / J\s+%s / %s" % (N, N))
    B["I"], B["J"] = c if c and c[0] is not None else (0, 0)
    c = pega(t, r"P / E\s+%s / %s" % (N, N))
    B["P"], B["E"] = c if c and c[0] is not None else (0, 0)
    um("Ve", r"Ve\s+%s m" % N, False, 0)

    mastros = pega(t, r"Mastro \d\s+%s m da popa, altura %s" % (N, N), tudo=True)
    B["masts"] = [val(a) for a, b in mastros] or [round(0.62 * B["LOA"], 3)]
    B["xMast"] = B["masts"][0]
    B["mastH"] = val(mastros[0][1]) if mastros else 0

    velas = []
    for nome_v, A, ar, x, z in pega(
            t, r"([A-Za-z][A-Za-z ]{2,22}?) %s m2, AR %s, CE %s m da popa e %s m sobre a DWL"
               % (N, N, N, N), tudo=True):
        A, ar, x, z = val(A), val(ar), val(x), val(z)
        if not A or A <= 0:
            continue
        fore = bool(PROA.search(nome_v)) or x > B["xMast"] + 0.5
        velas.append({"n": nome_v.strip().lower(), "A": A, "ar": ar or 4.0,
                      "x": x, "z": z, "fore": fore})
    if not velas:
        erro("nao achei as velas no PDF (secao 5.1 da folha 3, linhas como "
             "'grande 39,99 m2, AR 5,00, CE 5,536 m da popa e 6,848 m sobre a DWL').")
    if not any(v["fore"] for v in velas) and len(velas) > 1:
        velas[-1]["fore"] = velas[-1]["x"] > velas[0]["x"]
    B["sails"] = velas

    c = pega(t, r"CE total\s+%s m da popa, %s m sobre" % (N, N))
    B["xCE"], B["zCE"] = c if c and c[0] is not None else (
        sum(v["x"] * v["A"] for v in velas) / sum(v["A"] for v in velas),
        sum(v["z"] * v["A"] for v in velas) / sum(v["A"] for v in velas))
    c = pega(t, r"CLR total\s+%s m da popa, %s m abaixo" % (N, N))
    if c and c[0] is not None:
        B["xCLR"], B["zCLR"] = c[0], -abs(c[1])
    else:
        B["xCLR"], B["zCLR"] = B["xClrHull"], -0.3 * B["draft"]
    um("HA", r"Braco de adernamento HA\s+%s" % N, False, round(B["zCE"] - B["zCLR"], 3))
    c = pega(t, r"LEAD\s+%s m = %s%%" % (N, N))
    B["lead"], B["leadPct"] = c if c and c[0] is not None else (0, 0)
    um("dellen", r"ANGULO DE DELLENBAUGH\s+%s" % N, False, 0)

    um("GZmax", r"GZ maximo\s+%s m" % N, True)
    um("GZmaxAng", r"no angulo\s+%s" % N, False, 45)
    um("AVS", r"Anulacao do braco \(AVS\)\s+%s" % N, True)
    c = pega(t, r"Braco com o barco emborcado\s+%s m a %s" % (N, N))
    B["GZ150"] = c[0] if c and c[0] is not None else -0.6 * B["GZmax"]

    arm = re.search(r"ARMACAO (.+)", t)
    B["armacao"] = (arm.group(1).strip().replace(" / ", ", ").lower() if arm
                    else "veleiro").rstrip(".")
    las = re.search(r"LASTRO (.+)", t)
    B["lastro"] = las.group(1).strip().lower() if las else "nao informado"
    dat = re.search(r"PLANO VELICO\D{0,8}(\d\d/\d\d/\d{4})", t)
    B["dataPlano"] = dat.group(1) if dat else ""
    B["projetista"] = nome
    for k, v in list(B.items()):
        if isinstance(v, float):
            B[k] = round(v, 4)
    return B


def confere(B):
    av = []
    if not (1.5 < B["LOA"] < 150):
        erro("LOA de %.3f m - confira a unidade do plano velico." % B["LOA"])
    if B["LWL"] > B["LOA"]:
        erro("LWL (%.3f) maior que LOA (%.3f): o PDF foi lido errado." % (B["LWL"], B["LOA"]))
    if B["disp"] <= 0 or B["Swet"] <= 0 or B["SAnom"] <= 0:
        erro("deslocamento, superficie molhada ou area velica vieram zerados.")
    if B["GM"] <= 0.02:
        av.append("GM de %.3f m: o barco abre sem estabilidade inicial nenhuma." % B["GM"])
    if B["AVS"] < 105:
        av.append("AVS de %.0f graus: o simulador vai emborcar com facilidade - e o que o plano diz."
                  % B["AVS"])
    if B["draft"] > 0.45 * B["LWL"]:
        av.append("calado de %.2f m para %.2f m de linha d'agua: confira o plano." %
                  (B["draft"], B["LWL"]))
    return av


# ---------------------------------------------------------------- 3. montar
def limpa_nome(n):
    n = re.sub(r"[\\/:*?\"<>|]+", " ", n).strip()
    n = re.sub(r"\s+", " ", n)
    return n[:60] or "Projetista"


def main():
    p = argparse.ArgumentParser(description="Simulador de vela da Brana a partir do plano velico")
    p.add_argument("--nome", required=True, help="nome de quem esta usando a skill")
    p.add_argument("--pdf", required=True, help="PDF do plano velico (obrigatorio)")
    p.add_argument("--saida", default=".", help="pasta de destino")
    a = p.parse_args()

    if not os.path.isfile(MODELO):
        erro("nao achei o modelo em %s" % MODELO)
    nome = limpa_nome(a.nome)
    B = le_barco(normaliza(texto_pdf(a.pdf)), nome)
    avisos = confere(B)

    html = io.open(MODELO, encoding="utf-8").read()
    html = html.replace("@@BARCO@@", json.dumps(B, separators=(",", ":"), ensure_ascii=True))
    html = html.replace("@@NOME@@", nome)
    html = html.replace("@@DATA@@", date.today().strftime("%d/%m/%Y"))
    if "@@" in html.replace("@@", "", 0) and ("@@BARCO@@" in html or "@@NOME@@" in html):
        erro("sobrou marcador no modelo.")

    destino = os.path.join(os.path.abspath(a.saida), "Jogo de Vela - %s.html" % nome)
    try:
        io.open(destino, "w", encoding="utf-8", newline="").write(html)
    except Exception as e:
        erro("nao consegui escrever %s: %s" % (destino, e))

    vel = 1.34 * (B["LWL"] / 0.3048) ** 0.5
    sa_d = B["SAnom"] / (B["disp"] / 1025.0) ** (2.0 / 3.0)
    pr = []
    pr.append("barco         %s" % B["armacao"])
    pr.append("casco         LOA %.3f m | LWL %.3f m | boca LWL %.3f m | calado %.3f m" %
              (B["LOA"], B["LWL"], B["BWL"], B["draft"]))
    pr.append("peso          %.0f kg | superficie molhada %.3f m2 | Cwp %.3f | LCB %.3f m da popa" %
              (B["disp"], B["Swet"], B["Cwp"], B["LCB"]))
    pr.append("pano          %.2f m2 nominais (SA/D %.1f) | %s" %
              (B["SAnom"], sa_d, " + ".join("%s %.2f m2" % (v["n"], v["A"]) for v in B["sails"])))
    pr.append("apendices     quilha %.3f m2 (AR %.2f) | leme %.3f m2 (AR %.2f)" %
              (B["Akeel"], B["ARkeel"], B["Arud"], B["ARrud"]))
    pr.append("estabilidade  GM %.3f m | KG %.3f m | GZ max %.3f m a %.0f graus | AVS %.0f graus | lastro: %s" %
              (B["GM"], B["KG"], B["GZmax"], B["GZmaxAng"], B["AVS"], B["lastro"]))
    pr.append("no jogo       velocidade de casco %.1f nos | %d vela(s), %d mastro(s) | sonda alerta abaixo de %.2f m" %
              (vel, len(B["sails"]), len(B["masts"]), B["draft"]))
    pr.append("projetista    %s" % nome)
    pr.append("saida         %s (%.0f KB)" % (destino, len(html.encode("utf-8")) / 1024.0))
    for v in avisos:
        pr.append("ATENCAO       %s" % v)
    sys.stdout.write("\n".join(pr) + "\n")


if __name__ == "__main__":
    main()
