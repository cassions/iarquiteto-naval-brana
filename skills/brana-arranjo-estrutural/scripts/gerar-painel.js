#!/usr/bin/env node
/* ============================================================================
   brana-arranjo-estrutural · gerador do painel de escantilhoes

     node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" \
        [--saida=<pasta>] [--material=ply] [--deslocamento=<t>] [--calado=<mm>]
        [--velocidade=<nos>] [--espelho=<graus>] [--barco="<nome>"]

   O que ele faz, nesta ordem:

     1. le a tabela de cotas com o MESMO codigo que vai rodar no navegador
        (assets/cotas.js). Nao existe um segundo leitor de tabela nesta skill:
        se o parser recusa aqui, recusaria la;
     2. levanta os particulares da propria tabela - comprimento, boca, pontal,
        posicao da boca maxima, deadrise - e resolve calado e deslocamento um
        a partir do outro pela hidrostatica das balizas;
     3. roda o motor de escantilhao aqui no Node e imprime a espessura exigida,
        para provar que o painel fecha antes de gravar;
     4. monta a pagina, confere 32 propriedades do arquivo e grava.

   Recusa com mensagem especifica em vez de gerar um painel errado.
   ============================================================================ */
'use strict';

const fs   = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const A    = (p) => path.join(RAIZ, p);

const MATERIAIS = {
  wood:  'madeira maciça',  ply: 'compensado naval', alu: 'alumínio',
  steel: 'aço',             frp: 'fibra de vidro'
};

/* ------------------------------------------------------------- argumentos -- */
const AJUDA = `uso: node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" [opcoes]

  --tabela        arquivo de texto com a tabela de cotas (OBRIGATORIO)
  --nome          nome de quem esta usando (OBRIGATORIO) - vai para o arquivo e a folha
  --saida         pasta onde gravar o HTML (padrao: pasta atual)
  --material      wood | ply | alu | steel | frp (padrao: ply)
  --deslocamento  deslocamento em toneladas; dele sai o calado
  --calado        calado em mm; dele sai o deslocamento. Nao use junto com --deslocamento
  --velocidade    velocidade maxima em nos (padrao: velocidade de casco, tirada do LWL da tabela)
  --espelho       inclinacao do espelho de popa em graus (padrao: 12)
  --barco         nome da embarcacao (padrao: o nome do arquivo da tabela)`;

/* as mensagens do motor as vezes trazem <sub> e <b>, que servem na tela e
   atrapalham no terminal                                              */
function morre(msg){
  console.error('\n  RECUSADO: ' + String(msg).replace(/<[^>]+>/g, '') + '\n');
  process.exit(1);
}

function argumentos(){
  const o = { saida: process.cwd(), material: 'ply', espelho: 12,
              deslocamento: null, calado: null, velocidade: null, barco: null };
  const num = (v, k) => {
    const n = Number(String(v).replace(',', '.'));
    if(!isFinite(n)) morre(`--${k} precisa ser um número; veio "${v}".`);
    return n;
  };
  for(const a of process.argv.slice(2)){
    const m = /^--([a-z]+)(?:=([\s\S]*))?$/.exec(a);
    if(!m) morre(`argumento não reconhecido: ${a}`);
    const [, k, v] = m;
    if(k === 'ajuda'){ console.log(AJUDA); process.exit(0); }
    else if(k === 'tabela')       o.tabela = v;
    else if(k === 'nome')         o.nome = v;
    else if(k === 'saida')        o.saida = v;
    else if(k === 'barco')        o.barco = v;
    else if(k === 'material')     o.material = String(v || '').toLowerCase();
    else if(k === 'deslocamento') o.deslocamento = num(v, k);
    else if(k === 'calado')       o.calado = num(v, k);
    else if(k === 'velocidade')   o.velocidade = num(v, k);
    else if(k === 'espelho')      o.espelho = num(v, k);
    else morre(`argumento não reconhecido: --${k}`);
  }
  if(!o.tabela) morre('falta --tabela=<arquivo com a tabela de cotas>. A tabela é obrigatória: sem ela não há forma de casco, e esta skill não inventa cotas.');
  if(!o.nome)   morre('falta --nome="<seu nome>". Ele vai para o título, o rodapé e o nome do arquivo.');
  if(!MATERIAIS[o.material]) morre(`--material precisa ser um de: ${Object.keys(MATERIAIS).join(', ')}. Veio "${o.material}".`);
  if(o.deslocamento !== null && o.calado !== null)
    morre('passe --deslocamento OU --calado, não os dois: um sai do outro pela hidrostática da tabela.');
  if(o.deslocamento !== null && !(o.deslocamento > 0)) morre('--deslocamento precisa ser maior que zero, em toneladas.');
  if(o.calado !== null && !(o.calado > 0))             morre('--calado precisa ser maior que zero, em milímetros.');
  if(o.velocidade !== null && !(o.velocidade >= 0))    morre('--velocidade não pode ser negativa.');
  if(!(o.espelho >= -45 && o.espelho <= 60))           morre('--espelho fora de −45° a 60°.');
  return o;
}

