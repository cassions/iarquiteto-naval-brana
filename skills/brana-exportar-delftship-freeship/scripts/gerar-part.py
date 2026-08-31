# -*- coding: utf-8 -*-
"""CLI da skill brana-exportar-delftship-freeship.

  python scripts/gerar-part.py --tabela=<arquivo> --nome="<projetista>" [--saida=<pasta>]

Imprime seis linhas. Se disser que todas as verificacoes passaram, o arquivo
esta pronto: nao ha nada a conferir abrindo-o.
"""
import io, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'assets'))
import casco_part as C


def morre(msg):
    sys.stderr.write('erro: ' + msg + '\n')
    sys.exit(1)


def arg(nome):
    for a in sys.argv[1:]:
        if a.startswith('--' + nome + '='):
            return a[len(nome) + 3:]
    return None


def slug(s):
    try:
        import unicodedata
        s = unicodedata.normalize('NFD', s)
        s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    except Exception:
        pass
    p = [w for w in re.split(r'[^A-Za-z0-9]+', s) if w]
    return '-'.join(w[:1].upper() + w[1:] for w in p)


def main():
    fTab, nome = arg('tabela'), arg('nome')
    saida = arg('saida') or os.getcwd()
    if not fTab:
        morre('falta --tabela=<arquivo com a tabela de cotas>. '
              'A tabela e obrigatoria: sem ela nao ha casco a construir.')
    if not nome:
        morre('falta --nome="<nome do projetista>". Pergunte ao usuario antes de gerar.')
    if not os.path.isfile(fTab):
        morre('nao encontrei o arquivo da tabela: %s' % fTab)
    pessoa = slug(nome)
    if not pessoa:
        morre('o nome informado nao gerou nome de arquivo utilizavel: %r' % nome)

    txt = io.open(fTab, encoding='utf-8', errors='replace').read()
    try:
        est, fmt = C.ler_tabela(txt)
        casco = C.Casco(est, fmt)
        g = C.montar(casco)
        dados = C.gravar(g)
        checks = C.conferir(casco, g, dados)
    except C.Erro as e:
        morre('%s\n       veja references/solucao-de-problemas.md' % e)

    ruins = [m for o, m in checks if not o]
    if ruins:
        sys.stderr.write('erro: o arquivo nao passou nas verificacoes:\n')
        for m in ruins:
            sys.stderr.write('       - ' + m + '\n')
        sys.stderr.write('       nada foi gravado. veja references/solucao-de-problemas.md\n')
        sys.exit(1)

    if not os.path.isdir(saida):
        os.makedirs(saida)
    projeto = arg('projeto')
    if not projeto:
        base = os.path.splitext(os.path.basename(fTab))[0]
        projeto = re.sub(r'^(entrada|tabela|cotas|offsets)[-_ ]+', '', base, flags=re.I)
    projeto = slug(projeto)
    rotulo = 'Quinado' if fmt == 'quinado' else 'Redondo'
    partes = ['Casco', rotulo]
    if projeto and projeto.lower() not in ('quinado', 'redondo', 'casco'):
        partes.append(projeto)
    partes.append(pessoa)
    arquivo = os.path.join(saida, '-'.join(partes) + '.part')
    open(arquivo, 'wb').write(dados)

    ncre = sum(1 for _, _, cr in g['E'] if cr)
    print('formato detectado : %s, %d balizas, LOA %.3f m'
          % (fmt, len(est), casco.LOA / 1000.0))
    print('malha             : %d pontos, %d arestas (%d vivas), %d faces'
          % (len(g['V']), len(g['E']), ncre, len(g['F'])))
    print('camadas           : %s' % ', '.join(n for n, _ in g['cams']))
    print('volume meio casco : %.4f m3 ate a borda' % g['vol'])
    print('arquivo           : %s  (%d bytes)' % (arquivo, os.path.getsize(arquivo)))
    print('todas as %d verificacoes passaram - arquivo pronto,'
          ' nao precisa abrir para conferir' % len(checks))


if __name__ == '__main__':
    main()
