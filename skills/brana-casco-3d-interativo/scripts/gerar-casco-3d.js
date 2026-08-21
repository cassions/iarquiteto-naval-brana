#!/usr/bin/env node
/* ============================================================================
   Gera o visualizador 3D interativo a partir de uma tabela de cotas.

     node scripts/gerar-casco-3d.js --tabela=<arquivo> --nome="<projetista>" [--saida=<pasta>]

   O formato da baliza (redonda ou quinada) e detectado da propria tabela, e o
   calado inicial sai do pontal do casco — nada disso precisa ser informado.
   O arquivo entregue e autossuficiente: um HTML unico, sem rede, sem biblioteca.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const C = require(path.join(RAIZ, 'assets', 'casco-core.js'));

/* ------------------------------------------------------------- argumentos -- */
function arg(nome){
  const p = process.argv.find(a => a.startsWith('--' + nome + '='));
  return p ? p.slice(nome.length + 3) : null;
}
const fTabela = arg('tabela');
const nome    = arg('nome');
const saida   = arg('saida') || process.cwd();

function morre(msg){
  console.error('ERRO: ' + msg);
  console.error('\nuso: node scripts/gerar-casco-3d.js --tabela=<arquivo> --nome="<projetista>" [--saida=<pasta>]');
  process.exit(1);
}
if(!fTabela) morre('falta --tabela=<arquivo com a tabela de cotas>. A tabela e obrigatoria: sem ela nao ha casco a construir.');
if(!nome)    morre('falta --nome="<nome do projetista>". Pergunte ao usuario antes de gerar.');
if(!fs.existsSync(fTabela)) morre('nao encontrei a tabela em ' + fTabela);

/* --------------------------------------------------------------- leitura -- */
let parsed;
try {
  parsed = C.parseOffsets(fs.readFileSync(fTabela, 'utf8'));
} catch(e){
  morre('a tabela nao pode ser lida — ' + e.message +
        '\n       Confira o formato em references/formato-da-tabela.md');
}
const hull = C.makeHull(parsed);
const b = hull.bounds();
const pontal = b.maxZ - b.minZ;
if(!(pontal > 0)) morre('o pontal saiu zero: confira as colunas de altura de quilha e de borda.');

/* Calado inicial em 40% do pontal: fundo bastante molhado para a linha de agua
   aparecer no casco, e longe da borda para nao dar impressao de alagamento. */
const calado0 = Math.max(1, Math.round(b.minZ + pontal * 0.40));

/* ------------------------------------------------------------- variante --- */
const redondo = parsed.mode === 'redondo';
const V = {
  TITLE:      redondo ? 'Casco Redondo em Três Dimensões' : 'Casco Quinado em Três Dimensões',
  H1:         redondo ? 'Casco Redondo em Três Dimensões' : 'Casco Quinado em Três Dimensões',
  EYEBROW:    'Tabela de cotas → superfície · ' + parsed.rows.length + ' balizas · Projetista: ' + nome,
  SUB_OPEN:   redondo
    ? 'Casco de bojo redondo: a baliza é uma curva única da quilha à borda, sem chine.'
    : 'Casco de chine vivo: a baliza é quilha → chine → borda, com o canto preservado.',
  DRAFT0:     String(calado0),
  TSV_PRIMARY:'USER_TSV',
  TSV_ALT:    redondo ? 'CHINE_TSV' : 'DEFAULT_TSV',
  LBL_REVERT: 'Voltar ao meu casco',
  LBL_ALT:    redondo ? 'Exemplo quinado' : 'Exemplo redondo',
  MSG_REVERT: 'De volta à sua tabela',
  MSG_ALT:    redondo ? 'Exemplo quinado carregado' : 'Exemplo redondo carregado',
  FOOT_NOTE:  'Projetista: ' + nome + ' · superfície erguida da tabela de cotas · WebGL sem bibliotecas'
};

