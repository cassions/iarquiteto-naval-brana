// ============================================================================
// Nucleo: leitura da tabela de cotas, geometria do casco e motor de equilibrio.
// Nao toca no DOM - roda igual no navegador e no Node, e e assim que o gerador
// confere a tabela e a hidrostatica antes de escrever a pagina.
// A tabela do usuario e injetada no lugar do marcador, na hora de gerar.
// ============================================================================
var USER_TSV = __USER_TSV_JSON__;

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
  } else if(temP && dec === ','){
    /* A tabela ja decidiu por virgula decimal, entao um ponto sozinho so pode ser
       separador de milhar: "1.500" e mil e quinhentos, nao um e meio. Sem esta
       linha o x das balizas vinha dividido por mil e o casco encolhia em silencio. */
    s = s.split('.').join('');
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
/* ---------------------------------------------------------------- malhagem --
   Um anel por baliza, da borda de bombordo em volta da quilha ate a borda de
   estibordo, para a superficie ser uma grade unica sem costura na linha de centro. */
/* ---------------------------------------------------------- espelho de popa --
   Cria o espelho cortando o casco por um plano — sempre plano. O plano e
   ancorado na BORDA: em x = CUT.pos ele encontra o tosado, e dali desce para
   vante com a inclinacao pedida. Ancorar no ponto mais a re e o que faz o corte
   nunca precisar de casco a re da primeira baliza: a inclinacao sempre remove
   material para vante e para baixo, como num espelho real.

     f(x,z) = cos(t)*(x - pos) + sin(t)*(z - zref) >= 0   fica no casco

   Em x constante o plano e uma reta horizontal na altura cutZAtX(x), entao
   recortar uma baliza e so cortar a poligonal por baixo nessa altura — e a
   hidrostatica segue usando o mesmo integrador, sem saber que existe um plano.
   Com rake = 0 na primeira baliza o casco e exatamente o de antes. */
var CUT = { on:true, pos:0, rake:0, zref:0, xKeel:0 };

function cutZAtX(x){
  var t = CUT.rake*Math.PI/180, sn = Math.sin(t);
  if(sn < 1e-6) return (x >= CUT.pos) ? -Infinity : Infinity;
  return CUT.zref - (x - CUT.pos)*Math.cos(t)/sn;
}

/* Reancora o plano e acha onde ele encontra a quilha (o pe do espelho). */
function cutSync(hull){
  var xa = hull.X0, xb = hull.X0 + hull.LOA;
  CUT.pos = Math.max(xa, Math.min(CUT.pos, xa + hull.LOA*0.9));
  CUT.zref = hull.section(CUT.pos).zs;
  CUT.xKeel = CUT.pos;
  if(Math.sin(CUT.rake*Math.PI/180) >= 1e-6){
    var lo = CUT.pos, hi = xb, i, mid;
    if(cutZAtX(hi) - hull.section(hi).zk < 0){
      for(i=0;i<60;i++){                       /* g(x) = plano - quilha, decrescente */
        mid = (lo+hi)/2;
        if(cutZAtX(mid) - hull.section(mid).zk > 0) lo = mid; else hi = mid;
      }
      CUT.xKeel = (lo+hi)/2;
    } else CUT.xKeel = xb;
  }
}

function xAft(hull){ return CUT.on ? CUT.pos : hull.X0; }
function xLen(hull){ return hull.X0 + hull.LOA - xAft(hull); }

/* Meia-baliza recortada por baixo no plano. Devolve sempre n+1 pontos, senao a
   grade da malha perde a topologia; null quando a baliza ficou toda a re. */
function halfPolyCut(s, n, x){
  var full = halfPoly(s, n);
  if(!CUT.on) return full;
  var zc = cutZAtX(x);
  if(zc > s.zs + 1e-9) return null;
  if(zc <= s.zk + 1e-9) return full;
  var out = [], i, span = s.zs - zc;
  for(i=0;i<=n;i++){
    var z = zc + span*i/n, y = yAtZ(full, z);
    out.push([ y === null ? 0 : y, z ]);
  }
  return out;
}
function ringAt(hull, x, np){
  var half = halfPolyCut(hull.section(x), np, x), i, ring = [];
  if(half === null) return null;
  /* Emite 2*(np+1) pontos SEMPRE, inclusive os dois da quilha. Sem corte eles
     coincidem (triangulo degenerado, inofensivo); com corte se separam, e a
     abertura do fundo e exatamente onde entra a face do espelho. */
  for(i=half.length-1;i>=0;i--) ring.push([-half[i][0], half[i][1]]);
  for(i=0;i<half.length;i++)    ring.push([ half[i][0], half[i][1]]);
  return ring;
}

function buildMesh(hull, NL, np){
  var R = 2*(np+1), i, j;
  var pos = new Float32Array((NL+1)*R*3);
  var nrm = new Float32Array((NL+1)*R*3);
  var idx = [];
  for(i=0;i<=NL;i++){
    var x = xAft(hull) + xLen(hull)*i/NL;
    var ring = ringAt(hull, x, np);
    if(ring === null) ring = ringAt(hull, xAft(hull), np);
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
  var pos = [], nrm = [], idx = [], i;
  var t = CUT.rake*Math.PI/180;

  /* A prumo (ou corte desligado): face vertical na baliza mais a re. */
  if(!CUT.on || Math.sin(t) < 1e-6){
    var xa = xAft(hull), ring = ringAt(hull, xa, np), n = ring.length;
    var cy = 0, cz = 0;
    for(i=0;i<n;i++){ cy += ring[i][0]; cz += ring[i][1]; }
    cy /= n; cz /= n;
    pos.push(xa/1000, cy/1000, cz/1000); nrm.push(-1,0,0);
    for(i=0;i<n;i++){ pos.push(xa/1000, ring[i][0]/1000, ring[i][1]/1000); nrm.push(-1,0,0); }
    for(i=1;i<n;i++) idx.push(0, i+1, i);
    idx.push(0, 1, n);
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: idx };
  }

  /* Inclinado: faixa plana da aresta superior (na borda, em CUT.pos) ate o pe na
     quilha. Todos os pontos satisfazem f = 0, logo a face sai plana. */
  var nx = -Math.cos(t), nz = -Math.sin(t), M = 64, seg = [];
  for(i=0;i<=M;i++){
    var x = CUT.pos + (CUT.xKeel - CUT.pos)*i/M;
    var sc = hull.section(x), z = cutZAtX(x);
    z = Math.max(Math.min(z, sc.zs), sc.zk);
    var y = yAtZ(halfPoly(sc, np), z);
    seg.push([x, (y === null ? 0 : y), z]);
  }
  for(i=0;i<seg.length;i++){
    pos.push(seg[i][0]/1000, -seg[i][1]/1000, seg[i][2]/1000); nrm.push(nx,0,nz);
    pos.push(seg[i][0]/1000,  seg[i][1]/1000, seg[i][2]/1000); nrm.push(nx,0,nz);
  }
  for(i=0;i<seg.length-1;i++){
    var a = i*2, b = i*2+1, c = i*2+2, d = i*2+3;
    idx.push(a,c,b, b,c,d);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: idx };
}

/* Conves: superficie regrada entre as duas bordas. */
function buildDeck(hull, NL){
  var pos = [], nrm = [], idx = [], i;
  for(i=0;i<=NL;i++){
    var x = xAft(hull) + xLen(hull)*i/NL, s = hull.section(x);
    pos.push(x/1000, -s.ys/1000, s.zs/1000);  nrm.push(0,0,1);
    pos.push(x/1000,  s.ys/1000, s.zs/1000);  nrm.push(0,0,1);
  }
  for(i=0;i<NL;i++){
    var a = i*2, b = i*2+1, c = i*2+2, d = i*2+3;
    idx.push(a,c,b, b,c,d);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: idx };
}

// ============================================================================
// Equilibrio livre: o plano d'agua deixa de ser dado e passa a ser incognita.
//
// No visualizador anterior o calado era um botao - voce escolhia a altura da agua
// e o casco respondia com deslocamento e centros. Aqui a pergunta se inverte, que
// e como ela aparece no projeto: dado o PESO e onde ele esta (o CG), em que
// posicao o casco flutua? A resposta tem tres numeros - quanto afunda, quanto
// inclina de banda, quanto inclina de trim - e sai de tres condicoes:
//
//   1)  rho * V(plano)  =  peso
//   2)  (G - B) . e1    =  0        sem momento longitudinal  -> trim
//   3)  (G - B) . e2    =  0        sem momento transversal   -> banda
//
// e1 e e2 sao os dois eixos que ficam DENTRO do plano d'agua; as condicoes 2 e 3
// dizem apenas que B fica exatamente sob G. O plano e descrito pela sua normal
// n(trim, banda) e pela distancia d a origem: imerso onde n.p <= d.
// ============================================================================

var RAD = Math.PI/180, DEG = 180/Math.PI;

/* Base do plano d'agua escrita nos eixos do casco. Sao as linhas da matriz
   R = Ry(trim) * Rx(-banda), que leva casco -> mundo:

     n  = "para cima" verdadeiro                  trim  > 0 afunda a PROA
     e1 = horizontal, no plano vertical longitudinal
     e2 = horizontal, transversal                 banda > 0 afunda ESTIBORDO

   Fixar a convencao aqui, uma vez, e o que faz os sinais fecharem depois: com
   esta base os dois passos de Newton ficam ambos +r/GM, sem excecao de sinal. */
function nVec(th, ps){
  var ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ps), sp = Math.sin(ps);
  return [-st, -ct*sp, ct*cp];
}
function e1Vec(th, ps){
  var ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ps), sp = Math.sin(ps);
  return [ct, -st*sp, st*cp];
}
function e2Vec(th, ps){ return [0, Math.cos(ps), Math.sin(ps)]; }

