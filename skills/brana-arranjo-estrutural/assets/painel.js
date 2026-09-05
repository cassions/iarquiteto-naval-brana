var MATERIAL_INICIAL = "__MATERIAL__";

/* ======================================================= telas de desenho */
function cvSetup(id){
  var cv = el(id), dpr = Math.min(2, window.devicePixelRatio || 1);
  var rc = cv.getBoundingClientRect();
  var w = Math.max(60, rc.width), h = Math.max(60, rc.height);
  cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  var g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,w,h);
  g.font = '10px Consolas, monospace';
  return {g:g, w:w, h:h};
}
function arrow(g, x1, y1, x2, y2, head){
  head = head || 5;
  g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
  var a = Math.atan2(y2-y1, x2-x1);
  g.beginPath(); g.moveTo(x2,y2);
  g.lineTo(x2 - head*Math.cos(a-0.4), y2 - head*Math.sin(a-0.4));
  g.lineTo(x2 - head*Math.cos(a+0.4), y2 - head*Math.sin(a+0.4));
  g.closePath(); g.fill();
}
function dimH(g, x1, x2, y, txt, col){
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1;
  arrow(g, (x1+x2)/2, y, x1, y, 4); arrow(g, (x1+x2)/2, y, x2, y, 4);
  g.beginPath(); g.moveTo(x1,y-4); g.lineTo(x1,y+4); g.moveTo(x2,y-4); g.lineTo(x2,y+4); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.fillText(txt, (x1+x2)/2, y-5);
}
function dimV(g, y1, y2, x, txt, col){
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1;
  arrow(g, x, (y1+y2)/2, x, y1, 4); arrow(g, x, (y1+y2)/2, x, y2, 4);
  g.beginPath(); g.moveTo(x-4,y1); g.lineTo(x+4,y1); g.moveTo(x-4,y2); g.lineTo(x+4,y2); g.stroke();
  g.save(); g.translate(x-6, (y1+y2)/2); g.rotate(-Math.PI/2);
  g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(txt, 0, 0); g.restore();
}

/* ---- o painel: planta e corte, o desenho central da aula ---- */
function drawPanelDiagram(){
  var C = cvSetup('cvPanel'), g = C.g, o = R.reg.fundo;
  var s = o.s, l = o.l;                     /* mm */
  var midX = C.w*0.5;

  /* ---------- esquerda: planta do painel ---------- */
  var pad = 34, availW = midX - pad - 16, availH = C.h - 2*pad;
  var sc = Math.min(availW/l, availH/s) * 0.92;
  var pw = l*sc, ph = s*sc;
  var px = pad + (availW - pw)/2, py = pad + (availH - ph)/2;
  var bar = Math.max(5, Math.min(11, ph*0.16));

  /* chapa */
  g.fillStyle = 'rgba(232,232,232,.13)';
  g.fillRect(px, py, pw, ph);
  /* reforços nas quatro bordas: longitudinais nos lados longos, balizas nas pontas */
  g.fillStyle = 'rgba(95,174,230,.92)';
  g.fillRect(px, py-bar, pw, bar); g.fillRect(px, py+ph, pw, bar);
  g.fillStyle = 'rgba(251,177,47,.92)';
  g.fillRect(px-bar, py-bar, bar, ph+2*bar); g.fillRect(px+pw, py-bar, bar, ph+2*bar);
  g.strokeStyle = 'rgba(232,232,232,.55)'; g.lineWidth = 1;
  g.strokeRect(px, py, pw, ph);

  dimH(g, px, px+pw, py+ph+bar+22, 'ℓ = ' + fmt(l,0) + ' mm · entre balizas', 'rgba(251,177,47,1)');
  dimV(g, py, py+ph, px-bar-14, 's = ' + fmt(s,0) + ' mm · entre longitudinais', 'rgba(95,174,230,1)');

  g.textAlign = 'left'; g.textBaseline = 'top'; g.font = '10.5px Consolas, monospace';
  g.fillStyle = 'rgba(95,174,230,1)';   g.fillText('longitudinais', px, py-bar-15);
  g.fillStyle = 'rgba(251,177,47,1)';   g.fillText('balizas', px+pw+bar+4, py+ph+bar+4);
  g.fillStyle = 'rgba(191,191,191,.9)'; g.textAlign = 'center';
  g.fillText('planta do painel · manda a menor das duas · ℓ/s = ' + fmt(o.aspect,2) +
                ' · k = ' + fmt(o.k,3), midX/2, C.h-14);

  /* ---------- direita: corte na direção curta ---------- */
  var qx0 = midX + 26, qx1 = C.w - 30, qy = C.h*0.52;
  var span = qx1 - qx0;
  g.strokeStyle = 'rgba(85,85,85,1)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(qx0-14, qy); g.lineTo(qx1+14, qy); g.stroke();

  /* reforços como T */
  function tee(x){
    var wf = 26, hw = 30, tw = 4;
    g.fillStyle = 'rgba(95,174,230,.9)';
    g.fillRect(x - tw/2, qy, tw, hw);
    g.fillRect(x - wf/2, qy + hw, wf, 4);
  }
  tee(qx0); tee(qx1);

  /* chapa deformada */
  var dmax = Math.min(26, Math.max(4, o.gerr.delta_mm / Math.max(o.tAdo,1) * 9));
  g.strokeStyle = 'rgba(232,232,232,1)'; g.lineWidth = Math.max(2, Math.min(9, o.tAdo*0.55));
  g.beginPath();
  for(var i=0;i<=40;i++){
    var u = i/40, x = qx0 + span*u;
    var y = qy - dmax * (1 - Math.cos(2*Math.PI*u))/2;      /* forma bi-engastada */
    i ? g.lineTo(x,y) : g.moveTo(x,y);
  }
  g.stroke();
  /* pressão empurrando de baixo */
  g.strokeStyle = 'rgba(127,182,222,.95)'; g.fillStyle = 'rgba(127,182,222,.95)'; g.lineWidth = 1.3;
  for(var j=1;j<=6;j++){
    var xa = qx0 + span*j/7;
    arrow(g, xa, qy+40, xa, qy+9, 5);
  }
  g.textAlign = 'center'; g.textBaseline = 'top'; g.font = '10.5px Consolas, monospace';
  g.fillText('p = ' + fmt(o.p,4) + ' N/mm²', (qx0+qx1)/2, qy+44);
  /* flecha */
  g.strokeStyle = 'rgba(238,154,152,1)'; g.fillStyle = 'rgba(238,154,152,1)';
  var xm = (qx0+qx1)/2;
  g.setLineDash([3,3]); g.beginPath(); g.moveTo(xm, qy); g.lineTo(xm, qy-dmax); g.stroke();
  g.setLineDash([]);
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('δ = ' + fmt(o.gerr.delta_mm,1) + ' mm', xm+6, qy-dmax/2);
  g.textAlign = 'center'; g.textBaseline = 'top';
  g.fillStyle = 'rgba(232,232,232,1)';
  g.fillText('t = ' + fmt(o.tAdo,1) + ' mm', xm, qy-dmax-19);
  g.fillStyle = 'rgba(191,191,191,.9)';
  g.fillText('corte na menor das duas · a chapa arqueia entre dois reforços', (qx0+qx1)/2, C.h-14);
}

/* ---- seção mestra com os reforços ---- */
function drawSectionAula(){
  var C = cvSetup('cvSect'), g = C.g, b = ST.boat, sc = R.mid;
  var zTop = Math.max(sc.zdc, b.d + 0.15), yMax = sc.ysh;
  var padX = 40, padY = 30;
  var s = Math.min((C.w-2*padX)/Math.max(1e-6, 2*yMax*1.05), (C.h-2*padY)/Math.max(1e-6, zTop*1.08));
  var cx = C.w/2, cy = C.h - padY;
  function P(y,z){ return [cx + y*s, cy - z*s]; }

  g.strokeStyle = 'rgba(120,120,120,.55)'; g.setLineDash([3,4]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx, cy - zTop*s*1.03); g.lineTo(cx, cy+6); g.stroke(); g.setLineDash([]);

  /* linha d'água */
  var pw = P(0, b.d);
  g.strokeStyle = 'rgba(95,174,230,.85)'; g.setLineDash([6,4]); g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(12, pw[1]); g.lineTo(C.w-12, pw[1]); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(95,174,230,.9)'; g.textAlign = 'left'; g.textBaseline = 'bottom';
  g.fillText('linha d’água', 14, pw[1]-3);

  var REGS = [['fundo','rgba(238,154,152,1)'],['costado','rgba(95,174,230,1)'],['conves','rgba(155,215,155,1)']];
  [1,-1].forEach(function(side){
    REGS.forEach(function(rr){
      var reg = rr[0], lyr = R.lay[reg];
      g.strokeStyle = rr[1]; g.lineWidth = Math.max(2, R.reg[reg].tAdo/1000*s);
      g.beginPath();
      for(var q=0;q<=36;q++){
        var p = girthPt(sc, reg, q/36), pt = P(p[0]*side, p[1]);
        q ? g.lineTo(pt[0],pt[1]) : g.moveTo(pt[0],pt[1]);
      }
      g.stroke();
      g.fillStyle = rr[1];
      for(var q2=1;q2<lyr.n;q2++){
        var p2 = girthPt(sc, reg, q2/lyr.n), t2 = P(p2[0]*side, p2[1]);
        g.beginPath(); g.arc(t2[0], t2[1], 3.4, 0, 7); g.fill();
      }
    });
  });
  /* baliza: um contorno âmbar por dentro */
  g.strokeStyle = 'rgba(251,177,47,.85)'; g.lineWidth = 2; g.setLineDash([5,3]);
  [1,-1].forEach(function(side){
    g.beginPath();
    var seq = [[0,sc.zk],[sc.ych,sc.zch],[sc.ysh,sc.zsh]];
    seq.forEach(function(q,i){ var pt = P(q[0]*side*0.93, q[1] + 0.012*zTop);
      i ? g.lineTo(pt[0],pt[1]) : g.moveTo(pt[0],pt[1]); });
    g.stroke();
  });
  g.setLineDash([]);
  g.textAlign = 'right'; g.textBaseline = 'top'; g.font = '10px Consolas, monospace';
  var yy = 8;
  REGS.forEach(function(rr){
    g.fillStyle = rr[1];
    g.fillText(nomeReg(rr[0]) + '  ' + R.lay[rr[0]].nStiff + ' longit.  ' +
               fmt(R.reg[rr[0]].tAdo,1) + ' mm', C.w-8, yy);
    yy += 13;
  });
}

/* ---- espessura em função do espaçamento ---- */
function drawSpcCurve(){
  var C = cvSetup('cvSpc'), g = C.g, arr = R.curveS;
  var padL = 42, padR = 14, padT = 16, padB = 30;
  var X0 = padL, X1 = C.w-padR, Y0 = C.h-padB, Y1 = padT;
  var tMax = 0; arr.forEach(function(q){ tMax = Math.max(tMax, q.t, q.tNoF); });
  tMax *= 1.1 || 1;
  var sMin = arr[0].s, sMax = arr[arr.length-1].s;
  function PX(v){ return X0 + (v-sMin)/(sMax-sMin)*(X1-X0); }
  function PY(t){ return Y0 - t/tMax*(Y0-Y1); }

  g.strokeStyle = 'rgba(120,120,120,.3)'; g.lineWidth = 1;
  var stp = tMax > 40 ? 10 : (tMax > 16 ? 5 : (tMax > 8 ? 2 : 1));
  g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(191,191,191,.85)';
  for(var t=0;t<=tMax;t+=stp){
    g.beginPath(); g.moveTo(X0, PY(t)); g.lineTo(X1, PY(t)); g.stroke();
    g.fillText(fmt(t,0), X0-5, PY(t));
  }
  g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('mm', 5, Y1-4);
  g.strokeStyle = 'rgba(160,160,160,.7)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(X0,Y0); g.lineTo(X1,Y0); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'top';
  for(var i=0;i<=4;i++){ var sv = sMin + (sMax-sMin)*i/4; g.fillText(fmt(sv,0), PX(sv), Y0+6); }
  g.fillText('aresta curta do painel, mm', (X0+X1)/2, Y0+18);

  /* marca dos 254 mm, onde o desconto de carga começa */
  if(254 >= sMin && 254 <= sMax){
    g.strokeStyle = 'rgba(155,215,155,.5)'; g.setLineDash([3,4]);
    g.beginPath(); g.moveTo(PX(254), Y0); g.lineTo(PX(254), Y1); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(155,215,155,.9)'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(' 254 mm: daqui o desconto de carga começa', PX(254)+2, Y1);
  }
  function curve(key, col, lw, dash){
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash||[]);
    g.beginPath();
    arr.forEach(function(q,i){ var x = PX(q.s), y = PY(q[key]); i ? g.lineTo(x,y) : g.moveTo(x,y); });
    g.stroke(); g.setLineDash([]);
  }
  if(R.MP.mat !== 'wood') curve('tNoF', 'rgba(95,174,230,.85)', 1.6, [6,4]);
  curve('t', 'rgba(238,154,152,1)', 2.4);

  var xs = PX(Math.max(sMin, Math.min(sMax, R.reg.fundo.s)));
  g.strokeStyle = 'rgba(251,177,47,1)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(xs, Y0); g.lineTo(xs, Y1); g.stroke();
  g.fillStyle = 'rgba(251,177,47,1)'; g.textAlign = xs > (X0+X1)/2 ? 'right' : 'left';
  g.textBaseline = 'top';
  g.fillText(' ' + fmt(R.reg.fundo.tAbs,2) + ' mm ', xs + (xs > (X0+X1)/2 ? -3 : 3), Y1+13);
}

/* ---- espessura em função da velocidade ---- */
function drawVelCurveAula(){
  var C = cvSetup('cvVel'), g = C.g, arr = R.sweep.pts;
  var padL = 42, padR = 14, padT = 16, padB = 30;
  var X0 = padL, X1 = C.w-padR, Y0 = C.h-padB, Y1 = padT;
  var tAbs = R.reg.fundo.tAbs, tMax = tAbs;
  arr.forEach(function(q){ tMax = Math.max(tMax, q.tG); });
  tMax *= 1.12 || 1;
  var vTop = arr[arr.length-1].V;
  function PX(v){ return X0 + v/vTop*(X1-X0); }
  function PY(t){ return Y0 - t/tMax*(Y0-Y1); }

  if(R.VmaxSn < vTop){
    g.fillStyle = 'rgba(154,50,49,.16)';
    g.fillRect(PX(R.VmaxSn), Y1, PX(vTop)-PX(R.VmaxSn), Y0-Y1);
  }
  g.strokeStyle = 'rgba(120,120,120,.3)'; g.lineWidth = 1;
  var stp = tMax > 40 ? 10 : (tMax > 16 ? 5 : (tMax > 8 ? 2 : 1));
  g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(191,191,191,.85)';
  for(var t=0;t<=tMax;t+=stp){
    g.beginPath(); g.moveTo(X0, PY(t)); g.lineTo(X1, PY(t)); g.stroke();
    g.fillText(fmt(t,0), X0-5, PY(t));
  }
  g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('mm', 5, Y1-4);
  g.strokeStyle = 'rgba(160,160,160,.7)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(X0,Y0); g.lineTo(X1,Y0); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'top';
  for(var i=0;i<=4;i++){ var vv = vTop*i/4; g.fillText(fmt(vv,0), PX(vv), Y0+6); }
  g.fillText('velocidade, nós', (X0+X1)/2, Y0+18);

  /* governante em branco, por baixo */
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 3.4; g.beginPath();
  arr.forEach(function(q,i){ var x = PX(q.V), y = PY(Math.max(q.tG, tAbs)); i ? g.lineTo(x,y) : g.moveTo(x,y); });
  g.stroke();
  /* hidrostática, plana */
  g.strokeStyle = 'rgba(95,174,230,1)'; g.lineWidth = 1.8; g.setLineDash([7,4]);
  g.beginPath(); g.moveTo(X0, PY(tAbs)); g.lineTo(X1, PY(tAbs)); g.stroke(); g.setLineDash([]);
  /* impacto */
  g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 2.2; g.beginPath();
  arr.forEach(function(q,i){ var x = PX(q.V), y = PY(q.tG); i ? g.lineTo(x,y) : g.moveTo(x,y); });
  g.stroke();

  if(R.cross !== null && R.cross <= vTop){
    var xc = PX(R.cross), yc = PY(tAbs);
    g.fillStyle = 'rgba(255,255,255,1)';
    g.beginPath(); g.arc(xc, yc, 4, 0, 7); g.fill();
    g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 1.7; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.97)'; g.textAlign = 'center'; g.textBaseline = 'bottom';
    g.fillText('o impacto assume · ' + fmt(R.cross,1) + ' nós', xc, yc-8);
  }
  if(R.VmaxSn < vTop){
    g.strokeStyle = 'rgba(238,154,152,.85)'; g.lineWidth = 1.3; g.setLineDash([4,4]);
    g.beginPath(); g.moveTo(PX(R.VmaxSn), Y0); g.lineTo(PX(R.VmaxSn), Y1); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(238,154,152,.95)'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(' limite da regra', PX(R.VmaxSn)+2, Y1);
  }
  var xv = PX(Math.min(ST.boat.V, vTop));
  g.strokeStyle = 'rgba(251,177,47,1)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(xv, Y0); g.lineTo(xv, Y1); g.stroke();
}


/* ---- vista de topo: a mesma grade, vista por cima ------------------------
   O corte transversal mostra os longitudinais em ponto e dá o s; a planta
   mostra as balizas atravessando o barco e dá o ℓ.  As duas juntas fecham
   o painel.  A geometria é o mesmo envelope paramétrico de sect().        */
