
/* ============================================================================
   ESPAÇAMENTO DE REFORÇOS E ESPESSURA DO CASCO
   ----------------------------------------------------------------------------
   Duas fontes, e só estas duas:

   [A] ABS, Guide for Building and Classing Offshore Racing Yachts, 1994.
       Seção 2 (definições), 3.5 (largura efetiva), 4 (materiais),
       7 (chapeamento), 8 (reforços internos).

   [B] Dave Gerr, "The Elements of Boat Strength Scantling System",
       IBEX 2010, sessão 501.  Cargas de Hendrickson & Spencer (SNAME 1980),
       redução por área de Koelbel (ProBoat 67), painel com tensão de
       membrana reduzido de Rawson & Tupper (Basic Ship Theory, v.1, 3ed).

   Toda constante numérica abaixo tem a etiqueta da cláusula ou da página
   de onde veio.  Onde o painel decide algo que as fontes não dizem, o
   comentário começa com FORA DA FONTE e o mesmo aviso vai para a tela.
   ========================================================================= */

/* ------------------------------------------------- constantes de conversão */
var MM_IN = 25.4, M_FT = 3.280839895, KGF = 9.80665;   /* N por kgf */
var T_LT  = 1 / 1.0160469;      /* tonelada métrica -> tonelada longa (2240 lb) */

/* ============================================================== FONTE [A]
   Tabela 4.4 — Propriedades de Várias Madeiras (a 12% de umidade).
   mor e moe em N/mm²; tperp = tração perpendicular às fibras;
   comp = compressão paralela às fibras.                                   */
var WOODS = [
  {n:'Teca',                        sg:0.63, mor:88,  moe:12400, tp:null, cp:70},
  {n:'Mogno (América Central e do Sul)', sg:null, mor:80,  moe:10400, tp:null, cp:46},
  {n:'Freixo branco',               sg:0.60, mor:106, moe:12000, tp:6.5,  cp:51},
  {n:'Carvalho branco',             sg:0.68, mor:105, moe:12300, tp:5.5,  cp:51},
  {n:'Carvalho inglês',             sg:0.70, mor:66,  moe:10000, tp:null, cp:50},
  {n:'Pinho amarelo de folha longa',sg:0.59, mor:100, moe:13700, tp:3.2,  cp:58},
  {n:'Pinho do Oregon',             sg:0.48, mor:86,  moe:13500, tp:2.3,  cp:50},
  {n:'Abeto Douglas',               sg:0.48, mor:86,  moe:13500, tp:2.3,  cp:50},
  {n:'Pinho ocidental',             sg:0.38, mor:67,  moe:10100, tp:null, cp:35},
  {n:'Pinho branco',                sg:0.35, mor:59,  moe:8550,  tp:2.1,  cp:33},
  {n:'Espruce de Sitka',            sg:0.40, mor:70,  moe:10800, tp:2.6,  cp:39},
  {n:'Cedro do Alasca',             sg:0.44, mor:76,  moe:9790,  tp:2.5,  cp:44},
  {n:'Cedro vermelho ocidental',    sg:0.32, mor:52,  moe:7650,  tp:1.5,  cp:31},
  {n:'Olmo americano',              sg:0.50, mor:81,  moe:9240,  tp:4.6,  cp:38},
  {n:'Olmo rochoso',                sg:0.63, mor:102, moe:10600, tp:null, cp:49},
  {n:'Olmo britânico',              sg:0.56, mor:41,  moe:7650,  tp:null, cp:34}
];

/* Tabela 4.1 — Propriedades de Ligas de Alumínio (chapa).
   utsw = ruptura mínima à tração NO ESTADO SOLDADO
   yld  = escoamento mínimo no estado NÃO soldado, 0,2%                     */
var ALUS = [
  {n:'5083-H116  até 38 mm',  utsw:275, yld:215},
  {n:'5083-H321  até 38 mm',  utsw:275, yld:215},
  {n:'5083-O     até 38 mm',  utsw:275, yld:125},
  {n:'5086-H116  até 50 mm',  utsw:240, yld:195},
  {n:'5086-H32   até 50 mm',  utsw:240, yld:195},
  {n:'5086-H34   até 25 mm',  utsw:240, yld:235},
  {n:'5086-H112  até 12,5 mm',utsw:240, yld:125},
  {n:'5454-H34   até 25 mm',  utsw:215, yld:200},
  {n:'5454-H32   até 50 mm',  utsw:215, yld:180},
  {n:'5456-H116  até 30 mm',  utsw:290, yld:230},
  {n:'5456-H321  até 12,5 mm',utsw:290, yld:230}
];

/* Tabela 4.2 — Propriedades de Aços */
var STEELS = [
  {n:'Grau A  (comum)',      uts:400, yld:235},
  {n:'Grau AH32 (alta res.)',uts:470, yld:315},
  {n:'Grau AH36 (alta res.)',uts:490, yld:355}
];

/* Tabela 4.3 — Basic Laminate Properties (bidirecional, 35% de vidro em
   peso, poliéster) / e o conjunto que Gerr usa na p.29 do paper IBEX,
   de Scott, Fiberglass Boat Design and Construction, 2ed (SNAME 1996):
   roving 24 oz alternado com manta 15 oz, poliéster, ~35% de vidro.       */
var LAMS = [
  {n:'ABS Tabela 4.3 — laminado básico', F:172,   EF:7580,  T:124,   ET:6890,  C:117,   EC:6890,
     src:'ABS Tab. 4.3'},
  {n:'Gerr/Scott — roving 24 oz + manta 15 oz', F:289.6, EF:13100, T:199.9, ET:13100, C:179.3, EC:15170,
     src:'Gerr IBEX p.29'}
];

/* Módulos de elasticidade que as fontes NÃO dão em tabela.
   Alumínio: Gerr IBEX p.29, 5083 no estado soldado, 10,1e6 psi.
   Aço: FORA DA FONTE — valor de norma, 206 000 N/mm².                     */
var E_ALU = 69640, E_STEEL = 206000;

/* [B] Escantilhões Sn dos três barcos-exemplo, Gerr IBEX p.10-12.
   Espaçamentos em polegadas, espessuras em polegadas.                     */
var SN = {
  ft:[29, 74, 110],
  alu:{ botT:[0.25,0.375,0.5], sidT:[0.1875,0.3125,0.375], dckT:[0.1875,0.25,0.3125],
        botL:[11.375,15.5,20], sidL:[10,14,16], dckL:[10,12,14], frame:[29,44,53] },
  frp:{ botT:[0.378,0.874,1.083], sidT:[0.275,0.646,0.845], dckT:[0.234,0.549,0.718],
        longMax:32, frame:[58,80.7,88] }
};

/* Espessuras comerciais por família de material, em mm.                    */
var COMM = {
  wood:[12,16,19,22,25,28,32,38,44,50,60],
  ply :[4,6,9,12,15,18,21,24,27,30],
  alu :[2,2.5,3,4,5,6,8,10,12,15,20],
  steel:[2,2.5,3,4,5,6,8,10,12,15],
  frp :null   /* contínuo, arredondado a 0,5 mm */
};

/* ------------------------------------------------------- embarcações-tipo
   O Traquino vem da tabela de cotas do painel de pesos e centros do mesmo
   projeto: LOA 3,779 m, meia-boca máxima no vau 718,2 mm, pontal 740,4 mm.
   LWL, BWL e o calado saem da hidrostática dessa tabela para 0,500 t.
   Os outros três são cascos de proporção normal, para dar escala.          */
var BOATS = [__BARCO_JSON__];

var SN_REF = {
  '29' :{frp:{fundo:0.378, costado:0.275, conves:0.234}, alu:{fundo:0.25,  costado:0.1875, conves:0.1875}},
  '74' :{frp:{fundo:0.874, costado:0.646, conves:0.549}, alu:{fundo:0.375, costado:0.3125, conves:0.25}},
  '110':{frp:{fundo:1.083, costado:0.845, conves:0.718}, alu:{fundo:0.5,   costado:0.375,  conves:0.3125}}
};

var MATS = [
  {k:'wood', n:'madeira maciça', fam:'wood'},
  {k:'ply',  n:'compensado naval', fam:'ply'},
  {k:'alu',  n:'alumínio', fam:'alu'},
  {k:'steel',n:'aço', fam:'steel'},
  {k:'frp',  n:'fibra de vidro', fam:'frp'}
];

var VIEWS = [
  {k:'iso',    n:'Isométrica', az: 38, el: 24},
  {k:'perfil', n:'Perfil',     az:-90, el:  0},
  {k:'planta', n:'Planta',     az:-90, el: 89.9},
  {k:'popa',   n:'Popa',       az:  0, el:  0},
  {k:'proa',   n:'Proa',       az:180, el:  0}
];

/* ============================================================== ESTADO */
var ST = {
  mat:'ply', boat:JSON.parse(JSON.stringify(BOATS[0])), boatIdx:0,
  sL:254, sT:254,
  grade:{wood:0, ply:1, alu:0, steel:0},   /* teca / mogno / 5083-H116 / grau A */
  lam:0, plyVerif:false, plyMOR:40, plyE:6200,
  t:{fundo:null, costado:null, espelho:null, conves:null},
  kRef:0.681,         /* V_ref / envelope — média dos três barcos-exemplo do paper */
  govern:1,           /* espessura governante = maior entre ABS e Gerr            */
  view:'iso', az:38, el:24, zoom:1,
  show:{fundo:1, costado:1, conves:1, espelho:1, lon:1, tra:1, painel:1, agua:1, umBordo:0}
};

/* ================================================== FONTE [A] — TABELAS */

/* Tabela 7.3, forma fechada impressa na própria tabela.
   s = aresta curta, l = aresta longa.                                     */
function kAsp(s, l){ var r = s / l; return 0.5   / (1 + 0.623 * Math.pow(r, 6)); }
function k1Asp(s, l){ var r = s / l; return 0.028 / (1 + 1.056 * Math.pow(r, 5)); }

/* A escada de F das Tabelas 7.4 e 8.1b, interpolada linearmente
   (a Tabela 8.1b manda interpolar; a 7.4 usa a mesma escada).             */
var F_LADDER = [[0,1.00],[0.05,0.94],[0.10,0.88],[0.20,0.77],[0.30,0.67],[0.40,0.57],
                [0.50,0.49],[0.60,0.42],[0.70,0.36],[0.80,0.32],[0.90,0.28],[1.00,0.25]];
function fromLadder(cf){
  if(cf <= 0) return 1.00;
  if(cf >= 1) return 0.25;
  for(var i=1;i<F_LADDER.length;i++){
    if(cf <= F_LADDER[i][0]){
      var a=F_LADDER[i-1], b=F_LADDER[i];
      return a[1] + (b[1]-a[1]) * (cf-a[0]) / (b[0]-a[0]);
    }
  }
  return 0.25;
}
/* Tabela 7.4 — casco.  s em mm, limitado a 1270 mm; L em m.               */
function F_shell(s, L){ return fromLadder((Math.min(s,1270) - 254) / (54.2*L + 559)); }
/* Tabela 7.5 — convés.  s em mm.                                          */
function F_deck(s){ return s <= 254 ? 1.00 : Math.max(0.59, 1.102 - 0.0004*s); }
/* Tabela 8.1b — reforços do casco.  l em m (vão), L em m.                 */
function F_int_shell(l, L){ return fromLadder((l - 0.254) / (0.0542*L + 0.559)); }
/* Tabela 8.1b — reforços de convés, cockpit e casaria.  l em m.           */
function F_int_deck(l){
  if(l >= 1.93)  return 0.33;
  if(l <= 0.254) return 1.00;
  return 1.102 - 0.4*l;
}

/* --------------------------------------------------- geometria normativa */
function Lscant(){ return (ST.boat.LOA + ST.boat.LWL) / 2; }             /* 2.1  */
function hBasic(){ /* Tabela 7.1 */
  var L = Lscant(), d = ST.boat.d;
  if(L > 24) d = Math.max(d, 0.048*L + 0.091);                          /* nota 3 */
  return 3.0*d + 0.14*L + 1.62;
}

/* Multiplicadores da Tabela 7.1, interpolados ao longo do comprimento
   (nota 1).  X medido da extremidade de POPA de LOA, em metros.
   O balanço, quando existe, é repartido igualmente entre proa e popa.     */
function tab71Anchors(){
  var b = ST.boat, ov = Math.max(0, (b.LOA - b.LWL) / 2), xf = b.LOA - ov;
  return [
    {X:0,                        below:0.70, above:0.63},   /* extremidade de popa  */
    {X:xf - 0.35*b.LWL,          below:1.20, above:1.08},
    {X:xf - 0.05*b.LWL,          below:1.20, above:1.08},
    {X:b.LOA,                    below:0.80, above:0.70}    /* extremidade de proa  */
  ].sort(function(p,q){ return p.X - q.X; });
}
function tab71Mult(X, above){
  var a = tab71Anchors(), key = above ? 'above' : 'below';
  if(X <= a[0].X) return a[0][key];
  if(X >= a[a.length-1].X) return a[a.length-1][key];
  for(var i=1;i<a.length;i++){
    if(X <= a[i].X){
      var p=a[i-1], q=a[i];
      if(q.X - p.X < 1e-9) return q[key];
      return p[key] + (q[key]-p[key]) * (X-p.X) / (q.X-p.X);
    }
  }
  return a[a.length-1][key];
}
/* Carga de projeto do chapeamento do casco, em metros, num ponto (X, z).
   Tabela 7.1 a) abaixo de d + 0,15 m;  b) acima.  Como f_l = z - d,
   a expressão (h - d - f_l) colapsa em (h - z).                           */
function shellHead(X, z){
  var h = hBasic(), d = ST.boat.d;
  if(z <= d + 0.15) return {h: tab71Mult(X,false) * h, zone:'7.1a'};
  return {h: Math.max(0, tab71Mult(X,true) * (h - z)), zone:'7.1b'};
}
function deckHead(){ return 0.04*Lscant() + 1.83; }                     /* Tab 7.1c */

/* ================================================ PROPRIEDADES DO MATERIAL */
function matProps(){
  var m = ST.mat, o = {mat:m, notes:[]};
  if(m === 'wood'){
    var w = WOODS[ST.grade.wood];
    o.label = 'madeira maciça · ' + w.n;
    o.MOR = w.mor; o.E = w.moe;
    o.sigA   = 0.4 * w.mor;      o.srcA   = 'ABS Tab. 7.2 · tabuado liso, 0,4·MOR';
    o.sigInt = 0.375 * w.mor;    o.srcInt = 'ABS Tab. 8.2 · madeira não laminada, 0,375·MOR';
    o.ult = w.mor;               o.srcUlt = 'ABS Tab. 4.4 · módulo de ruptura';
    o.eq = '7.5.1';  o.effw = 'nenhuma';  o.frame = 'transversal (ABS 8.3.2)';
    o.comm = COMM.wood;
  } else if(m === 'ply'){
    var w2 = WOODS[ST.grade.ply];
    o.label = 'compensado naval · lâminas de ' + w2.n;
    if(ST.plyVerif){
      o.MOR = ST.plyMOR; o.E = ST.plyE;
      o.srcMOR = 'MOR verificado, informado pelo usuário (ABS Tab. 7.2 nota 3)';
    } else {
      o.MOR = 0.22 * w2.mor;  o.E = 0.60 * w2.moe;
      o.srcMOR = 'ABS Tab. 7.2 nota 3 · 22% do MOR da Tab. 4.4';
      o.notes.push('E do compensado tomado como 0,60·E da espécie — FORA DA FONTE.');
    }
    o.sigA   = 0.5 * o.MOR;   o.srcA   = 'ABS Tab. 7.2 · madeira laminada, 0,5·MOR';
    o.sigInt = 0.42 * o.MOR;  o.srcInt = 'ABS Tab. 8.2 · madeira laminada, 0,42·MOR';
    o.ult = o.MOR;            o.srcUlt = 'módulo de ruptura do painel';
    o.eq = '7.1';  o.effw = '50·t (ABS 3.5.2)';  o.frame = 'longitudinal (ABS 8.3.1)';
    o.comm = COMM.ply;
    o.notes.push('O Guia ABS não traz equação nem propriedade para compensado: 4.9 só exige qualidade naval. Aqui ele é calculado por 7.1, como madeira laminada.');
  } else if(m === 'alu'){
    var a = ALUS[ST.grade.alu];
    o.label = 'alumínio · ' + a.n;
    o.E = E_ALU; o.yld = a.yld;
    o.sigA   = 0.60 * a.utsw;  o.srcA   = 'ABS Tab. 7.2 nota 1 · 0,60·ruptura soldada';
    o.sigInt = 0.50 * a.utsw;  o.srcInt = 'ABS Tab. 8.2 nota 1 · 0,50·ruptura soldada';
    o.ult = a.utsw;            o.srcUlt = 'ABS Tab. 4.1 · ruptura mínima soldada';
    o.eq = '7.1';  o.effw = '100·t (ABS 3.5.3)';  o.frame = 'longitudinal (ABS 8.1.1)';
    o.tminK = 100;             o.comm = COMM.alu;
  } else if(m === 'steel'){
    var s = STEELS[ST.grade.steel];
    o.label = 'aço · ' + s.n;
    o.E = E_STEEL; o.yld = s.yld;
    o.sigA   = 0.60 * s.uts;   o.srcA   = 'ABS Tab. 7.2 · 0,60·ruptura à tração';
    o.sigInt = 0.50 * s.uts;   o.srcInt = 'ABS Tab. 8.2 · 0,50·ruptura à tração';
    o.ult = s.uts;             o.srcUlt = 'ABS Tab. 4.2 · ruptura mínima';
    o.eq = '7.1';  o.effw = '100·t (ABS 3.5.3)';  o.frame = 'longitudinal (ABS 8.1.1)';
    o.tminK = 115;             o.comm = COMM.steel;
    o.notes.push('E do aço = 206 000 N/mm² — FORA DA FONTE, valor de norma; o Guia não tabela módulo para metais.');
  } else {
    var lam = LAMS[ST.lam];
    o.label = 'fibra de vidro monolítica · ' + lam.n;
    o.E = lam.EF; o.lam = lam;
    o.sigA   = 0.5 * lam.F;                       o.srcA   = 'ABS Tab. 7.2 · 0,5·resistência à flexão';
    o.sigInt = 0.5 * Math.min(lam.T, lam.C);      o.srcInt = 'ABS Tab. 8.2 + nota 4 · 0,5·ruptura';
    o.ult = lam.F;                                o.srcUlt = lam.src + ' · resistência à flexão';
    o.eq = '7.3.1';  o.effw = '18·t + b (ABS 3.5.1)';  o.frame = 'longitudinal (ABS 8.1.2a)';
    o.comm = COMM.frp;
  }
  o.fs_abs_implicito = o.ult / o.sigA;
  return o;
}

/* ======================================== ESPESSURA EXIGIDA — FONTE [A] */
/* region: 'fundo' | 'costado' | 'espelho' | 'conves'
   s, l  : arestas curta e longa do painel, em mm
   head  : carga de projeto em m (já com o multiplicador da Tabela 7.1)
   zone  : '7.1a' / '7.1b' / '7.1c'                                       */
function tReq(region, s, l, head, zone, MP){
  var L = Lscant(), D = ST.boat.D, c = 1.0;   /* c = 1 - A/s ; painel plano */
  var isDeck = (region === 'conves');
  var F = isDeck ? F_deck(s) : F_shell(s, L);
  var k  = kAsp(s, l), k1 = k1Asp(s, l);
  var out = {s:s, l:l, head:head, zone:zone, F:F, k:k, k1:k1, c:c, gov:'', notes:[]};

  /* pisos de Fh da Tabela 7.1 / 7.1 e 7.3.1a */
  var Fh = F * head, floor = 0;
  if(!isDeck){
    if(MP.mat === 'frp') floor = (region === 'costado') ? 0.5*D : D;
    else                 floor = (region === 'costado') ? 0.8*D : D;
    if(region === 'espelho') floor = (zone === '7.1a') ? D : 0.8*D;
  }
  if(Fh < floor){ Fh = floor; out.notes.push('piso Fh ≥ ' + fmt(floor,2) + ' m'); }
  out.Fh = Fh;

  if(MP.mat === 'wood'){
    /* 7.5.1 — tabuado liso.  A equação métrica usa 0,001·h com σa em
       kgf/mm², e NÃO usa o fator F: o fator de escala 1,09|4,2 − 1,13·⁴√L|
       faz o papel da redução por área.                                    */
    var af = 1.09 * Math.abs(4.2 - 1.13 * Math.pow(L, 0.25));
    var sig_kgf = MP.sigA / KGF;
    out.p   = 0.001 * head * KGF;      /* só para exibir, em N/mm²          */
    out.af  = af;
    out.t   = af * s * Math.sqrt(0.001 * head / sig_kgf);
    out.gov = '7.5.1';
    out.k   = Math.max(k, 0.5);        /* informativo: madeira não desce de 0,5 */
    out.F   = null;
    out.Fh  = head;
    out.sig_at_of_t = function(t){ return 0.001 * head * Math.pow(af*s,2) / (t*t) * KGF; };
  } else {
    var kk = k, kk1 = k1;
    if(MP.mat === 'ply') kk = Math.max(kk, 0.5);               /* 7.1: k ≥ 0,5 madeira */
    var p = 0.01 * Fh;                                          /* N/mm², h em m  */
    out.p = p;  out.k = kk;
    var ta = s * c * Math.sqrt(p * kk / MP.sigA);                /* 7.1 / 7.3.1a   */
    out.ta = ta;
    if(MP.mat === 'frp'){
      var Fb = isDeck ? F : Math.max(F, 0.5);                    /* 7.3.1b: F ≥ 0,5 */
      var pb = 0.01 * Fb * head;
      out.Fb = Fb; out.pb = pb;
      var tb = 0.75 * s * c * Math.pow(pb * kk1 / (0.02 * MP.E), 1/3);
      out.tb = tb;
      out.t = Math.max(ta, tb);
      out.gov = (tb > ta) ? '7.3.1b · rigidez' : '7.3.1a · resistência';
    } else {
      out.t = ta;  out.gov = '7.1';
    }
    out.sig_at_of_t = function(t){ return p * kk * Math.pow(s*c,2) / (t*t); };
  }

  /* espessura mínima construtiva de 7.1, aço e alumínio */
  if(MP.tminK){
    out.tmin = Math.max(s / MP.tminK, 2.5);
    if(out.tmin > out.t){ out.t = out.tmin; out.gov = 'mínimo s/' + MP.tminK; }
  }
  return out;
}

/* ================== VERIFICAÇÃO DE CARGA E FS — FONTE [B], Gerr / IBEX */
/* Pressão de pico de impacto de Hendrickson & Spencer, p.25 (psi)         */
function Pi_psi(){
  var b = ST.boat;
  return 16.0 + 0.078 * (b.LWL * M_FT) + 0.0487 * (b.disp * T_LT);
}
/* Área de referência, p.26 (pol²) — 25·(Δ/d)·144, Δ em toneladas longas   */
function Ar_in2(){
  var b = ST.boat;
  return 25 * (b.disp * T_LT) / Math.max(b.d * M_FT, 0.05) * 144;
}
/* Redução de Koelbel, p.26 */
function koelbel(AdOverAr){
  return Math.min(0.70, Math.max(0.14, 0.14 * Math.pow(AdOverAr, -0.285)));
}