/* Altura da superficie da agua, medida no eixo z do casco, sobre o ponto (x,y).
   Dentro de uma baliza (x fixo) e uma reta de declividade tan(banda) - e e por
   isso que a area imersa da baliza deixa de ser a integral de y dz e passa a ser
   um recorte de poligono. */
function zWater(x, y, d, th, ps){
  var ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ps), sp = Math.sin(ps);
  return (d + x*st)/(ct*cp) + y*sp/cp;
}

/* ------------------------------------------------------------- secoes em cache
   A geometria nao muda quando o CG anda, mas cada movimento de slider pede umas
   oitenta integracoes ao longo do casco. Montar a baliza custa caro - dentro de
   section() ha uma busca por secao dourada para o expoente da super-elipse -
   entao as balizas sao levantadas uma vez por casco e o solver so recorta
   poligonos ja prontos.

   Todas as balizas vivem num unico Float64Array, y e z intercalados, com passo
   fixo de m vertices por anel. Guardar array de pares custava 1,1 us por vertice
   contra 12 ns aqui: o laco quente le memoria contigua e nao persegue ponteiro
   nenhum. Nesta escala a diferenca e entre 170 ms e 4 ms por solucao - entre um
   slider que arrasta e um que acompanha a mao. */
var SEC = { N:0, dx:0, np:0, m:0, x0:0, x1:0, P:null, xs:null, ys:null, zs:null,
            zk:null, Vtot:0, zTop:0, zBot:0, yMax:0 };

