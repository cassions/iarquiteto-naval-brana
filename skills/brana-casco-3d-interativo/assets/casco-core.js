// ============================================================================
// Casco a partir da tabela de cotas — nucleo geometrico.
//
// Diferenca central em relacao a versao anterior: a baliza nao e mais uma
// poligonal quilha-chine-borda. Ela e uma curva generica y(z) definida por
// meias-bocas tabeladas em alturas relativas do pontal, o que cobre os dois
// casos que interessam:
//
//   redondo  as meias-bocas intermediarias sao interpoladas por cubica monotona,
//            dando bojo curvo sem canto;
//   quinado  a meia-boca do chine entra como no exato e a interpolacao e linear,
//            preservando o canto vivo.
//
// Como z cresce monotonicamente da quilha a borda nos dois casos, a linha de agua
// corta a baliza uma unica vez e a area imersa e a integral de y dz — exata sobre
// a poligonal, sem varredura.
// ============================================================================
'use strict';

/* Tabela do casco redondo do croqui Brana: 6 balizas, comprimento 6,000 m. */
var DEFAULT_TSV = [
  '# Plano de linhas, casco redondo — tabela de cotas',
  '# Comprimento total 6,000 m   1 quadrado da malha = 300,00 mm',
  '# meias-bocas a partir da linha de centro, alturas acima da linha de base (ponto mais baixo da quilha), em milimetros',
  'baliza\tx\taltura_quilha\taltura_borda\tmb_25pc\tmb_50pc\tmb_75pc\tmeia_boca_borda',
  '1\t0\t283.5\t890.7\t533.4\t678.0\t744.6\t762.6',
  '2\t1200\t69.1\t948.5\t708.3\t888.2\t967.8\t987.8',
  '3\t2400\t0.0\t1009.8\t760.1\t941.3\t1018.4\t1036.5',
  '4\t3600\t29.3\t1073.2\t612.1\t787.3\t870.8\t894.7',
  '5\t4800\t346.6\t1137.6\t305.7\t434.8\t512.4\t545.5',
  '6\t6000\t1203.3\t1203.3\t0.0\t0.0\t0.0\t0.0'
].join('\n');

/* Tabela do casco quinado, com as meias-bocas do chine re-alisadas em planta.
   Mesmo barco da versao anterior: borda, altura de chine e quilha inalteradas —
   so a linha do chine em planta mudou, e o deadrise a acompanha. */
var CHINE_TSV = [
  '# Plano de linhas alisado — tabela de cotas (casco quinado)',
  '# Comprimento total 6,000 m   1 quadrado da malha = 428,57 mm',
  '# meias-bocas a partir da linha de centro, alturas acima da linha de base (ponto mais baixo da quilha), em milimetros',
  'stn\tx\tsheer_hb\tchine_hb\tsheer_ht\tchine_ht\tkeel_ht\tdeadrise_deg',
  '1\t0\t724.3\t579.4\t784.7\t390.0\t34.7\t31.52',
  '2\t857\t952.6\t741.2\t812.9\t394.7\t0.3\t28.02',
  '3\t1714\t1006.0\t766.9\t835.8\t405.2\t4.4\t27.59',
  '4\t2571\t979.5\t745.3\t853.7\t421.3\t19.9\t28.30',
  '5\t3429\t870.4\t656.0\t868.2\t448.3\t55.5\t30.92',
  '6\t4286\t682.2\t500.8\t880.7\t492.1\t159.5\t33.59',
  '7\t5143\t394.2\t283.1\t891.3\t596.7\t356.7\t40.30',
  '8\t6000\t0.0\t0.0\t900.0\t900.0\t900.0\t0.00'
].join('\n');

/* ------------------------------------------------------------------ leitura --
   Aceita as duas tabelas. O cabecalho decide o formato; sem cabecalho vale a
   heuristica: no formato redondo a coluna 3 e altura de quilha (menor que a
   altura de borda, coluna 4) e as meias-bocas crescem da quilha para a borda;
   no quinado a coluna 3 e a meia-boca da borda, maior que a do chine. */