/* ==================================================== VELOCIDADE (versão 2)
   Nenhuma das duas fontes traz termo de velocidade na pressão.  O Guia ABS
   de 1994 é para iate de regata e a sua carga é hidrostática: h = 3,0d +
   0,14L + 1,62, sem V.  A pressão de Hendrickson & Spencer também não tem
   V, porque foi regredida de uma população estreita de crewboats — Gerr
   aplica a mesma Pi aos três barcos-exemplo, que vão de SL 2,2 a SL 6,0.

   O que as fontes dão sobre velocidade é isto:

   1) A fórmula impressa do envelope de validade (p.8):
          Max Knots = 45 − 0,33·Sn
      Sn de 15 → 40 nós, Sn de 40 → 31,8 nós, os dois valores que o texto
      cita, conferem exatamente.

   2) A lei de escala, dita em texto na p.1:
          "as forças crescem aproximadamente com o quadrado da velocidade"

   3) A razão SL = V/√L_WL como medida de velocidade, usada em todo o paper,
      e as razões SL dos três barcos-exemplo: 6,0 / 3,5 / 2,2 (p.10).

   4) A identificação da população de Hendrickson & Spencer: o barco de 74
      pés "seria típico do tamanho, forma e velocidade de um crewboat
      menor, exatamente o tipo de barco de que as cargas de Hendrickson &
      Spencer foram derivadas" (SL 3,5), e o de 110 pés é "exatamente o
      tamanho, a velocidade e a forma de muitos crewboats" (SL 2,2).

   A âncora tem de ser tal que, para os TRÊS barcos-exemplo do paper, o fator
   valha 1 — porque Gerr aplica a eles a pressão de H&S sem escalar nada,
   apesar de estarem em SL 6,0, 3,5 e 2,2.  Qualquer âncora numa razão SL
   fixa falha nesse teste: com SL_ref = 3,0 o barco de 29 pés sairia com
   f_V = 4, o que contradiz o próprio uso que a fonte faz da fórmula.

   O que os três barcos têm em comum não é a razão SL, é a POSIÇÃO NO
   ENVELOPE.  Dividindo a velocidade de cada um pelo respectivo 45 − 0,33·Sn:

          29 pés    30,1 / 44,56 = 0,676
          74 pés    27,7 / 39,30 = 0,705
         110 pés    21,4 / 32,25 = 0,664
                              média  0,681, dispersão ±3%

   Isto é uma regularidade real dos dados da fonte: os barcos que Gerr monta
   com "proporções e velocidades normais" rodam todos a cerca de 68% do topo
   do envelope.  Essa é a velocidade típica embutida na regressão de H&S para
   um casco daquele porte.  Daí:

          V_ref = k_ref · (45 − 0,33·Sn),   k_ref = 0,681
          f_V   = (V / V_ref)²

   Nos três barcos-exemplo isso dá f_V = 0,98 / 1,07 / 0,95, ou seja o painel
   reproduz o tratamento do paper para os barcos do paper, e só se afasta de
   1 quando a embarcação é mais rápida ou mais lenta que o típico para o seu
   porte.  O k_ref fica editável na tela, porque é leitura do painel e não
   número impresso.

   Não há piso: abaixo da velocidade típica o impacto de planeio realmente
   se apaga, e o que sustenta o chapeamento passa a ser a outra coluna — a
   carga hidrostática do ABS e as espessuras mínimas construtivas de 7.1.
   É por isso que a governante é a MAIOR das duas, e não uma média.

   f_V multiplica só a pressão de impacto do FUNDO.  Costado, espelho e
   convés continuam com a carga estática do ABS, que não escala com
   velocidade em nenhuma das duas fontes.                                  */
var K_REF_BOATS = [0.6755, 0.7048, 0.6635];            /* 29, 74 e 110 pés  */
function slRatio(){ return ST.boat.V / Math.sqrt(Math.max(0.01, ST.boat.LWL * M_FT)); }
function vMaxSn(Sn){ return 45 - 0.33 * Sn; }          /* Gerr p.8, impressa */
function snNumber(){
  var b = ST.boat, L = Lscant(), Bg = (b.BOA + b.BWL)/2;
  return (L*M_FT) * (Bg*M_FT) * (b.D*M_FT) / 1000;
}
function speedFactor(){
  var Sn = snNumber(), vmax = Math.max(1, vMaxSn(Sn));
  var kref = Math.max(0.15, Math.min(1, ST.kRef));
  var vref = kref * vmax;
  var f = Math.pow(ST.boat.V / vref, 2), cl = '';
  if(ST.boat.V > vmax) cl = 'acima do envelope 45 − 0,33·Sn';
  return {sl:slRatio(), f:f, clamp:cl, vref:vref, vmax:vmax, ref:kref, Sn:Sn};
}

/* Espessura que a cadeia de Gerr exige, dado o FS alvo e a flecha
   admissível.  Inverte por bisseção a relação de membrana da p.28 e a
   relação de flecha de Föppl.  Ambas são monotonicamente decrescentes em t,
   então a bisseção é segura.                                              */
function tFromGerr(Pd_psi, b_mm, E_Nmm2, ult_Nmm2, fsTarget, deflLimit){
  var b = b_mm / MM_IN, E = E_Nmm2 * 145.0377, ult = ult_Nmm2 * 145.0377;
  var sigAll = ult / fsTarget, dAll = b / deflLimit;
  function sigOf(t){ return membraneC((Pd_psi/E) * Math.pow(b/t, 4)) * E * Math.pow(t/b, 2); }
  function defOf(t){ return wOfA((Pd_psi/E) * Math.pow(b/t, 4)) * t; }
  function solve(fn, target){
    var lo = 0.0015, hi = 12;
    if(fn(lo) <= target) return lo;
    for(var i=0;i<90;i++){ var m = (lo+hi)/2; if(fn(m) > target) lo = m; else hi = m; }
    return hi;
  }
  var t1 = solve(sigOf, sigAll), t2 = solve(defOf, dAll);
  return {tFS:t1*MM_IN, tDefl:t2*MM_IN, t:Math.max(t1,t2)*MM_IN,
          gov:(t1 >= t2 ? 'FS ' + fmtN(fsTarget,1) : 'flecha ' + fmtN(deflLimit,0) + ':1')};
}
function fmtN(v,n){ return v.toFixed(n).replace('.', ','); }
/* Flecha de um painel longo bi-engastado com membrana.
   A = (p/E)(b/t)^4.  Pequenos deslocamentos: A = w/0,028437 (ν = 0,3);
   membrana parabólica com bordos imóveis: A = (64/3)·w³.  A soma das duas
   (Föppl) reproduz a curva δ/t, a/b → ∞ do gráfico de Rawson & Tupper que
   Gerr traz na p.28 dentro do erro de leitura — a fórmula reduzida da
   flecha não está impressa no paper, só a de tensão.                      */
function wOfA(A){
  if(A <= 0) return 0;
  var p = 35.1648 / 21.3333, q = -A / 21.3333;   /* w³ + p·w + q = 0 */
  var disc = Math.sqrt(q*q/4 + p*p*p/27);
  return Math.cbrt(-q/2 + disc) + Math.cbrt(-q/2 - disc);
}
/* Tensão de membrana, redução de Gerr p.28.  Abaixo do cruzamento com a
   teoria de pequenos deslocamentos vale esta última — membrana só alivia. */
function membraneC(A){
  var cFit = 1.912 + 0.383*A - A*A/1922;
  return Math.min(A/2, cFit);
}
/* region: 'fundo' usa Hendrickson & Spencer + Koelbel.  As demais regiões
   usam a carga estática do ABS Tabela 7.1, porque o paper de Gerr dá
   critério (FS 3) mas não dá fórmula de pressão para costado e convés.    */
function gerrCheck(region, s_mm, l_mm, t_mm, head_m, F_abs, MP){
  var o = {region:region};
  var b_in = s_mm / MM_IN, a_in = l_mm / MM_IN, t_in = t_mm / MM_IN;
  var E_psi = MP.E * 145.0377, ult_psi = MP.ult * 145.0377;
  if(region === 'fundo'){
    var Ad = b_in * a_in, Ar = Ar_in2(), sf = speedFactor();
    o.Pi = Pi_psi();  o.Ar = Ar;  o.Ad = Ad;  o.ratio = Ad / Ar;
    o.fd = koelbel(o.ratio);
    o.sf = sf;  o.fV = sf.f;
    o.Pd = o.fV * o.fd * o.Pi;                   /* versão 2: entra a velocidade */
    o.src = 'Hendrickson & Spencer + Koelbel × f_V';
    o.fsTarget = 1.5;
    o.defTarget = (MP.mat === 'frp') ? 50 : (MP.mat === 'alu' ? 75 : 50);
    o.dyn = true;
  } else {
    o.Pd = 0.01 * F_abs * head_m * 145.0377;     /* N/mm² -> psi */
    o.fV = 1;
    o.src = 'carga estática ABS Tab. 7.1';
    o.fsTarget = 3.0;
    o.defTarget = (MP.mat === 'frp') ? 100 : (MP.mat === 'alu' ? 150 : 100);
    o.dyn = false;
  }
  /* Espessura exigida por esta carga — SÓ NO FUNDO.
     Nas outras regiões a pressão que o painel usa é a do ABS, emprestada,
     porque o paper de Gerr dá o critério (FS 3, flecha 100:1) mas não dá
     fórmula de pressão para costado, espelho e convés.  Dimensionar com a
     pressão de uma fonte e o critério da outra soma as duas conservações:
     no barco de 29 pés em fibra de vidro isso pedia 12,3 mm de costado
     contra os 6,99 mm que o próprio Gerr publica, e que ele reporta como
     aprovados nas suas folhas de verificação.  Então ali o painel só
     verifica o FS da chapa, e quem dimensiona é o ABS.                     */
  if(region === 'fundo'){
    var req = tFromGerr(o.Pd, s_mm, MP.E, MP.ult, o.fsTarget, o.defTarget);
    o.tReq = req.t;  o.tReqFS = req.tFS;  o.tReqDefl = req.tDefl;  o.reqGov = req.gov;
  } else {
    o.tReq = null;  o.reqGov = 'só verificação';
  }
  o.A = (o.Pd / E_psi) * Math.pow(b_in / t_in, 4);
  o.outOfChart = o.A > 220;
  o.C = membraneC(o.A);
  o.sig_psi = o.C * E_psi * Math.pow(t_in / b_in, 2);
  o.sig = o.sig_psi / 145.0377;
  o.FS = o.sig_psi > 0 ? ult_psi / o.sig_psi : Infinity;
  o.w = wOfA(o.A);                       /* δ/t */
  o.delta_mm = o.w * t_mm;
  o.bOverDelta = o.delta_mm > 1e-9 ? s_mm / o.delta_mm : Infinity;
  o.Pd_si = o.Pd / 145.0377;
  /* tensão pela viga simples bi-engastada, faixa de 1 pol (Gerr p.27) */
  o.sig_beam = (o.Pd_si * Math.pow(s_mm,2) / (2 * t_mm * t_mm));
  return o;
}

/* ================================================== GEOMETRIA — TABELA DE COTAS
   sect(), girthPt() e yAtZ() estao em cotas.js: eles vem da tabela do
   usuario, nao de um envelope inventado.  XIM e a posicao da boca maxima,
   medida da popa, levantada da propria tabela pelo gerador.               */
var XIM = __XIM__;

var DENS_MAT = {alu:2660, steel:7850, frp:1500};

/* ============================================================== FONTE [C]
   Dave Gerr, THE ELEMENTS OF BOAT STRENGTH (International Marine /
   McGraw-Hill) — o livro inteiro, não o artigo do IBEX.

   As fórmulas abaixo vieram do acervo desta pasta (Escantilhoes_Gerr.html
   e Escantilhoes_Gerr_Acervo.xlsx), que extraiu do livro 221 fórmulas,
   50 tabelas, 159 gráficos e 150 exemplos resolvidos.

   Todas as que o painel usa foram conferidas contra os exemplos resolvidos
   do próprio livro:

     Fish'n Squish     LOA 12,19 m · boca 3,83 m · pontal 1,80 m
                       Sn = 2,97 (livro: 2,97)
                       FRP costado inferior 9,13 mm (livro: 9,2)
                       fundo a 10 nós 10,50 mm (livro: 10,5)
                       fundo a 25 nós 12,08 mm (livro: 12,1)
                       tabuado de madeira 29,04 mm (livro: 29)
                       tabuado do fundo a 30 nós 30,49 mm (livro: 30,45)

     Barco de alumínio LOA 19,50 m · LWL 16,58 · boca 5,38 · pontal 2,54
     de 64 pés         Sn = 8,71 (livro: 8,71, já com a correção 1-2)
                       chapa de fundo em alumínio 8,00 mm (livro: 8,0)
                       chapa de costado em alumínio 6,23 mm (livro: 6,23)
                       chapa de costado em aço 5,24 mm (livro: 5,24)
                       chapa de fundo em aço 6,84 mm (livro: 6,84)

   A diferença de filosofia em relação ao ABS é o ponto didático: o ABS
   percorre carga → painel → material → espessura, e responde ao arranjo
   que você desenhou.  O Gerr resume o barco inteiro num número só, o Sn,
   e devolve a espessura direto.  Um serve para projetar, o outro para
   orçar e conferir.
   ========================================================================= */

/* Fórmula 1-1, com as correções 1-2 e 1-3.
   Sn = LOA × boca × pontal / 28,32   (metros)                              */
function snGerr(){
  var b = ST.boat, loa = b.LOA, bo = b.BOA, corr = [];
  if(b.LWL > 0 && loa/b.LWL > 1.08){ loa = (loa + b.LWL)/2; corr.push('1-2 balanço longo'); }
  if(b.BWL > 0 && bo/b.BWL > 1.12){ bo = (bo + b.BWL)/2;    corr.push('1-3 flare pronunciado'); }
  return {sn: loa * bo * b.D / 28.32, loa:loa, boca:bo, corr:corr};
}

/* Faixa de validade declarada pelo livro: monocasco de 3 a 37 m, até
   45 nós, razão deslocamento-comprimento entre 100 e 275.                  */
function gerrValido(){
  var b = ST.boat, av = [], sn = snGerr().sn;
  if(sn < 0.2 || sn > 32) av.push('S<sub>n</sub> de ' + fmt(sn,2) + ', fora da faixa de 0,2 a 32 dos gráficos do livro');
  if(b.LOA < 3.05 || b.LOA > 36.6) av.push('comprimento fora de 3 a 37 m');
  if(b.V > 45) av.push('acima de 45 nós');
  var lwlFt = b.LWL * M_FT, dl = (b.disp * T_LT * 2240 / 2240) / Math.pow(lwlFt/100, 3);
  if(lwlFt > 0 && (dl < 100 || dl > 275)) av.push('razão D/L de ' + Math.round(dl) + ', fora de 100 a 275');
  return {ok: av.length === 0, avisos: av, dl: dl};
}

/* A regra de escantilhão do livro, por material e por região, em mm.       */
function gerrBook(){
  var S = snGerr(), sn = S.sn, b = ST.boat, m = ST.mat, o = {sn:sn, corr:S.corr, notas:[], f:{}};
  if(sn <= 0) return null;
  function pot(k, e){ return k * Math.pow(sn, e); }

  if(m === 'frp'){
    var base = pot(6.35, 1/3);                                  /* Fórmula 4-1 */
    var vAdj = b.V > 10 ? 1 + 0.01*(b.V - 10) : 1;              /* Fórmula 4-4 */
    o.fundo   = 1.15 * base * vAdj;                             /* Fórmula 4-2 */
    o.costado = base;
    o.conves  = 0.85 * base;
    o.espelho = 0.85 * base;
    o.base = base; o.vAdj = vAdj;
    o.f = {base:'4-1', regiao:'4-2', vel:'4-4'};
    o.txt = 'base = 6,35 × S<sub>n</sub><sup>1/3</sup>; fundo = 1,15 × base' +
            (vAdj > 1 ? ', mais 1% por nó acima de 10' : '') + '; convés = 0,85 × base';
  } else if(m === 'wood'){
    var bw = pot(18.79, 0.40);                                  /* Fórmula 9-1 */
    var vw = b.V > 25 ? 1 + 0.01*(b.V - 25) : 1;                /* ajuste de velocidade */
    o.fundo   = bw * vw;
    o.costado = bw;
    o.conves  = 0.75 * bw;                                      /* Fórmula 9-19 */
    o.espelho = bw;
    o.base = bw; o.vAdj = vw;
    o.f = {base:'9-1', conves:'9-19'};
    o.txt = 'tabuado = 18,79 × S<sub>n</sub><sup>0,40</sup>' +
            (vw > 1 ? ', mais 1% por nó acima de 25 no fundo' : '') +
            '; convés em compensado forrado = 0,75 × tabuado';
  } else if(m === 'ply'){
    var bp = pot(13.97, 0.38);                                  /* Fórmula 11-13 */
    o.fundo = bp; o.costado = bp; o.conves = bp; o.espelho = bp;
    o.base = bp; o.vAdj = 1;
    o.f = {base:'11-13'};
    o.txt = 'casca laminada = 13,97 × S<sub>n</sub><sup>0,38</sup>';
    o.notas.push('O livro não tem regra para casco de <b>compensado em folha</b>: o capítulo 11 cobre strip-plank e cold-molded. Aqui vale a Fórmula 11-13, do cold-molded, que é a casca de madeira laminada mais próxima.');
  } else if(m === 'alu'){
    o.fundo   = pot(5.08, 0.21);                                /* Fórmula 15-1A */
    o.costado = pot(3.55, 0.26);                                /* Fórmula 15-2A */
    o.conves  = pot(3.55, 0.20);                                /* Fórmula 15-4A */
    o.espelho = o.costado;
    o.base = o.costado; o.vAdj = 1;
    o.minSold = 4.75;
    o.pisoSold = (o.fundo < 4.75);          /* o piso do livro chegou a mandar? */
    o.fundo   = Math.max(o.fundo, 4.75);
    o.costado = Math.max(o.costado, 4.75);
    o.conves  = Math.max(o.conves, 4.75);
    o.espelho = o.costado;
    o.f = {fundo:'15-1A', costado:'15-2A', conves:'15-4A'};
    o.txt = 'fundo = 5,08 × S<sub>n</sub><sup>0,21</sup>; costado = 3,55 × S<sub>n</sub><sup>0,26</sup>; convés = 3,55 × S<sub>n</sub><sup>0,20</sup>';
    if(sn < 0.50) o.notas.push('A regra de alumínio do livro vale para S<sub>n</sub> acima de <b>0,50</b>, mais ou menos 6 m. Abaixo disso o livro manda ir ao capítulo 19, de alumínio pequeno, que este painel não traz.');
    o.notas.push('Mínimo soldável de <b>4,75 mm</b> — abaixo disso a chapa distorce na solda.');
  } else {
    var cs = pot(3.05, 0.25);                                   /* Fórmula 15-2S */
    var C  = sn < 3 ? 0 : (sn <= 12 ? 1.6 : 3.2);               /* Fórmula 15-1S */
    o.costado = cs;
    o.fundo   = cs + C;
    o.conves  = pot(2.79, 0.23);                                /* Fórmula 15-4S */
    o.espelho = cs;
    o.base = cs; o.vAdj = 1; o.C = C;
    o.f = {costado:'15-2S', fundo:'15-1S', conves:'15-4S'};
    o.txt = 'costado = 3,05 × S<sub>n</sub><sup>0,25</sup>; fundo = costado + ' +
            fmt(C,1) + ' mm; convés = 2,79 × S<sub>n</sub><sup>0,23</sup>';
    if(sn < 1.0) o.notas.push('A regra de aço do livro vale só para S<sub>n</sub> acima de <b>1,0</b>, mais ou menos 8,5 m; e abaixo de S<sub>n</sub> 3,0 o próprio livro avisa que o barco sai de desempenho pobre ou vida curta. Aço não é material de barco pequeno.');
  }

  /* Espaçamentos que o livro dá diretamente.                               */
  o.esp = {};
  if(m === 'alu'){
    o.esp.lon = 101.6 + 32 * o.fundo;                           /* Fórmula 15-6A */
    o.esp.tra = pot(838, 0.15);                                 /* Fórmula 15-9  */
    o.esp.f = '15-6A e 15-9';
  } else if(m === 'steel'){
    o.esp.lon = 152.4 + 48 * o.costado;                         /* Fórmula 15-6S */
    o.esp.tra = pot(838, 0.15);                                 /* Fórmula 15-9  */
    o.esp.f = '15-6S e 15-9';
  } else if(m === 'wood'){
    o.esp.tra = pot(257.5, 0.27);                               /* Fórmula 9-3   */
    o.esp.f = '9-3';
  } else if(m === 'ply'){
    /* Casca laminada: o livro dá as duas medidas no próprio capítulo do
       cold-molded.  As cavernas seguem a 9-3, mas espaçadas 2,5 vezes.      */
    o.esp.lon = pot(279.4, 0.38);                               /* Fórmula 11-14 */
    o.esp.tra = 2.5 * pot(257.5, 0.27);                         /* Fórmula 11-15 */
    o.esp.f = '11-14 e 11-15';
  } else {
    /* FRP e madeira laminada: a Fórmula 5-5 dá o NÚMERO mínimo de anteparas
       e balizas em anel, 1,15 × LOA^0,7 em metros, e o vão sai da divisão do
       comprimento.  Vale registrar que isto reproduz exatamente os
       espaçamentos que o paper IBEX publica para os barcos-exemplo de 29 e
       74 pés — 58 e 80,7 polegadas — o que amarra as duas fontes de Gerr.
       A Fórmula 5-1 pede cinco longitudinais contínuos por bordo em casco
       de fibra sólida, e daí sai o espaçamento entre longitudinais.        */
    var nB = Math.max(1, Math.round(1.15 * Math.pow(b.LOA, 0.7)));
    o.esp.tra = b.LOA * 1000 / (nB + 1);
    o.esp.nB  = nB;
    o.esp.f   = '5-5 e 5-1';
  }
  return o;
}
/* Fórmula 5-1: cinco longitudinais contínuos por bordo em casco de fibra
   sólida.  O vão entre eles é o meio-perímetro dividido em seis.           */
function gerrLonFRP(meioPerimetro_mm){ return meioPerimetro_mm / 6; }


/* ======================================================= utilidades de texto */
function fmt(v, n){
  if(v === null || v === undefined || !isFinite(v)) return '—';
  return v.toLocaleString('pt-BR', {minimumFractionDigits:n, maximumFractionDigits:n});
}
function fmtFS(v){ return (!isFinite(v)) ? '∞' : fmt(v,2); }
function el(id){ return document.getElementById(id); }

/* interpolação em lei de potência sobre os barcos-exemplo de Gerr */
function pwInterp(xs, ys, x){
  var i = 0;
  if(x >= xs[xs.length-1]) i = xs.length - 2;
  else { while(i < xs.length-2 && x > xs[i+1]) i++; }
  var b = Math.log(ys[i+1]/ys[i]) / Math.log(xs[i+1]/xs[i]);
  return ys[i] * Math.pow(x/xs[i], b);
}
function commRound(t, list){
  if(!list) return Math.ceil(t*2)/2;                 /* FRP: 0,5 mm */
  for(var i=0;i<list.length;i++) if(list[i] >= t - 1e-9) return list[i];
  return list[list.length-1];
}

/* espaçamento típico, por material */
/* O espaçamento típico agora sai direto das fórmulas do livro de Gerr, em
   vez de interpolar os três barcos-exemplo do paper IBEX.  É a mesma fonte,
   só que a versão completa, e dispensa a interpolação.                     */
function typicalSpacing(){
  var m = ST.mat, G = gerrBook();
  var mid = sect(XIM), meio = (mid.gB + mid.gS) * 1000;
  if(!G) return {sL:254, sT:508, src:'referência'};
  if(m === 'alu')
    return {sL:G.esp.lon, sT:G.esp.tra, src:'Gerr, livro · Fórmulas 15-6A e 15-9'};
  if(m === 'steel')
    return {sL:G.esp.lon, sT:G.esp.tra, src:'Gerr, livro · Fórmulas 15-6S e 15-9'};
  if(m === 'frp')
    return {sL:gerrLonFRP(meio), sT:G.esp.tra,
            src:'Gerr, livro · Fórmula 5-1 (cinco longitudinais por bordo) e 5-5 (número de anteparas)'};
  if(m === 'ply')
    return {sL:G.esp.lon, sT:G.esp.tra,
            src:'Gerr, livro · Fórmulas 11-14 e 11-15, do casco de casca laminada'};
  return {sL:254, sT:G.esp.tra,
          src:'transversais: Gerr, livro, Fórmula 9-3 · longitudinais: referência de 254 mm da Tabela 7.4 do ABS, já que o tabuado liso é cavernado transversalmente'};
}

