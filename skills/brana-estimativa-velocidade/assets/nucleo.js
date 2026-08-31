"use strict";
/* ============================================================================
   Hidrostatica a prumo a partir da tabela de cotas.

   O painel de velocidade nao precisa de banda nem de trim: precisa das medidas
   que as formulas de estimativa consomem — comprimento de linha d'agua, boca de
   linha d'agua, calado, volume, superficie molhada, coeficientes — e precisa
   delas na flutuacao correspondente ao peso que o usuario escolheu. Entao o
   calado nao e um botao: ele sai do peso, por Newton, com a area do plano
   d'agua como derivada exata.

   Unidades: a tabela entra em milimetros (formato do plano de linhas); tudo
   que sai daqui esta em metros, m2, m3.
   ============================================================================ */

/* ------------------------------------------------------------------ leitura */
function detectFormat(headerFields, firstRow){
  var h = (headerFields || []).join(' ').toLowerCase();
  if(/sheer_hb|chine_hb|keel_ht|deadrise/.test(h)) return 'quinado';
  if(/altura_quilha|altura de quilha|mb_|meia_boca|meia-boca|baliza/.test(h)) return 'redondo';
  if(!firstRow) return 'redondo';
  var c = firstRow;
  var risingBreadths = c.length >= 8 && c[4] <= c[5] + 1e-6 && c[5] <= c[6] + 1e-6 && c[6] <= c[7] + 1e-6;
  if(c[2] < c[3] && risingBreadths) return 'redondo';
  if(c[2] > c[3]) return 'quinado';
  return 'redondo';
}

function detectDecimalSep(tokens){
  var virgDec = false, pontoDec = false, i, t;
  for(i=0;i<tokens.length;i++){
    t = tokens[i];
    if(t.indexOf(',') >= 0 && t.indexOf('.') >= 0) continue;
    if(/,\d{1,2}$/.test(t) || /,\d{4,}$/.test(t)) virgDec = true;
    if(/\.\d{1,2}$/.test(t) || /\.\d{4,}$/.test(t)) pontoDec = true;
  }
  if(virgDec && !pontoDec) return ',';
  if(pontoDec && !virgDec) return '.';
  return null;
}
function paraNumero(s, dec){
  s = String(s).trim();
  var temV = s.indexOf(',') >= 0, temP = s.indexOf('.') >= 0;
  if(temV && temP){
    var decSep = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
    var milhar = decSep === ',' ? '.' : ',';
    s = s.split(milhar).join('').replace(decSep, '.');
  } else if(temV){
    if(dec === ',')      s = s.replace(',', '.');
    else if(dec === '.') s = s.split(',').join('');
    else                 s = /,\d{3}$/.test(s) ? s.split(',').join('') : s.replace(',', '.');
  } else if(temP && dec === ','){
    s = s.split('.').join('');
  }
  return parseFloat(s);
}

function parseOffsets(text){
  var lines = String(text).split(/\r?\n/), bruto = [], header = null, num = [], i, j;
  for(i=0;i<lines.length;i++){
    var ln = lines[i].trim();
    if(!ln || ln.charAt(0) === '#') continue;
    var f = ln.split(/[\t;]|\s{1,}/).filter(function(s){ return s.length; });
    if(f.length < 5) continue;
    bruto.push(f);
  }
  var todos = [];
  bruto.forEach(function(f){ f.forEach(function(c){ if(/^[-+]?[\d.,]+$/.test(c)) todos.push(c); }); });
  var dec = detectDecimalSep(todos);

  for(i=0;i<bruto.length;i++){
    var v = bruto[i].map(function(s){ return paraNumero(s, dec); });
    if(!(isFinite(v[1]) && isFinite(v[2]) && isFinite(v[3]))){ if(!header) header = bruto[i]; continue; }
    num.push(v);
  }
  if(num.length < 3) throw new Error('sao necessarias ao menos 3 balizas; encontrei ' + num.length);

  var mode = detectFormat(header, num[0]);
  var rows = [], warn = [];

  if(mode === 'quinado'){
    num.forEach(function(v){
      if(v.length < 7) throw new Error('formato quinado pede 7 colunas; a baliza ' + v[0] + ' tem ' + v.length);
      rows.push({ stn:v[0], x:v[1], zk:v[6], zs:v[4], ys:v[2], zc:v[5], yc:v[3], mids:null });
    });
  } else {
    var nCols = num[0].length;
    var nMid = nCols - 5;
    if(nMid < 1) throw new Error('formato redondo pede ao menos 6 colunas (uma meia-boca intermediaria)');
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
      for(var k=0;k<r.mids.length;k++)
        if(!isFinite(r.mids[k])) throw new Error('meia-boca nao numerica na baliza ' + r.stn);
    }
  });
  return { rows:rows, warn:warn, mode:mode, nMid: mode === 'redondo' ? rows[0].mids.length : 1 };
}

/* ------------------------------------------------- interpolacao longitudinal */
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
      else { var w1 = 2*h[i] + h[i-1], w2 = h[i] + 2*h[i-1];
             m[i] = (w1 + w2) / (w1/d[i-1] + w2/d[i]); }
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

/* --------------------------------------------------------- forma da baliza */
function superY(u, p){
  if(u <= 0) return 0;
  if(u >= 1) return 1;
  return Math.pow(1 - Math.pow(1 - u, p), 1/p);
}
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
var SUPER_TOL = 0.015;

