"use strict";
/* Calado de partida em milimetros; null = 41% do pontal, que e o padrao. */
var CALADO_INICIAL = __CALADO_INICIAL__;
(function(){

var canvas = document.getElementById('gl');
var gl = null;
try {
  gl = canvas.getContext('webgl', {antialias:true, alpha:false, depth:true})
    || canvas.getContext('experimental-webgl', {antialias:true, alpha:false, depth:true});
} catch(e){}
if(!gl){
  canvas.outerHTML = '<div class="nogl">Este visualizador precisa de WebGL, e este navegador não o entrega. ' +
                     'As leituras de equilíbrio, os diagramas e a curva de braços abaixo continuam funcionando.</div>';
  canvas = null;
}

/* ---------------------------------------------------------------- matrizes */
function m4mul(o,a,b){
  for(var i=0;i<4;i++) for(var j=0;j<4;j++){
    var s=0; for(var k=0;k<4;k++) s += a[k*4+j]*b[i*4+k];
    o[i*4+j]=s;
  }
  return o;
}
function m4persp(o,fovy,asp,n,f){
  var t = 1/Math.tan(fovy/2);
  o[0]=t/asp;o[1]=0;o[2]=0;o[3]=0;
  o[4]=0;o[5]=t;o[6]=0;o[7]=0;
  o[8]=0;o[9]=0;o[10]=(f+n)/(n-f);o[11]=-1;
  o[12]=0;o[13]=0;o[14]=2*f*n/(n-f);o[15]=0;
  return o;
}
function m4ortho(o,l,r,b,t,n,f){
  o[0]=2/(r-l);o[1]=0;o[2]=0;o[3]=0;
  o[4]=0;o[5]=2/(t-b);o[6]=0;o[7]=0;
  o[8]=0;o[9]=0;o[10]=-2/(f-n);o[11]=0;
  o[12]=-(r+l)/(r-l);o[13]=-(t+b)/(t-b);o[14]=-(f+n)/(f-n);o[15]=1;
  return o;
}
function m4look(o,e,c,u){
  var zx=e[0]-c[0], zy=e[1]-c[1], zz=e[2]-c[2];
  var L=Math.sqrt(zx*zx+zy*zy+zz*zz)||1; zx/=L; zy/=L; zz/=L;
  var xx=u[1]*zz-u[2]*zy, xy=u[2]*zx-u[0]*zz, xz=u[0]*zy-u[1]*zx;
  L=Math.sqrt(xx*xx+xy*xy+xz*xz)||1; xx/=L; xy/=L; xz/=L;
  var yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
  o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;
  o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;
  o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
  o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);
  o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);
  o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);
  o[15]=1;
  return o;
}
/* Translada e escala uniforme: serve aos marcadores, que sao um unico gizmo
   unitario desenhado em varios lugares e tamanhos. */
function m4trs(o, tx, ty, tz, s){
  o[0]=s;o[1]=0;o[2]=0;o[3]=0;
  o[4]=0;o[5]=s;o[6]=0;o[7]=0;
  o[8]=0;o[9]=0;o[10]=s;o[11]=0;
  o[12]=tx;o[13]=ty;o[14]=tz;o[15]=1;
  return o;
}

/* ----------------------------------------------------------------- shaders --
   A unica diferenca em relacao ao visualizador de calado: o limite entre obra
   viva e obra morta nao e mais uma altura, e um PLANO. O teste passa a ser
   n.p <= d avaliado por pixel, entao a linha d'agua inclinada fica nitida em
   qualquer aproximacao, sem depender das arestas da malha. */
var VS_SURF =
 'attribute vec3 aPos; attribute vec3 aNrm;' +
 'uniform mat4 uMVP;' +
 'varying vec3 vN; varying vec3 vP;' +
 'void main(){ vN = aNrm; vP = aPos; gl_Position = uMVP * vec4(aPos,1.0); }';
var FS_SURF =
 'precision mediump float;' +
 'varying vec3 vN; varying vec3 vP;' +
 'uniform vec3 uL1, uL2, uEye, uTop, uBot, uFlat, uWn;' +
 'uniform float uWd, uAmb, uUseFlat;' +
 'void main(){' +
 '  vec3 n = normalize(vN);' +
 '  if(!gl_FrontFacing) n = -n;' +
 '  vec3 v = normalize(uEye - vP);' +
 '  float d1 = max(dot(n, uL1), 0.0);' +
 '  float d2 = max(dot(n, uL2), 0.0);' +
 '  vec3 h = normalize(uL1 + v);' +
 '  float spec = pow(max(dot(n,h),0.0), 42.0) * 0.22;' +
 '  float rim  = pow(1.0 - max(dot(n,v),0.0), 3.0) * 0.16;' +
 '  bool wet = dot(vP, uWn) < uWd;' +
 '  vec3 base = (uUseFlat > 0.5) ? uFlat : (wet ? uBot : uTop);' +
 '  float lam = uAmb + 0.74*d1 + 0.28*d2;' +
 '  gl_FragColor = vec4(base*lam + vec3(spec + rim), 1.0);' +
 '}';
var VS_LINE = 'attribute vec3 aPos; uniform mat4 uMVP; void main(){ gl_Position = uMVP * vec4(aPos,1.0); }';
var FS_LINE = 'precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor = uColor; }';