function buildSections(hull, N, np){
  var xa = xAft(hull), L = xLen(hull), i, j;
  var m = 2*(np + 1);
  SEC.N = N; SEC.dx = L/N; SEC.np = np; SEC.m = m; SEC.x0 = xa; SEC.x1 = xa + L;
  SEC.xs = new Float64Array(N+1);
  SEC.ys = new Float64Array(N+1);
  SEC.zs = new Float64Array(N+1);
  SEC.zk = new Float64Array(N+1);
  SEC.P  = new Float64Array((N+1)*m*2);
  var zTop = -Infinity, zBot = Infinity, yMax = 0, prev = null;
  for(i=0;i<=N;i++){
    var x = xa + L*i/N, s = hull.section(x);
    var ring = ringAt(hull, x, np);
    if(ring === null || ring.length !== m) ring = prev;
    if(ring === null){                                   /* nao deve acontecer */
      ring = [];
      for(j=0;j<m;j++) ring.push([0, s.zk + (s.zs - s.zk)*Math.abs(j - m/2)/(m/2)]);
    }
    prev = ring;
    var o = i*m*2;
    for(j=0;j<m;j++){
      var y = ring[j][0], z = ring[j][1];
      SEC.P[o + j*2]     = y;
      SEC.P[o + j*2 + 1] = z;
      if(z > zTop) zTop = z;
      if(z < zBot) zBot = z;
      if(y > yMax) yMax = y; else if(-y > yMax) yMax = -y;
    }
    SEC.xs[i] = x; SEC.ys[i] = s.ys; SEC.zs[i] = s.zs;
    SEC.zk[i] = SEC.P[o + Math.min(np, m-1)*2 + 1];
  }
  SEC.zTop = zTop; SEC.zBot = zBot; SEC.yMax = yMax;
  SEC.Vtot = floatState(0, 0, zTop + 1e6, false).V;   /* plano muito acima: solido inteiro */
  return SEC;
}

