#!/usr/bin/env node
/* ============================================================================
   Gera o relatorio interativo e o PDF de corte a partir de uma tabela de cotas.

     node scripts/gerar-relatorio.js --tabela=<arquivo> --nome="<projetista>"
                                     [--saida=<pasta>] [--tiras=10] [--calado=mm]

   O formato da baliza (redonda ou quinada) sai da propria tabela. Saem dois
   arquivos: um HTML autossuficiente, que abre por duplo clique e funciona
   offline, e um PDF vetorial com todos os desenhos planificados sobre malha
   quadrada, pronto para imprimir e cortar.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const ASS = path.join(RAIZ, 'assets');

/* Os assets viajam comprimidos: sao 193 KB de codigo e modelo que servem de
   ENTRADA para este script e nao de leitura para ninguem, e comprimidos ninguem
   os abre por engano. Se existir a versao expandida (depois de rodar
   scripts/expandir-assets.js) ela tem preferencia, para dar para editar. */
function leAsset(nome){
  const plano = path.join(ASS, nome);
  if(fs.existsSync(plano)) return fs.readFileSync(plano, 'utf8');
  const gz = plano + '.gz';
  if(!fs.existsSync(gz)) morre('asset ausente: assets/' + nome);
  return require('zlib').gunzipSync(fs.readFileSync(gz)).toString('utf8');
}

/* O plan-core e um bundle de escopo global: carrega ao lado do casco-core. */
const C = (function(){
  const src = leAsset('casco-core.js');
  const mod = { exports: {} };
  new Function('module', 'exports', src)(mod, mod.exports);
  return mod.exports;
})();
const API = (function(){
  const src = leAsset('plan-core.js');
  const pre = Object.keys(C).map(n => 'var ' + n + ' = __C.' + n + ';').join('\n');
  return new Function('__C', pre + '\n' + src + '\n' + 'return {' +
    'montaChapas:montaChapas, calculaChapa:calculaChapa, balizasDe:balizasDe,' +
    'montaDesenhos:montaDesenhos, geraPDF:geraPDF, SWEEPS:SWEEPS };')(C);
})();

/* ------------------------------------------------------------- argumentos -- */
function arg(n){
  const p = process.argv.find(a => a.startsWith('--' + n + '='));
  return p ? p.slice(n.length + 3) : null;
}
function morre(msg){
  console.error('ERRO: ' + msg);
  console.error('\nuso: node scripts/gerar-relatorio.js --tabela=<arquivo> --nome="<projetista>"' +
                ' [--saida=<pasta>] [--tiras=6..20] [--calado=<mm>]');
  process.exit(1);
}
const fTabela = arg('tabela');
const nome    = arg('nome');
const saida   = arg('saida') || process.cwd();
const nTiras  = Math.max(6, Math.min(20, parseInt(arg('tiras') || '10', 10) || 10));

if(!fTabela) morre('falta --tabela=<arquivo com a tabela de cotas>. A tabela e obrigatoria: sem ela nao ha casco.');
if(!nome)    morre('falta --nome="<nome do projetista>". Pergunte ao usuario antes de gerar.');
if(!fs.existsSync(fTabela)) morre('nao encontrei a tabela em ' + fTabela);

/* --------------------------------------------------------------- leitura -- */
let parsed;
try { parsed = C.parseOffsets(fs.readFileSync(fTabela, 'utf8')); }
catch(e){ morre('a tabela nao pode ser lida - ' + e.message +
                '\n       Confira o formato em references/formato-da-tabela.md'); }

const hull = C.makeHull(parsed);
const b = hull.bounds();
const pontal = b.maxZ - b.minZ;
if(!(pontal > 0)) morre('o pontal saiu zero: confira as colunas de altura de quilha e de borda.');
const redondo = parsed.mode === 'redondo';
const calado = Math.max(1, Math.round(arg('calado') ? +arg('calado') : b.minZ + pontal*0.40));

C.CUT.on = true; C.CUT.pos = hull.stations[0]; C.CUT.rake = 0; C.cutSync(hull);

/* --------------------------------------------------- chapas e gabaritos --- */
const t0 = Date.now();
let R;
try { R = API.montaChapas(hull, parsed.mode, nTiras); }
catch(e){ morre('nao consegui montar as chapas - ' + e.message); }
R.chapas.forEach(ch => API.calculaChapa(ch, API.SWEEPS));
C.cutSync(R.hullDep);
const zBase = R.hullDep.bounds().minZ;
const balizas = API.balizasDe(R.hullDep, parsed.mode, R.planos, calado, zBase, 120);
const desenhos = API.montaDesenhos(R.chapas, hull.stations, balizas, calado, zBase);
const msChapas = Date.now() - t0;