/* ============================================================ SEÇÃO COMPOSTA */
function barSM(w, t, bw, hb){
  var A1 = w*t, y1 = t/2, A2 = bw*hb, y2 = t + hb/2, At = A1 + A2;
  if(At <= 0) return 0;
  var yb = (A1*y1 + A2*y2) / At;
  var I = w*t*t*t/12 + A1*Math.pow(y1-yb,2) + bw*hb*hb*hb/12 + A2*Math.pow(y2-yb,2);
  return I / Math.max(yb, t + hb - yb) / 1000;      /* mm³ -> cm³ */
}
function solveBar(SMreq, w, t, bw){
  var lo = 3, hi = 2000;
  if(barSM(w,t,bw,hi) < SMreq) return null;
  for(var i=0;i<80;i++){ var m=(lo+hi)/2; if(barSM(w,t,bw,m) < SMreq) lo = m; else hi = m; }
  return hi;
}

/* ================================================================== CÁLCULO */
var R = null;
function compute(){
  var MP = matProps(), b = ST.boat, L = Lscant(), mid = sect(XIM);
  var A = [];   /* avisos */

  /* --- arranjo: divide cada perímetro em painéis iguais --- */
  function div(gm, s){
    var n = Math.max(1, Math.ceil(gm*1000/s));
    return {n:n, s:gm*1000/n, nStiff:n-1, g:gm*1000};
  }
  var lay = {fundo:div(mid.gB, ST.sL), costado:div(mid.gS, ST.sL), conves:div(mid.gD, ST.sL)};

  /* --- cavernamento --- */
  var nF = Math.max(1, Math.ceil(b.LOA*1000/ST.sT)), sTe = b.LOA*1000/nF;
  var frames = []; for(var i=0;i<=nF;i++) frames.push(i*b.LOA/nF);

  /* --- espelho de popa --- */
  var s0 = sect(0), rake = b.rake*Math.PI/180;
  var twid = 2*s0.ysh*1000;
  var thei = (s0.zsh - s0.zk)/Math.cos(rake) * 1000;     /* altura real, no plano do espelho */
  var nV = Math.max(1, Math.ceil(twid/ST.sL)), sV = twid/nV;
  var nH = Math.max(1, Math.ceil(thei/ST.sL)), sH = thei/nH;

  /* --- carga governante por região: varre o comprimento e as faixas --- */
  var NS = 61;
  function scanShell(region, lyr){
    var best = {h:-1}, curve = [];
    for(var j=0;j<NS;j++){
      var xi = j/(NS-1), sc = sect(xi), X = xi*b.LOA, hx = -1, zx = 0, zn = '';
      for(var q=0;q<lyr.n;q++){
        var p1 = girthPt(sc, region, q/lyr.n), p2 = girthPt(sc, region, (q+1)/lyr.n);
        var zc = (p1[1] + p2[1])/2, sh = shellHead(X, zc);
        if(sh.h > hx){ hx = sh.h; zx = zc; zn = sh.zone; }
      }
      curve.push({X:X, h:hx, z:zx, zone:zn});
      if(hx > best.h) best = {h:hx, z:zx, zone:zn, X:X};
    }
    return {best:best, curve:curve};
  }
  var scF = scanShell('fundo',   lay.fundo);
  var scS = scanShell('costado', lay.costado);

  /* espelho: faixas horizontais na extremidade de popa de LOA */
  var bestT = {h:-1};
  for(var q=0;q<nH;q++){
    var z1 = s0.zk + (s0.zsh - s0.zk)*q/nH, z2 = s0.zk + (s0.zsh - s0.zk)*(q+1)/nH;
    var sh = shellHead(0, (z1+z2)/2);
    if(sh.h > bestT.h) bestT = {h:sh.h, z:(z1+z2)/2, zone:sh.zone, X:0};
  }

  /* --- monta as quatro regiões --- */
  function mk(region, sp, span, head, zone, Xg, zg){
    var s = Math.min(sp, span), l = Math.max(sp, span);
    var o = tReq(region, s, l, head, zone, MP);
    o.region = region; o.aspect = l/s; o.Xg = Xg; o.zg = zg;
    o.sp = sp; o.span = span;
    return o;
  }
  var reg = {
    fundo:   mk('fundo',   lay.fundo.s,   sTe, scF.best.h, scF.best.zone, scF.best.X, scF.best.z),
    costado: mk('costado', lay.costado.s, sTe, scS.best.h, scS.best.zone, scS.best.X, scS.best.z),
    espelho: mk('espelho', sV, sH, bestT.h, bestT.zone, 0, bestT.z),
    conves:  mk('conves',  lay.conves.s,  sTe, deckHead(), '7.1c', b.LOA*XIM, mid.zdc)
  };

  /* --- duas exigências, e a governante ------------------------------------
     t_ABS  não depende da velocidade: a carga do Guia é hidrostática.
     t_Gerr depende, pela pressão de impacto × f_V.
     A espessura governante é a maior das duas — é assim que se dimensiona
     na prática, e é o que faz o controle de velocidade mexer na espessura. */
  var ORD = ['fundo','costado','espelho','conves'];
  ORD.forEach(function(r){
    var o = reg[r], Fa = (o.F === null ? 1 : o.F);
    var g0 = gerrCheck(r, o.s, o.l, Math.max(o.t, 0.5), o.head, Fa, MP);
    o.tAbs      = o.t;
    o.tGerr     = g0.tReq;
    o.tGerrFS   = g0.tReqFS;
    o.tGerrDefl = g0.tReqDefl;
    o.gerrGov   = g0.reqGov;
    o.tGov   = (ST.govern && o.tGerr !== null) ? Math.max(o.tAbs, o.tGerr) : o.tAbs;
    o.govWho = (ST.govern && o.tGerr !== null && o.tGerr > o.tAbs + 1e-9) ? 'Gerr' : 'ABS';
    o.tCom   = commRound(o.tGov, MP.comm);
    if(ST.t[r] === null || !isFinite(ST.t[r])) ST.t[r] = o.tCom;
    o.tAdo   = ST.t[r];
    o.sigAt  = o.sig_at_of_t(o.tAdo);
    o.fsABS  = MP.ult / o.sigAt;
    o.gerr   = gerrCheck(r, o.s, o.l, o.tAdo, o.head, Fa, MP);
  });

  /* --- curva de espessura ao longo do comprimento --- */
  function curveT(region, sp, span, arr){
    return arr.map(function(pt){
      var o = tReq(region, Math.min(sp,span), Math.max(sp,span), pt.h, pt.zone, MP);
      return {X:pt.X, t:o.t};
    });
  }
  var curves = {
    fundo:   curveT('fundo',   lay.fundo.s,   sTe, scF.curve),
    costado: curveT('costado', lay.costado.s, sTe, scS.curve),
    conves:  scF.curve.map(function(pt){
               var o = tReq('conves', Math.min(lay.conves.s,sTe), Math.max(lay.conves.s,sTe),
                            deckHead(), '7.1c', MP);
               return {X:pt.X, t:o.t}; })
  };

  /* --- reforços: módulo de seção exigido, ABS 8.1.3 / 8.3.3 --- */
  var ellFrame = Math.hypot(mid.ysh, mid.zsh - mid.zk);   /* Fig. 8.1: corda borda->quilha */
  var stiff = [];
  function addStiff(o){
    var C = o.C, s_m = o.s, l_m = o.l, tPlate = o.t;
    var Fi = o.deckInt ? F_int_deck(l_m) : F_int_shell(l_m, L);
    var h  = Fi * o.head;
    var SM = C * h * s_m * l_m * l_m / MP.sigInt;
    var row = {name:o.name, C:C, Fi:Fi, h:h, s:s_m, l:l_m, SM:SM, sec:'—', SMsec:null,
               key:o.key, spW:o.spW, tPlate:tPlate, noun:o.noun || '',
               exists:(o.exists === undefined ? true : o.exists)};
    /* --- versão 2: o mesmo reforço pela carga de Gerr, que responde à
       velocidade.  Viga bi-engastada M = W·ℓ²/12 (p.27); nas cavernas e
       hastilhas de fundo Gerr usa rotulada na quina e engastada na quilha,
       M = W·ℓ²/8.  W = p_d × espaçamento.                                  */
    if(o.pd){
      var Win = o.pd * (s_m*1000/MM_IN);                 /* lb por polegada  */
      var Lin = l_m*1000/MM_IN;
      var Mlb = Win*Lin*Lin / (o.pin ? 8 : 12);          /* lb·pol           */
      row.SMg = Mlb / (MP.ult/o.fs * 145.0377) * 16.387064;   /* pol³ -> cm³ */
      row.pin = !!o.pin;  row.fsG = o.fs;
    }
    if(!row.exists){
      row.sec = 'não há reforço neste arranjo';
      stiff.push(row); return;
    }
    /* o SM governante é o maior entre a exigência do ABS e a da carga de Gerr */
    row.SMreq = Math.max(SM, row.SMg || 0);
    row.SMwho = (row.SMg && row.SMg > SM) ? 'Gerr' : 'ABS';
    var SMd = row.SMreq;
    /* seção proposta — dimensionada pelo painel, não é seção normalizada do Guia */
    if(MP.mat === 'alu' || MP.mat === 'steel'){
      var bw = Math.max(4, commRound(tPlate, MP.comm));
      var w  = Math.min(o.spW, 100*tPlate);
      var hb = solveBar(SMd, w, tPlate, bw);
      if(hb){ hb = Math.ceil(hb/5)*5;
        row.sec = 'barra chata ' + fmt(hb,0) + ' × ' + fmt(bw,1) + ' mm';
        row.SMsec = barSM(w, tPlate, bw, hb); row.effw = w; }
    } else if(MP.mat === 'ply'){
      var w2 = Math.min(o.spW, 50*tPlate), lo = 5, hi = 900;
      for(var i2=0;i2<80;i2++){ var m2=(lo+hi)/2; if(barSM(w2,tPlate,0.5*m2,m2) < SMd) lo=m2; else hi=m2; }
      var dd = Math.ceil(hi/5)*5, bb = Math.ceil(0.5*dd/5)*5;
      row.sec = o.noun + ' ' + fmt(bb,0) + ' × ' + fmt(dd,0) + ' mm';
      row.SMsec = barSM(w2, tPlate, bb, dd); row.effw = w2;
    } else if(MP.mat === 'wood'){
      /* 3.5.4: em tabuado liso o módulo é só do reforço.  b = 0,6·d  ->  SM = 0,1·d³ */
      var dd2 = Math.ceil(Math.pow(SMd*1000/0.1, 1/3)/5)*5, bb2 = Math.ceil(0.6*dd2/5)*5;
      row.sec = o.noun + ' ' + fmt(bb2,0) + ' × ' + fmt(dd2,0) + ' mm';
      row.SMsec = barSM(0, 0, bb2, dd2); row.effw = 0;
    } else {
      /* ABS 8.1.3, inércia mínima do FRP.  C1 = 255 em geral, 562 para hastilha na LC.
         A equação impressa é I = C1·h·s·ℓ³/(1000E); lida ao pé da letra ela devolve
         valores 10^6 vezes menores que qualquer reforço real — corresponderia a uma
         razão vão/flecha da ordem de 1/10 000.  A forma usada aqui, com o 1000 no
         numerador, reproduz vão/flecha ≈ 98 e casa com os perfis reais dos exemplos
         de Gerr.  Está sinalizado na legenda da tabela.                              */
      row.I = 1000 * (o.c1 || 255) * h * s_m * l_m*l_m*l_m / MP.E;
      row.sec = 'perfil sobre núcleo · I ≥ ' + fmt(row.I,1) + ' cm⁴';
    }
    stiff.push(row);
  }
  addStiff({key:'lonFundo', name:'Longitudinal do fundo', C:817, head:reg.fundo.head, deckInt:false,
    s:lay.fundo.s/1000, l:sTe/1000, spW:lay.fundo.s, t:reg.fundo.tAdo, noun:'sicorda',
    pd:reg.fundo.gerr.Pd, fs:1.5, exists:lay.fundo.nStiff > 0});
  addStiff({key:'lonCostado', name:'Longitudinal do costado', C:817, head:reg.costado.head, deckInt:false,
    s:lay.costado.s/1000, l:sTe/1000, spW:lay.costado.s, t:reg.costado.tAdo, noun:'sicorda',
    pd:reg.costado.gerr.Pd, fs:3.0, exists:lay.costado.nStiff > 0});
  addStiff({key:'lonConves', name:'Longitudinal do convés', C:817, head:deckHead(), deckInt:true,
    s:lay.conves.s/1000, l:sTe/1000, spW:lay.conves.s, t:reg.conves.tAdo, noun:'escoa',
    pd:reg.conves.gerr.Pd, fs:3.0, exists:lay.conves.nStiff > 0});
  addStiff({key:'caverna', name:'Baliza · caverna do costado', C:817,
    head:Math.max(reg.fundo.head, reg.costado.head), deckInt:false,
    s:sTe/1000, l:ellFrame, spW:sTe, t:reg.costado.tAdo, noun:'caverna',
    pd:reg.fundo.gerr.Pd, fs:1.5, pin:true});
  addStiff({key:'hastilha', name:'Hastilha na linha de centro', C:1800, c1:562, head:reg.fundo.head, deckInt:false,
    s:sTe/1000, l:ellFrame, spW:sTe, t:reg.fundo.tAdo, noun:'hastilha',
    pd:reg.fundo.gerr.Pd, fs:1.5, pin:true});
  addStiff({key:'vau', name:'Vau do convés', C:817, head:deckHead(), deckInt:true,
    s:sTe/1000, l:2*mid.ysh, spW:sTe, t:reg.conves.tAdo, noun:'vau',
    pd:reg.conves.gerr.Pd, fs:3.0});
  addStiff({key:'espelho', name:'Reforço vertical do espelho', C:817, head:reg.espelho.head, deckInt:false,
    s:sV/1000, l:thei/1000, spW:sV, t:reg.espelho.tAdo, noun:'prumo',
    pd:reg.espelho.gerr.Pd, fs:3.0, exists:nV > 1});

  /* --- números de Gerr para a embarcação inteira --- */
  var loaFt = b.LOA*M_FT;
  var Bg = (b.BOA + b.BWL)/2, Sn = (L*M_FT) * (Bg*M_FT) * (b.D*M_FT) / 1000;
  var VmaxSn = vMaxSn(Sn);            /* Gerr p.8, fórmula impressa: 45 − 0,33·Sn */
  var SF = speedFactor();
  var ref = {};

  /* --- varredura de velocidade: a resposta visual ao controle -------------
     Percorre V de zero ao teto do envelope e devolve, para o fundo, a
     espessura que a carga de Gerr exige e o FS da chapa já adotada.        */
  function speedSweep(N){
    var save = ST.boat.V, o = reg.fundo, Fa = (o.F === null ? 1 : o.F), out = [];
    var vTop = Math.max(8, VmaxSn * 1.12);
    for(var i=0;i<=N;i++){
      ST.boat.V = vTop*i/N;
      var g = gerrCheck('fundo', o.s, o.l, o.tAdo, o.head, Fa, MP);
      out.push({V:ST.boat.V, sl:slRatio(), fV:g.fV, Pd:g.Pd_si,
                tG:g.tReq, FS:g.FS, bd:g.bOverDelta});
    }
    ST.boat.V = save;
    return {pts:out, vTop:vTop};
  }
  var sweep = speedSweep(80);

  /* --- conferência contra os escantilhões Sn publicados, quando o barco
     selecionado é um dos três exemplos do paper --------------------------- */
  var snCheck = null;
  if(b.gerr && SN_REF[b.gerr]){
    var pub = SN_REF[b.gerr][MP.mat] || null;
    snCheck = {boat:b.gerr, has:!!pub, rows:['fundo','costado','conves'].map(function(k){
      return {k:k, pub:(pub ? pub[k]*MM_IN : null), abs:reg[k].tAbs,
              gerr:reg[k].tGerr, gov:reg[k].tGov};
    })};
  }
  if(MP.mat === 'frp'){
    var basic = b.LOA*1000/1000;                        /* Gerr p.6: LOA/1000 */
    ref.thumb = {fundo: basic*1.15*(b.planing?1.10:1), costado: basic,
                 conves: basic*0.90, src:'Gerr IBEX p.6 · regra de bolso do FRP monolítico'};
    ref.sn = {fundo: pwInterp(SN.ft, SN.frp.botT, loaFt)*MM_IN,
              costado:pwInterp(SN.ft, SN.frp.sidT, loaFt)*MM_IN,
              conves: pwInterp(SN.ft, SN.frp.dckT, loaFt)*MM_IN,
              src:'Gerr IBEX p.10-11 · interpolado nos exemplos de 29, 74 e 110 pés'};
  } else if(MP.mat === 'alu'){
    ref.sn = {fundo: pwInterp(SN.ft, SN.alu.botT, loaFt)*MM_IN,
              costado:pwInterp(SN.ft, SN.alu.sidT, loaFt)*MM_IN,
              conves: pwInterp(SN.ft, SN.alu.dckT, loaFt)*MM_IN,
              src:'Gerr IBEX p.11-12 · interpolado nos exemplos de 29, 74 e 110 pés'};
  }

  /* a regra do livro de Gerr, e se ela vale para este barco.  Precisa vir
     ANTES dos avisos, que consultam as duas.                              */
  var GB = gerrBook(), GV = gerrValido();

  /* --- avisos --- */
  if(b.LOA < 3.05 || b.LOA > 36.6)
    A.push({c:'bad', t:'O sistema Sn de Gerr cobre embarcações de <b>10 a 120 pés</b> (3,0 a 36,6 m). Com L<sub>OA</sub> = ' + fmt(b.LOA,2) + ' m a verificação de cargas sai da faixa declarada.'});
  if(L < 9.15)
    A.push({c:'', t:'L de escantilhão de ' + fmt(L,2) + ' m: o Guia ABS não declara comprimento mínimo, mas é escrito para <b>iate de regata oceânica</b> e a sua própria Tabela 7.8 manda não tomar L menor que <b>9,15 m</b>. Abaixo disso a regra está sendo extrapolada para baixo — e ela extrapola <em>a favor da grossura</em>: o fator de escala do tabuado liso, 1,09|4,2 − 1,13·⁴√L|, cresce quando L diminui.'});
  if(reg.conves.t > reg.fundo.t)
    A.push({c:'info', t:'Aqui o <b>convés exige mais espessura que o fundo</b>. Não é erro: a Tabela 7.4 reduz muito a carga do casco em painel largo (F = ' + fmt(reg.fundo.F===null?1:reg.fundo.F,2) + ') enquanto a Tabela 7.5 reduz pouco a do convés (F = ' + fmt(reg.conves.F,2) + '), porque o impacto de fundo é local e a carga de convés é distribuída. Aperte o espaçamento e a ordem se inverte.'});
  if(L > 24)
    A.push({c:'', t:'L de escantilhão acima de <b>24 m</b>: a nota 3 da Tabela 7.1 passa a impor <code>d ≥ 0,048L + 0,091 m</code> no cálculo da carga básica, e o painel já aplicou isso.'});
  if(b.V > VmaxSn)
    A.push({c:'bad', t:'A velocidade de <b>' + fmt(b.V,1) + ' nós</b> passa do envelope que o sistema Sn cobre para S<sub>n</sub> = ' + fmt(Sn,2) + ', que é <code>45 − 0,33·S<sub>n</sub></code> = <b>' + fmt(VmaxSn,1) + ' nós</b> (fórmula impressa na p.8 do paper). Acima disso Gerr manda ir para análise mais elaborada — o painel continua calculando, mas fora do domínio declarado da regra.'});
  if(SF.f > 2.2)
    A.push({c:'', t:'f<sub>V</sub> = <b>' + fmt(SF.f,2) + '</b>: a velocidade é ' + fmt(Math.sqrt(SF.f),2) + ' vezes a típica para este porte (' + fmt(SF.vref,1) + ' nós, isto é ' + fmt(100*SF.ref,0) + '% do envelope). A lei do quadrado da p.1 está sendo estendida bem além do que os três barcos-exemplo cobrem — leia o resultado como ordem de grandeza.'});
  if(reg.fundo.govWho === 'Gerr')
    A.push({c:'bad', t:'No fundo é a <b>carga de impacto de Gerr que governa</b>, não o ABS: ela pede ' + fmt(reg.fundo.tGerr,2) + ' mm (' + reg.fundo.gerrGov + ') contra ' + fmt(reg.fundo.tAbs,2) + ' mm do Guia. A ' + fmt(SF.sl,2) + ' de razão SL o impacto de planeio passou à frente da carga hidrostática do ABS, que não tem termo de velocidade.'});
  else if(reg.fundo.tGerr !== null && reg.fundo.tGerr > 0.75*reg.fundo.tAbs)
    A.push({c:'info', t:'No fundo o ABS ainda governa, mas a carga de impacto de Gerr já pede ' + fmt(reg.fundo.tGerr,2) + ' mm contra ' + fmt(reg.fundo.tAbs,2) + ' mm do Guia — <b>' + fmt(100*reg.fundo.tGerr/reg.fundo.tAbs,0) + '%</b>. Acelerando mais, ela assume.'});
  if(snCheck && snCheck.has){
    var d0 = snCheck.rows[0];
    A.push({c:'ok', t:'Barco-exemplo do paper. Escantilhão Sn publicado para o fundo: <b>' + fmt(d0.pub,2) + ' mm</b>. O painel dá ' + fmt(d0.abs,2) + ' mm pelo ABS e ' + fmt(d0.gerr,2) + ' mm pela carga de Gerr, governante ' + fmt(d0.gov,2) + ' mm — ' + fmt(100*d0.gov/d0.pub,0) + '% do publicado. A ficha de conferência abaixo abre as três regiões.'});
  }
  ORD.forEach(function(r){
    var g = reg[r].gerr;
    if(g.FS < g.fsTarget)
      A.push({c:'bad', t:'<b>' + nomeReg(r) + '</b>: FS de ' + fmt(g.FS,2) + ' pela cadeia de Gerr, abaixo do alvo de ' + fmt(g.fsTarget,1) + ' (' + (g.dyn?'carga dinâmica de impacto':'carga estática') + ', paper p.29). Aperte o espaçamento ou engrosse a chapa.'});
    if(g.bOverDelta < g.defTarget)
      A.push({c:'', t:'<b>' + nomeReg(r) + '</b>: flecha de ' + fmt(g.delta_mm,1) + ' mm, ou b/δ = ' + fmt(g.bOverDelta,0) + ':1, abaixo do admissível de ' + fmt(g.defTarget,0) + ':1 do paper (p.29).'});
    if(g.FS > 3.5 * g.fsTarget)
      A.push({c:'ok', t:'<b>' + nomeReg(r) + '</b>: a espessura que o ABS exige dá FS de ' + fmt(g.FS,1) +
        ' contra as cargas de Hendrickson &amp; Spencer — ' + fmt(g.FS/g.fsTarget,1) +
        ' vezes o alvo. É a mesma folga que Gerr descreve no paper: “a minha experiência prática é que os escantilhões de muitas fontes são de fato muito conservadores”. Aqui a regra está mandando, não a carga.'});
    if(g.outOfChart)
      A.push({c:'', t:'<b>' + nomeReg(r) + '</b>: o parâmetro A = ' + fmt(g.A,0) + ' passa do limite do gráfico de Rawson & Tupper reproduzido no paper (abscissa até ~220). A tensão de membrana está extrapolada.'});
    if(reg[r].tAdo < reg[r].tGov - 1e-6)
      A.push({c:'bad', t:'<b>' + nomeReg(r) + '</b>: a espessura adotada de ' + fmt(reg[r].tAdo,1) + ' mm é menor que a governante de ' + fmt(reg[r].tGov,2) + ' mm (' + (reg[r].govWho === 'ABS' ? 'ABS ' + reg[r].gov : 'carga de Gerr, ' + reg[r].gerrGov) + ').'});
    if(MP.yld && reg[r].sigAt > MP.yld)
      A.push({c:'', t:'<b>' + nomeReg(r) + '</b>: a tensão de ' + fmt(reg[r].sigAt,0) + ' N/mm² sob a carga de projeto do ABS passa do escoamento não soldado de ' + fmt(MP.yld,0) + ' N/mm² (Tabela ' + (MP.mat==='alu'?'4.1':'4.2') + '). O ABS dimensiona chapeamento de casco pela ruptura, não pelo escoamento — mas vale olhar.'});
  });
  if(MP.tminK && reg.fundo.gov.indexOf('mínimo') === 0)
    A.push({c:'ok', t:'No fundo é a <b>espessura mínima construtiva</b> de 7.1 (s/' + MP.tminK + ' ou 2,5 mm) que está mandando, não a carga. Apertar mais o espaçamento deixa de reduzir a chapa e passa só a somar peso de reforço.'});
  if(MP.mat === 'wood')
    A.push({c:'info', t:'Tabuado liso: o ABS 8.3.2 prescreve <b>cavernamento transversal</b> e a equação 7.5.1 <b>não usa o fator F</b> — o fator de escala 1,09|4,2 − 1,13·⁴√L| = ' + fmt(reg.fundo.af,3) + ' faz o papel da redução por área. Num casco puramente transversal, o painel do chapeamento passa a ser o vão entre cavernas com ℓ/s ≥ 2, isto é k = 0,5. Pela 3.5.4 o módulo de seção da caverna conta <b>só o reforço</b>, sem largura efetiva de chapeamento.'});
  if(GB && GB.notas.length) GB.notas.forEach(function(n){ A.push({c:'', t:'<b>Regra de Gerr:</b> ' + n}); });
  if(GV && !GV.ok)
    A.push({c:'', t:'A regra do livro de Gerr declara valer para monocasco de 3 a 37 m, até 45 nós e razão deslocamento-comprimento entre 100 e 275. Aqui ela está fora por: <b>' + GV.avisos.join('; ') + '</b>. A coluna do ABS não depende disso.'});
  if(GB && GB.corr.length)
    A.push({c:'info', t:'No cálculo do S<sub>n</sub> entrou a correção <b>' + GB.corr.join(' e ') + '</b> da própria Fórmula 1-1.'});
  if(MP.notes.length) A.push({c:'info', t:MP.notes.join(' · ')});

  /* ----------------------------------------------------------------------
     Extras que a versão de aula usa.  Ficam aqui, num cálculo só, para que
     as duas telas nunca discordem uma da outra.
     ---------------------------------------------------------------------- */

  /* massa do chapeamento: área da casca × espessura × densidade */
  var area = {fundo:0, costado:0, conves:0, espelho:0};
  for(var ja=0;ja<40;ja++){
    var sa = sect(ja/40), sb2 = sect((ja+1)/40), dxa = b.LOA/40;
    area.fundo   += (sa.gB + sb2.gB)/2 * dxa * 2;
    area.costado += (sa.gS + sb2.gS)/2 * dxa * 2;
    area.conves  += (sa.gD + sb2.gD)/2 * dxa * 2;
  }
  var aT = 0;
  for(var jb=0;jb<24;jb++){
    var za = s0.zk + (s0.zsh-s0.zk)*jb/24, zb2 = s0.zk + (s0.zsh-s0.zk)*(jb+1)/24;
    aT += (yAtZ(s0,za) + yAtZ(s0,zb2)) * (zb2-za);
  }
  area.espelho = aT / Math.cos(b.rake*Math.PI/180);
  var dens = (MP.mat === 'wood') ? (WOODS[ST.grade.wood].sg || 0.55)*1000
           : (MP.mat === 'ply')  ? (WOODS[ST.grade.ply].sg  || 0.55)*1000*0.95
           : DENS_MAT[MP.mat];
  var massa = {}, massaTot = 0;
  ORD.forEach(function(k){ massa[k] = area[k]*(reg[k].tAdo/1000)*dens; massaTot += massa[k]; });

  /* curva de espessura contra a aresta curta do painel */
  var curveS = [], sMaxC = Math.max(120, Math.min(1270, sTe));
  for(var jc=0;jc<=60;jc++){
    var sv = 60 + (sMaxC-60)*jc/60;
    var oc = tReq('fundo', sv, Math.max(sv, sTe), reg.fundo.head, reg.fundo.zone, MP);
    var scNoF = (oc.F && oc.F > 0) ? Math.sqrt(1/oc.F) : 1;
    curveS.push({s:sv, t:oc.t, tNoF:oc.t*(MP.mat === 'wood' ? 1 : scNoF)});
  }

  /* espessura de fundo que cada material pediria, no mesmo painel */
  var matBars = [], saveMat = ST.mat;
  MATS.forEach(function(mm){
    ST.mat = mm.k;
    var mp2 = matProps();
    var o2 = tReq('fundo', reg.fundo.s, reg.fundo.l, reg.fundo.head, reg.fundo.zone, mp2);
    var g2 = gerrBook();
    matBars.push({k:mm.k, n:mm.n, t:o2.t, gov:o2.gov, sigA:mp2.sigA, ult:mp2.ult,
                  fs:mp2.fs_abs_implicito, gerr:(g2 ? g2.fundo : null)});
  });
  ST.mat = saveMat;

  /* onde a exigência de impacto passa a hidrostática */
  var cross = null;
  for(var jd=1;jd<sweep.pts.length;jd++)
    if(sweep.pts[jd-1].tG <= reg.fundo.tAbs && sweep.pts[jd].tG > reg.fundo.tAbs){
      cross = sweep.pts[jd].V; break;
    }

  R = {MP:MP, L:L, h:hBasic(), mid:mid, s0:s0, lay:lay, frames:frames, nF:nF, sTe:sTe,
       tr:{w:twid, h:thei, nV:nV, sV:sV, nH:nH, sH:sH}, reg:reg, ORD:ORD, stiff:stiff,
       curves:curves, ellFrame:ellFrame, Sn:Sn, VmaxSn:VmaxSn, ref:ref, alerts:A,
       Pi:Pi_psi(), Ar:Ar_in2(), SF:SF, sweep:sweep, snCheck:snCheck,
       area:area, massa:massa, massaTot:massaTot, dens:dens,
       curveS:curveS, matBars:matBars, cross:cross, GB:GB, GV:GV};
  return R;
}
function nomeReg(r){
  return {fundo:'Fundo', costado:'Costado', espelho:'Espelho de popa', conves:'Convés'}[r];
}

