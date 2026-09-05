/* ============================================================================
   COTAS — a tabela do usuário vira a forma do casco.

   O painel de escantilhões nasceu com um envelope paramétrico: uma função que
   inventava a baliza a partir de LOA, boca, pontal e deadrise.  Aqui esse
   envelope é substituído pela tabela de cotas de verdade.  Tudo o que vem
   depois — perímetros, distribuição dos reforços, áreas, massa, desenhos —
   continua igual, porque continua consultando sect() e girthPt().

   Este arquivo roda nos dois lados: no Node, dentro do gerador, para conferir
   a tabela e levantar os particulares; e no navegador, dentro da página.
   É o mesmo código, então não existe um segundo leitor de tabela nesta skill.
   ========================================================================= */

/* a tabela do usuário, injetada pelo gerador */
var COTAS_TSV = __COTAS_TSV_JSON__;

/* ----------------------------------------------------------------- números */
function detectaSepDecimal(campos){
  var virg = 0, pont = 0;
  campos.forEach(function(c){
    if(/,\d/.test(c)) virg++;
    if(/\.\d/.test(c)) pont++;
  });
  return virg > pont ? ',' : '.';
}
function paraNumero(s, dec){
  var t = String(s).trim();
  if(dec === ',') t = t.replace(/\./g, '').replace(',', '.');
  else            t = t.replace(/,/g, '');
  var v = parseFloat(t);
  return isFinite(v) ? v : NaN;
}

/* ------------------------------------------------------- leitura da tabela */
/* Dois formatos, os mesmos das outras skills da Brana:

   QUINADO  baliza  x  mb_borda  mb_chine  altura_borda  altura_chine  altura_quilha  [deadrise]
   REDONDO  baliza  x  altura_quilha  altura_borda  mb_25pc … mb_75pc  mb_borda

   O formato sai do cabeçalho quando ele existe, e do número de colunas
   quando não existe.  Cotas em milímetros, medidas da linha de centro e da
   linha de base.                                                            */