const F = (v, d) => Number(v).toLocaleString('pt-BR',
  { minimumFractionDigits: d, maximumFractionDigits: d });

function limpaNome(n){
  const s = String(n).replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if(!s) morre('o nome ficou vazio depois de tirar os caracteres que o sistema de arquivos não aceita.');
  return s;
}

/* ============================================================= 1. entrada == */
const arg  = argumentos();
const nome = limpaNome(arg.nome);

if(!fs.existsSync(arg.tabela)) morre(`não encontrei a tabela em ${arg.tabela}`);
const tabela = fs.readFileSync(arg.tabela, 'utf8').replace(/^﻿/, '');
if(!tabela.trim())     morre(`o arquivo ${arg.tabela} está vazio.`);
if(!/\d/.test(tabela)) morre(`o arquivo ${arg.tabela} não tem número nenhum — não parece uma tabela de cotas.`);

for(const f of ['assets/pagina.html', 'assets/cotas.js', 'assets/motor.js',
                'assets/painel.js', 'assets/brana-logo.txt'])
  if(!fs.existsSync(A(f))) morre(`falta o ativo ${f} — a skill está incompleta.`);

const pagina0 = fs.readFileSync(A('assets/pagina.html'), 'utf8');
/* O leitor de cotas vem antes do motor, e e o MESMO arquivo que o painel
   carrega no navegador: um so leitor de tabela nesta skill.            */
const motor0  = fs.readFileSync(A('assets/cotas.js'), 'utf8') + '\n' +
                fs.readFileSync(A('assets/motor.js'), 'utf8');
const painel0 = fs.readFileSync(A('assets/painel.js'),  'utf8');
const logo    = fs.readFileSync(A('assets/brana-logo.txt'), 'utf8').trim();

const barco = (arg.barco || path.basename(arg.tabela).replace(/\.[^.]+$/, '')
                              .replace(/[-_]+/g, ' ').trim() || 'Casco da tabela').slice(0, 48);

/* ============ 2. o motor le a tabela e resolve o casco, aqui no Node ====== */
/* O mesmo motor.js que vai no arquivo: um so leitor de tabela nesta skill.  */
function carregaMotor(barcoJSON, xim){
  const src = motor0
    .replace('__COTAS_TSV_JSON__', JSON.stringify(tabela))
    .replace('__BARCO_JSON__', barcoJSON)
    .replace('__XIM__', String(xim));
  if(/__[A-Z_]+__/.test(src)) morre('sobrou marcador em assets/motor.js: ' + (src.match(/__[A-Z_]+__/) || [])[0]);
  return new Function(`
    var window = undefined, document = undefined;
    ${src}
    ; return { montaCasco:montaCasco, sect:sect, girthPt:girthPt, yAtZ:yAtZ,
               hidro:hidro, caladoParaDeslocamento:caladoParaDeslocamento,
               compute:compute, computeE:computeE, estrutura:estrutura,
               snGerr:snGerr, gerrValido:gerrValido,
               typicalSpacing:typicalSpacing,
               vMaxSn:vMaxSn, ST:ST, MATS:MATS, nomeReg:nomeReg, fmt:fmt,
               get CASCO(){ return CASCO; } };`)();
}