function drawPlanAula(){
  var C = cvSetup('cvPlan'), g = C.g, b = ST.boat;
  var lay = R.lay.fundo, LOA = b.LOA;
  var padX = 24, padT = 30, padB = 22;
  var yMax = 0;
  for(var i0=0;i0<=24;i0++) yMax = Math.max(yMax, sect(i0/24).ysh);
  var k  = Math.min((C.w - 2*padX)/LOA, (C.h - padT - padB)/(2*yMax*1.05));
  var x0 = (C.w - LOA*k)/2, cy = padT + (C.h - padT - padB)/2;
  function P(x, y){ return [x0 + x*k, cy - y*k]; }
  var NP = 72;

  /* uma linha longitudinal qualquer, dada a meia-boca em função da estação */
  function linha(fy, side, col, lw, dash){
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath();
    for(var i=0;i<=NP;i++){
      var xi = i/NP, pt = P(xi*LOA, side*fy(sect(xi)));
      i ? g.lineTo(pt[0],pt[1]) : g.moveTo(pt[0],pt[1]);
    }
    g.stroke(); g.setLineDash([]);
  }
  /* meia-boca do longitudinal de índice q, medido no perímetro do fundo */
  function fyLon(q){ return function(sx){ return girthPt(sx, 'fundo', q/lay.n)[0]; }; }

  /* ---- linha de centro ---- */
  g.strokeStyle = 'rgba(120,120,120,.5)'; g.setLineDash([4,5]); g.lineWidth = 1;
  var ca = P(-0.02*LOA, 0), cb = P(1.02*LOA, 0);
  g.beginPath(); g.moveTo(ca[0],ca[1]); g.lineTo(cb[0],cb[1]); g.stroke(); g.setLineDash([]);

  /* ---- balizas, de bordo a bordo: é o que a planta tem de melhor.
         R.frames tem nF+1 posições, mas as duas pontas não são baliza — a de
         popa é o espelho, desenhado à parte, e a de proa é um ponto.  Então
         desenha as nF−1 internas, que é o que o resto do painel conta.     */
  g.strokeStyle = 'rgba(251,177,47,.8)'; g.lineWidth = 1.4;
  for(var q0=1;q0<R.nF;q0++){
    var xf = R.frames[q0], yf = sect(Math.min(1, xf/LOA)).ysh;
    var p1 = P(xf, -yf), p2 = P(xf, yf);
    g.beginPath(); g.moveTo(p1[0],p1[1]); g.lineTo(p2[0],p2[1]); g.stroke();
  }

  /* ---- o painel destacado: de uma baliza a outra, de um longitudinal a
         outro.  É a faixa junto à quina do fundo, a mais visível.        */
  var bi = 0, alvo = XIM*LOA, melhor = 1e9;
  for(var i2=0;i2<R.nF;i2++){
    var dm = Math.abs((R.frames[i2] + R.frames[i2+1])/2 - alvo);
    if(dm < melhor){ melhor = dm; bi = i2; }
  }
  var qa = lay.n - 1, qb = lay.n, xa = R.frames[bi], xb = R.frames[bi+1];
  function contorno(){
    g.beginPath();
    for(var i3=0;i3<=16;i3++){
      var xx = xa + (xb-xa)*i3/16, pt = P(xx, girthPt(sect(xx/LOA), 'fundo', qa/lay.n)[0]);
      i3 ? g.lineTo(pt[0],pt[1]) : g.moveTo(pt[0],pt[1]);
    }
    for(var i4=16;i4>=0;i4--){
      var x4 = xa + (xb-xa)*i4/16, p4 = P(x4, girthPt(sect(x4/LOA), 'fundo', qb/lay.n)[0]);
      g.lineTo(p4[0],p4[1]);
    }
    g.closePath();
  }
  g.fillStyle = 'rgba(238,154,152,.45)'; contorno(); g.fill();
  g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 1.6; contorno(); g.stroke();

  /* ---- longitudinais do fundo, nos dois bordos ---- */
  [1,-1].forEach(function(side){
    for(var q=1;q<lay.n;q++)
      linha(fyLon(q), side, 'rgba(95,174,230,.9)', 1.4);
  });
  /* quina do fundo com o costado, e a borda */
  [1,-1].forEach(function(side){
    linha(function(sx){ return sx.ych; }, side, 'rgba(95,174,230,.5)', 1.2, [5,4]);
    linha(function(sx){ return sx.ysh; }, side, 'rgba(232,232,232,.95)', 2.2);
  });
  /* espelho de popa fecha a planta */
  var t0 = sect(0).ysh, e1 = P(0,-t0), e2 = P(0,t0);
  g.strokeStyle = 'rgba(232,232,232,.95)'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(e1[0],e1[1]); g.lineTo(e2[0],e2[1]); g.stroke();

  /* ---- cotas: ℓ entre as duas balizas, s na largura do painel ---- */
  var xm = (xa + xb)/2, sxm = sect(xm/LOA);
  var yA = girthPt(sxm, 'fundo', qa/lay.n)[0], yB = girthPt(sxm, 'fundo', qb/lay.n)[0];
  /* Qual das duas é a aresta curta pode trocar: aperte as balizas além do
     espaçamento dos longitudinais e quem manda passa a ser a baliza.  Por
     isso a cota não diz "ℓ" fixo — diz o que ela é, e marca quem é o s.  */
  var espLon = R.lay.fundo.s, balizaEhCurta = (R.sTe <= espLon);
  var foraDoCasco = P(xm, sxm.ysh)[1] - 8;
  dimH(g, P(xa,0)[0], P(xb,0)[0], foraDoCasco,
       'balizas ' + fmt(R.sTe,0) + ' mm · ' + (balizaEhCurta ? 'é o s' : 'é o ℓ'),
       'rgba(251,177,47,1)');
  var seta = P(xb,0)[0] + 11;
  dimV(g, P(0,yA)[1], P(0,yB)[1], seta,
       balizaEhCurta ? 'ℓ' : 's', 'rgba(238,154,152,1)');

  /* ---- rótulos ---- */
  g.font = '10.5px Consolas, monospace';
  g.fillStyle = 'rgba(191,191,191,.9)'; g.textBaseline = 'middle';
  g.textAlign = 'left';  g.fillText('popa', 6, cy);
  g.textAlign = 'right'; g.fillText('proa', C.w-6, cy);
  /* Os dois rótulos do canto só cabem em tela larga; em tela estreita eles
     esbarravam na cota das balizas, e a mesma contagem já está na legenda
     logo abaixo do canvas.                                                 */
  if(C.w > 560){
    g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillStyle = 'rgba(251,177,47,1)';
    g.fillText((R.nF - 1) + ' balizas a ' + fmt(R.sTe,0) + ' mm', 6, 6);
    g.fillStyle = 'rgba(95,174,230,1)';
    g.fillText(lay.nStiff + ' longitudinais por bordo no fundo', 6, 20);
  }
  /* O rodapé segue quem é a aresta curta: quando a baliza assume, é o s que
     aparece em verdadeira grandeza na planta, e o ℓ que vem encurtado.     */
  var emVG   = balizaEhCurta ? 's' : 'ℓ';
  var encurt = balizaEhCurta ? 'ℓ' : 's';
  var cap = 'vista de topo · a planta dá o ' + emVG + ' em verdadeira grandeza; o ' +
            encurt + ' se mede no perímetro da seção e aqui aparece encurtado';
  g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.fillStyle = 'rgba(191,191,191,.9)';
  /* o limiar não é chutado: mede-se o texto e escolhe-se o que couber */
  if(g.measureText(cap).width > C.w - 12)
    cap = 'vista de topo · aqui se lê o ' + emVG;
  g.fillText(cap, C.w/2, C.h-4);
}


/* ============================================================================
   OS DOIS FATORES DE SEGURANÇA — de qual regra e de qual item vem cada um.
   Este texto aparece em quatro lugares: na legenda do passo 5, na legenda da
   tabela do passo 9, no tooltip da ficha do rodapé e na §12 do PDF.  Fica
   num arquivo só para que os quatro nunca digam coisas diferentes.

   Tudo aqui foi conferido contra o texto dos dois PDFs desta pasta:
   · a expressão "factor of safety" NÃO aparece nenhuma vez no Guia ABS de
     1994; "safety" aparece uma única vez, qualitativa, em 1.5.2;
   · a Tabela 7.2 dá a tensão de projeto como fração de bases DIFERENTES —
     0,60 da ruptura à tração em aço e alumínio (nota 1: alumínio no estado
     soldado), 0,5 da resistência mínima à flexão em fibra de vidro de casca
     simples, 0,5 do módulo de ruptura em madeira laminada a frio (nota 3:
     MOR = 22% do valor tabelado) e 0,4 do módulo de ruptura em tabuado liso;
   · os alvos SF 1,5 e SF 3 do paper do IBEX de 2010 estão impressos na p.29,
     mas dentro dos blocos de propriedades do laminado de fibra e do alumínio
     5083 — o paper não os enuncia para aço, madeira maciça ou compensado.
   ========================================================================= */

/* rótulos curtos, para as barras e para os cabeçalhos de tabela */
var FS_ROT_REGRA   = 'FS regra<small>ABS 1994 · Tab. 7.2 · razão do painel</small>';
var FS_ROT_IMPACTO = 'FS impacto<small>Gerr, IBEX 2010 · p.29 · alvo 1,5</small>';

/* a base de cada material na Tabela 7.2, palavra por palavra do Guia */
function fsBase(mat){
  if(mat === 'alu')   return '0,60 da ruptura à tração, no estado soldado — nota 1';
  if(mat === 'steel') return '0,60 da ruptura à tração';
  if(mat === 'frp')   return '0,50 da resistência mínima à flexão';
  if(mat === 'wood')  return '0,40 do módulo de ruptura';
  /* compensado: os 22% da nota 3 só valem quando o MOR não veio de ensaio */
  return ST.plyVerif
    ? '0,50 do módulo de ruptura informado por ensaio — nota 3, segunda parte'
    : '0,50 do módulo de ruptura, ele próprio tomado a 22% — nota 3';
}

/* tooltip da ficha fixa no rodapé (texto puro, sem marcação) */
var FS_TOOLTIP = 'FS regra — ruptura de referencia do material dividida pela tensao que a '
  + 'carga de projeto produz na espessura adotada. E uma razao calculada por este painel: o ABS '
  + 'Guide for Building and Classing Offshore Racing Yachts (1994) nao publica fator de '
  + 'seguranca nenhum. O que ele publica e a tensao de projeto da Tabela 7.2, dada como fracao '
  + 'de uma propriedade do material — 0,60 da ruptura a tracao em aco e aluminio, 0,50 da '
  + 'flexao em fibra de vidro, 0,50 do modulo de ruptura em madeira laminada, 0,40 em tabuado '
  + 'liso. Na espessura exigida o numero cai no inverso dessa fracao; o que passa disso vem do '
  + 'arredondamento para a bitola comercial. Como as bases sao diferentes, o valor de um '
  + 'material nao se compara com o de outro. O FS contra o impacto, do paper de Gerr no IBEX '
  + '2010, esta no passo 5.';

/* legenda curta, embaixo das duas barras do passo 5 */
function fsLegendaCurta(){
  var MP = R.MP, base = fsBase(MP.mat);
  return '<span><b>FS regra</b> — contra a carga hidrostática do <b>ABS Guide for Building ' +
    'and Classing Offshore Racing Yachts, 1994</b>. É a razão entre a ruptura de referência (' +
    fmt(MP.ult,1) + ' N/mm², ' + MP.srcUlt + ') e a tensão que a chapa adotada realmente ' +
    'sofre. <b>O Guia não publica esse número</b> — a expressão “fator de segurança” não ' +
    'aparece nele. O que ele publica é a <b>tensão de projeto da Tabela 7.2</b> (' +
    fmt(MP.sigA,1) + ' N/mm², ' + base + '), e daí sai o piso de ' +
    fmt(MP.fs_abs_implicito,2) + ' — quanto você tem ao adotar exatamente a espessura exigida. ' +
    'Arredondar para cima sobe a partir dali.</span>' +
    '<span><b>FS impacto</b> — contra a carga de impacto de planeio, da cadeia de <b>Gerr, ' +
    'IBEX 2010, sessão 501</b>. É a razão entre a mesma ruptura e a <b>tensão de membrana</b> ' +
    'do painel sob a pressão de projeto. O alvo está impresso na <b>p.29</b> do paper: ' +
    '<b>1,5</b> para carga dinâmica de fundo e <b>3,0</b> para carga estática. O livro <i>The ' +
    'Elements of Boat Strength</i> não entra aqui: ele não publica fator de segurança para a ' +
    'regra S<sub>n</sub>.</span>' +
    '<span><b>Três ressalvas.</b> A Tabela 7.2 usa <b>bases diferentes</b> em cada material — ' +
    'tração, flexão ou módulo de ruptura — então o FS regra não se compara entre materiais, só ' +
    'entre regiões do mesmo material. A p.29 enuncia os alvos dentro dos blocos do laminado de ' +
    'fibra e do alumínio 5083' +
    (MP.mat === 'frp' || MP.mat === 'alu' ? ', que é o caso aqui'
      : ', e não para este material — aqui o painel está estendendo o alvo') +
    '. E o <b>fator de velocidade f<sub>V</sub></b> que multiplica a pressão de impacto é ' +
    'construção deste painel: nenhuma das fontes traz termo de velocidade na pressão.</span>' +
    '<span>Fora do fundo os dois costumam dar o mesmo número, porque ali a verificação de ' +
    'impacto toma emprestada a carga do ABS e o painel ainda trabalha em flexão. O que muda ' +
    'é o alvo. O PDF do passo 9 abre isso na §12.</span>';
}

/* texto longo, para a §12 do PDF */
var FS_LEGENDA_LONGA =
  '<p>O painel mostra dois fatores de segurança. Eles não medem a mesma coisa, não vêm da ' +
  'mesma fonte, e nenhuma das duas fontes os chama assim.</p>' +

  '<h3>FS regra — contra a carga hidrostática do ABS</h3>' +
  '<p>Fonte: <b>ABS, Guide for Building and Classing Offshore Racing Yachts, 1994</b>, ' +
  'Seção 7 (chapeamento) com as propriedades de material das Tabelas 4.1 a 4.4.</p>' +
  '<p>É a razão entre a <b>resistência última de referência</b> do material e a tensão que a ' +
  'chapa efetivamente sofre sob a carga de projeto do Guia, com a espessura que você adotou:</p>' +
  '<p class="pd-eq">FS regra = ruptura ÷ σ(t adotada)</p>' +
  '<p>A tensão σ(t) não sai da mesma expressão em todos os materiais, porque o Guia não usa ' +
  'a mesma cláusula em todos:</p>' +
  '<p class="pd-eq">metal, madeira laminada e fibra (7.1 e 7.3.1a)\n' +
  '   σ(t) = p · k · (s·c)² ÷ t²,   com p = 0,01 · F · h\n\n' +
  'tabuado liso (7.5.1)\n' +
  '   σ(t) = 0,001 · h · (a<sub>f</sub> · s)² ÷ t² · 9,80665,   com ' +
  'a<sub>f</sub> = 1,09 · |4,2 − 1,13 · ⁴√L|</p>' +
  '<p>A segunda <b>não usa o fator F nem o coeficiente de forma k</b>: o fator de escala ' +
  'a<sub>f</sub> faz o papel dos dois, e σ<sub>a</sub> entra em kgf/mm². Refazer a conta do ' +
  'tabuado liso com a expressão de cima erra por mais de dez vezes.</p>' +
  '<p><b>Ressalva de atribuição.</b> O Guia <i>não publica</i> fator de segurança: a expressão ' +
  '“factor of safety” não ocorre em nenhuma das suas 57 páginas, e a palavra “safety” aparece ' +
  'uma única vez, qualitativa, em 1.5.2. O que ele publica é a <b>tensão de projeto ' +
  'σ<sub>a</sub> da Tabela 7.2</b>, e o critério é <code>σ ≤ σ<sub>a</sub></code>. O número ' +
  'que este painel chama de “FS regra” é uma razão <b>calculada aqui</b> a partir dessa tensão ' +
  'de projeto. Quando a espessura adotada é exatamente a exigida, ele vale ' +
  'ruptura ÷ σ<sub>a</sub> — o piso da coluna. Arredondar para a bitola comercial seguinte o ' +
  'faz subir.</p>' +
  '<p><b>Ressalva de comparação.</b> A Tabela 7.2 dá σ<sub>a</sub> como fração de bases ' +
  'diferentes conforme o material, e por isso a coluna não se compara entre materiais:</p>' +
  '<table class="pd-t"><thead><tr><th>material</th><th>fração da Tab. 7.2</th>' +
  '<th>base</th><th>piso da coluna</th></tr></thead><tbody>' +
  '<tr><td class="l">aço e alumínio</td><td>0,60</td><td class="l">resistência última à ' +
  '<b>tração</b> — no alumínio, no estado soldado (nota 1)</td><td>1,67</td></tr>' +
  '<tr><td class="l">fibra de vidro, casca simples</td><td>0,50</td><td class="l">resistência ' +
  'mínima à <b>flexão</b></td><td>2,00</td></tr>' +
  '<tr><td class="l">madeira laminada a frio</td><td>0,50</td><td class="l"><b>módulo de ' +
  'ruptura</b>, ele próprio tomado a 22% do valor tabelado (nota 3)</td><td>2,00</td></tr>' +
  '<tr><td class="l">tabuado liso</td><td>0,40</td><td class="l"><b>módulo de ruptura</b>' +
  '</td><td>2,50</td></tr></tbody>' +
  '<caption>Transcrito da <b>primeira linha</b> da Tabela 7.2, “Shell and Deck”, e das suas ' +
  'notas 1 e 3 — que é a única que este painel usa, porque ele só calcula chapeamento de ' +
  'casco e de convés. A tabela tem mais duas linhas, <b>Watertight Bhd</b> e <b>Tank Bhd</b>, ' +
  'e em aço e alumínio elas mandam <b>0,75 do escoamento no estado não soldado</b> (nota 2), ' +
  'não 0,60 da ruptura: não use os números acima para dimensionar antepara estanque ou de ' +
  'tanque. O compensado deste painel entra na linha da madeira laminada. E repare que 1,67 é ' +
  'fração da tração, 2,00 da flexão e 2,50 do módulo de ruptura: são grandezas distintas, e ' +
  'postas lado a lado não formam uma escala.</caption></table>' +

  '<h3>FS impacto — contra a carga de impacto de planeio</h3>' +
  '<p>Fonte: <b>Dave Gerr, “The Elements of Boat Strength Scantling System”, IBEX 2010, ' +
  'sessão 501</b>, a cadeia das páginas 25 a 29. <b>Não</b> vem do livro <i>The Elements of ' +
  'Boat Strength</i>: o livro não publica fator de segurança nem tensão admissível para a ' +
  'regra S<sub>n</sub>, que é empírica e vai direto de S<sub>n</sub> à espessura.</p>' +
  '<p>É a razão entre a mesma resistência última e a <b>tensão de membrana</b> do painel sob ' +
  'a pressão de projeto de impacto, obtida do gráfico de Rawson &amp; Tupper reproduzido no ' +
  'paper:</p>' +
  '<p class="pd-eq">FS impacto = ruptura ÷ σ,  com  σ = C · E · (t/b)²</p>' +
  '<p>O paper publica, na p.28, um único ajuste para o C do gráfico de Rawson &amp; Tupper: ' +
  '<code>C = 1,912 + 0,383A − A²/1922</code>. Esse ajuste é da parte de <b>membrana</b> da ' +
  'curva e, em painel pouco carregado, ele devolveria mais tensão do que a flexão simples — ' +
  'o que não faz sentido, já que a membrana só alivia. Então este painel toma o menor dos ' +
  'dois ramos:</p>' +
  '<p class="pd-eq">C = min( A/2 ;  1,912 + 0,383A − A²/1922 )</p>' +
  '<p>O ramo <code>A/2</code> é a flexão de faixa bi-engastada, coerente com a p.27 do paper, ' +
  'que manda examinar por viga simples os elementos que fletem pouco — mas <b>a forma com o ' +
  'mínimo é síntese deste painel</b>, e não está impressa na fonte. Os dois ramos se cruzam ' +
  'em <b>A = 15,3</b>.</p>' +
  '<p>Os alvos estão impressos na <b>p.29</b>: <b>SF 1,5</b> para carga dinâmica de fundo e ' +
  '<b>SF 3</b> para carga estática de costado e convés, junto com as flechas admissíveis — ' +
  '50:1 e 100:1 no laminado de fibra, 75:1 e 150:1 no alumínio (esta última impressa no paper ' +
  'na forma invertida, “1:150”).</p>' +
  '<p><b>Duas coisas que este painel faz e o paper não.</b> Primeira: a p.29 enuncia esses ' +
  'alvos dentro dos blocos de propriedades do <b>laminado de fibra</b> e do <b>alumínio ' +
  '5083</b>. Aplicá-los a aço, madeira maciça e compensado é extensão deste painel. Segunda: ' +
  'o <b>fator de velocidade f<sub>V</sub></b> que multiplica a pressão de impacto é construção ' +
  'deste painel — nenhuma das duas fontes traz termo de velocidade na pressão, e por isso o ' +
  'FS impacto mostrado aqui não se reproduz a partir das planilhas do paper sem antes zerar ' +
  'esse fator.</p>' +

  '<h3>Por que, fora do fundo, os dois números coincidem</h3>' +
  '<p>No <b>costado, no espelho e no convés</b> a coluna do impacto costuma dar exatamente o ' +
  'mesmo valor da coluna da regra. Não é erro de montagem, e tem duas razões somadas. ' +
  'A primeira: nessas regiões o paper dá o critério mas não dá fórmula de pressão, então a ' +
  'verificação toma emprestada a mesma carga estática do ABS. A segunda: enquanto o parâmetro ' +
  'A do gráfico de membrana ficar abaixo de <b>15,3</b>, o painel ainda trabalha em ' +
  '<b>flexão</b>, e ali a curva vale <code>C = A/2</code>, que devolve <code>σ = p·s² ÷ 2t²' +
  '</code>.</p>' +
  '<p>Repare que essa é a tensão do ABS <b>somente quando k = 0,5</b>, isto é, em painel ' +
  'comprido — ou em madeira, onde a Tabela 7.3 trava k em 0,5 de qualquer jeito. Em metal e ' +
  'em fibra de vidro com painel perto do quadrado, k desce até 0,308, a coluna da regra cai ' +
  'na razão <code>0,5 ÷ k</code> e as duas <b>deixam de coincidir</b> mesmo sem a membrana ' +
  'entrar em jogo: num espelho de popa quadrado em alumínio a diferença chega a 60%. Quando ' +
  'as duas colunas batem, é porque k valia 0,5 ali.</p>' +
  '<p>Acima de A = 15,3 a membrana passa a mandar, começa a aliviar a tensão, e as colunas se ' +
  'separam por esse segundo motivo.</p>' +

  '<h3>Por que, no fundo, os dois diferem</h3>' +
  '<p>Porque ali as cargas são diferentes. O FS regra usa a carga hidrostática do Guia, que ' +
  'não tem termo de velocidade. O FS impacto usa a pressão de pico de planeio de Hendrickson ' +
  '&amp; Spencer, reduzida pela área do painel segundo Koelbel e multiplicada pelo fator de ' +
  'velocidade deste painel. Ler os dois juntos é o ponto: a espessura adotada é a maior das ' +
  'duas exigências.</p>';