function leCotas(texto){
  var linhas = String(texto).split(/\r?\n/), bruto = [], cab = null, num = [], i;
  for(i=0;i<linhas.length;i++){
    var ln = linhas[i].trim();
    if(!ln || ln.charAt(0) === '#') continue;
    var f = ln.split(/[\t;]|\s{1,}/).filter(function(s){ return s.length; });
    if(f.length < 5) continue;
    bruto.push(f);
  }
  if(!bruto.length) throw new Error('não achei nenhuma linha de dados na tabela');

  var todos = [];
  bruto.forEach(function(f){ f.forEach(function(c){
    if(/^[-+]?[\d.,]+$/.test(c)) todos.push(c); }); });
  var dec = detectaSepDecimal(todos);

  for(i=0;i<bruto.length;i++){
    var v = bruto[i].map(function(s){ return paraNumero(s, dec); });
    if(isFinite(v[1]) && isFinite(v[2]) && isFinite(v[3])) num.push(v);
    else if(!cab) cab = bruto[i].map(function(s){ return s.toLowerCase(); });
  }
  if(num.length < 3)
    throw new Error('são necessárias ao menos 3 balizas; encontrei ' + num.length);

  var modo = detectaFormato(cab, num[0]);
  var linhasOk = [], avisos = [];

  if(modo === 'quinado'){
    num.forEach(function(v){
      if(v.length < 7)
        throw new Error('o formato quinado pede 7 colunas; a baliza ' + v[0] +
                        ' tem ' + v.length);
      linhasOk.push({stn:v[0], x:v[1], ys:v[2], yc:v[3], zs:v[4], zc:v[5], zk:v[6]});
    });
  } else {
    var nc = num[0].length, nMid = nc - 5;
    if(nMid < 1)
      throw new Error('o formato redondo precisa de ao menos uma meia-boca ' +
        'intermediária entre a quilha e a borda — são 6 colunas no mínimo, e a ' +
        'sua tabela tem ' + nc + '. Sem nível intermediário a baliza vira uma ' +
        'reta da quilha ao trincaniz, e não há volta de bojo para separar o ' +
        'fundo do costado.');
    num.forEach(function(v){
      if(v.length !== nc)
        throw new Error('a baliza ' + v[0] + ' tem ' + v.length +
                        ' colunas, as outras têm ' + nc);
      var mids = [];
      for(var k=0;k<nMid;k++) mids.push(v[4+k]);
      linhasOk.push({stn:v[0], x:v[1], zk:v[2], zs:v[3], mids:mids, ys:v[4+nMid]});
    });
  }

  linhasOk.sort(function(a,b){ return a.x - b.x; });
  for(i=1;i<linhasOk.length;i++)
    if(linhasOk[i].x - linhasOk[i-1].x < 1e-9)
      throw new Error('duas balizas na mesma posição x = ' + linhasOk[i].x);

  linhasOk.forEach(function(r){
    ['x','zk','zs','ys'].forEach(function(k){
      if(!isFinite(r[k]))
        throw new Error('valor não numérico em ' + k + ' na baliza ' + r.stn);
    });
    if(r.zk > r.zs + 1e-6) avisos.push('baliza ' + r.stn + ': quilha acima da borda');
    if(r.ys < -1e-6)       avisos.push('baliza ' + r.stn + ': meia-boca negativa');
    if(modo === 'quinado'){
      if(r.yc > r.ys + 1e-6) avisos.push('baliza ' + r.stn + ': chine fora da borda');
      if(r.zk > r.zc + 1e-6) avisos.push('baliza ' + r.stn + ': quilha acima do chine');
      if(r.zc > r.zs + 1e-6) avisos.push('baliza ' + r.stn + ': chine acima da borda');
    } else {
      r.mids.forEach(function(m, k){
        if(!isFinite(m))
          throw new Error('meia-boca não numérica na baliza ' + r.stn);
        if(m > r.ys + 1e-6)
          avisos.push('baliza ' + r.stn + ': meia-boca do nível ' + (k+1) + ' fora da borda');
      });
    }
  });
  /* Se a quilha ficou acima da borda na maioria das balizas, as colunas
     foram lidas na ordem errada — quase sempre porque o formato foi
     detectado ao contrário.  Vale mais dizer isso do que deixar o casco
     sair de cabeça para baixo e falhar três passos adiante.               */
  var invertidas = linhasOk.filter(function(r){ return r.zk > r.zs; }).length;
  if(invertidas > linhasOk.length/2)
    throw new Error('em ' + invertidas + ' das ' + linhasOk.length + ' balizas a ' +
      'quilha saiu acima da borda. A tabela foi lida como formato "' + modo +
      '" — provavelmente é o outro. Ponha um cabeçalho: com a palavra ' +
      '"chine" nas colunas para o casco quinado, ou "altura_quilha" e ' +
      '"altura_borda" para o de bojo redondo.');

  return {modo:modo, linhas:linhasOk, avisos:avisos, nMid:(modo === 'redondo' ? num[0].length - 5 : 0)};
}

function detectaFormato(cab, primeira){
  if(cab){
    var s = cab.join(' ');
    /* 1. a palavra chine decide na hora, e vem antes de tudo: um cabeçalho
          quinado em português também traz "altura_quilha".                */
    if(/chine|quina/.test(s)) return 'quinado';
    /* 2. meia-boca em nível intermediário, com qualquer porcentagem        */
    if(/mb[_\s-]*\d|\d+\s*pc|_\d+pct|meio|mid/.test(s)) return 'redondo';
    /* 3. o par altura_quilha + altura_borda é a assinatura do redondo      */
    if(/quilha/.test(s) && /borda/.test(s)) return 'redondo';
  }
  /* sem cabeçalho: 7 ou 8 colunas -> quinado */
  return primeira.length >= 7 ? 'quinado' : 'redondo';
}

/* ------------------------------------------------- a baliza como polilinha */
/* Cada baliza vira uma polilinha da quilha à borda, em metros.  O número de
   vértices é o mesmo em todas, o que deixa a interpolação ao longo do
   comprimento ser vértice a vértice.                                        */
