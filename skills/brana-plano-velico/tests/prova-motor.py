# -*- coding: utf-8 -*-
"""Prova do motor da versao 2: patilhao desenhado, leme e regra dura."""
import io, os, re, subprocess, sys, tempfile

PAINEL = sys.argv[1]

DRIVER = r"""
var document = { readyState:'loading', addEventListener:function(){},
                 getElementById:function(){ return null; },
                 querySelectorAll:function(){ return []; },
                 createElement:function(){ return { style:{}, appendChild:function(){},
                                                    setAttribute:function(){} }; },
                 documentElement:{}, body:{ appendChild:function(){}, removeChild:function(){} } };
var window = { addEventListener:function(){}, devicePixelRatio:1 };
function getComputedStyle(){ return { getPropertyValue:function(){ return ''; } }; }
__PAINEL__

var falhas = [], provas = 0;
function ok(cond, msg){ provas++; if(!cond) falhas.push(msg); }
function f(v,n){ return (Math.round(v*Math.pow(10,n||3))/Math.pow(10,n||3)); }

function carrega(tsv){
  HULL = makeHull(parseOffsets(tsv));
  buildCache(HULL, 200, 26);
  TSV_ATUAL = tsv;
  ST.touched = {};
  ST.zw = null; ST.SA = null; ST.ck = null; ST.cr = null;
  ST.keelDraftF = null; ST.rudAR = null; ST.patDepth = 0;
  ST.ballast = false;
  defaultsForHull();
}

var CASCOS = [['projeto', USER_TSV], ['patilhao 7,2 m', DEMO_FULL], ['barbatana 9 m', DEMO_FIN]];

CASCOS.forEach(function(par){
  var nome = par[0];
  carrega(par[1]);

  /* ---------------------------------------------- patilhao: area e perfil --- */
  ST.keel = 'full'; ST.rud = 'skeg';
  var areaAnt = -1, calAnt = -1;
  [0, 0.05, 0.2, 0.5, 1.0].forEach(function(dep){
    ST.patDepth = dep; ST.touched.patDepth = 1;
    delete ST.touched.rudAR; ST.rudAR = null;      /* aqui se prova a PROPOSTA do painel */
    recompute();
    var K = APP.keel, pre = nome + ' / patilhao ' + dep + ' m: ';

    ok(K.patilhao === true && K.embedded === false, pre + 'devia ser patilhao desenhado');
    ok(K.poly && K.poly.length > 8, pre + 'sem poligono');
    ok(isFinite(K.area) && K.area >= 0, pre + 'area invalida ' + K.area);
    ok(K.area > areaAnt - 1e-9, pre + 'area encolheu ao aprofundar (' + f(K.area) + ' < ' + f(areaAnt) + ')');
    areaAnt = K.area;

    /* profundidade medida da linha de base para baixo */
    var zBase = HC.zMin/1000;
    ok(Math.abs(K.zFloor - (zBase - dep)) < 1e-9, pre + 'fundo fora da profundidade pedida');
    ok(Math.abs(APP.draftTotal - (H.T + dep)) < 1e-6 || APP.rudder.tipZ < K.tipZ,
       pre + 'calado total ' + f(APP.draftTotal) + ' != calado do casco + profundidade ' + f(H.T+dep));
    ok(APP.draftTotal > calAnt - 1e-9, pre + 'calado total encolheu');
    calAnt = APP.draftTotal;

    /* so conta o que esta ABAIXO da linha de quilha do casco */
    var n = K.poly.length/2, i, acimaDaQuilha = 0, fundoMin = 1e9, areaInt = 0;
    for(i=0;i<n;i++){
      var pt = K.poly[i], pb = K.poly[K.poly.length-1-i];
      if(Math.abs(pt[0]-pb[0]) > 1e-9) acimaDaQuilha = -1;         /* pares desalinhados */
      if(pb[1] > Math.min(zKeel(pb[0]), H.zw) + 1e-9) acimaDaQuilha++;
      if(pt[1] > H.zw + 1e-9) acimaDaQuilha++;
      if(pb[1] < fundoMin) fundoMin = pb[1];
      if(i>0){
        var qt = K.poly[i-1], qb = K.poly[K.poly.length-i];
        areaInt += 0.5*((pt[1]-pb[1]) + (qt[1]-qb[1]))*Math.abs(pt[0]-qt[0]);
      }
    }
    ok(acimaDaQuilha === 0, pre + 'o fundo do patilhao subiu acima da linha de quilha em ' + acimaDaQuilha + ' pontos');
    ok(Math.abs(fundoMin - K.zFloor) < 1e-9, pre + 'ponto mais baixo ' + f(fundoMin) + ' != fundo ' + f(K.zFloor));
    ok(Math.abs(areaInt - K.area) < 1e-6*Math.max(1,K.area) + 1e-6,
       pre + 'area do poligono ' + f(K.area) + ' != integral do perfil ' + f(areaInt));

    /* comeca na proa e termina no final do espelho */
    var xa = HC.x0/1000, xb = HC.x1/1000;
    var proaT = K.poly[n-1], proaB = K.poly[n];
    var popaT = K.poly[0], popaB = K.poly[K.poly.length-1];
    ok(Math.abs(proaT[0]-xb) < 1e-9 && Math.abs(proaB[0]-xb) < 1e-9, pre + 'o perfil nao chega a proa');
    ok(Math.abs(proaT[1]-proaB[1]) < 1e-6, pre + 'na proa o patilhao devia fechar na quilha');
    ok(Math.abs(K.fundo[K.fundo.length-1][1] - zKeel(xb)) < 1e-9, pre + 'o perfil nao sai da linha de quilha na proa');
    ok(Math.abs(popaT[0]-xa) < 1e-9 && Math.abs(popaB[0]-xa) < 1e-9, pre + 'o perfil nao termina no espelho');
    ok(Math.abs(popaB[1] - K.zFloor) < 1e-9, pre + 'no espelho o fundo devia estar na profundidade cheia');

    /* tangencia na proa: a primeira descida acompanha a inclinacao da quilha */
    var p1 = K.fundo[K.fundo.length-1], p2 = K.fundo[K.fundo.length-2];   /* perfil do fundo, da proa para re */
    var dxp = p1[0]-p2[0];
    if(dxp > 1e-9 && dep + (zKeel(xb)-HC.zMin/1000) > 0.05){
      var sFundo = (p1[1]-p2[1])/dxp, sQuilha = (zKeel(p1[0])-zKeel(p2[0]))/dxp;
      ok(sQuilha <= 1e-9 || sFundo/sQuilha > 0.55,
         pre + 'o fundo nao sai tangente na proa (perfil ' + f(sFundo,2) + ' contra quilha ' + f(sQuilha,2) + ')');
    }

    /* plano lateral: casco + patilhao + leme (+ skeg) MENOS o que o patilhao ja contava */
    var soma = H.Alat + K.area + APP.rudder.area + (APP.skeg ? APP.skeg.area : 0) - APP.sobreposto;
    ok(Math.abs(APP.latTotal - soma) < 1e-6, pre + 'plano lateral ' + f(APP.latTotal) + ' != soma das partes ' + f(soma));
    ok(APP.sobreposto > 1e-9, pre + 'com patilhao o leme cai dentro do perfil: a area comum devia ser descontada');
    ok(APP.sobreposto < APP.rudder.area + (APP.skeg ? APP.skeg.area : 0) + 1e-9,
       pre + 'area comum maior que os apendices que a geraram');
    ok(APP.latTotal > H.Alat - 1e-9, pre + 'plano lateral menor que o do casco');

    /* a PROPOSTA do painel obedece a regra, ou cai no piso de AR avisando */
    ok(APP.rudder.tipZ >= K.tipZ - 1e-9 || APP.rudder.ar <= 0.8 + 1e-9,
       pre + 'a proposta passou da quilha sem estar no piso de AR');
    ok(!APP.rudder.passou || APP.rudder.excesso > 0,
       pre + 'aviso de passar da quilha sem excesso medido');
    var zTopo = APP.rudder.tipZ + APP.rudder.span*Math.cos(ST.rudRake*Math.PI/180);
    ok(zTopo <= H.zw + 1e-6, pre + 'o leme comeca acima da linha d agua');
    ok(isFinite(BAL.leadPct) && isFinite(BAL.bal.GM), pre + 'equilibrio nao fechou');
  });

  /* ------------------------------------------------ leme: razao de aspecto --- */
  /* O cursor tem de mandar no DESENHO em qualquer quilha, inclusive patilhao raso,
     que e onde o clamp antigo o matava. A area e fixa: o que a envergadura ganha,
     a corda perde. */
  [['fin', 0], ['center', 0], ['full', 0], ['full', 0.30], ['full', 1.0]].forEach(function(kc){
    ['spade','skeg','transom'].forEach(function(rt){
      ST.keel = kc[0]; ST.patDepth = kc[1]; ST.rud = rt;
      delete ST.touched.rudAR; delete ST.touched.cr; delete ST.touched.ck; delete ST.touched.keelDraftF;
      recompute();
      var tag = nome + ' / ' + kc[0] + (kc[0] === 'full' ? ' dep ' + kc[1] : '') + ' / leme ' + rt;

      /* --- a PROPOSTA do painel obedece a regra, ou avisa que nao coube --- */
      var R0 = APP.rudder, pre0 = tag + ' (proposta): ';
      ok(R0.ajustada ? true : Math.abs(R0.ar - RUD[rt].ar) < 1e-6,
         pre0 + 'sem ajuste a AR devia ser a tipica do tipo (' + f(R0.ar,2) + ' contra ' + RUD[rt].ar + ')');
      ok(!R0.passou || R0.ar <= 0.8 + 1e-9,
         pre0 + 'a proposta passou da quilha sem estar no piso de AR (' + f(R0.ar,2) + ')');
      ok(R0.ar >= 0.79, pre0 + 'proposta com AR degenerada ' + f(R0.ar,2));
      ok(R0.span > 0.02 && R0.cRoot > 0.01, pre0 + 'pa degenerada: span ' + f(R0.span) + ' corda ' + f(R0.cRoot));

      /* --- com o cursor na mao do aluno, o desenho TEM de mudar --- */
      var areaBase = APP.rudder.area, spanAnt = -1, polyAnt = null;
      [0.5, 1.0, 2.0, 3.0, 4.5, 6.0].forEach(function(ar){
        ST.rudAR = ar; ST.touched.rudAR = 1;
        recompute();
        var R = APP.rudder, pre = tag + ' AR ' + ar + ': ';

        ok(Math.abs(R.ar - ar) < 1e-6, pre + 'AR pedida nao e a desenhada: ' + f(R.ar,3));
        ok(Math.abs(R.area - areaBase) < 1e-3*Math.max(1, areaBase) + 1e-4,
           pre + 'a area mudou com a razao de aspecto (' + f(R.area) + ' contra ' + f(areaBase) + ')');
        ok(R.span > spanAnt + 1e-6, pre + 'ENVERGADURA NAO CRESCEU com a AR (' + f(R.span) + ' apos ' + f(spanAnt) + ')');
        spanAnt = R.span;

        /* o poligono desenhado acompanha: extensao vertical = span x cos(rake) */
        var zlo = 1e9, zhi = -1e9;
        R.poly.forEach(function(p){ if(p[1] < zlo) zlo = p[1]; if(p[1] > zhi) zhi = p[1]; });
        ok(Math.abs((zhi - zlo) - R.span*Math.cos(ST.rudRake*Math.PI/180)) < 1e-6,
           pre + 'o poligono nao tem a altura da envergadura');
        if(polyAnt) ok(Math.abs((zhi - zlo) - polyAnt) > 1e-6, pre + 'o DESENHO nao mudou com a AR');
        polyAnt = zhi - zlo;

        /* a area do poligono continua sendo a area pedida */
        ok(Math.abs(polyArea(R.poly) - ST.cr*H.Alat) < 1e-6 + 1e-3*R.area,
           pre + 'area do poligono ' + f(polyArea(R.poly)) + ' != pedida ' + f(ST.cr*H.Alat));

        /* o aviso e honesto e quantificado */
        var passouDeFato = R.tipZ < APP.keel.tipZ - 0.005;
        ok(R.passou === passouDeFato, pre + 'o aviso de passar da quilha nao bate com a geometria');
        if(R.passou) ok(Math.abs(R.excesso - (APP.keel.tipZ - R.tipZ)) < 2e-3,
           pre + 'excesso ' + f(R.excesso) + ' != ' + f(APP.keel.tipZ - R.tipZ));

        /* calado total = o mais fundo dos dois, e a leitura da quilha e so dela */
        ok(Math.abs(APP.draftTotal - Math.max(APP.keel.draft || 0, R.draft)) < 2e-3,
           pre + 'calado total ' + f(APP.draftTotal) + ' nao e o mais fundo dos dois');
        ok(Math.abs(APP.draftKeel - (H.zw - APP.keel.tipZ)) < 1e-6, pre + 'calado da quilha errado');

        /* o skeg e estrutura: o nariz dele nao passa da quilha */
        if(APP.skeg){
          var zn = 1e9; APP.skeg.poly.forEach(function(p){ if(p[1] < zn) zn = p[1]; });
          ok(zn >= APP.keel.tipZ - 1e-6, pre + 'o nariz do skeg passou da ponta da quilha');
        }

        /* plano lateral: soma das partes menos o que o patilhao ja contava */
        var soma = H.Alat + (APP.keel.area || 0) + R.area + (APP.skeg ? APP.skeg.area : 0) - (APP.sobreposto || 0);
        ok(Math.abs(APP.latTotal - soma) < 1e-6, pre + 'plano lateral ' + f(APP.latTotal) + ' != soma ' + f(soma));
        ok((APP.sobreposto || 0) >= -1e-9, pre + 'sobreposicao negativa');
        if(!APP.keel.patilhao) ok(Math.abs(APP.sobreposto || 0) < 1e-9, pre + 'sobreposicao fora do patilhao');
        ok(APP.latTotal > H.Alat - 1e-9, pre + 'plano lateral menor que o do casco');
        ok(isFinite(BAL.leadPct) && isFinite(BAL.bal.GM), pre + 'equilibrio nao fechou');
      });
    });
  });

  /* ------------------------------------- troca de tipo de quilha ida e volta --- */
  ['fin','center','dagger','full','fin'].forEach(function(kt){
    ST.keel = kt; delete ST.touched.ck; delete ST.touched.keelDraftF;
    delete ST.touched.rudAR; ST.rudAR = null;      /* de novo, a proposta do painel */
    ST.patDepth = 0;
    recompute();
    var pre = nome + ' / quilha ' + kt + ': ';
    ok(isFinite(APP.latTotal) && APP.latTotal > 0, pre + 'plano lateral invalido');
    ok(isFinite(APP.draftTotal) && APP.draftTotal > 0, pre + 'calado invalido');
    ok(APP.rudder.tipZ >= APP.keel.tipZ - 1e-9 || APP.rudder.ar <= 0.8 + 1e-9,
       pre + 'a proposta passou da quilha sem estar no piso de AR');
    ok(APP.keel.area >= 0, pre + 'area de quilha negativa');
    ok(isFinite(BAL.bal.KG) && isFinite(GZC.stats.vanish), pre + 'estabilidade nao fechou');
  });
});

/* -------------------------------- numeros de mostruario, para olho humano --- */
var mostra = [];
carrega(USER_TSV);
ST.keel = 'full'; ST.rud = 'skeg';
[0, 0.25, 0.60].forEach(function(dep){
  ST.patDepth = dep; ST.touched.patDepth = 1; recompute();
  mostra.push('  patilhao ' + dep.toFixed(2) + ' m -> area ' + f(APP.keel.area) +
              ' m2 | plano lateral ' + f(APP.latTotal) + ' m2 | calado total ' + f(APP.draftTotal,2) +
              ' m | leme ' + f(APP.rudder.area) + ' m2 AR ' + f(APP.rudder.ar,2) +
              (APP.rudder.cortado ? ' (cortado)' : '') + ' | lead ' + f(BAL.leadPct,1) + '%');
});

console.log('@@OUT@@' + JSON.stringify({ provas:provas, falhas:falhas, mostra:mostra }));
"""