/* ============================================================== RENDER DOM */
function renderChips(){
  var mc = el('matChips'); mc.innerHTML = '';
  MATS.forEach(function(m){
    var bt = document.createElement('button');
    bt.className = 'chip'; bt.type = 'button'; bt.textContent = m.n;
    bt.setAttribute('aria-pressed', ST.mat === m.k);
    bt.onclick = function(){ ST.mat = m.k; ST.t = {fundo:null,costado:null,espelho:null,conves:null};
      /* mesma limpeza da tela de aula: perfil e antepara escolhidos para um
         material não querem dizer nada em outro.                          */
      ST.perf = {}; ST.ant.manV = ST.ant.manR = false;
      var ts = typicalSpacing(); ST.sL = Math.round(ts.sL/5)*5; ST.sT = Math.round(ts.sT/5)*5;
      renderChips(); renderGrade(); refresh(); };
    mc.appendChild(bt);
  });
  var bc = el('boatChips'); bc.innerHTML = '';
  BOATS.forEach(function(bo, i){
    var bt = document.createElement('button');
    bt.className = 'chip'; bt.type = 'button'; bt.textContent = bo.n;
    bt.setAttribute('aria-pressed', ST.boatIdx === i);
    bt.onclick = function(){
      ST.boatIdx = i; ST.boat = JSON.parse(JSON.stringify(BOATS[i]));
      ST.t = {fundo:null,costado:null,espelho:null,conves:null};
      ST.perf = {}; ST.ant.manV = ST.ant.manR = false;
      var ts = typicalSpacing(); ST.sL = Math.round(ts.sL/5)*5; ST.sT = Math.round(ts.sT/5)*5;
      renderChips(); renderPart(); refresh(); fitView();
    };
    bc.appendChild(bt);
  });
  var vc = el('viewChips'); vc.innerHTML = '';
  VIEWS.forEach(function(v){
    var bt = document.createElement('button');
    bt.className = 'chip'; bt.type = 'button'; bt.textContent = v.n;
    bt.setAttribute('aria-pressed', ST.view === v.k);
    bt.onclick = function(){ ST.view = v.k; ST.az = v.az; ST.el = v.el;
      el('viewName').textContent = v.n; renderChips(); fitView(); draw3D(); };
    vc.appendChild(bt);
  });
}
function renderGrade(){
  var g = el('gradeSel'), lab = el('gradeLabel'), m = ST.mat;
  g.innerHTML = ''; g.disabled = false;
  var list, cur, key;
  if(m === 'wood' || m === 'ply'){
    list = WOODS.map(function(w){ return w.n + '  (MOR ' + w.mor + ' N/mm²)'; });
    key = m; cur = ST.grade[key];
    lab.textContent = (m === 'wood') ? 'Espécie da madeira · Tabela 4.4' : 'Espécie das lâminas · Tabela 4.4';
  } else if(m === 'alu'){
    list = ALUS.map(function(a){ return a.n + '  (' + a.utsw + ' / ' + a.yld + ' N/mm²)'; });
    key = 'alu'; cur = ST.grade.alu; lab.textContent = 'Liga e têmpera · Tabela 4.1';
  } else if(m === 'steel'){
    list = STEELS.map(function(s){ return s.n + '  (' + s.uts + ' / ' + s.yld + ' N/mm²)'; });
    key = 'steel'; cur = ST.grade.steel; lab.textContent = 'Grau do aço · Tabela 4.2';
  } else {
    list = ['não se aplica — ver laminado ao lado']; key = null; cur = 0;
    lab.textContent = 'Especificação'; g.disabled = true;
  }
  list.forEach(function(s,i){
    var op = document.createElement('option'); op.value = i; op.textContent = s;
    if(i === cur) op.selected = true; g.appendChild(op);
  });
  g.onchange = function(){ if(key){ ST.grade[key] = +g.value;
    ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh(); } };

  var ls = el('lamSel'); ls.innerHTML = '';
  LAMS.forEach(function(l,i){
    var op = document.createElement('option'); op.value = i; op.textContent = l.n;
    if(i === ST.lam) op.selected = true; ls.appendChild(op);
  });
  ls.disabled = (m !== 'frp');
  ls.onchange = function(){ ST.lam = +ls.value;
    ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh(); };
  el('tPlyVerif').disabled = (m !== 'ply');
}
var PART = [
  ['LOA','L<sub>OA</sub> · comprimento total','m',0.01],
  ['LWL','L<sub>WL</sub> · comprimento na linha d’água','m',0.01],
  ['BOA','B · boca máxima','m',0.01],
  ['BWL','B<sub>WL</sub> · boca na linha d’água','m',0.01],
  ['D','D · pontal (ABS 2.5)','m',0.01],
  ['d','d · calado de escantilhão (ABS 2.7)','m',0.01],
  ['disp','Δ · deslocamento','t',0.01],
  ['rake','inclinação do espelho','graus',1]
];
function renderPart(){
  var pg = el('partGrid'); pg.innerHTML = '';
  PART.forEach(function(p){
    var d = document.createElement('div'); d.className = 'pfield';
    d.innerHTML = '<label>' + p[1] + ' <span class="u">' + p[2] + '</span></label>';
    var inp = document.createElement('input');
    inp.className = 'num'; inp.type = 'number'; inp.step = p[3];
    inp.value = ST.boat[p[0]];
    inp.oninput = function(){
      var v = parseFloat(inp.value);
      if(isFinite(v) && v > 0){ ST.boat[p[0]] = v;
        ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh(); fitView(); }
    };
    d.appendChild(inp); pg.appendChild(d);
  });
  var d2 = document.createElement('div'); d2.className = 'pfield';
  d2.innerHTML = '<label>tipo de casco</label>';
  var lb = document.createElement('label'); lb.className = 'toggle';
  var ck = document.createElement('input'); ck.type = 'checkbox'; ck.checked = !!ST.boat.planing;
  ck.onchange = function(){ ST.boat.planing = ck.checked; refresh(); };
  lb.appendChild(ck); lb.appendChild(document.createTextNode(' casco de planeio'));
  d2.appendChild(lb); pg.appendChild(d2);
}


