#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Monta o arquivo final a partir de um modelo preenchido.

  python scripts/montar.py modelo-preenchido.html Plano-de-Linhas-Fulano.html

Injeta o logotipo da Brana como data URI, embrulha num documento HTML completo com
viewport e color-scheme, e confere que nao sobrou nada que dependa da rede.
"""
import base64, io, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(AQUI, '..', 'assets', 'brana-logo.png')

RESET = """<style>
  *,*::before,*::after{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0}
  button,input,select,textarea{font:inherit;color:inherit}
  img{max-width:100%}
</style>"""


def main():
    if len(sys.argv) != 3:
        sys.exit('uso: python montar.py <modelo-preenchido.html> <saida.html>')
    origem, saida = sys.argv[1], sys.argv[2]
    corpo = io.open(origem, encoding='utf-8').read()

    # ---- logotipo ----
    if '{{LOGO}}' in corpo:
        if not os.path.exists(LOGO):
            sys.exit('ERRO: nao achei assets/brana-logo.png')
        b64 = base64.b64encode(open(LOGO, 'rb').read()).decode()
        corpo = corpo.replace('{{LOGO}}', 'data:image/png;base64,' + b64)

    # ---- titulo e estilo sobem para o head ----
    m = re.search(r'<title>([\s\S]*?)</title>', corpo)
    titulo = m.group(1).strip() if m else 'Plano de Linhas'
    if m:
        corpo = corpo.replace(m.group(0), '')
    m = re.search(r'<style>[\s\S]*?</style>', corpo)
    estilo = m.group(0) if m else ''
    if m:
        corpo = corpo.replace(m.group(0), '')
    corpo = corpo.lstrip('\n')

    doc = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#333333">
<meta name="description" content="Plano de linhas interativo gerado a partir de um croqui em papel quadriculado. Brana Projetos Navais.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Plano de Linhas">
<title>%s</title>
%s
%s
</head>
<body>
<script>window.__STANDALONE__=true;</script>
%s
</body>
</html>
""" % (titulo, RESET, estilo, corpo.strip())

    io.open(saida, 'w', encoding='utf-8', newline='\n').write(doc)

    # ---- conferencias de empacotamento ----
    out = io.open(saida, encoding='utf-8').read()
    problemas = []
    if not out.startswith('<!DOCTYPE html>'):
        problemas.append('sem doctype')
    for tag, n in (('<html', 1), ('<body', 1), ('<title>', 1)):
        if out.count(tag) != n:
            problemas.append('contagem de %s' % tag)
    if 'name="viewport"' not in out:
        problemas.append('sem meta viewport')
    if re.search(r'<link\b', out):
        problemas.append('<link> externo')
    if re.search(r'src\s*=\s*["\']https?:', out):
        problemas.append('src remoto')
    if re.search(r'url\(\s*["\']?https?:', out):
        problemas.append('url() remota no css')
    if '@import' in out:
        problemas.append('@import no css')
    if '{{LOGO}}' in out:
        problemas.append('marcador {{LOGO}} nao substituido')
    if 'data:image/png;base64,' not in out:
        problemas.append('logotipo nao embutido')
    if '--graf:#404040' not in out:
        problemas.append('grafite da identidade Brana ausente')
    if '--red:#9A3231' not in out:
        problemas.append('vermelho Brana ausente')
    if 'background:var(--' not in out:
        problemas.append('body sem fundo por token')
    n_scripts = out.count('<script')
    if n_scripts != 2:
        problemas.append('esperava 2 scripts embutidos, achei %d' % n_scripts)

    print(saida)
    print('  %d KB · autocontido · %d scripts embutidos · 0 pedidos externos'
          % (round(len(out) / 1024), n_scripts))
    if problemas:
        print('  PROBLEMAS: ' + '; '.join(problemas))
        sys.exit(1)
    print('  empacotamento ok')


if __name__ == '__main__':
    main()