/* -------------------------------------------------------------------- casco */
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
  var X0 = xs[0], LOA = xs[xs.length-1] - X0;

  function section(x){
    var zk = fzk(x), zs = Math.max(fzs(x), zk), ys = Math.max(0, fys(x));
    var U = [0], Y = [0], i;
    if(mode === 'quinado'){
      var zc = Math.min(Math.max(fzc(x), zk), zs);
      var yc = Math.min(Math.max(0, fyc(x)), ys);
      var uc = (zs - zk) > 1e-9 ? (zc - zk)/(zs - zk) : 0.5;
      U.push(uc); Y.push(yc);
    } else {
      for(i=0;i<nMid;i++){ U.push((i+1)/(nMid+1)); Y.push(Math.max(0, fmid[i](x))); }
    }
    U.push(1); Y.push(ys);
    var fit = (mode === 'redondo') ? fitSuper(U, Y, ys) : { p:0, rms:Infinity };
    var useSuper = (mode === 'redondo') && fit.rms <= SUPER_TOL;
    var f = useSuper ? null : pchip(U, Y);
    return {
      x:x, zk:zk, zs:zs, ys:ys, U:U, Y:Y, D:(zs - zk),
      p:fit.p, pRms:fit.rms, useSuper:useSuper,
      /* meia-boca na altura z, em mm */
      y: function(z){
        if(z <= zk) return 0;
        if(z >= zs) return ys;
        var u = (zs - zk) > 1e-9 ? (z - zk)/(zs - zk) : 1;
        if(useSuper) return ys*superY(u, fit.p);
        var v = f(u);
        return v < 0 ? 0 : v;
      }
    };
  }
  return { rows:rows, mode:mode, nMid:nMid, X0:X0, LOA:LOA, stations:xs,
           section:section, fzk:fzk, fzs:fzs, fys:fys, fzc:fzc, fyc:fyc };
}

/* ----------------------------------------------------------- malha do casco --
   As balizas nao dependem do calado: so a altura da linha d'agua depende. Vale
   entao cortar o casco uma unica vez em NX+1 balizas, e dentro de cada baliza
   guardar as integrais acumuladas da quilha para cima — area, momento vertical
   e perimetro. Com isso a hidrostatica em qualquer calado custa uma passada
   longitudinal, e o calado sai do peso em tempo real enquanto o cursor anda. */
var NX = 320, MZ = 128;

function buildGrid(hull){
  var i, k, N = NX, g = new Array(N+1), zBot = Infinity, zTop = -Infinity;
  for(i=0;i<=N;i++){
    var x = hull.X0 + hull.LOA*i/N;
    var s = hull.section(x);
    var dz = (s.zs - s.zk)/MZ;
    var y  = new Float64Array(MZ+1), cA = new Float64Array(MZ+1),
        cM = new Float64Array(MZ+1), cG = new Float64Array(MZ+1);
    y[0] = 0;
    for(k=1;k<=MZ;k++){
      var z = s.zk + dz*k, zp = z - dz;
      y[k]  = s.y(z);
      cA[k] = cA[k-1] + (y[k] + y[k-1])*0.5*dz;
      cM[k] = cM[k-1] + (y[k] + y[k-1])*0.5*dz*(z + zp)*0.5;
      cG[k] = cG[k-1] + Math.sqrt((y[k]-y[k-1])*(y[k]-y[k-1]) + dz*dz);
    }
    g[i] = { x:x, zk:s.zk, zs:s.zs, ys:s.ys, dz:dz, y:y, cA:cA, cM:cM, cG:cG,
             yc: (hull.mode === 'quinado') ? Math.min(Math.max(0, hull.fyc(x)), s.ys) : 0,
             zc: (hull.mode === 'quinado') ? Math.min(Math.max(hull.fzc(x), s.zk), s.zs) : 0 };
    if(s.zk < zBot) zBot = s.zk;
    if(s.zs > zTop) zTop = s.zs;
  }
  return { g:g, N:N, dx:hull.LOA/N, zBot:zBot, zTop:zTop };
}

/* Propriedades da meia-baliza imersa ate a altura d. A celula parcial entra
   pelo trapezio exato, com a meia-boca interpolada linearmente dentro dela —
   e a mesma regra usada para montar o acumulado, entao nao ha degrau. */
function propsAt(c, d){
  if(d <= c.zk) return { A:0, M:0, G:0, b:0, full:false };
  if(d >= c.zs) return { A:c.cA[MZ], M:c.cM[MZ], G:c.cG[MZ], b:c.ys, full:true };
  var t = (d - c.zk)/c.dz, k = Math.floor(t);
  if(k > MZ-1) k = MZ-1;
  var f = t - k, h = f*c.dz;
  var y0 = c.y[k], y1 = c.y[k+1], yb = y0 + (y1 - y0)*f;
  var z0 = c.zk + c.dz*k;
  return {
    A: c.cA[k] + (y0 + yb)*0.5*h,
    M: c.cM[k] + (y0 + yb)*0.5*h*(z0 + d)*0.5,
    G: c.cG[k] + Math.sqrt((yb-y0)*(yb-y0) + h*h),
    b: yb, full:false
  };
}