/* ============================================================================
   TELA DOS PASSOS 6, 7 e 8.
   O motor está em u_estrut.js; aqui é só o que se vê e o que se clica.
   ========================================================================= */

var PERF_CAND = {};        /* candidatos da última pintura, para o clique */

/* ------------------------------------------------- desenho da seção, em SVG
   Um canvas por reforço seriam sete canvas.  Em SVG cada seção é um punhado
   de retângulos, escala sozinha e imprime bem no PDF.                      */
function perfSVG(c, W, H){
  if(!c || !c.rects || !c.rects.length) return '';
  W = W || 92; H = H || 68;
  /* A chapa que trabalha junto com o reforço chega a ser dez vezes mais larga
     que ele.  Desenhada em escala ela achata o perfil até sumir — então ela
     vai como faixa contínua, de bordo a bordo do quadro, que é como se
     desenha um detalhe de reforço.  A escala é a do perfil.               */
  var chapa = null, part = [], i, r;
  for(i=0;i<c.rects.length;i++){
    r = c.rects[i];
    if(r.y0 === 0 && c.w > 0 && Math.abs(r.b - c.w) < 1e-9) chapa = r; else part.push(r);
  }
  var min = 1e9, max = -1e9, top = 0;
  for(i=0;i<part.length;i++){
    r = part[i];
    min = Math.min(min, (r.xc || 0) - r.b/2);
    max = Math.max(max, (r.xc || 0) + r.b/2);
    top = Math.max(top, r.y0 + r.d);
  }
  if(!part.length) return '';
  var larg = Math.max(1e-6, max - min), alt = Math.max(1e-6, top);
  var pad = 0.16*Math.max(larg, alt);
  var k = Math.min(W/(larg + 2*pad), H/(alt + 2*pad));
  var ox = W/2 - (min + max)/2*k, oy = H - (H - alt*k)/2;
  /* Alma de 4 mm sob um perfil de 300 sai com meio pixel e some.  O piso de
     traço é de desenho, não de conta: o módulo e a linha neutra continuam
     saindo das dimensões de verdade.                                      */
  function ret(x, y, w2, h2, cor, op){
    return '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' +
      Math.max(1.4, w2).toFixed(2) + '" height="' + Math.max(1.4, h2).toFixed(2) +
      '" fill="' + cor + '" opacity="' + op + '"/>';
  }
  var s = '<svg class="psvg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
          '" aria-hidden="true">';
  if(chapa) s += ret(0, oy - Math.max(2, chapa.d*k), W, Math.max(2, chapa.d*k), '#5FAEE6', '.55');
  for(i=0;i<part.length;i++){
    r = part[i];
    s += ret(ox + ((r.xc || 0) - r.b/2)*k, oy - (r.y0 + r.d)*k, r.b*k, r.d*k, '#EE9A98', '.9');
  }
  /* a linha neutra: é dela que se mede a distância à fibra mais afastada */
  var yn = oy - c.yb*k;
  s += '<line x1="2" y1="' + yn.toFixed(2) + '" x2="' + (W-2) + '" y2="' + yn.toFixed(2) +
       '" stroke="#FBB12F" stroke-width="1" stroke-dasharray="3 3"/>';
  return s + '</svg>';
}

/* ==================================================================== PASSO 6 */
function renderPerfis(r){
  var MP = r.MP, h = '', massaTot = 0, pesa = 0;
  PERF_CAND = {};

  var regra = MP.mat === 'wood'
    ? 'Neste casco de <b>tabuado liso</b> a chapa <b>não</b> entra na conta do reforço: a subseção 3.5.4 do Guia manda contar só a peça. Cada tábua corre solta sobre a caverna e não faz viga com ela. É por isso que as cavernas saem tão altas — elas trabalham sozinhas.'
    : MP.mat === 'ply'
    ? 'Em compensado a faixa de chapa que trabalha junto com o reforço é de <b>50 × a espessura</b> (subseção 3.5.2), e nunca maior que o espaçamento. Quanto mais grossa a chapa, mais ela ajuda o reforço.'
    : MP.mat === 'frp'
    ? 'Em fibra de vidro a faixa é de <b>18 × a espessura, mais a base do reforço</b> (subseção 3.5.1). E aqui o Guia troca de critério: em vez de módulo de seção, a subseção 8.1.3 fecha com uma <b>inércia mínima</b> — quer dizer que o que manda não é romper, é <b>fletir</b>. O painel confere as duas coisas.'
    : 'Em metal a faixa de chapa que trabalha junto com o reforço é de <b>100 × a espessura</b> (subseção 3.5.3), e nunca maior que o espaçamento — além dele a chapa já é do reforço vizinho.';
  el('perfNotaA').innerHTML = box('', regra +
    ' Os perfis abaixo são <b>dimensionados por este painel</b> a partir de escadas de bitola de mercado: ' +
    'não são seções normalizadas de nenhuma das duas fontes. A lista mostra os dois mais leves de cada ' +
    'família que passam, e o painel já deixa marcado o mais leve de todos.');

  r.stiff.forEach(function(row){
    if(!row.key) return;
    if(!row.exists){
      h += '<div class="perf vazio"><div class="perf-h"><span class="perf-n">' + row.name +
           '</span><span class="perf-req">não existe neste arranjo</span></div>' +
           '<div class="perf-sub">o perímetro desta região cabe num painel só, e não sobra ' +
           'lugar para reforço intermediário. Aperte o espaçamento no passo 4 para que ele apareça.' +
           '</div></div>';
      return;
    }
    var pf = r.perf[row.key];
    if(!pf) return;
    PERF_CAND[row.key] = pf.cand;
    var g = r.pes.geo[row.key] || {n:0, Ltot:0};
    var m = g.Ltot*pf.esc.kgm;
    massaTot += m;
    if(!pf.esc.passa) pesa++;

    var quem = row.SMwho === 'Gerr'
      ? 'quem pediu mais foi a <b>carga de impacto</b> de Gerr'
      : 'quem pediu mais foi o <b>ABS 8.1.3</b>';
    h += '<div class="perf' + (pf.esc.passa ? '' : ' ruim') + '">' +
      '<div class="perf-h"><span class="perf-n">' + row.name + '</span>' +
      '<span class="perf-req">SM exigido <b>' + fmt(row.SMreq,1) + ' cm³</b>' +
      (MP.mat === 'frp' && row.I ? ' · I ≥ <b>' + fmt(row.I,1) + ' cm⁴</b>' : '') + '</span></div>' +
      '<div class="perf-sub">carga ' + fmt(row.h,2) + ' m · espaçamento ' + fmt(row.s*1000,0) +
      ' mm · vão ' + fmt(row.l,2) + ' m · ' + fmt(g.n,0) + ' peça' + (g.n === 1 ? '' : 's') +
      ' · ' + quem + (pf.esc.w > 0 ? ' · a chapa entra com ' + fmt(pf.esc.w,0) + ' mm de largura'
                                   : ' · a chapa não entra na conta') + '</div>' +
      '<div class="perf-mid">' + perfSVG(pf.esc) +
      '<div class="chips perf-ch" data-k="' + row.key + '">';
    pf.cand.forEach(function(c, i){
      h += '<button class="chip" type="button" data-i="' + i + '" aria-pressed="' +
        (c === pf.esc) + '">' + c.desc + '<small>SM ' + fmt(c.SM,1) + ' cm³ · ' +
        fmt(c.kgm,2) + ' kg/m' + (c.passa ? '' : ' · NÃO PASSA') + '</small></button>';
    });
    h += '</div></div>' +
      '<div class="perf-r' + (pf.esc.passa ? '' : ' bad') + '">' +
      (pf.esc.passa
        ? '<b>' + pf.esc.desc + '</b> dá ' + fmt(pf.esc.SM,1) + ' cm³, ' +
          fmt(100*pf.esc.SM/Math.max(1e-9,row.SMreq),0) + '% do exigido' +
          (MP.mat === 'frp' && row.I ? ' e ' + fmt(pf.esc.Icm4,1) + ' cm⁴ de inércia' : '') +
          ' · altura total ' + fmt(pf.esc.alt,0) + ' mm · ' + fmt(pf.esc.kgm,2) + ' kg/m · ' +
          fmt(g.Ltot,1) + ' m no barco todo · <b>' + fmt(m,1) + ' kg</b>'
        : '<b>' + pf.esc.desc + '</b> dá ' + fmt(pf.esc.SM,1) + ' cm³ e o exigido é ' +
          fmt(row.SMreq,1) + ' cm³. <b>Não passa.</b> Escolha um perfil maior, ' +
          'ou volte ao passo 4 e aperte o espaçamento — o vão entra ao quadrado.') +
      '</div></div>';
  });
  el('perfListA').innerHTML = h;

  /* os cliques */
  var lista = el('perfListA').querySelectorAll('.perf-ch');
  Array.prototype.forEach.call(lista, function(box2){
    var key = box2.dataset.k;
    Array.prototype.forEach.call(box2.children, function(bt){
      bt.onclick = function(){
        var c = (PERF_CAND[key] || [])[+bt.dataset.i];
        if(!c) return;
        ST.perf[key] = {fam:c.fam, dims:c.dims, man:true};
        renderAula(); renderDock();
      };
    });
  });

  var cv = r.perf.caverna, ha = r.perf.hastilha, empate = '';
  if(cv && ha && Math.abs(cv.row.SMreq - ha.row.SMreq) < 1e-6)
    empate = box('', 'A <b>caverna</b> e a <b>hastilha</b> pediram o mesmo módulo, e não é engano. ' +
      'Elas têm o mesmo vão, o mesmo espaçamento e a mesma pressão de impacto, e aqui quem está ' +
      'mandando é a <b>carga de Gerr</b>, que não distingue uma da outra. Quem distingue é o ABS: ' +
      'o coeficiente C vale <b>817</b> na caverna e <b>1800</b> na hastilha da linha de centro, ' +
      'porque a hastilha recolhe a carga do fundo dos dois bordos. Essa diferença está na coluna ' +
      '<em>SM ABS</em> do PDF — ' + fmt(cv.row.SM,1) + ' contra ' + fmt(ha.row.SM,1) +
      ' cm³ — e sumiu aqui porque a carga de impacto passou as duas.');

  var fams = (FAM_POR_MAT[MP.mat] || []).map(function(f){
    return '<b>' + FAM_N[f] + '</b> — ' + FAM_DESC[f];
  }).join('<br>');
  el('perfSumA').innerHTML =
    box(pesa ? 'bad' : 'ok',
      pesa ? '<b>' + pesa + '</b> reforço' + (pesa === 1 ? '' : 's') + ' com perfil abaixo do exigido. ' +
             'Enquanto estiver assim, o quadro de pesos do passo 8 está somando uma estrutura que não passa.'
           : 'Todos os reforços com perfil escolhido e verificado. Somados, eles pesam <b>' +
             fmt(massaTot,0) + ' kg</b> — contra ' + fmt(r.massaTot,0) +
             ' kg do chapeamento. O passo 8 põe os dois lado a lado.') +
    empate + box('', 'As famílias que este material admite:<br>' + fams);

  el('v6p').innerHTML = fmt(massaTot,0) + ' kg de reforço' + (pesa ? ' · ' + pesa + ' não passa' : '');
}

/* ==================================================================== PASSO 7 */
function renderAnteparas(r){
  var b = ST.boat, MP = r.MP, A = r.ant, BA = A.banda;

  el('antFonteA').innerHTML =
    'De onde vem a <b>posição</b>: de lugar nenhum, nas duas fontes deste painel. O Guia ABS de 1994 ' +
    '<b>não exige antepara de colisão</b> — a palavra não aparece nas suas 57 páginas — e o livro de ' +
    'Gerr também não a coloca no pacote S<sub>n</sub>. A faixa verde do desenho é <b>prática de ' +
    'classificação</b>: o piso de 5% do comprimento vem das regras de navio (a SOLAS manda a antepara ' +
    'de colisão a não menos de 0,05·L da perpendicular de vante), e o teto é uso corrente em miúdo ' +
    'porte. Trate como ponto de partida, e confira contra a norma que se aplica ao seu barco — ' +
    'NORMAM, ISO 12215.<br><br>De onde vem o <b>dimensionamento</b>: esse sim é do Guia. Carga na ' +
    'Tabela 7.1 d), tensão de projeto da chapa na Tabela 7.2 e do prumo na 8.2, módulo de seção por ' +
    '8.1.3 com C = 619.';

  el('antEspA').textContent = fmt(r.sTe,0) + ' mm';

  /* --- os cursores andam de caverna em caverna --- */
  var sV = el('antVA'), sR = el('antRA');
  function poeCursor(el2, max, val, viva){
    el2.min = 1; el2.step = 1;
    el2.max = Math.max(1, max);
    el2.value = val;
    /* Um cursor com uma posicao so nao e cursor.  Apagado, ele diz sozinho
       que nao ha escolha a fazer — e a caixa embaixo diz por que.        */
    var mexe = viva && el2.max > el2.min;
    el2.disabled = !mexe;
    el2.parentNode.parentNode.style.opacity = mexe ? '' : '.45';
  }
  poeCursor(sV, A.maxV || 1, A.kV || 1, !!A.v);
  poeCursor(sR, A.maxR || 1, A.kR || 1, !!A.r);

  function leitura(a, dist, ponta){
    if(!a) return 'não cabe neste cavernamento';
    return '<b>' + fmt(a.nCav,0) + 'ª caverna</b><small> ' + ponta + '</small> · <small>baliza</small> ' +
           fmt(a.iF,0) + ' · ' + fmt(dist,2) + '<small> m</small> · ' +
           fmt(100*a.daPonta,1) + '<small>% de L</small>';
  }
  el('antVOut').innerHTML = leitura(A.v, A.v ? b.LOA - A.v.x : 0, 'da proa');
  el('antROut').innerHTML = leitura(A.r, A.r ? A.r.x : 0, 'do espelho');

  /* --- a tabela --- */
  var tb = el('antTableA').querySelector('tbody'); tb.innerHTML = '';
  A.itens.forEach(function(a){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td class="l">' + a.nome.replace('Antepara de colisão de ', '') + '</td>' +
      '<td>' + fmt(a.nCav,0) + 'ª</td><td>' + fmt(a.iF,0) + '</td>' +
      '<td>' + fmt(a.x,2) + '</td>' +
      '<td class="' + (a.dentro ? 'ok' : 'hi') + '">' + fmt(100*a.daPonta,1) + '</td>' +
      '<td>' + fmt(a.area,2) + '</td><td>' + fmt(a.head,2) + '</td>' +
      '<td>' + fmt(Math.min(a.s, a.hMax*1000),0) + ' × ' + fmt(Math.max(a.s, a.hMax*1000),0) + '</td>' +
      '<td class="w">' + fmt(a.tReq,2) + '</td>' +
      '<td class="' + (a.passaChapa ? 'ok' : 'bad') + '">' + fmt(a.tAdo,1) + '</td>' +
      '<td>' + fmt(a.nRef,0) + ' × ' + fmt(a.hMax,2) + ' m</td>' +
      '<td>' + fmt(a.SMreq,1) + '</td>';
    tb.appendChild(tr);
  });
  if(!A.itens.length)
    tb.innerHTML = '<tr><td colspan="12" class="l">Nenhuma antepara neste arranjo.</td></tr>';

  var SA = A.itens.length ? A.itens[0].SA : sigAntepara(MP);
  var A0 = A.itens.length ? A.itens[0] : null;
  var frase = (A0 && A0.eq === '7.5.1')
    ? 'Espessura pela <b>equação 7.5.1</b>, a do tabuado liso, que não usa fator F nenhum: o fator ' +
      'de escala 1,09|4,2 − 1,13·⁴√L| = ' + fmt(A0.af,3) + ' faz o papel da redução por área.'
    : 'Espessura pela <b>equação 7.1</b> com <b>F = 1</b> — o Guia dá tabela de F para casco (7.4) ' +
      'e para convés (7.5), e <b>nenhuma para antepara</b>; F = 1 é o lado seguro.';
  el('antCapA').innerHTML =
    'A <b>caverna da ponta</b> é o que o cursor escolhe; a <b>baliza</b> é o número da mesma peça no ' +
    'plano de linhas, contado do espelho. Carga pela <b>Tabela 7.1 d)</b>: da aresta inferior da ' +
    'antepara ao convés na linha de centro, nunca menos que <b>1,52 m</b>. ' + frase +
    ' A coluna de prumos traz a contagem e a altura do <b>mais alto</b>, que é o que dimensiona. ' +
    'Tensão de projeto <b>' + fmt(SA.sig,1) + ' N/mm²</b>, de ' +
    SA.src + '.' +
    (SA.muda ? ' Repare que esta é a <b>única</b> chapa do barco cuja tensão de projeto sai do ' +
               'escoamento, e não da ruptura: a Tabela 7.2 muda de base na linha da antepara.' : '') +
    ' Espessura adotada: a mesma do costado, como o enunciado do passo pede. Módulo do prumo pela ' +
    '8.1.3 com <b>C = 619</b>, que é o valor de reforço de antepara, e sem fator F — a Tabela 8.1a ' +
    'manda usar a carga da Tabela 7.1 direto.';

  /* --- o que precisa ser dito --- */
  var hb = '';
  if(A.semLugar === 'nenhuma')
    hb += box('bad', 'Este cavernamento tem <b>um vão só</b>: não existe caverna interna onde pôr ' +
      'antepara nenhuma. Aperte o espaçamento das balizas no passo 4.');
  else if(A.semLugar === 're')
    hb += box('', 'Só existe <b>uma caverna interna</b> neste cavernamento, e ela está ocupada pela ' +
      'antepara de vante. Não sobra lugar para a de ré. Aperte o espaçamento no passo 4 e ela aparece.');
  if(A.limitou && !A.apertou)
    hb += box('', 'Você tinha pedido a <b>' + fmt(Math.max(A.pedV, A.pedR),0) + 'ª caverna</b>, e com ' +
      'este cavernamento o cursor só vai até a <b>' + fmt(A.teto,0) + 'ª</b>. O pedido continua ' +
      'guardado: aperte as balizas no passo 4 e a antepara volta sozinha para onde você a tinha ' +
      'posto.');
  if(A.apertou)
    hb += box('', 'As duas anteparas se encontraram no meio do barco: não sobrava caverna entre elas. ' +
      'A que você <b>não</b> moveu por último cedeu uma caverna. Com ' + fmt(A.nInt,0) +
      ' cavernas internas, a soma das duas contagens não pode passar de ' + fmt(A.nInt,0) + '.');

  A.itens.forEach(function(a){
    hb += box(a.passaChapa ? 'ok' : 'bad',
      '<b>' + a.nome + '</b> · chapa de ' + fmt(a.tAdo,1) + ' mm contra ' + fmt(a.tReq,2) +
      ' mm exigidos' + (a.gov === 'mínimo' ? ' <b>pelo mínimo construtivo</b>' : ' pela carga') +
      '. ' + (a.passaChapa
        ? 'Passa, com ' + fmt(100*(a.tAdo/a.tReq - 1),0) + '% de folga: a chapa do costado é mais ' +
          'grossa do que a antepara pede, porque o costado leva carga de mar e a antepara só leva ' +
          'a água que já entrou.'
        : a.gov === 'mínimo'
        ? 'Não passa — e repare no motivo: não é a carga, é a <b>espessura mínima construtiva</b> de ' +
          '<code>s ÷ ' + MP.tminK + '</code>, que com um painel de ' + fmt(a.s,0) + ' mm entre prumos ' +
          'pede ' + fmt(a.tmin,2) + ' mm. A carga sozinha pediria menos. Abaixo disso a chapa distorce ' +
          'na solda, e o Guia não deixa. Aperte o espaçamento no passo 4: o painel estreita e o ' +
          'mínimo cai junto.'
        : 'Não passa. A carga da antepara pede mais do que a chapa do costado tem — ou porque o ' +
          'painel entre prumos ficou largo, ou porque a antepara é alta. Aperte o espaçamento no ' +
          'passo 4, ou engrosse o costado no passo 5.'));
    if(!a.dentro){
      var f = BA[a.lado], conselho;
      if(a.daPonta < f[0])
        conselho = 'Perto demais da ponta: o compartimento estanque fica pequeno e protege pouco. ' +
                   'Ande uma ou duas cavernas para dentro.';
      else if(a.nCav > 1)
        conselho = 'Longe demais da ponta: o compartimento fica grande, e alagá-lo já compromete ' +
                   'a flutuação. Ande uma ou duas cavernas para a ponta.';
      else
        /* nao adianta mandar andar para a ponta: ela ja esta na primeira caverna */
        conselho = 'Longe demais da ponta — e ela já está na <b>primeira caverna</b>, não há para ' +
                   'onde andar. Quem está longe é a própria caverna: com balizas a cada ' +
                   fmt(r.sTe,0) + ' mm, a primeira já cai a ' + fmt(100*a.daPonta,1) + '% do ' +
                   'comprimento. Aperte o espaçamento no passo 4.';
      hb += box('', '<b>' + a.nome + '</b> está na ' + fmt(a.nCav,0) + 'ª caverna, a ' +
        fmt(100*a.daPonta,1) + '% do comprimento — fora da faixa usual de ' + fmt(100*f[0],0) +
        '% a ' + fmt(100*f[1],0) + '%. ' + conselho);
    }
  });

  /* quantas cavernas há dentro de cada faixa: é o que o passo 4 decidiu */
  function naFaixa(f){
    var n = 0;
    for(var q=1;q<=A.nInt;q++){ var d = q/A.nF; if(d >= f[0] - 1e-9 && d <= f[1] + 1e-9) n++; }
    return n;
  }
  /* Só conta a faixa das anteparas que existem: com uma caverna interna só,
     a de ré nem chega a ser posta, e falar da faixa dela seria mentira.   */
  if(A.itens.length){
    var partes = [], faltam = [];
    A.itens.forEach(function(a){
      var n = naFaixa(BA[a.lado]), nome = 'de ' + (a.lado === 'v' ? 'vante' : 'ré');
      partes.push('<b>' + fmt(n,0) + '</b>' + (partes.length ? '' : (n === 1 ? ' cai' : ' caem')) +
        ' na faixa usual ' + nome);
      if(!n) faltam.push(nome);
    });
    if(faltam.length)
      hb += box('bad', 'Com balizas a cada ' + fmt(r.sTe,0) + ' mm, <b>nenhuma caverna cai dentro ' +
        'da faixa usual ' + faltam.join(' nem da faixa ') + '</b>. Não é escolha ruim sua: é o ' +
        'cavernamento que não oferece posição. Aperte o espaçamento no passo 4 e elas aparecem.');
    else
      hb += box('', 'Das <b>' + fmt(A.nInt,0) + ' cavernas internas</b> deste arranjo, ' +
        partes.join(' e ') + '. Aperte o espaçamento no passo 4 e esses números crescem; alargue, ' +
        'e eles encolhem até sumir. <b>É o cavernamento que decide onde a antepara pode ficar.</b>');
  }
  if(MP.tminK && A.itens.length && A.itens[0].tmin && A.itens.every(function(a){ return a.passaChapa; }))
    hb += box('', 'Em ' + (MP.mat === 'alu' ? 'alumínio' : 'aço') + ' a antepara também tem ' +
      '<b>espessura mínima construtiva</b>: ' + fmt(A.itens[0].tmin,2) + ' mm neste painel. ' +
      'Em antepara ela costuma mandar, porque a carga é baixa — a água de dentro empurra muito ' +
      'menos que o mar de fora.');
  el('antBoxA').innerHTML = hb;

  var mAnt = 0;
  r.pes.linhas.forEach(function(l){ if(l.g === 'ant') mAnt += l.m; });
  el('antFactsA').innerHTML = '<b>' + fmt(A.nInt,0) + ' cavernas internas · ' +
    fmt(A.itens.length,0) + ' antepara' + (A.itens.length === 1 ? '' : 's') + ' · ' +
    fmt(mAnt,0) + ' kg</b>';
  el('v7a').innerHTML = A.itens.length
    ? A.itens.map(function(a){
        return (a.lado === 'v' ? 'vante' : 'ré') + ' na ' + fmt(a.nCav,0) + 'ª caverna';
      }).join(' · ') + ' · ' + fmt(mAnt,0) + ' kg'
    : 'não cabe antepara neste cavernamento';
}