/* primeira passada: so para ler a tabela e medir o casco */
let M;
try { M = carregaMotor('{}', 0.5); }
catch(e){ morre('o motor não carregou: ' + e.message); }

let C;
try { C = M.montaCasco(tabela); }
catch(e){ morre('a tabela de cotas não passou na leitura — ' + e.message); }

const modo = C.modo;                                   /* 'quinado' | 'redondo' */
const LOA = C.LOA0, BOA = C.BOA0, D = C.D0;

/* posicao da boca maxima, medida da popa, em fracao do comprimento */
let xMax = C.rows[0].x, yMax = 0;
C.rows.forEach(r => r.pts.forEach(p => { if(p[0] > yMax){ yMax = p[0]; xMax = r.x; } }));
const XIM = Math.min(0.92, Math.max(0.08, (xMax - C.x0) / C.LOA0));

/* deadrise na baliza mais proxima da meia-nau, so para constar na ficha */
const iMid = C.rows.reduce((b, r, i, a) =>
  Math.abs(r.x - (C.x0 + XIM*C.LOA0)) < Math.abs(a[b].x - (C.x0 + XIM*C.LOA0)) ? i : b, 0);
const pm = C.rows[iMid].pts;
const beta = Math.atan2(pm[1][1] - pm[0][1], Math.max(1e-9, pm[1][0] - pm[0][0])) * 180/Math.PI;

/* ------- calado e deslocamento: um sai do outro pela tabela ------------- */
function comBoat(b){ Object.assign(M.ST.boat, b); }
comBoat({ LOA, BOA, D, LWL: LOA, BWL: BOA });

let d, disp, origemCalado;
if(arg.calado !== null){
  d = arg.calado/1000;
  if(d >= D) morre(`o calado de ${F(arg.calado,0)} mm passa do pontal de ${F(D*1000,0)} mm medido na tabela.`);
  disp = M.hidro(d).disp;  origemCalado = 'pedido';
} else if(arg.deslocamento !== null){
  const dMax = M.hidro(D*0.999).disp;
  if(arg.deslocamento > dMax)
    morre(`o deslocamento de ${F(arg.deslocamento,3)} t afunda o casco além da borda: cheio até o trincaniz ele desloca ${F(dMax,3)} t.`);
  d = M.caladoParaDeslocamento(arg.deslocamento);
  disp = arg.deslocamento;  origemCalado = 'do deslocamento';
} else {
  d = 0.35*D;  disp = M.hidro(d).disp;  origemCalado = '35% do pontal, à falta de dado';
}
const H = M.hidro(d);
if(!(H.V > 0)) morre(`no calado de ${F(d*1000,0)} mm o casco não desloca volume nenhum.`);
if(!(H.LWL > 0.05) || !(H.BWL > 0.01))
  morre(`a linha d'água saiu degenerada: LWL ${F(H.LWL,3)} m, BWL ${F(H.BWL,3)} m.`);

/* ------- velocidade: a tipica para o porte, se ninguem disser ----------- */
/* Arredonda o que vai para a grade editavel do passo 1: o usuario ve estes
   numeros num campo, e 1.198444129554009 m de boca na linha d'agua nao e uma
   medida, e um resto de conta.                                             */
const r = (v, n) => Math.round(v * Math.pow(10, n)) / Math.pow(10, n);
function montaBarco(V){
  return { n: barco, LOA: r(LOA,3), LWL: r(H.LWL,3), BOA: r(BOA,3), BWL: r(H.BWL,3),
           D: r(D,3), d: r(d,4), disp: r(disp,4),
           beta: r(beta,2), rake: arg.espelho, planing: false, V: r(V,1) };
}
let boat = montaBarco(10);
M = carregaMotor(JSON.stringify(boat), XIM);
M.montaCasco(tabela);
Object.assign(M.ST.boat, boat);
M.ST.mat = arg.material;

let R;
try { R = M.compute(); }
catch(e){ morre('o motor de escantilhão não fechou com esta tabela: ' + e.message); }