/* =========================================================== TABELAS E FICHAS */
function refresh(){
  var r = compute(), MP = r.MP, b = ST.boat;

  /* --------- cabeçalho --------- */
  el('tbV').innerHTML = fmt(b.V,1) + ' <small>nós</small> · SL ' + fmt(r.SF.sl,2);
  el('tbT').innerHTML = fmt(r.reg.fundo.tGov,2) + ' <small>mm ' + r.reg.fundo.govWho + '</small>';
  el('tbT').style.color = r.reg.fundo.govWho === 'Gerr' ? 'var(--red-l)' : 'var(--white)';
  var fsF = r.reg.fundo.gerr;
  el('tbFS').textContent = fmtFS(fsF.FS);
  el('tbFS').style.color = fsF.FS < fsF.fsTarget ? 'var(--red-l)' : 'var(--green)';
  el('tbEyebrow').textContent = 'Escantilhões v2 · ' + b.n + ' · L' + 'ₒₐ ' + fmt(b.LOA,2) +
    ' m · ' + fmt(b.V,1) + ' nós · S' + 'ₙ ' + fmt(r.Sn,2) + ' · ' + MP.label + ' · Projetista: Cassio';

  /* --------- controle de velocidade --------- */
  el('vel').max = Math.max(12, Math.ceil(r.VmaxSn*1.15));
  el('vel').value = b.V; el('veln').value = b.V;
  var frac = Math.min(1, b.V / Math.max(1e-6, r.VmaxSn));
  var bar = el('envBar');
  bar.style.width = (frac*100).toFixed(1) + '%';
  bar.className = b.V > r.VmaxSn ? 'over' : (frac > 0.8 ? 'hot' : '');
  el('velNote').innerHTML = 'razão SL <b>' + fmt(r.SF.sl,2) + '</b> · f<sub>V</sub> <b class="' +
    (r.SF.f > 1 ? 'bad' : 'ok') + '">' + fmt(r.SF.f,3) + '</b>' +
    (r.SF.clamp ? ' <b class="bad">fora do envelope</b>' : '');
  el('velFacts').innerHTML = 'envelope <code style="color:var(--red-xl)">45 − 0,33·S<sub>n</sub></code> = <b>' +
    fmt(r.VmaxSn,1) + ' nós</b> para S<sub>n</sub> = ' + fmt(r.Sn,2) + ' · ' +
    (b.V > r.VmaxSn ? '<b style="color:var(--red-l)">fora do envelope</b>'
                    : '<b>' + fmt(frac*100,0) + '%</b> do envelope') +
    ' · velocidade típica deste porte <b>' + fmt(r.SF.vref,1) + ' nós</b> (k<sub>ref</sub> = ' +
    fmt(r.SF.ref,3) + ') · f<sub>V</sub> = (V/V<sub>ref</sub>)² · pressão de impacto no fundo <b>' +
    fmt(r.reg.fundo.gerr.Pd_si,4) + ' N/mm²</b>';

  /* --------- controles de espaçamento --------- */
  el('sL').value = ST.sL; el('sLn').value = ST.sL;
  el('sT').value = ST.sT; el('sTn').value = ST.sT;
  el('sLNote').innerHTML = 'no fundo <b>' + r.lay.fundo.nStiff + '</b> por bordo a <b>' +
    fmt(r.lay.fundo.s,0) + ' mm</b> · costado <b>' + r.lay.costado.nStiff + '</b> a <b>' +
    fmt(r.lay.costado.s,0) + ' mm</b> · convés <b>' + r.lay.conves.nStiff + '</b> a <b>' +
    fmt(r.lay.conves.s,0) + ' mm</b>';
  el('sTNote').innerHTML = '<b>' + (r.nF-1) + '</b> balizas entre espelho e proa, espaçamento efetivo <b>' +
    fmt(r.sTe,0) + ' mm</b>';
  el('espSub').innerHTML = 'perímetro do fundo ' + fmt(r.mid.gB*1000,0) + ' mm · costado ' +
    fmt(r.mid.gS*1000,0) + ' mm · meio-convés ' + fmt(r.mid.gD*1000,0) +
    ' mm, medidos na seção mestra · F<sub>fundo</sub> = ' +
    (r.reg.fundo.F===null ? 'não se aplica' : fmt(r.reg.fundo.F,3));
  var ts = typicalSpacing();
  el('typNote').innerHTML = 'Típico para este material e tamanho: <b style="color:var(--blue-ink)">' +
    fmt(ts.sL,0) + ' mm</b> entre longitudinais e <b style="color:var(--amber)">' + fmt(ts.sT,0) +
    ' mm</b> entre transversais. <span class="src">' + ts.src + '</span>';
  el('hudSL').textContent = fmt(r.lay.fundo.s,0);
  el('hudSLn').textContent = r.lay.fundo.nStiff + ' no fundo · mm';
  el('hudST').textContent = fmt(r.sTe,0);
  el('hudSTn').textContent = (r.nF-1) + ' balizas · mm';
  el('glGrid').innerHTML = 'painel do fundo ' + fmt(r.reg.fundo.s,0) + ' × ' + fmt(r.reg.fundo.l,0) +
    ' mm · ℓ/s ' + fmt(r.reg.fundo.aspect,2) + ' · k ' + fmt(r.reg.fundo.k,3);

  /* --------- tabela de resultados --------- */
  var tb = el('resTable').querySelector('tbody'); tb.innerHTML = '';
  r.ORD.forEach(function(k){
    var o = r.reg[k], g = o.gerr, tr = document.createElement('tr');
    var fsOK = g.FS >= g.fsTarget, dfOK = g.bOverDelta >= g.defTarget;
    var absOK = o.tAdo >= o.tGov - 1e-6;
    tr.innerHTML =
      '<td>' + nomeReg(k) + ' <span class="src">' + (o.govWho==='ABS' ? o.gov : o.gerrGov) + '</span></td>' +
      '<td>' + fmt(o.head,2) + ' <span class="src">' + o.zone + '</span></td>' +
      '<td>' + (o.F===null ? '—' : fmt(o.F,3)) + '</td>' +
      '<td>' + fmt(o.p,4) + '</td>' +
      '<td>' + fmt(o.s,0) + ' × ' + fmt(o.l,0) + ' <span class="src">' + fmt(o.aspect,2) + '</span></td>' +
      '<td>' + fmt(o.k,3) + '</td>' +
      '<td class="' + (o.govWho==='ABS'?'w':'') + '">' + fmt(o.tAbs,2) + '</td>' +
      '<td>' + (g.dyn ? fmt(g.fV,3) : '—') + '</td>' +
      '<td>' + fmt(g.Pd_si,4) + '</td>' +
      '<td class="' + (o.govWho==='Gerr'?'w':'') + '">' +
        (o.tGerr === null ? '—' : fmt(o.tGerr,2)) +
        ' <span class="src">' + o.gerrGov + '</span></td>' +
      '<td class="' + (o.govWho==='Gerr'?'bad':'hi') + '">' + fmt(o.tGov,2) +
        ' <span class="src">' + o.govWho + '</span></td>' +
      '<td class="' + (absOK?'ok':'bad') + '">' + fmt(o.tAdo,1) + '</td>' +
      '<td class="' + (o.fsABS >= MP.fs_abs_implicito - 1e-6 ? 'ok':'bad') + '">' + fmtFS(o.fsABS) + '</td>' +
      '<td class="' + (fsOK?'ok':'bad') + '">' + fmtFS(g.FS) + ' <span class="src">≥' + fmt(g.fsTarget,1) + '</span></td>' +
      '<td class="' + (dfOK?'':'hi') + '">' + fmt(g.bOverDelta,0) + ':1 <span class="src">≥' + fmt(g.defTarget,0) + '</span></td>';
    tb.appendChild(tr);
  });
  el('resSub').innerHTML = 'σ<sub>a</sub> = ' + fmt(MP.sigA,1) + ' N/mm² <span class="src">' + MP.srcA +
    '</span> · ruptura de referência ' + fmt(MP.ult,1) + ' N/mm² <span class="src">' + MP.srcUlt +
    '</span> · FS embutido no ABS = ' + fmt(MP.fs_abs_implicito,2);
  var refTxt = '';
  if(r.ref.sn) refTxt += ' Referência Sn: fundo ' + fmt(r.ref.sn.fundo,1) + ' mm, costado ' +
    fmt(r.ref.sn.costado,1) + ' mm, convés ' + fmt(r.ref.sn.conves,1) + ' mm (' + r.ref.sn.src + ').';
  if(r.ref.thumb) refTxt += ' Regra de bolso: fundo ' + fmt(r.ref.thumb.fundo,1) + ' mm, costado ' +
    fmt(r.ref.thumb.costado,1) + ' mm, convés ' + fmt(r.ref.thumb.conves,1) + ' mm (' + r.ref.thumb.src + ').';
  el('resCap').innerHTML = '<b>t ABS</b>: equação ' + (MP.mat==='wood'?'7.5.1':(MP.mat==='frp'?'7.3.1':'7.1')) +
    ' com as Tabelas 7.1 a 7.5 — carga hidrostática, <b>não depende da velocidade</b>, e é por isso que essa ' +
    'coluna fica parada quando você move o controle. <b>t Gerr</b>: a espessura que a carga de impacto pede ' +
    'no FS alvo e na flecha admissível da p.29, invertendo por bisseção a relação de membrana da p.28. ' +
    'No fundo a pressão é P<sub>i</sub> de Hendrickson &amp; Spencer (' + fmt(r.Pi,1) +
    ' psi) × F<sub>d</sub> de Koelbel (' + fmt(r.reg.fundo.gerr.fd,3) + ', com A<sub>d</sub>/A<sub>r</sub> = ' +
    fmt(r.reg.fundo.gerr.ratio,3) + ' e A<sub>r</sub> = ' + fmt(r.Ar,0) + ' pol²) × f<sub>V</sub> = ' +
    fmt(r.SF.f,3) + '; nas outras regiões é a carga estática do ABS com o critério FS 3 do paper, e por isso ' +
    'f<sub>V</sub> não se aplica — e ali o painel também <b>não dimensiona</b> por Gerr, só verifica o FS: dimensionar com a pressão do ABS e o critério de Gerr somaria as duas conservações. <b>t governante</b> = a maior das duas onde as duas existem.' + (MP.mat === 'frp' || MP.mat === 'alu' ? '' : ' A flecha admissível da p.29 só é dada para fibra de vidro (50:1 e 100:1) e alumínio (75:1 e 150:1); em madeira, compensado e aço o painel toma os valores da fibra de vidro, e isto é escolha do painel, não da fonte.') + refTxt;

  /* --------- sliders de espessura --------- */
  var tr2 = el('tRows'); tr2.innerHTML = '';
  r.ORD.forEach(function(k){
    var o = r.reg[k];
    var maxT = Math.max(o.tGov*2.6, MP.comm ? MP.comm[MP.comm.length-1] : o.tGov*2.6);
    var row = document.createElement('div'); row.className = 'cgrow';
    row.innerHTML = '<span class="cgk">' + nomeReg(k) + ' <i>(governante ' + fmt(o.tGov,2) + ' mm · ' + o.govWho + ')</i></span>';
    var rg = document.createElement('input');
    rg.type = 'range'; rg.min = 1; rg.max = Math.ceil(maxT); rg.step = 0.5; rg.value = o.tAdo;
    rg.setAttribute('aria-label','espessura adotada no ' + nomeReg(k));
    var nm = document.createElement('input');
    nm.type = 'number'; nm.className = 'num'; nm.step = 0.5; nm.value = o.tAdo;
    var nt = document.createElement('span'); nt.className = 'cgnote';
    var pct = o.tAdo / o.tGov;
    nt.innerHTML = 'comercial <b>' + fmt(o.tCom,1) + ' mm</b> · ' +
      '<b class="' + (pct>=1?'ok':'bad') + '">' + fmt(pct*100,0) + '%</b> da governante' +
      (o.tmin ? ' · mínimo 7.1 <b>' + fmt(o.tmin,2) + '</b>' : '');
    function setT(v){ v = parseFloat(v); if(!isFinite(v) || v <= 0) return;
      ST.t[k] = v; refresh(); }
    rg.oninput = function(){ setT(rg.value); };
    nm.oninput  = function(){ setT(nm.value); };
    row.appendChild(rg); row.appendChild(nm); row.appendChild(nt);
    tr2.appendChild(row);
  });
  el('tSub').innerHTML = 'material ' + MP.label + ' · equação ' + MP.eq +
    ' · largura efetiva de chapeamento no reforço: ' + MP.effw +
    ' · arranjo ' + MP.frame;

  /* --------- tabela de reforços --------- */
  var sb = el('stiffTable').querySelector('tbody'); sb.innerHTML = '';
  r.stiff.forEach(function(s){
    var ok = (s.SMsec !== null && s.SMsec >= s.SMreq);
    var tr3 = document.createElement('tr');
    if(!s.exists){
      tr3.innerHTML = '<td>' + s.name + '</td><td colspan="10" style="text-align:left;color:var(--muted)">' +
        'o perímetro é menor que o espaçamento escolhido — não há reforço desta família neste arranjo</td>';
      sb.appendChild(tr3); return;
    }
    tr3.innerHTML = '<td>' + s.name + '</td><td>' + s.C + '</td><td>' + fmt(s.h,2) +
      ' <span class="src">F ' + fmt(s.Fi,2) + '</span></td><td>' + fmt(s.s,3) + '</td><td>' + fmt(s.l,3) +
      '</td><td>' + fmt(MP.sigInt,1) + '</td>' +
      '<td class="' + (s.SMwho==='ABS'?'w':'') + '">' + fmt(s.SM,1) + '</td>' +
      '<td class="' + (s.SMwho==='Gerr'?'w':'') + '">' + (s.SMg===undefined?'—':fmt(s.SMg,1)) +
        (s.pin ? ' <span class="src">ℓ²/8</span>' : '') + '</td>' +
      '<td class="' + (s.SMwho==='Gerr'?'bad':'hi') + '">' + fmt(s.SMreq,1) +
        ' <span class="src">' + (s.SMwho||'ABS') + '</span></td>' +
      '<td>' + s.sec + '</td><td class="' + (s.SMsec===null?'':(ok?'ok':'bad')) + '">' +
      (s.SMsec===null ? '—' : fmt(s.SMsec,1)) + '</td>';
    sb.appendChild(tr3);
  });
  el('stiffCap').innerHTML = 'C de ABS 8.1.3 (unidades SI, σ<sub>a</sub> em N/mm², h, s e ℓ em m, SM em cm³). ' +
    'h = F × carga do chapeamento na meia-extensão do reforço, Tabela 8.1a, com F da Tabela 8.1b. ' +
    'σ<sub>a</sub> = ' + fmt(MP.sigInt,1) + ' N/mm² <span class="src">' + MP.srcInt + '</span>. ' +
    'A corda da baliza, ℓ = ' + fmt(r.ellFrame,3) + ' m, é a distância borda-quilha da Figura 8.1. ' +
    'O vau é calculado com ℓ igual à boca inteira; uma escoa central na linha de centro reduz esse vão à metade. ' +
    'A seção proposta é dimensionada pelo painel, com a largura efetiva de chapeamento da subseção 3.5 — ' +
    'não é uma seção normalizada do Guia. SM<sub>k</sub> do peso do lastro (8.1.3) não entra.' +
    (MP.mat === 'frp' ? ' <b>Inércia mínima:</b> a equação 8.1.3 vem impressa como I = C₁·h·s·ℓ³/(1000·E); ' +
      'lida ao pé da letra ela devolve valores 10⁶ vezes menores que qualquer perfil real — ' +
      'corresponderia a uma razão vão/flecha da ordem de 1/10 000. O painel usa a forma com o 1000 ' +
      'no numerador, que reproduz vão/flecha ≈ 98 e casa com os perfis dos exemplos de Gerr; ' +
      'C₁ = 255 em geral e 562 na hastilha da linha de centro.' : '');

  /* --------- ficha de derivados --------- */
  var dg = el('derivGrid');
  function ro(k2, v, src){ return '<div class="ro"><div class="ro-k">' + k2 + '</div><div class="ro-v">' + v +
    '</div><div class="ro-src">' + src + '</div></div>'; }
  dg.innerHTML =
    ro('L de escantilhão', fmt(r.L,3) + ' <small>m</small>', 'ABS 2.1 · (LOA+LWL)/2') +
    ro('carga básica h', fmt(r.h,3) + ' <small>m</small>', 'ABS Tab. 7.1 · 3,0d+0,14L+1,62') +
    ro('número Sn', fmt(r.Sn,3), 'Gerr · L·B·D/1000 em pés') +
    ro('envelope do Sn', fmt(r.VmaxSn,1) + ' <small>nós</small>', 'Gerr p.8 · 45 − 0,33·Sn, impressa') +
    ro('razão SL', fmt(r.SF.sl,2), 'V / √L<sub>WL</sub> em pés') +
    ro('V típica do porte', fmt(r.SF.vref,1) + ' <small>nós</small>', 'k_ref × envelope · k_ref = ' + fmt(r.SF.ref,3)) +
    ro('fator de velocidade', fmt(r.SF.f,3), '(V / V típica)²') +
    ro('P<sub>i</sub> pico de impacto', fmt(r.Pi,1) + ' <small>psi</small>', 'Hendrickson & Spencer · Gerr p.25') +
    ro('A<sub>r</sub> área de referência', fmt(r.Ar,0) + ' <small>pol²</small>', 'Gerr p.26 · 25(Δ/d)·144') +
    ro('perímetro fundo + costado', fmt((r.mid.gB+r.mid.gS)*1000,0) + ' <small>mm</small>', 'envelope paramétrico') +
    ro('corda da baliza', fmt(r.ellFrame,3) + ' <small>m</small>', 'ABS Fig. 8.1');
  el('partSub').innerHTML = 'a geometria do casco é um envelope paramétrico — serve para medir perímetros e ' +
    'posicionar reforços, não substitui a tabela de cotas';

  /* --------- ficha de material --------- */
  var mg = el('matGrid'), rows = '';
  if(MP.mat === 'wood' || MP.mat === 'ply'){
    rows += ro('módulo de ruptura', fmt(MP.MOR,1) + ' <small>N/mm²</small>',
               MP.mat==='ply' ? MP.srcMOR : 'ABS Tab. 4.4');
    rows += ro('módulo de elasticidade', fmt(MP.E,0) + ' <small>N/mm²</small>',
               MP.mat==='ply' ? (ST.plyVerif?'informado':'0,60 × Tab. 4.4 — fora da fonte') : 'ABS Tab. 4.4');
  } else if(MP.mat === 'frp'){
    rows += ro('resistência à flexão F', fmt(MP.lam.F,1) + ' <small>N/mm²</small>', MP.lam.src);
    rows += ro('módulo de flexão E<sub>F</sub>', fmt(MP.lam.EF,0) + ' <small>N/mm²</small>', MP.lam.src);
    rows += ro('tração T / compressão C', fmt(MP.lam.T,0) + ' / ' + fmt(MP.lam.C,0) + ' <small>N/mm²</small>', MP.lam.src);
  } else {
    rows += ro('ruptura à tração', fmt(MP.ult,0) + ' <small>N/mm²</small>', MP.srcUlt);
    rows += ro('escoamento', fmt(MP.yld,0) + ' <small>N/mm²</small>',
               MP.mat==='alu' ? 'ABS Tab. 4.1 · não soldado' : 'ABS Tab. 4.2');
    rows += ro('módulo de elasticidade', fmt(MP.E,0) + ' <small>N/mm²</small>',
               MP.mat==='alu' ? 'Gerr p.29 · 10,1e6 psi' : 'fora da fonte · norma');
  }
  rows += ro('σ<sub>a</sub> chapeamento', fmt(MP.sigA,1) + ' <small>N/mm²</small>', MP.srcA);
  rows += ro('σ<sub>a</sub> reforços', fmt(MP.sigInt,1) + ' <small>N/mm²</small>', MP.srcInt);
  rows += ro('FS embutido no σ<sub>a</sub>', fmt(MP.fs_abs_implicito,2), 'ruptura ÷ tensão de projeto');
  if(MP.mat === 'ply' && ST.plyVerif){
    rows += '<div class="ro"><div class="ro-k">MOR verificado · N/mm²</div>' +
      '<input class="num" id="plyMORi" type="number" step="1" value="' + ST.plyMOR + '"></div>' +
      '<div class="ro"><div class="ro-k">E verificado · N/mm²</div>' +
      '<input class="num" id="plyEi" type="number" step="100" value="' + ST.plyE + '"></div>';
  }
  mg.innerHTML = rows;
  if(MP.mat === 'ply' && ST.plyVerif){
    el('plyMORi').oninput = function(){ var v=parseFloat(this.value);
      if(isFinite(v)&&v>0){ ST.plyMOR=v; ST.t={fundo:null,costado:null,espelho:null,conves:null}; refresh(); } };
    el('plyEi').oninput = function(){ var v=parseFloat(this.value);
      if(isFinite(v)&&v>0){ ST.plyE=v; ST.t={fundo:null,costado:null,espelho:null,conves:null}; refresh(); } };
  }
  el('matSub').innerHTML = MP.label + ' · equação de chapeamento ABS ' + MP.eq;

  /* --------- avisos --------- */
  var al = el('alerts'); al.innerHTML = '';
  r.alerts.forEach(function(a){
    var d = document.createElement('div'); d.className = 'alert ' + (a.c||'');
    d.innerHTML = a.t; al.appendChild(d);
  });

  /* --------- legendas dos diagramas --------- */
  el('secSub').innerHTML = 'estação da boca máxima, x = ' + fmt(b.LOA*XIM,2) + ' m · ' +
    r.lay.fundo.nStiff + ' + ' + r.lay.costado.nStiff + ' + ' + r.lay.conves.nStiff +
    ' longitudinais por bordo';
  el('tranSub').innerHTML = fmt(r.tr.w,0) + ' × ' + fmt(r.tr.h,0) + ' mm · ' + (r.tr.nV-1) +
    ' verticais a ' + fmt(r.tr.sV,0) + ' mm · ' + (r.tr.nH-1) + ' horizontais a ' + fmt(r.tr.sH,0) + ' mm';
  el('tcFacts').innerHTML = 'máximo no fundo ' + fmt(r.reg.fundo.t,2) + ' mm em x = ' +
    fmt(r.reg.fundo.Xg,2) + ' m';

  /* --------- conferência contra os escantilhões Sn publicados --------- */
  var sb2 = el('snTable').querySelector('tbody');
  if(r.snCheck){
    el('snBlock').style.display = '';
    sb2.innerHTML = '';
    r.snCheck.rows.forEach(function(d){
      var rat = d.pub ? d.gov/d.pub : null, tr4 = document.createElement('tr');
      tr4.innerHTML = '<td>' + nomeReg(d.k) + '</td>' +
        '<td class="w">' + (d.pub === null ? 'não publicado' : fmt(d.pub,2)) + '</td>' +
        '<td>' + fmt(d.abs,2) + '</td>' +
        '<td>' + (d.gerr === null ? '—' : fmt(d.gerr,2)) + '</td>' +
        '<td>' + fmt(d.gov,2) + '</td>' +
        '<td class="' + (rat === null ? '' : (rat>=0.85 && rat<=1.25 ? 'ok' : 'hi')) + '">' +
        (rat === null ? '—' : fmt(rat*100,0) + '%') + '</td>';
      sb2.appendChild(tr4);
    });
    el('snSub').innerHTML = 'barco de ' + r.snCheck.boat + ' pés · ' + MP.label +
      (r.snCheck.has ? ' · escantilhões publicados em Gerr IBEX 2010 p.10-12'
                     : ' · o paper só publica escantilhões Sn destes barcos em fibra de vidro e alumínio');
    el('snCap').innerHTML = 'Os particulares deste barco são os da tabela "Example Boats" da p.10, e o ' +
      'espaçamento é o publicado para ele. A coluna "Sn publicado" é o que o paper especifica; as outras ' +
      'três são o que este painel calcula. Gerr escreve que "a estrutura em fibra de vidro da regra Sn vai ' +
      'atender ou exceder o ABS em barcos abaixo de 45 pés" — é isso que a comparação mostra quando dá ' +
      'acima de 100%. Em alumínio a regra Sn é bem mais generosa que a exigência do ABS, e o paper também ' +
      'diz isso ao comentar que os escantilhões de muitas fontes são conservadores.';
  } else {
    el('snBlock').style.display = 'none';
  }

  el('vSub').innerHTML = 'fundo · ' + MP.label + ' · painel ' + fmt(r.reg.fundo.s,0) + ' × ' +
    fmt(r.reg.fundo.l,0) + ' mm · chapa adotada ' + fmt(r.reg.fundo.tAdo,1) + ' mm';
  var atEnv = r.sweep.pts.filter(function(q){return q.V <= r.VmaxSn;}).pop();
  el('vFacts').innerHTML = 'no topo do envelope (' + fmt(r.VmaxSn,1) + ' nós) a carga de Gerr pediria <b>' +
    fmt(atEnv.tG,2) + ' mm</b> e a chapa adotada daria FS <b>' + fmt(atEnv.FS,2) + '</b>' +
    (VC && VC.cross ? ' · ela passa o ABS a <b>' + fmt(VC.cross.V,1) + ' nós</b>' : ' · não chega a passar o ABS dentro do envelope');

  draw3D(); drawSection(); drawTransom(); drawLenChart(); drawVelChart();
}

/* ================================================================ CANVAS 3D */
function setupCv(cv){
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var rc = cv.getBoundingClientRect();
  var w = Math.max(10, rc.width), h = Math.max(10, rc.height);
  cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  var g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,w,h);
  return {g:g, w:w, h:h};
}
var CAM = {sc:1, cx:0, cy:0};
function proj(p){
  var b = ST.boat, az = ST.az*Math.PI/180, ee = ST.el*Math.PI/180;
  var X = p[0] - b.LOA/2, Y = p[1], Z = p[2] - b.D/2;
  var ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(ee), se = Math.sin(ee);
  var f = X*ca + Y*sa;
  return [-X*sa + Y*ca, -f*se + Z*ce, f*ce + Z*se];
}
/* pontos reais da superfície — enquadrar pela caixa do casco projetado
   sobra muito em vista oblíqua, então o ajuste usa a geometria mesma */
function hullPts(){
  var b = ST.boat, P = [], N = 25;
  for(var i=0;i<N;i++){
    var f = i/(N-1), sc = sect(f), x = f*b.LOA;
    [[0,sc.zk],[sc.ych,sc.zch],[sc.ysh,sc.zsh],[0,sc.zdc]].forEach(function(p){
      P.push([x, p[0], p[1]]);
      if(p[0] > 1e-9) P.push([x, -p[0], p[1]]);
    });
  }
  var s0 = sect(0);
  for(var q=0;q<=6;q++){
    var z = s0.zk + (s0.zsh - s0.zk)*q/6, y = yAtZ(s0, z), xx = xTr(z);
    P.push([xx, y, z]); P.push([xx, -y, z]);
  }
  return P;
}
function fitView(){
  var mx = -1e9, mn = 1e9, my = -1e9, ny = 1e9, P = hullPts();
  for(var i=0;i<P.length;i++){
    var q = proj(P[i]);
    if(q[0] > mx) mx = q[0]; if(q[0] < mn) mn = q[0];
    if(q[1] > my) my = q[1]; if(q[1] < ny) ny = q[1];
  }
  var cv = el('gl'), rc = cv.getBoundingClientRect();
  var w = Math.max(10, rc.width), h = Math.max(10, rc.height);
  var px = Math.max(14, Math.min(44, w*0.05)), py = Math.max(14, Math.min(40, h*0.09));
  var sx = (w-2*px)/Math.max(1e-6, mx-mn), sy = (h-2*py)/Math.max(1e-6, my-ny);
  CAM.sc = Math.min(sx,sy) * ST.zoom;
  CAM.cx = w/2 - (mx+mn)/2*CAM.sc;
  CAM.cy = h/2 + (my+ny)/2*CAM.sc;
  el('camInfo').innerHTML = 'azimute ' + fmt(ST.az,0) + '° · elevação ' + fmt(ST.el,0) +
    '° · zoom ' + fmt(ST.zoom,2) + '×<br>arraste para girar, roda para aproximar';
}
function sp(p){ var q = proj(p); return [CAM.cx + q[0]*CAM.sc, CAM.cy - q[1]*CAM.sc, q[2]]; }

/* yAtZ() vem de cotas.js: anda pela polilinha da baliza. */
/* x do plano do espelho na altura z (inclinação para ré subindo) */
function xTr(z){
  var s0 = R ? R.s0 : sect(0);
  return Math.max(0, (s0.zsh - z) * Math.tan(ST.boat.rake*Math.PI/180));
}
function draw3D(){
  var cv = el('gl'), C = setupCv(cv), g = C.g, b = ST.boat;
  if(!R) return;
  var sides = ST.show.umBordo ? [1] : [1,-1];
  var NX = 49;
  var depths = [];
  function poly(pts, col, lw, dash){
    if(pts.length < 2) return;
    var d = 0; for(var i=0;i<pts.length;i++) d += pts[i][2]; d /= pts.length;
    depths.push({pts:pts, col:col, lw:lw, dash:dash||null, d:d});
  }
  function line3(a, bb, col, lw, dash){ poly([sp(a), sp(bb)], col, lw, dash); }

  /* --- superfície: linhas de contorno --- */
  var lines = {keel:[], chine:[], sheer:[], dcl:[]};
  for(var i=0;i<NX;i++){
    var xi = i/(NX-1), sc = sect(xi), x = Math.max(xTr(sc.zk)*0, xi*b.LOA);
    lines.keel.push([x,0,sc.zk]);
    lines.chine.push([x,sc.ych,sc.zch]);
    lines.sheer.push([x,sc.ysh,sc.zsh]);
    lines.dcl.push([x,0,sc.zdc]);
  }
  sides.forEach(function(s){
    var mirror = function(a){ return a.map(function(p){ return sp([p[0], p[1]*s, p[2]]); }); };
    if(ST.show.fundo){ poly(mirror(lines.keel), 'rgba(232,232,232,.85)', 1.6);
                       poly(mirror(lines.chine), 'rgba(238,154,152,.95)', 1.6); }
    if(ST.show.costado) poly(mirror(lines.sheer), 'rgba(232,232,232,.9)', 1.8);
    if(ST.show.conves)  poly(mirror(lines.dcl), 'rgba(155,215,155,.7)', 1.4);
  });

  /* --- longitudinais --- */
  if(ST.show.lon){
    var regs = [['fundo', R.lay.fundo, 'rgba(95,174,230,.95)'],
                ['costado', R.lay.costado, 'rgba(127,182,222,.9)'],
                ['conves', R.lay.conves, 'rgba(155,215,155,.85)']];
    regs.forEach(function(rr){
      var key = rr[0] === 'conves' ? 'conves' : rr[0];
      if(!ST.show[key === 'conves' ? 'conves' : key]) return;
      for(var q=1;q<rr[1].n;q++){
        var arr = [];
        for(var i2=0;i2<NX;i2++){
          var xi2 = i2/(NX-1), sc2 = sect(xi2), pt = girthPt(sc2, rr[0], q/rr[1].n);
          arr.push([xi2*b.LOA, pt[0], pt[1]]);
        }
        sides.forEach(function(s2){
          poly(arr.map(function(p){ return sp([p[0], p[1]*s2, p[2]]); }), rr[2], 1.1);
        });
      }
    });
  }
  /* --- transversais --- */
  if(ST.show.tra){
    R.frames.forEach(function(xf, idx){
      var sc3 = sect(xf/b.LOA), ring = [];
      if(ST.show.fundo)   { ring.push([xf,0,sc3.zk]); ring.push([xf,sc3.ych,sc3.zch]); }
      if(ST.show.costado) { if(!ring.length) ring.push([xf,sc3.ych,sc3.zch]); ring.push([xf,sc3.ysh,sc3.zsh]); }
      if(ST.show.conves)  { if(!ring.length) ring.push([xf,sc3.ysh,sc3.zsh]); ring.push([xf,0,sc3.zdc]); }
      var lw = (idx===0 || idx===R.frames.length-1) ? 2.0 : 1.15;
      sides.forEach(function(s3){
        poly(ring.map(function(p){ return sp([p[0], p[1]*s3, p[2]]); }), 'rgba(251,177,47,.9)', lw);
      });
    });
  }
  /* --- espelho de popa --- */
  if(ST.show.espelho){
    var s0 = R.s0, zk0 = s0.zk, zs0 = s0.zsh;
    var out = [];
    for(var q2=0;q2<=24;q2++){
      var z = zk0 + (zs0-zk0)*q2/24;
      out.push([xTr(z), yAtZ(s0,z), z]);
    }
    var full = out.map(function(p){ return sp(p); });
    poly(full, 'rgba(195,155,211,.95)', 1.8);
    if(!ST.show.umBordo)
      poly(out.map(function(p){ return sp([p[0],-p[1],p[2]]); }), 'rgba(195,155,211,.95)', 1.8);
    /* grade do espelho */
    for(var v=1;v<R.tr.nH;v++){
      var zh = zk0 + (zs0-zk0)*v/R.tr.nH, yh = yAtZ(s0,zh), xh = xTr(zh);
      line3([xh,-(ST.show.umBordo?0:yh),zh], [xh,yh,zh], 'rgba(251,177,47,.75)', 1.0);
    }
    for(var u=1;u<R.tr.nV;u++){
      var yv = -s0.ysh + 2*s0.ysh*u/R.tr.nV;
      if(ST.show.umBordo && yv < 0) continue;
      var seg = [];
      for(var q3=0;q3<=16;q3++){
        var zz = zk0 + (zs0-zk0)*q3/16;
        if(Math.abs(yv) <= yAtZ(s0,zz) + 1e-9) seg.push(sp([xTr(zz), yv, zz]));
      }
      poly(seg, 'rgba(195,155,211,.7)', 1.0);
    }
  }
  /* --- linha d’água --- */
  if(ST.show.agua){
    var wl = [], d = b.d;
    for(var i3=0;i3<NX;i3++){
      var sc4 = sect(i3/(NX-1)), yv2 = yAtZ(sc4, d);
      if(yv2 > 1e-6) wl.push([i3/(NX-1)*b.LOA, yv2, d]);
    }
    sides.forEach(function(s4){
      poly(wl.map(function(p){ return sp([p[0], p[1]*s4, p[2]]); }), 'rgba(95,174,230,.8)', 1.6, [5,4]);
    });
  }
  /* --- painel crítico: o de menor FS de Gerr --- */
  if(ST.show.painel){
    var worst = R.ORD.reduce(function(a2,k2){
      return (R.reg[k2].gerr.FS / R.reg[k2].gerr.fsTarget) < (R.reg[a2].gerr.FS / R.reg[a2].gerr.fsTarget) ? k2 : a2; });
    var quad = criticalQuad(worst);
    if(quad){
      var pp = quad.map(function(p){ return sp(p); });
      var dd = pp.reduce(function(a3,p){ return a3 + p[2]; },0)/pp.length;
      depths.push({fill:pp, col:'rgba(154,50,49,.45)', edge:'rgba(238,154,152,1)', d:dd});
    }
    el('warnLine').innerHTML = 'painel crítico: <b style="color:var(--red-l)">' + nomeReg(worst) +
      '</b> · FS ' + fmtFS(R.reg[worst].gerr.FS) + ' contra alvo ' + fmt(R.reg[worst].gerr.fsTarget,1);
  } else el('warnLine').textContent = '';

  /* --- desenha, mais fundo primeiro --- */
  depths.sort(function(a4,b4){ return a4.d - b4.d; });
  var dmin = 1e9, dmax = -1e9;
  depths.forEach(function(o){ dmin = Math.min(dmin,o.d); dmax = Math.max(dmax,o.d); });
  depths.forEach(function(o){
    var f = (dmax-dmin) > 1e-6 ? (o.d-dmin)/(dmax-dmin) : 1;
    g.globalAlpha = 0.42 + 0.58*f;
    if(o.fill){
      g.beginPath(); o.fill.forEach(function(p,i4){ i4 ? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1]); });
      g.closePath(); g.fillStyle = o.col; g.fill();
      g.strokeStyle = o.edge; g.lineWidth = 1.6; g.setLineDash([]); g.stroke();
    } else {
      g.beginPath(); o.pts.forEach(function(p,i5){ i5 ? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1]); });
      g.strokeStyle = o.col; g.lineWidth = o.lw; g.setLineDash(o.dash || []);
      g.lineJoin = 'round'; g.stroke(); g.setLineDash([]);
    }
  });
  g.globalAlpha = 1;
}
/* quadrilátero do painel governante de uma região */
function criticalQuad(reg){
  var b = ST.boat, o = R.reg[reg];
  if(reg === 'espelho'){
    var s0 = R.s0, zk0 = s0.zk, zs0 = s0.zsh;
    var q = Math.max(0, Math.min(R.tr.nH-1, Math.floor((o.zg - zk0)/(zs0-zk0)*R.tr.nH)));
    var z1 = zk0 + (zs0-zk0)*q/R.tr.nH, z2 = zk0 + (zs0-zk0)*(q+1)/R.tr.nH;
    var y1 = Math.min(yAtZ(s0,z1), yAtZ(s0,z2));
    var u = Math.floor(R.tr.nV/2);
    var ya = -s0.ysh + 2*s0.ysh*u/R.tr.nV, yb = -s0.ysh + 2*s0.ysh*(u+1)/R.tr.nV;
    ya = Math.max(-y1, Math.min(y1, ya)); yb = Math.max(-y1, Math.min(y1, yb));
    return [[xTr(z1),ya,z1],[xTr(z1),yb,z1],[xTr(z2),yb,z2],[xTr(z2),ya,z2]];
  }
  var lyr = R.lay[reg]; if(!lyr) return null;
  var i = Math.max(0, Math.min(R.nF-1, Math.floor(o.Xg / b.LOA * R.nF)));
  var xi1 = i/R.nF, xi2 = (i+1)/R.nF, sc1 = sect(xi1), sc2 = sect(xi2);
  /* faixa cujo centro está mais perto de zg */
  var best = 0, bd = 1e9;
  for(var q2=0;q2<lyr.n;q2++){
    var p1 = girthPt(sc1, reg, q2/lyr.n), p2 = girthPt(sc1, reg, (q2+1)/lyr.n);
    var dz = Math.abs((p1[1]+p2[1])/2 - o.zg);
    if(dz < bd){ bd = dz; best = q2; }
  }
  var a1 = girthPt(sc1, reg, best/lyr.n), a2 = girthPt(sc1, reg, (best+1)/lyr.n);
  var c1 = girthPt(sc2, reg, best/lyr.n), c2 = girthPt(sc2, reg, (best+1)/lyr.n);
  return [[xi1*b.LOA,a1[0],a1[1]],[xi1*b.LOA,a2[0],a2[1]],
          [xi2*b.LOA,c2[0],c2[1]],[xi2*b.LOA,c1[0],c1[1]]];
}