function hydroAt(hull, grid, d){
  var g = grid.g, N = grid.N, dx = grid.dx, i;
  var A = new Float64Array(N+1), B = new Float64Array(N+1),
      G = new Float64Array(N+1), M = new Float64Array(N+1);
  var anyFull = false, from = -1, to = -1;
  for(i=0;i<=N;i++){
    var pr = propsAt(g[i], d);
    A[i] = pr.A; B[i] = pr.b; G[i] = pr.G; M[i] = pr.M;
    if(pr.full) anyFull = true;
    if(pr.A > 0){ if(from < 0) from = i; to = i; }
  }
  var Vh = 0, Awh = 0, WSh = 0, Mx = 0, Mz = 0, MxW = 0, k;
  for(k=0;k<N;k++){
    Vh  += (A[k] + A[k+1])*0.5*dx;
    Awh += (B[k] + B[k+1])*0.5*dx;
    WSh += (G[k] + G[k+1])*0.5*dx;
    Mx  += (A[k]*g[k].x + A[k+1]*g[k+1].x)*0.5*dx;
    Mz  += (M[k] + M[k+1])*0.5*dx;
    MxW += (B[k]*g[k].x + B[k+1]*g[k+1].x)*0.5*dx;
  }
  var V = 2*Vh, Awp = 2*Awh, WS = 2*WSh;

  /* extremos da linha d'agua: onde a quilha cruza a altura d, por bissecao na
     funcao de quilha interpolada — nao no passo da malha. */
  function crossing(xa, xb){
    var fa = d - hull.fzk(xa), fb = d - hull.fzk(xb), m, fm, j;
    if(fa*fb > 0) return null;
    for(j=0;j<50;j++){ m=(xa+xb)*0.5; fm = d - hull.fzk(m);
      if(fa*fm <= 0){ xb=m; fb=fm; } else { xa=m; fa=fm; } }
    return (xa+xb)*0.5;
  }
  var xAft = hull.X0, xFwd = hull.X0 + hull.LOA;
  if(from >= 0){
    var ca = from > 0 ? crossing(g[from-1].x, g[from].x) : null;
    var cf = to < N   ? crossing(g[to].x, g[to+1].x)     : null;
    xAft = ca !== null ? ca : g[from].x;
    xFwd = cf !== null ? cf : g[to].x;
  }
  var LWL = Math.max(0, xFwd - xAft);

  var BWL = 0, Am = 0, xAm = hull.X0, Bt = 0;
  for(i=0;i<=N;i++){
    if(2*B[i] > BWL) BWL = 2*B[i];
    if(2*A[i] > Am){ Am = 2*A[i]; xAm = g[i].x; }
    if(2*g[i].ys > Bt) Bt = 2*g[i].ys;
  }
  var T = Math.max(0, d - grid.zBot);

  /* area projetada do fundo, chine a chine, dentro da linha d'agua: e a medida
     que as formulas de planeio usam como superficie de sustentacao. So existe
     em casco quinado — no bojo redondo o chine nao existe e nao se inventa. */
  var Ap = 0, Bpx = 0;
  if(hull.mode === 'quinado'){
    var w = new Float64Array(N+1);
    for(i=0;i<=N;i++){
      var ci = g[i];
      w[i] = (ci.zk <= d) ? Math.min(ci.yc, propsAt(ci, d).b > 0 ? ci.yc : 0) : 0;
      if(ci.zk > d) w[i] = 0;
      if(2*w[i] > Bpx) Bpx = 2*w[i];
    }
    for(k=0;k<N;k++) Ap += (w[k] + w[k+1])*0.5*dx;
    Ap *= 2;
  }

  /* ------------------------------------------- alto de quarto de boca (buttock)
     A "quarter-beam buttock" de Gerr e a linha longitudinal do casco no plano
     y = boca/4 a partir da linha de centro. O angulo que ela faz com a linha
     d'agua no corpo de re e, segundo o capitulo, o melhor indicador do teto de
     velocidade de um casco nao planante — e e uma medida puramente geometrica,
     que sai da tabela de cotas.

     Aqui: y do alto = BWL/4 na flutuacao corrente; para cada baliza acha-se a
     altura em que a meia-boca vale isso (primeira travessia subindo da quilha);
     o angulo e a inclinacao media do trecho de re, do ponto mais fundo do alto
     ate onde ele termina — no espelho, se ainda submerso, ou na linha d'agua,
     se emergir antes. Casco de fundo chato e corrida paralela da 0 grau, que e
     o que o livro descreve para o casco de planeio moderno. */
  var yQb = BWL/4, buttock = { deg:NaN, pts:[], yQb:yQb*1e-3, xLow:0, zLow:0, xEnd:0, zEnd:0 };
  if(yQb > 1e-6 && from >= 0){
    var pts = [];
    for(i=from;i<=to;i++){
      var c = g[i];
      if(c.zk >= d) continue;
      var kTop = Math.min(MZ, Math.max(1, Math.ceil((Math.min(d, c.zs) - c.zk)/c.dz)));
      if(c.y[kTop] < yQb) continue;                 /* nem chega ao quarto de boca */
      var kk = 1;
      while(kk <= kTop && c.y[kk] < yQb) kk++;
      if(kk > kTop) continue;
      var y0 = c.y[kk-1], y1 = c.y[kk];
      var fz = (y1 - y0) > 1e-12 ? (yQb - y0)/(y1 - y0) : 0;
      var zq = c.zk + c.dz*(kk - 1 + fz);
      if(zq > d) continue;
      pts.push([c.x, zq]);
    }
    if(pts.length >= 3){
      /* proa e a extremidade de menor meia-boca na borda: e de la que o alto corre para re */
      var bowFwd = g[N].ys <= g[0].ys;
      var lowI = 0, j;
      for(j=1;j<pts.length;j++) if(pts[j][1] < pts[lowI][1]) lowI = j;
      /* percorre do ponto mais fundo em direcao a popa */
      var step = bowFwd ? -1 : 1;
      var endI = lowI;
      for(j=lowI+step; j>=0 && j<pts.length; j+=step) endI = j;
      var dx = Math.abs(pts[endI][0] - pts[lowI][0]);
      var dz = pts[endI][1] - pts[lowI][1];
      if(dx > 1e-6){
        buttock.deg  = Math.atan2(Math.max(0, dz), dx)*180/Math.PI;
        buttock.xLow = pts[lowI][0]*1e-3; buttock.zLow = pts[lowI][1]*1e-3;
        buttock.xEnd = pts[endI][0]*1e-3; buttock.zEnd = pts[endI][1]*1e-3;
      }
      buttock.pts = pts.map(function(p){ return [p[0]*1e-3, p[1]*1e-3]; });
    }
  }

  var mm = 1e-3, mm2 = 1e-6, mm3 = 1e-9;
  var prof = { x:new Array(N+1), A:new Array(N+1), b:new Array(N+1) };
  for(i=0;i<=N;i++){ prof.x[i] = g[i].x*mm; prof.A[i] = 2*A[i]*mm2; prof.b[i] = 2*B[i]*mm; }

  return {
    d:d*mm, T:T*mm, zBot:grid.zBot*mm,
    V:V*mm3, Awp:Awp*mm2, WS:WS*mm2, Ap:Ap*mm2, Bpx:Bpx*mm,
    LWL:LWL*mm, BWL:BWL*mm, BOA:Bt*mm, Am:Am*mm2,
    LCB:(V > 1e-9 ? (2*Mx)/V : 0)*mm,
    KB:(Vh > 1e-12 ? Mz/Vh : 0)*mm,
    LCF:(Awp > 1e-9 ? (2*MxW)/Awp : 0)*mm,
    xAft:xAft*mm, xFwd:xFwd*mm, xAm:xAm*mm,
    Cb:(LWL > 1 && BWL > 1 && T > 1) ? V/(LWL*BWL*T) : 0,
    Cp:(Am > 1 && LWL > 1) ? V/(Am*LWL) : 0,
    Cm:(BWL > 1 && T > 1) ? Am/(BWL*T) : 0,
    Cwp:(LWL > 1 && BWL > 1) ? Awp/(LWL*BWL) : 0,
    deckSubmerged:anyFull, prof:prof, buttock:buttock
  };
}