/* --------------------------------------------------------- recorte da baliza --
   Sutherland-Hodgman contra o semiplano g(y,z) = cy*y + cz*z - k <= 0, com a
   soma de Gauss da area e do centroide acumulada no mesmo passeio. O poligono
   recortado nunca existe como lista - so como as tres somas que interessam e as
   travessias da linha d'agua. Tudo em variaveis locais: numa solucao de
   equilibrio este laco roda um milhao de vezes, e ali dentro nao pode haver
   alocacao nem leitura de estado global. */
var _A2 = 0, _C6y = 0, _C6z = 0, _nc = 0;
var _cross = new Float64Array(32);

function clipAccum(P, off, n, cy, cz, k){
  var A2 = 0, C6y = 0, C6z = 0;
  var pY = 0, pZ = 0, fY = 0, fZ = 0, has = 0, nc = 0;
  var i, t, y, z, g, cr, ey, ez, o = off + (n-1)*2;
  var yP = P[o], zP = P[o+1], gP = cy*yP + cz*zP - k;
  for(i=0;i<n;i++){
    o = off + i*2;
    y = P[o]; z = P[o+1]; g = cy*y + cz*z - k;
    if(g <= 0){
      if(gP > 0){                                  /* entra na agua: emite o corte */
        t = gP/(gP - g); ey = yP + (y - yP)*t; ez = zP + (z - zP)*t;
        if(has){ cr = pY*ez - ey*pZ; A2 += cr; C6y += (pY + ey)*cr; C6z += (pZ + ez)*cr; }
        else   { fY = ey; fZ = ez; has = 1; }
        pY = ey; pZ = ez;
        if(nc < 32) _cross[nc++] = ey;
      }
      if(has){ cr = pY*z - y*pZ; A2 += cr; C6y += (pY + y)*cr; C6z += (pZ + z)*cr; }
      else   { fY = y; fZ = z; has = 1; }
      pY = y; pZ = z;
    } else if(gP <= 0){                            /* sai da agua: so o corte */
      t = gP/(gP - g); ey = yP + (y - yP)*t; ez = zP + (z - zP)*t;
      if(has){ cr = pY*ez - ey*pZ; A2 += cr; C6y += (pY + ey)*cr; C6z += (pZ + ez)*cr; }
      else   { fY = ey; fZ = ez; has = 1; }
      pY = ey; pZ = ez;
      if(nc < 32) _cross[nc++] = ey;
    }
    yP = y; zP = z; gP = g;
  }
  if(has){ cr = pY*fZ - fY*pZ; A2 += cr; C6y += (pY + fY)*cr; C6z += (pZ + fZ)*cr; }
  _A2 = A2; _C6y = C6y; _C6z = C6z; _nc = nc;
}
/* Ordena as travessias: sao 2 na baliza normal, 4 ou 6 quando a agua corta a
   baliza em mais de um trecho. Pares consecutivos sao as cordas molhadas, pela
   regra da paridade. */
function sortCross(n){
  for(var i=1;i<n;i++){
    var v = _cross[i], j = i-1;
    while(j >= 0 && _cross[j] > v){ _cross[j+1] = _cross[j]; j--; }
    _cross[j+1] = v;
  }
}

/* ------------------------------------------------------------ estado flutuante
   Uma passada pelas balizas devolve tudo o que o equilibrio precisa: volume,
   centro de carena e as propriedades do plano d'agua.

   O plano d'agua nao e malhado. As coordenadas (a,b) DENTRO do plano se ligam as
   do casco por uma transformacao afim de jacobiano 1/(cos t . cos p):

     a = x/cos(t) + d.tan(t)                       depende so de x
     b = y/cos(p) + (d + x.sen t).tan(p)/cos(t)

   entao area, centro de flutuacao e os dois momentos de inercia saem
   analiticamente, corda por corda, integrando y^0, y^1 e y^2 ao longo de cada
   corda molhada. Os momentos de inercia sao o jacobiano do passo de Newton dos
   angulos; a area e a derivada exata dV/dd do passo do calado. */