/* Velocidade: nao se adivinha. Chutar alto engorda a chapa, chutar baixo
   afina — nenhum dos dois e seguro. Sem --velocidade o painel assume a
   VELOCIDADE DE CASCO tirada do LWL da propria tabela, que e o que um casco
   em deslocamento faz, e diz que assumiu.                                  */
const V = (arg.velocidade !== null) ? arg.velocidade
        : Math.max(2, Math.round(1.34 * Math.sqrt(H.LWL * 3.280839895) * 10)/10);
const origemV = (arg.velocidade !== null) ? 'pedida'
              : 'ASSUMIDA: velocidade de casco, 1,34·√Lₓₓ — informe --velocidade';
boat = montaBarco(V);
boat.planing = V / Math.sqrt(Math.max(0.01, H.LWL*3.280839895)) > 2.5;

/* ------- passada final, ja com a velocidade certa ----------------------- */
M = carregaMotor(JSON.stringify(boat), XIM);
M.montaCasco(tabela);
Object.assign(M.ST.boat, boat);
M.ST.mat = arg.material;
/* o painel abre no espacamento tipico do material, como faz o init() da tela:
   sem isto o relatorio imprimiria um arranjo que o usuario nunca veria      */
try {
  M.compute();
  const ts = M.typicalSpacing();
  M.ST.sL = Math.round(ts.sL/5)*5;
  M.ST.sT = Math.round(ts.sT/5)*5;
  M.ST.t = { fundo:null, costado:null, espelho:null, conves:null };
  /* do mesmo jeito que a tela abre: sem escolha de perfil nem de antepara
     feita a dedo, para que os dois cheguem ao mesmo arranjo               */
  M.ST.perf = {};
  M.ST.ant = { v:null, r:null, manV:false, manR:false, ultimo:null, onV:true, onR:true };
} catch(e){ morre('não consegui levantar o espaçamento típico: ' + e.message); }
/* computeE() = compute() mais os passos 6, 7 e 8: perfil de cada reforço,
   anteparas de colisão sobre caverna, e o quadro de pesos e centros.      */
try { R = M.computeE(); }
catch(e){ morre('o motor de arranjo estrutural não fechou: ' + e.message); }
if(!R.perf || !R.ant || !R.pes)
  morre('o motor não devolveu os passos 6, 7 e 8 — ativo desatualizado em assets/.');

const fundo = R.reg.fundo;
if(!(fundo.tGov > 0) || !isFinite(fundo.tGov))
  morre(`a espessura exigida no fundo saiu em ${fundo.tGov} — o cálculo não fechou.`);

/* ============================ 3. monta a pagina ========================== */
const eDeGrande  = modo === 'quinado' ? 'Quinado' : 'Redondo';
const descBaliza = modo === 'quinado' ? 'casco quinado' : 'casco de bojo redondo';
const CASCO_TITULO = `${barco} · ${F(LOA,2)} m`;
const CASCO_DESC   = `${descBaliza} · ${C.nBalizas} balizas · ${F(LOA,2)} × ${F(BOA,2)} × ${F(D,2)} m`;

const barcoJSON = JSON.stringify(boat);
const barcoAula = JSON.stringify({ i: 0, n: barco,
  sub: `${F(LOA,2)} m · ${F(V,1)} nós · ${descBaliza}` });

const motor = motor0
  .replace('__COTAS_TSV_JSON__', JSON.stringify(tabela))
  .replace('__BARCO_JSON__', barcoJSON)
  .replace('__XIM__', String(XIM));

const painel = painel0.replace('__BARCO_AULA__', barcoAula)
                      .replace('__MATERIAL__', arg.material);

const pagina = pagina0
  .replace('__LOGO__', logo)
  .replace(/__CASCO_TITULO__/g, CASCO_TITULO)
  .replace(/__CASCO_DESC__/g, CASCO_DESC)
  .replace(/__PROJETISTA__/g, nome);

/* o material escolhido e o casco entram no arranque */
const arranque = `
/* --------- estado inicial, montado pelo gerador desta skill --------- */
montaCasco(COTAS_TSV);
ST.mat = ${JSON.stringify(arg.material)};
`;