/* ==================================================================== PASSO 8 */
var PES_G = {chapa:'Chapeamento', ref:'Reforços', ant:'Anteparas'};
function renderPesos(r){
  var b = ST.boat, P = r.pes, tb = el('pesTableA').querySelector('tbody');
  tb.innerHTML = '';
  var atual = null;
  P.linhas.forEach(function(l){
    if(l.g !== atual){
      atual = l.g;
      var trg = document.createElement('tr');
      trg.className = 'grp';
      trg.innerHTML = '<td colspan="7" class="l">' + PES_G[l.g] + ' · ' +
        fmt(P.grupos[l.g],0) + ' kg, ' + fmt(100*P.grupos[l.g]/Math.max(1e-9,P.tot.m),0) +
        '% da estrutura</td>';
      tb.appendChild(trg);
    }
    var tr = document.createElement('tr');
    tr.innerHTML = '<td class="l">' + l.it + (l.det ? '<i>' + l.det + '</i>' : '') + '</td>' +
      '<td>' + l.q + '</td><td>' + l.un + '</td><td class="w">' + fmt(l.m,1) + '</td>' +
      '<td>' + fmt(100*l.m/Math.max(1e-9,P.tot.m),1) + '</td>' +
      '<td>' + fmt(l.x,2) + '</td><td>' + fmt(l.z,3) + '</td>';
    tb.appendChild(tr);
  });
  var trt = document.createElement('tr');
  trt.className = 'tot';
  trt.innerHTML = '<td class="l"><b>Estrutura completa</b></td><td></td><td></td>' +
    '<td class="w"><b>' + fmt(P.tot.m,0) + '</b></td><td>100</td>' +
    '<td><b>' + fmt(P.tot.x,2) + '</b></td><td><b>' + fmt(P.tot.z,3) + '</b></td>';
  tb.appendChild(trt);

  el('pesCapA').innerHTML =
    'L<sub>CG</sub> medido do <b>espelho de popa</b> para vante; V<sub>CG</sub>, da <b>linha de ' +
    'base</b>. O centro transversal é zero por simetria. As massas de chapeamento saem da área da ' +
    'casca vezes a espessura adotada vezes ' + fmt(r.dens,0) + ' kg/m³' +
    (r.MP.mat === 'wood' || r.MP.mat === 'ply' ? ' (massa específica da Tabela 4.4 do ABS)'
                                               : ' (valor de catálogo, que não consta das fontes)') +
    '; as de reforço, do comprimento total de cada família vezes a massa por metro do perfil ' +
    'escolhido no passo 6' +
    (r.MP.mat === 'frp' ? ', com o núcleo do chapéu contado a 80 kg/m³ — espuma de PVC, valor de ' +
                          'catálogo' : '') +
    '. <b>Não</b> entram: margem de construção, solda, cola, resina de laminação, cantoneiras de ' +
    'canto, ferragens, tinta, nem nada que não seja estrutura.';

  var mx = Math.max(P.grupos.chapa || 0, P.grupos.ref || 0, P.grupos.ant || 0) || 1;
  var hb = '';
  ['chapa','ref','ant'].forEach(function(k){
    var v = P.grupos[k] || 0;
    hb += '<div class="bar"><span class="bk">' + PES_G[k] +
      '</span><span class="bt"><i style="width:' + (100*v/mx).toFixed(1) + '%"></i></span>' +
      '<span class="bv">' + fmt(v,0) + ' kg</span></div>';
  });
  el('pesBarsA').innerHTML = hb;

  var fd = P.fracDisp;
  var cx = box('', '<b>' + fmt(P.tot.m,0) + ' kg</b> de estrutura, com o centro a <b>' +
    fmt(P.tot.x,2) + ' m</b> do espelho — ' + fmt(100*P.tot.x/b.LOA,0) + '% do comprimento — e a <b>' +
    fmt(P.tot.z,3) + ' m</b> acima da linha de base, que é ' + fmt(100*P.tot.z/b.D,0) +
    '% do pontal. Um centro de estrutura perto da meia-nau e por volta de meia altura de pontal é o ' +
    'esperado numa casca: a chapa está distribuída por toda ela.');
  if(fd !== null){
    var alerta = fd > 0.40 ? 'bad' : (fd < 0.08 ? '' : 'ok');
    cx += box(alerta, 'Isso é <b>' + fmt(100*fd,1) + '%</b> do deslocamento de ' + fmt(b.disp,2) +
      ' t que você informou no passo 1. ' +
      (fd > 0.40
        ? 'É muito: acima de 40% do deslocamento a estrutura já não deixa margem para motor, tanques, ' +
          'lastro e tripulação. Costuma querer dizer material errado para o porte — aço em barco ' +
          'pequeno é o caso clássico — ou deslocamento subestimado.'
        : fd < 0.08
        ? 'É pouco: abaixo de 8% vale conferir se o deslocamento informado não está alto demais para ' +
          'este casco, ou se o arranjo não ficou frouxo demais.'
        : 'Está na faixa usual de casco de embarcação miúda, que vai de cerca de um sexto a um terço ' +
          'do deslocamento.'));
  }
  var dom = null;
  P.linhas.forEach(function(l){ if(!dom || l.m > dom.m) dom = l; });
  if(dom && dom.m > 0.20*P.tot.m)
    cx += box('', 'Um item sozinho responde por <b>' + fmt(100*dom.m/P.tot.m,0) + '%</b> da ' +
      'estrutura: <b>' + dom.it + '</b>, com ' + fmt(dom.m,0) + ' kg. ' +
      (dom.it.indexOf('Vau') === 0
        ? 'É o vau do convés, e o motivo é o vão: ele atravessa o barco inteiro sem apoio no meio, ' +
          'e no módulo de seção o vão entra <b>ao quadrado</b>. Um pé-de-carneiro na linha de centro, ' +
          'ou uma antepara no meio do barco, corta esse vão pela metade e derruba a exigência a um ' +
          'quarto. É a decisão de arranjo que mais economiza estrutura, e ela não aparece em ' +
          'fórmula nenhuma.'
        : 'Vale olhar o vão e o espaçamento desse item no passo 6: quando uma peça só domina o peso, ' +
          'quase sempre é o vão dela que está grande demais.'));

  var margem = 0.12;
  cx += box('', 'Com <b>12%</b> de margem de construção — solda, cola, resina, sobreposições e as ' +
    'chapas de reforço dos cruzamentos — a estrutura sairia com <b>' +
    fmt(P.tot.m*(1 + margem),0) + ' kg</b>. Estaleiros trabalham entre 8% e 15%, e quem calcula ' +
    'estrutura pela primeira vez erra sempre para menos.');
  el('pesBoxA').innerHTML = cx;

  el('cgFactsA').innerHTML = '<b>' + fmt(P.tot.m,0) + ' kg · L<sub>CG</sub> ' + fmt(P.tot.x,2) +
    ' m · V<sub>CG</sub> ' + fmt(P.tot.z,3) + ' m</b>';
  el('v8p').innerHTML = fmt(P.tot.m,0) + ' kg · CG a ' + fmt(P.tot.x,2) + ' m do espelho';
}

/* ================================================== VISTA DE PERFIL, PARTILHADA
   Os dois desenhos novos olham o barco de lado.  A escala e as linhas do
   casco são as mesmas; muda o que se põe por cima.                        */
function vistaPerfil(id){
  var C = cvSetup(id), g = C.g, b = ST.boat;
  var padX = 30, padT = 26, padB = 30, i, zTop = 0;
  for(i=0;i<=32;i++) zTop = Math.max(zTop, sect(i/32).zdc);
  var k = Math.min((C.w - 2*padX)/b.LOA, (C.h - padT - padB)/Math.max(1e-6, zTop*1.05));
  var x0 = (C.w - b.LOA*k)/2, y0 = C.h - padB;
  function P(x, z){ return [x0 + x*k, y0 - z*k]; }
  function linha(fz, col, lw, dash){
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath();
    for(var j=0;j<=64;j++){
      var xi = j/64, p = P(xi*b.LOA, fz(sect(xi)));
      j ? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1]);
    }
    g.stroke(); g.setLineDash([]);
  }
  /* borda, convés na linha de centro, quina e quilha */
  linha(function(s){ return s.zsh; }, 'rgba(232,232,232,.95)', 1.6);
  linha(function(s){ return s.zdc; }, 'rgba(155,215,155,.7)', 1.1, [5,4]);
  linha(function(s){ return s.zch; }, 'rgba(191,191,191,.55)', 1, [4,4]);
  linha(function(s){ return s.zk;  }, 'rgba(232,232,232,.95)', 1.6);
  /* espelho e roda de proa fecham o contorno */
  var s0 = sect(0), s1 = sect(1);
  g.strokeStyle = 'rgba(232,232,232,.95)'; g.lineWidth = 1.6;
  [[0, s0.zk, 0, s0.zsh], [b.LOA, s1.zk, b.LOA, s1.zsh]].forEach(function(q){
    var a = P(q[0],q[1]), c = P(q[2],q[3]);
    g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(c[0],c[1]); g.stroke();
  });
  return {C:C, g:g, k:k, P:P, zTop:zTop, x0:x0, y0:y0, b:b};
}

/* ------------------------------------------------- passo 7: as anteparas */
function drawAnt(){
  if(!R || !R.ant) return;
  var V = vistaPerfil('cvAnt'), g = V.g, C = V.C, b = V.b, P = V.P, A = R.ant;

  /* as faixas usuais, uma de cada ponta */
  [['v', A.banda.v], ['r', A.banda.r]].forEach(function(q){
    var f0 = q[1][0], f1 = q[1][1];
    var xa = q[0] === 'v' ? b.LOA*(1-f1) : b.LOA*f0;
    var xb = q[0] === 'v' ? b.LOA*(1-f0) : b.LOA*f1;
    var pa = P(xa, 0), pb = P(xb, V.zTop);
    g.fillStyle = 'rgba(155,215,155,.14)';
    g.fillRect(pa[0], pb[1], pb[0]-pa[0], pa[1]-pb[1]);
    g.strokeStyle = 'rgba(155,215,155,.5)'; g.lineWidth = 1; g.setLineDash([3,4]);
    g.beginPath(); g.moveTo(pa[0], pb[1]); g.lineTo(pa[0], pa[1]);
    g.moveTo(pb[0], pb[1]); g.lineTo(pb[0], pa[1]); g.stroke(); g.setLineDash([]);
  });

  /* As balizas ao alcance do cursor saem vivas; as do meio do barco saem
     apagadas, senão o desenho oferece como escolhível uma posição que o
     cursor não alcança.                                                   */
  var ocupada = {}, alcance = {}, teto = A.teto || 0;
  A.itens.forEach(function(a){
    ocupada[a.iF] = true;
    for(var q=1;q<=teto;q++) alcance[a.lado === 'v' ? R.nF - q : q] = true;
  });
  g.lineWidth = 1;
  for(var i=1;i<R.nF;i++){
    if(ocupada[i]) continue;
    var x = R.frames[i], sc = sect(Math.min(1, x/b.LOA));
    var p1 = P(x, sc.zk), p2 = P(x, sc.zsh);
    g.strokeStyle = alcance[i] ? 'rgba(251,177,47,.70)' : 'rgba(251,177,47,.20)';
    g.beginPath(); g.moveTo(p1[0],p1[1]); g.lineTo(p2[0],p2[1]); g.stroke();
  }

  /* as anteparas escolhidas, com o número da caverna */
  g.font = '10px Consolas, monospace';
  A.itens.forEach(function(a){
    var p1 = P(a.x, a.sc.zk), p2 = P(a.x, a.sc.zdc);
    g.strokeStyle = a.passaChapa ? 'rgba(238,154,152,1)' : 'rgba(238,154,152,.6)';
    g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(p1[0],p1[1]); g.lineTo(p2[0],p2[1]); g.stroke();
  });
  /* Os dois rótulos crescem um contra o outro — o de vante para a esquerda,
     o de ré para a direita — e se encontram quando as duas anteparas vão ao
     máximo do cursor.  Mede antes: se colidirem, o de ré desce duas linhas. */
  var rot = A.itens.map(function(a){
    var l1 = fmt(a.nCav,0) + 'ª caverna ' + (a.lado === 'v' ? 'da proa' : 'do espelho');
    var l2 = fmt(a.area,2) + ' m²';
    var w = Math.max(g.measureText(l1).width, g.measureText(l2).width);
    var p2 = P(a.x, a.sc.zdc), xa = p2[0] + (a.lado === 'v' ? -5 : 5);
    /* e nenhum deles sai pela borda do quadro */
    if(a.lado === 'v') xa = Math.max(xa, w + 3);
    else               xa = Math.min(xa, C.w - w - 3);
    return {a:a, l1:l1, l2:l2, w:w, x:xa, y:p2[1], dy:0,
            esq:(a.lado === 'v' ? xa - w : xa), dir:(a.lado === 'v' ? xa : xa + w)};
  });
  if(rot.length === 2 && rot[0].dir > rot[1].esq && rot[1].dir > rot[0].esq){
    var baixo = rot[0].a.lado === 'r' ? rot[0] : rot[1];
    baixo.dy = 25;
  }
  g.fillStyle = 'rgba(238,154,152,1)';
  g.textBaseline = 'bottom';
  rot.forEach(function(t){
    g.textAlign = t.a.lado === 'v' ? 'right' : 'left';
    g.fillText(t.l1, t.x, t.y - 14 + t.dy);
    g.fillText(t.l2, t.x, t.y - 3 + t.dy);
  });

  /* a cota do comprimento, no pé */
  var q0 = P(0,0), q1 = P(b.LOA,0);
  dimH(g, q0[0], q1[0], C.h - 8, 'LOA ' + fmt(b.LOA,2) + ' m · ' + fmt(R.nF,0) +
       ' vãos de ' + fmt(R.sTe,0) + ' mm', 'rgba(191,191,191,.9)');
}

/* ------------------------------------------------- passo 8: o centro de massa */
function drawCG(){
  if(!R || !R.pes) return;
  var V = vistaPerfil('cvCG'), g = V.g, C = V.C, b = V.b, P = V.P, Pp = R.pes;

  /* linha d'água, para se ler a altura do centro contra ela */
  var pa = P(0, b.d), pb = P(b.LOA, b.d);
  g.strokeStyle = 'rgba(95,174,230,.8)'; g.lineWidth = 1.2; g.setLineDash([7,4]);
  g.beginPath(); g.moveTo(pa[0],pa[1]); g.lineTo(pb[0],pb[1]); g.stroke(); g.setLineDash([]);

  /* as anteparas, de referência */
  g.strokeStyle = 'rgba(251,177,47,.7)'; g.lineWidth = 2;
  (R.ant ? R.ant.itens : []).forEach(function(a){
    var p1 = P(a.x, a.sc.zk), p2 = P(a.x, a.sc.zdc);
    g.beginPath(); g.moveTo(p1[0],p1[1]); g.lineTo(p2[0],p2[1]); g.stroke();
  });

  /* cada item, como um disco de área proporcional à massa */
  var mMax = 0;
  Pp.linhas.forEach(function(l){ mMax = Math.max(mMax, l.m); });
  Pp.linhas.forEach(function(l){
    if(l.m <= 0) return;
    var p = P(l.x, l.z), rr = 3 + 11*Math.sqrt(l.m/Math.max(1e-9,mMax));
    g.fillStyle = l.g === 'chapa' ? 'rgba(95,174,230,.30)'
                : l.g === 'ref'   ? 'rgba(238,154,152,.30)' : 'rgba(251,177,47,.30)';
    g.beginPath(); g.arc(p[0], p[1], rr, 0, 2*Math.PI); g.fill();
    g.strokeStyle = l.g === 'chapa' ? 'rgba(95,174,230,.8)'
                  : l.g === 'ref'   ? 'rgba(238,154,152,.8)' : 'rgba(251,177,47,.8)';
    g.lineWidth = 1; g.stroke();
  });

  /* o centro de gravidade */
  var pc = P(Pp.tot.x, Pp.tot.z), R2 = 9;
  g.strokeStyle = 'rgba(238,154,152,1)'; g.lineWidth = 2;
  g.beginPath(); g.arc(pc[0], pc[1], R2, 0, 2*Math.PI); g.stroke();
  g.beginPath();
  g.moveTo(pc[0]-R2-5, pc[1]); g.lineTo(pc[0]+R2+5, pc[1]);
  g.moveTo(pc[0], pc[1]-R2-5); g.lineTo(pc[0], pc[1]+R2+5);
  g.stroke();
  /* os dois quadrantes cheios, como no símbolo de centro de massa */
  g.fillStyle = 'rgba(238,154,152,.85)';
  [[0, Math.PI/2],[Math.PI, 1.5*Math.PI]].forEach(function(q){
    g.beginPath(); g.moveTo(pc[0], pc[1]); g.arc(pc[0], pc[1], R2, q[0], q[1]); g.closePath(); g.fill();
  });

  /* as duas cotas do centro */
  g.font = '10px Consolas, monospace';
  var base = P(0,0);
  dimH(g, base[0], pc[0], C.h - 8, 'LCG ' + fmt(Pp.tot.x,2) + ' m',
       'rgba(238,154,152,.95)');
  dimV(g, base[1], pc[1], Math.max(14, base[0] - 12),
       'VCG ' + fmt(Pp.tot.z,2) + ' m', 'rgba(238,154,152,.95)');
}