function floatState(th, ps, d, extra){
  var st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ps), cp = Math.cos(ps);
  var cy = -ct*sp, cz = ct*cp, al = 1/ct, be = 1/cp;
  var N = SEC.N, m = SEC.m, dx = SEC.dx, P = SEC.P, xs = SEC.xs, i, j;
  var V = 0, Mx = 0, My = 0, Mz = 0;
  var Awp = 0, Ma = 0, Mb = 0, Maa = 0, Mbb = 0;
  var aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
  var amx = 0, amxX = SEC.x0;
  var secA = extra ? new Float64Array(N+1) : null;
  var wl = extra ? [] : null;
  var dtc = d*st/ct, spct = sp/(cp*ct), alb = al*be, be2 = be*be;

  for(i=0;i<=N;i++){
    var x = xs[i], k = d + x*st, fw = ((i === 0 || i === N) ? 0.5 : 1)*dx;
    clipAccum(P, i*m*2, m, cy, cz, k);
    var A = _A2*0.5;
    if(A > 1e-9){
      V  += A*fw;
      Mx += A*x*fw;
      My += (_C6y/(3*_A2))*A*fw;
      Mz += (_C6z/(3*_A2))*A*fw;
      if(A > amx){ amx = A; amxX = x; }
    } else A = 0;
    if(secA) secA[i] = A;

    var nc = _nc;
    if(nc >= 2){
      if(nc > 2) sortCross(nc);
      else if(_cross[0] > _cross[1]){ var tmp = _cross[0]; _cross[0] = _cross[1]; _cross[1] = tmp; }
      var S0 = 0, S1 = 0, S2 = 0;
      for(j=0;j+1<nc;j+=2){
        var y0 = _cross[j], y1 = _cross[j+1];
        S0 += y1 - y0;
        S1 += (y1*y1 - y0*y0)*0.5;
        S2 += (y1*y1*y1 - y0*y0*y0)/3;
      }
      var a = x*al + dtc, q = k*spct, f = alb*fw;
      Awp += f*S0;
      Ma  += f*a*S0;
      Mb  += f*(be*S1 + q*S0);
      Maa += f*a*a*S0;
      Mbb += f*(be2*S2 + 2*be*q*S1 + q*q*S0);
      if(S0 > 1e-9){
        if(a < aMin) aMin = a;
        if(a > aMax) aMax = a;
        var b0 = be*_cross[0] + q, b1 = be*_cross[nc-1] + q;
        if(b0 < bMin) bMin = b0;
        if(b1 > bMax) bMax = b1;
      }
      if(extra) wl.push([x, _cross[0], _cross[nc-1]]);
    } else if(extra) wl.push(null);
  }

  var ok = V > 1e-6;
  return {
    d:d, th:th, ps:ps, V:V,
    B: ok ? [Mx/V, My/V, Mz/V] : [SEC.x0, 0, SEC.zBot],
    Awp:Awp,
    aF: Awp > 1e-6 ? Ma/Awp : 0,
    bF: Awp > 1e-6 ? Mb/Awp : 0,
    IL: Awp > 1e-6 ? Math.max(0, Maa - Ma*Ma/Awp) : 0,
    IT: Awp > 1e-6 ? Math.max(0, Mbb - Mb*Mb/Awp) : 0,
    Lwl: (aMax > aMin) ? aMax - aMin : 0,
    Bwl: (bMax > bMin) ? bMax - bMin : 0,
    Amax: amx, AmaxX: amxX, secA: secA, wl: wl
  };
}

/* Intervalo de d que garante o Newton do calado: precisa de um dLo com volume
   zero e um dHi com o casco todo submerso. Os extremos da CAIXA envolvente
   servem, e saem em aritmetica de intervalo, sem varrer vertice nenhum - a caixa
   contem o casco, entao o intervalo dela contem o do casco. Varrer os 10 mil
   vertices para apertar o intervalo custava tanto quanto uma integracao inteira
   e economizava, no fim, meia iteracao de Newton. */