function polilinhas(lido){
  return lido.linhas.map(function(r){
    var pts;
    if(lido.modo === 'quinado'){
      pts = [[0, r.zk], [r.yc, r.zc], [r.ys, r.zs]];
    } else {
      pts = [[0, r.zk]];
      var n = r.mids.length;
      for(var k=0;k<n;k++)
        pts.push([r.mids[k], r.zk + (k+1)/(n+1) * (r.zs - r.zk)]);
      pts.push([r.ys, r.zs]);
    }
    return {x: r.x/1000, stn: r.stn,
            pts: pts.map(function(p){ return [p[0]/1000, p[1]/1000]; })};
  });
}

/* Onde o fundo vira costado.  No casco quinado é o chine, sem discussão.  No
   casco de bojo redondo não existe essa quina: adota-se o vértice em que a
   parede da baliza passa de 45°, que é o que um projetista chama de "volta
   do bojo".  O índice é decidido UMA vez, na baliza mais próxima da meia-nau,
   e vale para o casco inteiro — assim a divisão não fica pulando de vértice
   ao longo do comprimento.                                                  */
function achaVoltaDoBojo(rows, modo){
  if(modo === 'quinado') return 1;
  var xm = (rows[0].x + rows[rows.length-1].x) / 2, melhor = 0, dm = 1e9, i;
  for(i=0;i<rows.length;i++){
    var d = Math.abs(rows[i].x - xm);
    if(d < dm){ dm = d; melhor = i; }
  }
  var p = rows[melhor].pts, n = p.length - 1;
  for(i=0;i<n;i++){
    var dy = p[i+1][0] - p[i][0], dz = p[i+1][1] - p[i][1];
    if(Math.abs(dz) > Math.abs(dy)) return Math.max(1, i);   /* passou de 45° */
  }
  return Math.max(1, n - 1);
}
function limitaSplit(i, n){ return Math.max(1, Math.min(n - 1, i)); }

/* ------------------------------------------- interpolação ao longo do casco */
/* Monótona à la Fritsch–Carlson: passa por todos os pontos e não inventa
   ondulação entre balizas, que é o que uma spline comum faria num casco de
   poucas estações.                                                          */
function derivadasMonotonas(xs, ys){
  var n = xs.length, d = new Array(n), h = [], s = [], i;
  if(n === 2) return [ (ys[1]-ys[0])/(xs[1]-xs[0]), (ys[1]-ys[0])/(xs[1]-xs[0]) ];
  for(i=0;i<n-1;i++){ h.push(xs[i+1]-xs[i]); s.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i])); }
  d[0] = s[0]; d[n-1] = s[n-2];
  for(i=1;i<n-1;i++){
    if(s[i-1]*s[i] <= 0) d[i] = 0;
    else {
      var w1 = 2*h[i] + h[i-1], w2 = h[i] + 2*h[i-1];
      d[i] = (w1 + w2) / (w1/s[i-1] + w2/s[i]);
    }
  }
  return d;
}
function fazInterpolador(xs, ys){
  var d = derivadasMonotonas(xs, ys), n = xs.length;
  return function(x){
    if(x <= xs[0])   return ys[0]   + d[0]*(x - xs[0]);
    if(x >= xs[n-1]) return ys[n-1] + d[n-1]*(x - xs[n-1]);
    var lo = 0, hi = n-1;
    while(hi - lo > 1){ var m = (lo+hi) >> 1; if(xs[m] <= x) lo = m; else hi = m; }
    var h = xs[hi]-xs[lo], t = (x - xs[lo])/h;
    var h00 = 2*t*t*t - 3*t*t + 1, h10 = t*t*t - 2*t*t + t;
    var h01 = -2*t*t*t + 3*t*t,    h11 = t*t*t - t*t;
    return h00*ys[lo] + h10*h*d[lo] + h01*ys[hi] + h11*h*d[hi];
  };
}