const html = pagina + '<script>\n' + motor + arranque + '</script>\n' +
             '<script>\n' + painel + '</script>\n</body>\n</html>\n';

/* ================== 4. confere o arquivo antes de gravar ================= */
const ids = new Set([...html.matchAll(/id="([A-Za-z0-9_]+)"/g)].map(m => m[1]));
const usa = new Set([...html.matchAll(/getElementById\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]));
const faltando = [...usa].filter(k => !ids.has(k));
const essenciais = ['viewAula','viewAdv','printDoc','btnView','btnPdfA','cvPlan','cvSect',
                    'cvPanel','cvSpc','cvVel','boatChipsA','matChipsA','partGridA','sLA','sTA',
                    'velA','contaT','contaG','fsLegA','sumTableA','dkFS','fontesBloco',
                    /* passo 6 */ 'perfListA','perfSumA','perfNotaA','v6p',
                    /* passo 7 */ 'antVA','antRA','antVOut','antROut','cvAnt','antTableA',
                                  'antCapA','antBoxA','antEspA','v7a',
                    /* passo 8 */ 'pesTableA','pesCapA','pesBarsA','pesBoxA','cvCG','v8p',
                    /* passo 9 */ 'v9r'];

/* ---- o que os passos 6, 7 e 8 produziram, para conferir e para contar --- */
const perfKeys = R.stiff.filter(x => x.exists && x.key).map(x => x.key);
const semPerfil = perfKeys.filter(k => !R.perf[k]);
const perfReprovado = perfKeys.filter(k => R.perf[k] && !R.perf[k].esc.passa);
const somaLinhas = R.pes.linhas.reduce((a, l) => a + l.m, 0);
const antForaDaBaliza = R.ant.itens.filter(a => Math.abs(a.x - R.frames[a.iF]) > 1e-9);
const antCruzadas = !!(R.ant.v && R.ant.r) && R.ant.v.iF <= R.ant.r.iF;
const antReprovada = R.ant.itens.filter(a => !a.passaChapa);
const antForaDaFaixa = R.ant.itens.filter(a => !a.dentro);