/* ==================================================== SEÇÃO MESTRA (2D) */
function drawSection(){
  var cv = el('secCanvas'), C = setupCv(cv), g = C.g;
  if(!R) return;
  var b = ST.boat, sc = R.mid;
  var zTop = Math.max(sc.zdc, b.d + 0.2), yMax = sc.ysh;
  var padX = 34, padY = 26;
  var s = Math.min((C.w - 2*padX) / Math.max(1e-6, 2*yMax*1.06),
                   (C.h - 2*padY) / Math.max(1e-6, zTop*1.10));
  var cx = C.w/2, cy = C.h - padY;
  function P(y, z){ return [cx + y*s, cy - z*s]; }

  /* eixo e linha de centro */
  g.strokeStyle = 'rgba(120,120,120,.6)'; g.lineWidth = 1; g.setLineDash([3,4]);
  g.beginPath(); g.moveTo(cx, cy - zTop*s*1.02); g.lineTo(cx, cy + 6); g.stroke();
  g.setLineDash([]);

  /* linha d’água e o limite d + 0,15 m da Tabela 7.1 */
  function hline(z, col, txt, dash){
    var p = P(0,z);
    g.strokeStyle = col; g.lineWidth = 1.2; g.setLineDash(dash);
    g.beginPath(); g.moveTo(padX*0.5, p[1]); g.lineTo(C.w - padX*0.5, p[1]); g.stroke();
    g.setLineDash([]);
    g.fillStyle = col; g.font = '9.5px Consolas, monospace'; g.textAlign = 'left';
    g.fillText(txt, padX*0.5 + 2, p[1] - 3);
  }
  if(ST.show.agua) hline(b.d, 'rgba(95,174,230,.9)', 'LA  d = ' + fmt(b.d,3) + ' m', [6,4]);
  hline(b.d + 0.15, 'rgba(251,177,47,.75)', 'd + 0,15 m  (limite 7.1a / 7.1b)', [2,3]);

  /* contorno por região, com a espessura adotada na escala do desenho */
  var REGS = [['fundo','rgba(238,154,152,1)'],['costado','rgba(95,174,230,1)'],['conves','rgba(155,215,155,1)']];
  [1,-1].forEach(function(side){
    REGS.forEach(function(rr){
      var reg = rr[0], lyr = R.lay[reg], tt = R.reg[reg].tAdo/1000;
      g.strokeStyle = rr[1]; g.lineWidth = Math.max(1.6, tt*s); g.lineCap = 'butt';
      g.beginPath();
      for(var q=0;q<=40;q++){
        var p = girthPt(sc, reg, q/40), pt = P(p[0]*side, p[1]);
        q ? g.lineTo(pt[0],pt[1]) : g.moveTo(pt[0],pt[1]);
      }
      g.stroke();
      /* marcadores dos longitudinais */
      g.fillStyle = rr[1];
      for(var q2=1;q2<lyr.n;q2++){
        var p2 = girthPt(sc, reg, q2/lyr.n), pt2 = P(p2[0]*side, p2[1]);
        g.fillRect(pt2[0]-2.6, pt2[1]-2.6, 5.2, 5.2);
      }
    });
  });
  /* pontos notáveis */
  g.font = '9.5px Consolas, monospace'; g.textAlign = 'left';
  [[0, sc.zk, 'quilha'], [sc.ych, sc.zch, 'quina'], [sc.ysh, sc.zsh, 'borda'],
   [0, sc.zdc, 'LC do convés']].forEach(function(m){
    var p = P(m[0], m[1]);
    g.fillStyle = 'rgba(232,232,232,.95)';
    g.beginPath(); g.arc(p[0], p[1], 2.4, 0, 7); g.fill();
    g.fillStyle = 'rgba(191,191,191,.9)';
    g.fillText(m[2], p[0] + 5, p[1] - 4);
  });

  /* painel crítico do casco na seção mestra */
  var worst = R.ORD.reduce(function(a,k){
    return (R.reg[k].gerr.FS/R.reg[k].gerr.fsTarget) < (R.reg[a].gerr.FS/R.reg[a].gerr.fsTarget) ? k : a; });
  if(ST.show.painel && worst !== 'espelho' && R.lay[worst]){
    var lyr2 = R.lay[worst], o = R.reg[worst], best = 0, bd = 1e9;
    for(var q3=0;q3<lyr2.n;q3++){
      var p1 = girthPt(sc, worst, q3/lyr2.n), p2b = girthPt(sc, worst, (q3+1)/lyr2.n);
      var dz = Math.abs((p1[1]+p2b[1])/2 - o.zg);
      if(dz < bd){ bd = dz; best = q3; }
    }
    var A1 = girthPt(sc, worst, best/lyr2.n), A2 = girthPt(sc, worst, (best+1)/lyr2.n);
    var q1 = P(A1[0],A1[1]), q2b = P(A2[0],A2[1]);
    g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 5; g.globalAlpha = .55;
    g.beginPath(); g.moveTo(q1[0],q1[1]); g.lineTo(q2b[0],q2b[1]); g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(238,154,152,1)'; g.textAlign = 'left';
    g.fillText('s = ' + fmt(o.s,0) + ' mm', (q1[0]+q2b[0])/2 + 8, (q1[1]+q2b[1])/2);
  }
  /* leituras de espessura */
  g.textAlign = 'right'; g.font = '10px Consolas, monospace';
  var yy = padY;
  REGS.forEach(function(rr){
    g.fillStyle = rr[1];
    g.fillText(nomeReg(rr[0]) + '  ' + fmt(R.reg[rr[0]].tAdo,1) + ' mm', C.w - 6, yy);
    yy += 13;
  });
  g.fillStyle = 'rgba(191,191,191,.85)'; g.font = '9px Consolas, monospace';
  g.fillText('espessura desenhada na escala do corte', C.w - 6, yy + 2);
}

/* ==================================================== ESPELHO DE POPA (2D) */
function drawTransom(){
  var cv = el('tranCanvas'), C = setupCv(cv), g = C.g;
  if(!R) return;
  var b = ST.boat, s0 = R.s0, rk = Math.cos(b.rake*Math.PI/180);
  var W = R.tr.w/1000, H = R.tr.h/1000;              /* metros, no plano do espelho */
  var padX = 30, padY = 30;
  var s = Math.min((C.w - 2*padX)/Math.max(1e-6, W*1.06), (C.h - 2*padY)/Math.max(1e-6, H*1.14));
  var cx = C.w/2, cy = C.h - padY;
  function P(y, zp){ return [cx + y*s, cy - zp*s]; }
  function zp(z){ return (z - s0.zk)/rk; }

  /* contorno verdadeiro do painel */
  g.strokeStyle = 'rgba(195,155,211,1)';
  g.lineWidth = Math.max(1.8, R.reg.espelho.tAdo/1000*s); g.lineJoin = 'round';
  g.beginPath();
  var N = 40, first = true;
  for(var i=0;i<=N;i++){
    var z = s0.zk + (s0.zsh - s0.zk)*i/N, y = yAtZ(s0,z), p = P(y, zp(z));
    first ? (g.moveTo(p[0],p[1]), first=false) : g.lineTo(p[0],p[1]);
  }
  for(var i2=N;i2>=0;i2--){
    var z2 = s0.zk + (s0.zsh - s0.zk)*i2/N, y2 = yAtZ(s0,z2), p2 = P(-y2, zp(z2));
    g.lineTo(p2[0],p2[1]);
  }
  g.closePath(); g.stroke();

  /* linhas de água */
  function hl(z, col, txt, dash){
    if(z < s0.zk || z > s0.zsh) return;
    var p = P(0, zp(z));
    g.strokeStyle = col; g.lineWidth = 1.2; g.setLineDash(dash);
    g.beginPath(); g.moveTo(padX*0.4, p[1]); g.lineTo(C.w - padX*0.4, p[1]); g.stroke();
    g.setLineDash([]); g.fillStyle = col; g.font = '9.5px Consolas, monospace'; g.textAlign = 'left';
    g.fillText(txt, padX*0.4 + 2, p[1] - 3);
  }
  if(ST.show.agua) hl(b.d, 'rgba(95,174,230,.9)', 'LA', [6,4]);
  hl(b.d + 0.15, 'rgba(251,177,47,.75)', 'd + 0,15 m', [2,3]);

  /* grade: horizontais e verticais */
  g.lineWidth = 1.1;
  for(var v=1;v<R.tr.nH;v++){
    var zpv = H*v/R.tr.nH, zv = s0.zk + zpv*rk, yv = yAtZ(s0, zv);
    var a = P(-yv, zpv), c = P(yv, zpv);
    g.strokeStyle = 'rgba(251,177,47,.85)';
    g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(c[0],c[1]); g.stroke();
  }
  for(var u=1;u<R.tr.nV;u++){
    var yu = -W/2 + W*u/R.tr.nV;
    g.strokeStyle = 'rgba(195,155,211,.85)';
    g.beginPath(); var started = false;
    for(var q=0;q<=30;q++){
      var zpq = H*q/30, zq = s0.zk + zpq*rk;
      if(Math.abs(yu) <= yAtZ(s0,zq) + 1e-9){
        var pq = P(yu, zpq);
        started ? g.lineTo(pq[0],pq[1]) : (g.moveTo(pq[0],pq[1]), started = true);
      }
    }
    g.stroke();
  }
  /* painel crítico do espelho */
  var o = R.reg.espelho;
  var qh = Math.max(0, Math.min(R.tr.nH-1, Math.floor((o.zg - s0.zk)/(s0.zsh - s0.zk)*R.tr.nH)));
  var zA = H*qh/R.tr.nH, zB = H*(qh+1)/R.tr.nH;
  var uu = Math.floor(R.tr.nV/2);
  var yA = -W/2 + W*uu/R.tr.nV, yB = -W/2 + W*(uu+1)/R.tr.nV;
  if(ST.show.painel){
    var pa = P(yA, zA), pb = P(yB, zB);
    g.fillStyle = 'rgba(154,50,49,.45)';
    g.fillRect(Math.min(pa[0],pb[0]), Math.min(pa[1],pb[1]), Math.abs(pb[0]-pa[0]), Math.abs(pb[1]-pa[1]));
    g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 1.5;
    g.strokeRect(Math.min(pa[0],pb[0]), Math.min(pa[1],pb[1]), Math.abs(pb[0]-pa[0]), Math.abs(pb[1]-pa[1]));
  }
  /* leituras */
  g.textAlign = 'right'; g.font = '10px Consolas, monospace';
  g.fillStyle = 'rgba(195,155,211,1)';
  g.fillText('t exigida ' + fmt(o.t,2) + ' mm · adotada ' + fmt(o.tAdo,1) + ' mm', C.w - 6, padY - 12);
  g.fillStyle = 'rgba(191,191,191,.9)'; g.font = '9px Consolas, monospace';
  g.fillText('carga ' + fmt(o.head,2) + ' m (' + o.zone + ') · painel ' + fmt(o.s,0) + ' × ' + fmt(o.l,0) + ' mm',
             C.w - 6, padY);
  g.fillText('inclinação ' + fmt(b.rake,0) + '° já somada na altura do painel', C.w - 6, padY + 12);
}

/* ============================= ESPESSURA AO LONGO DO COMPRIMENTO (2D) */
var LC = null;
function drawLenChart(){
  var cv = el('tCanvas'), C = setupCv(cv), g = C.g;
  if(!R) return;
  var b = ST.boat, padL = 46, padR = 14, padT = 16, padB = 30;
  var tmax = 0;
  ['fundo','costado','conves'].forEach(function(k){
    R.curves[k].forEach(function(p){ tmax = Math.max(tmax, p.t); });
  });
  R.ORD.forEach(function(k){ tmax = Math.max(tmax, R.reg[k].tAdo); });
  tmax = tmax * 1.14 || 1;
  var X0 = padL, X1 = C.w - padR, Y0 = C.h - padB, Y1 = padT;
  function PX(x){ return X0 + x/b.LOA*(X1-X0); }
  function PY(t){ return Y0 - t/tmax*(Y0-Y1); }
  LC = {PX:PX, PY:PY, X0:X0, X1:X1, Y0:Y0, Y1:Y1, tmax:tmax, w:C.w, h:C.h};

  /* grade */
  g.strokeStyle = 'rgba(120,120,120,.35)'; g.lineWidth = 1;
  g.font = '9px Consolas, monospace'; g.fillStyle = 'rgba(191,191,191,.85)';
  var step = tmax > 40 ? 10 : (tmax > 16 ? 5 : (tmax > 8 ? 2 : 1));
  for(var t=0;t<=tmax;t+=step){
    var y = PY(t);
    g.beginPath(); g.moveTo(X0,y); g.lineTo(X1,y); g.stroke();
    g.textAlign = 'right'; g.fillText(fmt(t,0), X0-5, y+3);
  }
  g.textAlign = 'left'; g.fillText('mm', 6, Y1+4);
  /* balizas */
  R.frames.forEach(function(xf){
    var x = PX(xf);
    g.strokeStyle = 'rgba(251,177,47,.30)';
    g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke();
    g.fillStyle = 'rgba(251,177,47,.85)';
    g.beginPath(); g.arc(x, Y0, 2, 0, 7); g.fill();
  });
  /* eixo x */
  g.strokeStyle = 'rgba(160,160,160,.7)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(X0,Y0); g.lineTo(X1,Y0); g.stroke();
  g.fillStyle = 'rgba(191,191,191,.9)'; g.textAlign = 'center';
  for(var i=0;i<=4;i++){
    var xv = b.LOA*i/4;
    g.fillText(fmt(xv,1) + ' m', PX(xv), Y0+13);
  }
  g.textAlign = 'left'; g.fillText('popa', X0, Y0+25);
  g.textAlign = 'right'; g.fillText('proa', X1, Y0+25);

  /* faixa 0,05 a 0,35 Lwl, onde a Tabela 7.1 dá 1,20h */
  var ov = Math.max(0,(b.LOA-b.LWL)/2), xf2 = b.LOA-ov;
  var xa = Math.max(0, xf2 - 0.35*b.LWL), xb2 = Math.min(b.LOA, xf2 - 0.05*b.LWL);
  g.fillStyle = 'rgba(238,154,152,.09)';
  g.fillRect(PX(xa), Y1, PX(xb2)-PX(xa), Y0-Y1);
  g.fillStyle = 'rgba(238,154,152,.75)'; g.font = '9px Consolas, monospace'; g.textAlign = 'center';
  g.fillText('1,20h  ·  0,05 a 0,35 L' + 'wl', (PX(xa)+PX(xb2))/2, Y1+10);

  /* curvas */
  var CV = [['fundo','rgba(238,154,152,1)'],['costado','rgba(95,174,230,1)'],['conves','rgba(155,215,155,1)']];
  CV.forEach(function(cc){
    g.strokeStyle = cc[1]; g.lineWidth = 2; g.beginPath();
    R.curves[cc[0]].forEach(function(p,i2){
      var x = PX(p.X), y = PY(p.t);
      i2 ? g.lineTo(x,y) : g.moveTo(x,y);
    });
    g.stroke();
    /* espessura adotada, tracejada */
    var ta = R.reg[cc[0]].tAdo;
    g.setLineDash([5,4]); g.lineWidth = 1.1; g.globalAlpha = .8;
    g.beginPath(); g.moveTo(X0, PY(ta)); g.lineTo(X1, PY(ta)); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
  });
  /* ponto governante do fundo */
  var pg = R.reg.fundo;
  var px = PX(pg.Xg), py = PY(pg.t);
  g.fillStyle = 'rgba(255,255,255,1)';
  g.beginPath(); g.arc(px, py, 3.4, 0, 7); g.fill();
  g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 1.6; g.stroke();
}

/* ============== ESPESSURA E FS EM FUNÇÃO DA VELOCIDADE (versão 2) */
var VC = null;
function drawVelChart(){
  var cv = el('vCanvas'), C = setupCv(cv), g = C.g;
  if(!R) return;
  var b = ST.boat, sw = R.sweep, pts = sw.pts;
  var padL = 46, padR = 48, padT = 18, padB = 32;
  var X0 = padL, X1 = C.w - padR, Y0 = C.h - padB, Y1 = padT;
  var tMax = 0, fsMax = 0;
  pts.forEach(function(q){ tMax = Math.max(tMax, q.tG); fsMax = Math.max(fsMax, q.FS); });
  tMax = Math.max(tMax, R.reg.fundo.tAbs, R.reg.fundo.tAdo) * 1.15 || 1;
  fsMax = Math.min(fsMax, 40) * 1.10 || 1;
  function PX(v){ return X0 + v/sw.vTop*(X1-X0); }
  function PY(t){ return Y0 - t/tMax*(Y0-Y1); }
  function PF(f){ return Y0 - Math.min(f,fsMax)/fsMax*(Y0-Y1); }
  VC = {PX:PX, X0:X0, X1:X1, Y0:Y0, Y1:Y1, vTop:sw.vTop, tMax:tMax, fsMax:fsMax};

  /* faixa fora do envelope do Sn */
  if(R.VmaxSn < sw.vTop){
    g.fillStyle = 'rgba(154,50,49,.16)';
    g.fillRect(PX(R.VmaxSn), Y1, PX(sw.vTop)-PX(R.VmaxSn), Y0-Y1);
  }
  /* grade */
  g.strokeStyle = 'rgba(120,120,120,.32)'; g.lineWidth = 1;
  g.font = '9px Consolas, monospace';
  var stp = tMax > 40 ? 10 : (tMax > 16 ? 5 : (tMax > 8 ? 2 : 1));
  for(var t=0;t<=tMax;t+=stp){
    var y = PY(t);
    g.beginPath(); g.moveTo(X0,y); g.lineTo(X1,y); g.stroke();
    g.fillStyle = 'rgba(238,154,152,.9)'; g.textAlign = 'right'; g.fillText(fmt(t,0), X0-5, y+3);
  }
  var fstp = fsMax > 20 ? 5 : (fsMax > 8 ? 2 : 1);
  for(var f=0;f<=fsMax;f+=fstp){
    g.fillStyle = 'rgba(155,215,155,.9)'; g.textAlign = 'left';
    g.fillText(fmt(f,0), X1+5, PF(f)+3);
  }
  g.textAlign = 'left'; g.fillStyle = 'rgba(238,154,152,.9)'; g.fillText('mm', 6, Y1+4);
  g.textAlign = 'right'; g.fillStyle = 'rgba(155,215,155,.9)'; g.fillText('FS', C.w-6, Y1+4);
  /* eixo x */
  g.strokeStyle = 'rgba(160,160,160,.7)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(X0,Y0); g.lineTo(X1,Y0); g.stroke();
  g.fillStyle = 'rgba(191,191,191,.9)'; g.textAlign = 'center';
  for(var i=0;i<=5;i++){ var v = sw.vTop*i/5; g.fillText(fmt(v,0), PX(v), Y0+13); }
  g.fillText('nós', (X0+X1)/2, Y0+26);

  /* FS alvo */
  var tgt = R.reg.fundo.gerr.fsTarget;
  g.strokeStyle = 'rgba(155,215,155,.55)'; g.setLineDash([3,4]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(X0, PF(tgt)); g.lineTo(X1, PF(tgt)); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(155,215,155,.8)'; g.textAlign = 'left'; g.font = '9px Consolas, monospace';
  g.fillText('FS alvo ' + fmt(tgt,1), X0+4, PF(tgt)-3);

  /* t do ABS, constante */
  g.strokeStyle = 'rgba(95,174,230,1)'; g.lineWidth = 1.8; g.setLineDash([7,4]);
  g.beginPath(); g.moveTo(X0, PY(R.reg.fundo.tAbs)); g.lineTo(X1, PY(R.reg.fundo.tAbs)); g.stroke();
  g.setLineDash([]);
  /* t governante, e t de Gerr */
  function curve(fn, col, lw){
    g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
    pts.forEach(function(q,i){ var x = PX(q.V), y = fn(q); i ? g.lineTo(x,y) : g.moveTo(x,y); });
    g.stroke();
  }
  curve(function(q){ return PY(Math.max(q.tG, R.reg.fundo.tAbs)); }, 'rgba(255,255,255,.95)', 3.2);
  curve(function(q){ return PY(q.tG); }, 'rgba(238,154,152,1)', 2);
  curve(function(q){ return PF(q.FS); }, 'rgba(155,215,155,1)', 2);

  /* velocidade atual */
  var xv = PX(Math.min(b.V, sw.vTop));
  g.strokeStyle = 'rgba(251,177,47,1)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(xv, Y0); g.lineTo(xv, Y1); g.stroke();
  g.fillStyle = 'rgba(251,177,47,1)'; g.textAlign = xv > (X0+X1)/2 ? 'right' : 'left';
  g.font = '10px Consolas, monospace';
  g.fillText(' ' + fmt(b.V,1) + ' nós ', xv + (xv > (X0+X1)/2 ? -4 : 4), Y1+11);
  /* envelope */
  if(R.VmaxSn < sw.vTop){
    var xe = PX(R.VmaxSn);
    g.strokeStyle = 'rgba(238,154,152,.9)'; g.lineWidth = 1.4; g.setLineDash([4,4]);
    g.beginPath(); g.moveTo(xe, Y0); g.lineTo(xe, Y1); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(238,154,152,.95)'; g.textAlign = 'left';
    g.fillText(' envelope Sn', xe+3, Y0-6);
  }
  /* ponto de cruzamento: onde Gerr passa o ABS */
  var cross = null;
  for(var j=1;j<pts.length;j++){
    if(pts[j-1].tG <= R.reg.fundo.tAbs && pts[j].tG > R.reg.fundo.tAbs){ cross = pts[j]; break; }
  }
  if(cross){
    var xc = PX(cross.V), yc = PY(R.reg.fundo.tAbs);
    g.fillStyle = 'rgba(255,255,255,1)';
    g.beginPath(); g.arc(xc, yc, 3.6, 0, 7); g.fill();
    g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)'; g.textAlign = 'center'; g.font = '9.5px Consolas, monospace';
    g.fillText('Gerr passa o ABS · ' + fmt(cross.V,1) + ' nós', xc, yc-9);
    VC.cross = cross;
  }
}

