// Superficie unica de um casco, e a malha do plano de linhas tirada dela.
//
// POR QUE ESTE MODULO EXISTE.  A primeira versao construia cada familia de curvas com uma
// interpolacao propria: as linhas d agua eram uma cubica monotona passando pelos nos das
// balizas da tabela; a quilha e a borda, outra; e as secoes do plano de balizas saiam da
// interpolacao dos PARAMETROS da secao. Nos pontos tabelados as tres concordam, mas ENTRE
// balizas nao: medido, dava ate 42 mm de diferenca de meia-boca (2,8 mm de papel a 1:15) e
// 8 mm de diferenca de altura de quilha. Ou seja, a tabela de cotas e o plano de balizas
// descreviam cascos diferentes.
//
// Aqui existe UMA superficie: o folheado que passa pelas balizas da tabela. Quando o
// arquivo declara a posicao e a inclinacao do plano do espelho, a baliza do espelho e
// assentada nesse plano, o que no vao de re equivale a cisalhar o x em funcao da altura:
//
//     x_real(t, z) = t + delta(z) * (1 - t/x1)      para t entre x0 e x1
//     x_real(t, z) = t                              para t >= x1
//
// com t = abscissa da TABELA, x1 = abscissa da segunda baliza e delta(z) = x do plano do
// espelho naquela altura. Quando o arquivo NAO declara plano nenhum, o espelho e a face
// vertical da primeira baliza e x_real(t, z) = t. Nos dois casos todas as curvas do desenho
// e todos os numeros da tabela de cotas saem da mesma superficie - por isso concordam.
//
//   const S = require('./superficie.js').montar('casco.txt');
'use strict';
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, 'casco-core.js'));

/* ------------------------------------------------------------------ leitura -- */
/* Aceita dois tipos de fonte: um .html que embute a tabela numa variavel de bootstrap
   (os visualizadores 3D que geramos) ou um arquivo de texto com a tabela crua. */
