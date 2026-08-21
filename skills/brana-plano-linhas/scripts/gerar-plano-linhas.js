// Porta de entrada da skill brana-plano-linhas: gera o plano de linhas em PDF e confere.
//
//   node gerar-plano-linhas.js --tabela=<arq> --nome="<Nome>" --espelho=<graus>
//   node gerar-plano-linhas.js --tabela=<arq> --nome="<Nome>" --espelho-reto
//
// Nao ha nada a ler nos outros scripts: este imprime tudo o que importa em poucas linhas.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

/* ------------------------------------------------------------------ flags --- */
const F = {};
process.argv.slice(2).forEach(a => {
  const m = a.match(/^--([^=]+)(?:=([\s\S]*))?$/);
  if (m) F[m[1]] = m[2] === undefined ? true : m[2];
});
let tmp = null;
process.on('exit', () => {
  if (tmp) try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { }
});
const erro = (msg, dica) => {
  console.error('ERRO: ' + msg);
  if (dica) console.error(dica);
  process.exit(2);
};
if (F.ajuda || F.help || !F.tabela || !F.nome) {
  console.error([
    'uso: node gerar-plano-linhas.js --tabela=<arq> --nome="<Nome>" (--espelho=<graus> | --espelho-reto)',
    '',
    '  --tabela        tabela de cotas (texto). OBRIGATORIA.',
    '  --nome          nome de quem esta usando a skill. OBRIGATORIO: vai no arquivo de saida.',
    '  --espelho       angulo do espelho de popa, em graus da vertical (positivo = topo',
    '                  caindo para re). O topo fica ancorado na abscissa da ultima baliza',
    '                  a re da tabela, preservando o comprimento total que ela declara.',
    '                  Dispensavel se a tabela ja traz "# espelho: N graus da vertical".',
    '  --espelho-reto  gera com o espelho RETO na ultima baliza a re, como a tabela da.',
    '                  Use somente depois de confirmar isso com o usuario.',
    '  --saida         nome do PDF. Se omitido, sai de <tabela> + "Plano-de-Linhas" + <nome>.',
    '  --titulo        titulo do selo. Padrao: o nome da tabela, em maiusculas.',
    '  --sub           subtitulo do selo. Padrao: tipo de casco, comprimento, espelho,',
    '                  tabela de origem e quem desenhou.',
    '  --escala        forca a escala (10, 12.5, 15, 20, 25, 30, 40, 50). Padrao: a maior',
    '                  que couber na folha A3.'
  ].join('\n'));
  process.exit(F.ajuda || F.help ? 0 : 2);
}
if (!fs.existsSync(F.tabela)) erro('nao achei a tabela ' + F.tabela);

/* ------------------------------------------------- espelho: obrigatorio decidir */
/* O reconhecedor e o MESMO do motor de desenho. Ja tivemos o caso de o CLI aceitar uma
   declaracao que o motor nao entendia (faltava "da vertical"): o portao abria e o plano
   saia RETO, em silencio, sem ninguem confirmar nada. */
const bruto = fs.readFileSync(F.tabela, 'utf8');
const { lerEspelho } = require(path.join(__dirname, 'superficie.js'));
const reconhecido = !!lerEspelho(bruto, 0, 0, 1000);
const mencionaEspelho = /espelho\s*:/i.test(bruto) || /x_tabela\s*=\s*X_rhino/i.test(bruto);

let ang = null;
if (F.espelho !== undefined) {
  if (F.espelho === true || String(F.espelho).trim() === '')
    erro('--espelho precisa de um valor em graus (ex.: --espelho=12).',
      'Para espelho reto, use --espelho-reto.');
  ang = Number(String(F.espelho).replace(',', '.'));
  if (!isFinite(ang)) erro('--espelho precisa ser um numero em graus, recebi "' + F.espelho + '"');
  if (Math.abs(ang) > 60) erro('--espelho=' + ang + ' graus e implausivel para um espelho de popa.',
    'Confira se o angulo nao foi medido da HORIZONTAL (78 graus da horizontal = 12 da vertical).');
}
const DICA = ['',
  'O angulo do espelho de popa e obrigatorio nesta skill. Tres saidas:',
  '  1. informe o angulo:  --espelho=<graus>',
  '  2. declare na tabela: uma linha "# espelho: <graus> graus da vertical"',
  '  3. CONFIRME com o usuario que o plano sai com o espelho RETO na ultima baliza a re,',
  '     como a tabela de cotas da, e so entao rode com:  --espelho-reto',
  '',
  'A diferenca nao e cosmetica: inclinar o espelho move a baliza 0, encurta o LWL, muda o',
  'espacamento das balizas e cria os balancos de popa e de proa.'].join('\n');