function detectFormat(headerFields, firstRow){
  var h = (headerFields || []).join(' ').toLowerCase();
  if(/altura_quilha|altura de quilha|mb_|meia_boca|meia-boca|baliza/.test(h)) return 'redondo';
  if(/sheer_hb|chine_hb|keel_ht|deadrise/.test(h)) return 'quinado';
  if(!firstRow) return 'redondo';
  var c = firstRow;
  var risingBreadths = c.length >= 8 && c[4] <= c[5] + 1e-6 && c[5] <= c[6] + 1e-6 && c[6] <= c[7] + 1e-6;
  if(c[2] < c[3] && risingBreadths) return 'redondo';
  if(c[2] > c[3]) return 'quinado';
  return 'redondo';
}

/* Qual sinal separa os decimais nesta tabela? "283,5" e virgula decimal; "1,714" e
   virgula de milhar. Ler um pelo outro nao gera erro — gera um casco errado em
   silencio, entao vale decidir olhando a tabela inteira, que nao mistura convencoes.
   Um separador seguido de 1, 2 ou 4+ digitos no fim do numero so pode ser decimal;
   grupos de exatamente 3 digitos sao ambiguos e ficam para o desempate. */
function detectDecimalSep(tokens){
  var virgDec = false, pontoDec = false, i, t;
  for(i=0;i<tokens.length;i++){
    t = tokens[i];
    if(t.indexOf(',') >= 0 && t.indexOf('.') >= 0) continue;      /* os dois: resolve por token */
    if(/,\d{1,2}$/.test(t) || /,\d{4,}$/.test(t)) virgDec = true;
    if(/\.\d{1,2}$/.test(t) || /\.\d{4,}$/.test(t)) pontoDec = true;
  }
  if(virgDec && !pontoDec) return ',';
  if(pontoDec && !virgDec) return '.';
  return null;                                                     /* ambiguo */
}
function paraNumero(s, dec){
  s = String(s).trim();
  var temV = s.indexOf(',') >= 0, temP = s.indexOf('.') >= 0;
  if(temV && temP){
    /* os dois presentes: o ultimo a aparecer e o decimal */
    var decSep = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
    var milhar = decSep === ',' ? '.' : ',';
    s = s.split(milhar).join('').replace(decSep, '.');
  } else if(temV){
    if(dec === ',')      s = s.replace(',', '.');
    else if(dec === '.') s = s.split(',').join('');
    else                 s = /,\d{3}$/.test(s) ? s.split(',').join('') : s.replace(',', '.');
  }
  return parseFloat(s);
}