/* ============================================================================
   VERSÃO DE AULA — nove passos.
   Lê o mesmo objeto R que a versão avançada, produzido por um único
   compute().  As duas telas nunca podem discordar porque a conta é uma só.
   ========================================================================= */

var NPASSOS = 9;
var ST3 = {step:1, maxStep:1, all:false};
var VIEW = 'aula';

var TEACH_BOATS = [__BARCO_AULA__];
var MAT_SUB = {wood:'0,40 do MOR', ply:'0,50 do MOR a 22%', alu:'0,60 da tração',
               steel:'0,60 da tração', frp:'0,50 da flexão'};

function box(cls, html){ return '<div class="warnbox ' + cls + '">' + html + '</div>'; }

/* Bloco de conta passo a passo.  Cada linha é [rótulo, expressão, valor, fonte] */
function conta(titulo, linhas){
  var h = '<div class="conta-t">' + titulo + '</div>';
  linhas.forEach(function(l, i){
    var fim = l[3] === 'fim';
    h += '<div class="cr' + (fim ? ' fim' : '') + '">' +
         '<span class="cn">' + (fim ? '=' : (i+1)) + '</span>' +
         '<span class="ce">' + l[0] + (l[1] ? '<i>' + l[1] + '</i>' : '') + '</span>' +
         '<span class="cv">' + l[2] + '</span>' +
         '<span class="cs">' + (l[3] && l[3] !== 'fim' ? l[3] : '') + '</span></div>';
  });
  return h;
}

/* ------------------------------------------------------------------ passo 1 */
function contaSnHTML(){
  var b = ST.boat, S = snGerr(), G = R.GB;
  var L = [];
  if(S.corr.length)
    L.push(['correção aplicada', '', S.corr.join(' e '), 'Fórmulas 1-2 e 1-3']);
  L.push(['comprimento', '', fmt(S.loa,2) + ' m', '']);
  L.push(['boca', '', fmt(S.boca,2) + ' m', '']);
  L.push(['pontal', '', fmt(b.D,2) + ' m', '']);
  L.push(['S<sub>n</sub> = comprimento × boca × pontal ÷ 28,32',
          '= ' + fmt(S.loa,2) + ' × ' + fmt(S.boca,2) + ' × ' + fmt(b.D,2) + ' ÷ 28,32',
          fmt(S.sn,3), 'fim']);
  return conta('O número de escantilhão de Gerr <span class="src">Fórmula 1-1</span>', L);
}
function contaHHTML(){
  var b = ST.boat, L3 = Lscant(), hb = 3.0*b.d, hl = 0.14*L3, h = hb + hl + 1.62;
  var mult = R.reg.fundo.head / h;
  return conta('A carga de projeto do ABS <span class="src">Tabela 7.1</span>', [
    ['3,0 × calado', '= 3,0 × ' + fmt(b.d,3), fmt(hb,2) + ' m', ''],
    ['0,14 × comprimento', '= 0,14 × ' + fmt(L3,2), fmt(hl,2) + ' m', 'L = (LOA+LWL)÷2'],
    ['parcela fixa', '', '1,62 m', ''],
    ['carga básica h', '= ' + fmt(hb,2) + ' + ' + fmt(hl,2) + ' + 1,62', fmt(h,2) + ' m', ''],
    ['no fundo, × ' + fmt(mult,2), '', fmt(R.reg.fundo.head,2) + ' m', 'fim']
  ]);
}

/* ------------------------------------------------------------------ passo 5 */
function contaTHTML(rk){
  rk = rk || 'fundo';
  var o = R.reg[rk], MP = R.MP, L = [];
  var srcF = (rk === 'conves') ? 'Tabela 7.5' : 'Tabela 7.4';
  L.push(['carga de projeto', '', fmt(o.head,2) + ' m', 'Tabela 7.1']);
  if(MP.mat === 'wood'){
    var af = o.af, sigKgf = MP.sigA/KGF;
    L.push(['tensão de projeto', '= 0,40 × ' + fmt(MP.ult,0), fmt(MP.sigA,1) + ' N/mm²', 'Tabela 7.2']);
    L.push(['fator de escala do tabuado', '= 1,09 × |4,2 − 1,13 × <sup>4</sup>√' + fmt(Lscant(),2) + '|',
            fmt(af,3), 'equação 7.5.1']);
    L.push(['espaçamento das cavernas', '', fmt(o.s,0) + ' mm', '']);
    L.push(['t = ' + fmt(af,3) + ' × ' + fmt(o.s,0) + ' × √(0,001 × ' + fmt(o.head,2) + ' ÷ ' + fmt(sigKgf,2) + ')',
            '', fmt(o.t,2) + ' mm', 'fim']);
    return conta('O caminho longo, do ABS · ' + nomeReg(rk) +
                 ' <span class="src">equação 7.5.1</span>', L);
  }
  L.push(['desconto por área', '', o.F === null ? '—' : fmt(o.F,3), srcF]);
  var pisoFh = o.notes.join(' ').indexOf('piso Fh') >= 0;
  L.push(['pressão', pisoFh
      ? '= 0,01 × ' + fmt(o.Fh,2) + ', já com o piso da Tabela 7.1'
      : '= 0,01 × ' + fmt(o.F,3) + ' × ' + fmt(o.head,2),
    fmt(o.p,4) + ' N/mm²', '']);
  L.push(['forma do painel', '= painel ' + fmt(o.s,0) + ' × ' + fmt(o.l,0) + ' mm', 'k = ' + fmt(o.k,3), 'Tabela 7.3']);
  L.push(['tensão de projeto', '', fmt(MP.sigA,1) + ' N/mm²', 'Tabela 7.2']);
  L.push(['aresta curta do painel', '', fmt(o.s,0) + ' mm', '']);
  var raiz = Math.sqrt(o.p * o.k / MP.sigA);
  if(MP.mat === 'frp'){
    L.push(['pela resistência', '= ' + fmt(o.s,0) + ' × √(' + fmt(o.p,4) + ' × ' + fmt(o.k,3) + ' ÷ ' + fmt(MP.sigA,1) + ')',
            fmt(o.ta,2) + ' mm', 'equação 7.3.1a']);
    L.push(['pela rigidez', '= 0,75 × ' + fmt(o.s,0) + ' × ∛(' + fmt(o.pb,4) + ' × ' + fmt(o.k1,4) + ' ÷ (0,02 × ' + fmt(MP.E,0) + '))',
            fmt(o.tb,2) + ' mm', 'equação 7.3.1b']);
    L.push(['vale a maior das duas', '', fmt(o.t,2) + ' mm', 'fim']);
  } else {
    L.push(['t = ' + fmt(o.s,0) + ' × √(' + fmt(o.p,4) + ' × ' + fmt(o.k,3) + ' ÷ ' + fmt(MP.sigA,1) + ')',
            '= ' + fmt(o.s,0) + ' × ' + fmt(raiz,5), fmt(o.ta,2) + ' mm', MP.tminK ? '' : 'fim']);
    if(MP.tminK){
      var manda = o.gov.indexOf('mínimo') === 0;
      L.push(['mínimo construtivo', '= o maior entre ' + fmt(o.s,0) + ' ÷ ' + MP.tminK + ' e 2,5 mm',
              fmt(o.tmin,2) + ' mm', manda ? '' : 'a carga pede mais']);
      L.push([manda ? 'é o mínimo que manda' : 'vale a maior das duas', '',
              fmt(o.t,2) + ' mm', 'fim']);
    }
  }
  return conta('O caminho longo, do ABS · ' + nomeReg(rk) + ' <span class="src">equação ' +
               (MP.mat === 'frp' ? '7.3.1' : '7.1') + '</span>', L);
}
function contaGHTML(){
  var G = R.GB, MP = R.MP;
  if(!G) return '';
  var L = [['S<sub>n</sub> do passo 1', '', fmt(G.sn,3), 'Fórmula 1-1']];
  if(MP.mat === 'frp'){
    L.push(['base = 6,35 × S<sub>n</sub><sup>1/3</sup>', '= 6,35 × ' + fmt(Math.pow(G.sn,1/3),3),
            fmt(G.base,2) + ' mm', 'Fórmula 4-1']);
    if(G.vAdj > 1) L.push(['ajuste de velocidade', '= 1 + 0,01 × (' + fmt(ST.boat.V,0) + ' − 10)',
                           '× ' + fmt(G.vAdj,3), 'Fórmula 4-4']);
    L.push(['fundo = 1,15 × base' + (G.vAdj>1 ? ' × ajuste' : ''), '', fmt(G.fundo,2) + ' mm', 'fim']);
  } else if(MP.mat === 'wood'){
    L.push(['tabuado = 18,79 × S<sub>n</sub><sup>0,40</sup>', '= 18,79 × ' + fmt(Math.pow(G.sn,0.40),3),
            fmt(G.base,2) + ' mm', 'Fórmula 9-1']);
    if(G.vAdj > 1) L.push(['ajuste de velocidade', '= 1 + 0,01 × (' + fmt(ST.boat.V,0) + ' − 25)',
                           '× ' + fmt(G.vAdj,3), 'acima de 25 nós']);
    L.push(['tabuado do fundo', '', fmt(G.fundo,2) + ' mm', 'fim']);
  } else if(MP.mat === 'ply'){
    L.push(['casca = 13,97 × S<sub>n</sub><sup>0,38</sup>', '= 13,97 × ' + fmt(Math.pow(G.sn,0.38),3),
            fmt(G.fundo,2) + ' mm', 'fim']);
  } else if(MP.mat === 'alu'){
    var bruto = 5.08*Math.pow(G.sn,0.21);
    L.push(['fundo = 5,08 × S<sub>n</sub><sup>0,21</sup>', '= 5,08 × ' + fmt(Math.pow(G.sn,0.21),3),
            fmt(bruto,2) + ' mm', 'Fórmula 15-1A']);
    L.push(['mínimo soldável do livro', G.pisoSold ? '= a fórmula pediu menos que isto' : '',
            '4,75 mm', G.pisoSold ? '' : 'a fórmula pede mais']);
    L.push([G.pisoSold ? 'é o mínimo soldável que manda' : 'vale a fórmula', '',
            fmt(G.fundo,2) + ' mm', 'fim']);
  } else {
    L.push(['costado = 3,05 × S<sub>n</sub><sup>0,25</sup>', '= 3,05 × ' + fmt(Math.pow(G.sn,0.25),3),
            fmt(G.costado,2) + ' mm', 'Fórmula 15-2S']);
    L.push(['fundo = costado + ' + fmt(G.C,1) + ' mm', '', fmt(G.fundo,2) + ' mm', 'fim']);
  }
  return conta('O caminho curto, do livro de Gerr <span class="src">' +
               'The Elements of Boat Strength</span>', L);
}