/* ============================================================ CASCO PRONTO */
var CASCO = null;
function montaCasco(texto){
  var lido = leCotas(texto);
  var rows = polilinhas(lido);
  var nV = rows[0].pts.length;
  var iSplit = limitaSplit(achaVoltaDoBojo(rows, lido.modo), nV - 1);
  var xs = rows.map(function(r){ return r.x; });
  var x0 = xs[0], LOA0 = xs[xs.length-1] - x0;
  if(!(LOA0 > 0.05)) throw new Error('o comprimento saiu em ' + LOA0.toFixed(3) +
    ' m. Confira as unidades: as cotas são em milímetros.');

  /* um interpolador por coordenada de cada vértice */
  var fy = [], fz = [], v;
  for(v=0;v<nV;v++){
    fy.push(fazInterpolador(xs, rows.map(function(r){ return r.pts[v][0]; })));
    fz.push(fazInterpolador(xs, rows.map(function(r){ return r.pts[v][1]; })));
  }
  var BOA0 = 0, zTop = -1e9, zBot = 1e9;
  rows.forEach(function(r){
    r.pts.forEach(function(p){
      if(p[0] > BOA0/2) BOA0 = 2*p[0];
      if(p[1] > zTop) zTop = p[1];
      if(p[1] < zBot) zBot = p[1];
    });
  });
  var D0 = zTop - zBot;
  if(!(BOA0 > 0.01) || !(D0 > 0.01))
    throw new Error('boca ' + BOA0.toFixed(3) + ' m e pontal ' + D0.toFixed(3) +
      ' m: geometria degenerada. Confira as unidades da tabela.');

  /* um casco sem costado nao serve: o painel calcula quatro regioes, e uma
     delas ficaria com perimetro zero.  Melhor dizer isso pelo nome.        */
  var gBm = 0, gSm = 0;
  (function(){
    var im = 0, xm = x0 + LOA0/2, dm = 1e9, i;
    for(i=0;i<rows.length;i++){ var dd = Math.abs(rows[i].x - xm);
      if(dd < dm){ dm = dd; im = i; } }
    var p = rows[im].pts, q;
    for(q=0;q<iSplit;q++) gBm += Math.hypot(p[q+1][0]-p[q][0], p[q+1][1]-p[q][1]);
    for(q=iSplit;q<nV-1;q++) gSm += Math.hypot(p[q+1][0]-p[q][0], p[q+1][1]-p[q][1]);
  })();
  if(gSm < 0.01 * Math.max(gBm, 1e-9))
    throw new Error('na meia-nau o costado ficou com ' + (gSm*1000).toFixed(0) +
      ' mm de perímetro contra ' + (gBm*1000).toFixed(0) + ' mm do fundo: o ' +
      'casco saiu praticamente sem costado. Confira as colunas de altura e de ' +
      'meia-boca da borda — provavelmente estão iguais às do chine.');

  CASCO = {modo:lido.modo, nBalizas:rows.length, avisos:lido.avisos,
           iSplit:iSplit, nV:nV, x0:x0, LOA0:LOA0, BOA0:BOA0, D0:D0, zBot:zBot,
           fy:fy, fz:fz, rows:rows};
  return CASCO;
}

/* a polilinha da baliza na fração xi do comprimento, já na escala do barco */
function polilinhaEm(xi){
  var b = ST.boat, ky = b.BOA/CASCO.BOA0, kz = b.D/CASCO.D0;
  var x = CASCO.x0 + Math.max(0, Math.min(1, xi)) * CASCO.LOA0, p = [], v;
  for(v=0;v<CASCO.nV;v++)
    p.push([Math.max(0, CASCO.fy[v](x)) * ky, (CASCO.fz[v](x) - CASCO.zBot) * kz]);
  /* a polilinha tem de subir da quilha para a borda */
  for(v=1;v<CASCO.nV;v++) if(p[v][1] < p[v-1][1]) p[v][1] = p[v-1][1];
  return p;
}

/* ===== sect(): o mesmo contrato do envelope paramétrico que ela substitui ==
   Devolve meia-boca e altura da quilha, da volta do bojo e da borda, mais os
   três perímetros — fundo, costado e convés — que é o que o motor de
   escantilhão consome para distribuir os reforços.                          */
function sect(xi){
  var b = ST.boat, pts = polilinhaEm(xi), i = CASCO.iSplit, n = pts.length - 1, q;
  var gB = 0, gS = 0;
  for(q=0;q<i;q++) gB += Math.hypot(pts[q+1][0]-pts[q][0], pts[q+1][1]-pts[q][1]);
  for(q=i;q<n;q++) gS += Math.hypot(pts[q+1][0]-pts[q][0], pts[q+1][1]-pts[q][1]);
  var ysh = pts[n][0], zsh = pts[n][1], camber = 0.03 * b.BOA;
  return {xi:xi, x:xi*b.LOA, pts:pts,
          ysh:ysh, zsh:zsh, zk:pts[0][1], ych:pts[i][0], zch:pts[i][1],
          zdc:zsh + camber,
          gB:Math.max(1e-6, gB), gS:Math.max(1e-6, gS),
          gD:Math.hypot(ysh, camber)};
}