const checks = [
  ['nenhum marcador sobrou',           !/__[A-Z_]+__/.test(html)],
  ['dois blocos de script, fechados',  html.split('<script>').length - 1 === 2 &&
                                       html.split('</script>').length - 1 === 2],
  ['abre com doctype',                 html.startsWith('<!DOCTYPE html>')],
  ['fecha o html',                     html.trimEnd().endsWith('</html>')],
  ['sem chamada de rede',              !/(src|href)="https?:/.test(html)],
  ['logotipo embutido',                html.includes('data:image/png;base64,' + logo.slice(0, 40))],
  ['todo getElementById tem alvo',     faltando.length === 0],
  ['elementos essenciais presentes',   essenciais.every(k => ids.has(k))],
  ['tabela do usuario embutida',       html.includes(JSON.stringify(tabela).slice(1, 60))],
  ['nome na folha',                    html.includes('Projetista: ' + nome)],
  ['material escolhido no arranque',   html.includes(`ST.mat = ${JSON.stringify(arg.material)}`)],
  ['a geometria vem da tabela',        html.includes('function montaCasco(') &&
                                       !html.includes('var XIM = 0.42;')],
  ['um so sect() no arquivo',          (html.match(/function sect\(/g) || []).length === 1],
  ['um so girthPt() no arquivo',       (html.match(/function girthPt\(/g) || []).length === 1],
  ['um so yAtZ() no arquivo',          (html.match(/function yAtZ\(/g) || []).length === 1],
  ['tamanho plausivel',                html.length > 200000 && html.length < 900000],
  /* --- geometria e escantilhao, do proprio motor que vai no arquivo --- */
  ['tabela lida com 3+ balizas',       C.nBalizas >= 3],
  ['formato reconhecido',              modo === 'quinado' || modo === 'redondo'],
  ['perimetros positivos',             R.mid.gB > 0 && R.mid.gS > 0 && R.mid.gD > 0],
  ['volume positivo no calado',        H.V > 0],
  ['carga de projeto positiva',        fundo.head > 0],
  ['espessura exigida finita',         fundo.tGov > 0 && fundo.tGov < 500],
  ['as quatro regioes fecham',         R.ORD.every(k => R.reg[k].tGov > 0 && isFinite(R.reg[k].tGov))],
  ['massa do chapeamento positiva',    R.massaTot > 0 && isFinite(R.massaTot)],
  /* --- passos 6, 7 e 8 --- */
  ['a tela tem os nove passos',        (html.match(/data-step="\d"/g) || []).length === 9],
  ['perfil escolhido para cada reforço', semPerfil.length === 0],
  ['seção de cada perfil é finita',    perfKeys.every(k => R.perf[k].esc.SM > 0 &&
                                         isFinite(R.perf[k].esc.SM) && R.perf[k].esc.kgm > 0)],
  ['antepara pousada sobre uma baliza', antForaDaBaliza.length === 0],
  ['anteparas não se cruzam',          !antCruzadas],
  ['massa da estrutura positiva',      R.pes.tot.m > 0 && isFinite(R.pes.tot.m)],
  ['o quadro de pesos fecha',          Math.abs(somaLinhas - R.pes.tot.m) < 0.01],
  ['centro da estrutura dentro do casco', R.pes.tot.x >= 0 && R.pes.tot.x <= LOA &&
                                       R.pes.tot.z >= 0 && R.pes.tot.z <= D*1.35]
];
const ruins = checks.filter(c => !c[1]).map(c => c[0]);
if(ruins.length){
  console.error('\n  RECUSADO: o arquivo não passou nas verificações:');
  ruins.forEach(r => console.error('    · ' + r));
  if(faltando.length) console.error('    ids sem alvo: ' + faltando.join(', '));
  console.error('');
  process.exit(1);
}

/* =============================== 5. grava =============================== */
if(!fs.existsSync(arg.saida)) fs.mkdirSync(arg.saida, { recursive: true });
const arquivo = `Arranjo-Estrutural-${eDeGrande}-${nome.replace(/\s+/g, '-')}.html`;
const destino = path.join(arg.saida, arquivo);
const jaExistia = fs.existsSync(destino);
fs.writeFileSync(destino, html, 'utf8');

/* =============================== 6. resumo ============================== */
const GV = M.gerrValido(), avisos = C.avisos.slice(0, 6);
console.log('');
console.log(`  ${arquivo}   ${(Buffer.byteLength(html,'utf8')/1024).toFixed(0)} KB` +
            (jaExistia ? '   (substituiu o anterior)' : ''));
console.log(`  ${destino}`);
console.log('');
console.log(`  ${descBaliza}, ${C.nBalizas} balizas · ${F(LOA,3)} × ${F(BOA,3)} × ${F(D,3)} m` +
            ` · boca máxima a ${F(XIM*100,0)}% da popa · deadrise ${F(beta,1)}°`);
console.log(`  calado ${F(d*1000,0)} mm (${origemCalado}) · desloca ${F(disp,3)} t` +
            ` · LWL ${F(H.LWL,3)} m · BWL ${F(H.BWL,3)} m`);
console.log(`  ${F(V,1)} nós (${origemV}) · Sₙ ${F(R.Sn,3)} · teto do método ${F(R.VmaxSn,1)} nós`);
console.log('');
console.log(`  ${MATERIAIS[arg.material]} · carga no fundo ${F(fundo.head,2)} m` +
            ` · painel ${F(fundo.s,0)} × ${F(fundo.l,0)} mm`);
console.log(`  fundo exige ${F(fundo.tGov,2)} mm (manda ` +
            `${fundo.govWho === 'Gerr' ? 'a carga de impacto' : 'a hidrostática do ABS'})` +
            ` · adota ${F(fundo.tAdo,1)} mm · FS regra ${F(fundo.fsABS,2)}`);
console.log(`  ${R.lay.fundo.nStiff} longitudinais por bordo no fundo a ${F(R.lay.fundo.s,0)} mm` +
            ` · ${R.nF-1} balizas a ${F(R.sTe,0)} mm`);
console.log(`  chapeamento das quatro regiões: ` +
            R.ORD.map(k => `${M.nomeReg(k)} ${F(R.reg[k].tAdo,1)}`).join(' · ') +
            ` mm · ${F(R.massaTot,0)} kg`);
if(R.GB) console.log(`  pelo livro de Gerr, o fundo daria ${F(R.GB.fundo,2)} mm` +
            ` (${F(100*(R.GB.fundo/fundo.tGov - 1),0)}% do caminho longo)`);

/* ---- passo 6: os perfis ---- */
console.log('');
const massaRef = perfKeys.reduce((a,k) =>
  a + (R.pes.geo[k] ? R.pes.geo[k].Ltot * R.perf[k].esc.kgm : 0), 0);
console.log(`  perfis escolhidos, os mais leves que passam · ${F(massaRef,0)} kg de reforço:`);
['lonFundo','caverna','hastilha','vau'].forEach(k => {
  if(!R.perf[k]) return;
  const row = R.stiff.filter(x => x.key === k)[0];
  console.log(`    ${row.name}: ${R.perf[k].esc.desc}` +
              ` (SM ${F(R.perf[k].esc.SM,1)} de ${F(row.SMreq,1)} cm³ exigidos)`);
});
if(perfReprovado.length)
  console.log(`    ATENÇÃO: ${perfReprovado.length} reforço(s) sem perfil que passe —` +
              ` nenhuma bitola da escada alcança o módulo exigido. Aperte o espaçamento.`);

/* ---- passo 7: as anteparas ---- */
console.log('');
if(!R.ant.itens.length){
  console.log(`  anteparas de colisão: não cabem — o cavernamento tem ${R.nF} vão(s).`);
} else {
  console.log(`  anteparas de colisão, sobre caverna · ${R.ant.nInt} cavernas internas:`);
  R.ant.itens.forEach(a => {
    console.log(`    ${a.lado === 'v' ? 'vante' : 'ré'}: ${F(a.nCav,0)}ª caverna da ` +
      `${a.lado === 'v' ? 'proa' : 'popa'} (baliza ${a.iF}, ${F(a.x,2)} m do espelho,` +
      ` ${F(100*a.daPonta,1)}% de L) · ${F(a.area,2)} m² · chapa ${F(a.tAdo,1)} de` +
      ` ${F(a.tReq,2)} mm exigidos${a.gov === 'mínimo' ? ' pelo mínimo construtivo' : ''}`);
  });
  if(antReprovada.length)
    console.log(`    ATENÇÃO: a chapa do costado não passa em ${antReprovada.length} antepara(s).`);
  if(antForaDaFaixa.length)
    console.log(`    ${antForaDaFaixa.length} antepara(s) fora da faixa usual —` +
                ` com este cavernamento pode não haver caverna dentro dela.`);
}

/* ---- passo 8: pesos e centros ---- */
console.log('');
const gr = R.pes.grupos;
console.log(`  estrutura completa ${F(R.pes.tot.m,0)} kg` +
            ` (chapa ${F(gr.chapa||0,0)} · reforços ${F(gr.ref||0,0)} · anteparas ${F(gr.ant||0,0)})` +
            (R.pes.fracDisp !== null ? ` · ${F(100*R.pes.fracDisp,1)}% do deslocamento` : ''));
console.log(`  L_CG ${F(R.pes.tot.x,2)} m do espelho (${F(100*R.pes.tot.x/LOA,0)}% de L)` +
            ` · V_CG ${F(R.pes.tot.z,3)} m da linha de base` +
            ` · com 12% de margem de construção, ${F(R.pes.tot.m*1.12,0)} kg`);
if(!GV.ok) console.log(`  fora da faixa do livro de Gerr: ${GV.avisos.join('; ').replace(/<[^>]+>/g,'')}`);
if(avisos.length){
  console.log('');
  console.log(`  ${C.avisos.length} aviso${C.avisos.length > 1 ? 's' : ''} de geometria (a tabela foi aceita):`);
  avisos.forEach(a => console.log('    · ' + a));
  if(C.avisos.length > avisos.length) console.log(`    · … e mais ${C.avisos.length - avisos.length}`);
}
console.log('');
console.log(`  todas as ${checks.length} verificações passaram`);
console.log('');