html = io.open(PAINEL, encoding='utf-8').read()
blocos = re.findall(r'<script>(.*?)</script>', html, re.S)
js = DRIVER.replace('__PAINEL__', '\n'.join(blocos))
d = tempfile.mkdtemp(prefix='provav2-')
f = os.path.join(d, 'prova.js')
io.open(f, 'w', encoding='utf-8').write(js)

chk = subprocess.run(['node', '--check', f], capture_output=True)
if chk.returncode:
    print('SINTAXE:', (chk.stderr or b'').decode('utf-8', 'replace')[:800])
    raise SystemExit(1)

p = subprocess.run(['node', f], capture_output=True, timeout=600)
out = (p.stdout or b'').decode('utf-8', 'replace')
err = (p.stderr or b'').decode('utf-8', 'replace')
linha = [l for l in out.splitlines() if l.startswith('@@OUT@@')]
if not linha:
    print('nao rodou:', err[-2000:] or out[-2000:])
    raise SystemExit(1)
import json
r = json.loads(linha[0][len('@@OUT@@'):])
print('provas: %d   falhas: %d' % (r['provas'], len(r['falhas'])))
for m in r['falhas'][:40]:
    print('  X ' + m)
print('\ncasco do projeto, patilhao + skeg:')
for m in r['mostra']:
    print(m)
raise SystemExit(1 if r['falhas'] else 0)
