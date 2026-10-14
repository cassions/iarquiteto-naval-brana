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

    /* plano lateral: casco + patilhao + leme (+ skeg), sem contar duas vezes */
    var soma = H.Alat + K.area + APP.rudder.area + (APP.skeg ? APP.skeg.area : 0);
    ok(Math.abs(APP.latTotal - soma) < 1e-6, pre + 'plano lateral ' + f(APP.latTotal) + ' != soma das partes ' + f(soma));

    /* regra dura e leme dentro d'agua */
    ok(APP.rudder.tipZ >= K.tipZ - 1e-9, pre + 'LEME MAIS FUNDO QUE A QUILHA');
    var zTopo = APP.rudder.tipZ + APP.rudder.span*Math.cos(ST.rudRake*Math.PI/180);
    ok(zTopo <= H.zw + 1e-6, pre + 'o leme comeca acima da linha d agua');
    ok(isFinite(BAL.leadPct) && isFinite(BAL.bal.GM), pre + 'equilibrio nao fechou');
  });

  /* ------------------------------------------------ leme: razao de aspecto --- */
  ['spade','skeg','transom'].forEach(function(rt){
    ST.keel = 'fin'; ST.rud = rt; ST.patDepth = 0;
    delete ST.touched.rudAR; delete ST.touched.cr;
    recompute();
    var areaBase = APP.rudder.area, spanAnt = -1;
    [1.0, 2.0, 3.0, 4.5].forEach(function(ar){
      ST.rudAR = ar; ST.touched.rudAR = 1;
      recompute();
      var R = APP.rudder, pre = nome + ' / leme ' + rt + ' AR ' + ar + ': ';
      ok(Math.abs(R.area - areaBase) < 1e-3*Math.max(1,areaBase) + 1e-4,
         pre + 'a area mudou com a razao de aspecto (' + f(R.area) + ' contra ' + f(areaBase) + ')');
      ok(R.span > spanAnt - 1e-9, pre + 'envergadura encolheu ao pedir mais AR');
      spanAnt = R.span;
      ok(R.cortado ? R.ar < ar + 1e-6 : Math.abs(R.ar - ar) < 1e-6, pre + 'AR real ' + f(R.ar,2) + ' nao bate');
      ok(R.tipZ >= APP.keel.tipZ - 1e-9, pre + 'LEME MAIS FUNDO QUE A QUILHA');
      ok(R.area > 1e-6 && isFinite(R.cRoot) && R.cRoot > 0, pre + 'pa degenerada');
    });
  });

  /* ------------------------------------- troca de tipo de quilha ida e volta --- */
  ['fin','center','dagger','full','fin'].forEach(function(kt){
    ST.keel = kt; delete ST.touched.ck; delete ST.touched.keelDraftF;
    recompute();
    var pre = nome + ' / quilha ' + kt + ': ';
    ok(isFinite(APP.latTotal) && APP.latTotal > 0, pre + 'plano lateral invalido');
    ok(isFinite(APP.draftTotal) && APP.draftTotal > 0, pre + 'calado invalido');
    ok(APP.rudder.tipZ >= APP.keel.tipZ - 1e-9, pre + 'LEME MAIS FUNDO QUE A QUILHA');
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