function parseOffsets(text){
  var lines = String(text).split(/\r?\n/), bruto = [], header = null, num = [], i, j;
  for(i=0;i<lines.length;i++){
    var ln = lines[i].trim();
    if(!ln || ln.charAt(0) === '#') continue;
    var f = ln.split(/\s+/).filter(function(s){ return s.length; });
    if(f.length < 5) continue;
    bruto.push(f);
  }
  /* decide o separador com todos os campos em maos, antes de converter qualquer um */
  var todos = [];
  bruto.forEach(function(f){ f.forEach(function(c){ if(/^[-+]?[\d.,]+$/.test(c)) todos.push(c); }); });
  var dec = detectDecimalSep(todos);

  for(i=0;i<bruto.length;i++){
    var v = bruto[i].map(function(s){ return paraNumero(s, dec); });
    var numeric = isFinite(v[1]) && isFinite(v[2]) && isFinite(v[3]);
    if(!numeric){ if(!header) header = bruto[i]; continue; }        /* linha de cabecalho */
    num.push(v);
  }
  if(num.length < 3) throw new Error('sao necessarias ao menos 3 balizas; encontrei ' + num.length);

  var mode = detectFormat(header, num[0]);
  var rows = [], warn = [];

  if(mode === 'quinado'){
    num.forEach(function(v){
      if(v.length < 7) throw new Error('formato quinado pede 7 colunas; a baliza ' + v[0] + ' tem ' + v.length);
      rows.push({ stn:v[0], x:v[1], zk:v[6], zs:v[4], ys:v[2],
                  zc:v[5], yc:v[3], levels:null });
    });
  } else {
    var nCols = num[0].length;
    if(nCols < 5) throw new Error('formato redondo pede ao menos 5 colunas');
    var nMid = nCols - 5;                       /* baliza, x, zk, zs, ...meios..., ys */
    num.forEach(function(v){
      if(v.length !== nCols)
        throw new Error('a baliza ' + v[0] + ' tem ' + v.length + ' colunas, as outras tem ' + nCols);
      var mids = [];
      for(var k=0;k<nMid;k++) mids.push(v[4+k]);
      rows.push({ stn:v[0], x:v[1], zk:v[2], zs:v[3], ys:v[4+nMid], mids:mids });
    });
  }

  rows.sort(function(a,b){ return a.x - b.x; });
  for(j=1;j<rows.length;j++)
    if(rows[j].x - rows[j-1].x < 1e-9) throw new Error('duas balizas na mesma posicao x = ' + rows[j].x);

  rows.forEach(function(r){
    ['zk','zs','ys'].forEach(function(k){
      if(!isFinite(r[k])) throw new Error('valor nao numerico em ' + k + ' na baliza ' + r.stn);
    });
    if(r.zk > r.zs + 1e-6) warn.push('baliza ' + r.stn + ': quilha acima da borda');
    if(r.ys < -1e-6) warn.push('baliza ' + r.stn + ': meia-boca negativa');
    if(mode === 'quinado'){
      if(r.yc > r.ys + 1e-6) warn.push('baliza ' + r.stn + ': chine fora da borda');
      if(r.zk > r.zc + 1e-6) warn.push('baliza ' + r.stn + ': quilha acima do chine');
      if(r.zc > r.zs + 1e-6) warn.push('baliza ' + r.stn + ': chine acima da borda');
    } else {
      for(var k=0;k<r.mids.length;k++){
        if(!isFinite(r.mids[k])) throw new Error('meia-boca nao numerica na baliza ' + r.stn);
        if(r.mids[k] < -1e-6) warn.push('baliza ' + r.stn + ': meia-boca negativa');
      }
    }
  });
  return { rows: rows, warn: warn, mode: mode, nMid: mode === 'redondo' ? rows[0].mids.length : 1 };
}

/* --------------------------------------------------------- interpolacao --
   Cubica monotona de Fritsch-Carlson. Uma spline natural passando por estas
   balizas estoura onde as meias-bocas fecham na proa e devolve boca negativa;
   a forma monotona nao pode estourar, entao o casco continua sendo casco. */
function pchip(xs, ys){
  var n = xs.length, i, h = [], d = [];
  for(i=0;i<n-1;i++){ h[i] = xs[i+1]-xs[i]; d[i] = (ys[i+1]-ys[i])/h[i]; }
  function endSlope(h0, h1, d0, d1){
    var s = ((2*h0 + h1)*d0 - h0*d1) / (h0 + h1);
    if(s*d0 <= 0) return 0;
    if(d0*d1 <= 0 && Math.abs(s) > Math.abs(3*d0)) return 3*d0;
    return s;
  }
  var m = new Array(n);
  if(n === 2){ m[0] = m[1] = d[0]; }
  else {
    for(i=1;i<n-1;i++){
      if(d[i-1]*d[i] <= 0) m[i] = 0;
      else {
        var w1 = 2*h[i] + h[i-1], w2 = h[i] + 2*h[i-1];
        m[i] = (w1 + w2) / (w1/d[i-1] + w2/d[i]);
      }
    }
    m[0]   = endSlope(h[0], h[1], d[0], d[1]);
    m[n-1] = endSlope(h[n-2], h[n-3], d[n-2], d[n-3]);
  }
  return function(x){
    if(x <= xs[0]) return ys[0];
    if(x >= xs[n-1]) return ys[n-1];
    var lo = 0, hi = n-1, mid;
    while(hi - lo > 1){ mid = (lo+hi) >> 1; if(xs[mid] <= x) lo = mid; else hi = mid; }
    var t = (x - xs[lo]) / h[lo], t2 = t*t, t3 = t2*t;
    return (2*t3 - 3*t2 + 1)*ys[lo] + (t3 - 2*t2 + t)*h[lo]*m[lo]
         + (-2*t3 + 3*t2)*ys[lo+1] + (t3 - t2)*h[lo]*m[lo+1];
  };
}