/* Calado a partir do volume. O volume cresce monotonicamente com o calado, o
   que garante o cerco; a area do plano d'agua e a derivada exata dV/dd, o que
   da a convergencia quadratica de Newton dentro do cerco. */
function solveDraft(hull, grid, Vtarget, guess){
  var dLo = grid.zBot, dHi = grid.zTop, i, st;
  var d = (guess !== undefined && isFinite(guess)) ? Math.min(Math.max(guess, dLo), dHi)
                                                  : dLo + 0.35*(dHi - dLo);
  for(i=0;i<50;i++){
    st = hydroAt(hull, grid, d);
    var f = st.V - Vtarget;
    if(Math.abs(f) <= Math.max(1e-11, Vtarget*1e-9)) return { d:d, st:st, ok:true, it:i };
    if(f > 0) dHi = d; else dLo = d;
    var step = st.Awp > 1e-12 ? -f/st.Awp*1000 : 0;
    var dn = d + step;
    if(!isFinite(dn) || dn <= dLo || dn >= dHi) dn = (dLo + dHi)*0.5;
    if(Math.abs(dn - d) < 1e-9){ d = dn; break; }
    d = dn;
  }
  st = hydroAt(hull, grid, d);
  return { d:d, st:st, ok:Math.abs(st.V - Vtarget) <= Math.max(1e-9, Vtarget*1e-5), it:i };
}

/* Volume maximo antes de embarcar agua: calado na borda mais baixa. */
function volumeAtSheer(hull, grid){
  var i, zMin = Infinity;
  for(i=0;i<=grid.N;i++) if(grid.g[i].zs < zMin) zMin = grid.g[i].zs;
  return { d:zMin, V:hydroAt(hull, grid, zMin).V };
}

if(typeof module !== 'undefined')
  module.exports = { parseOffsets:parseOffsets, makeHull:makeHull, buildGrid:buildGrid,
                     hydroAt:hydroAt, solveDraft:solveDraft, volumeAtSheer:volumeAtSheer };


/* ============================================================================
   As formulas do capitulo 2 de "Propeller Handbook", de Dave Gerr — "Estimating
   Speed: Effects of Power, Weight, and Hull Type".

   Cada constante aqui foi lida da propria pagina do capitulo, e cada formula foi
   conferida contra os exemplos numericos que o proprio autor resolve no texto:

     Salty Bell    220.000 lb, 70 pes de linha d'agua, 11 nos
                   -> V/√L 1,31 -> 533 lb/HP -> 413 HP no helice
                   (2-1: 10,665 / 533^(1/3) = 1,3157)
     Salty Bell    alto de 3,8 graus -> V/√L 2,1 -> 17,57 nos -> 130 lb/HP
                   (2-1: 10,665 / 130^(1/3) = 2,1053)
     Sea Rocket    50 pes, 30.000 lb -> D/L 107 -> V/√L 1,9 -> 13,4 nos
                   (2-2: 13,393/0,125 = 107,1 ; 2-3: 8,26/107,1^0,311 = 1,931)
     Flying Spray  10.890 lb, C 150, 25 nos -> 36 lb/HP -> 302 HP no helice
                   (2-4: 150/√36 = 25,00 exato)

   Uma erratula do livro, anotada aqui para quem for conferir: no exemplo do
   Flying Spray o texto escreve "10.890 lb. ÷ 31 LB/HP = 302 HP". O divisor
   correto e 36, nao 31 — 10.890/36 = 302,5, que e o resultado que o proprio
   texto apresenta. O painel usa 36.
   ============================================================================ */