/* ------------------------------------------------------- hidrostatica ----- */
C.cutSync(hull);   const hA = C.hydrostatics(hull, calado, 1025, 200);
C.cutSync(R.hullDep); const hD = C.hydrostatics(R.hullDep, calado, 1025, 200);
C.cutSync(hull);
function dif(a, d){ return (d >= a ? '+' : '') + ((d-a)/a*100).toFixed(2) + ' %'; }

/* Um nome como "Joao d'Avila" tem apostrofo, e alguns campos vao parar DENTRO
   de literais de string do JavaScript gerado: sem escapar, a pagina nao carrega.
   Cada campo e escapado conforme o destino - JS ou HTML - e a conferencia de
   sintaxe no fim pega o que escapar daqui. */
function jsEsc(v){
  return String(v).replace(/\\/g, '\\\\')
                  .replace(/'/g, "\\'")
                  .replace(/[\r\n]+/g, ' ');
}
function htmlEsc(v){
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ------------------------------------------------------- nome do arquivo -- */
function slug(s){
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
          .split('-').filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
}
const pessoa = slug(nome);
if(!pessoa) morre('o nome informado nao gerou nome de arquivo utilizavel: ' + nome);
const tipo = redondo ? 'Redondo' : 'Quinado';
const fHtml = 'Relatorio-Casco-' + tipo + '-Planificado-' + pessoa + '.html';
const fPdf  = 'Planificacao-Casco-' + tipo + '-' + pessoa + '.pdf';
fs.mkdirSync(saida, { recursive: true });

/* ------------------------------------------------------------------ PDF --- */
const rot = redondo ? { a:'Redondo', d:nTiras + ' tiras' } : { a:'Como tabelado', d:'Desenvolvivel' };
const resumo = [
  'Casco: ' + (redondo ? 'bojo redondo, cortado em ' + nTiras + ' tiras' : 'quinado, chine vivo'),
  'LOA ' + (hull.LOA/1000).toFixed(3) + ' m   .   boca ' + (2*b.maxY/1000).toFixed(3) +
    ' m   .   pontal ' + (pontal/1000).toFixed(3) + ' m   .   ' + parsed.rows.length + ' balizas',
  'Deslocamento a ' + calado + ' mm: ' + hA.disp.toFixed(0) + ' kg (' + rot.a + ')   ->   ' +
    hD.disp.toFixed(0) + ' kg (' + rot.d + ')   ' + dif(hA.disp, hD.disp),
  'Desenhos: ' + R.chapas.length + ' chapas e ' + balizas.length + ' gabaritos de baliza',
  'Todo desenho vem sobre malha quadrada, com o lado do quadrado escrito na propria folha.'
];
const tabelas = [{
  titulo: 'Chapas', col: ['Chapa','Retangulo m','Vao max mm','Area 3D m2','Area plana m2','Deformacao %'],
  larg: [58,32,28,30,32,30],
  linhas: R.chapas.map(c => [ c.nome, (c.larg/1000).toFixed(3) + ' x ' + (c.alt/1000).toFixed(3),
    Math.round(c.vao), (c.area3/1e6).toFixed(3), (c.area2/1e6).toFixed(3),
    c.defMax < 0.001 ? 'exata' : c.defMax.toFixed(3) ])
}];
if(balizas.length) tabelas.push({
  titulo: 'Gabaritos das balizas', col: ['Baliza','x da popa mm','Boca mm','Altura mm'],
  larg: [58,34,30,30],
  linhas: balizas.map((bz, i) => {
    const d = desenhos[R.chapas.length + i];
    return [ bz.nome, Math.round(bz.x - hull.X0), Math.round(d ? d.larg : 0), Math.round(d ? d.alt : 0) ];
  })
});
const pdf = API.geraPDF(desenhos, { folha:'A3',
  titulo: 'Casco ' + tipo.toLowerCase() + ' planificado - ' + nome,
  rodape: 'Brana . Projetos Navais . ' + nome }, resumo, tabelas);
fs.writeFileSync(path.join(saida, fPdf), Buffer.from(pdf));

/* ----------------------------------------------------------------- HTML --- */
const core = leAsset('casco-core.js')
  .replace(/^\s*'use strict';\s*$/m, '').replace(/if\(typeof module[\s\S]*$/, '');
const plan = leAsset('plan-core.js');
const logo = leAsset('brana-logo.txt').trim();
let s = leAsset('modelo-relatorio.html');
if(!s.includes('/* == INLINE_CORE == */')) morre('modelo sem o marcador do nucleo');

const tsv = fs.readFileSync(fTabela, 'utf8').replace(/\r\n/g, '\n').trimEnd();
s = s.replace('/* == INLINE_CORE == */',
  'var USER_TSV = ' + JSON.stringify(tsv) + ';\n\n' + core.trim() + '\n\n' + plan);

const V = {
  TITLE: 'Relatorio Interativo - Casco ' + tipo + ' Planificado',
  H1: redondo ? 'Casco Redondo, Cortado em Tiras' : 'Casco Quinado, Chapa por Chapa',
  EYEBROW: 'Relatorio interativo . tabela de cotas -> superficie -> chapa plana . ' +
           parsed.rows.length + ' balizas . ' + nome,
  SUB_OPEN: redondo
    ? 'Casco de bojo redondo: nenhuma chapa plana assenta nele inteiro, entao ele e cortado por diagonais em tiras que assentam.'
    : 'Casco de chine vivo, com os paineis conferidos quanto a desenvolvibilidade e abertos em chapa plana.',
  DRAFT0: String(calado),
  TSV_PRIMARY: 'USER_TSV',
  TSV_ALT: redondo ? 'CHINE_TSV' : 'DEFAULT_TSV',
  LBL_REVERT: 'Voltar ao meu casco',
  LBL_ALT: redondo ? 'Exemplo quinado' : 'Exemplo redondo',
  MSG_REVERT: 'De volta a sua tabela',
  MSG_ALT: redondo ? 'Exemplo quinado carregado' : 'Exemplo redondo carregado',
  FOOT_NOTE: nome + ' . ' + (redondo ? 'tiras cortadas por diagonais' : 'paineis regrados pelas geratrizes') +
             ' e abertas em chapa plana . WebGL sem bibliotecas',
  NTIRAS0: String(nTiras),
  PESSOA: pessoa,
  TITULO_PDF: 'Casco ' + tipo.toLowerCase() + ' planificado - ' + nome
};
s = s.split('{{LOGO}}').join(logo);
/* TITULO_PDF e PESSOA caem dentro de literais JS; o resto e texto de HTML. */
const EM_JS = { TITULO_PDF:1, PESSOA:1, MSG_REVERT:1, MSG_ALT:1 };
const CRU   = { TSV_PRIMARY:1, TSV_ALT:1, DRAFT0:1, NTIRAS0:1 };
Object.keys(V).forEach(k => {
  const v = CRU[k] ? V[k] : (EM_JS[k] ? jsEsc(V[k]) : htmlEsc(V[k]));
  s = s.split('{{' + k + '}}').join(v);
});

const mT = s.match(/<title>([\s\S]*?)<\/title>/);
const titulo = mT ? mT[1].trim() : V.TITLE;
if(mT) s = s.replace(mT[0], '');
const mS = s.match(/<style>[\s\S]*?<\/style>/);
const style = mS ? mS[0] : '';
if(mS) s = s.replace(mS[0], '');

const doc = '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
  '<meta name="color-scheme" content="dark">\n<meta name="theme-color" content="#333333">\n' +
  '<meta name="description" content="Relatorio interativo de planificacao de casco. Projetista: ' +
    htmlEsc(nome) + '">\n' +
  '<meta name="author" content="' + htmlEsc(nome) + '">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-title" content="Casco planificado">\n' +
  '<title>' + titulo + '</title>\n' +
  '<style>\n  *,*::before,*::after{box-sizing:border-box}\n  html{-webkit-text-size-adjust:100%}\n' +
  '  body{margin:0}\n  button,input,select,textarea{font:inherit;color:inherit}\n  img{max-width:100%}\n</style>\n' +
  style + '\n</head>\n<body>\n<script>window.__STANDALONE__=true;<\/script>\n' +
  s.trim() + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(saida, fHtml), doc, 'utf8');

/* ------------------------------------------------------------ conferencia -- */
const N_CHECAGENS = 22;
const t = fs.readFileSync(path.join(saida, fHtml), 'utf8');
const ruim = [];
const sobrou = t.match(/\{\{[A-Z0-9_]+\}\}/g);
if(sobrou) ruim.push('marcadores nao substituidos: ' + [...new Set(sobrou)].join(','));
[['function pchip','nucleo do casco'], ['function hydrostatics','hidrostatica'],
 ['function planificaMalha','planificacao'], ['function melhorRegramento','busca de regramento'],
 ['function contornos','diagonais'], ['function cascoDesenvolvivel','casco desenvolvivel'],
 ['function cascoEmTiras','casco em tiras'], ['function desenhoBaliza','gabarito de baliza'],
 ['function moduloMalha','malha quadrada'], ['function geraPDF','gerador de PDF'],
 ['var USER_TSV = ','tabela do usuario'], ['id="chapas"','tela das chapas'],
 ['id="chapasTab"','tabela das chapas'], ['id="verdito"','veredito'],
 ['id="baixarPdf"','botao do PDF'], ['id="cascoChips"','alternador antes/depois'],
 ['data:image/png;base64,','logotipo'], ['--red:#9A3231','paleta Brana'],
 ['Brana · Projetos Navais','assinatura']
].forEach(([m, q]) => { if(t.indexOf(m) < 0) ruim.push(q + ' ausente'); });
if(t.indexOf(htmlEsc(nome)) < 0 && t.indexOf(pessoa) < 0)
  ruim.push('nome do projetista nao aparece');
if(/<link\b/.test(t) || /src\s*=\s*["']https?:/.test(t) || /@import/.test(t) ||
   /https?:\/\/(?!www\.w3\.org)/.test(t)) ruim.push('referencia externa: deixaria de ser autossuficiente');
if(!/lang="pt-BR"/.test(t)) ruim.push('idioma nao marcado');
/* sintaxe do JavaScript gerado */
(t.match(/<script>[\s\S]*?<\/script>/g) || []).forEach((bl, i) => {
  try { new Function(bl.replace(/^<script>/, '').replace(/<\/script>$/, '')); }
  catch(e){ ruim.push('erro de sintaxe no bloco ' + i + ': ' + e.message.slice(0, 80)); }
});
/* estrutura do PDF: os deslocamentos da xref tem de cair em "N 0 obj" */
{
  const p = Buffer.from(pdf).toString('latin1');
  const sx = (p.match(/startxref\s+(\d+)/) || [0,-1])[1]|0;
  const n = (p.match(/xref\s+0\s+(\d+)/) || [0,0])[1]|0;
  let bons = 0;
  p.slice(sx).split('\n').slice(3, 3+n-1).forEach((l, i) => {
    const off = parseInt(l.slice(0,10), 10);
    if(p.slice(off, off + String(i+1).length + 6) === (i+1) + ' 0 obj') bons++;
  });
  if(bons !== n-1) ruim.push('PDF com tabela xref inconsistente (' + bons + ' de ' + (n-1) + ')');
  if(p.slice(0,8) !== '%PDF-1.4') ruim.push('PDF sem cabecalho');
}

/* ---------------------------------------------------------------- resumo -- */
const nFolhas = pdf.folhas || 0;
const pior = Math.max.apply(null, R.chapas.map(c => c.defMax));
const piorRms = Math.max.apply(null, R.chapas.map(c => c.defRms));
const ondePior = R.chapas.reduce((m, c) => c.defMax > m.defMax ? c : m, R.chapas[0]).nome;
console.log(path.join(saida, fHtml));
console.log(path.join(saida, fPdf));
console.log('  baliza ' + (redondo ? 'redonda' : 'quinada') + ' · ' + parsed.rows.length +
            ' balizas · comprimento ' + (hull.LOA/1000).toFixed(3) + ' m · boca ' +
            (2*b.maxY/1000).toFixed(3) + ' m · pontal ' + (pontal/1000).toFixed(3) + ' m');
console.log('  ' + R.chapas.length + ' chapas' + (redondo ? ' (' + nTiras + ' tiras)' : '') +
            ' + ' + balizas.length + ' gabaritos · deformacao ao planificar ' +
            (pior < 0.001 ? 'exata: chapa desenvolvivel'
              : 'pico de ' + pior.toFixed(3) + ' % em ' + ondePior + ', ' + piorRms.toFixed(3) + ' % rms'));
console.log('  calado ' + calado + ' mm · deslocamento ' + hA.disp.toFixed(0) + ' kg (' + rot.a +
            ') -> ' + hD.disp.toFixed(0) + ' kg (' + rot.d + ')  ' + dif(hA.disp, hD.disp) +
            ' · Cb ' + hA.Cb.toFixed(3) + ' -> ' + hD.Cb.toFixed(3));
console.log('  HTML ' + (doc.length/1024).toFixed(0) + ' KB autossuficiente · PDF ' +
            (pdf.length/1024).toFixed(0) + ' KB em ' + nFolhas + ' folhas A3 · ' + msChapas + ' ms');
if(parsed.warn.length){
  console.log('  AVISOS DA TABELA (' + parsed.warn.length + '):');
  parsed.warn.forEach(w => console.log('    · ' + w));
}
if(hull.clampCount() > 0)
  console.log('  nota: ' + hull.clampCount() + ' amostras precisaram de correcao na interpolacao');
if(ruim.length){ console.log('  PROBLEMAS: ' + ruim.join('; ')); process.exit(1); }
/* A ultima linha existe para fechar a porta: sem ela o agente tende a abrir o
   HTML de 200 KB para "conferir", o que custa dezenas de milhares de tokens e
   nao acrescenta nada - as checagens acima ja falhariam antes de chegar aqui. */
console.log('  todas as ' + N_CHECAGENS + ' verificacoes passaram - arquivos prontos,' +
            ' nao precisa abrir para conferir');