/* ------------------------------------------------------- forma da baliza --
   Bojo redondo segue de perto a super-elipse  (y/Y)^p + (1 - z/D)^p = 1, que da
   tangente horizontal na quilha e topo vertical na borda. Ajustar o expoente aos
   niveis tabelados e muito melhor do que interpolar entre eles: com as tres
   meias-bocas desta tabela o ajuste recupera p com tres casas e reconstroi a
   curva com 0,07% de erro, contra 7,5% da cubica monotona, que nao tem como
   saber o que acontece entre a quilha e o primeiro nivel. */
function superY(u, p){
  if(u <= 0) return 0;
  if(u >= 1) return 1;
  return Math.pow(1 - Math.pow(1 - u, p), 1/p);
}
/* Menor quadrado do desvio nos niveis tabelados, por secao dourada. */
function fitSuper(U, Y, ys){
  if(ys < 1e-6 || U.length < 3) return { p:2, rms:Infinity };
  function err(p){
    var e = 0, i;
    for(i=1;i<U.length-1;i++){ var d = superY(U[i], p) - Y[i]/ys; e += d*d; }
    return e;
  }
  var a = 1.02, b = 8, gr = 0.6180339887, i;
  var c = b - gr*(b-a), d = a + gr*(b-a), fc = err(c), fd = err(d);
  for(i=0;i<44;i++){
    if(fc < fd){ b = d; d = c; fd = fc; c = b - gr*(b-a); fc = err(c); }
    else       { a = c; c = d; fc = fd; d = a + gr*(b-a); fd = err(d); }
  }
  var pb = (a+b)/2;
  return { p:pb, rms:Math.sqrt(err(pb)/Math.max(1, U.length-2)) };
}
var SUPER_TOL = 0.015;      /* residuo acima disto: a baliza nao e desta familia */

/* ------------------------------------------------------------------- casco --
   Cada coluna da tabela e interpolada ao longo do comprimento; a baliza em
   qualquer x sai montada como lista de nos (u, y) com u = altura relativa. */