function lerFonte(arquivo) {
  const src = fs.readFileSync(arquivo, 'utf8');
  if (/\.html?$/i.test(arquivo)) {
    const boot = (src.match(/loadParsed\(parseOffsets\(([A-Z_]+)\)\)/) || [])[1];
    if (!boot) throw new Error('nao achei a tabela embutida em ' + arquivo);
    const bloco = src.match(new RegExp('var ' + boot + ' = \\[([\\s\\S]*?)\\]\\.join'))[1];
    return [...bloco.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
      .map(x => x[1].replace(/\\t/g, '\t').replace(/\\n/g, '\n')).join('\n');
  }
  return src;
}
/* Plano do espelho, se a tabela declarar. Duas formas:

     # espelho: 12 graus da vertical
     # espelho: de x 159,4 z 34,7 a x 0 z 784,7

   e a forma do cabecalho de exportacao do Rhino, que o Traquino usa (faixas X/Z do
   contorno mais as transformacoes para a abscissa e a altura da tabela).
   Na forma em GRAUS o TOPO do espelho fica ancorado no x da primeira baliza da tabela e o
   pe avanca para vante - a mesma convencao que o plano declarado do Traquino tem, e a que
   preserva o LOA que a tabela declara. Angulo negativo inclina ao contrario (espelho
   invertido, pe a re do topo).
   O cabecalho do Traquino MISTURA convencoes decimais ("-203,7" e "+ 422.0"): usar o leitor
   do nucleo, que decide por token, em vez de assumir uma das duas. */
function lerEspelho(tsv, T0, zk0, zs0) {
  const num = t => C.paraNumero(t, null);
  const mDois = tsv.match(/espelho\s*:\s*de\s*x\s*(-?[\d.,]+)\s*z\s*(-?[\d.,]+)\s*a\s*x\s*(-?[\d.,]+)\s*z\s*(-?[\d.,]+)/i);
  if (mDois) {
    const P = [{ x: num(mDois[1]), z: num(mDois[2]) }, { x: num(mDois[3]), z: num(mDois[4]) }];
    P.sort((a, b) => a.z - b.z);
    return { baixo: P[0], alto: P[1], origem: 'plano declarado ponto a ponto' };
  }
  const mAng = tsv.match(/espelho\s*:\s*(-?[\d.,]+)\s*graus?\s*(?:da\s*)?vertical/i);
  if (mAng) {
    const ang = num(mAng[1]) * Math.PI / 180;
    const dx = (zs0 - zk0) * Math.tan(ang);
    return {
      alto: { x: T0, z: zs0 },
      baixo: { x: T0 + dx, z: zk0 },
      origem: 'inclinacao declarada, topo ancorado em x = ' + T0
    };
  }
  const mX = tsv.match(/X de\s*(-?[\d.,]+)\s*a\s*(-?[\d.,]+)/i);
  const mZ = tsv.match(/Z de\s*(-?[\d.,]+)\s*a\s*(-?[\d.,]+)/i);
  const mDx = tsv.match(/x_tabela\s*=\s*X_rhino\s*\+\s*([\d.,]+)/i);
  const mDz = tsv.match(/altura_tabela\s*=\s*Z_rhino\s*\+\s*([\d.,]+)/i);
  if (!mX || !mZ || !mDx || !mDz) return null;
  const dX = num(mDx[1]), dZ = num(mDz[1]);
  const eX = [num(mX[1]) + dX, num(mX[2]) + dX];
  const eZ = [num(mZ[1]) + dZ, num(mZ[2]) + dZ];
  return {
    baixo: { x: Math.max(eX[0], eX[1]), z: Math.min(eZ[0], eZ[1]) },
    alto: { x: Math.min(eX[0], eX[1]), z: Math.max(eZ[0], eZ[1]) },
    origem: 'faixas do contorno no cabecalho de exportacao'
  };
}

function montar(arquivo) {
  const tsv = lerFonte(arquivo);
  const parsed = C.parseOffsets(tsv);
  const hull = C.makeHull(parsed);
  const T0 = parsed.rows[0].x, T1 = parsed.rows[1].x, TMAX = T0 + hull.LOA;

  /* ------------------------------------------------------- a superficie ------ */
  const NP = 600;                            // densidade da polilinha de secao
  const cache = new Map();
  function sec(t) {                          // secao da tabela em t, com cache
    const key = Math.round(Math.max(T0, Math.min(TMAX, t)) * 100);
    let p = cache.get(key);
    if (!p) {
      const s = hull.section(key / 100);
      p = { s: s, poly: C.halfPoly(s, NP), zk: s.zk, zs: s.zs, ys: s.ys };
      cache.set(key, p);
    }
    return p;
  }
  const zk0 = sec(T0).zk, zs0 = sec(T0).zs;

  const plano = lerEspelho(tsv, T0, zk0, zs0);
  const inclinado = !!plano;
  /* Sem plano declarado, o espelho e a face vertical da primeira baliza. */
  const espBaixo = inclinado ? plano.baixo : { x: T0, z: zk0 };
  const espAlto = inclinado ? plano.alto : { x: T0, z: zs0 };
  const inclin = inclinado ? (espBaixo.x - espAlto.x) / (espAlto.z - espBaixo.z) : 0;
  const xT = z => inclinado ? espAlto.x + (espAlto.z - z) * inclin : T0;
  const rakeGraus = Math.atan(inclin) * 180 / Math.PI;

  /* x do plano do espelho na altura z; fora da faixa dele, congela nas pontas */
  const delta = z => xT(Math.max(zk0, Math.min(zs0, z)));
  const xReal = inclinado
    ? (t, z) => t >= T1 ? t : t + delta(z) * (1 - t / T1)
    : (t) => t;
  /* inverso: qual t da tabela cai no plano vertical x = X, na altura z */
  const tDe = inclinado
    ? (X, z) => {
        if (X >= T1) return X;
        const d = delta(z), den = 1 - d / T1;
        return den <= 1e-9 ? null : (X - d) / den;
      }
    : (X) => X;
  /* Meia-boca da secao na altura z, avaliada na FORMA da secao, nao interpolada na
     polilinha dela.
     Isto era um bug: num bojo redondo que casa com super-elipse, y ~ u^(1/p) chega a quilha
     com declividade infinita. Lendo a polilinha uniforme em altura, a primeira corda
     atravessa dezenas de milimetros de meia-boca quase na horizontal, e uma linha d agua
     que passe rente a quilha era subestimada em ate 27 mm - a tabela de cotas discordava do
     desenho nessa medida. Aqui a avaliacao espelha exatamente o que halfPoly faz, mas num u
     qualquer em vez de numa grade. */
  function yNaForma(p, z) {
    const s = p.s, span = s.zs - s.zk;
    if (span <= 1e-12) return Math.max(0, s.ys);
    const u = Math.min(1, Math.max(0, (z - s.zk) / span));
    if (s.mode === 'quinado') {                       /* linear entre os vertices dos paineis */
      for (let i = 0; i < s.U.length - 1; i++)
        if (u >= s.U[i] - 1e-12 && u <= s.U[i + 1] + 1e-12) {
          const t = (u - s.U[i]) / Math.max(1e-12, s.U[i + 1] - s.U[i]);
          return s.Y[i] + (s.Y[i + 1] - s.Y[i]) * t;
        }
      return s.Y[s.Y.length - 1];
    }
    if (s.ys < 1e-6) return 0;                        /* baliza colapsada na roda */
    if (s.superFits) return s.ys * C.superY(u, s.p);
    if (p.inv === undefined) {                        /* ramo monotono: U(y), invertido */
      let mono = true;
      for (let i = 1; i < s.Y.length; i++) if (s.Y[i] <= s.Y[i - 1] + 1e-9) mono = false;
      p.inv = mono ? C.pchip(s.Y, s.U) : null;
      p.dir = mono ? null : C.pchip(s.U, s.Y);
    }
    if (!p.inv) return Math.max(0, p.dir(u));
    let lo = 0, hi = s.ys;
    for (let i = 0; i < 44; i++) { const m = (lo + hi) / 2; if (p.inv(m) < u) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  /* Inversa: fracao de altura u em que a secao tem a meia-boca y. Serve para amostrar a
     polilinha de desenho de forma UNIFORME EM MEIA-BOCA perto da quilha, onde uniforme em
     altura nao serve: a primeira corda de uma super-elipse amostrada em alturas iguais
     atravessa 47 mm de meia-boca em 0,3 mm de altura, e nem reamostrar por arco recupera a
     curva dentro dessa corda. */
  function uDeY(p, y) {
    const s = p.s;
    if (s.ys < 1e-6) return null;
    const r = Math.min(1, Math.max(0, y / s.ys));
    if (s.mode === 'quinado') {
      for (let i = 0; i < s.Y.length - 1; i++)
        if (y >= s.Y[i] - 1e-9 && y <= s.Y[i + 1] + 1e-9) {
          const t = (y - s.Y[i]) / Math.max(1e-12, s.Y[i + 1] - s.Y[i]);
          return s.U[i] + (s.U[i + 1] - s.U[i]) * t;
        }
      return 1;
    }
    if (s.superFits) return 1 - Math.pow(Math.max(0, 1 - Math.pow(r, s.p)), 1 / s.p);
    yNaForma(p, s.zk);                                  /* garante p.inv / p.dir montados */
    if (p.inv) return Math.min(1, Math.max(0, p.inv(y)));
    let lo = 0, hi = 1;
    for (let i = 0; i < 44; i++) {
      const m = (lo + hi) / 2;
      if (yNaForma(p, s.zk + (s.zs - s.zk) * m) < y) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }
  /* Polilinha da secao para DESENHO, amostrada na forma: uniforme em altura (que serve para
     o costado quase vertical) mais uniforme em meia-boca (que serve para o fundo quase
     horizontal), mais os vertices tabelados. */
  function polyForma(p, n) {
    const s = p.s, span = s.zs - s.zk;
    const m = Math.max(40, Math.round((n || 400) / 2));
    const us = [];
    for (let i = 0; i <= m; i++) us.push(i / m);
    if (s.ys > 1e-6) for (let j = 1; j < m; j++) {
      const u = uDeY(p, s.ys * j / m);
      if (u !== null && isFinite(u)) us.push(u);
    }
    if (s.U) s.U.forEach(u => us.push(u));
    us.sort((a, b) => a - b);
    const out = [];
    let ant = -1;
    us.forEach(u => {
      if (u - ant < 1e-9) return;
      ant = u;
      const z = s.zk + span * u;
      out.push([Math.max(0, yNaForma(p, z)), z]);
    });
    return out;
  }
  /* meia-boca da superficie no plano vertical x = X, na altura z */
  function yEm(X, z) {
    const t = tDe(X, z);
    if (t === null || t < T0 - 1e-9 || t > TMAX + 1e-9) return null;
    const p = sec(t);
    if (z < p.zk - 1e-9 || z > p.zs + 1e-9) return null;
    return Math.max(0, yNaForma(p, z));
  }
  const xPopa = xReal(T0, zs0);              // ponto mais a re do casco
  const xProa = TMAX;                        // roda de proa

  /* --------------------------------------------- curvas em funcao de t ------- */
  function bisT(ok, ta, tb) {                // bisseccao entre um t que satisfaz e um que nao
    let lo = ta, hi = tb;
    for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    return lo;
  }
  const emT = (n, f) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const p = f(T0 + (TMAX - T0) * i / n); if (p) out.push(p); }
    return out;
  };
  const quilha = n => emT(n || 400, t => { const p = sec(t); return [xReal(t, p.zk), p.zk]; });
  const borda = n => emT(n || 400, t => { const p = sec(t); return [xReal(t, p.zs), p.zs]; });
  const bordaTopo = n => emT(n || 400, t => { const p = sec(t); return [xReal(t, p.zs), p.ys]; });
  /* Curva do chine, so nos cascos quinados: e a aresta entre o fundo e o costado, e num
     plano de linhas de casco quinado ela e uma das linhas principais.
     O objeto de secao do nucleo NAO carrega zc/yc: ele codifica o chine como o vertice do
     meio da polilinha, em U[1] (fracao da altura entre quilha e borda) e Y[1]. */
  const temChine = parsed.mode === 'quinado';
  function chinePonto(t) {
    const p = sec(t), s = p.s;
    if (!s.U || s.U.length < 3) return null;
    return { z: s.zk + (s.zs - s.zk) * s.U[1], y: s.Y[1] };
  }
  /* Ponto do chine no plano vertical x = X. Fora do vao de re e o chine da propria baliza
     da tabela; dentro do vao a curva do chine desliza com a altura, e o plano a corta num t
     que se acha por bisseccao. Sem isso a baliza 0 sairia com o vertice do chine arredondado
     e a tabela de cotas discordaria do desenho. */
  function chineEm(X) {
    if (!temChine) return null;
    if (!inclinado || X >= T1) return chinePonto(X);
    const f = t => { const c = chinePonto(t); return c ? xReal(t, c.z) - X : NaN; };
    if (!(f(T0) <= 0) || !(f(T1) >= 0)) return null;
    let lo = T0, hi = T1;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) <= 0) lo = m; else hi = m; }
    return chinePonto((lo + hi) / 2);
  }
  const chine = n => temChine
    ? emT(n || 400, t => { const c = chinePonto(t); return c ? [xReal(t, c.z), c.z] : null; }) : [];
  const chineTopo = n => temChine
    ? emT(n || 400, t => { const c = chinePonto(t); return c ? [xReal(t, c.z), c.y] : null; }) : [];

  /* Achatamento adaptativo de uma curva y(z): subdivide cada intervalo enquanto a corda
     se afastar da curva mais que a tolerancia. Serve onde nao existe forma fechada - no vao
     de re, em que a leitura da tabela desliza com a altura - e e o que impede o fundo de
     sair facetado ali: amostrado em alturas iguais, um bojo redondo dava cordas de 80 mm de
     meia-boca junto a quilha. */
  function achata(z0, z1, f, tol, prof) {
    const t = tol || 0.02, pmax = prof || 20, SEM = 48, out = [];
    const y0 = f(z0);
    if (y0 === null) return [];
    out.push([y0, z0]);
    /* Testar SO o ponto medio engana: num trecho com quebra de declividade o medio pode
       cair sobre a corda enquanto a curva se afasta em outro lugar, e a recursao para cedo.
       Por isso a faixa e primeiro dividida em SEM pedacos iguais, e o refinamento adaptativo
       corre dentro de cada um. */
    const rec = (a, b, ya, yb, d) => {
      const m = (a + b) / 2, ym = f(m);
      if (ym === null || d >= pmax || Math.abs(ym - (ya + yb) / 2) <= t) { out.push([yb, b]); return; }
      rec(a, m, ya, ym, d + 1);
      rec(m, b, ym, yb, d + 1);
    };
    let za = z0, ya = y0;
    for (let i = 1; i <= SEM; i++) {
      const zb = z0 + (z1 - z0) * i / SEM, yb = f(zb);
      if (yb === null) break;
      rec(za, zb, ya, yb, 0);
      za = zb; ya = yb;
    }
    return out;
  }

  /* Reamostra uma polilinha por comprimento de arco. A polilinha do nucleo e uniforme em
     ALTURA, e num fundo chato isso deixa a primeira corda atravessando dezenas de
     milimetros de meia-boca quase na horizontal (medido: erro de corda de 0,3 mm reais,
     invisivel no papel, mas segmentos 44x mais longos que a mediana). */
  function porArco(pts, n) {
    if (pts.length < 2) return pts;
    const acc = [0];
    for (let i = 1; i < pts.length; i++)
      acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = acc[acc.length - 1];
    if (!(L > 0)) return pts;
    const out = [];
    let j = 0;
    for (let i = 0; i <= n; i++) {
      const alvo = L * i / n;
      while (j < acc.length - 2 && acc[j + 1] < alvo) j++;
      const t = (alvo - acc[j]) / Math.max(1e-12, acc[j + 1] - acc[j]);
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t,
                pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t]);
    }
    return out;
  }

  /* Linha d agua na altura z, e plano do alto a yb do CL.
     Os dois devolvem uma LISTA DE TRECHOS, nao uma curva unica: uma linha d agua alta pode
     existir em dois pedacos separados, um junto ao espelho e outro da meia-nau para a proa,
     porque no meio do casco a borda desce abaixo daquela altura. Desenhar os dois pedacos
     como uma polilinha so criava um traco reto costurando o vao - que aparecia atravessando
     a borda no TOPO. Cada trecho tem as pontas fechadas por bisseccao em t: elas caem na
     quilha (meia-boca zero), na borda (topo do costado) ou no proprio espelho. */
  /* Achatamento adaptativo de uma curva parametrica: subdivide enquanto o ponto medio se
     afastar da corda mais que a tolerancia. Amostrar t uniformemente nao serve nas pontas
     das linhas d agua, onde elas encontram a quilha ou a roda e a meia-boca desaba. */
  function achataPar(t0, t1, ponto, tol, prof) {
    const tl = tol || 0.02, pmax = prof || 20, out = [];
    const p0 = ponto(t0), p1 = ponto(t1);
    if (!p0 || !p1) return [];
    out.push(p0);
    (function rec(a, b, pa, pb, d) {
      const m = (a + b) / 2, pm = ponto(m);
      if (!pm || d >= pmax) { out.push(pb); return; }
      const vx = pb[0] - pa[0], vy = pb[1] - pa[1], L2 = vx * vx + vy * vy;
      let u = L2 > 0 ? ((pm[0] - pa[0]) * vx + (pm[1] - pa[1]) * vy) / L2 : 0;
      u = Math.max(0, Math.min(1, u));
      if (Math.hypot(pm[0] - (pa[0] + u * vx), pm[1] - (pa[1] + u * vy)) <= tl) { out.push(pb); return; }
      rec(a, m, pa, pm, d + 1);
      rec(m, b, pm, pb, d + 1);
    })(t0, t1, p0, p1, 0);
    return out;
  }
  /* Acha os intervalos de t em que a curva existe (varredura grossa mais bisseccao nas
     bordas) e achata cada um deles. Devolve uma LISTA DE TRECHOS: uma linha d agua alta
     pode existir em dois pedacos separados, um junto ao espelho e outro da meia-nau para a
     proa, porque no meio do casco a borda desce abaixo daquela altura. Desenhar os dois como
     uma polilinha so criava um traco reto costurando o vao. */
  function trechos(n, valido, ponto) {
    const primeira = (ti, tv) => { let lo = ti, hi = tv; for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (valido(m)) hi = m; else lo = m; } return hi; };
    const ultima = (tv, ti) => { let lo = tv, hi = ti; for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (valido(m)) lo = m; else hi = m; } return lo; };
    const ivs = [];
    let ini = null, ant = false, tAnt = T0;
    for (let i = 0; i <= n; i++) {
      const t = T0 + (TMAX - T0) * i / n, v = valido(t);
      if (v && !ant) ini = (i === 0) ? t : primeira(tAnt, t);
      else if (!v && ant) { if (ini !== null) ivs.push([ini, ultima(tAnt, t)]); ini = null; }
      ant = v; tAnt = t;
    }
    if (ant && ini !== null) ivs.push([ini, TMAX]);
    const out = [];
    ivs.forEach(iv => {
      if (iv[1] - iv[0] < 1e-9) return;
      const pts = achataPar(iv[0], iv[1], ponto);
      if (pts.length >= 2) out.push(pts);
    });
    return out;
  }
  function linhaAgua(z, n) {
    const val = t => { const p = sec(t); return z >= p.zk - 1e-9 && z <= p.zs + 1e-9; };
    return trechos(n || 400, val, t =>
      [xReal(t, z), Math.max(0, yNaForma(sec(t), z))]);
  }
  function planoAlto(yb, n) {
    /* A altura sai da inversa analitica da forma, nao de zAtY na polilinha: perto da quilha
       a polilinha uniforme em altura tem cordas longuissimas em meia-boca, e um plano do
       alto rente ao fundo seria lido dezenas de milimetros fora de lugar. */
    const zDe = t => {
      const p = sec(t);
      if (p.ys < yb - 1e-9) return null;
      const u = uDeY(p, yb);
      return u === null ? null : p.zk + (p.zs - p.zk) * u;
    };
    return trechos(n || 400, t => zDe(t) !== null, t => {
      const z = zDe(t);
      return z === null ? null : [xReal(t, z), z];
    });
  }
  /* Secao no plano vertical x = X.
     Fora do vao de re o plano corta uma unica baliza da tabela, e a secao E a polilinha
     dela: caminho direto, sem reamostragem em altura. Dentro do vao a leitura da tabela
     desliza com a altura: sobe em z e fecha as pontas por bisseccao - a de baixo cai na
     quilha (y = 0) ou no plano do espelho (y > 0, quando o espelho trunca a baliza). */
  function secao(X, n) {
    if (!inclinado || X >= T1) {
      const p = sec(Math.max(T0, Math.min(TMAX, X)));
      /* Casco quinado: os paineis sao retos e a polilinha do nucleo ja preserva o vertice
         do chine - ela vai como esta.
         Bojo redondo: ACHATAMENTO ADAPTATIVO sobre a forma. Reamostrar por arco num numero
         fixo de pontos garante densidade, nao precisao: numa secao com quebras de
         declividade (tabela com muitos niveis, perfil quase poligonal) a corda cortava o
         canto em 4 mm, e a conferencia - com razao - reprovava o desenho. */
      if (temChine) return C.halfPoly(p.s, n || 320);
      if (p.s.ys < 1e-6) return [[0, p.zk], [0, p.zs]];
      /* Reamostra por arco - densidade constante, que e o que o desenho quer - e SO refina
         se a corda nao alcancar a tolerancia. Numa secao normal a primeira tentativa passa;
         numa com quebras de declividade (perfil quase poligonal) a corda cortava o canto em
         4 mm e a conferencia, com razao, reprovava. */
      const f = z => yNaForma(p, z);
      const span = p.zs - p.zk;
      let poly = null;
      for (let N = n || 320; N <= 2560; N *= 2) {
        poly = porArco(polyForma(p, 1600), N);
        let pior = 0;
        for (let i = 1; i < 240; i++) {
          const z = p.zk + span * i / 240, y = C.yAtZ(poly, z);
          if (y !== null) pior = Math.max(pior, Math.abs(y - f(z)));
        }
        if (pior <= 0.05) break;
      }
      return poly;
    }
    /* acha o intervalo de alturas em que o plano corta o casco */
    const N = 260, zTop = zBordaMax;
    let z0 = null, z1 = null, ant = false;
    for (let i = 0; i <= N; i++) {
      const z = zTop * i / N, v = yEm(X, z) !== null;
      if (v && !ant) {
        if (i === 0) z0 = z;
        else { let lo = zTop * (i - 1) / N, hi = z;
               for (let j = 0; j < 44; j++) { const m = (lo + hi) / 2; if (yEm(X, m) === null) lo = m; else hi = m; }
               z0 = hi; }
      } else if (!v && ant) {
        let lo = zTop * (i - 1) / N, hi = z;
        for (let j = 0; j < 44; j++) { const m = (lo + hi) / 2; if (yEm(X, m) === null) hi = m; else lo = m; }
        z1 = lo; break;
      }
      ant = v;
      if (i === N && v) z1 = z;
    }
    if (z0 === null || z1 === null || z1 <= z0) return [];
    const f = z => yEm(X, z);
    if (!temChine) return porArco(achata(z0, z1, f), n || 320);
    /* casco quinado: o vertice do chine entra como no exato, e cada painel e achatado a
       parte, para o canto nao ser cortado */
    const cE = chineEm(X);
    if (!cE || cE.z <= z0 + 1e-6 || cE.z >= z1 - 1e-6) return porArco(achata(z0, z1, f), n || 320);
    const baixo = achata(z0, cE.z, f).concat([[cE.y, cE.z]]);
    const alto = [[cE.y, cE.z]].concat(achata(cE.z, z1, f).slice(1));
    return porArco(baixo, 120).concat(porArco(alto, 120).slice(1));
  }
  /* Contorno do espelho: a primeira baliza, no plano dela. */
  const contornoEspelho = n => (temChine
      ? C.halfPoly(sec(T0).s, n || 100)
      : porArco(polyForma(sec(T0), 1600), n || 100))
    .map(q => ({ x: xT(q[1]), y: Math.max(0, q[0]), z: q[1] }));

  /* ================================================ a malha do plano ========= */
  const arred = (v, m) => Math.round(v / m) * m;

  /* 1. linha de base: z = 0, tangente ao ponto mais baixo da quilha */
  let minQuilha = Infinity, xMinQuilha = 0;
  quilha(2000).forEach(p => { if (p[1] < minQuilha) { minQuilha = p[1]; xMinQuilha = p[0]; } });
  var zBordaMax = 0;
  for (let i = 0; i <= 2000; i++) {
    const zs = sec(T0 + (TMAX - T0) * i / 2000).zs;
    if (zs > zBordaMax) zBordaMax = zs;
  }

  /* 2. DWL 300 mm acima da base.  3. Duas linhas d agua a mais entre a base e a DWL, em
     multiplos de 50 mm, sempre contadas a partir da DWL. */
  const DWL = 300;
  const espWL_exato = DWL / 3, espWL = arred(espWL_exato, 50);
  const wls = [];
  for (let j = Math.floor((0 - DWL) / espWL); DWL + j * espWL <= zBordaMax + 1e-9; j++) {
    const z = DWL + j * espWL;
    if (z >= -1e-9) wls.push(z);
  }

  /* 4. Baliza 0 na intersecao da DWL com o fundo do casco no CL, a popa. No CL o fundo a
     popa e a quilha ou, se o espelho cobrir aquela altura, o proprio plano do espelho: a
     ponta de re da linha d agua de projeto resolve os dois casos de uma vez. */
  const trDWL = linhaAgua(DWL, 800);
  const ptsDWL = [].concat.apply([], trDWL);
  if (!ptsDWL.length) throw new Error('a DWL de ' + DWL + ' mm nao corta o casco');
  const xBaliza0 = Math.min.apply(null, ptsDWL.map(q => q[0]));
  const xProaDWL = Math.max.apply(null, ptsDWL.map(q => q[0]));
  const Lwl = xProaDWL - xBaliza0;
  /* a re, a DWL termina no espelho ou na quilha? */
  const dwlNoEspelho = Math.abs(xBaliza0 - xReal(T0, DWL)) < 1e-6 && DWL >= zk0 - 1e-9 && DWL <= zs0 + 1e-9;

  /* 5. BOA e BWL */
  let mbMax = 0, xMbMax = 0;
  bordaTopo(2000).forEach(p => { if (p[1] > mbMax) { mbMax = p[1]; xMbMax = p[0]; } });
  let mbWL = 0, xMbWL = 0;
  ptsDWL.forEach(p => { if (p[1] > mbWL) { mbWL = p[1]; xMbWL = p[0]; } });
  const BOA = 2 * mbMax, BWL = 2 * mbWL;

  /* 6. Balizas: LWL/10, em multiplos de 50 mm, a partir da baliza 0, positivas a vante. */
  const espBal_exato = Lwl / 10, espBal = arred(espBal_exato, 50);
  const balizas = [];
  for (let n = 0; ; n++) { const x = xBaliza0 + n * espBal; if (x > xProa + 1e-9) break; balizas.push({ n: n, x: x }); }
  for (let n = -1; xBaliza0 + n * espBal >= xPopa - 1e-9; n--) balizas.unshift({ n: n, x: xBaliza0 + n * espBal });

  /* 7. Planos do alto: BOA/6, em multiplos de 100 mm, a partir da CL. */
  const espBut_exato = BOA / 6, espBut = arred(espBut_exato, 100);
  const buts = [];
  for (let j = 1; j * espBut < mbMax; j++) buts.push(j * espBut);

  /* ------------------------- cotas de uma baliza, tiradas da superficie ------ */
  /* Uma unica fonte para a tabela de cotas: a mesma secao que o plano de balizas desenha. */
  function cotasEm(X) {
    const s = secao(X), o = { x: X, wl: {}, truncada: false };
    if (!s.length) return o;
    const fundo = s[0], topo = s[s.length - 1];
    o.truncada = fundo[0] > 1;               // fundo no plano do espelho, nao na quilha
    o.zk = o.truncada ? null : fundo[1];
    o.zFundo = fundo[1]; o.yFundo = fundo[0];
    o.zs = topo[1]; o.ys = topo[0];
    if (temChine) { const cp = chineEm(X) || chinePonto(Math.max(T0, Math.min(TMAX, X))); if (cp) { o.zc = cp.z; o.yc = cp.y; } }
    wls.forEach(z => { o.wl[z] = yEm(X, z); });
    return o;
  }

  const R = {
    arquivo: arquivo, modo: parsed.mode, temChine: temChine,
    nBalTab: parsed.rows.length, niveis: parsed.nMid,
    T0: T0, T1: T1, TMAX: TMAX,
    inclinado: inclinado, origemEspelho: plano ? plano.origem : null,
    espBaixo: espBaixo, espAlto: espAlto, inclin: inclin, rakeGraus: rakeGraus,
    xPopa: xPopa, xProa: xProa, LOA: xProa - xPopa,
    minQuilha: minQuilha, xMinQuilha: xMinQuilha, zBordaMax: zBordaMax,
    DWL: DWL, espWL_exato: espWL_exato, espWL: espWL, wls: wls,
    xBaliza0: xBaliza0, xProaDWL: xProaDWL, Lwl: Lwl, dwlNoEspelho: dwlNoEspelho,
    mbMax: mbMax, xMbMax: xMbMax, BOA: BOA, mbWL: mbWL, xMbWL: xMbWL, BWL: BWL,
    espBal_exato: espBal_exato, espBal: espBal, balizas: balizas,
    espBut_exato: espBut_exato, espBut: espBut, buts: buts,
    avisos: parsed.warn
  };
  return {
    C: C, parsed: parsed, hull: hull, tsv: tsv, R: R, NP: NP,
    sec: sec, yNaForma: yNaForma, delta: delta, xReal: xReal, tDe: tDe, yEm: yEm, xT: xT, porArco: porArco,
    quilha: quilha, borda: borda, bordaTopo: bordaTopo, chine: chine, chineTopo: chineTopo,
    linhaAgua: linhaAgua, planoAlto: planoAlto, secao: secao,
    contornoEspelho: contornoEspelho, cotasEm: cotasEm,
    chinePonto: chinePonto, chineEm: chineEm
  };
}