/* --------------------------------------------------------------- montagem -- */
const core = fs.readFileSync(path.join(RAIZ, 'assets', 'casco-core.js'), 'utf8')
  .replace(/^\s*'use strict';\s*$/m, '')
  .replace(/if\(typeof module[\s\S]*$/, '');            /* corta a cauda CommonJS */
const logo = fs.readFileSync(path.join(RAIZ, 'assets', 'brana-logo.txt'), 'utf8').trim();

let page = fs.readFileSync(path.join(RAIZ, 'assets', 'modelo-pagina.html'), 'utf8');
if(!page.includes('/* == INLINE_CORE == */')) morre('modelo sem o marcador do nucleo');

/* A tabela do usuario viaja embutida como texto, ao lado dos dois exemplos que
   o botao de demonstracao usa — assim o arquivo continua funcionando offline e
   quem receber pode conferir que o visualizador atende os dois tipos de casco. */
const tabelaTxt = fs.readFileSync(fTabela, 'utf8').replace(/\r\n/g, '\n').trimEnd();
const injecao = 'var USER_TSV = ' + JSON.stringify(tabelaTxt) + ';\n\n' + core.trim();

page = page.replace('/* == INLINE_CORE == */', injecao).replace('{{LOGO}}', logo);
Object.keys(V).forEach(k => { page = page.split('{{' + k + '}}').join(V[k]); });
page = page.replace(/<div class="tb-sub">\s+/, '<div class="tb-sub">');

const mT = page.match(/<title>([\s\S]*?)<\/title>/);
const titulo = mT ? mT[1].trim() : V.TITLE;
if(mT) page = page.replace(mT[0], '');
const mS = page.match(/<style>[\s\S]*?<\/style>/);
const style = mS ? mS[0] : '';
if(mS) page = page.replace(mS[0], '');

const doc = '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
  '<meta name="color-scheme" content="dark">\n' +
  '<meta name="theme-color" content="#333333">\n' +
  '<meta name="description" content="Tabela de cotas erguida em superficie tridimensional interativa, com hidrostatica calculada da mesma geometria. Projetista: ' +
    nome.replace(/"/g, '') + '">\n' +
  '<meta name="author" content="' + nome.replace(/"/g, '') + '">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-title" content="Casco 3D">\n' +
  '<title>' + titulo + '</title>\n' +
  '<style>\n  *,*::before,*::after{box-sizing:border-box}\n  html{-webkit-text-size-adjust:100%}\n' +
  '  body{margin:0}\n  button,input,select,textarea{font:inherit;color:inherit}\n  img{max-width:100%}\n</style>\n' +
  style + '\n</head>\n<body>\n<script>window.__STANDALONE__=true;<\/script>\n' +
  page.trim() + '\n</body>\n</html>\n';

/* ---------------------------------------------------------- nome do arquivo -- */
function slug(s){
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')   /* tira acentos */
          .replace(/[^A-Za-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .split('-').filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join('-');
}
const pessoa = slug(nome);
if(!pessoa) morre('o nome informado nao gerou nome de arquivo utilizavel: ' + nome);
const arquivo = 'Casco-' + (redondo ? 'Redondo' : 'Quinado') + '-3D-' + pessoa + '.html';
const destino = path.join(saida, arquivo);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(destino, doc, 'utf8');

/* ------------------------------------------------------------- conferencia -- */
const N_CHECAGENS = 23;
const t = fs.readFileSync(destino, 'utf8');
const ruim = [];
const sobrou = t.match(/\{\{[A-Z0-9_]+\}\}/g);
if(sobrou) ruim.push('marcadores nao substituidos: ' + [...new Set(sobrou)].join(','));
if(!/function pchip/.test(t)) ruim.push('nucleo nao injetado');
if(!/function fitSuper/.test(t)) ruim.push('ajuste da super-elipse ausente');
if(!/function hydrostatics/.test(t)) ruim.push('hidrostatica ausente');
if(!/var USER_TSV = /.test(t)) ruim.push('tabela do usuario nao embutida');
if(!new RegExp('loadParsed\\(parseOffsets\\(USER_TSV\\)\\)').test(t)) ruim.push('nao arranca pela tabela do usuario');
if(!/data:image\/png;base64,/.test(t)) ruim.push('logotipo nao embutido');
if(!/--red:#9A3231/.test(t) || !/--graf:#404040/.test(t)) ruim.push('paleta Brana ausente');
if(!/Brana · Projetos Navais/.test(t)) ruim.push('assinatura ausente');
if(t.indexOf(nome) < 0) ruim.push('nome do projetista nao aparece no documento');
if(!/id="waterChips"/.test(t)) ruim.push('alternador de densidade ausente');
if(!/planos do alto/.test(t) || !/> convés/.test(t)) ruim.push('nomenclatura acordada ausente');
if(/<link\b/.test(t) || /src\s*=\s*["']https?:/.test(t) || /@import/.test(t) ||
   /https?:\/\/(?!www\.w3\.org)/.test(t)) ruim.push('referencia externa: o arquivo deixaria de ser autossuficiente');
if(!/^<!DOCTYPE html>/.test(t)) ruim.push('sem doctype');
if((t.match(/<title>/g) || []).length !== 1) ruim.push('contagem de <title>');
if(!/lang="pt-BR"/.test(t)) ruim.push('idioma nao marcado');

/* Espelho de popa por plano de corte e curva de areas. */
if(!/var CUT = /.test(t) || !/function cutSync/.test(t)) ruim.push('plano do espelho ausente no nucleo');
if(!/id="cutPos"/.test(t) || !/id="cutRake"/.test(t)) ruim.push('controles do espelho ausentes');
if(!/function transomWetted/.test(t)) ruim.push('area molhada do espelho ausente');
if(!/function areaCurve/.test(t)) ruim.push('curva de areas ausente no nucleo');
if(!/id="areaCurve"/.test(t) || !/function renderAreaCurve/.test(t)) ruim.push('curva de areas ausente na pagina');
if(!/function cutApply/.test(t) || !/requestAnimationFrame/.test(t)) ruim.push('coalescencia por frame ausente');

const hy = C.hydrostatics(hull, calado0, 1025, 26);
const ac = C.areaCurve(hull, calado0, 26, 220);
const dif = hy.V > 1e-9 ? Math.abs(ac.integral - hy.V)/hy.V : 0;
if(!(dif < 0.01)) ruim.push('curva de areas nao fecha com o volume: ' +
  ac.integral.toFixed(4) + ' m3 contra ' + hy.V.toFixed(4) + ' m3');
console.log(destino);
console.log('  baliza ' + (redondo ? 'redonda' : 'quinada') + ' · ' + parsed.rows.length +
            ' balizas · comprimento ' + (hull.LOA/1000).toFixed(3) + ' m · pontal ' +
            (pontal/1000).toFixed(3) + ' m');
console.log('  calado inicial ' + calado0 + ' mm → ' + hy.disp.toFixed(0) + ' kg, Lwl ' +
            hy.Lwl.toFixed(2) + ' m, Cb ' + hy.Cb.toFixed(3) + ', Cm ' + hy.Cm.toFixed(3));
console.log('  espelho a prumo na baliza de re; posicao e inclinacao ajustaveis na pagina');
console.log('  curva de areas: Amax ' + (ac.amax*1e-6).toFixed(3) + ' m2, integral ' +
            ac.integral.toFixed(4) + ' m3 (volume ' + hy.V.toFixed(4) + ' m3)');
console.log('  ' + (t.length/1024).toFixed(0) + ' KB, autossuficiente, 0 requisicoes externas');
if(parsed.warn.length){
  console.log('  AVISOS DA TABELA (' + parsed.warn.length + '):');
  parsed.warn.forEach(w => console.log('    · ' + w));
}
if(hull.clampCount() > 0)
  console.log('  nota: ' + hull.clampCount() + ' amostras precisaram de correcao na interpolacao ' +
              '(a tabela pede uma forma que se autointersecta entre balizas)');
if(ruim.length){ console.log('  PROBLEMAS: ' + ruim.join('; ')); process.exit(1); }
/* A ultima linha existe para fechar a porta: sem ela o agente tende a abrir o HTML
   de ~85 KB para "conferir", o que custa ~25 mil tokens e nao acrescenta informacao
   nenhuma — as checagens acima ja falhariam antes de chegar aqui, inclusive a
   numerica, que confere a curva de areas contra o volume. */
console.log('  todas as ' + N_CHECAGENS + ' verificacoes passaram — arquivo pronto,' +
            ' nao precisa abrir para conferir');