/* ================================================================== RENDER */
function renderAula(scroll){
  var r = computeE(), MP = r.MP, b = ST.boat, o = r.reg.fundo;

  /* ---- passos ---- */
  el('prog').innerHTML = '';
  for(var i=1;i<=NPASSOS;i++){
    var it = document.createElement('i');
    it.className = (i === ST3.step && !ST3.all) ? 'now' : (i <= ST3.maxStep ? 'done' : '');
    el('prog').appendChild(it);
    var sEl = el('s'+i), aberto = ST3.all || i === ST3.step;
    sEl.classList.toggle('open', aberto);
    sEl.classList.toggle('done', i < ST3.maxStep && !aberto);
    sEl.classList.toggle('locked', !ST3.all && i > ST3.maxStep);
  }

  /* ---- passo 1 ---- */
  var bc = el('boatChipsA');
  if(!bc.childElementCount){
    TEACH_BOATS.forEach(function(tb){
      var bt = document.createElement('button');
      bt.className = 'chip'; bt.type = 'button';
      bt.innerHTML = tb.n + '<small>' + tb.sub + '</small>';
      bt.dataset.bi = tb.i;
      bt.onclick = function(){
        ST.boat = JSON.parse(JSON.stringify(BOATS[tb.i])); ST.boat.n = tb.n;
        ST.t = {fundo:null,costado:null,espelho:null,conves:null}; ST.perf = {};
        ST.ant.manV = ST.ant.manR = false;
        var ts = typicalSpacing(); ST.sL = Math.round(ts.sL/5)*5; ST.sT = Math.round(ts.sT/5)*5;
        renderPartAula(); renderAula();
      };
      bc.appendChild(bt);
    });
  }
  Array.prototype.forEach.call(bc.children, function(c){
    c.setAttribute('aria-pressed', Math.abs(BOATS[+c.dataset.bi].LOA - b.LOA) < 1e-9);
  });
  el('contaSn').innerHTML = contaSnHTML();
  el('contaH').innerHTML  = contaHHTML();
  el('v1').innerHTML = b.n + ' · S<sub>n</sub> = ' + fmt(r.Sn,3) + ' · carga no fundo ' + fmt(o.head,2) + ' m';

  /* ---- passo 2 ---- */
  var mc = el('matChipsA');
  if(!mc.childElementCount){
    MATS.forEach(function(m){
      var bt = document.createElement('button');
      bt.className = 'chip'; bt.type = 'button';
      bt.innerHTML = m.n + '<small>' + MAT_SUB[m.k] + '</small>';
      bt.dataset.mk = m.k;
      bt.onclick = function(){
        ST.mat = m.k; ST.t = {fundo:null,costado:null,espelho:null,conves:null}; ST.perf = {};
        ST.ant.manV = ST.ant.manR = false;
        var ts = typicalSpacing(); ST.sL = Math.round(ts.sL/5)*5; ST.sT = Math.round(ts.sT/5)*5;
        renderAula();
      };
      mc.appendChild(bt);
    });
  }
  Array.prototype.forEach.call(mc.children, function(c){
    c.setAttribute('aria-pressed', c.dataset.mk === ST.mat);
  });
  var tMaxB = 0; r.matBars.forEach(function(q){ tMaxB = Math.max(tMaxB, q.t); });
  el('matBarsA').innerHTML = r.matBars.map(function(q){
    return '<div class="bar ' + (q.k === ST.mat ? 'sel hi' : '') + '">' +
      '<span class="bk">' + q.n + '</span>' +
      '<span class="bt"><i style="width:' + (100*q.t/tMaxB).toFixed(1) + '%"></i></span>' +
      '<span class="bv">' + fmt(q.t,2) + ' mm</span></div>';
  }).join('');
  el('matMoreA').innerHTML =
    '<p>Selecionado: <b>' + MP.label + '</b>.</p>' +
    '<p>Ruptura de referência <b>' + fmt(MP.ult,1) + ' N/mm²</b> <span class="src">' + MP.srcUlt + '</span><br>' +
    'Tensão de projeto do chapeamento <b>' + fmt(MP.sigA,1) + ' N/mm²</b> <span class="src">' + MP.srcA + '</span><br>' +
    'Tensão de projeto dos reforços <b>' + fmt(MP.sigInt,1) + ' N/mm²</b> <span class="src">' + MP.srcInt + '</span><br>' +
    'Módulo de elasticidade <b>' + fmt(MP.E,0) + ' N/mm²</b><br>' +
    'Fator de segurança embutido <b>' + fmt(MP.fs_abs_implicito,2) + '</b></p>' +
    '<p>Equação do ABS: <b>' + MP.eq + '</b>. Arranjo previsto: ' + MP.frame +
    '. Largura efetiva de chapeamento no reforço: ' + MP.effw + '.</p>' +
    (MP.notes.length ? '<p><b>Ressalvas:</b> ' + MP.notes.join(' ') + '</p>' : '');
  el('v2m').innerHTML = MATS.filter(function(m){return m.k===ST.mat;})[0].n +
    ' · σ<sub>a</sub> = ' + fmt(MP.sigA,1) + ' N/mm² · FS embutido ' + fmt(MP.fs_abs_implicito,2);

  /* ---- passo 3 ---- */
  el('velA').max = Math.max(12, Math.ceil(r.VmaxSn*1.1));
  el('velA').value = b.V;
  el('velOutA').innerHTML = fmt(b.V,1) + ' <small>nós</small>';
  var vb = '';
  if(o.govWho === 'Gerr')
    vb += box('bad', 'A <b>' + fmt(b.V,1) + ' nós</b> o impacto pede <b>' + fmt(o.tGerr,2) +
      ' mm</b> e a hidrostática só ' + fmt(o.tAbs,2) + ' mm. Quem manda agora é o impacto.');
  else
    vb += box('ok', 'A <b>' + fmt(b.V,1) + ' nós</b> o impacto pede ' + fmt(o.tGerr,2) +
      ' mm, contra ' + fmt(o.tAbs,2) + ' mm da hidrostática. Ainda manda a carga de regra' +
      (r.cross !== null ? ', e o impacto assume a partir de <b>' + fmt(r.cross,1) + ' nós</b>.' : '.'));
  vb += box('', 'Com S<sub>n</sub> = ' + fmt(r.Sn,2) + ', o teto do método é <code>45 − 0,33 × ' +
    fmt(r.Sn,2) + '</code> = <b>' + fmt(r.VmaxSn,1) + ' nós</b>. Você está a ' +
    fmt(100*b.V/r.VmaxSn,0) + '% dele.');
  el('velBoxA').innerHTML = vb;
  el('v3s').innerHTML = fmt(b.V,1) + ' nós · manda a ' + (o.govWho === 'Gerr' ? 'carga de impacto' : 'hidrostática');

  /* ---- passo 4 ---- */
  el('sLA').value = ST.sL; el('sTA').value = ST.sT;
  el('sLOutA').innerHTML = fmt(ST.sL,0) + ' <small>mm</small>';
  el('sTOutA').innerHTML = fmt(ST.sT,0) + ' <small>mm</small>';
  el('sectFactsA').innerHTML = (r.nF-1) + ' balizas a ' + fmt(r.sTe,0) +
    ' mm · painel do fundo ' + fmt(o.s,0) + ' × ' + fmt(o.l,0) + ' mm';
  el('planFactsA').innerHTML = 'balizas a ' + fmt(r.sTe,0) + ' mm · longitudinais a ' +
    fmt(r.lay.fundo.s,0) + ' mm no perímetro · a aresta curta agora é ' +
    (r.sTe <= r.lay.fundo.s ? 'a baliza' : 'o longitudinal') + ', com ' + fmt(o.s,0) + ' mm';
  var quemCurta = (o.sp <= o.span) ? 'o espaçamento dos longitudinais' : 'o cavernamento';
  var travado = (MP.mat === 'wood' || MP.mat === 'ply');
  el('shapeBoxA').innerHTML = box(travado ? '' : 'ok',
    'Neste material o coeficiente de forma ' + (travado
      ? 'está <b>travado em k = 0,500</b>: a Tabela 7.3 não deixa a madeira aproveitar o painel quadrado. Mexer na forma não muda nada aqui — só mexer no vão. Troque para alumínio, aço ou fibra de vidro para ver o efeito aparecer.'
      : 'vale de verdade: agora <b>k = ' + fmt(o.k,3) + '</b> para um painel de aspecto ' + fmt(o.aspect,2) +
        '. Chegue perto do painel quadrado e ele desce em direção a 0,308.') +
    ' A aresta curta neste momento é <b>' + quemCurta + '</b>, com ' + fmt(o.s,0) + ' mm.');
  el('v4s').innerHTML = 'painel ' + fmt(o.s,0) + ' × ' + fmt(o.l,0) + ' mm · k = ' + fmt(o.k,3);

  /* ---- passo 5 ---- */
  el('contaT').innerHTML = contaTHTML();
  el('contaG').innerHTML = contaGHTML();
  if(r.GB){
    var dif = 100*(r.GB.fundo/o.tGov - 1), ad = Math.abs(dif), msg;
    if(ad <= 20)
      msg = 'Praticamente o mesmo número, por dois caminhos que não têm nada em comum: um passou por carga, painel e material; o outro multiplicou três medidas do barco. É assim que se ganha confiança num resultado.';
    else if(dif > 0)
      msg = 'O caminho curto pede mais. Isso não é contradição — é que <b>uma regra é um pacote</b>. O S<sub>n</sub> de Gerr entrega espessura <em>e</em> arranjo interno juntos, calibrados um pelo outro em centenas de barcos reais. O ABS entrega a espessura para o arranjo que <em>você</em> desenhou, e deixa você trocar espessura por reforço. Aperte os reforços no passo 4 e veja a coluna do ABS afinar; a de Gerr não se mexe, porque ela nem sabe do seu espaçamento.' +
            (MP.mat === 'frp' ? ' Em fibra de vidro a diferença é a maior de todas, e o próprio Gerr comenta o assunto no paper do IBEX, p.31: a estrutura em fibra da regra S<sub>n</sub> em geral vai <em>atender ou exceder</em> o ABS em barcos abaixo de 45 pés — e ele acrescenta que <em>bater com o ABS nunca foi objetivo</em> da regra S<sub>n</sub>. As duas coisas juntas: a folga existe, mas é consequência, não projeto.' : '');
    else
      msg = 'O caminho curto pede menos. Repare no espaçamento que você está usando: se ele for mais largo que o do pacote de Gerr, o ABS cobra a diferença na espessura da chapa. Um vão maior sempre custa chapa.';
    el('cmpBox').innerHTML = box(ad <= 20 ? 'ok' : '',
      'O caminho longo pede <b>' + fmt(o.tGov,2) + ' mm</b>; o curto, <b>' + fmt(r.GB.fundo,2) +
      ' mm</b>. Diferença de <b>' + (dif >= 0 ? '+' : '') + fmt(dif,0) + '%</b>. ' + msg) +
      box('', 'O pacote de Gerr para este barco também traz o arranjo: ' +
        (r.GB.esp.lon ? 'longitudinais a <b>' + fmt(r.GB.esp.lon,0) + ' mm</b> e ' : '') +
        'transversais a <b>' + fmt(r.GB.esp.tra,0) + ' mm</b> <span class="src">Fórmulas ' +
        r.GB.esp.f + '</span>. É esse arranjo que o painel adota quando você troca de material ou de barco.');
  } else el('cmpBox').innerHTML = '';
  var lad = MP.comm ? MP.comm.slice() : [];
  if(!lad.length){ for(var q3=1;q3<=9;q3++) lad.push(Math.round((o.tGov*(0.6+0.2*q3))*2)/2); }
  var opts = lad.filter(function(x){ return x >= o.tGov*0.55 && x <= o.tGov*2.4; });
  if(!opts.length) opts = [commRound(o.tGov, MP.comm)];
  if(opts.indexOf(o.tCom) < 0) opts.push(o.tCom);
  opts.sort(function(a,c){ return a-c; });
  var tc = el('tChipsA'); tc.innerHTML = '';
  opts.forEach(function(x){
    var bt = document.createElement('button');
    bt.className = 'chip'; bt.type = 'button';
    bt.innerHTML = fmt(x,1) + ' mm' + (x === o.tCom ? '<small>a exigida, arredondada</small>' :
                   (x < o.tGov ? '<small>abaixo do exigido</small>' : '<small>com folga</small>'));
    bt.setAttribute('aria-pressed', Math.abs(x - o.tAdo) < 1e-6);
    bt.onclick = function(){ ST.t.fundo = x; renderAula(); };
    tc.appendChild(bt);
  });
  var fsMax = Math.max(o.fsABS, o.gerr.FS, MP.fs_abs_implicito) * 1.05;
  el('tBarsA').innerHTML =
    '<div class="bar"><span class="bk">' + FS_ROT_REGRA + '</span><span class="bt"><i style="width:' +
      (100*Math.min(o.fsABS,fsMax)/fsMax).toFixed(1) + '%"></i></span><span class="bv">' + fmtFS(o.fsABS) + '</span></div>' +
    '<div class="bar hi"><span class="bk">' + FS_ROT_IMPACTO + '</span><span class="bt"><i style="width:' +
      (100*Math.min(o.gerr.FS,fsMax)/fsMax).toFixed(1) + '%"></i></span><span class="bv">' + fmtFS(o.gerr.FS) + '</span></div>';
  el('fsLegA').innerHTML = fsLegendaCurta();
  var fb = '';
  if(o.tAdo >= o.tGov - 1e-6)
    fb += box('ok', 'A bitola de <b>' + fmt(o.tAdo,1) + ' mm</b> cobre a exigência de ' + fmt(o.tGov,2) +
      ' mm, com <b>' + fmt(100*(o.tAdo/o.tGov - 1),0) + '%</b> de folga. O FS contra a carga da regra subiu de ' +
      fmt(MP.fs_abs_implicito,2) + ' para <b>' + fmtFS(o.fsABS) + '</b>.');
  else
    fb += box('bad', 'A bitola de <b>' + fmt(o.tAdo,1) + ' mm</b> é menor que a exigência de ' + fmt(o.tGov,2) +
      ' mm. O FS caiu para ' + fmtFS(o.fsABS) + ', abaixo de ' + fmt(MP.fs_abs_implicito,2) +
      '. O Guia não exige fator nenhum — exige que a tensão fique dentro da tensão de projeto ' +
      'da Tabela 7.2, e é isso que deixou de valer aqui.');
  fb += box(o.gerr.FS >= o.gerr.fsTarget ? 'ok' : 'bad',
    'Contra a carga de impacto o FS é <b>' + fmtFS(o.gerr.FS) + '</b>, e o alvo para carga dinâmica de fundo é <b>1,5</b>. ' +
    (o.gerr.FS >= o.gerr.fsTarget ? 'Passa.' : 'Não passa — engrosse a chapa ou aperte os reforços.'));
  el('fsBoxA').innerHTML = fb;
  el('minBoxA').innerHTML = MP.tminK
    ? box(o.gov.indexOf('mínimo') === 0 ? 'ok' : '',
      'Em ' + (MP.mat === 'alu' ? 'alumínio' : 'aço') + ' existe uma <b>espessura mínima construtiva</b>: <code>s ÷ ' +
      MP.tminK + '</code> ou 2,5 mm, o que for maior — aqui <b>' + fmt(o.tmin,2) + ' mm</b>. ' +
      (o.gov.indexOf('mínimo') === 0 ? 'É ela que manda neste arranjo, e não a carga.'
       : 'Neste arranjo a carga ainda pede mais que ela.') +
      ' O livro de Gerr põe o mínimo soldável do alumínio em 4,75 mm, pelo mesmo motivo: abaixo disso a chapa distorce na solda.')
    : '';
  el('v5t').innerHTML = fmt(o.tAdo,1) + ' mm adotados · FS regra ' + fmtFS(o.fsABS) + ' · FS impacto ' + fmtFS(o.gerr.FS);

  /* ---- passo 9 ---- */
  var tb2 = el('sumTableA').querySelector('tbody'); tb2.innerHTML = '';
  r.ORD.forEach(function(k){
    var q = r.reg[k], tr = document.createElement('tr');
    tr.innerHTML = '<td>' + nomeReg(k) + '</td><td>' + fmt(q.head,2) + '</td><td>' +
      fmt(q.s,0) + ' × ' + fmt(q.l,0) + '</td><td class="w">' + fmt(q.tGov,2) + '</td><td>' +
      fmt(q.tAdo,1) + '</td><td class="' + (q.fsABS >= MP.fs_abs_implicito - 1e-6 ? 'ok':'bad') + '">' +
      fmtFS(q.fsABS) + '</td><td>' + fmt(r.massa[k],0) + '</td>';
    tb2.appendChild(tr);
  });
  el('sumCapA').innerHTML = '<b>FS regra</b>: razão entre a ruptura do material e a tensão ' +
    'sob a carga hidrostática do ABS com a espessura adotada. O Guia não publica esse número — ' +
    'publica a tensão de projeto da <b>Tabela 7.2</b>, e daí sai o piso de ' +
    fmt(MP.fs_abs_implicito,2) + ' desta coluna. O FS contra o impacto, de Gerr, está no passo 5 ' +
    'e no PDF. — Área total de chapeamento ' +
    fmt(r.area.fundo+r.area.costado+r.area.conves+r.area.espelho,1) + ' m², massa ' +
    fmt(r.massaTot,0) + ' kg com densidade de ' + fmt(r.dens,0) + ' kg/m³ — ' +
    (MP.mat === 'wood' || MP.mat === 'ply' ? 'a massa específica da Tabela 4.4 do ABS'
                                           : 'valor de catálogo, que não consta das fontes') +
    '. A massa é só do chapeamento: reforços, anteparas e acessórios não entram.';
  var bal = r.stiff[3];
  el('stiffBoxA').innerHTML = box('',
    'Para a <b>baliza</b> deste arranjo, com vão de ' + fmt(r.ellFrame,2) +
    ' m da borda à quilha e espaçamento de ' + fmt(r.sTe,0) +
    ' mm, a regra pede módulo de seção de <b>' + fmt(bal.SMreq,1) + ' cm³</b>' +
    (bal.sec && bal.sec !== '—' ? ' — o que dá uma ' + bal.sec : '') +
    '. Dobre o espaçamento das balizas e essa exigência mais que dobra: ela cresce com o ' +
    'espaçamento vezes o vão ao quadrado.');
  el('alertBoxA').innerHTML = r.alerts.map(function(w){ return box(w.c, w.t); }).join('');
  el('finalTakeA').innerHTML = '<b>O caminho inteiro:</b> o barco deu a carga (' + fmt(o.head,2) +
    ' m de coluna d’água) e o número S<sub>n</sub> = ' + fmt(r.Sn,3) + '; o material deu a tensão admissível (' +
    fmt(MP.sigA,1) + ' N/mm²); o espaçamento deu o painel (' + fmt(o.s,0) + ' × ' + fmt(o.l,0) +
    ' mm). Daí saiu a espessura exigida de ' + fmt(o.tGov,2) + ' mm. Você adotou ' + fmt(o.tAdo,1) +
    ' mm, e o chapeamento pesa ' + fmt(r.massaTot,0) + ' kg.';
  el('v9r').innerHTML = fmt(r.massaTot,0) + ' kg de chapeamento · ' + r.alerts.length + ' observações';

  /* ---- ficha do pé ---- */
  el('dkBoat').innerHTML = fmt(b.LOA,1) + ' <small>m</small>';
  el('dkMat').innerHTML = '<small>' + MATS.filter(function(m){return m.k===ST.mat;})[0].n + '</small>';
  el('dkPan').innerHTML = fmt(o.s,0) + '<small>×' + fmt(o.l,0) + '</small>';
  el('dkReq').innerHTML = fmt(o.tGov,2) + ' <small>mm</small>';
  el('dkAdo').innerHTML = fmt(o.tAdo,1) + ' <small>mm</small>';
  el('dkAdo').className = 'dk-v ' + (o.tAdo >= o.tGov - 1e-6 ? 'ok' : 'bad');
  el('dkFS').textContent = fmtFS(o.fsABS);
  el('dkFS').className = 'dk-v ' + (o.fsABS >= MP.fs_abs_implicito - 1e-6 ? 'ok' : 'bad');
  el('dkNote').innerHTML = 'fundo · manda a ' + (o.govWho === 'Gerr' ? 'carga de impacto' : 'hidrostática') +
    ' · Gerr pelo livro ' + (r.GB ? fmt(r.GB.fundo,2) + ' mm' : '—') + '<br>passo ' + ST3.step + ' de ' + NPASSOS;

  /* ---- passos 6, 7 e 8 ---- */
  renderPerfis(r); renderAnteparas(r); renderPesos(r);

  try{ drawPanelDiagram(); drawPlanAula(); drawSectionAula();
       drawSpcCurve(); drawVelCurveAula(); drawAnt(); drawCG(); }catch(e){}
  if(scroll){ var t = el('s'+ST3.step); if(t) t.scrollIntoView({behavior:'smooth', block:'start'}); }
}

/* particulares editáveis da aula */
var PART_A = [['LOA','comprimento total','m',0.01],['LWL','comprimento na linha d’água','m',0.01],
              ['BOA','boca máxima','m',0.01],['BWL','boca na linha d’água','m',0.01],
              ['D','pontal D','m',0.01],['d','calado d','m',0.01],
              ['disp','deslocamento','t',0.01],['rake','inclinação do espelho','graus',0.5]];
function renderPartAula(){
  var pg = el('partGridA'); pg.innerHTML = '';
  PART_A.forEach(function(p){
    var d = document.createElement('div'); d.className = 'fld';
    d.innerHTML = '<label>' + p[1] + ' · ' + p[2] + '</label>';
    var inp = document.createElement('input');
    inp.className = 'num'; inp.type = 'number'; inp.step = p[3]; inp.value = ST.boat[p[0]];
    inp.oninput = function(){
      var v = parseFloat(inp.value);
      if(isFinite(v) && v > 0){ ST.boat[p[0]] = v; ST.t.fundo = null; renderAula(); }
    };
    d.appendChild(inp); pg.appendChild(d);
  });
}


/* ============================================================================
   MEMÓRIA DE CÁLCULO IMPRIMÍVEL
   Monta, fora das duas telas, um documento com todos os dados de entrada e
   toda a conta, região por região, e manda imprimir.  O navegador oferece
   "Salvar como PDF" no próprio diálogo — é assim que se faz PDF sem depender
   de biblioteca externa, e o arquivo continua sendo um HTML só.
   ========================================================================= */

function pdfEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function pdfData(){
  var d = new Date(), p = function(v){ return (v < 10 ? '0' : '') + v; };
  return p(d.getDate()) + '/' + p(d.getMonth()+1) + '/' + d.getFullYear() +
         ' às ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
/* linha de tabela chave-valor */
function pdfKV(k, v, src){
  return '<tr><th scope="row">' + k + '</th><td>' + v + '</td><td class="src-c">' +
         (src || '') + '</td></tr>';
}
function pdfSec(n, tit, corpo){
  return '<section class="pd-sec"><h2><span class="pd-n">' + n + '</span>' + tit + '</h2>' +
         corpo + '</section>';
}

/* ---- 1. a embarcação ---- */
function pdfBarco(){
  var b = ST.boat, S = snGerr(), GV = R.GV, SF = R.SF, rows = '';
  [['comprimento total L<sub>OA</sub>', fmt(b.LOA,2) + ' m', ''],
   ['comprimento na linha d’água L<sub>WL</sub>', fmt(b.LWL,2) + ' m', ''],
   ['boca máxima B<sub>OA</sub>', fmt(b.BOA,2) + ' m', ''],
   ['boca na linha d’água B<sub>WL</sub>', fmt(b.BWL,2) + ' m', ''],
   ['pontal D', fmt(b.D,2) + ' m', ''],
   ['calado d', fmt(b.d,3) + ' m', ''],
   ['deslocamento Δ', fmt(b.disp,3) + ' t', ''],
   ['ângulo de fundo', fmt(b.beta,1) + '°', ''],
   ['inclinação do espelho', fmt(b.rake,1) + '°', ''],
   ['velocidade máxima', fmt(b.V,1) + ' nós', 'entrada do passo 3']
  ].forEach(function(r){ rows += pdfKV(r[0], r[1], r[2]); });
  var der = '';
  [['comprimento de escantilhão L = (L<sub>OA</sub> + L<sub>WL</sub>) ÷ 2', fmt(R.L,3) + ' m', 'ABS §2.1'],
   ['carga básica h = 3,0d + 0,14L + 1,62', fmt(R.h,3) + ' m', 'ABS Tab. 7.1'],
   ['carga de projeto do convés = 0,04L + 1,83', fmt(deckHead(),3) + ' m', 'ABS Tab. 7.1c'],
   ['número de escantilhão S<sub>n</sub> = L<sub>OA</sub> × boca × D ÷ 28,32',
    fmt(S.sn,3) + (S.corr.length ? ' <i>(com ' + S.corr.join(' e ') + ')</i>' : ''),
    'Gerr, livro · Fórmula 1-1'],
   ['S<sub>n</sub> do paper, em pés = L × B × D ÷ 1000', fmt(R.Sn,3), 'Gerr, IBEX p.5'],
   ['teto de velocidade do método = 45 − 0,33 × S<sub>n</sub>', fmt(R.VmaxSn,1) + ' nós', 'Gerr, IBEX p.8'],
   ['razão velocidade-comprimento V ÷ √L<sub>WL</sub>', fmt(SF.sl,3), ''],
   ['fator de velocidade f<sub>V</sub> = (V ÷ V<sub>ref</sub>)²',
    fmt(SF.f,3) + ' <i>(V<sub>ref</sub> = ' + fmt(SF.vref,1) + ' nós)</i>', 'derivado — ver §12'],
   ['razão deslocamento-comprimento D/L', fmt(GV.dl,0), 'faixa do livro: 100 a 275']
  ].forEach(function(r){ der += pdfKV(r[0], r[1], r[2]); });
  return '<table class="pd-kv"><caption>Particulares de entrada</caption><tbody>' + rows +
         '</tbody></table><table class="pd-kv"><caption>Grandezas derivadas</caption><tbody>' +
         der + '</tbody></table>' +
         (GV.ok ? '' : '<p class="pd-warn">Fora da faixa declarada pelo livro de Gerr: ' +
           GV.avisos.join('; ') + '. A coluna do ABS não depende disso.</p>');
}

/* ---- 2. o material ---- */
function pdfMaterial(){
  var MP = R.MP, rows = '';
  [['material', '<b>' + MP.label + '</b>', ''],
   ['resistência última de referência', fmt(MP.ult,1) + ' N/mm²', MP.srcUlt],
   ['escoamento', MP.yld ? fmt(MP.yld,1) + ' N/mm²' : 'não se aplica',
    MP.yld ? 'ABS Tab. ' + (MP.mat === 'alu' ? '4.1' : '4.2') : ''],
   ['tensão de projeto do chapeamento σ<sub>a</sub>', fmt(MP.sigA,1) + ' N/mm²', MP.srcA],
   ['tensão de projeto dos reforços', fmt(MP.sigInt,1) + ' N/mm²', MP.srcInt],
   ['módulo de elasticidade E', fmt(MP.E,0) + ' N/mm²', ''],
   ['razão ruptura ÷ tensão de projeto', fmt(MP.fs_abs_implicito,2), 'ver §12, sobre os dois FS'],
   ['equação de chapeamento', MP.eq, 'ABS'],
   ['arranjo estrutural previsto', MP.frame, ''],
   ['largura efetiva de chapeamento no reforço', MP.effw, 'ABS §3.5'],
   ['bitolas comerciais consideradas',
    (MP.comm && MP.comm.length ? MP.comm.map(function(x){ return fmt(x,1); }).join(' · ') + ' mm'
                               : 'contínuo, sem lista'), 'fora das fontes']
  ].forEach(function(r){ rows += pdfKV(r[0], r[1], r[2]); });
  return '<table class="pd-kv"><tbody>' + rows + '</tbody></table>' +
         (MP.notes.length ? '<p class="pd-warn"><b>Ressalvas do material:</b> ' +
            MP.notes.join(' ') + '</p>' : '');
}

/* ---- 3. o arranjo ---- */
function pdfArranjo(){
  var rows = '', tr = R.tr;
  [['espaçamento entre longitudinais, escolhido', fmt(ST.sL,0) + ' mm', 'entrada do passo 4'],
   ['espaçamento entre balizas, escolhido', fmt(ST.sT,0) + ' mm', 'entrada do passo 4'],
   ['balizas ao longo de L<sub>OA</sub>', R.nF + ' vãos de ' + fmt(R.sTe,0) + ' mm', ''],
   ['vão da baliza, borda à quilha', fmt(R.ellFrame,3) + ' m', 'ABS Fig. 8.1'],
   ['longitudinais no fundo, por bordo', R.lay.fundo.nStiff + ' · painéis de ' + fmt(R.lay.fundo.s,0) + ' mm', ''],
   ['longitudinais no costado, por bordo', R.lay.costado.nStiff + ' · painéis de ' + fmt(R.lay.costado.s,0) + ' mm', ''],
   ['longitudinais no convés, por bordo', R.lay.conves.nStiff + ' · painéis de ' + fmt(R.lay.conves.s,0) + ' mm', ''],
   ['grade do espelho de popa', tr.nV + ' × ' + tr.nH + ' painéis de ' +
      fmt(tr.sV,0) + ' × ' + fmt(tr.sH,0) + ' mm', '']
  ].forEach(function(r){ rows += pdfKV(r[0], r[1], r[2]); });
  var t = '<table class="pd-t"><caption>O painel de cada região, e qual aresta manda</caption>' +
    '<thead><tr><th>região</th><th>aresta curta s<br>mm</th><th>aresta longa ℓ<br>mm</th>' +
    '<th>ℓ/s</th><th>k</th><th>quem é a aresta curta</th></tr></thead><tbody>';
  R.ORD.forEach(function(rk){
    var o = R.reg[rk];
    var quem = (rk === 'espelho') ? 'a grade do espelho'
             : (o.sp <= o.span ? 'o espaçamento dos longitudinais' : 'o cavernamento');
    t += '<tr><td class="l">' + nomeReg(rk) + '</td><td>' + fmt(o.s,0) + '</td><td>' +
         fmt(o.l,0) + '</td><td>' + fmt(o.aspect,2) + '</td><td>' + fmt(o.k,3) +
         '</td><td class="l">' + quem + '</td></tr>';
  });
  return '<table class="pd-kv"><tbody>' + rows + '</tbody></table>' + t + '</tbody></table>';
}

/* ---- 4. a conta, região por região ---- */
function pdfImpacto(rk){
  var o = R.reg[rk], g = o.gerr, rows = '';
  function add(k, v, s){ rows += pdfKV(k, v, s || ''); }
  if(rk === 'fundo'){
    add('pressão de pico P<sub>i</sub> = 16,0 + 0,078·L<sub>WL</sub> + 0,0487·Δ',
        fmt(g.Pi,2) + ' psi', 'Hendrickson &amp; Spencer · IBEX p.25');
    add('área de referência A<sub>r</sub> = 25·(Δ ÷ d)·144', fmt(g.Ar,0) + ' pol²', 'IBEX p.26');
    add('área do painel A<sub>d</sub>', fmt(g.Ad,1) + ' pol²', '');
    add('razão A<sub>d</sub> ÷ A<sub>r</sub>', fmt(g.ratio,4), '');
    add('redução de área f<sub>d</sub> = 0,14·(A<sub>d</sub>/A<sub>r</sub>)<sup>−0,285</sup>',
        fmt(g.fd,3), 'Koelbel · IBEX p.26 · limitada a 0,14–0,70');
    add('fator de velocidade f<sub>V</sub>', fmt(g.fV,3), 'derivado — ver §12');
    add('pressão de projeto P<sub>d</sub> = f<sub>V</sub> · f<sub>d</sub> · P<sub>i</sub>',
        fmt(g.Pd,2) + ' psi = ' + fmt(g.Pd_si,4) + ' N/mm²', '');
  } else {
    add('pressão de projeto, emprestada da carga estática do ABS',
        fmt(g.Pd,2) + ' psi = ' + fmt(g.Pd_si,4) + ' N/mm²', 'ABS Tab. 7.1');
    add('por que emprestada', 'o paper dá o critério de FS e de flecha para todas as regiões, ' +
        'mas só dá fórmula de pressão para o fundo', 'ver §12');
  }
  add('parâmetro de membrana A = (P<sub>d</sub>/E)·(b/t)<sup>4</sup>',
      fmt(g.A,1) + (g.outOfChart ? ' <i>(além da abscissa ~220 do gráfico)</i>' : ''),
      'Rawson &amp; Tupper, reproduzido no IBEX');
  add('coeficiente C = min(A/2 ; 1,912 + 0,383A − A²/1922)',
      fmt(g.C,3) + ' · manda ' + (g.A/2 <= 1.912 + 0.383*g.A - g.A*g.A/1922
                                  ? 'a flexão, A/2' : 'a membrana'),
      'polinômio na p.28 do IBEX; o ramo A/2 é deste painel — ver §12');
  add('tensão de membrana σ = C·E·(t/b)²', fmt(g.sig,1) + ' N/mm²', '');
  add('flecha δ', fmt(g.delta_mm,2) + ' mm · b/δ = ' + fmt(g.bOverDelta,0) + ':1',
      'admissível ' + fmt(g.defTarget,0) + ':1');
  add('<b>FS impacto</b> = ruptura ÷ σ',
      '<b>' + fmtFS(g.FS) + '</b> · alvo ' + fmt(g.fsTarget,1) +
      ' · <b>' + (g.FS >= g.fsTarget ? 'passa' : 'não passa') + '</b>',
      (g.dyn ? 'carga dinâmica' : 'carga estática') + ' · IBEX p.29');
  if(rk === 'fundo' && o.tGerr !== null)
    add('espessura que esta carga exigiria', fmt(o.tGerr,2) + ' mm · governa ' + o.gerrGov, '');
  return '<table class="pd-kv"><caption>Verificação pela cadeia de carga de impacto</caption>' +
         '<tbody>' + rows + '</tbody></table>';
}
function pdfRegiao(rk){
  var o = R.reg[rk], MP = R.MP;
  var h = '<h3>' + nomeReg(rk) + '</h3>';
  h += '<table class="pd-kv"><caption>Carga e painel</caption><tbody>' +
    pdfKV('carga de projeto h', fmt(o.head,2) + ' m de coluna d’água',
          'ABS Tab. 7.1 · ' + (o.zone || '')) +
    pdfKV('estação da carga governante', 'X = ' + fmt(o.Xg,2) + ' m da popa, z = ' + fmt(o.zg,2) + ' m', '') +
    pdfKV('painel', fmt(o.s,0) + ' × ' + fmt(o.l,0) + ' mm', '') +
    (o.F === null ? '' : pdfKV('redução por área F', fmt(o.F,3),
        rk === 'conves' ? 'ABS Tab. 7.5' : 'ABS Tab. 7.4')) +
    (o.notes.length ? pdfKV('pisos aplicados', o.notes.join(' · '), 'ABS Tab. 7.1') : '') +
    '</tbody></table>';
  h += '<div class="conta">' + contaTHTML(rk) + '</div>';
  h += pdfImpacto(rk);
  h += '<table class="pd-kv"><caption>Resultado da região</caption><tbody>' +
    pdfKV('exigido pelo ABS', fmt(o.tAbs,2) + ' mm', 'equação ' + o.gov) +
    pdfKV('exigido pela carga de impacto',
          o.tGerr === null ? 'só verificação, ver acima' : fmt(o.tGerr,2) + ' mm', '') +
    pdfKV('<b>espessura governante</b>', '<b>' + fmt(o.tGov,2) + ' mm</b>',
          'manda ' + (o.govWho === 'Gerr' ? 'a carga de impacto' : 'a carga hidrostática do ABS')) +
    pdfKV('bitola comercial seguinte', fmt(o.tCom,1) + ' mm', '') +
    pdfKV('<b>espessura adotada</b>', '<b>' + fmt(o.tAdo,1) + ' mm</b>' +
          (o.tAdo >= o.tGov - 1e-6 ? ' · folga de ' + fmt(100*(o.tAdo/o.tGov-1),0) + '%'
                                   : ' · <b>abaixo do exigido</b>'), 'escolha do projetista') +
    pdfKV('tensão sob a carga da regra', fmt(o.sigAt,1) + ' N/mm²', '') +
    pdfKV('<b>FS regra</b> = ruptura ÷ tensão',
          '<b>' + fmtFS(o.fsABS) + '</b> · mínimo embutido na norma ' + fmt(MP.fs_abs_implicito,2),
          'razão calculada — ver §12') +
    '</tbody></table>';
  return '<div class="pd-reg">' + h + '</div>';
}

/* ---- 5. resumo ---- */
function pdfResumo(){
  var MP = R.MP;
  var t = '<table class="pd-t"><thead><tr><th>região</th><th>carga<br>m</th><th>painel<br>mm</th>' +
    '<th>exigida<br>mm</th><th>adotada<br>mm</th><th>FS regra</th><th>FS impacto</th>' +
    '<th>área<br>m²</th><th>massa<br>kg</th></tr></thead><tbody>';
  R.ORD.forEach(function(k){
    var q = R.reg[k];
    t += '<tr><td class="l">' + nomeReg(k) + '</td><td>' + fmt(q.head,2) + '</td><td>' +
      fmt(q.s,0) + ' × ' + fmt(q.l,0) + '</td><td class="w">' + fmt(q.tGov,2) + '</td><td>' +
      fmt(q.tAdo,1) + '</td><td>' + fmtFS(q.fsABS) + '</td><td>' + fmtFS(q.gerr.FS) + '</td><td>' +
      fmt(R.area[k],2) + '</td><td>' + fmt(R.massa[k],1) + '</td></tr>';
  });
  var aT = R.area.fundo + R.area.costado + R.area.conves + R.area.espelho;
  t += '<tr class="tot"><td class="l">total</td><td></td><td></td><td></td><td></td><td></td>' +
       '<td></td><td>' + fmt(aT,2) + '</td><td>' + fmt(R.massaTot,1) + '</td></tr>';
  t += '</tbody><caption>Massa pela densidade de ' + fmt(R.dens,0) + ' kg/m³ — ' +
    (MP.mat === 'wood' || MP.mat === 'ply' ? 'massa específica da Tabela 4.4 do ABS'
                                           : 'valor de catálogo, fora das fontes') +
    '. Só o chapeamento: reforços, anteparas e acessórios não entram. Fora do fundo as duas ' +
    'colunas de FS costumam coincidir: ali a verificação de impacto usa a mesma carga do ABS ' +
    'e o painel ainda está em regime de flexão — a §12 explica.</caption></table>';
  return t;
}

/* ---- 6. reforços: o módulo exigido ---- */
function pdfReforcos(){
  var MP = R.MP;
  var t = '<table class="pd-t"><thead><tr><th>reforço</th><th>C</th><th>F<sub>i</sub></th>' +
    '<th>h<br>m</th><th>s<br>m</th><th>ℓ<br>m</th><th>SM ABS<br>cm³</th>' +
    '<th>SM Gerr<br>cm³</th><th>SM exigido<br>cm³</th><th>seção proposta</th></tr></thead><tbody>';
  R.stiff.forEach(function(r){
    t += '<tr><td class="l">' + r.name + '</td><td>' + fmt(r.C,0) + '</td><td>' + fmt(r.Fi,3) +
      '</td><td>' + fmt(r.h,2) + '</td><td>' + fmt(r.s,3) + '</td><td>' + fmt(r.l,3) +
      '</td><td>' + fmt(r.SM,2) + '</td><td>' + (r.SMg ? fmt(r.SMg,2) : '—') +
      '</td><td class="w">' + (r.SMreq ? fmt(r.SMreq,2) : '—') + '</td><td class="l">' +
      r.sec + '</td></tr>';
  });
  t += '</tbody><caption>SM pelo ABS §8.1.3: <code>SM = C·h·s·ℓ² ÷ σ<sub>a</sub></code>, ' +
    'com σ<sub>a</sub> = ' + fmt(MP.sigInt,1) + ' N/mm² da Tabela 7.2. SM por Gerr: viga ' +
    'bi-engastada <code>M = W·ℓ²/12</code>, ou <code>W·ℓ²/8</code> em caverna e hastilha, ' +
    'com a pressão de impacto e o FS alvo da região (IBEX p.27). Vale o maior dos dois. ' +
    'A seção proposta é dimensionada por este painel e não é seção normalizada de nenhuma ' +
    'das fontes.' + (MP.mat === 'frp' ? ' Em fibra de vidro o critério do ABS é de inércia ' +
    'mínima, não de módulo — a equação impressa em 8.1.3 devolve valores 10⁶ vezes menores ' +
    'que qualquer reforço real e foi corrigida aqui.' : '') + '</caption></table>';
  return t;
}

/* ---- 7. os perfis escolhidos ---- */
function pdfPerfis(){
  var MP = R.MP;
  if(!R.perf) return '<p>Os perfis não foram escolhidos nesta sessão.</p>';
  var t = '<table class="pd-t"><thead><tr><th>reforço</th><th>seção</th><th>perfil escolhido</th>' +
    '<th>SM exigido<br>cm³</th><th>SM da seção<br>cm³</th><th>folga</th><th>altura<br>mm</th>' +
    '<th>kg/m</th><th>peças</th><th>total<br>m</th><th>massa<br>kg</th></tr></thead><tbody>';
  R.stiff.forEach(function(row){
    if(!row.key) return;
    var pf = R.perf[row.key];
    if(!row.exists || !pf){
      t += '<tr><td class="l">' + row.name + '</td><td colspan="10" class="l">' +
           (row.exists ? 'sem perfil escolhido' : 'não existe neste arranjo') + '</td></tr>';
      return;
    }
    var g = R.pes.geo[row.key] || {n:0, Ltot:0}, e = pf.esc;
    t += '<tr><td class="l">' + row.name + '</td><td>' + perfSVG(e, 62, 46) + '</td>' +
      '<td class="l">' + e.desc + '</td><td>' + fmt(row.SMreq,1) + '</td>' +
      '<td class="w">' + fmt(e.SM,1) + '</td>' +
      '<td class="' + (e.passa ? '' : 'bad') + '">' +
      fmt(100*e.SM/Math.max(1e-9,row.SMreq),0) + '%</td>' +
      '<td>' + fmt(e.alt,0) + '</td><td>' + fmt(e.kgm,2) + '</td><td>' + fmt(g.n,0) + '</td>' +
      '<td>' + fmt(g.Ltot,1) + '</td><td>' + fmt(g.Ltot*e.kgm,1) + '</td></tr>';
  });
  t += '</tbody><caption>A largura efetiva de chapeamento que trabalha junto com cada reforço sai ' +
    'da subseção 3.5 do Guia: ' + (MP.mat === 'wood' ? 'nenhuma em tabuado liso (3.5.4)'
      : MP.mat === 'ply' ? '50·t (3.5.2)' : MP.mat === 'frp' ? '18·t mais a base do reforço (3.5.1)'
      : '100·t (3.5.3)') + ', e nunca mais que o espaçamento. O módulo de seção sai da seção ' +
    'composta, com a linha neutra calculada — é a linha tracejada de cada desenho. ' +
    'As seções são <b>dimensionadas por este painel</b> a partir de escadas de bitola de mercado, e ' +
    'não são seções normalizadas de nenhuma das duas fontes.' +
    (MP.mat === 'frp' ? ' Em fibra de vidro vale também a inércia mínima de 8.1.3, conferida à parte.'
                      : '') + '</caption></table>';
  return t;
}

/* ---- 8. as anteparas de colisão ---- */
function pdfAnteparas(){
  if(!R.ant || !R.ant.itens.length) return '<p>Nenhuma antepara neste arranjo.</p>';
  var A = R.ant, A0 = A.itens[0], SA = A0.SA;
  var t = '<table class="pd-t"><thead><tr><th>antepara</th><th>caverna<br>da ponta</th>' +
    '<th>baliza<br>nº</th><th>x do espelho<br>m</th>' +
    '<th>% de L<br>da ponta</th><th>área<br>m²</th><th>carga h<br>m</th><th>painel<br>mm</th>' +
    '<th>k</th><th>t exigida<br>mm</th><th>t adotada<br>mm</th><th>σ sob a carga<br>N/mm²</th>' +
    '<th>prumos</th><th>SM exigido<br>cm³</th></tr></thead><tbody>';
  A.itens.forEach(function(a){
    t += '<tr><td class="l">' + a.nome.replace('Antepara de colisão de ', '') +
      '</td><td>' + fmt(a.nCav,0) + 'ª</td>' +
      '<td>' + fmt(a.iF,0) + '</td><td>' + fmt(a.x,3) + '</td>' +
      '<td class="' + (a.dentro ? 'ok' : '') + '">' + fmt(100*a.daPonta,1) + '</td>' +
      '<td>' + fmt(a.area,3) + '</td><td>' + fmt(a.head,2) + '</td>' +
      '<td>' + fmt(Math.min(a.s, a.hMax*1000),0) + ' × ' + fmt(Math.max(a.s, a.hMax*1000),0) + '</td>' +
      '<td>' + fmt(a.k,3) + '</td><td class="w">' + fmt(a.tReq,2) +
      (a.gov === 'mínimo' ? ' <i>mín</i>' : '') + '</td>' +
      '<td class="' + (a.passaChapa ? 'ok' : 'bad') + '">' + fmt(a.tAdo,1) + '</td>' +
      '<td>' + fmt(a.sigAt,1) + '</td><td>' + fmt(a.nRef,0) + ' × ' + fmt(a.hMax,2) + ' m</td>' +
      '<td>' + fmt(a.SMreq,1) + '</td></tr>';
  });
  t += '</tbody><caption><b>A posição não vem das fontes.</b> O Guia ABS de 1994 não exige antepara ' +
    'de colisão — a palavra não aparece no documento — e o livro de Gerr não a inclui no pacote ' +
    'S<sub>n</sub>. A faixa adotada aqui, de ' + fmt(100*A.banda.v[0],0) + '% a ' +
    fmt(100*A.banda.v[1],0) + '% do comprimento a vante e de ' + fmt(100*A.banda.r[0],0) + '% a ' +
    fmt(100*A.banda.r[1],0) + '% a ré, é prática de classificação: o piso de 5% vem das regras de ' +
    'navio. Confira contra a norma aplicável — NORMAM, ISO 12215.<br>' +
    '<b>A antepara mora numa caverna.</b> A posição não é uma distância livre: escolhe-se em qual ' +
    'caverna ela fica, contada da ponta para dentro, porque uma parede transversal entre duas ' +
    'cavernas exigiria uma caverna a mais só para ela. Este arranjo tem <b>' + fmt(A.nInt,0) +
    ' cavernas internas</b>, e o painel oferece no máximo as <b>' + fmt(A.teto,0) + '</b> primeiras ' +
    'de cada ponta — menos, quando as duas se aproximam: mais para dentro que o terço do ' +
    'comprimento a parede deixa de ser antepara de colisão ' +
    'e passa a ser divisória de compartimento. Quem decide quantas posições existem é o ' +
    'espaçamento de balizas do passo 4.<br>' +
    '<b>O dimensionamento vem do Guia.</b> Carga pela Tabela 7.1 d): da aresta inferior da antepara ' +
    'ao convés na linha de centro, com piso de 1,52 m. ' +
    (A0.eq === '7.5.1'
      ? 'Espessura pela <b>equação 7.5.1</b>, a do tabuado liso, que não usa fator F nenhum — o fator '
        + 'de escala 1,09|4,2 − 1,13·⁴√L| = ' + fmt(A0.af,3) + ' faz o papel da redução por área.'
      : 'Espessura pela <b>equação 7.1</b> com <b>F = 1</b>, porque o Guia dá tabela de F para casco '
        + '(7.4) e convés (7.5) e nenhuma para antepara.') +
    ' Um <i>mín</i> ao lado da espessura exigida quer dizer que quem mandou foi a espessura mínima ' +
    'construtiva, e não a carga. A coluna de prumos traz a contagem e a altura do mais alto, que é o ' +
    'que dimensiona; no quadro de pesos entra a altura média, que é o que pesa. Tensão ' +
    'de projeto ' + fmt(SA.sig,1) + ' N/mm² <i>(' + SA.src + ')</i>' +
    (SA.muda ? ' — a antepara é a única chapa cuja tensão de projeto da Tabela 7.2 sai do escoamento, '
             + 'e não da ruptura.' : '') +
    ' Módulo do prumo pela 8.1.3 com C = 619, sem fator F. Espessura adotada: a mesma do costado.' +
    '</caption></table>';
  return t;
}

/* ---- 9. pesos e centros ---- */
function pdfPesos(){
  if(!R.pes) return '<p>O quadro de pesos não foi montado nesta sessão.</p>';
  var P = R.pes, b = ST.boat, atual = null;
  var t = '<table class="pd-t"><thead><tr><th>item</th><th>quantidade</th><th>unitário</th>' +
    '<th>massa<br>kg</th><th>%</th><th>LCG<br>m</th><th>VCG<br>m</th>' +
    '<th>momento long.<br>kg·m</th><th>momento vert.<br>kg·m</th></tr></thead><tbody>';
  P.linhas.forEach(function(l){
    if(l.g !== atual){
      atual = l.g;
      t += '<tr class="grp"><td class="l" colspan="9">' + PES_G[l.g] + ' · ' +
        fmt(P.grupos[l.g],1) + ' kg</td></tr>';
    }
    t += '<tr><td class="l">' + l.it + (l.det ? ' <i>' + l.det + '</i>' : '') + '</td>' +
      '<td>' + l.q + '</td><td>' + l.un + '</td><td class="w">' + fmt(l.m,2) + '</td>' +
      '<td>' + fmt(100*l.m/Math.max(1e-9,P.tot.m),1) + '</td><td>' + fmt(l.x,3) + '</td>' +
      '<td>' + fmt(l.z,3) + '</td><td>' + fmt(l.m*l.x,1) + '</td><td>' + fmt(l.m*l.z,1) +
      '</td></tr>';
  });
  t += '<tr class="tot"><td class="l"><b>Estrutura completa</b></td><td></td><td></td>' +
    '<td class="w">' + fmt(P.tot.m,1) + '</td><td>100,0</td><td>' + fmt(P.tot.x,3) + '</td>' +
    '<td>' + fmt(P.tot.z,3) + '</td><td>' + fmt(P.tot.m*P.tot.x,1) + '</td>' +
    '<td>' + fmt(P.tot.m*P.tot.z,1) + '</td></tr>';
  t += '</tbody><caption>Datum: <b>x</b> medido do espelho de popa para vante, <b>z</b> da linha de ' +
    'base. O centro transversal é zero por simetria. O centro sai de <code>Σ(massa × posição) ÷ ' +
    'Σmassa</code>, e as duas últimas colunas mostram as parcelas dessa soma. ' +
    'Massa específica do chapeamento ' + fmt(R.dens,0) + ' kg/m³' +
    (R.MP.mat === 'wood' || R.MP.mat === 'ply' ? ' (Tabela 4.4 do ABS)'
                                               : ' (valor de catálogo, fora das fontes)') +
    (R.MP.mat === 'frp' ? '; núcleo do chapéu a 80 kg/m³, espuma de PVC, também fora das fontes' : '') +
    '.<br><b>Este é o peso da estrutura nua.</b> Não entram margem de construção, solda, cola, ' +
    'resina de laminação, cantoneiras de canto, chapas de reforço nos cruzamentos, ferragens nem ' +
    'tinta. Com 12% de margem de construção a estrutura sairia com ' + fmt(P.tot.m*1.12,0) + ' kg.' +
    (P.fracDisp !== null ? ' A estrutura calculada é ' + fmt(100*P.fracDisp,1) +
      '% do deslocamento de ' + fmt(b.disp,2) + ' t informado no passo 1.' : '') +
    '</caption></table>';
  return t;
}

/* ---- 10. a regra de Gerr pelo livro ---- */
function pdfGerr(){
  var G = R.GB;
  if(!G) return '<p>Não disponível para este barco.</p>';
  var t = '<table class="pd-t"><thead><tr><th>região</th><th>fórmula do livro</th>' +
    '<th>espessura<br>mm</th><th>o caminho longo pediu<br>mm</th><th>diferença</th></tr></thead><tbody>';
  ['fundo','costado','conves','espelho'].forEach(function(rk){
    var v = G[rk], abs = R.reg[rk].tGov;
    if(v === undefined) return;
    /* o espelho não tem fórmula própria em fonte nenhuma: o livro o trata
       como costado, e é dali que vem o número.                            */
    var fml = G.f[rk] ? 'Fórmula ' + G.f[rk]
            : (rk === 'espelho' && G.f.costado ? 'Fórmula ' + G.f.costado + ', do costado'
            : (G.f.base ? 'Fórmula ' + G.f.base + (rk === 'espelho' ? ', como o costado' : '')
            : 'como o costado'));
    t += '<tr><td class="l">' + nomeReg(rk) + '</td><td class="l">' + fml +
      '</td><td class="w">' + fmt(v,2) + '</td><td>' + fmt(abs,2) + '</td><td>' +
      (abs > 0 ? (v/abs >= 1 ? '+' : '') + fmt(100*(v/abs - 1),0) + '%' : '—') + '</td></tr>';
  });
  t += '</tbody></table>';
  var rows = pdfKV('S<sub>n</sub> do livro', fmt(G.sn,3) +
      (G.corr.length ? ' <i>(com ' + G.corr.join(' e ') + ')</i>' : ''), 'Fórmula 1-1');
  rows += pdfKV('a regra, em uma linha', G.txt, '');
  if(G.esp.lon) rows += pdfKV('espaçamento entre longitudinais, pelo livro',
                              fmt(G.esp.lon,0) + ' mm', 'Fórmula ' + G.esp.f);
  if(G.esp.tra) rows += pdfKV('espaçamento entre transversais, pelo livro',
                              fmt(G.esp.tra,0) + ' mm', 'Fórmula ' + G.esp.f);
  if(G.esp.nB)  rows += pdfKV('anteparas e balizas em anel, número mínimo',
                              G.esp.nB, 'Fórmula 5-5');
  if(G.minSold) rows += pdfKV('mínimo soldável do alumínio', fmt(G.minSold,2) + ' mm',
                              G.pisoSold ? 'é ele que manda no fundo' : 'a fórmula pede mais');
  return '<table class="pd-kv"><tbody>' + rows + '</tbody></table>' + t +
    (G.notas.length ? '<p class="pd-warn">' + G.notas.join('</p><p class="pd-warn">') + '</p>' : '');
}

/* ---- 8. observações ---- */
function pdfAlertas(){
  if(!R.alerts.length) return '<p>Nenhuma observação para este arranjo.</p>';
  return '<ul class="pd-al">' + R.alerts.map(function(w){
    return '<li class="' + (w.c || 'info') + '">' + w.t + '</li>';
  }).join('') + '</ul>';
}

/* ---- desenhos: as telas do painel viram imagem ---- */
function pdfDesenhos(){
  var lista = [['cvPlan','Vista de topo — as balizas atravessam o barco e dão o ℓ'],
               ['cvSect','Seção transversal — os longitudinais em corte dão o s'],
               ['cvPanel','O painel em planta e em corte, com a flecha sob a pressão'],
               ['cvSpc','Espessura exigida em função da aresta curta do painel'],
               ['cvVel','Espessura exigida em função da velocidade'],
               ['cvAnt','As anteparas de colisão, encaixadas nas balizas'],
               ['cvCG','O centro de gravidade da estrutura, e a distribuição das massas']];
  var h = '';
  lista.forEach(function(p){
    var cv = el(p[0]);
    if(!cv || cv.width < 40) return;
    var url = '';
    try{
      var off = document.createElement('canvas');
      off.width = cv.width; off.height = cv.height;
      var og = off.getContext('2d');
      og.fillStyle = '#404040'; og.fillRect(0, 0, off.width, off.height);
      og.drawImage(cv, 0, 0);
      url = off.toDataURL('image/png');
    }catch(e){ return; }
    h += '<figure class="pd-fig"><img alt="' + pdfEsc(p[1]) + '" src="' + url +
         '"><figcaption>' + p[1] + '</figcaption></figure>';
  });
  return h || '<p>Os desenhos não puderam ser capturados nesta impressão.</p>';
}

/* o texto das fontes, o mesmo do rodapé da tela, reaproveitado */
function pdfFontes(){
  /* tem de ser ESTE details, e não o primeiro da tela: o passo 1 e o passo 2
     também usam .more-body, e o querySelector devolveria o do passo 1.       */
  var d = document.querySelector('#fontesBloco .more-body');
  return d ? d.innerHTML : '<p>O bloco de fontes não foi encontrado nesta tela.</p>';
}

/* ---- monta o documento inteiro ---- */
function buildPrintDoc(){
  var b = ST.boat, MP = R.MP, desenhos;
  /* Canvas em elemento oculto, ou em passo fechado, mede zero — e sem
     tamanho não há imagem para levar ao PDF.  Então a tela de aula é
     destapada e todos os passos são abertos por um instante.  Vale
     também para quem imprime com Ctrl+P estando na tela avançada.       */
  var guardaAll = ST3.all, eraAvancada = (VIEW !== 'aula');
  if(eraAvancada){ el('viewAula').hidden = false; el('viewAdv').hidden = true; }
  try{
    ST3.all = true; renderAula();
    desenhos = pdfDesenhos();
  } catch(e){ desenhos = '<p>Os desenhos não puderam ser capturados nesta impressão.</p>'; }
  ST3.all = guardaAll;
  try{ renderAula(); }catch(e){}
  if(eraAvancada){
    el('viewAula').hidden = true; el('viewAdv').hidden = false;
    try{ fitView(); refresh(); }catch(e){}
  }

  /* A tela avançada repinta por refresh(), que chama compute() e devolve um R
     sem perfis, anteparas nem pesos.  Sem isto, imprimir de lá sairia com as
     três seções novas vazias.                                              */
  try{ estrutura(R); }catch(e){}

  var h = '<header class="pd-cap">' +
    '<div class="pd-eyebrow">Brana · Projetos Navais · Projetista: Cassio</div>' +
    '<h1>Memória de cálculo do arranjo estrutural</h1>' +
    '<p class="pd-sub">' + pdfEsc(b.n) + ' · ' + fmt(b.LOA,2) + ' m · ' + pdfEsc(MP.label) +
    ' · fundo de ' + fmt(R.reg.fundo.tAdo,1) + ' mm' +
    (R.pes ? ' · estrutura de ' + fmt(R.pes.tot.m,0) + ' kg' : '') + '</p>' +
    '<p class="pd-meta">Gerado em ' + pdfData() + ' pelo painel de arranjo estrutural. Duas ' +
    'fontes ' +
    'de cálculo: ABS <i>Guide for Building and Classing Offshore Racing Yachts</i>, 1994, e ' +
    'Dave Gerr, <i>The Elements of Boat Strength</i>, com a cadeia de carga de impacto do ' +
    'paper IBEX 2010, sessão 501.</p></header>';

  h += pdfSec(1, 'A embarcação', pdfBarco());
  h += pdfSec(2, 'O material', pdfMaterial());
  h += pdfSec(3, 'O arranjo estrutural', pdfArranjo());
  h += pdfSec(4, 'A conta, região por região', R.ORD.map(pdfRegiao).join(''));
  h += pdfSec(5, 'Quadro-resumo do chapeamento', pdfResumo());
  h += pdfSec(6, 'Reforços: o módulo de seção exigido', pdfReforcos());
  h += pdfSec(7, 'Os perfis escolhidos', pdfPerfis());
  h += pdfSec(8, 'As anteparas de colisão', pdfAnteparas());
  h += pdfSec(9, 'Pesos e centros', pdfPesos());
  h += pdfSec(10, 'A regra de Gerr pelo livro, para conferir', pdfGerr());
  h += pdfSec(11, 'Observações do cálculo', pdfAlertas());
  h += pdfSec(12, 'Os dois fatores de segurança, e de onde cada um vem', FS_LEGENDA_LONGA);
  h += pdfSec(13, 'Fontes, e onde este painel simplifica', pdfFontes());
  h += pdfSec(14, 'Desenhos', desenhos);
  h += '<footer class="pd-foot">Escantilhões definem a segurança estrutural da embarcação. ' +
       'Confira sempre contra a fonte original e contra a norma aplicável — NORMAM, ' +
       'ISO 12215 — antes de construir. Este documento é material de aula.</footer>';

  el('printDoc').innerHTML = h;
  PDF_ASSINA = pdfAssinatura();
}

/* Assinatura do estado que a memória de cálculo retrata.  Se mudou qualquer
   coisa que entre na conta, o documento montado envelheceu — e isso vale para
   as duas telas, porque a assinatura sai do estado, não de quem repintou.   */
var PDF_ASSINA = null;
function pdfAssinatura(){
  var b = ST.boat;
  return [ST.mat, ST.sL, ST.sT, ST.govern, ST.kRef, ST.lam, ST.plyVerif, ST.plyMOR,
          b.LOA, b.LWL, b.BOA, b.BWL, b.D, b.d, b.disp, b.beta, b.rake, b.V, b.n,
          ST.t.fundo, ST.t.costado, ST.t.espelho, ST.t.conves,
          ST.grade && ST.grade.wood, ST.grade && ST.grade.ply,
          ST.grade && ST.grade.alu, ST.grade && ST.grade.steel,
          JSON.stringify(ST.perf), JSON.stringify(ST.ant)].join('|');
}
function PDF_PRONTO_AGORA(){ return PDF_ASSINA !== null && PDF_ASSINA === pdfAssinatura(); }
function gerarPDF(){
  try{ buildPrintDoc(); }
  catch(e){
    el('printDoc').innerHTML = '<p>Não foi possível montar a memória de cálculo: ' +
      pdfEsc(e.message) + '</p>';
  }
  /* dois quadros para o layout assentar antes de o diálogo capturar a página */
  if(window.requestAnimationFrame)
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ window.print(); }); });
  else window.print();
}