function dRange(th, ps){
  var nn = nVec(th, ps), i;
  var xs = [SEC.x0, SEC.x1], ys = [-SEC.yMax, SEC.yMax], zs = [SEC.zBot, SEC.zTop];
  var lo = 0, hi = 0;
  var pr = [[nn[0], xs], [nn[1], ys], [nn[2], zs]];
  for(i=0;i<3;i++){
    var c = pr[i][0], v0 = c*pr[i][1][0], v1 = c*pr[i][1][1];
    lo += Math.min(v0, v1); hi += Math.max(v0, v1);
  }
  return [lo, hi];
}

/* --------------------------------------------------------------- calado -------
   Acha d tal que V = Vt, com a inclinacao congelada. Newton com dV/dd = Awp
   exata, dentro de um intervalo que so encolhe: converge em 4 a 6 passadas e nao
   tem como escapar, mesmo quando a area do plano d'agua vai a zero - proa fina
   emergindo, casco quase todo submerso. */
function solveD(th, ps, Vt, guess, extra){
  var rg = dRange(th, ps), dLo = rg[0], dHi = rg[1];
  if(Vt >= SEC.Vtot){
    return { d:dHi, st:floatState(th, ps, dHi, extra), full:true, iters:0 };
  }
  var d = (guess !== undefined && isFinite(guess) && guess > dLo && guess < dHi)
        ? guess : dLo + (dHi - dLo)*0.3;
  var i, stv, done = false;
  for(i=0;i<80;i++){
    stv = floatState(th, ps, d, false);
    var e = stv.V - Vt;
    if(Math.abs(e) <= 1e-7*Vt){ done = true; break; }
    if(e < 0) dLo = d; else dHi = d;
    var nd = (stv.Awp > 1e-3) ? d - e/stv.Awp : 0.5*(dLo + dHi);
    if(!(nd > dLo && nd < dHi)) nd = 0.5*(dLo + dHi);
    if(Math.abs(nd - d) < 1e-9){ d = nd; done = true; break; }
    d = nd;
  }
  return { d:d, st:(extra || !done) ? floatState(th, ps, d, extra) : stv,
           full:false, iters:i };
}

/* ------------------------------------------------------------- equilibrio -----
   Newton nos angulos, com os momentos de inercia do plano d'agua como jacobiano:
   o braco residual cai GM por radiano, entao o passo e r/GM. Com GM nulo ou
   negativo o ponto e repulsor e o passo vira um empurrao de tamanho fixo na
   direcao que o braco manda - e assim o solver desce para a posicao adernada
   estavel em vez de ficar equilibrando faca em pe. */
var EQ_TOL = 0.02;                 /* mm de braco residual */
var EQ_MAX_STEP = 0.11;            /* rad por iteracao: 6,3 graus */
var EQ_TH_LIM = 0.87;              /* +-50 graus de trim  */
var EQ_PS_LIM = 1.31;              /* +-75 graus de banda */

function clampAng(a, lim){ return a < -lim ? -lim : (a > lim ? lim : a); }

/* A rigidez que o passo de Newton precisa e a derivada do braco residual em
   relacao ao angulo. Perto do prumo ela vale -GM, e o passo e r/GM. Em banda
   grande isso deixa de valer: o GM metacentrico e a inclinacao da curva de
   bracos NA ORIGEM, e num casco de bordo tombado ou com a borda embarcando a
   curva tem inclinacao propria - com GM negativo e equilibrio adernado, o passo
   metacentrico chega a apontar para o lado errado. Quando ha duas iteracoes na
   mao, a secante mede a inclinacao verdadeira ali, e e ela que manda. */
function pickStep(r, GM, slope){
  var s;
  if(slope !== null && slope < -1e-4) s = -r/slope;
  else if(GM > 1)                     s = r/GM;
  else return (r > 0 ? 1 : (r < 0 ? -1 : 0))*EQ_MAX_STEP*0.5;
  return s < -EQ_MAX_STEP ? -EQ_MAX_STEP : (s > EQ_MAX_STEP ? EQ_MAX_STEP : s);
}

/* Rigidez efetiva na posicao encontrada, por diferenca central a volume
   constante: quanto o braco residual anda por radiano. Perto do prumo reproduz o
   GM metacentrico; adernado, e este numero - e nao o GM - que diz se a posicao
   aguenta uma rajada. Sinal positivo, posicao estavel. */
