#!/usr/bin/env node
/* ============================================================================
   brana-estimativa-velocidade — o unico comando desta skill.

     node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" [--saida=<pasta>]

   Le a tabela de cotas, resolve a hidrostatica ali mesmo para provar que o
   casco fecha, escolhe peso e potencia de partida coerentes com ESTE casco,
   preenche o modelo e confere o arquivo antes de entregar.

   Nao monta a pagina: o modelo em assets/modelo.html ja sai pronto do build da
   skill. Aqui so entram a tabela de quem pediu, o casco de referencia para
   comparacao, e o nome do projetista.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ    = path.resolve(__dirname, '..');
const ASSETS  = path.join(RAIZ, 'assets');
const NUCLEO  = require(path.join(ASSETS, 'nucleo.js'));
const RHO_SAL = 1025;               /* agua salgada, a condicao de projeto usual */
const FT_M    = 3.280839895;
const LB_KG   = 2.2046226218;

/* ------------------------------------------------------------------ argumentos */
function args(){
  const o = {};
  for (const a of process.argv.slice(2)) {
    const m = /^--([a-z]+)=?(.*)$/.exec(a);
    if (m) o[m[1]] = m[2];
  }
  return o;
}
function morre(msg, dica){
  console.error('RECUSADO: ' + msg);
  if (dica) console.error('          ' + dica);
  process.exit(1);
}

const A = args();
if (!A.tabela) morre('falta --tabela=<arquivo>',
  'A tabela de cotas e obrigatoria. Se ela veio colada no chat, grave num .txt e aponte para ele.');
if (!A.nome || !A.nome.trim()) morre('falta --nome="<projetista>"',
  'Pergunte o nome de quem vai usar o painel: ele vai no titulo, no rodape e no nome do arquivo.');
if (!fs.existsSync(A.tabela)) morre('nao achei o arquivo ' + A.tabela);

const NOME  = A.nome.trim().replace(/\s+/g, ' ');
const SAIDA = A.saida ? path.resolve(A.saida) : process.cwd();
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

/* ------------------------------------------------------- a tabela de quem pediu */
const texto = fs.readFileSync(A.tabela, 'utf8');
let P, HULL, GRID, CAP;
try {
  P = NUCLEO.parseOffsets(texto);
  HULL = NUCLEO.makeHull(P);
  GRID = NUCLEO.buildGrid(HULL);
  CAP  = NUCLEO.volumeAtSheer(HULL, GRID);
} catch (e) {
  morre('nao consegui ler a tabela de cotas: ' + e.message,
        'Os dois formatos aceitos estao em references/formato-da-tabela.md');
}
if (!(CAP.V > 1e-6)) morre('a tabela fecha um volume nulo ate a borda',
  'Confira se as alturas estao em milimetros acima da linha de base.');

const LOA = HULL.LOA / 1000;
const capKg = CAP.V * RHO_SAL;

/* ---------------------------------------------- peso e potencia de partida
   O painel precisa abrir num ponto que faca sentido para ESTE casco: um bote
   de 375 kg e uma lancha de 6 m nao comecam no mesmo lugar da regua.

   Peso: o que poe a linha d'agua a 30% do pontal — carregamento leve de
   trabalho, e o ponto onde a maioria dos cascos de deslocamento vive.
   Potencia: a que leva a velocidade de casco (V/raizL = 1,34) pela formula 2-1
   de Gerr, com o regime de 85% e 3% de perda que o painel abre.              */
function sugestoes(){
  let zk = Infinity, zs = Infinity;
  for (const r of P.rows) { if (r.zk < zk) zk = r.zk; if (r.zs < zs) zs = r.zs; }
  const d = zk + 0.30 * (zs - zk);
  const st = NUCLEO.hydroAt(HULL, GRID, d);
  let W = Math.max(10, st.V * RHO_SAL);
  W = arredonda(W);
  W = Math.min(W, Math.floor(capKg * 0.9));

  const r = NUCLEO.solveDraft(HULL, GRID, Math.min(W / RHO_SAL, CAP.V));
  const LWLft = r.st.LWL * FT_M, LB = W * LB_KG;
  const shp = NUCLEO.GERR.shpFromSl(NUCLEO.GERR.SL_HULL_SPEED, LB);
  let BHP = shp / (0.85 * 0.97);
  BHP = BHP >= 40 ? Math.round(BHP / 5) * 5 : BHP >= 10 ? Math.round(BHP) : Math.round(BHP * 2) / 2;
  return { W, BHP: Math.max(0.5, BHP), st: r.st, LWLft, LB };
}
function arredonda(v){
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, v))) - 1);
  return Math.max(10, Math.round(v / p) * p);
}
const SUG = sugestoes();