var GERR = {

  /* ---- Formula 2-1 · Displacement Speed Formula -------------------------
     SL RATIO = 10.665 ÷ ∛(LB/SHP),  com  SL RATIO = Kts ÷ √WL
     LB = deslocamento em libras · SHP = HP no eixo, no helice · WL em pes.
     Vale para casco de deslocamento E de semi-deslocamento (Chart 2-1).
     Pressupoe helice com 50 a 60% de rendimento, 55% como boa media.        */
  K_DESL: 10.665,
  slFromLbShp: function(lbShp){
    if(!(lbShp > 0) || !isFinite(lbShp)) return 0;
    return GERR.K_DESL/Math.pow(lbShp, 1/3);
  },
  /* inversa: quantos SHP para uma dada V/√L, com o deslocamento em libras */
  shpFromSl: function(sl, lb){
    if(!(sl > 0) || !(lb > 0)) return 0;
    return lb*Math.pow(sl/GERR.K_DESL, 3);
  },

  /* ---- Formula 2-2 · Displacement-Length Ratio --------------------------
     D/L = DispT ÷ (0,01 × WL)³
     DispT = deslocamento em toneladas longas de 2.240 lb · WL em pes.
     (o livro anota: 1 tonelada metrica = 1,016 tonelada longa)              */
  LB_POR_TON_LONGA: 2240,
  dlRatio: function(lb, wlFt){
    if(!(wlFt > 0)) return Infinity;
    return (lb/GERR.LB_POR_TON_LONGA)/Math.pow(0.01*wlFt, 3);
  },

  /* ---- Formula 2-3 · Maximum Speed-Length Ratio vs DL Ratio -------------
     SL Ratio = 8.26 ÷ (D/L)^0,311
     Teto de velocidade de casco NAO planante. O livro avisa: um casco de
     planeio puro passa disto.                                              */
  A_MAXSL: 8.26, E_MAXSL: 0.311,
  maxSl: function(dl){
    if(!(dl > 0) || !isFinite(dl)) return 0;
    return GERR.A_MAXSL/Math.pow(dl, GERR.E_MAXSL);
  },

  /* ---- Formula 2-4 · Crouch's Planing Speed Formula ---------------------
     Kts = C ÷ (LB/SHP)^0,5
     C = constante do tipo de barco (Tabela 2-2) · LB em libras · SHP no eixo.
     Mesma premissa de helice: 50 a 60% de rendimento, 55% boa media.
     O capitulo observa que o comprimento nao entra nesta formula: em
     velocidade de planeio o que manda e a razao potencia/peso.              */
  ktsCrouch: function(C, lbShp){
    if(!(lbShp > 0) || !isFinite(lbShp) || !(C > 0)) return 0;
    return C/Math.sqrt(lbShp);
  },
  shpCrouch: function(C, kts, lb){
    if(!(kts > 0) || !(lb > 0) || !(C > 0)) return 0;
    return lb*Math.pow(kts/C, 2);
  },

  /* ---- velocidade de casco ---------------------------------------------
     "a velha regra de que o casco de deslocamento nao passa da velocidade de
     casco — 1,34 vezes a raiz do comprimento de linha d'agua em pes".
     O livro acrescenta que a regra e um pouco conservadora, e que V/√L de
     1,4 a 1,45 se alcanca em barco pesado de linhas limpas, a grande custo
     de potencia; a curva do Chart 2-1 sobe muito depressa depois de 1,5.    */
  SL_HULL_SPEED: 1.34,
  SL_DESL_PRATICO: 1.4,      /* teto pratico do deslocamento (1,3 a 1,4) */
  SL_DESL_FORCADO: 1.45,     /* alcancavel a grande custo */
  SL_SEMI_FROM: 1.4,         /* semi-deslocamento comeca em 1,3-1,4 */
  SL_PLANING_FROM: 2.9,      /* planeio verdadeiro acima de 2,9 ou 3 */
  SL_SEMI_TO: 3.0,

  /* lb/HP no helice que o capitulo cita como referencia de projeto */
  /* O capitulo imprime a regua de potencia maxima util de TRES maneiras, e elas
     nao coincidem. Guardadas as tres, com o V/√L que cada uma da pela 2-1:
       400 lb/HP  corpo do texto, duas vezes      -> V/√L 1,45
       500 lb/HP  legenda do Chart 2-1            -> V/√L 1,34
       550 lb/HP  bastante para V/√L 1,3          -> V/√L 1,30                */
  LBHP_SEM_SENTIDO: 400,
  LBHP_CAPTION: 500,
  LBHP_SL13: 550,

  /* Faixa de lb/HP que cada grafico do capitulo realmente desenha. Fora dela a
     formula continua devolvendo numero, mas o autor nao plotou aquilo — e vale
     dizer isso em vez de deixar passar. */
  CHART_2_1_LB: [50, 1000],  /* Chart 2-1 · deslocamento e semi-deslocamento */
  CHART_2_3_LB: [2, 60],     /* Chart 2-3 · planeio */

  /* ---- Tabela 2-2 · Planing Speed Chart Constants ----------------------- */
  C_TABLE: [
    { c:150, rot:'Runabouts médios, cruzadores, barcos de passageiros',
      orig:'average runabouts, cruisers, passenger vessels' },
    { c:190, rot:'Runabouts de alta velocidade, cruzadores muito leves e rápidos',
      orig:'high-speed runabouts, very light high-speed cruisers' },
    { c:210, rot:'Barcos de competição',
      orig:'race boat types' },
    { c:220, rot:'Hidroplanos de três pontos, hidroplanos com degrau',
      orig:'three-point hydroplanes, stepped hydroplanes' },
    { c:230, rot:'Catamarãs de competição e sea sleds',
      orig:'racing power catamarans and sea sleds' }
  ],

  /* ---- Tabela 2-1 · Buttock Angle vs SL Ratio ---------------------------
     angulo do alto de quarto de boca  ->  V/√L alcancavel
       menos de 2 graus  ->  2,5 ou mais
       4 graus           ->  cerca de 2
       7 graus           ->  cerca de 1,5
     Mais o texto: acima de 7 ou 8 graus o casco "raramente, ou nunca" passa
     de V/√L 1,4; e acima de 8 graus com D/L acima de 290 a 300, forcar
     V/√L acima de 1,4 "nao vai funcionar".                                 */
  BUTTOCK_TABLE: [ { deg:2, sl:2.5 }, { deg:4, sl:2.0 }, { deg:7, sl:1.5 } ],
  BUTTOCK_PLANEIO_MAX: 2,    /* planeio verdadeiro pede alto abaixo de 2 graus */
  BUTTOCK_TRAVA: 7,          /* acima de 7-8 graus, dificilmente passa de 1,4 */
  BUTTOCK_TRAVA_DURA: 8,
  DL_TRAVA: 290,             /* com alto > 8 graus e D/L > 290-300, nao funciona */

  /* Interpola a Tabela 2-1. Confere com o exemplo do livro: alto de 3,8 graus
     -> "cerca de 2,1" (a reta entre 2 e 4 graus da 2,05).                   */
  slFromButtock: function(deg){
    var T = GERR.BUTTOCK_TABLE, i;
    if(!isFinite(deg)) return NaN;
    if(deg <= T[0].deg) return T[0].sl;                 /* "2,5 ou mais" */
    for(i=0;i<T.length-1;i++)
      if(deg <= T[i+1].deg)
        return T[i].sl + (deg - T[i].deg)/(T[i+1].deg - T[i].deg)*(T[i+1].sl - T[i].sl);
    /* Entre o ultimo ponto da tabela (7 graus) e o angulo em que o texto trava
       de vez (8 graus), desce em rampa ate 1,4. O livro escreve "acima de 7 ou
       8 graus", e nao um degrau em 7: com o degrau seco, um quilo a mais no
       barco derrubava o teto 0,109 em V/√L de uma vez. */
    var ult = T[T.length-1];
    if(deg < GERR.BUTTOCK_TRAVA_DURA)
      return ult.sl + (deg - ult.deg)/(GERR.BUTTOCK_TRAVA_DURA - ult.deg)*
                      (GERR.SL_DESL_PRATICO - ult.sl);
    return GERR.SL_DESL_PRATICO;                        /* de 8 graus para cima */
  },

  /* Em que regime esta uma dada V/√L, com as palavras do capitulo. */
  regime: function(sl){
    if(!isFinite(sl) || sl <= 0) return { nome:'parado', cor:'muted' };
    if(sl < GERR.SL_HULL_SPEED)      return { nome:'deslocamento', cor:'green' };
    if(sl <= GERR.SL_DESL_FORCADO)   return { nome:'na velocidade de casco', cor:'green' };
    if(sl < GERR.SL_PLANING_FROM)    return { nome:'semi-planeio', cor:'amber' };
    return { nome:'planeio', cor:'blue' };
  },

  /* Regime de operação do motor: fração da potência nominal que se pode
     sustentar continuamente. Os dois números são os que o capítulo usa nos
     seus próprios exemplos. */
  DUTY: [
    { key:'diesel85', pct:85, rot:'diesel de serviço intermitente',
      nota:'80 a 90% da rotação máxima · Salty Bell: 413 ÷ 0,85 = 485 HP' },
    { key:'out70', pct:70, rot:'motor de popa leve, de alta rotação',
      nota:'70% do acelerador · Flying Spray: 300 ÷ 0,7 = 431 HP' },
    { key:'cont100', pct:100, rot:'nominal cheia, sem folga',
      nota:'sem folga de regime · só para pico instantâneo' }
  ]
};