/* ponto no perímetro da seção, dado região e fração 0..1 dentro dela.
   Anda pela polilinha de verdade — no bojo redondo isso é o que separa um
   reforço posto na curva de um reforço posto na corda.                      */
function girthPt(sc, region, f){
  if(region === 'conves') return [sc.ysh - f*sc.ysh, sc.zsh + f*(sc.zdc - sc.zsh)];
  var i = CASCO.iSplit, n = sc.pts.length - 1;
  var a = (region === 'fundo') ? 0 : i, b = (region === 'fundo') ? i : n;
  var total = (region === 'fundo') ? sc.gB : sc.gS;
  var alvo = Math.max(0, Math.min(1, f)) * total, acc = 0, q;
  for(q=a;q<b;q++){
    var dy = sc.pts[q+1][0]-sc.pts[q][0], dz = sc.pts[q+1][1]-sc.pts[q][1];
    var L = Math.hypot(dy, dz);
    if(acc + L >= alvo - 1e-12){
      var t = L > 1e-12 ? (alvo - acc)/L : 0;
      return [sc.pts[q][0] + t*dy, sc.pts[q][1] + t*dz];
    }
    acc += L;
  }
  return [sc.pts[b][0], sc.pts[b][1]];
}

/* meia-boca na altura z — usada pelo espelho e pelo 3D */
function yAtZ(sc, z){
  var p = sc.pts, n = p.length - 1, q;
  if(z <= p[0][1]) return 0;
  if(z >= p[n][1]) return p[n][0];
  for(q=0;q<n;q++)
    if(z <= p[q+1][1] + 1e-12){
      var dz = p[q+1][1] - p[q][1];
      var t = dz > 1e-12 ? (z - p[q][1])/dz : 0;
      return p[q][0] + t*(p[q+1][0] - p[q][0]);
    }
  return p[n][0];
}

/* ====================================================== HIDROSTÁTICA SIMPLES
   Só o que o painel precisa: o calado que corresponde a um deslocamento, ou
   o deslocamento que corresponde a um calado, mais LWL e BWL nessa linha
   d'água.  Não substitui a skill de pesos e centros — aqui não há trim, nem
   banda, nem estabilidade.                                                  */
function areaSubmersa(sc, d){
  if(d <= sc.zk) return 0;
  var p = sc.pts, n = p.length - 1, A = 0, q;
  for(q=0;q<n;q++){
    var lo = p[q][1], hi = Math.min(p[q+1][1], d);
    if(lo >= d) break;
    if(hi <= lo) continue;
    A += (yAtZ(sc, lo) + yAtZ(sc, hi))/2 * (hi - lo);   /* y é linear em z no trecho */
  }
  return 2*A;                                          /* os dois bordos */
}
function hidro(d, NX){
  NX = NX || 61;
  var b = ST.boat, V = 0, bwl = 0, xa = null, xb = null, i;
  var prev = null, dx = b.LOA/(NX-1);
  for(i=0;i<NX;i++){
    var sc = sect(i/(NX-1)), A = areaSubmersa(sc, d);
    if(A > 1e-9){ if(xa === null) xa = i*dx; xb = i*dx;
                  bwl = Math.max(bwl, 2*yAtZ(sc, d)); }
    if(prev !== null) V += (prev + A)/2 * dx;
    prev = A;
  }
  return {V:V, disp:V*1.025, LWL:(xa === null ? 0 : xb - xa), BWL:bwl};
}
function caladoParaDeslocamento(disp_t){
  var lo = 1e-4, hi = ST.boat.D, i;
  for(i=0;i<60;i++){
    var m = (lo+hi)/2;
    if(hidro(m, 41).disp < disp_t) lo = m; else hi = m;
  }
  return (lo+hi)/2;
}