/* ================================================================ EVENTOS */
function bindRange(idR, idN, key, mn, mx){
  var rg = el(idR), nm = el(idN);
  rg.min = mn; rg.max = mx;
  function set(v){
    v = parseFloat(v); if(!isFinite(v)) return;
    v = Math.max(mn, Math.min(mx, v));
    ST[key] = v; ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh();
  }
  rg.oninput = function(){ set(rg.value); };
  nm.oninput  = function(){ set(nm.value); };
}
function bindToggle(id, key){
  var c = el(id); c.checked = !!ST.show[key];
  c.onchange = function(){ ST.show[key] = c.checked ? 1 : 0; draw3D(); drawSection(); drawTransom(); };
}
/* a velocidade vive em ST.boat, então tem o seu próprio ligador */
function bindSpeed(){
  var rg = el('vel'), nm = el('veln');
  function set(v){
    v = parseFloat(v); if(!isFinite(v) || v < 0) return;
    ST.boat.V = Math.min(120, v);
    ST.t = {fundo:null,costado:null,espelho:null,conves:null};
    refresh();
  }
  rg.oninput = function(){ set(rg.value); };
  nm.oninput = function(){ set(nm.value); };
  var sr = el('slRef');
  sr.value = ST.kRef;
  sr.oninput = function(){
    var v = parseFloat(sr.value);
    if(isFinite(v) && v >= 0.2 && v <= 1){
      ST.kRef = v; ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh();
    }
  };
}
function initEvents(){
  bindRange('sL','sLn','sL', 60, 1400);
  bindRange('sT','sTn','sT', 100, 2600);
  bindSpeed();
  [['tFundo','fundo'],['tCostado','costado'],['tConves','conves'],['tEspelho','espelho'],
   ['tLong','lon'],['tTrans','tra'],['tPainel','painel'],['tAgua','agua'],['tBordo','umBordo']]
   .forEach(function(p){ bindToggle(p[0], p[1]); });

  el('tPlyVerif').onchange = function(){
    ST.plyVerif = this.checked;
    ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh();
  };
  el('fit').onclick = function(){ ST.zoom = 1; fitView(); draw3D(); };
  el('btnTypical').onclick = function(){
    var ts = typicalSpacing();
    ST.sL = Math.round(ts.sL/5)*5; ST.sT = Math.round(ts.sT/5)*5;
    ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh();
  };
  el('btnMinT').onclick = function(){
    ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh();
  };
  el('btnVsn').onclick = function(){
    if(R){ ST.boat.V = Math.round(R.VmaxSn*10)/10;
      ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh(); }
  };
  el('tGovern').checked = !!ST.govern;
  el('tGovern').onchange = function(){
    ST.govern = this.checked ? 1 : 0;
    ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh();
  };

  /* órbita no palco */
  var cv = el('gl'), drag = null;
  cv.addEventListener('pointerdown', function(e){
    drag = {x:e.clientX, y:e.clientY, az:ST.az, el:ST.el};
    cv.classList.add('dragging'); cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', function(e){
    if(!drag) return;
    ST.az = drag.az + (e.clientX - drag.x)*0.45;
    ST.el = Math.max(-89, Math.min(89, drag.el + (e.clientY - drag.y)*0.35));
    ST.view = ''; renderChips(); el('viewName').textContent = 'livre';
    fitView(); draw3D();
  });
  cv.addEventListener('pointerup', function(e){
    drag = null; cv.classList.remove('dragging');
    try{ cv.releasePointerCapture(e.pointerId); }catch(err){}
  });
  cv.addEventListener('wheel', function(e){
    e.preventDefault();
    ST.zoom = Math.max(0.4, Math.min(6, ST.zoom * (e.deltaY > 0 ? 0.92 : 1.087)));
    fitView(); draw3D();
  }, {passive:false});

  /* tooltip do gráfico ao longo do comprimento */
  var tc = el('tCanvas'), tip = el('tcTip');
  tc.addEventListener('pointermove', function(e){
    if(!LC || !R) return;
    var rc = tc.getBoundingClientRect(), mx = e.clientX - rc.left;
    var x = Math.max(0, Math.min(ST.boat.LOA, (mx - LC.X0)/(LC.X1-LC.X0)*ST.boat.LOA));
    function at(k){
      var arr = R.curves[k], best = arr[0];
      arr.forEach(function(p){ if(Math.abs(p.X - x) < Math.abs(best.X - x)) best = p; });
      return best.t;
    }
    tip.innerHTML = '<i>x</i> ' + fmt(x,2) + ' m &nbsp; fundo <b>' + fmt(at('fundo'),2) +
      '</b> &nbsp; costado <b>' + fmt(at('costado'),2) + '</b> &nbsp; convés <b>' +
      fmt(at('conves'),2) + '</b> mm';
    tip.style.left = mx + 'px';
    tip.style.top  = (LC.Y1 + 30) + 'px';
    tip.classList.add('on');
  });
  tc.addEventListener('pointerleave', function(){ tip.classList.remove('on'); });

  var vc = el('vCanvas'), vtip = el('vTip');
  vc.addEventListener('pointermove', function(e){
    if(!VC || !R) return;
    var rc = vc.getBoundingClientRect(), mx = e.clientX - rc.left;
    var v = Math.max(0, Math.min(VC.vTop, (mx - VC.X0)/(VC.X1-VC.X0)*VC.vTop));
    var best = R.sweep.pts[0];
    R.sweep.pts.forEach(function(q){ if(Math.abs(q.V - v) < Math.abs(best.V - v)) best = q; });
    vtip.innerHTML = '<b>' + fmt(best.V,1) + ' nós</b> &nbsp;<i>SL</i> ' + fmt(best.sl,2) +
      ' &nbsp;<i>f<sub>V</sub></i> ' + fmt(best.fV,3) + ' &nbsp;<i>p<sub>d</sub></i> ' + fmt(best.Pd,4) +
      ' &nbsp;<i>t Gerr</i> <b>' + fmt(best.tG,2) + '</b> &nbsp;<i>FS</i> <b>' + fmt(best.FS,2) + '</b>';
    vtip.style.left = mx + 'px'; vtip.style.top = (VC.Y1 + 34) + 'px';
    vtip.classList.add('on');
  });
  vc.addEventListener('pointerleave', function(){ vtip.classList.remove('on'); });
  vc.addEventListener('pointerdown', function(e){
    if(!VC) return;
    var rc = vc.getBoundingClientRect(), mx = e.clientX - rc.left;
    var v = Math.max(0, Math.min(VC.vTop, (mx - VC.X0)/(VC.X1-VC.X0)*VC.vTop));
    ST.boat.V = Math.round(v*10)/10;
    ST.t = {fundo:null,costado:null,espelho:null,conves:null}; refresh();
  });

  var to = null;
  function redrawAll(){
    clearTimeout(to);
    to = setTimeout(function(){ fitView(); draw3D(); drawSection(); drawTransom();
                                drawLenChart(); drawVelChart(); }, 90);
  }
  window.addEventListener('resize', redrawAll);
  /* o palco pode nascer com largura zero (aba oculta, fonte ainda carregando):
     o observador garante que os canvas sejam redesenhados quando o layout assenta */
  if(window.ResizeObserver){
    var ro = new ResizeObserver(redrawAll);
    ['gl','secCanvas','tranCanvas','tCanvas','vCanvas'].forEach(function(id){ ro.observe(el(id)); });
  }
}


/* ============================================================================
   PASSOS 6, 7 e 8 — o perfil de cada reforço, as anteparas de colisão,
   e o quadro de pesos e centros.

   Nada aqui muda a espessura exigida: os três passos partem do que os cinco
   primeiros já decidiram e vão adiante, para o arranjo que se constrói de
   fato.  A base normativa é a mesma do resto do painel:

     ABS 3.5.1 a 3.5.4   largura efetiva de chapeamento que trabalha junto
                         com o reforço
     ABS 8.1.3           módulo de seção exigido, com C = 619 para reforço
                         de antepara e 817 para os demais
     ABS Tab. 7.1 d)     carga de projeto da antepara: da aresta inferior ao
                         convés na linha de centro, nunca menos que 1,52 m
     ABS Tab. 7.2        tensão de projeto do chapeamento de antepara —
                         a única linha em que aço e alumínio mudam de base
     ABS Tab. 8.2        tensão de projeto do reforço de antepara estanque
   ========================================================================= */

/* --------------------------------------------------------- estado próprio */
/* ST.perf guarda a escolha de perfil por reforço; ST.ant, as anteparas.     */
ST.perf = {};
ST.ant  = {v:null, r:null, manV:false, manR:false, ultimo:null, onV:true, onR:true};
/* v e r contam CAVERNAS a partir da ponta: 1 e a primeira caverna
   depois da proa, ou depois do espelho.  Nao sao distancias.      */

/* ============================================================ SEÇÃO COMPOSTA
   Uma seção qualquer descrita por retângulos.  y é medido a partir da face
   externa do chapeamento, para dentro.  Devolve área, linha neutra, inércia
   e módulo de seção pela fibra mais afastada — que é como o ABS pede.      */
function secRects(rects){
  var A = 0, S = 0, i, r, a;
  for(i=0;i<rects.length;i++){ r = rects[i]; a = r.b*r.d; A += a; S += a*(r.y0 + r.d/2); }
  if(A <= 0) return null;
  var yb = S/A, I = 0, ht = 0;
  for(i=0;i<rects.length;i++){
    r = rects[i]; a = r.b*r.d;
    I += r.b*r.d*r.d*r.d/12 + a*Math.pow(r.y0 + r.d/2 - yb, 2);
    ht = Math.max(ht, r.y0 + r.d);
  }
  return {A:A, yb:yb, ht:ht, I:I, Icm4:I/1e4, SM:I/Math.max(yb, ht-yb)/1000};
}

/* Largura efetiva do chapeamento, ABS 3.5.1 a 3.5.4.  Nunca maior que o
   espaçamento: além dele a chapa é do reforço vizinho.                     */
function largEfetiva(MP, sp, tp, fam, d){
  if(MP.mat === 'wood') return 0;                              /* 3.5.4 */
  if(MP.mat === 'ply')  return Math.min(sp, 50*tp);            /* 3.5.2 */
  if(MP.mat === 'frp')  return Math.min(sp, 18*tp + (fam === 'chapeu' ? d.bc + 2*d.bf : 0)); /* 3.5.1 */
  return Math.min(sp, 100*tp);                                 /* 3.5.3 */
}

/* ------------------------------------------------------------- as famílias */
var FAM_N = {
  chata:  'barra chata',
  L:      'cantoneira de abas iguais',
  T:      'perfil T soldado',
  caixa:  'canaleta fechada contra a chapa',
  retang: 'peça retangular',
  Tmad:   'peça em T, alma e chapuz',
  chapeu: 'chapéu laminado sobre núcleo'
};
var FAM_DESC = {
  chata:  'a mais simples de cortar e de soldar; toda a altura trabalha, mas nada segura a borda de cima contra tombar de lado.',
  L:      'perfil de prateleira, barato e sempre disponível; a aba de cima faz as vezes de flange e enrijece a borda livre.',
  T:      'duas chatas soldadas em T. É o que dá mais módulo por quilo, porque leva material para longe da linha neutra.',
  caixa:  'a canaleta soldada de boca para baixo fecha uma caixa com a própria chapa: rigidíssima à torção, e impossível de inspecionar por dentro.',
  retang: 'a peça serrada de sempre. Simples, e em tabuado liso é a única coisa que o Guia manda contar.',
  Tmad:   'alma alta com um chapuz colado no topo: ganha módulo sem engrossar a alma inteira.',
  chapeu: 'laminado por cima de um núcleo de espuma. O núcleo dá a forma e não conta na conta; quem trabalha é o laminado.'
};
var FAM_POR_MAT = {
  alu:  ['chata','L','T','caixa'],
  steel:['chata','L','T','caixa'],
  ply:  ['retang','Tmad'],
  wood: ['retang','Tmad'],
  frp:  ['chapeu']
};

/* escadas de bitola comercial */
var LAD_H   = [25,32,38,50,63,75,90,100,125,150,175,200,225,250,300,350,400];
var LAD_BF  = [40,50,63,75,100,125,150,200];
var LAD_ANG = [[25,3],[25,4],[32,3],[32,4],[38,3],[38,5],[50,4],[50,5],[50,6],
               [63,5],[63,6],[63,8],[75,6],[75,8],[90,8],[100,8],[100,10],[125,10],[150,12]];
var LAD_MB  = [19,25,32,38,45,50,63,75,90,100,125,150];
var LAD_MH  = [25,32,38,50,63,75,90,100,125,150,175,200,225,250,300,350,400];
var LAD_CB  = [40,50,63,75,100,125,150];
var LAD_CH  = [30,40,50,63,75,100,125,150,200];
var LAD_FBC = [50,63,75,100,125,150,200];
var LAD_FH  = [25,38,50,63,75,100,125,150,200,250,300];
var LAD_FE  = [3,4,5,6,8,10,12,15,20];

/* espessuras de alma disponíveis no material, limitadas ao que se usa em
   perfil: nem fina demais para soldar, nem grossa demais para fazer sentido. */
function espAlma(MP){
  var c = (MP.comm || [3,4,5,6,8,10]).filter(function(x){ return x >= 3 && x <= 12; });
  return c.length ? c : [4,5,6,8];
}

/* lista de dimensões candidatas de uma família */
function famDims(fam, MP){
  var out = [], i, j, k;
  if(fam === 'chata'){
    var ec = espAlma(MP);
    for(i=0;i<LAD_H.length;i++) for(j=0;j<ec.length;j++)
      if(LAD_H[i] <= 55*ec[j]) out.push({h:LAD_H[i], e:ec[j]});
  } else if(fam === 'L'){
    for(i=0;i<LAD_ANG.length;i++) out.push({a:LAD_ANG[i][0], e:LAD_ANG[i][1]});
  } else if(fam === 'T'){
    var et = espAlma(MP);
    for(i=0;i<LAD_H.length;i++) for(j=0;j<LAD_BF.length;j++) for(k=0;k<et.length;k++)
      if(LAD_H[i] <= 70*et[k] && LAD_BF[j] >= 4*et[k])
        out.push({h:LAD_H[i], bf:LAD_BF[j], tw:et[k], tf:et[k]});
  } else if(fam === 'caixa'){
    var ek = espAlma(MP);
    for(i=0;i<LAD_CH.length;i++) for(j=0;j<LAD_CB.length;j++) for(k=0;k<ek.length;k++)
      out.push({h:LAD_CH[i], bc:LAD_CB[j], e:ek[k]});
  } else if(fam === 'retang'){
    for(i=0;i<LAD_MB.length;i++) for(j=0;j<LAD_MH.length;j++)
      if(LAD_MH[j] >= LAD_MB[i] && LAD_MH[j] <= 6*LAD_MB[i]) out.push({b:LAD_MB[i], h:LAD_MH[j]});
  } else if(fam === 'Tmad'){
    for(i=0;i<LAD_MB.length;i++) for(j=0;j<LAD_MH.length;j++) for(k=0;k<LAD_BF.length;k++)
      if(LAD_MH[j] >= 2*LAD_MB[i] && LAD_MH[j] <= 8*LAD_MB[i] && LAD_BF[k] >= 2*LAD_MB[i])
        out.push({b:LAD_MB[i], h:LAD_MH[j], bf:LAD_BF[k], tf:LAD_MB[i]});
  } else if(fam === 'chapeu'){
    for(i=0;i<LAD_FBC.length;i++) for(j=0;j<LAD_FH.length;j++) for(k=0;k<LAD_FE.length;k++)
      if(LAD_FH[j] >= 2*LAD_FE[k])
        out.push({bc:LAD_FBC[i], h:LAD_FH[j], e:LAD_FE[k], bf:Math.max(25, 3*LAD_FE[k])});
  }
  return out;
}

/* densidade do material do reforço, e a do núcleo do chapéu */
function densPerfil(MP){
  if(MP.mat === 'wood') return (WOODS[ST.grade.wood].sg || 0.55)*1000;
  if(MP.mat === 'ply')  return (WOODS[ST.grade.ply].sg  || 0.55)*1000;
  return DENS_MAT[MP.mat];
}
var DENS_NUCLEO = 80;    /* espuma de PVC — valor de catálogo, fora das fontes */

/* monta a seção completa de um perfil sobre o chapeamento */
function montaSec(fam, d, MP, sp, tp){
  var w = largEfetiva(MP, sp, tp, fam, d), RE = [], aSt = 0, aNu = 0;
  /* xc é o centro do retângulo na largura, e serve só ao desenho: a flexão
     é em torno do eixo horizontal, e nela a posição transversal não entra. */
  function pr(b2, d2, y0, xc){ RE.push({b:b2, d:d2, y0:y0, xc:xc || 0}); }
  if(w > 0 && tp > 0) pr(w, tp, 0, 0);
  if(fam === 'chata'){
    pr(d.e, d.h, tp, 0); aSt = d.e*d.h;
  } else if(fam === 'L'){
    pr(d.e, d.a, tp, -(d.a - d.e)/2);
    pr(d.a - d.e, d.e, tp + d.a - d.e, d.e/2);
    aSt = d.e*d.a + (d.a - d.e)*d.e;
  } else if(fam === 'T'){
    pr(d.tw, d.h, tp, 0);
    pr(d.bf, d.tf, tp + d.h, 0);
    aSt = d.tw*d.h + d.bf*d.tf;
  } else if(fam === 'caixa'){
    pr(d.e, d.h, tp, -(d.bc - d.e)/2);
    pr(d.e, d.h, tp,  (d.bc - d.e)/2);
    pr(d.bc, d.e, tp + d.h, 0);
    aSt = 2*d.e*d.h + d.bc*d.e;
  } else if(fam === 'retang'){
    pr(d.b, d.h, tp, 0); aSt = d.b*d.h;
  } else if(fam === 'Tmad'){
    pr(d.b, d.h, tp, 0);
    pr(d.bf, d.tf, tp + d.h, 0);
    aSt = d.b*d.h + d.bf*d.tf;
  } else if(fam === 'chapeu'){
    pr(d.e, d.h, tp, -(d.bc - d.e)/2);
    pr(d.e, d.h, tp,  (d.bc - d.e)/2);
    pr(d.bc, d.e, tp + d.h, 0);
    pr(d.bf, d.e, tp, -(d.bc + d.bf)/2);
    pr(d.bf, d.e, tp,  (d.bc + d.bf)/2);
    aSt = 2*d.e*d.h + d.bc*d.e + 2*d.bf*d.e;
    aNu = d.bc*d.h;
  }
  var pr = secRects(RE);
  if(!pr) return null;
  var kgm = (aSt*densPerfil(MP) + aNu*DENS_NUCLEO)/1e6;
  /* o texto da bitola NAO se monta aqui: fmt() passa por toLocaleString, que
     custa ~50 us, e este ponto roda dez mil vezes por repintura.  Quem
     precisa do texto chama comDesc() na lista curta.                       */
  return {fam:fam, dims:d, rects:RE, w:w, tp:tp, A:pr.A, yb:pr.yb, ht:pr.ht,
          I:pr.I, Icm4:pr.Icm4, SM:pr.SM, aSt:aSt, aNu:aNu, kgm:kgm,
          alt:pr.ht - tp};
}

/* o nome da bitola, do jeito que se pede no depósito */
function perfDesc(fam, d){
  if(fam === 'chata')  return 'barra chata ' + fmt(d.h,0) + ' × ' + fmt(d.e,0) + ' mm';
  if(fam === 'L')      return 'cantoneira ' + fmt(d.a,0) + ' × ' + fmt(d.a,0) + ' × ' + fmt(d.e,0) + ' mm';
  if(fam === 'T')      return 'T de ' + fmt(d.h,0) + ' × ' + fmt(d.tw,0) + ' com flange ' + fmt(d.bf,0) + ' × ' + fmt(d.tf,0) + ' mm';
  if(fam === 'caixa')  return 'canaleta ' + fmt(d.bc,0) + ' × ' + fmt(d.h,0) + ' × ' + fmt(d.e,0) + ' mm';
  if(fam === 'retang') return 'peça de ' + fmt(d.b,0) + ' × ' + fmt(d.h,0) + ' mm';
  if(fam === 'Tmad')   return 'alma de ' + fmt(d.b,0) + ' × ' + fmt(d.h,0) + ' com chapuz ' + fmt(d.bf,0) + ' × ' + fmt(d.tf,0) + ' mm';
  if(fam === 'chapeu') return 'chapéu de ' + fmt(d.bc,0) + ' × ' + fmt(d.h,0) + ' mm, laminado a ' + fmt(d.e,0) + ' mm';
  return '—';
}
/* escreve o texto da bitola, só em quem vai aparecer na tela */
function comDesc(c){ if(c && !c.desc) c.desc = perfDesc(c.fam, c.dims); return c; }

/* assinatura estável, para comparar duas escolhas */
function perfId(c){
  var d = c.dims, ks = [], k;
  for(k in d) if(d.hasOwnProperty(k)) ks.push(k);
  ks.sort();
  return c.fam + ':' + ks.map(function(q){ return q + d[q]; }).join(',');
}

/* -------------------------------------------- candidatos para um reforço */
/* Montar todas as bitolas custa caro, e vários reforços partilham o mesmo par
   espaçamento + espessura de chapa.  Então o catálogo se monta uma vez por
   par e se reaproveita; quem muda de reforço para reforço é só o corte —
   o módulo exigido.  O cache cai inteiro quando o material muda.          */