/* ============================================================================
   O que os dois modos precisam calcular do MESMO jeito.

   As reguas dos cursores dependem do casco carregado: um bote de 375 kg e uma
   lancha de 6 m nao pedem a mesma escala. So que os dois modos compartilham o
   estado — o aluno alterna entre a aula e o painel de pagina unica levando o
   peso e a potencia junto — e se cada modo calculasse o proprio fundo de
   escala, o valor escolhido seria aparado ao atravessar e voltaria menor.
   Por isso o fundo de escala mora aqui, num lugar so.
   ============================================================================ */

/* Passo "redondo" para uma escala: 1, 2, 5 ou 10 vezes a potencia de dez.
   Vive aqui, e nao no modulo de graficos, porque as reguas dos cursores
   precisam dele antes de qualquer canvas existir. */
function niceStep(span, target){
  if(!(span > 0)) return 1;
  var raw = span/Math.max(1, target), p = Math.pow(10, Math.floor(Math.log(raw)/Math.LN10));
  var m = raw/p;
  var s = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return s*p;
}

/* A perda na transmissao e premissa do projetista — o capitulo nao da numero.
   O limite tem de ser o MESMO nos dois modos: era 12% num e 20% no outro, e uma
   perda de 15% digitada no painel voltava aparada da aula. */
var PERDA_MAX = 20;

/* Como chamar o regime de operacao escolhido. O painel deixa digitar uma fracao
   a mao, e nesse caso a chave e 'livre' — que a aula nao conhecia e rotulava,
   por escrito, como "nominal cheia". */
function rotuloDuty(key, pct){
  for(var i=0;i<GERR.DUTY.length;i++)
    if(GERR.DUTY[i].key === key) return GERR.DUTY[i].rot;
  return 'fração escolhida à mão' + (isFinite(pct) ? ', ' + Math.round(pct) + '%' : '');
}

/* A caixa deste elemento existe na tela? Um canvas dentro do modo escondido tem
   caixa zero: desenhar nele e trabalho jogado fora. */