function stiffness(Vt, G, th, ps, d){
  var h = 0.5*RAD;
  function r2at(p){
    var sd = solveD(th, p, Vt, d, false), B = sd.st.B, E2 = e2Vec(th, p);
    return (G[1]-B[1])*E2[1] + (G[2]-B[2])*E2[2];
  }
  function r1at(t){
    var sd = solveD(t, ps, Vt, d, false), B = sd.st.B, E1 = e1Vec(t, ps);
    return (G[0]-B[0])*E1[0] + (G[1]-B[1])*E1[1] + (G[2]-B[2])*E1[2];
  }
  return { T: -(r2at(ps+h) - r2at(ps-h))/(2*h),
           L: -(r1at(th+h) - r1at(th-h))/(2*h) };
}

function solveEquilibrium(Vt, G, seed, allowRetry){
  var th = (seed && isFinite(seed.th)) ? seed.th : 0;
  var ps = (seed && isFinite(seed.ps)) ? seed.ps : 0;
  var dG = (seed && isFinite(seed.d)) ? seed.d : undefined;
  var relax = 1, prev = Infinity, out = null, it, full = false, calls = 0;
  var hTh = NaN, hPs = NaN, hR1 = 0, hR2 = 0;      /* iteracao anterior: secante */

  for(it=0; it<60; it++){
    var sd = solveD(th, ps, Vt, dG, false);
    calls += sd.iters + 1;
    dG = sd.d;
    full = full || sd.full;
    var B = sd.st.B;
    var nn = nVec(th, ps), E1 = e1Vec(th, ps), E2 = e2Vec(th, ps);
    var gx = G[0] - B[0], gy = G[1] - B[1], gz = G[2] - B[2];
    var r1 = gx*E1[0] + gy*E1[1] + gz*E1[2];
    var r2 = gx*E2[0] + gy*E2[1] + gz*E2[2];
    var bg = gx*nn[0] + gy*nn[1] + gz*nn[2];
    var V  = sd.st.V > 1e-3 ? sd.st.V : 1e-3;
    var GML = sd.st.IL/V - bg, GMT = sd.st.IT/V - bg;
    var nrm = Math.abs(r1) + Math.abs(r2);
    out = { th:th, ps:ps, d:dG, r1:r1, r2:r2, bg:bg, GML:GML, GMT:GMT,
            BML:sd.st.IL/V, BMT:sd.st.IT/V, full:full, iters:it+1, calls:calls,
            conv:(nrm < EQ_TOL) };
    if(out.conv) break;
    var s1 = (isFinite(hTh) && Math.abs(th - hTh) > 1e-7) ? (r1 - hR1)/(th - hTh) : null;
    var s2 = (isFinite(hPs) && Math.abs(ps - hPs) > 1e-7) ? (r2 - hR2)/(ps - hPs) : null;
    hTh = th; hPs = ps; hR1 = r1; hR2 = r2;
    if(nrm > prev) relax = Math.max(0.15, relax*0.45);
    else           relax = Math.min(1, relax*1.3);
    prev = nrm;
    th = clampAng(th + relax*pickStep(r1, GML, s1), EQ_TH_LIM);
    ps = clampAng(ps + relax*pickStep(r2, GMT, s2), EQ_PS_LIM);
  }

  /* Casco a prumo com GM negativo e equilibrio de faca em pe: existe no papel e
     nao para de pe na agua. Se o solver aterrou nele, empurra a banda para os dois
     lados e procura a posicao adernada para onde o barco realmente cai. Se nem la
     houver rigidez positiva, nao existe equilibrio estavel dentro do limite - o
     casco capota, e e isso que fica marcado. */
  if(allowRetry !== false && out.conv && Math.abs(out.ps) < 0.3*RAD && out.GMT <= 0){
    var side = (G[1] > 1e-9) ? 1 : (G[1] < -1e-9 ? -1 : 1), k, seeds = [14, 40, 70];
    for(k=0;k<seeds.length;k++){
      var alt = solveEquilibrium(Vt, G, { th:out.th, ps:side*seeds[k]*RAD, d:out.d }, false);
      if(alt.conv && Math.abs(alt.ps) > 0.3*RAD &&
         stiffness(Vt, G, alt.th, alt.ps, alt.d).T > 0){
        alt.fromUnstable = true;
        out = alt;
        break;
      }
    }
    if(!out.fromUnstable) out.capsize = true;
  }
  if(Math.abs(out.ps) >= EQ_PS_LIM - 1e-6 || !out.conv) out.capsize = true;

  var fin = solveD(out.th, out.ps, Vt, out.d, true);
  out.st = fin.st;
  out.d  = fin.d;
  var kk = stiffness(Vt, G, out.th, out.ps, out.d);
  out.stiffT = kk.T; out.stiffL = kk.L;
  out.stable = kk.T > 0 && kk.L > 0 && !out.capsize;
  return out;
}