function makeHull(parsed){
  var rows = parsed.rows, mode = parsed.mode;
  var xs = rows.map(function(r){ return r.x; });
  var col = function(k){ return pchip(xs, rows.map(function(r){ return r[k]; })); };
  var fzk = col('zk'), fzs = col('zs'), fys = col('ys');
  var fmid = [], fzc = null, fyc = null, nMid = 0;
  if(mode === 'quinado'){ fzc = col('zc'); fyc = col('yc'); }
  else {
    nMid = rows[0].mids.length;
    for(var k=0;k<nMid;k++)
      fmid.push(pchip(xs, rows.map((function(kk){
        return function(r){ return r.mids[kk]; };
      })(k))));
  }
  var X0 = xs[0], LOA = xs[xs.length-1] - X0, clamps = 0;

  function section(x){
    var zk = fzk(x), zs = Math.max(fzs(x), zk), ys = Math.max(0, fys(x));
    var U = [0], Y = [0], i;
    if(mode === 'quinado'){
      var rawZc = fzc(x), rawYc = fyc(x);
      var zc = Math.min(Math.max(rawZc, zk), zs);
      var yc = Math.min(Math.max(0, rawYc), ys);
      if(Math.abs(zc - rawZc) > 1e-6 || Math.abs(yc - rawYc) > 1e-6) clamps++;
      var uc = (zs - zk) > 1e-9 ? (zc - zk)/(zs - zk) : 0.5;
      U.push(uc); Y.push(yc);
    } else {
      for(i=0;i<nMid;i++){
        var raw = fmid[i](x);
        var y = Math.max(0, raw);
        if(Math.abs(y - raw) > 1e-6) clamps++;
        U.push((i+1)/(nMid+1));
        Y.push(y);
      }
    }
    U.push(1); Y.push(ys);
    var fit = (mode === 'redondo') ? fitSuper(U, Y, ys) : { p:0, rms:Infinity };
    return { zk:zk, zs:zs, ys:ys, U:U, Y:Y, mode:mode, p:fit.p, pRms:fit.rms,
             superFits: fit.rms <= SUPER_TOL };
  }

  return {
    rows: rows, mode: mode, nMid: nMid, X0: X0, LOA: LOA, stations: xs, section: section,
    clampCount: function(){ return clamps; },
    bounds: function(){
      var maxY = 0, minZ = Infinity, maxZ = -Infinity, i, N = 400;
      for(i=0;i<=N;i++){
        var s = section(X0 + LOA*i/N);
        var j, ymax = 0;
        for(j=0;j<s.Y.length;j++) if(s.Y[j] > ymax) ymax = s.Y[j];
        if(ymax > maxY) maxY = ymax;
        if(s.zk < minZ) minZ = s.zk;
        if(s.zs > maxZ) maxZ = s.zs;
      }
      return { maxY:maxY, minZ:minZ, maxZ:maxZ };
    }
  };
}

/* ------------------------------------------------------------------ baliza --
   Poligonal da meia-baliza, da linha de centro para fora: [[y, z], ...].
   No casco redondo os nos intermediarios sao interpolados por cubica monotona
   em u, o que arredonda o bojo. No quinado a interpolacao e linear entre os
   tres nos, o que mantem o canto vivo exatamente onde a tabela o coloca. */
function halfPoly(s, n){
  var out = [], i;
  var span = s.zs - s.zk;
  if(s.mode === 'quinado'){
    /* subdivide cada painel, preservando o vertice do chine */
    var segs = s.U.length - 1, per = Math.max(2, Math.round(n/segs));
    for(i=0;i<segs;i++){
      var u0 = s.U[i], u1 = s.U[i+1], y0 = s.Y[i], y1 = s.Y[i+1], j;
      for(j=(i?1:0); j<=per; j++){
        var t = j/per, u = u0 + (u1-u0)*t;
        out.push([y0 + (y1-y0)*t, s.zk + span*u]);
      }
    }
    return out;
  }
  /* Na proa a baliza colapsa na roda. Ainda assim tem de devolver n+1 pontos: a malha
     e uma grade e todos os aneis precisam do mesmo numero de vertices. */
  if(s.ys < 1e-6){
    for(i=0;i<=n;i++) out.push([0, s.zk + span*i/n]);
    return out;
  }

  /* Interpola a ALTURA em funcao da MEIA-BOCA, nao o contrario. Num bojo redondo
     y(u) chega a quilha com derivada infinita — a super-elipse vale y ~ u^(1/p) —
     e a cubica monotona, que trabalha com declividades finitas, devolve o bojo
     perto de 20% estreito demais. Na direcao inversa du/dy tende a zero na quilha,
     que e exatamente o caso facil. Depois inverte por bisseccao para amostrar em
     alturas igualmente espacadas, senao o costado quase vertical fica facetado. */
  if(s.superFits){
    for(i=0;i<=n;i++){
      var uS = i/n;
      out.push([s.ys*superY(uS, s.p), s.zk + span*uS]);
    }
    return out;
  }
  var monotone = true;
  for(i=1;i<s.Y.length;i++) if(s.Y[i] <= s.Y[i-1] + 1e-9) monotone = false;
  if(monotone){
    var fu = pchip(s.Y, s.U), k;
    for(i=0;i<=n;i++){
      var target = i/n, lo = 0, hi = s.ys, mid;
      for(k=0;k<28;k++){ mid = (lo + hi)/2; if(fu(mid) < target) lo = mid; else hi = mid; }
      out.push([(lo + hi)/2, s.zk + span*target]);
    }
    return out;
  }
  /* Meias-bocas nao monotonas (borda tombada, por exemplo): volta a y(u). */
  var fy = pchip(s.U, s.Y);
  for(i=0;i<=n;i++){
    var uu = i/n;
    out.push([Math.max(0, fy(uu)), s.zk + span*uu]);
  }
  return out;
}