if (ang === null && !F['espelho-reto']) {
  if (mencionaEspelho && !reconhecido)
    erro('a tabela menciona o espelho, mas a declaracao nao foi reconhecida.',
      '\nEscreva exatamente:  # espelho: <graus> graus da vertical' +
      '\n(ou "# espelho: de x <x> z <z> a x <x> z <z>")' + DICA);
  if (!reconhecido)
    erro('a tabela nao declara o plano do espelho e nenhum angulo foi informado.', DICA);
}

/* ------------------------------------------- prepara a tabela que sera lida --- */
const nomeTab = path.basename(F.tabela);
let tabela = F.tabela;
function reescreve(texto) {
  if (!tmp) tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'branaplano-'));
  tabela = path.join(tmp, nomeTab);                 /* mesmo basename: as notas o citam */
  fs.writeFileSync(tabela, texto, 'utf8');
}
const semDeclaracao = t => t.split(/\r?\n/)
  .filter(l => !/espelho\s*:/i.test(l) &&
               !/^\s*#?\s*(X de|Z de|x_tabela\s*=|altura_tabela\s*=)/i.test(l))
  .join('\n');
if (ang !== null) {
  const linhas = semDeclaracao(bruto).split(/\r?\n/);
  let i = linhas.findIndex(l => l.trim() && !l.trim().startsWith('#'));
  if (i < 0) i = linhas.length;
  linhas.splice(i, 0, '# espelho: ' + String(ang).replace('.', ',') + ' graus da vertical');
  reescreve(linhas.join('\n'));
} else if (F['espelho-reto'] && mencionaEspelho) {
  reescreve(semDeclaracao(bruto));
}

/* --------------------------------------------------------------- gera -------- */
if (!tmp) tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'branaplano-'));
const provisorio = path.join(tmp, 'plano.pdf');
const roda = (script, args, aceita) => {
  try {
    return execFileSync(process.execPath, [path.join(__dirname, script)].concat(args),
      { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    if (aceita && aceita.indexOf(e.status) >= 0) return e.stdout || '';
    const txt = ((e.stdout || '') + '\n' + (e.stderr || '')).trim();
    const achado = txt.match(/^(?:Error|ERRO)[:\s].*$/m);
    console.error('ERRO ao gerar o plano de linhas:');
    console.error('  ' + (achado ? achado[0] : txt.split('\n').pop()).replace(/^Error:\s*/, ''));
    console.error(/baliza|colunas|numerica|separador|decimal|DWL de|espelho/.test(txt)
      ? '\nO formato aceito esta em references/formato-da-tabela.md'
      : '\nCausas conhecidas em references/solucao-de-problemas.md');
    process.exit(3);
  }
};
const argsDesenho = ['--tabela=' + tabela, '--saida=' + provisorio, '--autor=' + F.nome];
if (F.titulo) argsDesenho.push('--titulo=' + F.titulo);
if (F.sub) argsDesenho.push('--sub=' + F.sub);
if (F.escala) argsDesenho.push('--escala=' + F.escala);
const outDesenho = roda('plano-linhas.js', argsDesenho);
const mR = outDesenho.match(/^RESUMO=(.*)$/m);
if (!mR) erro('o motor de desenho nao devolveu o resumo', outDesenho.slice(-400));
const D = JSON.parse(mR[1]);

/* ------------------------------------- nome do arquivo, com o angulo EFETIVO -- */
/* O sufixo sai do que foi DESENHADO, nao do nome da tabela: rodar --espelho=12 sobre uma
   tabela chamada "...espelho5" gravava "...Espelho-5g", mentindo, e sobrescrevia o PDF de
   5 graus sem avisar. */
const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const soValido = s => s.replace(/[\\/:*?"<>|]/g, ' ');
const capitaliza = s => s.split(/[-_\s]+/).filter(Boolean)
  .map(p => p[0].toUpperCase() + p.slice(1)).join('-');
const nomeSlug = capitaliza(soValido(semAcento(F.nome)).trim());
if (!nomeSlug) erro('--nome nao produziu nenhum caractere util para o nome do arquivo');
let base = capitaliza(semAcento(nomeTab.replace(/\.[^.]+$/, ''))
  .replace(/[-_ ]?espelho[-_ ]?-?[\d.,]+g?/i, ''));
if (D.inclinado) base += '-Espelho-' + String(D.rake).replace(/[.,]/, '-') + 'g';
let saida = F.saida || (base + '-Plano-de-Linhas-' + nomeSlug + '.pdf');
let desviado = null;
if (!F.saida && fs.existsSync(saida)) {
  const ext = path.extname(saida), raiz = saida.slice(0, -ext.length);
  for (let k = 2; ; k++) { saida = raiz + '-' + k + ext; if (!fs.existsSync(saida)) break; }
  desviado = saida;
}
fs.copyFileSync(provisorio, saida);

/* ------------------------------------------------------------- confere ------- */
/* confere-plano.js sai com 1 quando reprova: isso e RESULTADO, nao falha de execucao.
   Antes o catch engolia a saida e as linhas FALHA nunca apareciam. */
const outConf = roda('confere-plano.js', [tabela, saida], [1]);
const nOK = (outConf.match(/^ {2}OK/gm) || []).length;
const falhas = (outConf.match(/^ {2}FALHA.*$/gm) || []);
if (falhas.length) {
  const inv = saida.replace(/\.pdf$/i, '.INVALIDO.pdf');
  try { fs.renameSync(saida, inv); saida = inv; } catch (e) { }
}

/* ----------------------------------------------------------------- resumo ---- */
const n = v => v.toLocaleString('pt-BR');
console.log(falhas.length ? 'PLANO DE LINHAS REPROVADO NA CONFERENCIA' : 'PLANO DE LINHAS GERADO');
console.log('  arquivo    ' + saida);
console.log('             ' + D.kb + ' KB, ' + D.folhas + ' folhas A3, escala 1:' + D.escala);
console.log('  casco      ' + D.modo + (D.chine ? ' (com chine)' : '') + ', ' + D.nBalTab + ' balizas na tabela');
console.log('  espelho    ' + (D.inclinado
  ? D.rake.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) + '° da vertical, pé em x = ' +
    n(D.espPe) + ', topo em x = ' + n(D.espTopo)
  : 'RETO na última baliza a ré, em x = ' + n(D.espPe) + ' (como a tabela dá)'));
console.log('  dimensões  LOA ' + n(D.LOA) + '   LWL ' + n(D.LWL) + '   BOA ' + n(D.BOA) + '   BWL ' + n(D.BWL) + ' mm');
console.log('  malha      balizas ' + D.bal0 + '..' + D.balN + ' a ' + n(D.espBal) +
            ' mm (LWL/10 = ' + n(D.espBalExato) + ')');
console.log("             linhas d'água a " + n(D.espWL) + ' mm   planos do alto a ' + n(D.espBut) +
            ' mm (BOA/6 = ' + n(D.espButExato) + '): ' + D.buts.map(n).join(', '));
console.log('  balanços   popa ' + n(D.balPopa) + ' mm   proa ' + n(D.balProa) + ' mm' +
            (D.balPopa === 0 && D.balProa === 0 ? '   (as balizas caem nos dois extremos)' : ''));
console.log('  tabela     ' + D.nLinhasTab + ' linhas x ' + D.nBalizas + ' balizas, na folha 2');
(D.avisos || []).forEach(a => console.log('  ATENÇÃO    a tabela é suspeita: ' + a));
if (D.degeneradas.length) console.log('  atenção    baliza ' + D.degeneradas.join(', ') +
  ' coincide com a roda de proa: sem seção no plano de balizas');
if (D.wlVazias.length) console.log("  atenção    linha d'água sem nenhum valor: " +
  D.wlVazias.map(z => 'LA ' + n(z)).join(', ') + ' (fora do casco em todas as balizas)');
if (desviado) console.log('  atenção    já havia um PDF com o nome de origem: este saiu como ' +
  path.basename(saida));
if (F.saida && semAcento(String(F.saida)).toLowerCase().indexOf(nomeSlug.toLowerCase()) < 0)
  console.log('  atenção    --saida não contém o nome de quem desenhou (o padrão da skill contém)');
if (falhas.length) {
  console.log('  CONFERIDO  ' + nOK + ' checagens, ' + falhas.length + ' FALHA(S) - NAO ENTREGUE ESTE PDF:');
  falhas.forEach(f => console.log('    ' + f.replace(/^ *FALHA */, '').trim()));
  console.log('             causas em references/solucao-de-problemas.md');
  process.exitCode = 1;
} else {
  console.log('  conferido  ' + nOK + ' checagens, 0 falhas');
}