var SEC_CACHE = {}, SEC_KEY = null;
function secsPara(MP, sp, tp){
  var mk = [MP.mat, MP.comm ? MP.comm.join(',') : '', densPerfil(MP)].join('#');
  if(SEC_KEY !== mk){ SEC_CACHE = {}; SEC_KEY = mk; }
  var k = sp.toFixed(3) + '|' + tp.toFixed(3);
  if(SEC_CACHE[k]) return SEC_CACHE[k];
  var lista = [];
  (FAM_POR_MAT[MP.mat] || ['chata']).forEach(function(fam){
    famDims(fam, MP).forEach(function(d){
      var c = montaSec(fam, d, MP, sp, tp);
      if(c) lista.push(c);
    });
  });
  SEC_CACHE[k] = lista;
  return lista;
}
/* cópia com o veredito deste reforço.  Cópia, e não o próprio: o mesmo
   catálogo serve reforços com exigências diferentes.                      */
function marcaPassa(c, need, needI){
  comDesc(c);
  var o = {}, k;
  for(k in c) if(c.hasOwnProperty(k)) o[k] = c[k];
  o.passaSM = c.SM >= need - 1e-9;
  o.passaI  = !needI || c.Icm4 >= needI - 1e-9;
  o.passa   = o.passaSM && o.passaI;
  return o;
}
/* Devolve os que passam, os mais leves de cada família à frente.  Em fibra
   de vidro o critério do ABS é de inércia, não de módulo: valem os dois.  */
function perfCandidatos(row, MP){
  var need = row.SMreq || 0, needI = row.I || 0;
  var todas = secsPara(MP, row.spW, row.tPlate), porFam = {}, out = [];
  todas.forEach(function(c){
    if(c.SM >= need - 1e-9 && (!needI || c.Icm4 >= needI - 1e-9))
      (porFam[c.fam] = porFam[c.fam] || []).push(c);
  });
  /* oito opções ao todo, repartidas pelas famílias que passam: com quatro
     famílias saem duas de cada; em fibra de vidro, que só tem o chapéu,
     saem as oito dele.                                                   */
  var fams = Object.keys(porFam), porCada = Math.max(2, Math.ceil(8/Math.max(1, fams.length)));
  fams.forEach(function(f){
    porFam[f].sort(function(a,b){ return a.kgm - b.kgm; });
    out = out.concat(porFam[f].slice(0, porCada));
  });
  if(!out.length){
    /* nada passa: oferece os mais fortes que existem, para a conversa não parar */
    out = todas.slice().sort(function(a,b){ return b.SM - a.SM; }).slice(0, 4);
  }
  out.sort(function(a,b){ return a.kgm - b.kgm; });
  return out.slice(0, 8).map(function(c){ return marcaPassa(c, need, needI); });
}

/* ------------------------------------------------- escolha, por reforço */
function perfilTodos(r){
  var MP = r.MP, res = {};
  r.stiff.forEach(function(row){
    if(!row.exists || !row.key) return;
    var cand = perfCandidatos(row, MP);
    if(!cand.length) return;
    var sel = ST.perf[row.key], esc = null, i;
    if(sel && (FAM_POR_MAT[MP.mat] || []).indexOf(sel.fam) < 0) sel = null;   /* trocou de material */
    if(sel){
      /* A bitola que o painel escolheu sozinho não pode continuar valendo
         depois de deixar de passar: quem mudou foi o barco, não a decisão de
         quem está usando.  Já a bitola escolhida a dedo fica, e é aí que o
         vermelho ensina alguma coisa.                                     */
      if(!sel.man){
        var prova = montaSec(sel.fam, sel.dims, MP, row.spW, row.tPlate);
        if(!prova || prova.SM < (row.SMreq || 0) - 1e-9 ||
           (row.I && prova.Icm4 < row.I - 1e-9)) sel = null;
      }
    }
    if(sel){
      var alvo = perfId(sel);
      for(i=0;i<cand.length;i++) if(perfId(cand[i]) === alvo){ esc = cand[i]; break; }
      if(!esc){
        /* A bitola escolhida saiu da lista curta.  Remonta-a assim mesmo: mexer
           no espaçamento não pode apagar a escolha de quem escolheu — e é
           justamente aí que se vê um perfil deixar de passar.               */
        var c2 = montaSec(sel.fam, sel.dims, MP, row.spW, row.tPlate);
        if(c2){
          esc = marcaPassa(c2, row.SMreq || 0, row.I || 0);
          cand = cand.concat([esc]);
          cand.sort(function(a,b){ return a.kgm - b.kgm; });
        }
      }
    }
    if(!esc){ esc = cand[0]; ST.perf[row.key] = {fam:esc.fam, dims:esc.dims, man:false}; }
    res[row.key] = {row:row, cand:cand, esc:esc};
  });
  return res;
}

/* ================================================== GEOMETRIA DOS REFORÇOS
   Comprimento e centro de cada família de reforço, percorrendo o casco.
   Devolve, por família: quantas peças, comprimento total, e o centro
   longitudinal e vertical do conjunto.  O centro transversal é zero por
   simetria e não entra na tabela.                                        */
function trilhaLongitudinal(region, f, NP){
  /* percorre um longitudinal de popa a proa, na fração f do perímetro */
  var b = ST.boat, L = 0, mx = 0, mz = 0, ant = null;
  for(var i=0;i<=NP;i++){
    var xi = i/NP, p = girthPt(sect(xi), region, f), cur = [xi*b.LOA, p[1]];
    if(ant){
      var dl = Math.hypot(cur[0]-ant[0], cur[1]-ant[1]);
      L += dl; mx += dl*(cur[0]+ant[0])/2; mz += dl*(cur[1]+ant[1])/2;
    }
    ant = cur;
  }
  return {L:L, x:L > 0 ? mx/L : 0, z:L > 0 ? mz/L : 0};
}

function geomReforcos(r){
  var b = ST.boat, g = {};
  [['lonFundo','fundo',r.lay.fundo],
   ['lonCostado','costado',r.lay.costado],
   ['lonConves','conves',r.lay.conves]].forEach(function(p){
    var lay = p[2], n = lay.nStiff, Lt = 0, mx = 0, mz = 0;
    for(var q=1;q<=n;q++){
      var t = trilhaLongitudinal(p[1], q/lay.n, 40);
      Lt += t.L; mx += t.L*t.x; mz += t.L*t.z;
    }
    g[p[0]] = {n:n*2, Ltot:Lt*2, x:Lt > 0 ? mx/Lt : 0, z:Lt > 0 ? mz/Lt : 0};
  });
  /* transversais: em cada baliza interna, nos dois bordos */
  var Lc = 0, mxc = 0, mzc = 0, Lh = 0, mxh = 0, mzh = 0, Lv = 0, mxv = 0, mzv = 0;
  for(var i=1;i<r.nF;i++){
    var x = r.frames[i], sc = sect(Math.min(1, x/b.LOA));
    Lc += 2*sc.gS; mxc += 2*sc.gS*x; mzc += 2*sc.gS*(sc.zch + sc.zsh)/2;
    Lh += 2*sc.gB; mxh += 2*sc.gB*x; mzh += 2*sc.gB*(sc.zk  + sc.zch)/2;
    Lv += 2*sc.gD; mxv += 2*sc.gD*x; mzv += 2*sc.gD*(sc.zsh + sc.zdc)/2;
  }
  var nInt = Math.max(0, r.nF - 1);
  g.caverna  = {n:nInt*2, Ltot:Lc, x:Lc > 0 ? mxc/Lc : 0, z:Lc > 0 ? mzc/Lc : 0};
  g.hastilha = {n:nInt,   Ltot:Lh, x:Lh > 0 ? mxh/Lh : 0, z:Lh > 0 ? mzh/Lh : 0};
  g.vau      = {n:nInt,   Ltot:Lv, x:Lv > 0 ? mxv/Lv : 0, z:Lv > 0 ? mzv/Lv : 0};
  /* prumos do espelho: verticais no plano inclinado da popa */
  var s0 = r.s0, rake = b.rake*Math.PI/180, hT = r.tr.h/1000, nP = Math.max(0, r.tr.nV - 1);
  var zmid = (s0.zk + s0.zsh)/2;
  g.espelho = {n:nP, Ltot:nP*hT, x:(zmid - s0.zk)*Math.tan(rake), z:zmid};
  return g;
}

/* =============================================== ANTEPARAS DE COLISÃO
   O Guia ABS de 1994 NÃO exige antepara de colisão: a palavra não aparece
   nas suas 57 páginas.  A posição vem da prática de classificação, e está
   dita como tal na tela.  O que o Guia dá, e o painel usa, é o dimensiona-
   mento: carga da Tabela 7.1 d), tensão de projeto da Tabela 7.2 na linha
   de antepara estanque, e módulo de seção por 8.1.3 com C = 619.         */
var ANT_BANDA = {v:[0.05, 0.15], r:[0.05, 0.12]};   /* fração de LOA, da ponta */

/* A meia-seção, da quilha à borda.  Quando o casco vem de uma TABELA DE
   COTAS, a baliza é uma polilinha inteira e é ela que vale; no envelope
   paramétrico do painel avulso só existem os três pontos notáveis.  As duas
   formas passam pelo mesmo código daqui para baixo.                       */
function antPontos(sc){
  return (sc.pts && sc.pts.length > 1)
    ? sc.pts
    : [[0, sc.zk], [sc.ych, sc.zch], [sc.ysh, sc.zsh]];
}

/* área e centro da seção cheia numa estação */
function secAnt(xi){
  var sc = sect(xi), P = antPontos(sc).slice();
  P.push([0, sc.zdc]);              /* fecha pelo convés na linha de centro */
  var A = 0, cy = 0, cz = 0, i;
  for(i=0;i<P.length;i++){
    var a = P[i], c = P[(i+1)%P.length], cr = a[0]*c[1] - c[0]*a[1];
    A += cr; cy += (a[0]+c[0])*cr; cz += (a[1]+c[1])*cr;
  }
  A = A/2;
  if(Math.abs(A) < 1e-12) return {A:0, z:sc.zk, y:0, sc:sc};
  return {A:Math.abs(A)*2, z:cz/(6*A), y:cy/(6*A), sc:sc};   /* A já das duas metades */
}

/* cota do casco numa meia-boca y da estação: anda pela meia-seção */
function antZbaixo(sc, y){
  var p = antPontos(sc), n = p.length - 1, q;
  if(y <= p[0][0]) return p[0][1];
  if(y >= p[n][0]) return p[n][1];
  for(q=0;q<n;q++){
    var y1 = p[q][0], y2 = p[q+1][0];
    var lo = Math.min(y1, y2), hi = Math.max(y1, y2);
    if(y >= lo - 1e-12 && y <= hi + 1e-12){
      var dy = y2 - y1;
      /* trecho vertical (costado a prumo): a cota mais baixa é a que vale */
      var t = Math.abs(dy) > 1e-12 ? (y - y1)/dy : 0;
      return p[q][1] + t*(p[q+1][1] - p[q][1]);
    }
  }
  return p[n][1];
}
function antZcima(sc, y){
  return sc.zdc + (sc.ysh > 1e-9 ? y/sc.ysh : 0)*(sc.zsh - sc.zdc);
}

/* tensão de projeto do chapeamento de antepara — Tabela 7.2.
   Só aço e alumínio mudam de linha: 0,75 do escoamento NÃO soldado.      */
function sigAntepara(MP){
  if((MP.mat === 'alu' || MP.mat === 'steel') && MP.yld)
    return {sig:0.75*MP.yld, base:MP.yld, muda:true,
            baseN:'escoamento não soldado',
            src:'ABS Tab. 7.2 · antepara estanque, 0,75 do escoamento não soldado'};
  return {sig:MP.sigA, base:MP.ult, muda:false,
          baseN:'a mesma base do casco', src:MP.srcA + ' · a mesma linha do casco'};
}

function umaAntepara(r, lado, xi){
  var b = ST.boat, MP = r.MP, sa = secAnt(xi), sc = sa.sc;
  var alt = sc.zdc - sc.zk;                    /* aresta inferior ao convés na LC */
  var head = Math.max(1.52, alt);              /* Tabela 7.1 d) */
  var sp = ST.sL;                              /* mesmo espaçamento do passo 4 */
  var largura = 2*sc.ysh*1000;
  var nPain = Math.max(1, Math.ceil(largura/sp)), sReal = largura/nPain;
  var nRef = nPain - 1;
  /* altura de cada prumo, e o comprimento total deles */
  var alturas = [], Lref = 0, mz = 0, q;
  for(q=1;q<=nRef;q++){
    var yy = Math.abs(-sc.ysh + sReal*q/1000);
    yy = Math.min(yy, sc.ysh);
    var h1 = antZbaixo(sc, yy), h2 = antZcima(sc, yy), hh = Math.max(0, h2 - h1);
    alturas.push(hh); Lref += hh; mz += hh*(h1 + h2)/2;
  }
  var hMax = alturas.length ? Math.max.apply(null, alturas) : alt;
  /* Chapeamento pela equação 7.1 com F = 1.  O Guia dá tabela de F para o
     casco (7.4) e para o convés (7.5) — não dá nenhuma para antepara.
     F = 1 é o lado seguro, e está dito na tela.                          */
  var SA = sigAntepara(MP);
  var sPan = Math.min(sReal, hMax*1000), lPan = Math.max(sReal, hMax*1000);
  var kk = kAsp(sPan, lPan);
  if(MP.mat === 'ply' || MP.mat === 'wood') kk = Math.max(kk, 0.5);
  var p = 0.01*head, tReqA, af = 1, eq;
  if(MP.mat === 'wood'){
    /* tabuado liso: a 7.5.1 nao usa o fator F — o fator de escala faz o
       papel da reducao por area, igual ao que o painel ja faz no casco.  */
    af = 1.09*Math.abs(4.2 - 1.13*Math.pow(Lscant(), 0.25));
    tReqA = af*sPan*Math.sqrt(0.001*head/(SA.sig/KGF));
    eq = '7.5.1';
  } else {
    tReqA = sPan*Math.sqrt(p*kk/SA.sig);
    eq = '7.1';
  }
  var tmin = null, gov = 'carga';
  if(MP.tminK){
    tmin = Math.max(sPan/MP.tminK, 2.5);
    if(tmin > tReqA){ tReqA = tmin; gov = 'mínimo'; }
  }
  /* a chapa reaproveitada é a do costado — mesma espessura do passo 5 */
  var tAdo = r.reg.costado.tAdo;
  var sigAt = (MP.mat === 'wood')
    ? 0.001*head*Math.pow(af*sPan, 2)/(tAdo*tAdo)*KGF
    : p*kk*Math.pow(sPan, 2)/(tAdo*tAdo);
  /* reforço: 8.1.3 com C = 619 e sem fator F (Tabela 8.1a, linha c) */
  var SMreq = 619 * head * (sReal/1000) * hMax * hMax / MP.sigInt;
  return {lado:lado, xi:xi, x:xi*b.LOA, sc:sc, area:sa.A, zc:sa.z, alt:alt,
          head:head, largura:largura, nPain:nPain, s:sReal, nRef:nRef,
          alturas:alturas, hMax:hMax, Lref:Lref, zRef:Lref > 0 ? mz/Lref : sa.z,
          tReq:tReqA, tmin:tmin, gov:gov, eq:eq, tAdo:tAdo, sigAt:sigAt, SA:SA, k:kk, p:p, af:af,
          passaChapa:tAdo >= tReqA - 1e-9, SMreq:SMreq};
}

function anteparas(r){
  var b = ST.boat, nInt = r.nF - 1;             /* as cavernas internas: 1 .. nF-1 */
  var out = {banda:ANT_BANDA, itens:[], nInt:nInt, nF:r.nF};
  if(nInt < 1){ out.semLugar = 'nenhuma'; return out; }

  /* Enquanto ninguém mexer no cursor, a antepara acompanha o cavernamento:
     fica na caverna mais perto do meio da faixa usual.  Depois de alguém
     mexer, a escolha é dessa pessoa e não se mexe mais sozinha.          */
  function padrao(faixa){
    return Math.min(nInt, Math.max(1, Math.round((faixa[0] + faixa[1])/2 * r.nF)));
  }
  if(ST.ant.v === null || !ST.ant.manV) ST.ant.v = padrao(ANT_BANDA.v);
  if(ST.ant.r === null || !ST.ant.manR) ST.ant.r = padrao(ANT_BANDA.r);

  /* O cursor para no terço do comprimento.  Mais para dentro que isso a parede
     deixa de ser antepara de colisão e vira divisória de compartimento, que é
     outro assunto — e sem o teto o curso útil do cursor viraria um punhado de
     posições espremidas numa ponta da trilha.                              */
  var teto = Math.min(nInt, Math.max(2, Math.floor(r.nF/3)));
  out.teto = teto;
  /* ST.ant guarda O QUE FOI PEDIDO, sem limite nenhum.  O que cabe de fato
     sai daqui limitado, em kV e kR.  Escrever o valor limitado por cima do
     pedido apagaria a escolha numa ida e volta do cursor de espaçamento —
     aperta as balizas, o teto cai, a escolha some; afrouxa de novo e ela
     não volta.  Por isso o pedido fica intacto.                          */
  var pedV = Math.max(1, Math.round(ST.ant.v));
  var pedR = Math.max(1, Math.round(ST.ant.r));
  out.pedV = pedV; out.pedR = pedR;
  var kV = Math.min(teto, pedV), kR = Math.min(teto, pedR);
  var poeV = !!ST.ant.onV, poeR = !!ST.ant.onR && nInt >= 2;
  if(ST.ant.onR && nInt < 2) out.semLugar = 're';

  /* As duas não podem cair na mesma caverna nem trocar de lado.  Em número
     de caverna: i_vante = nF − kV e i_ré = kR, e i_vante > i_ré exige
     kV + kR ≤ nF − 1.  Quem cede é a que NÃO acabou de ser movida.       */
  out.apertou = false;
  if(poeV && poeR && kV + kR > nInt){
    out.apertou = true;
    /* Cede a que NÃO acabou de ser movida.  Se ceder até 1 ainda não bastar,
       a que foi movida também recua — o piso de 1 não pode quebrar a
       invariante, ou as duas acabam na mesma caverna.                    */
    if(ST.ant.ultimo === 'r'){
      kV = nInt - kR;
      if(kV < 1){ kV = 1; kR = nInt - 1; }
    } else {
      kR = nInt - kV;
      if(kR < 1){ kR = 1; kV = nInt - 1; }
    }
    if(kV < 1 || kR < 1){                 /* menos de duas cavernas: só cabe uma */
      poeR = false; out.semLugar = 're';
      kV = Math.min(nInt, Math.max(1, kV));
      kR = Math.min(nInt, Math.max(1, kR));
    }
  }
  out.kV = kV; out.kR = kR;
  /* verdadeiro enquanto o pedido não couber — e não só na repintura em que
     ele deixou de caber, senão o aviso sumiria no quadro seguinte.       */
  out.limitou = (kV < pedV) || (kR < pedR);
  /* o teto de cada cursor: o terço do comprimento, e o que a outra deixa */
  out.maxV = Math.max(1, Math.min(teto, nInt - (poeR ? kR : 0)));
  out.maxR = Math.max(1, Math.min(teto, nInt - (poeV ? kV : 0)));

  function poe(lado, k, nome){
    var iF = (lado === 'v') ? r.nF - k : k;
    var a = umaAntepara(r, lado, r.frames[iF]/b.LOA);
    a.iF = iF; a.nCav = k;
    a.daPonta = (lado === 'v') ? 1 - a.xi : a.xi;
    a.dentro = a.daPonta >= ANT_BANDA[lado][0] - 1e-9 &&
               a.daPonta <= ANT_BANDA[lado][1] + 1e-9;
    a.nome = nome;
    out.itens.push(a); out[lado] = a;
  }
  if(poeV) poe('v', kV, 'Antepara de colisão de vante');
  if(poeR) poe('r', kR, 'Antepara de colisão de ré');
  return out;
}

/* ====================================================== PESOS E CENTROS
   Datum: x medido da popa de L_OA para vante; z da linha de base, que é o
   ponto mais baixo da quilha na popa.  y é zero por simetria.           */
function pesos(r){
  var b = ST.boat, MP = r.MP, geo = geomReforcos(r), linhas = [];

  /* --- chapeamento: a massa já vem do compute; falta o centro --- */
  function centroCasca(region){
    var At = 0, mx = 0, mz = 0, N = 40, i;
    for(i=0;i<N;i++){
      var xa = i/N, xb = (i+1)/N, sa = sect(xa), sb = sect(xb);
      var gm = region === 'fundo' ? (sa.gB + sb.gB)/2
             : region === 'costado' ? (sa.gS + sb.gS)/2 : (sa.gD + sb.gD)/2;
      var dA = gm*(b.LOA/N)*2;
      var pa = girthPt(sa, region, 0.5), pb = girthPt(sb, region, 0.5);
      At += dA; mx += dA*(xa + xb)/2*b.LOA; mz += dA*(pa[1] + pb[1])/2;
    }
    return {x:At > 0 ? mx/At : 0, z:At > 0 ? mz/At : 0};
  }
  var s0 = r.s0, zT = (s0.zk + s0.zsh)/2;
  var cP = {fundo:centroCasca('fundo'), costado:centroCasca('costado'),
            conves:centroCasca('conves'),
            espelho:{x:(zT - s0.zk)*Math.tan(b.rake*Math.PI/180), z:zT}};
  r.ORD.forEach(function(k){
    linhas.push({g:'chapa', it:'Chapeamento do ' + nomeReg(k).toLowerCase(),
      q:fmt(r.area[k],1) + ' m²', un:fmt(r.reg[k].tAdo,1) + ' mm',
      m:r.massa[k], x:cP[k].x, z:cP[k].z});
  });

  /* --- reforços: cada família com o perfil escolhido no passo 6 --- */
  r.stiff.forEach(function(row){
    if(!row.exists || !row.key) return;
    var g = geo[row.key], pf = r.perf[row.key];
    if(!g || !pf || g.Ltot <= 0 || g.n <= 0) return;
    linhas.push({g:'ref', it:row.name,
      q:fmt(g.n,0) + ' × ' + fmt(g.Ltot/g.n,2) + ' m', un:fmt(pf.esc.kgm,2) + ' kg/m',
      m:g.Ltot*pf.esc.kgm, x:g.x, z:g.z, det:pf.esc.desc});
  });

  /* --- anteparas: chapa e prumos --- */
  (r.ant ? r.ant.itens : []).forEach(function(a){
    linhas.push({g:'ant', it:a.nome + ' · chapa', q:fmt(a.area,2) + ' m²',
      un:fmt(a.tAdo,1) + ' mm', m:a.area*(a.tAdo/1000)*r.dens, x:a.x, z:a.zc});
    var pfC = r.perf.caverna;
    if(pfC && a.Lref > 0)
      /* a altura MEDIA, e nao a do mais alto: assim contagem x unitario fecha
         com a massa.  A altura do mais alto e o que dimensiona, e essa fica
         na tabela do passo 7.                                             */
      linhas.push({g:'ant', it:a.nome + ' · prumos',
        q:fmt(a.nRef,0) + ' × ' + fmt(a.Lref/a.nRef,2) + ' m', un:fmt(pfC.esc.kgm,2) + ' kg/m',
        m:a.Lref*pfC.esc.kgm, x:a.x, z:a.zRef, det:pfC.esc.desc});
  });

  var M = 0, mx = 0, mz = 0, grupos = {};
  linhas.forEach(function(l){
    M += l.m; mx += l.m*l.x; mz += l.m*l.z;
    grupos[l.g] = (grupos[l.g] || 0) + l.m;
  });
  return {linhas:linhas, grupos:grupos, geo:geo,
          tot:{m:M, x:M > 0 ? mx/M : 0, z:M > 0 ? mz/M : 0},
          fracDisp:b.disp > 0 ? M/(b.disp*1000) : null};
}

/* ------------------------------------------------- tudo junto, uma chamada */
function estrutura(r){
  if(!r) return r;
  r.perf = perfilTodos(r);
  r.ant  = anteparas(r);
  r.pes  = pesos(r);
  return r;
}
function computeE(){ return estrutura(compute()); }