/* Area imersa, meia-boca na linha de agua e perimetro molhado, num calado.
   z cresce monotonicamente ao longo da poligonal, entao a linha de agua a
   corta uma unica vez e a integral de y dz e exata sobre os segmentos. */
function immersed(poly, T){
  if(!poly.length || T <= poly[0][1]) return { area:0, ywl:0, girth:0, wet:false };
  var area = 0, girth = 0, ywl = poly[0][0], i;
  for(i=0;i<poly.length-1;i++){
    var y0 = poly[i][0], z0 = poly[i][1], y1 = poly[i+1][0], z1 = poly[i+1][1];
    if(z1 <= z0 + 1e-12){
      /* Trecho horizontal (fundo chato, chapa de quilha): nao contribui area, mas e
         molhado, e esquecer isso subestima a superficie molhada do casco. */
      if(z0 <= T + 1e-12) girth += Math.abs(y1 - y0);
      continue;
    }
    if(z1 <= T){
      area  += (y0 + y1)/2*(z1 - z0);
      girth += Math.sqrt((y1-y0)*(y1-y0) + (z1-z0)*(z1-z0));
      ywl = y1;
    } else {
      var t = (T - z0)/(z1 - z0);
      var ym = y0 + (y1 - y0)*t;
      area  += (y0 + ym)/2*(T - z0);
      girth += Math.sqrt((ym-y0)*(ym-y0) + (T-z0)*(T-z0));
      return { area:area, ywl:ym, girth:girth, wet:true };
    }
  }
  return { area:area, ywl:ywl, girth:girth, wet:true };
}

/* Meia-boca numa altura absoluta z; null fora da baliza. Serve as linhas de agua. */
function yAtZ(poly, z){
  if(!poly.length || z < poly[0][1] - 1e-9 || z > poly[poly.length-1][1] + 1e-9) return null;
  for(var i=0;i<poly.length-1;i++){
    var z0 = poly[i][1], z1 = poly[i+1][1];
    if(z >= z0 - 1e-9 && z <= z1 + 1e-9){
      if(z1 - z0 < 1e-12) return Math.max(poly[i][0], poly[i+1][0]);
      var t = (z - z0)/(z1 - z0);
      return poly[i][0] + (poly[i+1][0] - poly[i][0])*t;
    }
  }
  return poly[poly.length-1][0];
}
/* Altura onde a baliza tem uma dada meia-boca; serve aos planos do alto. */
function zAtY(poly, y){
  var last = null;
  for(var i=0;i<poly.length-1;i++){
    var y0 = poly[i][0], y1 = poly[i+1][0];
    if((y0 - y)*(y1 - y) <= 0 && Math.abs(y1 - y0) > 1e-12){
      var t = (y - y0)/(y1 - y0);
      last = poly[i][1] + (poly[i+1][1] - poly[i][1])*t;
    }
  }
  return last;
}