function caixaVisivel(e){
  if(!e) return false;
  var r = e.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

/* Fundo de escala do peso: a capacidade ate a borda mais baixa, com uma folga
   por cima — o painel precisa deixar o aluno passar do limite para ver o aviso. */
function faixaPeso(capKg){
  var max = Math.ceil(Math.max(10, capKg)*1.15/10)*10;
  return { max:max, step:Math.max(1, Math.round(max/1000)), dec:0 };
}

/* Fundo de escala da potencia: a que levaria este peso a V/raizL = 4,5 por
   Crouch com C = 150 — bem dentro do planeio, sobrando regua por cima.
   `sugerida` e a potencia sugerida da tabela de cotas: a escala nunca pode
   ficar abaixo dela, senao trocar de casco aparava a propria sugestao. */
function faixaPotencia(raizL, LB, frac, sugerida){
  var shp = GERR.shpCrouch(150, 4.5*Math.max(1e-3, raizL), LB);
  var max = Math.max(10, shp/Math.max(1e-9, frac));
  if(isFinite(sugerida) && sugerida > 0) max = Math.max(max, sugerida*1.15);
  var s = niceStep(max, 1);
  max = Math.ceil(max/s)*s;
  return { max:max, step:max >= 400 ? 1 : 0.1, dec:max >= 400 ? 0 : 1 };
}


/* ============================================================================
   John Teale, "How to Design a Boat", 2a ed., capitulo 5 — o segundo parecer.

   Gerr chega a velocidade por uma curva empirica de libras por cavalo. Teale
   chega pelo outro lado: estima a RESISTENCIA do casco e converte em potencia.
   Sao dois caminhos independentes para o mesmo numero, e por isso vale ter os
   dois a vista — quando concordam, a estimativa ganha peso; quando divergem,
   a divergencia e a informacao.

   Fig 47 (p. 93) da a resistencia em LIBRAS POR TONELADA de deslocamento, em
   funcao da razao velocidade-comprimento, separada em friccional e residual.
   Fig 48 (p. 96) da o coeficiente prismatico otimo para cada razao.

   A conversao, na letra do livro (p. 94):
       BHP = 2 x R x V / 550
   com R a resistencia TOTAL em libras e V em pes por segundo. O "2 x" e um
   rendimento propulsivo total de 50%, e ele ja inclui helice E transmissao:
   por isso a potencia que sai daqui e a do VOLANTE do motor, e a perda no
   redutor NAO deve ser descontada outra vez.

   Faixa de validade: a Fig 47 vai de V/raizL 0,80 a 2,40 — que e exatamente o
   dominio do casco de deslocamento e do semi-deslocamento. Fora dela o metodo
   nao responde, e o painel diz isso em vez de extrapolar.

   As duas curvas foram digitalizadas do livro a 300/600 dpi, com os eixos
   calibrados pelas linhas de grade (+-1 lb/ton na Fig 47, +-0,003 em Cp na
   Fig 48) e reamostradas em passo de 0,05.
   ============================================================================ */
var TEALE = {

  /* ------------------------------------------------- Fig 47, p. 93
     [ V/raizL, residual, friccional ] em libras por tonelada longa.
     ATENCAO a leitura do desenho: as duas curvas se cruzam em V/raizL ~1,05.
     A esquerda do cruzamento a mais alta e a FRICCIONAL; a direita, a residual
     e a que dispara. Trocar os ramos e o erro facil, e o texto do livro
     confirma esta leitura ("initially, frictional resistance is the greater
     absorber of power but at a speed/length ratio of about 1.05 their effects
     are about equal"). */
  FIG47: [
    [0.80,   1.2, 10.0], [0.85,   2.7, 10.3], [0.90,   4.9, 10.7],
    [0.95,   7.1, 11.2], [1.00,   9.4, 11.7], [1.05,  11.7, 12.0],
    [1.10,  13.3, 13.3], [1.15,  16.7, 14.0], [1.20,  23.0, 14.6],
    [1.25,  32.7, 15.4], [1.30,  46.4, 16.4], [1.35,  64.1, 17.4],
    [1.40,  80.4, 18.5], [1.45,  92.8, 19.6], [1.50, 103.0, 20.6],
    [1.55, 111.4, 21.8], [1.60, 118.4, 23.1], [1.65, 124.7, 24.4],
    [1.70, 130.0, 25.7], [1.75, 134.5, 27.2], [1.80, 138.4, 28.6],
    [1.85, 141.7, 30.1], [1.90, 144.4, 31.7], [1.95, 146.5, 33.5],
    [2.00, 148.3, 35.3], [2.05, 149.8, 37.1], [2.10, 151.0, 39.0],
    [2.15, 152.1, 40.7], [2.20, 153.0, 42.8], [2.25, 153.7, 44.8],
    [2.30, 154.3, 47.0], [2.35, 154.7, 49.4], [2.40, 154.9, 51.3]
  ],

  /* --------------------------------------------------- Fig 48, p. 96
     [ V/raizL, Cp otimo ]. Comeca em 0,60 — mais cedo que a Fig 47. */
  FIG48: [
    [0.60, 0.526], [0.65, 0.526], [0.70, 0.526], [0.75, 0.526], [0.80, 0.525],
    [0.85, 0.523], [0.90, 0.519], [0.95, 0.516], [1.00, 0.516], [1.05, 0.522],
    [1.10, 0.532], [1.15, 0.552], [1.20, 0.578], [1.25, 0.599], [1.30, 0.614],
    [1.35, 0.626], [1.40, 0.635], [1.45, 0.643], [1.50, 0.650], [1.55, 0.656],
    [1.60, 0.661], [1.65, 0.665], [1.70, 0.669], [1.75, 0.672], [1.80, 0.674],
    [1.85, 0.676], [1.90, 0.678], [1.95, 0.679], [2.00, 0.679]
  ],

  SL_MIN: 0.80, SL_MAX: 2.40,        /* o que a Fig 47 desenha */
  /* Quando dois metodos independentes "concordam"? O limiar tem de ser
     relativo: 0,35 no e muito num bote de 5 nos e pouco numa lancha de 20. */
  concordam: function(a, b){
    if(!isFinite(a) || !isFinite(b)) return false;
    return Math.abs(a - b) <= Math.max(0.3, 0.08*Math.max(a, b));
  },
  CP_MIN: 0.60, CP_MAX: 2.00,        /* o que a Fig 48 desenha */
  PC: 0.5,                           /* o "2 x" — rendimento propulsivo total */
  /* O livro arredonda 1 no para 1,68 pe/s; o valor exato muda a potencia em
     0,46%, muito abaixo do erro de leitura das curvas. Usamos o exato e
     conferimos os exemplos do livro dentro desse desvio. */
  FTS_POR_NO: 1.6878098571,

  /* interpolacao linear numa das tabelas; devolve NaN fora da faixa */
  _interp: function(T, x, col){
    var i;
    if(!isFinite(x) || x < T[0][0] || x > T[T.length-1][0]) return NaN;
    for(i=0;i<T.length-1;i++){
      if(x <= T[i+1][0]){
        var t = (x - T[i][0])/(T[i+1][0] - T[i][0]);
        return T[i][col] + t*(T[i+1][col] - T[i][col]);
      }
    }
    return T[T.length-1][col];
  },

  /* Resistencia por tonelada de deslocamento, em libras, na Fig 47. */
  residualPorTon:  function(sl){ return TEALE._interp(TEALE.FIG47, sl, 1); },
  friccionalPorTon:function(sl){ return TEALE._interp(TEALE.FIG47, sl, 2); },
  totalPorTon:     function(sl){
    var r = TEALE.residualPorTon(sl), f = TEALE.friccionalPorTon(sl);
    return (isFinite(r) && isFinite(f)) ? r + f : NaN;
  },

  /* Coeficiente prismatico otimo da Fig 48. */
  cpOtimo: function(sl){ return TEALE._interp(TEALE.FIG48, sl, 1); },

  /* BHP = 2 x R x V / 550, com R em libras e V em pes por segundo.
     ton = deslocamento em toneladas longas; kts = velocidade em nos.        */
  bhp: function(sl, ton, kts){
    var rPorTon = TEALE.totalPorTon(sl);
    if(!isFinite(rPorTon) || !(ton > 0) || !(kts > 0)) return NaN;
    var R = rPorTon*ton;                                   /* libras */
    return (R*kts*TEALE.FTS_POR_NO/550)/TEALE.PC;
  },

  /* A potencia de volante que este casco pede para andar a esta razao. */
  bhpEm: function(sl, ton, raizLft){
    return TEALE.bhp(sl, ton, sl*raizLft);
  },

  /* O caminho inverso: dada a potencia de volante disponivel, em que razao
     velocidade-comprimento o barco anda? A potencia cresce monotonicamente
     com a razao (a resistencia sobe e a velocidade tambem), entao a biseccao
     acha a raiz sem sobressalto.
     Devolve { sl, kts, bhp, fora } — 'fora' diz para que lado saiu da faixa. */
  slDeBhp: function(bhpDisp, ton, raizLft){
    if(!(bhpDisp > 0) || !(ton > 0) || !(raizLft > 0))
      return { sl:NaN, kts:NaN, bhp:NaN, fora:'sem dados' };
    var lo = TEALE.SL_MIN, hi = TEALE.SL_MAX;
    var pLo = TEALE.bhpEm(lo, ton, raizLft), pHi = TEALE.bhpEm(hi, ton, raizLft);
    if(bhpDisp < pLo)
      return { sl:NaN, kts:NaN, bhp:pLo, fora:'abaixo' };
    if(bhpDisp > pHi)
      return { sl:NaN, kts:NaN, bhp:pHi, fora:'acima' };
    var i, m = lo;
    for(i=0;i<60;i++){
      m = (lo + hi)/2;
      if(TEALE.bhpEm(m, ton, raizLft) < bhpDisp) lo = m; else hi = m;
    }
    m = (lo + hi)/2;
    return { sl:m, kts:m*raizLft, bhp:TEALE.bhpEm(m, ton, raizLft), fora:'' };
  }
};

/* ----------------------------------------------------------------------------
   A leitura completa, num lugar so.

   Os dois modos do painel chamam esta funcao — se cada um montasse a sua, eles
   acabariam divergindo, que foi exatamente o que aconteceu com as reguas dos
   cursores antes de existir comum.js.

   Entra:
     LB       deslocamento em libras
     raizL    raiz do comprimento de linha d'agua em pes
     BHPcat   potencia de catalogo, no volante
     dutyPct  regime de operacao, em % — a fracao da nominal que o motor entrega
              continuamente. A perda no redutor NAO entra: ela ja esta dentro do
              "2 x" de Teale, e desconta-la de novo seria conta dobrada.
     ktsLida  a velocidade que o painel esta reportando (ja com o teto aplicado)
     cp       o coeficiente prismatico medido na tabela de cotas
     planeio  verdadeiro se o regime escolhido for planeio — ai o metodo nao vale
   ---------------------------------------------------------------------------- */
TEALE.leitura = function(o){
  var ton     = o.LB/2240;
  var bhpDisp = o.BHPcat*(o.dutyPct/100);
  var raizL   = o.raizL;
  var slLida  = raizL > 1e-9 ? o.ktsLida/raizL : 0;

  var r = {
    aplicavel: !o.planeio,
    ton: ton, bhpDisp: bhpDisp, slLida: slLida, ktsLida: o.ktsLida,
    cp: o.cp, cpOtimo: TEALE.cpOtimo(slLida),
    rRes: NaN, rFric: NaN, rTot: NaN, R: NaN, bhpPede: NaN,
    dentro: false, sl: NaN, kts: NaN, fora: 'sem dados'
  };
  if(!r.aplicavel) return r;

  /* o que a Fig 47 diz na razao em que o painel esta lendo */
  r.rRes  = TEALE.residualPorTon(slLida);
  r.rFric = TEALE.friccionalPorTon(slLida);
  r.rTot  = TEALE.totalPorTon(slLida);
  r.dentro = isFinite(r.rTot);
  if(r.dentro){
    r.R = r.rTot*ton;
    r.bhpPede = TEALE.bhp(slLida, ton, o.ktsLida);
  }

  /* e o caminho inverso: onde a potencia disponivel chega */
  var inv = TEALE.slDeBhp(bhpDisp, ton, raizL);
  r.sl = inv.sl; r.kts = inv.kts; r.fora = inv.fora; r.bhpLimite = inv.bhp;
  return r;
};


if(typeof module !== 'undefined')
  module.exports = { parseOffsets:parseOffsets, makeHull:makeHull, buildGrid:buildGrid,
                     hydroAt:hydroAt, solveDraft:solveDraft, volumeAtSheer:volumeAtSheer,
                     GERR:GERR, TEALE:TEALE };