/* ------------------------------------------ o casco de referencia, do formato
   oposto: se o seu e redondo, vem o quinado — e vice-versa. E o contraste que
   faz a aula funcionar, porque o passo 4 precisa de um casco que planeie e de
   um que nao planeie.                                                        */
const REF = P.mode === 'quinado'
  ? { arq:'referencia-redondo-6m.tsv', key:'ref-redondo', rot:'Casco redondo · 6,00 m',
      curta:'redondo de 6,00 m', chip:'Redondo 6 m', W:1000, BHP:6,
      desc:'Casco de referencia, bojo redondo, 6 balizas, 6,00 m. Serve de contraste: '
         + 'bojo redondo nao planeia, e o painel diz por que.' }
  : { arq:'referencia-quinado-6m.tsv', key:'ref-quinado', rot:'Casco quinado · 6,00 m',
      curta:'quinado de 6,00 m', chip:'Quinado 6 m', W:1500, BHP:60,
      desc:'Casco de referencia, fundo de quina viva e corrida chata, 6,00 m. '
         + 'Feito para semi-planeio ou planeio — serve para comparar os regimes.' };
REF.tsv = fs.readFileSync(path.join(ASSETS, REF.arq), 'utf8').replace(/\n+$/, '');

const forma = P.mode === 'quinado' ? 'quinado' : 'de bojo redondo';
const PRIN = {
  key: 'meu', rot: 'O seu casco · ' + LOA.toFixed(2).replace('.', ',') + ' m',
  curta: 'o seu casco, ' + LOA.toFixed(2).replace('.', ',') + ' m',
  chip: 'Meu casco', tsv: texto.replace(/\n+$/, ''),
  W: SUG.W, BHP: SUG.BHP,
  desc: 'Casco ' + forma + ', ' + P.rows.length + ' balizas, '
      + LOA.toFixed(2).replace('.', ',') + ' m de proa a popa. '
      + 'E a tabela de cotas que voce forneceu.'
};

/* --------------------------------------------------------------- preencher */
const modelo = fs.readFileSync(path.join(ASSETS, 'modelo.html'), 'utf8');

/* O nome vai para atributos e para texto da pagina. */
const escapa = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* A tabela de cotas vai para DENTRO de um <script>. JSON.stringify protege as
   aspas e as barras invertidas, mas nao a sequencia </script>: uma tabela com
   esse texto num comentario fecharia o bloco e derrubaria o painel inteiro.
   Escapar o '<' resolve, e o JS le exatamente a mesma string.
   U+2028 e U+2029 sao quebras de linha para o parser de JS, e tambem saem. */
const paraScript = v => JSON.stringify(v, null, 2)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

/* Uma passada so: sem isso, um marcador que aparecesse DENTRO do valor de
   outro seria substituido na rodada seguinte. Nao e hipotese remota — a
   tabela de cotas e texto livre de quem pediu o painel. */
const VALORES = {
  '__TABELAS__': paraScript([PRIN, REF]),
  '__NOME__'   : escapa(NOME)
};
let html = modelo.replace(/__TABELAS__|__NOME__/g, m => VALORES[m]);

/* ---------------------------------------------------------------- conferir */
const checa = [];
const ok = (rot, cond) => checa.push([rot, !!cond]);
/* Contar marcadores restantes nao basta: a tabela de cotas e texto livre, e
   pode legitimamente conter a string __NOME__. O que precisa ser verdade e que
   nenhum marcador DO MODELO sobrou — ou seja, os que restam sao exatamente os
   que vieram junto com os dados de quem pediu. */