if (require.main === module) {
  const S = montar(process.argv[2]);
  const { R, C } = S;
  const f1 = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  console.log('fonte: ' + R.arquivo + '  (casco ' + R.modo + ', ' + R.nBalTab + ' balizas)');
  if (R.avisos.length) console.log('AVISOS: ' + R.avisos.join('; '));
  console.log('ESPELHO  ' + (R.inclinado
    ? f1(Math.abs(R.rakeGraus)) + '° da vertical, pe x = ' + f1(R.espBaixo.x) + ' z = ' + f1(R.espBaixo.z) +
      ', topo x = ' + f1(R.espAlto.x) + ' z = ' + f1(R.espAlto.z)
    : 'face vertical em x = ' + f1(R.espBaixo.x) + ', z de ' + f1(R.espBaixo.z) + ' a ' + f1(R.espAlto.z) +
      '  (a tabela nao declara plano inclinado)'));
  console.log('EXTREMOS x de ' + f1(R.xPopa) + ' a ' + f1(R.xProa) + '  ->  LOA ' + f1(R.LOA));
  console.log('BASE     z = 0   (quilha reconstruida: minimo ' + f1(R.minQuilha) + ' em x = ' + f1(R.xMinQuilha) + ')');
  console.log('DWL      z = ' + R.DWL + '   borda mais alta ' + f1(R.zBordaMax));
  console.log('LA       ' + R.espWL + ' mm: ' + R.wls.map(z => {
    const tr = S.linhaAgua(z, 400);
    return z + (tr.length === 1 ? '' : '[' + tr.length + ' trechos]');
  }).join(', '));
  console.log('BALIZA 0 x = ' + f1(R.xBaliza0) + (R.dwlNoEspelho ? ' (a DWL termina no espelho)' : ' (a DWL corta a quilha)') +
    '   LWL ' + f1(R.Lwl) + ' (a ' + f1(R.xProaDWL) + ')');
  console.log('BOA      ' + f1(R.BOA) + ' (meia-boca ' + f1(R.mbMax) + ' em x = ' + f1(R.xMbMax) + ')');
  console.log('BWL      ' + f1(R.BWL) + ' (meia-boca ' + f1(R.mbWL) + ' em x = ' + f1(R.xMbWL) + ')');
  console.log('ESP.BAL  LWL/10 = ' + f1(R.espBal_exato) + ' -> ' + R.espBal + ' mm; balizas ' +
    R.balizas[0].n + '..' + R.balizas[R.balizas.length - 1].n +
    ' (x de ' + f1(R.balizas[0].x) + ' a ' + f1(R.balizas[R.balizas.length - 1].x) + ')');
  console.log('ESP.ALTO BOA/6 = ' + f1(R.espBut_exato) + ' -> ' + R.espBut + ' mm; dentro do casco: ' + R.buts.join(', '));

  /* As tres familias de curvas e a tabela tem de dar o MESMO numero. */
  const naCurva = (trs, x) => {
    for (const pts of trs) for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((a[0] - x) * (b[0] - x) <= 0 && Math.abs(b[0] - a[0]) > 1e-12)
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
    return null;
  };
  const las = {}; R.wls.forEach(z => { las[z] = S.linhaAgua(z, 800); });
  const altos = {}; R.buts.forEach(yb => { altos[yb] = S.planoAlto(yb, 800); });
  let pS = 0, pL = 0, pA = 0;
  R.balizas.forEach(b => {
    const X = Math.min(b.x, R.xProa), c = S.cotasEm(X), sc = S.secao(X);
    R.wls.forEach(z => {
      if (c.wl[z] === null) return;
      const yS = C.yAtZ(sc, z); if (yS !== null) pS = Math.max(pS, Math.abs(yS - c.wl[z]));
      const yL = naCurva(las[z], X); if (yL !== null) pL = Math.max(pL, Math.abs(yL - c.wl[z]));
    });
    R.buts.forEach(yb => {
      const zA = naCurva(altos[yb], X); if (zA === null) return;
      const yS = C.yAtZ(sc, zA); if (yS !== null) pA = Math.max(pA, Math.abs(yS - yb));
    });
  });
  console.log('');
  console.log('coerencia (a mesma superficie para tudo):');
  console.log('  tabela  x  secao do plano de balizas : ' + pS.toFixed(3) + ' mm');
  console.log('  tabela  x  linha d agua do TOPO      : ' + pL.toFixed(3) + ' mm');
  console.log('  secao   x  plano do alto do PERFIL   : ' + pA.toFixed(3) + ' mm');
}
module.exports = { montar: montar, C: C, lerEspelho: lerEspelho };