/* ============================================================================
   CONTROLADOR — uma tela de aula e uma tela avançada, um estado só.
   ========================================================================= */

/* A ficha do pé aparece nas duas telas e lê sempre o último R calculado.   */
function renderDock(){
  if(!R) return;
  var b = ST.boat, o = R.reg.fundo, MP = R.MP;
  el('dkBoat').innerHTML = fmt(b.LOA,1) + ' <small>m</small>';
  el('dkMat').innerHTML  = '<small>' + MATS.filter(function(m){return m.k===ST.mat;})[0].n + '</small>';
  el('dkPan').innerHTML  = fmt(o.s,0) + '<small>×' + fmt(o.l,0) + '</small>';
  el('dkReq').innerHTML  = fmt(o.tGov,2) + ' <small>mm</small>';
  el('dkAdo').innerHTML  = fmt(o.tAdo,1) + ' <small>mm</small>';
  el('dkAdo').className  = 'dk-v ' + (o.tAdo >= o.tGov - 1e-6 ? 'ok' : 'bad');
  el('dkFS').textContent = fmtFS(o.fsABS);
  el('dkFS').className   = 'dk-v ' + (o.fsABS >= MP.fs_abs_implicito - 1e-6 ? 'ok' : 'bad');
  el('dkFS').parentNode.title = FS_TOOLTIP;
  el('dkNote').innerHTML = 'fundo · manda a ' +
    (o.govWho === 'Gerr' ? 'carga de impacto' : 'hidrostática') +
    ' · Gerr pelo livro ' + (R.GB ? fmt(R.GB.fundo,2) + ' mm' : '—') +
    (VIEW === 'aula' ? '<br>passo ' + ST3.step + ' de ' + NPASSOS : '<br>versão avançada');
}

/* A faixa fixa muda de altura quando quebra de linha.  Sem medir, o rodapé
   fica escondido atrás dela.                                              */
function fitDock(){
  var d = document.querySelector('.dock');
  if(!d) return;
  document.documentElement.style.setProperty('--dock-h', (d.offsetHeight + 16) + 'px');
}

function paint(scroll){
  if(VIEW === 'aula') renderAula(scroll); else refresh();
  renderDock(); fitDock();
}

function setView(v){
  VIEW = v;
  el('viewAula').hidden = (v !== 'aula');
  el('viewAdv').hidden  = (v !== 'adv');
  el('btnView').textContent = (v === 'aula') ? 'Versão avançada →' : '← Voltar à versão de aula';
  el('viewNote').innerHTML = (v === 'aula')
    ? 'Versão de aula · nove passos guiados'
    : 'Versão avançada · tudo numa página';
  /* pinta já, para não depender do quadro de animação, e repinta depois que o
     layout assenta, que é quando os canvas passam a ter largura de verdade  */
  if(v === 'adv'){ try{ fitView(); }catch(e){} }
  paint();
  if(window.requestAnimationFrame) requestAnimationFrame(function(){
    if(v === 'adv'){ try{ fitView(); }catch(e){} }
    paint();
  });
  try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
}

(function init(){
  /* estado de partida: o bote a remo, em compensado, no espaçamento típico */
  ST.mat = MATERIAL_INICIAL;
  ST.boat = JSON.parse(JSON.stringify(BOATS[0])); ST.boat.n = TEACH_BOATS[0].n;
  ST.t = {fundo:null, costado:null, espelho:null, conves:null};
  ST.kRef = 0.681; ST.govern = 1;
  var ts = typicalSpacing(); ST.sL = Math.round(ts.sL/5)*5; ST.sT = Math.round(ts.sT/5)*5;

  /* ---- navegação dos passos ---- */
  document.querySelectorAll('#viewAula [data-go]').forEach(function(bt){
    bt.onclick = function(){
      var n = +bt.dataset.go;
      ST3.step = n; ST3.maxStep = Math.max(ST3.maxStep, n); ST3.all = false;
      renderAula(true); renderDock();
    };
  });
  document.querySelectorAll('#viewAula .step-head').forEach(function(hd){
    hd.onclick = function(){
      var n = +hd.parentElement.dataset.step;
      if(!ST3.all && n > ST3.maxStep) return;
      ST3.step = n; ST3.all = false; renderAula(true); renderDock();
    };
  });
  el('btnResetA').onclick = function(){
    ST3 = {step:1, maxStep:1, all:false};
    ST.perf = {}; ST.ant = {v:null, r:null, manV:false, manR:false,
                            ultimo:null, onV:true, onR:true};
    ST.mat = MATERIAL_INICIAL;
    ST.boat = JSON.parse(JSON.stringify(BOATS[0])); ST.boat.n = TEACH_BOATS[0].n;
    ST.t = {fundo:null, costado:null, espelho:null, conves:null};
    var t2 = typicalSpacing(); ST.sL = Math.round(t2.sL/5)*5; ST.sT = Math.round(t2.sT/5)*5;
    el('btnAllA').textContent = 'Abrir todos os passos';
    renderPartAula(); renderAula(true); renderDock();
  };
  el('btnAllA').onclick = function(){
    ST3.all = !ST3.all; ST3.maxStep = NPASSOS;
    el('btnAllA').textContent = ST3.all ? 'Voltar ao passo a passo' : 'Abrir todos os passos';
    renderAula(); renderDock();
  };
  el('velA').oninput = function(){
    var v = parseFloat(this.value);
    if(isFinite(v) && v >= 0){ ST.boat.V = v; ST.t.fundo = null; renderAula(); renderDock(); }
  };
  [['antVA','v','manV'],['antRA','r','manR']].forEach(function(p){
    el(p[0]).oninput = function(){
      var v = parseInt(this.value, 10);
      if(!isFinite(v) || v < 1) return;
      /* o cursor dá o número da caverna, contado da ponta.  'ultimo' diz
         qual das duas acabou de ser movida: se as duas se encontrarem no
         meio do barco, quem cede é a outra.                             */
      ST.ant[p[1]] = v; ST.ant[p[2]] = true; ST.ant.ultimo = p[1];
      renderAula(); renderDock();
    };
  });
  [['sLA','sL'],['sTA','sT']].forEach(function(p){
    el(p[0]).oninput = function(){
      var v = parseFloat(this.value);
      if(isFinite(v) && v > 0){ ST[p[1]] = v; ST.t.fundo = null; renderAula(); renderDock(); }
    };
  });

  /* ---- tela avançada: reusa as ligações da versão 2 ---- */
  renderChips(); renderGrade(); renderPart(); initEvents();
  el('viewName').textContent = 'Isométrica';

  /* ---- memória de cálculo em PDF ---- */
  el('btnPdfA').onclick = function(){ gerarPDF(); };
  /* Quem imprimir direto por Ctrl+P também leva o documento montado.  Remonta
     sempre, menos no caminho do botão, que acabou de montar: a tela avançada
     repinta por refresh(), que não sabe do sinalizador, e confiar nele fazia
     o Ctrl+P imprimir a memória de cálculo de um estado já abandonado.      */
  window.addEventListener('beforeprint', function(){
    if(PDF_PRONTO_AGORA()) return;
    try{ buildPrintDoc(); }catch(e){}
  });

  /* ---- troca de versão ---- */
  el('btnView').onclick = function(){ setView(VIEW === 'aula' ? 'adv' : 'aula'); };

  /* ---- redesenho no redimensionamento ---- */
  var to = null;
  function redraw(){ clearTimeout(to); to = setTimeout(function(){ paint(); }, 90); }
  window.addEventListener('resize', function(){ fitDock(); redraw(); });
  if(window.ResizeObserver){
    var ro = new ResizeObserver(redraw);
    ['cvPanel','cvPlan','cvSect','cvSpc','cvVel','cvAnt','cvCG'].forEach(function(id){ var e = el(id); if(e) ro.observe(e); });
    var rd2 = new ResizeObserver(fitDock);
    var dk = document.querySelector('.dock'); if(dk) rd2.observe(dk);
  }

  renderPartAula();
  setView('aula');
  fitDock();
})();