/* -------------------------------------------------------- hidrostatica --
   Cotas entram em milimetros; tudo volta em unidades metricas de base. */
function hydrostatics(hull, T_mm, rho, nPoly){
  var N = 400, i, dx = hull.LOA/N, np = nPoly || 40;
  var vol = 0, momX = 0, wp = 0, wpMom = 0, wsa = 0, amaxHalf = 0, amaxX = 0;
  var bwl = 0, xFirst = null, xLast = null, minKeel = Infinity;
  for(i=0;i<=N;i++){
    var x = hull.X0 + hull.LOA*i/N;
    var s = hull.section(x);
    var im = immersed(halfPoly(s, np), T_mm);
    var w = (i === 0 || i === N) ? 0.5 : 1;               /* trapezios */
    vol   += im.area  * w * dx;
    momX  += im.area  * x * w * dx;
    wp    += im.ywl   * w * dx;
    wpMom += im.ywl   * x * w * dx;
    wsa   += im.girth * w * dx;
    if(im.area > amaxHalf){ amaxHalf = im.area; amaxX = x; }
    if(2*im.ywl > bwl) bwl = 2*im.ywl;
    if(im.wet){
      if(xFirst === null) xFirst = x;
      xLast = x;
      if(s.zk < minKeel) minKeel = s.zk;
    }
  }
  vol *= 2; momX *= 2; wp *= 2; wpMom *= 2; wsa *= 2;     /* os dois bordos */
  var transomArea = 2*immersed(halfPoly(hull.section(hull.X0), np), T_mm).area;
  var MM3 = 1e-9, MM2 = 1e-6;
  var Lwl = (xFirst === null) ? 0 : (xLast - xFirst);
  var draft = isFinite(minKeel) ? (T_mm - minKeel) : 0;
  var V = vol*MM3, Am = amaxHalf*2*MM2, Aw = wp*MM2;
  var LwlM = Lwl/1000, BwlM = bwl/1000, TM = draft/1000;
  return {
    draft_mm: T_mm, T: TM, V: V, disp: V*rho,
    LCB: vol > 0 ? (momX/vol)/1000 : 0,
    LCF: wp  > 0 ? (wpMom/wp)/1000 : 0,
    Lwl: LwlM, Bwl: BwlM, Aw: Aw, Am: Am, AmX: amaxX/1000,
    wsa: wsa*MM2 + transomArea*MM2,
    transomArea: transomArea*MM2,
    Cb: (LwlM*BwlM*TM) > 1e-12 ? V/(LwlM*BwlM*TM) : 0,
    Cp: (Am*LwlM)      > 1e-12 ? V/(Am*LwlM)      : 0,
    Cw: (LwlM*BwlM)    > 1e-12 ? Aw/(LwlM*BwlM)   : 0,
    Cm: (BwlM*TM)      > 1e-12 ? Am/(BwlM*TM)     : 0
  };
}

/* ---------------------------------------------------------------- malhagem --
   Um anel por baliza, da borda de bombordo em volta da quilha ate a borda de
   estibordo, para a superficie ser uma grade unica sem costura na linha de centro. */
function ringAt(hull, x, np){
  var half = halfPoly(hull.section(x), np), i, ring = [];
  for(i=half.length-1;i>=0;i--) ring.push([-half[i][0], half[i][1]]);
  for(i=1;i<half.length;i++)    ring.push([ half[i][0], half[i][1]]);
  return ring;
}