const conta = t => (String(t).match(/__(NOME|TABELAS)__/g) || []).length;
const trazidos = conta(VALORES['__TABELAS__']) + conta(VALORES['__NOME__']);
ok('marcadores do modelo preenchidos',     conta(html) === trazidos);
/* a prova de que o painel e do casco DELE, e nao de um exemplo: uma fatia
   distintiva da tabela fornecida tem de estar embutida, literal */
const amostra = paraScript(PRIN.tsv).slice(1, 60);
ok('a sua tabela embutida, literal',       html.includes(amostra));
ok('o nome do projetista aparece',         html.indexOf(escapa(NOME)) > 0);
ok('modo aula presente',                   html.includes('id="appAula"'));
ok('modo de pagina unica presente',        html.includes('id="appPainel"'));
ok('as duas folhas de estilo',             html.includes('id="ssAula"') && html.includes('id="ssPainel"'));
ok('so uma folha ativa no arranque',       html.includes('id="ssAula" media="all"') && html.includes('id="ssPainel" media="not all"'));
ok('botoes do alternador',                 html.includes('id="paraPainel"') && html.includes('id="paraAula"'));
ok('os sete passos da aula',               (html.match(/<section class="step"/g) || []).length === 7);
ok('botao de ficha em PDF',                html.includes('id="btnPDF"'));
ok('formulas de Gerr embutidas',           html.includes('var GERR'));
ok('figuras de Teale embutidas',           html.includes('var TEALE') && html.includes('FIG47'));
ok('a sua tabela e a primeira da lista',   html.indexOf('"key": "meu"') > 0);
ok('casco de referencia incluido',         html.indexOf('"key": "' + REF.key + '"') > 0);
ok('nenhum </script> solto no JS',         (html.match(/<\/script>/g) || []).length === 4);
ok('sem referencia externa de rede',       !/(src|href)\s*=\s*"https?:/i.test(html));
ok('arquivo autocontido',                  html.length > 200000);

const falhas = checa.filter(c => !c[1]);
if (falhas.length) {
  console.error('RECUSADO: o painel gerado nao passou nas conferencias:');
  falhas.forEach(f => console.error('  - ' + f[0]));
  process.exit(1);
}

/* ------------------------------------------------------------------ gravar */
const seguro = NOME.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-');
const arquivo = path.join(SAIDA, 'Estimativa-Velocidade-' + seguro + '.html');
fs.writeFileSync(arquivo, html, 'utf8');

/* ------------------------------------------------------------------ relatar */
const n2 = v => v.toFixed(2).replace('.', ',');
const n3 = v => v.toFixed(3).replace('.', ',');
const st = SUG.st;
const DL = NUCLEO.GERR.dlRatio(SUG.LB, SUG.LWLft);
const alto = st.buttock.deg;

console.log('painel gerado: ' + arquivo);
console.log('  casco ....... ' + (P.mode === 'quinado' ? 'quinado' : 'redondo') + ' · '
            + P.rows.length + ' balizas · LOA ' + n3(LOA) + ' m');
console.log('  capacidade .. ' + Math.round(capKg) + ' kg ate a borda mais baixa, em agua salgada');
console.log('  abre com .... ' + SUG.W + ' kg e ' + n2(SUG.BHP) + ' HP  ->  calado ' + n3(st.T)
            + ' m · LWL ' + n3(st.LWL) + ' m · BWL ' + n3(st.BWL) + ' m');
console.log('  forma ....... D/L ' + Math.round(DL) + ' · Cp ' + n3(st.Cp)
            + ' · alto de quarto de boca ' + (isFinite(alto) ? n2(alto) + ' graus' : 'nao medido'));
console.log('  referencia .. ' + REF.rot + ', para comparar os regimes');
if (P.warn.length) {
  console.log('  AVISOS DA TABELA (aceita, mas confira):');
  P.warn.forEach(w => console.log('    - ' + w));
}
console.log('  todas as ' + checa.length + ' verificacoes passaram · '
            + Math.round(Buffer.byteLength(html, 'utf8') / 1024) + ' KB');
