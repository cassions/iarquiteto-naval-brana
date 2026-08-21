#!/usr/bin/env node
/* ============================================================================
   brana-pesos-trim-banda · gerador do painel interativo de pesos e centros

     node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" \
                                 [--saida=<pasta>] [--calado=<mm>]

   O que ele faz, nesta ordem:

     1. injeta a tabela de cotas no nucleo e AVALIA o nucleo aqui no Node - o
        mesmo codigo que vai rodar no navegador. Nao existe um segundo leitor de
        tabela nesta skill: se o parser recusa aqui, recusaria lá;
     2. levanta a geometria e resolve a flutuacao a prumo, para imprimir a
        hidrostatica de partida e provar que o casco fecha;
     3. monta a pagina, confere 22 propriedades do arquivo e grava.

   Recusa com mensagem especifica em vez de gerar um painel errado.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const A = (p) => path.join(RAIZ, p);

/* ------------------------------------------------------------- argumentos -- */
function argumentos(){
  const out = { saida: process.cwd(), calado: null };
  for(const a of process.argv.slice(2)){
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if(!m) morre(`argumento não reconhecido: ${a}`);
    const [, k, v] = m;
    if(k === 'tabela') out.tabela = v;
    else if(k === 'nome') out.nome = v;
    else if(k === 'saida') out.saida = v;
    else if(k === 'calado') out.calado = Number(String(v).replace(',', '.'));
    else if(k === 'ajuda') { console.log(AJUDA); process.exit(0); }
    else morre(`argumento não reconhecido: --${k}`);
  }
  if(!out.tabela) morre('falta --tabela=<arquivo com a tabela de cotas>. A tabela é obrigatória: sem ela não há forma de casco, e esta skill não inventa cotas.');
  if(!out.nome)   morre('falta --nome="<projetista>". O nome vai para o título, o rodapé e o nome do arquivo.');
  if(out.calado !== null && !(out.calado > 0)) morre('--calado precisa ser um número em milímetros, maior que zero.');
  return out;
}
const AJUDA = `uso: node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" [--saida=<pasta>] [--calado=<mm>]

  --tabela   arquivo de texto com a tabela de cotas (obrigatório)
  --nome     nome do projetista (obrigatório) - vai para o arquivo e para a folha
  --saida    pasta onde gravar o HTML (padrão: pasta atual)
  --calado   calado de partida em mm (padrão: 41% do pontal)`;

function morre(msg){
  console.error('\n  RECUSADO: ' + msg + '\n');
  process.exit(1);
}

/* ------------------------------------------------------------------ numeros */
const F = (v, d) => Number(v).toLocaleString('pt-BR',
  { minimumFractionDigits: d, maximumFractionDigits: d });

/* ------------------------------------------------------- nome do arquivo -- */
function limpaNome(n){
  const s = String(n).replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
                     .replace(/\s+/g, ' ').trim().slice(0, 60);
  if(!s) morre('o nome do projetista ficou vazio depois de tirar os caracteres que o sistema de arquivos não aceita.');
  return s;
}

/* ============================================================ 1. entrada == */
const arg = argumentos();
if(!fs.existsSync(arg.tabela)) morre(`não encontrei a tabela em ${arg.tabela}`);
const tabela = fs.readFileSync(arg.tabela, 'utf8').replace(/^﻿/, '');
if(!tabela.trim()) morre(`o arquivo ${arg.tabela} está vazio.`);
if(!/\d/.test(tabela)) morre(`o arquivo ${arg.tabela} não tem número nenhum - não parece uma tabela de cotas.`);

const nome = limpaNome(arg.nome);

for(const f of ['assets/pagina.html', 'assets/nucleo.js', 'assets/painel.js', 'assets/brana-logo.txt'])
  if(!fs.existsSync(A(f))) morre(`falta o ativo ${f} - a skill está incompleta.`);

const pagina0 = fs.readFileSync(A('assets/pagina.html'), 'utf8');
const nucleo0 = fs.readFileSync(A('assets/nucleo.js'), 'utf8');
const painel0 = fs.readFileSync(A('assets/painel.js'), 'utf8');
const logo    = fs.readFileSync(A('assets/brana-logo.txt'), 'utf8').trim();

/* ====================== 2. o nucleo le a tabela e resolve o casco ========= */
const nucleo = nucleo0.replace(/__USER_TSV_JSON__/g, JSON.stringify(tabela));
if(nucleo.indexOf('__USER_TSV_JSON__') >= 0) morre('não achei o marcador da tabela em assets/nucleo.js.');

let N;
try {
  N = (new Function(nucleo + `
    ; return { USER_TSV, DEFAULT_TSV, CHINE_TSV, parseOffsets, makeHull, CUT, cutSync,
               buildSections, floatState, uprightState, solveEquilibrium, scanExtremes,
               RAD, DEG, get SEC(){ return SEC; } };`))();
} catch(e){
  morre('o núcleo não carregou: ' + e.message);
}