function buildMesh(hull, NL, np){
  var R = 2*(np+1) - 1, i, j;
  var pos = new Float32Array((NL+1)*R*3);
  var nrm = new Float32Array((NL+1)*R*3);
  var idx = [];
  for(i=0;i<=NL;i++){
    var x = hull.X0 + hull.LOA*i/NL;
    var ring = ringAt(hull, x, np);
    for(j=0;j<R;j++){
      var o = (i*R + j)*3;
      pos[o]   = x/1000;
      pos[o+1] = ring[j][0]/1000;
      pos[o+2] = ring[j][1]/1000;
    }
  }
  for(i=0;i<NL;i++) for(j=0;j<R-1;j++){
    var a = i*R + j, b = i*R + j+1, c = (i+1)*R + j, d = (i+1)*R + j+1;
    idx.push(a,b,c, b,d,c);                 /* normais para fora */
  }
  for(i=0;i<idx.length;i+=3){
    var i0 = idx[i]*3, i1 = idx[i+1]*3, i2 = idx[i+2]*3;
    var ux = pos[i1]-pos[i0], uy = pos[i1+1]-pos[i0+1], uz = pos[i1+2]-pos[i0+2];
    var vx = pos[i2]-pos[i0], vy = pos[i2+1]-pos[i0+1], vz = pos[i2+2]-pos[i0+2];
    var nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
    nrm[i0]+=nx; nrm[i0+1]+=ny; nrm[i0+2]+=nz;
    nrm[i1]+=nx; nrm[i1+1]+=ny; nrm[i1+2]+=nz;
    nrm[i2]+=nx; nrm[i2+1]+=ny; nrm[i2+2]+=nz;
  }
  for(i=0;i<nrm.length;i+=3){
    var L = Math.sqrt(nrm[i]*nrm[i] + nrm[i+1]*nrm[i+1] + nrm[i+2]*nrm[i+2]);
    if(L > 1e-12){ nrm[i]/=L; nrm[i+1]/=L; nrm[i+2]/=L; }
    else { nrm[i]=1; nrm[i+1]=0; nrm[i+2]=0; }
  }
  return { pos: pos, nrm: nrm, idx: idx, R: R, NL: NL };
}

/* Espelho de popa: a face plana que fecha a re, em leque a partir do centroide. */
function buildTransom(hull, np){
  var ring = ringAt(hull, hull.X0, np), n = ring.length, i;
  var cy = 0, cz = 0;
  for(i=0;i<n;i++){ cy += ring[i][0]; cz += ring[i][1]; }
  cy /= n; cz /= n;
  var pos = [], nrm = [], idx = [];
  pos.push(hull.X0/1000, cy/1000, cz/1000); nrm.push(-1,0,0);
  for(i=0;i<n;i++){ pos.push(hull.X0/1000, ring[i][0]/1000, ring[i][1]/1000); nrm.push(-1,0,0); }
  for(i=1;i<n;i++) idx.push(0, i+1, i);
  idx.push(0, 1, n);
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: idx };
}

/* Conves: superficie regrada entre as duas bordas. */
function buildDeck(hull, NL){
  var pos = [], nrm = [], idx = [], i;
  for(i=0;i<=NL;i++){
    var x = hull.X0 + hull.LOA*i/NL, s = hull.section(x);
    pos.push(x/1000, -s.ys/1000, s.zs/1000);  nrm.push(0,0,1);
    pos.push(x/1000,  s.ys/1000, s.zs/1000);  nrm.push(0,0,1);
  }
  for(i=0;i<NL;i++){
    var a = i*2, b = i*2+1, c = i*2+2, d = i*2+3;
    idx.push(a,c,b, b,c,d);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: idx };
}

if(typeof module !== 'undefined' && module.exports)
  module.exports = { DEFAULT_TSV:DEFAULT_TSV, detectDecimalSep:detectDecimalSep, paraNumero:paraNumero, superY:superY, fitSuper:fitSuper, CHINE_TSV:CHINE_TSV, parseOffsets:parseOffsets,
                     detectFormat:detectFormat, pchip:pchip, makeHull:makeHull, halfPoly:halfPoly,
                     immersed:immersed, yAtZ:yAtZ, zAtY:zAtY, hydrostatics:hydrostatics,
                     ringAt:ringAt, buildMesh:buildMesh, buildTransom:buildTransom, buildDeck:buildDeck };