function compile(src, type){
  var s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs){
  var p = gl.createProgram();
  gl.attachShader(p, compile(vs, gl.VERTEX_SHADER));
  gl.attachShader(p, compile(fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
var progS = null, progL = null, locS = {}, locL = {};
if(gl){
  progS = program(VS_SURF, FS_SURF);
  progL = program(VS_LINE, FS_LINE);
  ['aPos','aNrm'].forEach(function(a){ locS[a] = gl.getAttribLocation(progS, a); });
  ['uMVP','uL1','uL2','uEye','uTop','uBot','uFlat','uWn','uWd','uAmb','uUseFlat'].forEach(function(u){
    locS[u] = gl.getUniformLocation(progS, u);
  });
  locL.aPos = gl.getAttribLocation(progL, 'aPos');
  locL.uMVP = gl.getUniformLocation(progL, 'uMVP');
  locL.uColor = gl.getUniformLocation(progL, 'uColor');
}
function buf(data, target, dyn){
  var b = gl.createBuffer(), t = target || gl.ARRAY_BUFFER;
  gl.bindBuffer(t, b);
  gl.bufferData(t, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
  return b;
}
function reup(o, arr){
  if(!o.b) o.b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, o.b);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
  o.n = arr.length/3;
  return o;
}

/* -------------------------------------------------------------------- cena */
var NP = 26, NL = 170, NSEC = 200;   /* baliza da malha, balizas na malha, balizas do integrador */
var hull = null, parsed = null;
var G3 = { surf:null, deck:null, transom:null, lines:{}, wire:null, axes:null,
           sea:{b:null,n:0}, grid:{b:null,n:0}, wl:{b:null,n:0}, plumb:{b:null,n:0},
           lever:{b:null,n:0},
           giz:null, gizN:0 };
var WATER = { salgada:{ rho:1025, nome:'Água salgada' }, doce:{ rho:1000, nome:'Água doce' } };
var ui = { surf:true, deck:true, stn:false, sea:true, grid:true, wl:true, mark:true,
           mesh:false, view:'proa' };
var cam = { az:0.62, el:0.34, dist:12, tx:3, ty:0, tz:0.6 };
var LOA_M = 6, BEAM_M = 2, DEPTH_M = 1.2, MID = [3, 0, 0.6];

/* Pesos e centros. Nao existe controle de CG: existe uma TABELA DE PESOS - o barco
   na primeira linha, cada carga a bordo nas seguintes - e o CG do conjunto e a
   media ponderada de todos, eixo por eixo. E essa media que o equilibrio recebe:
   nenhum peso mexe no casco por conta propria, o que mexe e a soma dos momentos. */
var S = { water:'salgada', items:[], sel:1 };
var REF = null;                     /* condicao de partida, para o botao de prumo */
var GT = [0, 0, 0];                 /* centro de gravidade do conjunto */
var MAXIT = 12;                     /* teto de linhas, por legibilidade da tela */

function totalW(){
  var w = 0, i;
  for(i=0;i<S.items.length;i++) w += S.items[i].w;
  return w;
}
function movW(){
  var w = 0, i;
  for(i=1;i<S.items.length;i++) w += S.items[i].w;
  return w;
}
function updateCG(){
  var W = 0, mx = 0, my = 0, mz = 0, i, it;
  for(i=0;i<S.items.length;i++){
    it = S.items[i];
    W += it.w; mx += it.w*it.p[0]; my += it.w*it.p[1]; mz += it.w*it.p[2];
  }
  if(W > 1e-9){ GT[0] = mx/W; GT[1] = my/W; GT[2] = mz/W; }
  else if(S.items.length){
    GT[0] = S.items[0].p[0]; GT[1] = S.items[0].p[1]; GT[2] = S.items[0].p[2];
  }
  return GT;
}
function selIndex(){
  if(!S.items.length) return -1;
  return Math.max(0, Math.min(S.sel, S.items.length - 1));
}
function selItem(){ var i = selIndex(); return i < 0 ? null : S.items[i]; }
var EQ = null, UPR = null, EXT = null, GZ = null, seed = null, MSEC = 0.5;

function css(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function hex2rgb(h){
  h = h.replace('#','');
  if(h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}
var COL = {};
function readColors(){
  COL.bg   = hex2rgb(css('--scene-bg'));
  COL.top  = hex2rgb(css('--hull-top'));
  COL.bot  = hex2rgb(css('--hull-bot'));
  COL.deck = hex2rgb(css('--hull-deck'));
  COL.line = hex2rgb(css('--line-ink'));
  COL.acc  = hex2rgb(css('--red-l'));
  COL.blue = hex2rgb(css('--blue'));
  COL.bluei= hex2rgb(css('--blue-ink'));
  COL.amb  = hex2rgb(css('--amber'));
  COL.grn  = hex2rgb(css('--green'));
}
function fmt(v, d){
  if(!isFinite(v)) return '—';
  return v.toLocaleString('pt-BR', {minimumFractionDigits:d, maximumFractionDigits:d});
}
/* O motor calcula em milimetro, que e a unidade da tabela de cotas; a tela fala
   metro, que e a unidade do projeto. A conversao vive nesta funcao e em mais
   nenhum lugar. */
function m3(v){ return fmt(v/1000, 3); }

/* ------------------------------------------------------ geometria estatica */
function pushSeg(a,p,q){ a.push(p[0],p[1],p[2], q[0],q[1],q[2]); }
function strip(a,pts){ for(var i=0;i<pts.length-1;i++) pushSeg(a, pts[i], pts[i+1]); }

function buildLines(){
  var L = {}, i, K = 0.001;
  var st = [];
  hull.stations.forEach(function(sx){
    if(sx < xAft(hull) - 1e-9) return;
    var rg = ringAt(hull, sx, NP);
    if(rg === null) return;
    strip(st, rg.map(function(p){ return [sx*K, p[0]*K, p[1]*K]; }));
  });
  L.stations = st;

  var edges = [], pk = [], psp = [], pss = [], N = 180;
  for(i=0;i<=N;i++){
    var xi = xAft(hull) + xLen(hull)*i/N;
    var s = hull.section(xi), hp = halfPolyCut(s, NP, xi);
    pk.push([xi*K, hp ? hp[0][0]*K : 0, (hp ? hp[0][1] : s.zk)*K]);
    psp.push([xi*K, -s.ys*K, s.zs*K]); pss.push([xi*K, s.ys*K, s.zs*K]);
  }
  strip(edges, pk); strip(edges, psp); strip(edges, pss);
  L.edges = edges;
  return L;
}
function wireFromMesh(m){
  var out = [], i, j, step = 5;
  for(i=0;i<=m.NL;i+=step) for(j=0;j<m.R-1;j++){
    var a=(i*m.R+j)*3, b=(i*m.R+j+1)*3;
    out.push(m.pos[a],m.pos[a+1],m.pos[a+2], m.pos[b],m.pos[b+1],m.pos[b+2]);
  }
  for(j=0;j<m.R;j+=3) for(i=0;i<m.NL;i++){
    var c=(i*m.R+j)*3, d=((i+1)*m.R+j)*3;
    out.push(m.pos[c],m.pos[c+1],m.pos[c+2], m.pos[d],m.pos[d+1],m.pos[d+2]);
  }
  return new Float32Array(out);
}
/* Marcador de centro: tres circulos ortogonais e uma cruz, num gizmo unitario
   que serve tanto para G como para B - o que muda e a matriz e a cor. Desenhado
   duas vezes, com e sem teste de profundidade, entao o ponto continua legivel
   quando esta dentro do casco: forte onde aparece, fantasma onde esta encoberto. */
function unitGizmo(){
  var a = [], K = 26, i, c0, s0, c1, s1;
  for(i=0;i<K;i++){
    var t0 = i/K*2*Math.PI, t1 = (i+1)/K*2*Math.PI;
    c0 = Math.cos(t0); s0 = Math.sin(t0); c1 = Math.cos(t1); s1 = Math.sin(t1);
    a.push(0,c0,s0, 0,c1,s1);
    a.push(c0,0,s0, c1,0,s1);
    a.push(c0,s0,0, c1,s1,0);
  }
  var e = 1.75;
  a.push(-e,0,0, e,0,0, 0,-e,0, 0,e,0, 0,0,-e, 0,0,e);
  return new Float32Array(a);
}

function rebuildGL(){
  if(!gl) return;
  var mesh = buildMesh(hull, NL, NP);
  function pack(m){
    return { pos:buf(m.pos), nrm:buf(m.nrm),
             idx:buf(new Uint16Array(m.idx), gl.ELEMENT_ARRAY_BUFFER), n:m.idx.length };
  }
  G3.surf = pack(mesh);
  G3.transom = pack(buildTransom(hull, NP));
  G3.deck = pack(buildDeck(hull, NL));
  var lw = wireFromMesh(mesh);
  G3.wire = { b:buf(lw), n:lw.length/3 };
  var L = buildLines();
  G3.lines = {};
  ['stations','edges'].forEach(function(k){
    var a = new Float32Array(L[k]);
    G3.lines[k] = { b:buf(a), n:a.length/3 };
  });
  if(!G3.giz){
    var gz = unitGizmo();
    G3.giz = buf(gz); G3.gizN = gz.length/3;
  }
}

/* ------------------------------------------- geometria que segue o equilibrio
   Plano d'agua, grade sobre ele, a curva que ele risca no casco e a vertical que
   passa por G e por B. Tudo reconstruido uma vez por solucao - nao por quadro. */
function updateWaterGL(){
  if(!gl || !EQ) return;
  var nn = nVec(EQ.th, EQ.ps), e1 = e1Vec(EQ.th, EQ.ps), e2 = e2Vec(EQ.th, EQ.ps);
  var dm = EQ.d/1000, i, j;
  var off = (MID[0]*nn[0] + MID[1]*nn[1] + MID[2]*nn[2]) - dm;
  var pv = [MID[0]-off*nn[0], MID[1]-off*nn[1], MID[2]-off*nn[2]];
  var LX = Math.max(LOA_M*0.80, 1.0), LY = Math.max(BEAM_M*1.7, 0.9);
  function pt(u,v){
    return [pv[0]+e1[0]*u+e2[0]*v, pv[1]+e1[1]*u+e2[1]*v, pv[2]+e1[2]*u+e2[2]*v];
  }
  var A = pt(-LX,-LY), Bq = pt(LX,-LY), C = pt(LX,LY), D = pt(-LX,LY);
  reup(G3.sea, new Float32Array([
    A[0],A[1],A[2], Bq[0],Bq[1],Bq[2], C[0],C[1],C[2],
    A[0],A[1],A[2], C[0],C[1],C[2], D[0],D[1],D[2]]));

  /* grade: sem ela um quadrilatero translucido inclinado nao mostra inclinacao */
  var stepG = LOA_M > 8 ? 1 : (LOA_M > 3 ? 0.5 : 0.25), g = [];
  for(var u = -Math.floor(LX/stepG)*stepG; u <= LX+1e-9; u += stepG) pushSeg(g, pt(u,-LY), pt(u,LY));
  for(var v = -Math.floor(LY/stepG)*stepG; v <= LY+1e-9; v += stepG) pushSeg(g, pt(-LX,v), pt(LX,v));
  reup(G3.grid, new Float32Array(g));

  /* curva que o plano risca no casco, de um bordo e do outro */
  var w = EQ.st.wl, seg = [], prevP = null, prevS = null;
  for(i=0;i<w.length;i++){
    var e = w[i];
    if(e === null){ prevP = prevS = null; continue; }
    var x = e[0];
    var pP = [x/1000, e[1]/1000, zWater(x, e[1], EQ.d, EQ.th, EQ.ps)/1000];
    var pS = [x/1000, e[2]/1000, zWater(x, e[2], EQ.d, EQ.th, EQ.ps)/1000];
    if(prevP){ pushSeg(seg, prevP, pP); pushSeg(seg, prevS, pS); }
    prevP = pP; prevS = pS;
  }
  reup(G3.wl, new Float32Array(seg));

  /* vertical por G e por B, tracejada, para o alinhamento ficar visivel */
  var Gm = [GT[0]/1000, GT[1]/1000, GT[2]/1000];
  var Bm = [EQ.st.B[0]/1000, EQ.st.B[1]/1000, EQ.st.B[2]/1000];
  var lo = -DEPTH_M*0.55, hi = Math.max(DEPTH_M*0.75, 0.25), pl = [], K = 26;
  var base = [ (Gm[0]+Bm[0])/2, (Gm[1]+Bm[1])/2, (Gm[2]+Bm[2])/2 ];
  for(i=0;i<K;i++){
    if(i % 2) continue;
    var t0 = lo + (hi-lo)*i/K, t1 = lo + (hi-lo)*(i+1)/K;
    pushSeg(pl, [base[0]+nn[0]*t0, base[1]+nn[1]*t0, base[2]+nn[2]*t0],
                [base[0]+nn[0]*t1, base[1]+nn[1]*t1, base[2]+nn[2]*t1]);
  }
  reup(G3.plumb, new Float32Array(pl));

  /* braco do item selecionado: de onde ele esta ate G, o segmento que a media
     ponderada percorreu por conta dele */
  var sel = selItem(), lv = [];
  if(sel && sel.w > 0.5 && !sel.base)
    pushSeg(lv, [sel.p[0]/1000, sel.p[1]/1000, sel.p[2]/1000], Gm);
  reup(G3.lever, new Float32Array(lv));
}

/* ------------------------------------------------------------------- câmera */
var FOV = 0.86;
function eyePos(){
  var ce = Math.cos(cam.el), se = Math.sin(cam.el);
  return [ cam.tx + cam.dist*ce*Math.cos(cam.az),
           cam.ty + cam.dist*ce*Math.sin(cam.az),
           cam.tz + cam.dist*se ];
}
function fitView(){
  cam.tx = MID[0]; cam.ty = MID[1]; cam.tz = MID[2];
  var ce = Math.cos(cam.el), se = Math.sin(cam.el);
  var fx = -ce*Math.cos(cam.az), fy = -ce*Math.sin(cam.az), fz = -se;
  var rx = fy, ry = -fx, rz = 0;
  var rl = Math.sqrt(rx*rx + ry*ry) || 1; rx /= rl; ry /= rl;
  var ux = ry*fz - rz*fy, uy = rz*fx - rx*fz, uz = rx*fy - ry*fx;
  var hx = LOA_M/2, hy = BEAM_M/2, hz = DEPTH_M/2;
  var aspect = (canvas && canvas.clientWidth && canvas.clientHeight)
             ? canvas.clientWidth/canvas.clientHeight : 16/9;
  var tanV = Math.tan(FOV/2), tanH = tanV*aspect;
  var need = 0, sx, sy, sz;
  for(sx=-1;sx<=1;sx+=2) for(sy=-1;sy<=1;sy+=2) for(sz=-1;sz<=1;sz+=2){
    var ox = sx*hx, oy = sy*hy, oz = sz*hz;
    var pr = Math.abs(ox*rx + oy*ry + oz*rz);
    var pu = Math.abs(ox*ux + oy*uy + oz*uz);
    var pf = ox*fx + oy*fy + oz*fz;
    var d = Math.max(pr/tanH, pu/tanV) - pf;
    if(d > need) need = d;
  }
  cam.dist = Math.max(0.8, Math.min(120, need*1.18));
}
var VIEWS = {
  proa:    { az: 0.62, el: 0.34, name:'Bochecha de proa' },
  popa:    { az: 2.62, el: 0.30, name:'Alheta de popa' },
  perfil:  { az: Math.PI/2, el: 0.0, name:'Perfil · lê o trim' },
  frente:  { az: 0.0, el: 0.03, name:'De proa · lê a banda' },
  planta:  { az:-Math.PI/2 + 0.0001, el: 1.5533, name:'Planta' },
  fundo:   { az: 1.05, el:-0.55, name:'Fundo' }
};
function setView(k){
  var v = VIEWS[k]; if(!v) return;
  ui.view = k; cam.az = v.az; cam.el = v.el;
  fitView();
  document.getElementById('viewName').textContent = v.name;
  syncViewChips(); draw();
}

/* ---------------------------------------------------------------- desenho */
var P = new Float32Array(16), V = new Float32Array(16), MVP = new Float32Array(16);
var TMP = new Float32Array(16), MRK2 = new Float32Array(16);
var dirty = true;
function draw(){ dirty = true; }

function bindSurf(o){
  gl.bindBuffer(gl.ARRAY_BUFFER, o.pos);
  gl.enableVertexAttribArray(locS.aPos);
  gl.vertexAttribPointer(locS.aPos, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, o.nrm);
  gl.enableVertexAttribArray(locS.aNrm);
  gl.vertexAttribPointer(locS.aNrm, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.idx);
}
function drawLines(o, color, width, mvp){
  if(!o || !o.n) return;
  gl.useProgram(progL);
  gl.uniformMatrix4fv(locL.uMVP, false, mvp || MVP);
  gl.uniform4f(locL.uColor, color[0], color[1], color[2], color[3] === undefined ? 1 : color[3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, o.b);
  gl.enableVertexAttribArray(locL.aPos);
  gl.vertexAttribPointer(locL.aPos, 3, gl.FLOAT, false, 0, 0);
  gl.lineWidth(width || 1);
  gl.drawArrays(gl.LINES, 0, o.n);
}
function drawGizmo(p, r, color, alpha){
  gl.useProgram(progL);
  m4trs(TMP, p[0], p[1], p[2], r);
  m4mul(MRK2, MVP, TMP);
  gl.uniformMatrix4fv(locL.uMVP, false, MRK2);
  gl.uniform4f(locL.uColor, color[0], color[1], color[2], alpha);
  gl.bindBuffer(gl.ARRAY_BUFFER, G3.giz);
  gl.enableVertexAttribArray(locL.aPos);
  gl.vertexAttribPointer(locL.aPos, 3, gl.FLOAT, false, 0, 0);
  gl.lineWidth(2);
  gl.drawArrays(gl.LINES, 0, G3.gizN);
}

function render(){
  if(!gl || !G3.surf || !EQ) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }

  gl.viewport(0, 0, w, h);
  gl.clearColor(COL.bg[0], COL.bg[1], COL.bg[2], 1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var nn = nVec(EQ.th, EQ.ps);
  var eye = eyePos();
  m4persp(P, FOV, w/h, 0.02, 400);
  m4look(V, eye, [cam.tx, cam.ty, cam.tz], [0,0,1]);
  m4mul(MVP, P, V);

  if(ui.surf){
    gl.useProgram(progS);
    gl.uniformMatrix4fv(locS.uMVP, false, MVP);
    gl.uniform3f(locS.uL1, 0.42, -0.55, 0.72);
    gl.uniform3f(locS.uL2, -0.60, 0.42, 0.24);
    gl.uniform3fv(locS.uEye, eye);
    gl.uniform3fv(locS.uTop, COL.top);
    gl.uniform3fv(locS.uBot, COL.bot);
    gl.uniform3fv(locS.uWn, nn);
    gl.uniform1f(locS.uWd, EQ.d/1000);
    gl.uniform1f(locS.uAmb, 0.32);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.2, 1.2);

    gl.uniform1f(locS.uUseFlat, 0);
    bindSurf(G3.surf);
    gl.drawElements(gl.TRIANGLES, G3.surf.n, gl.UNSIGNED_SHORT, 0);

    gl.uniform3fv(locS.uFlat, COL.deck);
    gl.uniform1f(locS.uUseFlat, 1);
    bindSurf(G3.transom);
    gl.drawElements(gl.TRIANGLES, G3.transom.n, gl.UNSIGNED_SHORT, 0);
    if(ui.deck){
      bindSurf(G3.deck);
      gl.drawElements(gl.TRIANGLES, G3.deck.n, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  if(ui.mesh) drawLines(G3.wire, [COL.line[0],COL.line[1],COL.line[2],0.26], 1);
  if(ui.stn)  drawLines(G3.lines.stations, [COL.line[0],COL.line[1],COL.line[2],0.85], 1);
  drawLines(G3.lines.edges, [COL.acc[0],COL.acc[1],COL.acc[2],1], 2);
  if(ui.wl)   drawLines(G3.wl, [1, 1, 1, 0.95], 3);

  if(ui.sea){
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(progL);
    gl.uniformMatrix4fv(locL.uMVP, false, MVP);
    gl.uniform4f(locL.uColor, COL.blue[0], COL.blue[1], COL.blue[2], 0.17);
    gl.bindBuffer(gl.ARRAY_BUFFER, G3.sea.b);
    gl.enableVertexAttribArray(locL.aPos);
    gl.vertexAttribPointer(locL.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, G3.sea.n);
    if(ui.grid) drawLines(G3.grid, [COL.blue[0],COL.blue[1],COL.blue[2],0.34], 1);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  /* Marcadores: primeiro o fantasma sem teste de profundidade, depois o solido
     com teste. G e B costumam estar dentro do casco, e a pergunta do painel e
     justamente onde eles estao. */
  if(ui.mark){
    var Gm = [GT[0]/1000, GT[1]/1000, GT[2]/1000];
    var Bm = [EQ.st.B[0]/1000, EQ.st.B[1]/1000, EQ.st.B[2]/1000];
    var r = Math.max(LOA_M*0.016, 0.02), sI = selIndex(), i, it, pm, vis;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    /* dois passes: o fantasma sem teste de profundidade, o solido com ele. Os
       centros vivem dentro do casco, e a pergunta do painel e onde eles estao. */
    for(var pass=0; pass<2; pass++){
      var a = pass ? 1 : 0.34;
      if(pass) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
      drawLines(G3.plumb, [1,1,1, pass ? 0.85 : 0.30], 1);
      drawLines(G3.lever, [COL.grn[0],COL.grn[1],COL.grn[2], pass ? 0.9 : 0.30], 1);
      drawGizmo(Bm, r*1.5, COL.bluei, a);
      for(i=0;i<S.items.length;i++){
        it = S.items[i];
        if(it.w <= 0.5 || (it.base && i !== sI)) continue;
        drawGizmo([it.p[0]/1000, it.p[1]/1000, it.p[2]/1000],
                  r*(i === sI ? 0.95 : 0.68), COL.grn, a);
      }
      drawGizmo(Gm, r, COL.amb, a);
    }
    gl.disable(gl.BLEND);
    placeLabel('lblG', Gm, w, h, dpr, -16);
    placeLabel('lblB', Bm, w, h, dpr, 18);
    for(i=0;i<markEls.length;i++){
      it = S.items[i];
      vis = it && it.w > 0.5 && !(it.base && i !== sI);
      if(vis) placeLabelEl(markEls[i], [it.p[0]/1000, it.p[1]/1000, it.p[2]/1000], w, h, dpr, -34);
      else markEls[i].classList.remove('on');
    }
  } else {
    ['lblG','lblB'].forEach(function(id){ document.getElementById(id).classList.remove('on'); });
    for(var k=0;k<markEls.length;k++) markEls[k].classList.remove('on');
  }
  drawGnomon(w, h);
}

/* Etiqueta HTML ancorada na projecao do ponto 3D: o nome do centro anda com ele
   sem virar textura nem geometria. */
function placeLabel(id, p, w, h, dpr, dy){
  placeLabelEl(document.getElementById(id), p, w, h, dpr, dy);
}
function placeLabelEl(el, p, w, h, dpr, dy){
  if(!el) return;
  var x = MVP[0]*p[0] + MVP[4]*p[1] + MVP[8]*p[2] + MVP[12];
  var y = MVP[1]*p[0] + MVP[5]*p[1] + MVP[9]*p[2] + MVP[13];
  var cw = MVP[3]*p[0] + MVP[7]*p[1] + MVP[11]*p[2] + MVP[15];
  if(cw <= 0.001){ el.classList.remove('on'); return; }
  var sx = (x/cw*0.5 + 0.5)*(w/dpr), sy = (1 - (y/cw*0.5 + 0.5))*(h/dpr);
  el.style.left = sx.toFixed(1) + 'px';
  el.style.top  = (sy + (dy || 0)).toFixed(1) + 'px';
  el.classList.add('on');
}

function drawGnomon(w, h){
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var size = Math.round(74*dpr), pad = Math.round(10*dpr);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(pad, pad, size, size);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.viewport(pad, pad, size, size);
  var Pg = new Float32Array(16), Vg = new Float32Array(16), Mg = new Float32Array(16);
  m4ortho(Pg, -1.6, 1.6, -1.6, 1.6, -8, 8);
  var ce = Math.cos(cam.el), se = Math.sin(cam.el);
  m4look(Vg, [3*ce*Math.cos(cam.az), 3*ce*Math.sin(cam.az), 3*se], [0,0,0], [0,0,1]);
  m4mul(Mg, Pg, Vg);
  gl.useProgram(progL);
  gl.uniformMatrix4fv(locL.uMVP, false, Mg);
  if(!G3.axes) G3.axes = {
    x: buf(new Float32Array([0,0,0, 1,0,0])),
    y: buf(new Float32Array([0,0,0, 0,1,0])),
    z: buf(new Float32Array([0,0,0, 0,0,1]))
  };
  [['x',[0.91,0.45,0.42]],['y',[0.61,0.84,0.61]],['z',[0.50,0.71,0.87]]].forEach(function(p){
    gl.uniform4f(locL.uColor, p[1][0], p[1][1], p[1][2], 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, G3.axes[p[0]]);
    gl.enableVertexAttribArray(locL.aPos);
    gl.vertexAttribPointer(locL.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.lineWidth(2);
    gl.drawArrays(gl.LINES, 0, 2);
  });
  gl.disable(gl.SCISSOR_TEST);
  gl.viewport(0, 0, w, h);
}

function loop(){
  if(dirty && gl && G3.surf){ dirty = false; render(); updateCamInfo(); }
  requestAnimationFrame(loop);
}
function updateCamInfo(){
  var el = document.getElementById('camInfo');
  var deg = function(r){ return Math.round(r*180/Math.PI); };
  el.textContent = 'az ' + ((deg(cam.az)%360+360)%360) + '°  el ' + deg(cam.el) + '°  ' +
                   fmt(cam.dist,1) + ' m';
}

/* -------------------------------------------------------------- interação */
var ptrs = {}, mode = null, last = null, pinch0 = 0, dist0 = 0;
function ptrList(){ var a = []; for(var k in ptrs) a.push(ptrs[k]); return a; }
if(canvas){
canvas.addEventListener('pointerdown', function(e){
  canvas.setPointerCapture(e.pointerId);
  ptrs[e.pointerId] = {x:e.clientX, y:e.clientY};
  var n = ptrList().length;
  if(n === 1){
    mode = (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'orbit';
    last = {x:e.clientX, y:e.clientY};
    canvas.classList.add('dragging');
  } else if(n === 2){
    mode = 'pinch';
    var p = ptrList();
    pinch0 = Math.sqrt(Math.pow(p[0].x-p[1].x,2) + Math.pow(p[0].y-p[1].y,2));
    dist0 = cam.dist;
    last = {x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2};
  }
  e.preventDefault();
});
canvas.addEventListener('pointermove', function(e){
  if(!ptrs[e.pointerId]) return;
  ptrs[e.pointerId] = {x:e.clientX, y:e.clientY};
  var p = ptrList();
  if(mode === 'orbit' && p.length === 1){
    cam.az -= (e.clientX - last.x)*0.0075;
    cam.el = Math.max(-1.5533, Math.min(1.5533, cam.el + (e.clientY - last.y)*0.0075));
    last = {x:e.clientX, y:e.clientY};
    ui.view = ''; document.getElementById('viewName').textContent = 'Livre'; syncViewChips();
    draw();
  } else if(mode === 'pan' && p.length === 1){
    panBy(e.clientX - last.x, e.clientY - last.y);
    last = {x:e.clientX, y:e.clientY};
    draw();
  } else if(mode === 'pinch' && p.length === 2){
    var d = Math.sqrt(Math.pow(p[0].x-p[1].x,2) + Math.pow(p[0].y-p[1].y,2));
    if(pinch0 > 4) cam.dist = Math.max(0.6, Math.min(120, dist0 * pinch0/Math.max(d,4)));
    var mx = (p[0].x+p[1].x)/2, my = (p[0].y+p[1].y)/2;
    panBy(mx - last.x, my - last.y);
    last = {x:mx, y:my};
    draw();
  }
  e.preventDefault();
});
function endPtr(e){
  delete ptrs[e.pointerId];
  try{ canvas.releasePointerCapture(e.pointerId); }catch(err){}
  var n = ptrList().length;
  if(n === 0){ mode = null; canvas.classList.remove('dragging'); }
  else if(n === 1){ mode = 'orbit'; var p = ptrList()[0]; last = {x:p.x, y:p.y}; }
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });
canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  cam.dist = Math.max(0.6, Math.min(120, cam.dist * Math.exp((e.deltaY > 0 ? 1 : -1)*0.12)));
  draw();
}, {passive:false});
}
function panBy(dx, dy){
  var eye = eyePos();
  var fx = cam.tx - eye[0], fy = cam.ty - eye[1], fz = cam.tz - eye[2];
  var fl = Math.sqrt(fx*fx+fy*fy+fz*fz) || 1; fx/=fl; fy/=fl; fz/=fl;
  var rx = fy, ry = -fx, rz = 0;
  var rl = Math.sqrt(rx*rx+ry*ry) || 1; rx/=rl; ry/=rl;
  var ux = ry*fz - rz*fy, uy = rz*fx - rx*fz, uz = rx*fy - ry*fx;
  var scale = 2*cam.dist*Math.tan(FOV/2) / Math.max(canvas ? canvas.clientHeight : 400, 1);
  cam.tx -= (rx*dx - ux*dy)*scale;
  cam.ty -= (ry*dx - uy*dy)*scale;
  cam.tz -= (rz*dx - uz*dy)*scale;
}

/* ==========================================================================
   O laco central: do CG ao equilibrio, e do equilibrio para a tela
   ========================================================================== */
var pendSolve = false, gzTimer = null;
/* Uma solucao por quadro, no maximo: arrastar um slider dispara um evento de
   input por pixel, e resolver o equilibrio em cada um deles poria a mao na
   frente da conta. O tempo limite e rede de seguranca - se o quadro nao vier
   (aba escondida, painel sem composicao), as leituras nao param de responder. */
function requestSolve(){
  if(pendSolve) return;
  pendSolve = true;
  requestAnimationFrame(consumeSolve);
  setTimeout(consumeSolve, 90);
}
function consumeSolve(){
  if(!pendSolve) return;
  pendSolve = false;
  solveNow();
}

function rho(){ return WATER[S.water].rho; }
function volTarget(){ return totalW()/rho()*1e9; }    /* mm3 */

function solveNow(){
  updateCG();
  var Vt = volTarget();
  EQ  = solveEquilibrium(Vt, GT, seed, true);
  UPR = uprightState(Vt, GT, EQ.d);
  EXT = scanExtremes(EQ.d, EQ.th, EQ.ps);
  seed = { th:EQ.th, ps:EQ.ps, d:EQ.d };
  updateWaterGL();
  renderReadouts();
  drawSection();
  drawProfile();
  if(gzTimer) clearTimeout(gzTimer);
  gzTimer = setTimeout(computeGZ, 150);
  draw();
}

function computeGZ(){
  gzTimer = null;
  GZ = gzCurve(volTarget(), GT, EQ.th, -90, 90, 2.5);
  drawGZ();
}

/* ------------------------------------------------------------- as leituras */
function trimWords(th){
  var a = Math.abs(th*DEG);
  if(a < 0.005) return 'a prumo';
  return (th > 0 ? 'pela proa' : 'pela popa');
}
function heelWords(ps){
  var a = Math.abs(ps*DEG);
  if(a < 0.005) return 'sem banda';
  return (ps > 0 ? 'para estibordo' : 'para bombordo');
}
function row(k, v, u, cls){
  return '<div class="ro"><div class="ro-k">' + k + '</div><div class="ro-v' +
         (cls ? ' ' + cls : '') + '">' + v + (u ? ' <small>' + u + '</small>' : '') + '</div></div>';
}

function renderReadouts(){
  var st = EQ.st, th = EQ.th, ps = EQ.ps, d = EQ.d;
  var L = SEC.x1 - SEC.x0;
  var zAft = zWater(SEC.x0, 0, d, th, ps), zFwd = zWater(SEC.x1, 0, d, th, ps);
  var iMid = Math.round(SEC.N/2);
  var tAft = zAft - SEC.zk[0], tMid = zWater(SEC.xs[iMid], 0, d, th, ps) - SEC.zk[iMid];
  var trimMM = zFwd - zAft;                       /* positivo: proa mais funda */
  var iAm = secIndexAt(st.AmaxX);
  var heelMM = 2*SEC.ys[iAm]*Math.tan(ps);
  var disp = st.V*1e-9*rho();

  var noEq = EQ.capsize && !EQ.conv;
  document.getElementById('hudTrim').textContent = fmt(Math.abs(th*DEG), 2) + '°';
  document.getElementById('hudTrimN').textContent = noEq ? 'sem equilíbrio' : trimWords(th);
  document.getElementById('hudHeel').textContent = fmt(Math.abs(ps*DEG), 2) + '°';
  document.getElementById('hudHeelN').textContent = noEq ? 'sem equilíbrio' : heelWords(ps);
  document.getElementById('tbDisp').textContent = fmt(disp, 0) + ' kg';
  document.getElementById('tbTrim').textContent = fmt(th*DEG, 2) + '°';
  document.getElementById('tbHeel').textContent = fmt(ps*DEG, 2) + '°';

  var eq = [
    row('Trim', fmt(Math.abs(th*DEG),2) + '°', trimWords(th), Math.abs(th*DEG) > 0.005 ? 'hi' : ''),
    row('Banda', fmt(Math.abs(ps*DEG),2) + '°', heelWords(ps), Math.abs(ps*DEG) > 0.005 ? 'hi' : ''),
    row('Diferença de calados', fmt(trimMM/1000,3) + ' m',
        'proa − popa, em ' + fmt(L/1000,2) + ' m'),
    row('Diferença entre bordos', fmt(heelMM/1000,3) + ' m',
        'estibordo − bombordo, na mestra'),
    row('Calado a ré, na quilha', fmt(tAft/1000,3),
        tAft >= 0 ? 'm · no ponto mais baixo do espelho' : 'm · o espelho saiu da água'),
    row('Calado a meia-nau', fmt(tMid/1000,3), 'm'),
    row('Imersão máxima', fmt(EXT.deep/1000,3), 'm · ⟂ ao plano d’água'),
    row('Borda livre mínima', fmt(EXT.fb/1000,3) + ' m',
        'a ' + fmt(EXT.fbX/1000,2) + ' m ' + (EXT.fbSide > 0 ? 'estibordo' : 'bombordo'),
        EXT.fb < 0 ? 'bad' : (EXT.fb < 40 ? 'hi' : '')),
    row('Volume deslocado', fmt(st.V*1e-9,3), 'm³'),
    row('Deslocamento', fmt(disp,0), 'kg · ' + fmt(S.items.length ? S.items[0].w : 0,0) +
        ' do barco + ' + fmt(movW(),0) + ' em ' + (S.items.length-1) +
        (S.items.length === 2 ? ' peso' : ' pesos')),
    row('LCG · LCB da popa', fmt((GT[0]-SEC.x0)/1000,3) + ' · ' + fmt((st.B[0]-SEC.x0)/1000,3), 'm'),
    row('TCG · TCB', fmt(GT[1]/1000,3) + ' · ' + fmt(st.B[1]/1000,3), 'm'),
    row('KG · KB', fmt(GT[2]/1000,3) + ' · ' + fmt(st.B[2]/1000,3), 'm'),
    row('Braço residual', fmt((Math.abs(EQ.r1) + Math.abs(EQ.r2))/1000,5) + ' m',
        EQ.conv ? ('convergiu em ' + EQ.iters + ' iterações') : 'não convergiu',
        EQ.conv ? '' : 'bad')
  ];
  document.getElementById('eqGrid').innerHTML = eq.join('');
  document.getElementById('eqSub').textContent =
    fmt(disp,0) + ' kg · ' + WATER[S.water].nome.toLowerCase() + ' ' + rho() + ' kg/m³';

  var xF = (st.aF - EQ.d*Math.tan(th))*Math.cos(th);
  var mom1 = disp*EQ.stiffT/1000*Math.sin(1*RAD);
  var momT = disp*EQ.stiffL/1000*Math.sin(1*RAD);
  var stab = [
    row('GM<sub>t</sub> transversal', fmt(UPR.GMT/1000,3), 'm · a prumo, estabilidade inicial',
        UPR.GMT <= 0 ? 'bad' : ''),
    row('Rigidez efetiva na posição', fmt(EQ.stiffT/1000,3), 'm · GM local',
        EQ.stiffT <= 0 ? 'bad' : ''),
    row('GM<sub>l</sub> longitudinal', fmt(UPR.GML/1000,2), 'm'),
    row('BM<sub>t</sub> · BM<sub>l</sub>', fmt(UPR.BMT/1000,3) + ' · ' + fmt(UPR.BML/1000,2), 'm'),
    row('KB · BG', fmt(UPR.KB/1000,3) + ' · ' + fmt(EQ.bg/1000,3), 'm'),
    row('Momento para 1° de banda', fmt(Math.abs(mom1),1), 'kgf·m'),
    row('Momento para 1° de trim', fmt(Math.abs(momT),1), 'kgf·m'),
    row('Área do plano d’água', fmt(st.Awp*1e-6,3), 'm²'),
    row('Compr. · boca na linha d’água', fmt(st.Lwl/1000,2) + ' · ' + fmt(st.Bwl/1000,2), 'm'),
    row('LCF da popa', fmt((xF - SEC.x0)/1000,3), 'm'),
    row('Calado a prumo, mesmo peso', fmt(UPR.T/1000,3), 'm'),
    row('Área da baliza mestra', fmt(st.Amax*1e-6,3), 'm² · em x = ' + fmt(st.AmaxX/1000,2) + ' m')
  ];
  document.getElementById('stabGrid').innerHTML = stab.join('');
  document.getElementById('stabSub').textContent =
    'a prumo: KM' + 'ₜ' + ' ' + fmt((UPR.KB + UPR.BMT)/1000,3) + ' m · calado ' +
    fmt(UPR.T/1000,3) + ' m';

  document.getElementById('cgSub').textContent =
    S.items.length + ' itens · ' + fmt(totalW(),0) + ' kg  →  G em x ' + m3(GT[0]) +
    ' · y ' + m3(GT[1]) + ' · z ' + m3(GT[2]) + ' m';
  document.getElementById('cgXNote').innerHTML =
    'CG <b>' + m3(GT[0]) + '</b> · LCB <b>' + m3(st.B[0]) + '</b> m';
  document.getElementById('cgYNote').innerHTML =
    'CG <b>' + m3(GT[1]) + '</b> · TCB <b>' + m3(st.B[1]) + '</b> m';
  document.getElementById('cgZNote').innerHTML =
    'CG <b>' + m3(GT[2]) + '</b> · KB <b>' + m3(st.B[2]) + '</b> · KM' + 'ₜ' +
    ' <b>' + m3(UPR.KB + UPR.BMT) + '</b> m';
  var si = selItem();
  document.getElementById('pwNote').innerHTML = si
    ? ('<b>' + fmt(100*si.w/Math.max(1e-9, totalW()),1) + '%</b> do deslocamento')
    : '—';
  syncWeightFoot();

  renderAlerts();
}

function renderAlerts(){
  var box = document.getElementById('alerts'), a = [];
  if(EQ.full)
    a.push(['bad', '<b>O casco afunda.</b> O peso pedido passa da flutuação do sólido fechado ' +
            '(' + fmt(SEC.Vtot*1e-9*rho(),0) + ' kg com casco, convés e espelho totalmente submersos). ' +
            'Reduza o peso.']);
  else if(EQ.capsize)
    a.push(['bad', '<b>O casco capota.</b> Com este CG não existe posição de equilíbrio estável até ' +
            '75° de banda: a curva de braços não volta a ficar positiva. A atitude desenhada é onde o ' +
            'solver parou, e não uma posição de flutuação — baixe o CG ou traga-o para a linha de centro.']);
  else if(EQ.fromUnstable)
    a.push(['bad', '<b>A prumo o GM é negativo</b> (' + m3(UPR.GMT) + ' m): o casco não para de pé. ' +
            'A posição mostrada é a adernada estável, com ' + fmt(Math.abs(EQ.ps*DEG),1) +
            '° de banda — para onde o barco realmente cai.']);
  else if(UPR.GMT < 0.02*BEAM_M*1000)
    a.push(['warn', 'GM<sub>t</sub> de apenas ' + m3(UPR.GMT) + ' m, ' +
            fmt(UPR.GMT/(BEAM_M*1000)*100,1) + '% da boca: estabilidade inicial curta, o casco fica mole.']);
  if(EXT.fb < 0)
    a.push(['warn', '<b>A borda mergulha</b> ' + m3(-EXT.fb) + ' m a ' + fmt(EXT.fbX/1000,2) +
            ' m da popa, ' + (EXT.fbSide > 0 ? 'em estibordo' : 'em bombordo') +
            '. Daqui em diante o cálculo supõe convés estanque e o número fica otimista: o barco real ' +
            'embarcaria água.']);
  else if(EXT.fb < 40)
    a.push(['warn', 'Borda livre de só ' + m3(EXT.fb) + ' m a ' + fmt(EXT.fbX/1000,2) +
            ' m da popa: qualquer onda entra.']);
  if(!EQ.conv && !EQ.full)
    a.push(['warn', 'O equilíbrio não fechou: braço residual de ' +
            fmt((Math.abs(EQ.r1)+Math.abs(EQ.r2))/1000,5) + ' m depois de ' + EQ.iters + ' iterações.']);
  if(!a.length){
    var lvl = Math.abs(EQ.th*DEG) < 0.005 && Math.abs(EQ.ps*DEG) < 0.005;
    a.push(['ok', lvl
      ? '<b>Casco a prumo.</b> G caiu na mesma vertical de B sem inclinar nada: somados, ' +
        'os pesos da tabela não pedem inclinação nenhuma.'
      : 'Equilíbrio fechado: <b>B ficou sob G</b> com ' + fmt(Math.abs(EQ.th*DEG),2) + '° de trim ' +
        trimWords(EQ.th) + ' e ' + fmt(Math.abs(EQ.ps*DEG),2) + '° de banda ' + heelWords(EQ.ps) + '.']);
  }
  box.innerHTML = a.map(function(it){
    return '<div class="alert' + (it[0] === 'bad' ? ' bad' : (it[0] === 'ok' ? ' ok' : '')) + '">' +
           it[1] + '</div>';
  }).join('');
}

/* ======================================================================
   Diagramas 2D. Mesma linguagem do gráfico de áreas do visualizador de
   calado: fundo da ficha, grade recuada, área imersa em vermelho Brana,
   plano d'água em azul, centros marcados e nomeados - nunca só pela cor.
   ====================================================================== */
function prep(id){
  var c = document.getElementById(id);
  if(!c) return null;
  var w = c.clientWidth, h = c.clientHeight;
  if(w < 8 || h < 8) return null;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(w*dpr); c.height = Math.round(h*dpr);
  var g = c.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,w,h);
  return { c:c, g:g, w:w, h:h, mono:function(px){ return px + 'px ' + (css('--font-mono') || 'monospace'); } };
}
function dot(g, x, y, r, color){
  g.beginPath(); g.arc(x, y, r, 0, 2*Math.PI); g.fillStyle = color; g.fill();
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(46,46,46,.9)'; g.stroke();
}
function tag(g, x, y, txt, color, mono){
  g.font = '700 ' + mono(11);
  var w = g.measureText(txt).width + 6;
  g.fillStyle = 'rgba(46,46,46,.78)';
  g.fillRect(x + 7, y - 8, w, 15);
  g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(txt, x + 10, y);
}

/* Os pesos da tabela nos diagramas: pontinho verde em cada um, nome e braço só no
   selecionado - com meia dúzia de cargas a bordo, rotular todas viraria mancha.
   ka e kb dizem quais eixos do peso vão para os eixos do desenho. */
function drawItems(g, X, Z, ka, kb, mono){
  var sI = selIndex(), i, it;
  for(i=0;i<S.items.length;i++){
    it = S.items[i];
    if(it.w <= 0.5 || (it.base && i !== sI)) continue;
    if(i === sI){
      g.strokeStyle = 'rgba(155,215,155,.55)'; g.lineWidth = 1; g.setLineDash([3,3]);
      g.beginPath(); g.moveTo(X(it.p[ka]), Z(it.p[kb])); g.lineTo(X(GT[ka]), Z(GT[kb]));
      g.stroke(); g.setLineDash([]);
    }
    dot(g, X(it.p[ka]), Z(it.p[kb]), i === sI ? 4 : 3, css('--green'));
    if(i === sI) tag(g, X(it.p[ka]), Z(it.p[kb]), it.name, css('--green'), mono);
  }
}

/* ------------------------------------------------- seção transversal (banda) */
function drawSection(){
  var P0 = prep('secCanvas'); if(!P0 || !EQ) return;
  var g = P0.g, w = P0.w, h = P0.h, mono = P0.mono;
  var idx = Math.round(MSEC*SEC.N), x = SEC.xs[idx], poly = sectionPoly(idx);
  var ps = EQ.ps, tp = Math.tan(ps);
  var z0 = zWater(x, 0, EQ.d, EQ.th, ps);

  var yMax = 0, zLo = Infinity, zHi = -Infinity, i;
  for(i=0;i<poly.length;i++){
    if(Math.abs(poly[i][0]) > yMax) yMax = Math.abs(poly[i][0]);
    if(poly[i][1] < zLo) zLo = poly[i][1];
    if(poly[i][1] > zHi) zHi = poly[i][1];
  }
  yMax = Math.max(yMax, SEC.yMax*0.35, 1);
  var yHalf = yMax*1.22;
  zLo = Math.min(zLo, z0 - yHalf*Math.abs(tp)) - 20;
  var selP = selItem();
  zHi = Math.max(zHi, z0 + yHalf*Math.abs(tp), GT[2],
                 (selP && selP.w > 0.5) ? selP.p[2] : -Infinity) + 20;

  var pad = 26, iw = w - pad*2, ih = h - pad - 16;
  var sc = Math.min(iw/(2*yHalf), ih/(zHi - zLo));
  var oy = (ih - (zHi - zLo)*sc)/2;                /* escala verdadeira, desenho centrado */
  var cx = w/2, cz = pad + ih - oy + zLo*sc;       /* z = 0 na linha de base */
  function X(y){ return cx + y*sc; }
  function Z(z){ return cz - z*sc; }

  /* linha de base e linha de centro */
  g.strokeStyle = css('--rule-2'); g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, Math.round(Z(0))+.5); g.lineTo(w-pad, Math.round(Z(0))+.5);
  g.moveTo(Math.round(cx)+.5, pad); g.lineTo(Math.round(cx)+.5, pad+ih);
  g.stroke();

  /* área imersa: o mesmo recorte que o integrador faz, desenhado */
  var wet = [];
  for(i=0;i<poly.length;i++){
    var a = poly[i], b = poly[(i+1)%poly.length];
    var ga = a[1] - (z0 + a[0]*tp), gb = b[1] - (z0 + b[0]*tp);
    if(ga <= 0) wet.push(a);
    if((ga <= 0) !== (gb <= 0)){
      var t = ga/(ga - gb);
      wet.push([a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t]);
    }
  }
  if(wet.length > 2){
    g.beginPath();
    g.moveTo(X(wet[0][0]), Z(wet[0][1]));
    for(i=1;i<wet.length;i++) g.lineTo(X(wet[i][0]), Z(wet[i][1]));
    g.closePath();
    g.fillStyle = 'rgba(154,50,49,.48)'; g.fill();
  }

  /* contorno da baliza, e o convés como traço fino */
  g.strokeStyle = css('--light'); g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(X(poly[0][0]), Z(poly[0][1]));
  for(i=1;i<poly.length;i++) g.lineTo(X(poly[i][0]), Z(poly[i][1]));
  g.stroke();
  g.strokeStyle = 'rgba(191,191,191,.5)'; g.lineWidth = 1; g.setLineDash([3,3]);
  g.beginPath();
  g.moveTo(X(poly[poly.length-1][0]), Z(poly[poly.length-1][1]));
  g.lineTo(X(poly[0][0]), Z(poly[0][1]));
  g.stroke(); g.setLineDash([]);

  /* plano d'água */
  g.strokeStyle = css('--blue-ink'); g.lineWidth = 2;
  g.beginPath();
  var yL = (pad - cx)/sc, yR = (w - pad - cx)/sc;
  g.moveTo(X(yL), Z(z0 + yL*tp));
  g.lineTo(X(yR), Z(z0 + yR*tp));
  g.stroke();

  /* centros: G, B e o metacentro transversal, com a vertical que os liga */
  var B = EQ.st.B, cpz = Math.cos(ps), spz = Math.sin(ps);
  var My = B[1] - EQ.BMT*spz, Mz = B[2] + EQ.BMT*cpz;
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.setLineDash([5,4]);
  g.beginPath();
  var t0 = -DEPTH_M*600, t1 = DEPTH_M*900;
  g.moveTo(X(B[1] - spz*t0), Z(B[2] + cpz*t0));
  g.lineTo(X(B[1] - spz*t1), Z(B[2] + cpz*t1));
  g.stroke(); g.setLineDash([]);
  if(Mz < zHi && Math.abs(My) < yHalf){
    dot(g, X(My), Z(Mz), 4, css('--muted'));
    tag(g, X(My), Z(Mz), 'M', css('--muted'), mono);
  }
  dot(g, X(B[1]), Z(B[2]), 5, css('--blue-ink'));
  tag(g, X(B[1]), Z(B[2]), 'B', css('--blue-ink'), mono);
  drawItems(g, X, Z, 1, 2, mono);
  dot(g, X(GT[1]), Z(GT[2]), 4, css('--amber'));
  tag(g, X(GT[1]), Z(GT[2]), 'G', css('--amber'), mono);

  /* escala e legenda */
  g.fillStyle = css('--muted'); g.font = mono(9.5);
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText('bombordo', pad, pad+ih+3);
  g.textAlign = 'right';
  g.fillText('estibordo', w-pad, pad+ih+3);
  g.textAlign = 'center';
  g.fillText(fmt(Math.abs(ps*DEG),2) + '° ' + heelWords(ps), w/2, pad+ih+3);

  document.getElementById('secSub').textContent =
    'baliza em x = ' + fmt(x/1000,3) + ' m · G e B projetados no plano da baliza';
  document.getElementById('secXVal').textContent = m3(x) + ' m';
}

/* ---------------------------------------------------------- perfil (trim) */
function drawProfile(){
  var P0 = prep('proCanvas'); if(!P0 || !EQ) return;
  var g = P0.g, w = P0.w, h = P0.h, mono = P0.mono;
  var i, N = SEC.N;
  var zLo = Infinity, zHi = -Infinity;
  for(i=0;i<=N;i++){
    if(SEC.zk[i] < zLo) zLo = SEC.zk[i];
    if(SEC.zs[i] > zHi) zHi = SEC.zs[i];
  }
  var z0a = zWater(SEC.x0, 0, EQ.d, EQ.th, EQ.ps), z0b = zWater(SEC.x1, 0, EQ.d, EQ.th, EQ.ps);
  zLo = Math.min(zLo, z0a, z0b) - 20;
  var selP2 = selItem();
  zHi = Math.max(zHi, z0a, z0b, GT[2],
                 (selP2 && selP2.w > 0.5) ? selP2.p[2] : -Infinity) + 20;

  var pad = 26, iw = w - pad*2, ih = h - pad - 16;
  var sc = Math.min(iw/(SEC.x1 - SEC.x0), ih/(zHi - zLo));
  var x0p = pad + (iw - (SEC.x1-SEC.x0)*sc)/2;
  var zBase = pad + ih - (ih - (zHi - zLo)*sc)/2 + zLo*sc;
  function X(x){ return x0p + (x - SEC.x0)*sc; }
  function Z(z){ return zBase - z*sc; }

  g.strokeStyle = css('--rule-2'); g.lineWidth = 1;
  g.beginPath(); g.moveTo(pad, Math.round(Z(0))+.5); g.lineTo(w-pad, Math.round(Z(0))+.5); g.stroke();

  /* obra viva: entre a quilha e a superfície, onde houver água acima da quilha */
  var run = [];
  function flush(){
    if(run.length < 2){ run = []; return; }
    g.beginPath();
    g.moveTo(X(run[0][0]), Z(run[0][1]));
    for(var k=1;k<run.length;k++) g.lineTo(X(run[k][0]), Z(run[k][1]));
    for(k=run.length-1;k>=0;k--) g.lineTo(X(run[k][0]), Z(run[k][2]));
    g.closePath();
    g.fillStyle = 'rgba(154,50,49,.48)'; g.fill();
    run = [];
  }
  for(i=0;i<=N;i++){
    var x = SEC.xs[i], zw = zWater(x, 0, EQ.d, EQ.th, EQ.ps);
    var top = Math.min(zw, SEC.zs[i]);
    if(top > SEC.zk[i] + 1e-9) run.push([x, SEC.zk[i], top]); else flush();
  }
  flush();

  /* silhueta: quilha, tosado e os dois fechamentos */
  g.strokeStyle = css('--light'); g.lineWidth = 1.8;
  g.beginPath();
  for(i=0;i<=N;i++){ var xx = X(SEC.xs[i]), zz = Z(SEC.zk[i]); if(i) g.lineTo(xx,zz); else g.moveTo(xx,zz); }
  g.stroke();
  g.beginPath();
  for(i=0;i<=N;i++){ var xs2 = X(SEC.xs[i]), zs2 = Z(SEC.zs[i]); if(i) g.lineTo(xs2,zs2); else g.moveTo(xs2,zs2); }
  g.stroke();
  g.beginPath();
  g.moveTo(X(SEC.x0), Z(SEC.zk[0])); g.lineTo(X(SEC.x0), Z(SEC.zs[0]));
  g.moveTo(X(SEC.x1), Z(SEC.zk[N])); g.lineTo(X(SEC.x1), Z(SEC.zs[N]));
  g.stroke();

  /* plano d'água, reto porque é reto: a inclinação é o trim */
  g.strokeStyle = css('--blue-ink'); g.lineWidth = 2;
  g.beginPath();
  var xl = SEC.x0 - (x0p - pad)/sc, xr = SEC.x1 + (w - pad - X(SEC.x1))/sc;
  g.moveTo(X(xl), Z(zWater(xl, 0, EQ.d, EQ.th, EQ.ps)));
  g.lineTo(X(xr), Z(zWater(xr, 0, EQ.d, EQ.th, EQ.ps)));
  g.stroke();

  /* vertical por G e B, projetada no plano do perfil */
  var B = EQ.st.B, nn = nVec(EQ.th, EQ.ps);
  var nx = nn[0], nz = nn[2], nl = Math.sqrt(nx*nx + nz*nz) || 1;
  nx /= nl; nz /= nl;
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.setLineDash([5,4]);
  g.beginPath();
  g.moveTo(X(B[0] - nx*DEPTH_M*700), Z(B[2] - nz*DEPTH_M*700));
  g.lineTo(X(B[0] + nx*DEPTH_M*900), Z(B[2] + nz*DEPTH_M*900));
  g.stroke(); g.setLineDash([]);
  dot(g, X(B[0]), Z(B[2]), 5, css('--blue-ink'));
  tag(g, X(B[0]), Z(B[2]), 'B', css('--blue-ink'), mono);
  drawItems(g, X, Z, 0, 2, mono);
  dot(g, X(GT[0]), Z(GT[2]), 4, css('--amber'));
  tag(g, X(GT[0]), Z(GT[2]), 'G', css('--amber'), mono);

  g.fillStyle = css('--muted'); g.font = mono(9.5);
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText('popa', pad, pad+ih+3);
  g.textAlign = 'right'; g.fillText('proa', w-pad, pad+ih+3);
  g.textAlign = 'center';
  g.fillText(fmt(Math.abs(EQ.th*DEG),2) + '° ' + trimWords(EQ.th), w/2, pad+ih+3);

  document.getElementById('proSub').textContent =
    'seção pela linha de centro · calado a ré ' + fmt((z0a - SEC.zk[0])/1000,3) + ' m';
}

/* -------------------------------------------------------- curva de braços */
var gzGeom = null;
function drawGZ(){
  var P0 = prep('gzCanvas'); if(!P0 || !GZ || !GZ.length) return;
  var g = P0.g, w = P0.w, h = P0.h, mono = P0.mono, i;
  var padL = 46, padR = 14, padT = 12, padB = 26;
  var iw = w - padL - padR, ih = h - padT - padB;
  if(iw < 40 || ih < 40) return;
  var gzMax = 0, gzMin = 0;
  for(i=0;i<GZ.length;i++){
    if(GZ[i].gz > gzMax) gzMax = GZ[i].gz;
    if(GZ[i].gz < gzMin) gzMin = GZ[i].gz;
  }
  var span = Math.max(gzMax, -gzMin, 20)*1.18;
  function X(deg){ return padL + (deg + 90)/180*iw; }
  function Y(gz){ return padT + ih/2 - gz/span*(ih/2); }
  gzGeom = { X:X, Y:Y, padL:padL, padT:padT, iw:iw, ih:ih, span:span };

  g.strokeStyle = css('--rule-2'); g.lineWidth = 1;
  g.beginPath();
  for(var dg=-90; dg<=90; dg+=30){ var xx = Math.round(X(dg))+.5; g.moveTo(xx, padT); g.lineTo(xx, padT+ih); }
  for(var k=-2;k<=2;k++){ var yy = Math.round(Y(span*k/2))+.5; g.moveTo(padL, yy); g.lineTo(w-padR, yy); }
  g.stroke();

  /* área sob a curva: positiva é reserva de endireitamento, negativa é o que
     derruba - duas cores porque são duas coisas diferentes */
  function area(sign, fill){
    g.beginPath();
    g.moveTo(X(GZ[0].deg), Y(0));
    for(i=0;i<GZ.length;i++) g.lineTo(X(GZ[i].deg), Y(sign > 0 ? Math.max(0, GZ[i].gz) : Math.min(0, GZ[i].gz)));
    g.lineTo(X(GZ[GZ.length-1].deg), Y(0));
    g.closePath(); g.fillStyle = fill; g.fill();
  }
  area(1, 'rgba(154,50,49,.42)');
  area(-1, 'rgba(251,177,47,.16)');

  /* eixo GZ = 0 */
  g.strokeStyle = 'rgba(232,232,232,.55)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(padL, Math.round(Y(0))+.5); g.lineTo(w-padR, Math.round(Y(0))+.5); g.stroke();

  /* tangente GM na banda de equilíbrio: a inclinação que o painel reporta */
  var pe = EQ.ps*DEG, sl = EQ.stiffT;
  g.strokeStyle = 'rgba(191,191,191,.85)'; g.lineWidth = 1.5; g.setLineDash([5,4]);
  g.beginPath();
  var d1 = Math.max(-90, pe - 24), d2 = Math.min(90, pe + 24);
  g.moveTo(X(d1), Y(sl*(d1 - pe)*RAD));
  g.lineTo(X(d2), Y(sl*(d2 - pe)*RAD));
  g.stroke(); g.setLineDash([]);

  /* onde a borda mergulha */
  var immA = null, immB = null;
  for(i=1;i<GZ.length;i++){
    if(GZ[i-1].fb >= 0 && GZ[i].fb < 0){ if(GZ[i].deg > 0 && immB === null) immB = GZ[i].deg; }
    if(GZ[i-1].fb < 0 && GZ[i].fb >= 0){ if(GZ[i-1].deg < 0) immA = GZ[i-1].deg; }
  }
  [immA, immB].forEach(function(dv){
    if(dv === null) return;
    g.strokeStyle = 'rgba(251,177,47,.75)'; g.lineWidth = 1; g.setLineDash([2,3]);
    g.beginPath(); g.moveTo(Math.round(X(dv))+.5, padT); g.lineTo(Math.round(X(dv))+.5, padT+ih); g.stroke();
    g.setLineDash([]);
    g.save(); g.translate(X(dv) + (dv > 0 ? -4 : 4), padT + 6);
    g.fillStyle = css('--amber'); g.font = mono(9);
    g.textAlign = dv > 0 ? 'right' : 'left'; g.textBaseline = 'top';
    g.fillText('borda mergulha', 0, 0); g.restore();
  });

  /* a curva */
  g.strokeStyle = css('--red-l'); g.lineWidth = 2;
  g.beginPath();
  for(i=0;i<GZ.length;i++){
    var px = X(GZ[i].deg), py = Y(GZ[i].gz);
    if(i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.stroke();

  /* Equilíbrio, e o pico do braço CONTADO DO EQUILÍBRIO PARA FORA. O máximo
     absoluto da janela não serve de leitura: com o CG fora da linha de centro a
     curva é assimétrica, e o que interessa é a reserva que existe a partir da
     posição em que o barco está, no sentido em que ele já está inclinado. */
  dot(g, X(pe), Y(0), 4.5, css('--amber'));
  tag(g, X(pe), Y(0), fmt(pe,1) + '°', css('--amber'), mono);
  var side = pe >= 0 ? 1 : -1, iMax = -1, best = 0;
  for(i=0;i<GZ.length;i++){
    if(side*(GZ[i].deg - pe) <= 0) continue;
    if(side*GZ[i].gz > best){ best = side*GZ[i].gz; iMax = i; }
  }
  if(iMax >= 0 && best > span*0.06){
    dot(g, X(GZ[iMax].deg), Y(GZ[iMax].gz), 3.5, css('--red-l'));
    tag(g, X(GZ[iMax].deg), Y(GZ[iMax].gz), 'GZ máx ' + fmt(best/1000,3) + ' m',
        css('--red-l'), mono);
  }

  /* eixos */
  g.fillStyle = css('--muted'); g.font = mono(9.5);
  g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillText(fmt(span/1000,2), padL - 6, Y(span));
  g.fillText('0', padL - 6, Y(0));
  g.fillText(fmt(-span/1000,2), padL - 6, Y(-span));
  g.save(); g.translate(12, padT + ih/2); g.rotate(-Math.PI/2);
  g.textAlign = 'center'; g.fillText('GZ (m)', 0, 0); g.restore();
  g.textAlign = 'center'; g.textBaseline = 'top';
  for(dg=-90; dg<=90; dg+=30) g.fillText(dg + '°', X(dg), padT + ih + 6);
  g.textAlign = 'left';
  g.fillText('bombordo', padL, padT + ih + 15);
  g.textAlign = 'right';
  g.fillText('estibordo', w - padR, padT + ih + 15);

  /* fatos que o olho não tira do traço */
  var vanish = null, j;
  if(iMax >= 0) for(j=iMax; j+side >= 0 && j+side < GZ.length; j += side){
    if(side*GZ[j].gz > 0 && side*GZ[j+side].gz <= 0){
      var f = GZ[j].gz/(GZ[j].gz - GZ[j+side].gz);
      vanish = GZ[j].deg + f*(GZ[j+side].deg - GZ[j].deg);
      break;
    }
  }
  document.getElementById('gzFacts').innerHTML = (iMax < 0)
    ? 'nenhum braço de endireitamento a partir desta posição'
    : ('GZ máx <b>' + fmt(best/1000,3) + ' m</b> a <b>' + fmt(GZ[iMax].deg,0) + '°</b>' +
       (vanish !== null ? ' · anula-se em <b>' + fmt(vanish,0) + '°</b>' : ''));
  document.getElementById('gzSub').textContent =
    'banda imposta, volume constante, trim congelado em ' + fmt(EQ.th*DEG,2) + '°';
}

/* leitura no ponteiro: um gráfico interativo tem de responder ao ponteiro */
(function(){
  var c = document.getElementById('gzCanvas'), tip = document.getElementById('gzTip');
  if(!c) return;
  function move(e){
    if(!GZ || !gzGeom){ tip.classList.remove('on'); return; }
    var r = c.getBoundingClientRect();
    var px = e.clientX - r.left;
    var deg = (px - gzGeom.padL)/gzGeom.iw*180 - 90;
    var best = 0, i;
    for(i=0;i<GZ.length;i++) if(Math.abs(GZ[i].deg - deg) < Math.abs(GZ[best].deg - deg)) best = i;
    var p = GZ[best];
    tip.innerHTML = '<i>banda</i> ' + fmt(p.deg,1) + '°  <i>GZ</i> ' + fmt(p.gz/1000,3) + ' m' +
                    (p.fb < 0 ? '  <i>borda submersa</i>' : '');
    tip.style.left = gzGeom.X(p.deg) + 'px';
    tip.style.top  = gzGeom.Y(p.gz) + 'px';
    tip.classList.add('on');
    drawGZ();
    var g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(Math.round(gzGeom.X(p.deg))+.5, gzGeom.padT);
    g.lineTo(Math.round(gzGeom.X(p.deg))+.5, gzGeom.padT + gzGeom.ih);
    g.stroke();
    dot(g, gzGeom.X(p.deg), gzGeom.Y(p.gz), 4, css('--white'));
  }
  c.addEventListener('pointermove', move);
  c.addEventListener('pointerdown', move);
  c.addEventListener('pointerleave', function(){ tip.classList.remove('on'); drawGZ(); });
})();

/* ======================================================================
   Controles
   ====================================================================== */
function syncViewChips(){
  var box = document.getElementById('viewChips');
  var keys = ['proa','popa','perfil','frente','planta','fundo'];
  box.innerHTML = keys.map(function(k){
    return '<button type="button" class="chip" data-v="' + k + '" aria-pressed="' + (ui.view===k) + '">' +
           VIEWS[k].name.split(' · ')[0] + '</button>';
  }).join('');
  Array.prototype.forEach.call(box.querySelectorAll('.chip'), function(btn){
    btn.addEventListener('click', function(){ setView(btn.getAttribute('data-v')); });
  });
}
function bindToggle(id, key){
  var el = document.getElementById(id);
  if(!el) return;
  el.checked = !!ui[key];
  el.addEventListener('change', function(e){ ui[key] = e.target.checked; draw(); });
}
function syncWater(){
  var box = document.getElementById('waterChips');
  box.innerHTML = ['salgada','doce'].map(function(k){
    return '<button type="button" class="chip" data-w="' + k + '" aria-pressed="' +
           (S.water === k) + '">' + WATER[k].nome + '</button>';
  }).join('');
  Array.prototype.forEach.call(box.querySelectorAll('.chip'), function(btn){
    btn.addEventListener('click', function(){
      S.water = btn.getAttribute('data-w');
      syncWater(); syncWeightRange(); requestSolve();
    });
  });
}
/* ---------------------------------------------------- tabela de pesos --------
   A tabela e a interface principal da v2: cada linha e um peso, editavel celula
   por celula, e a linha escolhida e a que os sliders movem. A estrutura so e
   remontada quando entra ou sai linha - digitar numa celula nao pode reescrever a
   tabela debaixo do cursor. */
var markEls = [];
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function renderWeights(){
  var b = document.getElementById('wtBody'), h = '', i, it;
  for(i=0;i<S.items.length;i++){
    it = S.items[i];
    h += '<tr data-i="' + i + '"' + (i === selIndex() ? ' class="sel"' : '') + '>' +
      '<td><input class="num nm" type="text" data-k="name" value="' + esc(it.name) + '"></td>' +
      '<td><input class="num" type="number" data-k="w" step="1" min="0" value="' + Math.round(it.w) + '"></td>' +
      '<td><input class="num" type="number" data-k="x" step="0.001" value="' + (it.p[0]/1000).toFixed(3) + '"></td>' +
      '<td><input class="num" type="number" data-k="y" step="0.001" value="' + (it.p[1]/1000).toFixed(3) + '"></td>' +
      '<td><input class="num" type="number" data-k="z" step="0.001" value="' + (it.p[2]/1000).toFixed(3) + '"></td>' +
      '<td>' + (it.base
        ? '<span class="xbtn off" title="o barco não sai da tabela">—</span>'
        : '<button type="button" class="xbtn" data-x="1" title="remover">&#10005;</button>') +
      '</td></tr>';
  }
  b.innerHTML = h;
  rebuildMarkLabels();
  syncSelBar();
  syncWeightFoot();
  document.getElementById('addNote').textContent =
    S.items.length >= MAXIT ? ('máximo de ' + (MAXIT-1) + ' pesos na tabela') : '';
}
function syncWeightFoot(){
  var f = document.getElementById('wtFoot');
  if(!f) return;
  f.innerHTML = '<tr><td>total · CG</td><td>' + fmt(totalW(),0) + '</td><td>' +
    m3(GT[0]) + '</td><td>' + m3(GT[1]) + '</td><td>' + m3(GT[2]) + '</td><td></td></tr>';
}
/* Sincroniza as celulas da linha escolhida com o que os sliders fizeram. */
function syncRowCells(){
  var i = selIndex(), tr;
  if(i < 0) return;
  tr = document.querySelector('#wtBody tr[data-i="' + i + '"]');
  if(!tr) return;
  var it = S.items[i], m = { w:it.w, x:it.p[0], y:it.p[1], z:it.p[2] };
  Array.prototype.forEach.call(tr.querySelectorAll('input[data-k]'), function(el){
    var k = el.getAttribute('data-k');
    if(k === 'name' || document.activeElement === el) return;
    el.value = (k === 'w') ? Math.round(m[k]) : (m[k]/1000).toFixed(3);
  });
  syncWeightFoot();
}
function syncSelBar(){
  var it = selItem();
  document.getElementById('selName').textContent =
    it ? (it.name + ' · ' + fmt(it.w,0) + ' kg') : '—';
}
function setSel(i, quiet){
  S.sel = Math.max(0, Math.min(i, S.items.length - 1));
  Array.prototype.forEach.call(document.querySelectorAll('#wtBody tr'), function(tr){
    tr.className = (+tr.getAttribute('data-i') === S.sel) ? 'sel' : '';
  });
  syncSelBar(); syncMarkNames(); syncSliders();
  if(!quiet){ drawSection(); drawProfile(); draw(); }
}
function uniqueName(base){
  var n = 1, nm = base, i, bate = true;
  while(bate){
    bate = false;
    for(i=0;i<S.items.length;i++) if(S.items[i].name === nm){ bate = true; break; }
    if(bate){ n++; nm = base + ' ' + n; }
  }
  return nm;
}
/* Um peso novo nasce sobre o CG atual: e o unico lugar onde somar massa nao mexe
   em trim nem em banda, so no calado. Dai o usuario o arrasta para onde ele vai. */
function addItem(name, w){
  if(S.items.length >= MAXIT) return;
  updateCG();
  S.items.push({ name:uniqueName(name), w:w,
                 p:[Math.round(GT[0]), Math.round(GT[1]), Math.round(GT[2])] });
  S.sel = S.items.length - 1;
  renderWeights(); syncSliders(); requestSolve();
}
function removeItem(i){
  var it = S.items[i];
  if(!it || it.base) return;
  S.items.splice(i, 1);
  if(S.sel >= S.items.length) S.sel = S.items.length - 1;
  renderWeights(); syncSliders(); requestSolve();
}
function rebuildMarkLabels(){
  var host = document.getElementById('marks'), i, d;
  if(!host) return;
  host.innerHTML = '';
  markEls = [];
  for(i=0;i<S.items.length;i++){
    d = document.createElement('div');
    d.className = 'mark p';
    host.appendChild(d);
    markEls.push(d);
  }
  syncMarkNames();
}
function syncMarkNames(){
  var sI = selIndex(), i, it;
  for(i=0;i<markEls.length;i++){
    it = S.items[i];
    if(!it) continue;
    markEls[i].textContent = (i === sI) ? (it.name + ' · ' + fmt(it.w,0) + ' kg') : it.name;
    markEls[i].className = 'mark p' + (i === sI ? ' sel' : '');
  }
}
var ADDS = [['Pessoa',75],['Motor',60],['Combustível',40],['Carga',20]];
function syncAddChips(){
  var box = document.getElementById('addChips');
  box.innerHTML = ADDS.map(function(a, k){
    return '<button type="button" class="chip" data-k="' + k + '">' + a[0] + ' ' + a[1] + ' kg</button>';
  }).join('') + '<button type="button" class="chip" data-k="-1">+ peso</button>';
  Array.prototype.forEach.call(box.querySelectorAll('.chip'), function(btn){
    btn.addEventListener('click', function(){
      var k = +btn.getAttribute('data-k');
      if(k < 0) addItem('Peso', 25); else addItem(ADDS[k][0], ADDS[k][1]);
    });
  });
}
(function(){
  var body = document.getElementById('wtBody');
  body.addEventListener('click', function(e){
    var tr = e.target.closest ? e.target.closest('tr') : null;
    if(!tr) return;
    if(e.target.getAttribute && e.target.getAttribute('data-x')){
      removeItem(+tr.getAttribute('data-i'));
      return;
    }
    setSel(+tr.getAttribute('data-i'));
  });
  body.addEventListener('focusin', function(e){
    var tr = e.target.closest ? e.target.closest('tr') : null;
    if(tr) setSel(+tr.getAttribute('data-i'));
  });
  body.addEventListener('input', function(e){
    var el = e.target, tr = el.closest ? el.closest('tr') : null;
    if(!tr || !el.getAttribute) return;
    var k = el.getAttribute('data-k');
    if(!k) return;
    var it = S.items[+tr.getAttribute('data-i')];
    if(!it) return;
    if(k === 'name'){
      it.name = el.value.slice(0, 26);
      syncSelBar(); syncMarkNames(); draw();
      return;
    }
    var v = parseFloat(String(el.value).replace(',', '.'));
    if(!isFinite(v)) return;
    if(k === 'w') it.w = Math.max(it.base ? 1 : 0, v);
    else {
      var ax = { x:0, y:1, z:2 }[k], sl = document.getElementById({x:'cgX',y:'cgY',z:'cgZ'}[k]);
      it.p[ax] = Math.max(+sl.min, Math.min(+sl.max, v*1000));   /* celula em metro */
    }
    syncSliders(); requestSolve();
  });
})();

/* Sliders sempre apontados para a linha escolhida. */
function syncSliders(){
  var it = selItem();
  if(!it) return;
  document.getElementById('cgX').value = it.p[0];
  document.getElementById('cgY').value = it.p[1];
  document.getElementById('cgZ').value = it.p[2];
  document.getElementById('cgXn').value = (it.p[0]/1000).toFixed(3);
  document.getElementById('cgYn').value = (it.p[1]/1000).toFixed(3);
  document.getElementById('cgZn').value = (it.p[2]/1000).toFixed(3);
  document.getElementById('pw').value = it.w;
  document.getElementById('pwn').value = Math.round(it.w);
  syncSelBar();
}
function syncWeightRange(){
  var wmax = Math.max(20, Math.floor(SEC.Vtot*1e-9*rho()));
  var a = document.getElementById('pw'), b = document.getElementById('pwn');
  a.min = b.min = 0; a.max = b.max = wmax; a.step = b.step = wmax > 4000 ? 5 : 1;
  var i;
  for(i=0;i<S.items.length;i++)
    S.items[i].w = Math.max(i === 0 ? 1 : 0, Math.min(wmax, S.items[i].w));
}
/* sc = quanto vale, no motor, uma unidade do campo: 1000 para os campos em metro,
   1 para o campo de massa em quilo. */
function bindPair(slider, num, get, set, sc, dec){
  var a = document.getElementById(slider), b = document.getElementById(num);
  sc = sc || 1; dec = dec || 0;
  function show(){ a.value = get(); b.value = (get()/sc).toFixed(dec); }
  function upd(v){ set(v); show(); requestSolve(); }
  a.addEventListener('input', function(){ upd(+a.value); });
  b.addEventListener('change', function(){
    var v = parseFloat(String(b.value).replace(',', '.'));
    if(isFinite(v)) upd(Math.max(+a.min, Math.min(+a.max, v*sc)));
    else show();
  });
}

/* Numero para copiar: virgula decimal, mas SEM separador de milhar - um "2.258"
   colado numa planilha de outra localidade viraria 2,258. */
function nc(v, d){
  if(!isFinite(v)) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits:d, maximumFractionDigits:d,
                                     useGrouping:false });
}
function m3c(v){ return nc(v/1000, 3); }

/* ------------------------------------------------------- copiar condição ----
   A condição de carga em texto, com tabulação entre as colunas: cola em planilha
   como colunas, em documento como tabela, e num e-mail como texto legível. Sai
   tudo em metro e quilo, com vírgula decimal, igual à tela. */
function condText(){
  var L = [], st = EQ.st, th = EQ.th, ps = EQ.ps;
  var iMid = Math.round(SEC.N/2);
  function ln(){ L.push(Array.prototype.slice.call(arguments).join('\t')); }
  L.push('Pesos e centros · ' + nc((SEC.x1 - SEC.x0)/1000, 3) + ' m de comprimento · ' +
         WATER[S.water].nome.toLowerCase() + ' ' + rho() + ' kg/m³');
  L.push('');
  ln('Item', 'Peso (kg)', 'x (m)', 'y (m)', 'z (m)');
  for(var i=0;i<S.items.length;i++){
    var it = S.items[i];
    ln(it.name, nc(it.w,0), m3c(it.p[0]), m3c(it.p[1]), m3c(it.p[2]));
  }
  ln('Total · CG', nc(totalW(),0), m3c(GT[0]), m3c(GT[1]), m3c(GT[2]));
  ln('Centro de carena B', '', m3c(st.B[0]), m3c(st.B[1]), m3c(st.B[2]));
  L.push('');
  ln('Equilíbrio');
  ln('Deslocamento (kg)', nc(st.V*1e-9*rho(), 0));
  ln('Volume deslocado (m³)', nc(st.V*1e-9, 3));
  ln('Trim (°)', nc(th*DEG, 2), trimWords(th));
  ln('Banda (°)', nc(ps*DEG, 2), heelWords(ps));
  ln('Calado a ré (m)', m3c(zWater(SEC.x0, 0, EQ.d, th, ps) - SEC.zk[0]));
  ln('Calado a meia-nau (m)', m3c(zWater(SEC.xs[iMid], 0, EQ.d, th, ps) - SEC.zk[iMid]));
  ln('Imersão máxima (m)', m3c(EXT.deep));
  ln('Borda livre mínima (m)', m3c(EXT.fb));
  L.push('');
  ln('Estabilidade');
  ln('GMt transversal (m)', m3c(UPR.GMT));
  ln('GMl longitudinal (m)', m3c(UPR.GML));
  ln('KB (m)', m3c(UPR.KB));
  ln('BMt (m)', m3c(UPR.BMT));
  ln('Momento para 1° de banda (kgf·m)',
     nc(Math.abs(st.V*1e-9*rho()*EQ.stiffT/1000*Math.sin(RAD)), 1));
  ln('Área do plano d’água (m²)', nc(st.Awp*1e-6, 3));
  ln('Compr. na linha d’água (m)', nc(st.Lwl/1000, 2));
  ln('Boca na linha d’água (m)', nc(st.Bwl/1000, 2));
  return L.join('\n');
}
/* Duas rotas: a API de área de transferência, quando o navegador a libera, e o
   textarea com execCommand, que continua funcionando em página aberta de arquivo
   local - que é como este painel normalmente roda. */
function putClipboard(txt){
  var ta, ok = false;
  try {
    ta = document.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, txt.length);
    ok = document.execCommand('copy');
    document.body.removeChild(ta);
  } catch(e){ ok = false; }
  return ok;
}
document.getElementById('btnCopy').addEventListener('click', function(){
  if(!EQ) return;
  var txt = condText(), btn = this, aviso = document.getElementById('warnLine');
  function feito(){
    btn.textContent = 'copiado ✓';
    setTimeout(function(){ btn.textContent = 'Copiar condição'; }, 1800);
    aviso.textContent = 'condição de carga copiada — ' + txt.split('\n').length +
                        ' linhas, colunas separadas por tabulação';
  }
  function falhou(){
    aviso.textContent = 'o navegador não liberou a área de transferência; o texto saiu no console';
    try { console.log(txt); } catch(e){}
  }
  if(putClipboard(txt)){ feito(); return; }
  if(navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(txt).then(feito, falhou);
  else falhou();
});

document.getElementById('fit').addEventListener('click', function(){ fitView(); draw(); });
/* Volta a condicao de partida: a tabela como estava ao carregar o casco - barco
   mais um peso, pousado sobre o CG do barco, que e a unica posicao em que ele nao
   mexe no CG do conjunto e por isso a unica que garante prumo. */
document.getElementById('btnLevel').addEventListener('click', function(){
  if(!REF) return;
  S.items = REF.items.map(function(it){
    return { name:it.name, w:it.w, p:it.p.slice(), base:it.base };
  });
  S.sel = REF.sel;
  seed = { th:0, ps:0, d:REF.d };
  renderWeights(); syncSliders(); requestSolve();
  document.getElementById('warnLine').textContent =
    'tabela de partida: barco e um peso sobre o CG do barco';
});
document.getElementById('secX').addEventListener('input', function(e){
  MSEC = (+e.target.value)/100;
  drawSection();
});

/* ------------------------------------------------------------- construção */
function loadParsed(p){
  parsed = p;
  hull = makeHull(p);
  CUT.on = true; CUT.rake = 0; CUT.pos = hull.stations[0];
  cutSync(hull);
  buildSections(hull, NSEC, NP);

  LOA_M = xLen(hull)/1000;
  BEAM_M = 2*SEC.yMax/1000;
  DEPTH_M = (SEC.zTop - SEC.zBot)/1000;
  MID = [ (SEC.x0 + SEC.x1)/2000, 0, (SEC.zBot + SEC.zTop)/2000 ];

  /* Ponto de partida: o CG do conjunto EM CIMA do CB. O calado inicial é 41% do
     pontal; o deslocamento é o que aquele calado carrega; o CG do barco vazio é
     assumido no centro de carena correspondente e o primeiro peso é pousado ali
     mesmo - então o casco parte a prumo, sem trim nem banda, e qualquer
     inclinação que apareça depois é resultado do que você mexeu. */
  var T0 = (CALADO_INICIAL !== null && isFinite(CALADO_INICIAL))
         ? Math.max(SEC.zBot + 1, Math.min(SEC.zTop, CALADO_INICIAL))
         : SEC.zBot + 0.41*(SEC.zTop - SEC.zBot);
  var lvl = floatState(0, 0, T0, true);
  var disp = lvl.V*1e-9*rho();
  var g0 = [Math.round(lvl.B[0]), 0, Math.round(lvl.B[2])];
  var w1 = Math.max(0, Math.min(75, disp - 1));
  S.items = [ { name:'Barco', w:Math.max(1, Math.round(disp - w1)), p:g0.slice(), base:true },
              { name:'Pessoa', w:w1, p:g0.slice() } ];
  S.sel = 1;
  REF = { items:S.items.map(function(it){
            return { name:it.name, w:it.w, p:it.p.slice(), base:it.base }; }),
          sel:1, d:T0 };
  seed = { th:0, ps:0, d:T0 };

  /* Extremos em multiplos do passo: com min fora da grade, um valor digitado
     redondo (y = 600) apareceria no slider como 602. */
  var q5 = function(v){ return Math.round(v/5)*5; };
  var ax = document.getElementById('cgX');
  ax.min = q5(SEC.x0); ax.max = q5(SEC.x1);
  var ay = document.getElementById('cgY');
  ay.min = -q5(SEC.yMax); ay.max = q5(SEC.yMax);
  var az = document.getElementById('cgZ');
  az.min = q5(SEC.zBot); az.max = q5(SEC.zBot + (SEC.zTop-SEC.zBot)*1.9);
  ['cgXn','cgYn','cgZn'].forEach(function(id, k){
    var src = [ax, ay, az][k], el = document.getElementById(id);
    el.min = src.min; el.max = src.max;
  });
  syncWeightRange();
  updateCG();
  renderWeights();
  syncSliders();

  MSEC = 0.5;
  document.getElementById('secX').value = 50;
  document.getElementById('warnLine').textContent =
    (p.warn && p.warn.length) ? (p.warn.length + ' aviso' + (p.warn.length>1?'s':'') + ': ' + p.warn[0]) : '';

  rebuildGL();
  GZ = null;
  solveNow();
  fitView();
  draw();
}

function applyText(txt, okMsg){
  var msg = document.getElementById('msg');
  try {
    var p = parseOffsets(txt);
    loadParsed(p);
    msg.className = 'msg ok';
    msg.textContent = (okMsg || 'Casco reconstruído') + ': ' + p.rows.length + ' balizas, baliza ' +
      (p.mode === 'redondo' ? 'redonda' : 'quinada') +
      (p.warn.length ? ' — ' + p.warn.length + ' aviso(s): ' + p.warn.join('; ') : '.');
  } catch(err){
    msg.className = 'msg err';
    msg.textContent = 'Não consegui ler essa tabela — ' + err.message;
  }
}
document.getElementById('apply').addEventListener('click', function(){
  applyText(document.getElementById('tsv').value);
});
document.getElementById('revert').addEventListener('click', function(){
  document.getElementById('tsv').value = USER_TSV;
  applyText(USER_TSV, 'De volta à sua tabela');
});
document.getElementById('__DEMO_ID__').addEventListener('click', function(){
  document.getElementById('tsv').value = __DEMO_TSV__;
  applyText(__DEMO_TSV__, 'Exemplo __DEMO_MSG__ carregado');
});

var lastW = 0;
function onResize(){
  var w = canvas ? canvas.getBoundingClientRect().width : 0;
  if(canvas && Math.abs(w - lastW) > 0.5){ lastW = w; fitView(); draw(); }
  drawSection(); drawProfile(); if(GZ) drawGZ();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', function(){ setTimeout(onResize, 260); });
if(window.ResizeObserver && canvas){ try{ new ResizeObserver(onResize).observe(canvas); }catch(e){} }

/* ------------------------------------------------------------------ início */
readColors();
syncViewChips(); syncWater(); syncAddChips();
bindToggle('tSurf','surf'); bindToggle('tDeck','deck'); bindToggle('tStn','stn');
bindToggle('tSea','sea'); bindToggle('tGrid','grid'); bindToggle('tWl','wl');
bindToggle('tMark','mark'); bindToggle('tMesh','mesh');
/* Os tres campos de posicao falam metro (sc = 1000); o de massa, quilo. */
function bindItem(slider, num, k){
  bindPair(slider, num,
    function(){ var it = selItem(); return it ? (k < 3 ? it.p[k] : it.w) : 0; },
    function(v){
      var it = selItem();
      if(!it) return;
      if(k < 3) it.p[k] = v; else it.w = Math.max(it.base ? 1 : 0, v);
      syncRowCells(); syncSelBar(); syncMarkNames();
    },
    k < 3 ? 1000 : 1, k < 3 ? 3 : 0);
}
bindItem('cgX','cgXn', 0);
bindItem('cgY','cgYn', 1);
bindItem('cgZ','cgZn', 2);
bindItem('pw','pwn', 3);
document.getElementById('tsv').value = USER_TSV;
loadParsed(parseOffsets(USER_TSV));
setView('proa');
if(canvas){
  lastW = canvas.getBoundingClientRect().width;
  loop();
  requestAnimationFrame(function(){ fitView(); draw(); });
} else {
  loop();
}

window.__PESOS3D__ = {
  get hull(){ return hull; }, get eq(){ return EQ; }, get upright(){ return UPR; },
  get gz(){ return GZ; }, get state(){ return S; }, get sec(){ return SEC; },
  get cg(){ return GT; }, get ref(){ return REF; }, get items(){ return S.items; },
  addItem: addItem, removeItem: removeItem, setSel: setSel,
  cam: cam, ui: ui, setView: setView, draw: draw, fitView: fitView,
  solve: solveNow, applyText: applyText, gl: gl, render: render
};
})();
