#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Monta o HTML final a partir de um projeto.json pequeno.

  python scripts/montar.py projeto.json Plano-de-Linhas-Fulano.html

O modelo em assets/ tem 23 mil tokens e NAO precisa ser lido nem reescrito: este script
injeta nele o bloco do projeto (cerca de mil tokens), o logotipo, os textos, e embrulha
num documento completo. Escreva so o projeto.json.

Esquema do projeto.json (veja references/06-projeto-json.md):

{
  "casco": "quinado" | "redondo",
  "nome": "Fulano",
  "titulo": "Plano de Linhas",
  "subtitulo": "...",
  "loa_m": 6.0,
  "loa_sq": 14,
  "balizas": 8,
  "mid_x": 6,
  "curvas": { "planSheer": [[x,y,decl], ...], ... },
  "medidos": { "planSheer": [[x,y], ...], ... },
  "secao": { ... },
  "cheia": { "p": 2.32, "re": 0.93, "vante": 0.62 },   // so redondo
  "registro": { "calibracao": "...", "notas": ["...", "..."] }
}
"""
import base64, io, json, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, '..', 'assets')

RESET = """<style>
  *,*::before,*::after{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0}
  button,input,select,textarea{font:inherit;color:inherit}
  img{max-width:100%}
</style>"""

ROTULOS = {
    'planSheer': ('plan', 'Planta · borda', 'PLANTA_BORDA', 'both'),
    'planChine': ('plan', 'Planta · chine', 'PLANTA_CHINE', 'both'),
    'profSheer': ('prof', 'Perfil · borda', 'PERFIL_BORDA', 'x'),
    'profChine': ('prof', 'Perfil · chine', 'PERFIL_CHINE', 'x'),
    'profKeel':  ('prof', 'Perfil · quilha', 'PERFIL_QUILHA', 'x'),
}
ORDEM = {
    'quinado': ['planSheer', 'planChine', 'profSheer', 'profChine', 'profKeel'],
    'redondo': ['planSheer', 'profSheer', 'profKeel'],
}


def num(v):
    return ('%.5f' % v).rstrip('0').rstrip('.') if isinstance(v, float) else str(v)


def bloco_js(p):
    casco = p['casco']
    ordem = ORDEM[casco]
    faltando = [k for k in ordem if k not in p.get('curvas', {})]
    if faltando:
        sys.exit('ERRO: faltam curvas no projeto.json: ' + ', '.join(faltando))

    L = ['LOA_SQ = %s;' % num(p['loa_sq']),
         'NST = %d;' % p['balizas'],
         'MID_X = %s;' % num(p['mid_x']),
         '', 'SPEC = {']
    for k in ordem:
        vista, rot, cam, fix = ROTULOS[k]
        pts = ',\n          '.join('[' + ','.join(num(v) for v in t) + ']' for t in p['curvas'][k])
        link = ", link:'stem'" if vista == 'prof' else ''
        L.append("  %s:{ view:'%s', label:'%s', layer:'%s', fixLast:'%s'%s,"
                 % (k, vista, rot, cam, fix, link))
        L.append('    pts:[' + pts + '] },')
    L[-1] = L[-1][:-1]
    L.append('};')
    L.append("ORDER = ['" + "','".join(ordem) + "'];")
    L.append('')
    L.append('RAW = {')
    for k, v in (p.get('medidos') or {}).items():
        L.append('  %s:[%s],' % (k, ','.join('[' + num(a) + ',' + num(b) + ']' for a, b in v)))
    if L[-1].endswith(','):
        L[-1] = L[-1][:-1]
    L.append('};')

    sec = p.get('secao') or {}
    if casco == 'quinado':
        if sec:
            L.append('PHOTO_SECT = { keel:[%s,%s], chine:[%s,%s], deck:[%s,%s] };'
                     % tuple(num(x) for pair in ('keel', 'chine', 'deck') for x in sec[pair]))
        else:
            L.append('PHOTO_SECT = { keel:[0,0], chine:[0,0], deck:[0,0] };')
    else:
        pts = sec.get('pts') or []
        L.append('PHOTO_PTS = [' + ','.join('[' + num(a) + ',' + num(b) + ']' for a, b in pts) + '];')
        ch = p.get('cheia') or {}
        L.append('FULL_RE = %s; FULL_VANTE = %s;' % (num(ch.get('re', 0.93)), num(ch.get('vante', 0.62))))
        L.append('PMID_INICIAL = %s;' % num(ch.get('p', 2.32)))
    L.append('LOA_INICIAL = %s;' % num(p['loa_m']))
    return '\n'.join(L)


def registro_html(p):
    r = p.get('registro') or {}
    partes = []
    if r.get('calibracao'):
        partes.append('<p>' + r['calibracao'] + '</p>')
    notas = r.get('notas') or []
    if notas:
        partes.append('<ul class="tight">' + ''.join('<li>' + n + '</li>' for n in notas) + '</ul>')
    return '\n'.join(partes) if partes else ''


def main():
    if len(sys.argv) != 3:
        sys.exit('uso: python montar.py <projeto.json> <saida.html>')
    proj, saida = sys.argv[1], sys.argv[2]
    p = json.load(io.open(proj, encoding='utf-8'))

    for campo in ('casco', 'loa_m', 'loa_sq', 'balizas', 'mid_x', 'curvas'):
        if campo not in p:
            sys.exit('ERRO: projeto.json sem o campo obrigatorio "%s"' % campo)
    if p['casco'] not in ORDEM:
        sys.exit('ERRO: casco deve ser "quinado" ou "redondo"')
    if not p.get('nome'):
        sys.exit('ERRO: falta "nome" — o arquivo de saida precisa levar o nome de quem pediu')

    modelo = os.path.join(ASSETS, 'modelo-%s.html' % p['casco'])
    corpo = io.open(modelo, encoding='utf-8').read()

    if '/*{{PROJETO}}*/' not in corpo:
        sys.exit('ERRO: o modelo nao tem o marcador {{PROJETO}}')
    corpo = corpo.replace('/*{{PROJETO}}*/', bloco_js(p))

    logo = os.path.join(ASSETS, 'brana-logo.png')
    if '{{LOGO}}' in corpo:
        if not os.path.exists(logo):
            sys.exit('ERRO: nao achei assets/brana-logo.png')
        corpo = corpo.replace('{{LOGO}}', 'data:image/png;base64,' +
                              base64.b64encode(open(logo, 'rb').read()).decode())

    titulo = p.get('titulo') or ('Casco Redondo' if p['casco'] == 'redondo' else 'Plano de Linhas')
    corpo = re.sub(r'<title>[\s\S]*?</title>', '<title>%s</title>' % titulo, corpo, count=1)
    corpo = re.sub(r'<h1>[\s\S]*?</h1>', '<h1>%s</h1>' % titulo, corpo, count=1)
    if p.get('subtitulo'):
        corpo = re.sub(r'(<div class="tb-sub">)[\s\S]*?(</div>)',
                       r'\g<1>' + p['subtitulo'] + r'\g<2>', corpo, count=1)
    reg = registro_html(p)
    if reg:
        corpo = corpo.replace('<!--{{REGISTRO}}-->', reg)
    corpo = corpo.replace('<!--{{REGISTRO}}-->', '')

    m = re.search(r'<title>([\s\S]*?)</title>', corpo)
    tit = m.group(1).strip()
    corpo = corpo.replace(m.group(0), '')
    m = re.search(r'<style>[\s\S]*?</style>', corpo)
    estilo = m.group(0) if m else ''
    if m:
        corpo = corpo.replace(m.group(0), '')

    doc = ('<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
           '<meta name="color-scheme" content="dark">\n'
           '<meta name="theme-color" content="#333333">\n'
           '<meta name="description" content="Plano de linhas interativo gerado a partir de um croqui. Brana Projetos Navais.">\n'
           '<meta name="apple-mobile-web-app-capable" content="yes">\n'
           '<title>%s</title>\n%s\n%s\n</head>\n<body>\n'
           '<script>window.__STANDALONE__=true;</script>\n%s\n</body>\n</html>\n'
           % (tit, RESET, estilo, corpo.strip().lstrip('\n')))

    io.open(saida, 'w', encoding='utf-8', newline='\n').write(doc)

    out = io.open(saida, encoding='utf-8').read()
    probs = []
    if not out.startswith('<!DOCTYPE html>'): probs.append('sem doctype')
    for tag, n in (('<html', 1), ('<body', 1), ('<title>', 1)):
        if out.count(tag) != n: probs.append('contagem de %s' % tag)
    if 'name="viewport"' not in out: probs.append('sem meta viewport')
    if re.search(r'<link\b', out): probs.append('<link> externo')
    if re.search(r'src\s*=\s*["\']https?:', out): probs.append('src remoto')
    if '@import' in out: probs.append('@import no css')
    if '{{' in out: probs.append('sobrou marcador nao substituido')
    if 'data:image/png;base64,' not in out: probs.append('logotipo nao embutido')
    if '--red:#9A3231' not in out: probs.append('vermelho Brana ausente')
    ns = out.count('<script')
    if ns != 2: probs.append('esperava 2 scripts, achei %d' % ns)

    print(saida)
    print('  %d KB · autocontido · 0 pedidos externos · bloco do projeto: %d bytes'
          % (round(len(out) / 1024), len(bloco_js(p))))
    if probs:
        print('  PROBLEMAS: ' + '; '.join(probs))
        sys.exit(1)
    print('  empacotamento ok')


if __name__ == '__main__':
    main()