let parsed;
try { parsed = N.parseOffsets(N.USER_TSV); }
catch(e){ morre('a tabela de cotas não passou na leitura — ' + e.message); }

const modo = parsed.mode;                       /* 'redondo' | 'quinado' */
const hull = N.makeHull(parsed);
N.CUT.on = true; N.CUT.rake = 0; N.CUT.pos = hull.stations[0];
N.cutSync(hull);
N.buildSections(hull, 200, 26);
const SEC = N.SEC;

const LOA   = (SEC.x1 - SEC.x0) / 1000;
const BOCA  = 2 * SEC.yMax / 1000;
const PONT  = (SEC.zTop - SEC.zBot) / 1000;
if(!(LOA > 0.05) || !(BOCA > 0.01) || !(PONT > 0.01))
  morre(`a geometria saiu degenerada: comprimento ${F(LOA,3)} m, boca ${F(BOCA,3)} m, pontal ${F(PONT,3)} m. Confira as unidades da tabela — as cotas são em milímetros.`);

const T0 = (arg.calado !== null)
  ? Math.max(SEC.zBot + 1, Math.min(SEC.zTop, arg.calado))
  : SEC.zBot + 0.41 * (SEC.zTop - SEC.zBot);
const RHO = 1025;                                /* agua salgada, como o painel abre */
const lvl = N.floatState(0, 0, T0, true);
if(!(lvl.V > 0)) morre(`no calado de partida (${F(T0,0)} mm) o casco não desloca volume nenhum. Se você passou --calado, confira o valor.`);

const disp = lvl.V * 1e-9 * RHO;
const G0   = [lvl.B[0], 0, lvl.B[2]];
const up   = N.uprightState(lvl.V, G0);
const eq   = N.solveEquilibrium(lvl.V, G0, null, true);
const ex   = N.scanExtremes(eq.d, eq.th, eq.ps);
const trim0 = eq.th * N.DEG, banda0 = eq.ps * N.DEG;

/* ============================ 3. monta a pagina ========================== */
const eDeGrande = modo === 'quinado' ? 'Quinado' : 'Redondo';
const descBaliza = modo === 'quinado' ? 'casco quinado' : 'casco de bojo redondo';
const CASCO_DESC = `${descBaliza} · ${parsed.rows.length} balizas · ${F(LOA,3)} m`;
const CASCO_TITULO = `${eDeGrande} ${F(LOA,2)} m`;
const oposto = modo === 'quinado'
  ? { id: 'demoRound', rotulo: 'Exemplo redondo', tsv: 'DEFAULT_TSV', msg: 'redondo' }
  : { id: 'demoChine', rotulo: 'Exemplo quinado', tsv: 'CHINE_TSV',  msg: 'quinado' };

let pagina = pagina0
  .replace('__LOGO__', logo)
  .replace(/__CASCO_TITULO__/g, CASCO_TITULO)
  .replace(/__CASCO_DESC_PLANO__/g, `${descBaliza} de ${F(LOA,3)} m`)
  .replace(/__CASCO_DESC__/g, CASCO_DESC)
  .replace(/__PROJETISTA__/g, nome)
  .replace(/__DEMO_ID__/g, oposto.id)
  .replace(/__DEMO_ROTULO__/g, oposto.rotulo);

let painel = painel0
  .replace(/__DEMO_ID__/g, oposto.id)
  .replace(/__DEMO_TSV__/g, oposto.tsv)
  .replace(/__DEMO_MSG__/g, oposto.msg)
  .replace(/__CALADO_INICIAL__/g, arg.calado !== null ? String(arg.calado) : 'null');

const html = pagina + '<script>\n' + nucleo + '</script>\n\n<script>\n' + painel +
             '</script>\n</body>\n</html>\n';

/* ====================== 4. confere o arquivo antes de gravar ============== */
const ids  = new Set([...html.matchAll(/id="([A-Za-z0-9_]+)"/g)].map(m => m[1]));
const usa  = new Set([...html.matchAll(/getElementById\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]));
const faltando = [...usa].filter(k => !ids.has(k));
const corpo = html.slice(html.indexOf('<div class="wrap">'));
const essenciais = ['gl','marks','wtBody','wtFoot','addChips','selName','btnLevel','btnCopy',
                    'cgX','cgY','cgZ','pw','eqGrid','stabGrid','secCanvas','proCanvas',
                    'gzCanvas','tsv','apply','revert','footNote', oposto.id];