/* Ponto mais fundo e menor borda livre, ambos medidos perpendicularmente ao plano
   d'agua - que e como se le calado e borda livre num casco inclinado. */
function scanExtremes(d, th, ps){
  var nn = nVec(th, ps), n0 = nn[0], n1 = nn[1], n2 = nn[2];
  var N = SEC.N, m = SEC.m, P = SEC.P, i, j;
  var deep = -Infinity, deepX = 0, deepY = 0, deepZ = 0;
  var fb = Infinity, fbX = 0, fbSide = 1;
  for(i=0;i<=N;i++){
    var x = SEC.xs[i], base = n0*x, o = i*m*2;
    for(j=0;j<m;j++){
      var im = d - (base + n1*P[o + j*2] + n2*P[o + j*2 + 1]);
      if(im > deep){ deep = im; deepX = x; deepY = P[o + j*2]; deepZ = P[o + j*2 + 1]; }
    }
    var h = base + n2*SEC.zs[i] - d, ny = n1*SEC.ys[i];
    if(h + ny < fb){ fb = h + ny; fbX = x; fbSide = 1; }
    if(h - ny < fb){ fb = h - ny; fbX = x; fbSide = -1; }
  }
  return { deep:deep, deepX:deepX, deepY:deepY, deepZ:deepZ,
           fb:fb, fbX:fbX, fbSide:fbSide };
}

/* ------------------------------------------------------- curva de bracos ------
   GZ e a distancia horizontal entre as linhas de acao do peso e do empuxo. Aqui a
   banda e imposta, o volume e mantido e o trim fica congelado no valor do
   equilibrio - deixa-lo livre a cada angulo mudaria a curva nos angulos grandes,
   sobretudo em popa larga, e custaria uma ordem de grandeza mais de conta. */
function gzCurve(Vt, G, th, degFrom, degTo, step){
  var pts = [], a, dGuess;
  for(a = degFrom; a <= degTo + 1e-9; a += step){
    var ps = a*RAD;
    var sd = solveD(th, ps, Vt, dGuess, false);
    dGuess = sd.d;
    var B = sd.st.B, E2 = e2Vec(th, ps);
    var ex = scanExtremes(sd.d, th, ps);
    pts.push({ deg:a, gz:(B[1]-G[1])*E2[1] + (B[2]-G[2])*E2[2],
               fb:ex.fb, full:sd.full });
  }
  return pts;
}

/* Poligono de uma baliza do cache, em pares [y, z], para os desenhos 2D. */
function sectionPoly(i){
  var m = SEC.m, o = i*m*2, out = [], j;
  for(j=0;j<m;j++) out.push([SEC.P[o + j*2], SEC.P[o + j*2 + 1]]);
  return out;
}
/* Indice da baliza do cache mais proxima de x. */
function secIndexAt(x){
  var i = Math.round((x - SEC.x0)/(SEC.x1 - SEC.x0)*SEC.N);
  return i < 0 ? 0 : (i > SEC.N ? SEC.N : i);
}

/* Flutuacao a prumo para o mesmo volume: e dela que saem os numeros canonicos de
   estabilidade inicial - KB, BMt, GMt - que o projetista compara entre projetos.
   O GM que sai do equilibrio inclinado e outra coisa: e a rigidez naquela
   atitude, com o plano d'agua ja girado, e nao serve de referencia. */
function uprightState(Vt, G, guess){
  var sd = solveD(0, 0, Vt, guess, false), st = sd.st, B = st.B;
  var V = st.V > 1e-3 ? st.V : 1e-3;
  return { d:sd.d, T:sd.d - SEC.zBot, st:st, B:B,
           KB:B[2], BMT:st.IT/V, BML:st.IL/V,
           GMT:st.IT/V - (G[2] - B[2]), GML:st.IL/V - (G[2] - B[2]) };
}