const checks = [
  ['nenhum marcador sobrou',            !/__[A-Z_]+__/.test(html)],
  ['dois blocos de script, fechados',   html.split('<script>').length - 1 === 2 &&
                                        html.split('</script>').length - 1 === 2],
  ['abre com doctype',                  html.startsWith('<!DOCTYPE html>')],
  ['fecha o html',                      html.trimEnd().endsWith('</html>')],
  ['sem chamada de rede',               !/https?:\/\//.test(html)],
  ['logotipo embutido',                 html.includes('data:image/png;base64,' + logo.slice(0, 40))],
  ['divs do corpo balanceadas',         (corpo.match(/<div/g)||[]).length === (corpo.match(/<\/div>/g)||[]).length],
  ['todo getElementById tem alvo',      faltando.length === 0],
  ['elementos essenciais presentes',    essenciais.every(k => ids.has(k))],
  ['botao de exemplo casa com o script', html.includes(`id="${oposto.id}"`) &&
                                        html.includes(`getElementById('${oposto.id}')`)],
  ['tabela do usuario embutida',        html.includes(JSON.stringify(tabela).slice(1, 60))],
  ['projetista na folha',               html.includes('Projetista: ' + nome)],
  ['leituras em metro, nao em mm',      !/' mm'|<\/b> mm|un">mm</.test(html)],
  ['sem o rodape antigo de WebGL',      !html.includes('WebGL sem bibliotecas')],
  ['tamanho plausivel',                 html.length > 90000 && html.length < 500000],
  /* --- geometria e fisica, do proprio nucleo que vai no arquivo --- */
  ['tabela lida com 3+ balizas',        parsed.rows.length >= 3],
  ['formato reconhecido',               modo === 'redondo' || modo === 'quinado'],
  ['volume positivo no calado inicial', lvl.V > 0],
  ['centro de carena dentro do casco',  lvl.B[0] > SEC.x0 && lvl.B[0] < SEC.x1 &&
                                        lvl.B[2] > SEC.zBot && lvl.B[2] < SEC.zTop],
  ['CG sobre o CB parte a prumo',       Math.abs(trim0) < 0.01 && Math.abs(banda0) < 0.01],
  ['equilibrio convergiu',              eq.conv === true],
  ['GMt positivo com KG = KB',          up.GMT > 0]
];
const ruins = checks.filter(c => !c[1]).map(c => c[0]);
if(ruins.length){
  console.error('\n  RECUSADO: o arquivo não passou nas verificações:');
  ruins.forEach(r => console.error('    · ' + r));
  if(faltando.length) console.error('    ids sem alvo: ' + faltando.join(', '));
  console.error('');
  process.exit(1);
}

/* ============================== 5. grava ================================= */
if(!fs.existsSync(arg.saida)) fs.mkdirSync(arg.saida, { recursive: true });
const arquivo = `Pesos-Trim-Banda-v2-${eDeGrande}-${nome.replace(/\s+/g, '-')}.html`;
const destino = path.join(arg.saida, arquivo);
const jaExistia = fs.existsSync(destino);
fs.writeFileSync(destino, html, 'utf8');

/* ============================== 6. resumo ================================ */
const avisos = parsed.warn || [];
console.log('');
console.log(`  ${arquivo}   ${(Buffer.byteLength(html, 'utf8')/1024).toFixed(0)} KB` +
            (jaExistia ? '   (substituiu o anterior)' : ''));
console.log(`  ${destino}`);
console.log('');
console.log(`  baliza ${modo}, ${parsed.rows.length} balizas · comprimento ${F(LOA,3)} m · ` +
            `boca ${F(BOCA,3)} m · pontal ${F(PONT,3)} m`);
console.log(`  parte em ${F(T0/1000,3)} m de calado${arg.calado !== null ? ' (pedido)' : ' (41% do pontal)'}` +
            ` · desloca ${F(lvl.V*1e-9,3)} m³ = ${F(disp,0)} kg em água salgada`);
console.log(`  KB ${F(up.KB/1000,3)} m · BMt ${F(up.BMT/1000,3)} m · KMt ${F((up.KB+up.BMT)/1000,3)} m` +
            ` · GMt ${F(up.GMT/1000,3)} m com o CG na altura do CB`);
console.log(`  LCB ${F((lvl.B[0]-SEC.x0)/1000,3)} m da popa · área do plano d'água ${F(lvl.Awp*1e-6,3)} m²` +
            ` · borda livre mínima ${F(ex.fb/1000,3)} m`);
console.log(`  tabela de pesos abre com o barco (${F(Math.max(1, Math.round(disp - 75)),0)} kg) ` +
            `e um peso de 75 kg sobre o CG dele: casco a prumo, trim ${F(trim0,2)}° e banda ${F(banda0,2)}°`);
if(avisos.length){
  console.log('');
  console.log(`  ${avisos.length} aviso${avisos.length > 1 ? 's' : ''} de geometria (a tabela foi aceita):`);
  avisos.forEach(a => console.log('    · ' + a));
}
console.log('');
console.log(`  todas as ${checks.length} verificações passaram`);
console.log('');
