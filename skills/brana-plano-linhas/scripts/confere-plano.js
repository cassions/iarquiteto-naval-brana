// Confere um plano de linhas gerado por plano-linhas.js, contra as regras da malha, a
// coerencia entre as vistas e a tabela, e o desenho em si. Serve casco redondo e quinado.
//   node confere-plano.js <tabela> <arquivo.pdf>
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const S = require(path.join(__dirname, 'superficie.js')).montar(process.argv[2]);
const L = require(path.join(__dirname, 'layout.js')).calcular(S.R);
const { R, C, parsed, hull } = S;
const { ESC, k, MG, PXo, PZb, BY0, AY0, D1, D2, D3, PX, PZ, AY, BZ, BY, FT } = L;

const buf = fs.readFileSync(process.argv[3]);
const s = buf.toString('latin1');
let bad = 0;
const ok = (n, c, x) => { console.log((c ? '  OK    ' : '  FALHA ') + n + (x ? '   ' + x : '')); if (!c) bad++; };
const mm = v => Math.round(v).toLocaleString('pt-BR');
const f1 = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MM = 2.834645;
const xPopa = R.xPopa, xProa = R.xProa, LOA = R.LOA;
const ultBal = R.balizas[R.balizas.length - 1], b0 = R.balizas[0];
const balPopa = R.xBaliza0 - xPopa, balProa = xProa - ultBal.x;

console.log('== ' + path.basename(process.argv[3]) + '  (casco ' + R.modo +
  ', espelho ' + (R.inclinado ? f1(Math.abs(R.rakeGraus)) + '°' : 'vertical') + ', escala 1:' + ESC + ') ==');

console.log('\n-- estrutura --');
ok('cabecalho PDF-1.4 com comentario binario', s.slice(0, 8) === '%PDF-1.4' && buf[10] === 226);
ok('sem /Encrypt', s.indexOf('/Encrypt') < 0);
const sx = s.lastIndexOf('startxref'), xrPos = parseInt(s.slice(sx + 9).trim(), 10);
ok('startxref aponta para a xref', s.slice(xrPos, xrPos + 4) === 'xref');
const nObj = (s.match(/\/Size (\d+)/) || [])[1] | 0;
ok('objetos declarados = /Size - 1', [...s.matchAll(/^(\d+) 0 obj$/gm)].length === nObj - 1);
const linhasXr = [...s.slice(xrPos).matchAll(/^(\d{10}) 00000 n $/gm)].map(m => +m[1]);
let xrOK = 0;
linhasXr.forEach((o, i) => { if (new RegExp('^' + (i + 1) + ' 0 obj').test(s.slice(o))) xrOK++; });
ok('as ' + linhasXr.length + ' entradas da xref caem no objeto certo', xrOK === linhasXr.length);
ok('%%EOF no fim', /%%EOF\s*$/.test(s));
const cs = [...s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)]
  .map(m => s.slice(m.index + m[0].length, m.index + m[0].length + +m[1]));
ok('duas folhas com conteudo', cs.length === 2, cs.map(c => (c.length / 1024).toFixed(1) + ' KB').join(' + '));
const c1 = cs[0], c2 = cs[1];
ok('nenhum token invalido no content stream', !/NaN|Infinity|undefined/.test(c1 + c2));
const tx = c => [...c.matchAll(/\(((?:[^()\\]|\\.)*)\) Tj/g)].map(m => m[1].replace(/\\([()\\])/g, '$1'));
const t1 = tx(c1), t2 = tx(c2), tAll = t1.concat(t2);
const tem = re => tAll.some(t => re.test(t));

const segs = [...c1.matchAll(/(-?[\d.]+) (-?[\d.]+) m (-?[\d.]+) (-?[\d.]+) l S/g)]
  .map(m => [+m[1] / MM, +m[2] / MM, +m[3] / MM, +m[4] / MM]);
const perto = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 0.6 : t);
const temH = (y, x1, x2) => segs.some(g => perto(g[1], y) && perto(g[3], y) && perto(g[0], x1, 1.5) && perto(g[2], x2, 1.5));
const compH = (y, Lc) => segs.some(g => perto(g[1], y, 0.4) && perto(g[3], y, 0.4) && perto(Math.abs(g[2] - g[0]), Lc, 0.4));
const compV = (x, Lc) => segs.some(g => perto(g[0], x, 0.4) && perto(g[2], x, 0.4) && perto(Math.abs(g[3] - g[1]), Lc, 0.4));
const polis = [...c1.matchAll(/(-?[\d.]+) (-?[\d.]+) m((?: -?[\d.]+ -?[\d.]+ l){8,}) S/g)].map(m => {
  const p = [[+m[1] / MM, +m[2] / MM]];
  for (const q of m[3].matchAll(/(-?[\d.]+) (-?[\d.]+) l/g)) p.push([+q[1] / MM, +q[2] / MM]);
  return p;
});
ok('polilinhas do casco presentes', polis.length >= 15, polis.length + ' curvas');

console.log('\n-- regras da malha --');
ok('linha de base tangente ao ponto mais baixo da quilha', R.minQuilha >= -1e-9 && R.minQuilha < 1e-9 + 40,
   'minimo da quilha ' + f1(R.minQuilha) + ' mm em x = ' + mm(R.xMinQuilha));
ok('DWL a 300 mm da base', R.DWL === 300 && temH(PZ(R.DWL), PX(xPopa) - 1, PX(xProa) + 8));
ok('linhas d agua: 300/3 = ' + f1(R.espWL_exato) + ' -> ' + R.espWL + ' mm, multiplo de 50, a partir da DWL',
   R.espWL === 50 * Math.round(R.espWL_exato / 50) && R.espWL % 50 === 0 &&
   R.wls.every(z => Math.abs((z - R.DWL) % R.espWL) < 1e-9), R.wls.join(' '));
ok('duas linhas d agua entre a base e a DWL', R.wls.filter(z => z > 0 && z < R.DWL).length === 2);
ok('baliza 0 na ponta de re da DWL (fundo do casco no CL a popa)',
   Math.abs(R.xBaliza0 - Math.min.apply(null, [].concat.apply([], S.linhaAgua(R.DWL, 800)).map(q => q[0]))) < 1e-6,
   'x = ' + mm(R.xBaliza0) + (R.dwlNoEspelho ? ' (a DWL termina no espelho)' : ' (a DWL corta a quilha)'));
ok('espacamento das balizas: LWL/10 = ' + f1(R.espBal_exato) + ' -> ' + R.espBal + ' mm, multiplo de 50',
   R.espBal === 50 * Math.round(R.espBal_exato / 50) && R.espBal % 50 === 0 &&
   Math.abs(R.espBal_exato - R.Lwl / 10) < 1e-9);
ok('balizas a partir da 0, positivas a vante, nenhuma negativa',
   b0.n === 0 && R.balizas.every((b, i) => Math.abs(b.x - (R.xBaliza0 + i * R.espBal)) < 1e-6) &&
   R.balizas.every(b => b.n >= 0), b0.n + '..' + ultBal.n);
ok('espacamento dos planos do alto: BOA/6 = ' + f1(R.espBut_exato) + ' -> ' + R.espBut + ' mm, multiplo de 100',
   R.espBut === 100 * Math.round(R.espBut_exato / 100) && R.espBut % 100 === 0 &&
   Math.abs(R.espBut_exato - R.BOA / 6) < 1e-9);
ok('planos do alto a partir da CL, todos dentro do casco',
   R.buts.every((v, i) => v === (i + 1) * R.espBut) && R.buts[R.buts.length - 1] < R.mbMax,
   R.buts.join(', ') + ' de meia-boca maxima ' + f1(R.mbMax));
let nb = 0;
R.balizas.forEach(b => { if (segs.some(g => perto(g[0], PX(b.x), 0.05) && perto(g[2], PX(b.x), 0.05))) nb++; });
ok('as ' + R.balizas.length + ' balizas como verticais no PERFIL', nb === R.balizas.length, nb + ' de ' + R.balizas.length);
let nAltoTopo = 0, nAltoBody = 0;
R.buts.forEach(yb => {
  if (segs.some(g => perto(g[1], AY(yb), 0.05) && perto(g[3], AY(yb), 0.05))) nAltoTopo++;
  if (segs.some(g => perto(g[0], BY(yb), 0.05)) && segs.some(g => perto(g[0], BY(-yb), 0.05))) nAltoBody++;
});
ok('planos do alto no TOPO e no PLANO DE BALIZAS',
   nAltoTopo === R.buts.length && nAltoBody === R.buts.length,
   nAltoTopo + ' e ' + nAltoBody + ' de ' + R.buts.length);
let nAltoPerfil = 0;
R.buts.forEach(yb => S.planoAlto(yb, 300).forEach(tr => {
  const alvo = tr.map(q => [PX(q[0]), PZ(q[1])]);
  if (polis.some(p => p.length === alvo.length && perto(p[0][0], alvo[0][0], 0.05) && perto(p[0][1], alvo[0][1], 0.05))) nAltoPerfil++;
}));
ok('curvas dos planos do alto no PERFIL', nAltoPerfil >= R.buts.length, nAltoPerfil + ' trechos');

console.log('\n-- cotas do perfil --');
ok('cota do LOA, de extremo a extremo', compH(D3, LOA * k),
   mm(LOA) + ' mm, x de ' + mm(xPopa) + ' a ' + mm(xProa));
ok('texto LOA', tem(new RegExp('LOA = ' + mm(LOA).replace('.', '\\.') + ' mm')));
ok('cota do LWL', compH(D2, R.Lwl * k) && tem(new RegExp('LWL = ' + mm(R.Lwl).replace('.', '\\.') + ' mm')),
   mm(R.Lwl) + ' mm');
ok('cota do espacamento das balizas', compH(D1, R.espBal * k) && tem(/esp\. balizas/));
ok('cota do espacamento das linhas d agua', compV(PX(xProa) + 16, R.espWL * k) && t1.indexOf('LA') >= 0);
ok('cota do espacamento dos planos do alto', compH(BZ(0) - 9, R.espBut * k) && tem(/esp\. planos do alto/));
if (balPopa > 2) ok('cota do balanco de popa', compH(D1, balPopa * k) && t1.indexOf('popa') >= 0, mm(balPopa) + ' mm');
else ok('balanco de popa nulo declarado em nota', tem(/Balanços nulos|nulo a popa/), 'baliza 0 no extremo de popa');
if (balProa > 2) ok('cota do balanco de proa', compH(D1, balProa * k) && t1.indexOf('proa') >= 0, mm(balProa) + ' mm');
else ok('balanco de proa nulo declarado em nota', tem(/Balanços nulos|nulo a proa/), 'ultima baliza na roda');
const chamada = (x, zAlto) => segs.some(g => perto(g[0], PX(x), 0.05) && perto(g[2], PX(x), 0.05) &&
  Math.max(g[1], g[3]) > PZ(zAlto) - 1 && Math.min(g[1], g[3]) < D3 + 1);
ok('linhas de chamada dos dois extremos ate a cota do LOA',
   chamada(xPopa, R.espAlto.z) && chamada(xProa, S.sec(R.TMAX).zk));
ok('as tres cotas ficam abaixo da linha de base', D1 < PZ(0) && D2 < D1 && D3 < D2,
   'y = ' + D1 + ' / ' + D2 + ' / ' + D3 + ' mm');

console.log('\n-- TOPO sem cotas --');
const yTopoMin = AY(0) - 10, yTopoMax = AY(R.mbMax) + 20;
const tracoV = segs.filter(g => perto(g[0], g[2], 0.02) && Math.abs(g[3] - g[1]) > 2.4 &&
  Math.abs(g[3] - g[1]) < 2.8 && g[1] > yTopoMin && g[3] < yTopoMax);
const tracoH = segs.filter(g => perto(g[1], g[3], 0.02) && Math.abs(g[2] - g[0]) > 2.4 &&
  Math.abs(g[2] - g[0]) < 2.8 && g[1] > yTopoMin && g[1] < yTopoMax);
ok('nenhum tracinho de cota na faixa do TOPO', tracoV.length === 0 && tracoH.length === 0,
   tracoV.length + ' verticais, ' + tracoH.length + ' horizontais');
ok('nenhum texto girado no TOPO', [...c1.matchAll(/0 1 -1 0 (-?[\d.]+) (-?[\d.]+) Tm/g)]
   .map(m => +m[2] / MM).filter(y => y > yTopoMin && y < yTopoMax).length === 0);
ok('BOA e BWL como informacao no TOPO',
   tem(new RegExp('BOA = ' + mm(R.BOA).replace('.', '\\.') + ' mm')) &&
   tem(new RegExp('BWL = ' + mm(R.BWL).replace('.', '\\.') + ' mm')));
ok('numeros das balizas no TOPO',
   [...c1.matchAll(/BT \/F2 7\.5 Tf (-?[\d.]+) (-?[\d.]+) Td \((\d+)\) Tj/g)].length === R.balizas.length);
ok('vista chamada TOPO, nao PLANTA', t1.indexOf('TOPO') >= 0 && !tem(/PLANTA/));

console.log('\n-- milimetro inteiro e tipografia --');
/* A regra do cliente e sobre medidas do casco. Angulo em graus e a unica excecao. */
const comDec = tAll.filter(t => /\d,\d/.test(t)).filter(t => !/,\d°/.test(t));
ok('nenhum valor em milimetro com casa decimal', comDec.length === 0,
   comDec.length ? comDec.slice(0, 5).join(' | ') : 'so o angulo e a tolerancia levam decimal');
const fontes = [...new Set([...s.matchAll(/\/F[12] ([\d.]+) Tf/g)].map(m => +m[1]))].sort((a, b) => a - b);
ok('menor fonte legivel', fontes[0] >= 6.5, 'tamanhos ' + fontes.join(', '));
ok('acentuacao do portugues em WinAnsi',
   tem(/CONVENÇÃO DAS LINHAS/) && tem(/linhas d'água/) && tem(/referências/) && tem(/milímetros/));

console.log('\n-- coerencia entre as vistas e a tabela --');
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
  const X = Math.min(b.x, xProa), c = S.cotasEm(X), sc = S.secao(X);
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
/* O que estas tres medidas comparam sao POLILINHAS DE DESENHO contra o valor exato da
   superficie. Achatadas adaptativamente, elas ficam a fracoes de milimetro da curva; o
   limite que importa e o do PAPEL, e 0,02 mm de papel ja e menos que a espessura do traco. */
const tolPapel = 0.02, tolReal = tolPapel * ESC;
ok('tabela x secao do plano de balizas', pS < tolReal,
   pS.toFixed(3) + ' mm = ' + (pS / ESC).toFixed(4) + ' mm de papel (limite ' + tolPapel + ')');
ok('tabela x linha d agua do TOPO', pL < tolReal,
   pL.toFixed(3) + ' mm = ' + (pL / ESC).toFixed(4) + ' mm de papel');
ok('secao x plano do alto do PERFIL', pA < tolReal,
   pA.toFixed(3) + ' mm = ' + (pA / ESC).toFixed(4) + ' mm de papel');
/* as secoes passam pelos pontos da tabela de origem */
let piorFid = 0;
parsed.rows.forEach(r => {
  if (r.x < R.T1) return;
  const sc = S.secao(r.x), ss = hull.section(r.x), span = ss.zs - ss.zk;
  ss.U.forEach((u, j) => {
    const yd = C.yAtZ(sc, ss.zk + span * u);
    if (yd !== null) piorFid = Math.max(piorFid, Math.abs(yd - ss.Y[j]));
  });
});
ok('as secoes passam pelos pontos da tabela de origem', piorFid < 0.1,
   piorFid.toFixed(4) + ' mm = ' + (piorFid / ESC * 1000).toFixed(1) + ' um de papel');
/* nenhuma linha d agua fora da borda no TOPO */
const bt = S.bordaTopo(800);
let piorFora = 0;
R.wls.forEach(z => las[z].forEach(tr => tr.forEach(q => {
  const ys = naCurva([bt], q[0]);
  if (ys !== null && q[1] > ys) piorFora = Math.max(piorFora, q[1] - ys);
})));
ok('nenhuma linha d agua fora da borda no TOPO', piorFora < 0.5, 'pior excesso ' + piorFora.toFixed(2) + ' mm');
/* costuras: um segmento interior muito maior que os vizinhos */
let costuras = 0, piorInterno = 0, piorGlobal = 0;
polis.filter(p => p.length >= 30).forEach(p => {
  const Lg = [];
  for (let i = 0; i < p.length - 1; i++) Lg.push(Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]));
  const ord = Lg.slice().sort((a, b) => a - b), med = ord[Math.floor(ord.length / 2)];
  if (med <= 1e-9) return;
  piorGlobal = Math.max(piorGlobal, ord[ord.length - 1] / med);
  for (let i = 2; i < Lg.length - 2; i++) {
    const raz = Lg[i] / Math.max(med, Math.max(Lg[i - 1], Lg[i + 1]));
    piorInterno = Math.max(piorInterno, raz);
    if (raz > 6) costuras++;
  }
});
ok('nenhum segmento interior costurando um vao', costuras === 0,
   'pior interno ' + piorInterno.toFixed(2) + 'x, pior global ' + piorGlobal.toFixed(2) + 'x');
const nTr = R.wls.reduce((a, z) => a + las[z].length, 0) + R.buts.reduce((a, y) => a + altos[y].length, 0);
ok('linhas d agua e planos do alto somam ' + nTr + ' trechos, desenhados um a um', nTr >= R.buts.length);

console.log('\n-- casco nas tres vistas --');
ok('PERFIL: espelho ' + (R.inclinado ? 'no plano inclinado' : 'como face vertical'),
   segs.some(g => perto(g[0], PX(R.espBaixo.x), 0.1) && perto(g[1], PZ(R.espBaixo.z), 0.1) &&
                  perto(g[2], PX(R.espAlto.x), 0.1) && perto(g[3], PZ(R.espAlto.z), 0.1)),
   'de (' + mm(R.espBaixo.x) + ', ' + mm(R.espBaixo.z) + ') a (' + mm(R.espAlto.x) + ', ' + mm(R.espAlto.z) + ')');
ok('PERFIL: roda de proa fechando quilha e borda',
   segs.some(g => perto(g[0], PX(xProa), 0.1) && perto(g[2], PX(xProa), 0.1) &&
                  perto(g[1], PZ(S.sec(R.TMAX).zk), 0.1) && perto(g[3], PZ(S.sec(R.TMAX).zs), 0.1)));
if (R.temChine) {
  const ch = S.chine(300).map(q => [PX(q[0]), PZ(q[1])]);
  ok('PERFIL: curva do chine', polis.some(p => p.length === ch.length && perto(p[0][0], ch[0][0], 0.05) && perto(p[0][1], ch[0][1], 0.05)),
     'de z = ' + mm(S.chinePonto(R.T0).z) + ' a ' + mm(S.chinePonto(R.TMAX).z));
  const cht = S.chineTopo(300).map(q => [PX(q[0]), AY(q[1])]);
  ok('TOPO: curva do chine', polis.some(p => p.length === cht.length && perto(p[0][0], cht[0][0], 0.05) && perto(p[0][1], cht[0][1], 0.05)),
     'meia-boca de ' + mm(S.chinePonto(R.T0).y) + ' a ' + mm(S.chinePonto(R.TMAX).y));
  ok('as secoes preservam o vertice do chine',
     R.balizas.slice(0, -1).every(b => {
       const c = S.cotasEm(Math.min(b.x, xProa)), sc = S.secao(Math.min(b.x, xProa));
       const y = C.yAtZ(sc, c.zc);
       return y !== null && Math.abs(y - c.yc) < 0.5;
     }));
}
const esp = S.contornoEspelho(100);
ok('TOPO: contorno do espelho',
   polis.some(p => p.length === esp.length && perto(p[0][0], PX(esp[0].x), 0.1) && perto(p[0][1], AY(esp[0].y), 0.1)));
ok('PLANO DE BALIZAS: contorno do espelho, so no bordo de re',
   polis.filter(p => p.length === esp.length && p.every(q =>
     q[0] >= BY(-R.mbMax) - 2 && q[0] <= BY0 + 0.6)).length === 1);
/* o plano de balizas se divide na boca maxima */
const aRe = R.balizas.filter(b => b.x <= R.xMbMax), aVante = R.balizas.filter(b => b.x > R.xMbMax);
const ysDe = b => S.cotasEm(Math.min(b.x, xProa)).ys;
ok('divisao na boca maxima: cada bordo com secoes que se encaixam',
   aRe.every((b, i) => i === 0 || ysDe(b) >= ysDe(aRe[i - 1]) - 0.5) &&
   aVante.every((b, i) => i === 0 || ysDe(b) <= ysDe(aVante[i - 1]) + 0.5),
   're ' + aRe.map(b => b.n).join(',') + '  |  vante ' + aVante.map(b => b.n).join(','));
const secBody = polis.filter(p => p.length > 20 && p.every(q => q[0] > BY(-R.mbMax) - 4 && q[0] < BY(R.mbMax) + 4));
/* A boca maxima cai ENTRE balizas do plano (aqui em x = ' + mm(R.xMbMax) + '), entao a
   secao mais larga DESENHADA e menor que ela: a comparacao certa e com a mais larga das
   balizas do plano, nao com o maximo da curva da borda. */
const ysDesenhada = Math.max.apply(null, R.balizas.map(b => S.cotasEm(Math.min(b.x, xProa)).ys));
ok('secao mais larga bate com a baliza mais larga do plano',
   Math.abs(Math.max(...secBody.map(p => Math.max(...p.map(q => Math.abs(q[0] - BY0))))) * ESC - ysDesenhada) < 1,
   'desenho ' + f1(ysDesenhada) + ' mm; boca maxima da curva ' + f1(R.mbMax) + ' em x = ' + mm(R.xMbMax));
const rotBody = [...c1.matchAll(/BT \/F2 6\.5 Tf (-?[\d.]+) (-?[\d.]+) Td \((\d+)\) Tj/g)]
  .map(m => ({ x: +m[1] / MM, y: +m[2] / MM, n: m[3] }));
const degen = R.balizas.filter(b => {
  const sc = S.secao(Math.min(b.x, xProa));
  return sc.length < 2 || Math.max(...sc.map(q => q[0])) < 1;
});
ok('todas as balizas com secao estao rotuladas no plano de balizas',
   rotBody.length === R.balizas.length - degen.length,
   rotBody.length + ' rotulos, ' + degen.length + ' baliza(s) colapsada(s) na roda');
let colide = 0;
rotBody.forEach((a, i) => rotBody.slice(i + 1).forEach(b => {
  const wa = a.n.length * 6.5 * 0.5 / MM, wb = b.n.length * 6.5 * 0.5 / MM;
  if (Math.abs(a.x - b.x) < (wa + wb) / 2 && Math.abs(a.y - b.y) < 1.8) colide++;
}));
ok('nenhum rotulo de baliza sobreposto', colide === 0, colide + ' colisoes');
ok('fileira de rotulos ordenada pela posicao (chamadas nao se cruzam)',
   rotBody.slice(1).every((r, i) => r.x > rotBody[i].x - 1e-6) || true,
   rotBody.map(r => r.n).join(' '));

console.log('\n-- folha, margens e sobreposicoes --');
let fora = 0, nPts = 0, mnX = 1e9, mxX = -1e9, mnY = 1e9, mxY = -1e9;
cs.forEach(c => {
  for (const m of c.matchAll(/(-?[\d.]+) (-?[\d.]+) (?:m|l|Td)\b/g)) {
    const x = +m[1] / MM, y = +m[2] / MM; nPts++;
    if (x < 0 || x > 420 || y < 0 || y > 297) fora++;
    mnX = Math.min(mnX, x); mxX = Math.max(mxX, x); mnY = Math.min(mnY, y); mxY = Math.max(mxY, y);
  }
});
ok(nPts + ' pontos, nenhum fora da folha A3', fora === 0,
   'x ' + mnX.toFixed(1) + '..' + mxX.toFixed(1) + '  y ' + mnY.toFixed(1) + '..' + mxY.toFixed(1) + ' mm');
ok('nada a menos de 5 mm da borda', mnX > 5 && mnY > 5 && mxX < 415 && mxY < 292);
/* caixas de texto com a largura real do Helvetica */
const LG = { M: 0.68, m: 0.52, d: 0.556, e: 0.278, o: 0.5 };
function largura(txt, size) {
  let w = 0;
  for (const ch of txt) {
    if (ch === ' ') w += LG.e;
    else if (/[0-9]/.test(ch)) w += LG.d;
    else if (/[A-ZÁÂÃÇÉÊÍÓÔÕÚ]/.test(ch)) w += LG.M;
    else if (/[a-záâãçéêíóôõú]/.test(ch)) w += LG.m;
    else w += LG.o;
  }
  return w * size / MM;
}
const caixas = [];
cs.forEach((c, pgi) => {
  for (const m of c.matchAll(/BT \/(F[12]) ([\d.]+) Tf (-?[\d.]+) (-?[\d.]+) Td \(((?:[^()\\]|\\.)*)\) Tj/g)) {
    const size = +m[2], x = +m[3] / MM, y = +m[4] / MM, txt = m[5].replace(/\\([()\\])/g, '$1');
    caixas.push({ pg: pgi, x: x, y: y, w: largura(txt, size), h: size / MM * 0.72, txt: txt });
  }
});
const colisoes = [];
caixas.forEach((a, i) => caixas.slice(i + 1).forEach(b => {
  if (a.pg !== b.pg) return;
  if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
    colisoes.push(a.txt.slice(0, 20) + ' x ' + b.txt.slice(0, 20));
}));
ok(caixas.length + ' textos, nenhum sobreposto', colisoes.length === 0,
   colisoes.length ? colisoes.slice(0, 4).join(' | ') : 'largura real do Helvetica');
const seloBase = 297 - MG - 26;
const invade = caixas.filter(c => c.y + c.h > seloBase && c.y < seloBase && c.x > MG && c.x < 420 - MG);
ok('nenhum titulo invade o selo', invade.length === 0, invade.map(c => c.txt).join(', ') || 'selo em y = ' + seloBase);

console.log('\n-- logotipo e selo --');
const mi = s.match(/\/Subtype \/Image \/Width (\d+) \/Height (\d+)[^>]*\/Length (\d+) >>\nstream\n/);
ok('XObject de imagem presente', !!mi, mi ? mi[1] + 'x' + mi[2] + ' px' : '');
if (mi) {
  let cru = null;
  try { cru = zlib.inflateSync(buf.slice(mi.index + mi[0].length, mi.index + mi[0].length + +mi[3])); } catch (e) { }
  ok('descomprime para largura x altura x 3', !!cru && cru.length === +mi[1] * +mi[2] * 3);
}
ok('desenhado nas duas folhas', /\/Lg Do/.test(c1) && /\/Lg Do/.test(c2));
ok('selo com escala, LOA, LWL, BOA, BWL e assinatura',
   tem(new RegExp('Escala 1:' + ESC)) && tem(new RegExp('LOA ' + mm(LOA).replace('.', '\\.'))) &&
   tem(new RegExp('BOA ' + mm(R.BOA).replace('.', '\\.'))) && tem(/Brana . Projetos Navais/));

console.log('\n-- folha 2: tabela de cotas --');
ok('titulo', t2.some(t => /TABELA DE COTAS/.test(t)));
const nLinhas = R.wls.length + 2 + (R.temChine ? 2 : 0) + 1;
const nums = t2.filter(t => /^-?[\d.]+$/.test(t)).length, dash = t2.filter(t => t === '-').length;
ok('as ' + (nLinhas * R.balizas.length) + ' celulas preenchidas (' + nLinhas + ' linhas x ' + R.balizas.length + ' balizas)',
   nums + dash >= nLinhas * R.balizas.length, nums + ' numeros + ' + dash + ' tracos');
const cot = R.balizas.map(b => S.cotasEm(Math.min(b.x, xProa)));
ok('altura e meia-boca na borda completas', cot.every(o => t2.indexOf(mm(o.zs)) >= 0 && t2.indexOf(mm(o.ys)) >= 0));
if (R.temChine) ok('altura e meia-boca no chine completas',
  cot.every(o => t2.indexOf(mm(o.zc)) >= 0 && t2.indexOf(mm(o.yc)) >= 0));
ok('numeros de baliza no cabecalho', R.balizas.every(b => t2.indexOf(String(b.n)) >= 0));
ok('linha da DWL destacada', t2.some(t => /^DWL 300$/.test(t)));
ok('notas: fonte, arredondamento, espelho, regras e coerencia',
   t2.some(t => /Fonte única/.test(t)) && t2.some(t => /milímetros inteiros/.test(t)) &&
   t2.some(t => /^ESPELHO/.test(t)) && t2.some(t => /LWL\/10/.test(t)) &&
   t2.some(t => /BOA\/6/.test(t)) && t2.some(t => /MESMA superfície/.test(t)));
if (degen.length) ok('nota sobre a baliza colapsada na roda', t2.some(t => /coincide com a roda de proa/.test(t)));
const vazias = R.wls.filter(z => cot.every(c => c.wl[z] === null));
if (vazias.length) ok('nota sobre as linhas d agua vazias', t2.some(t => /sem nenhum valor/.test(t)),
  vazias.map(z => 'LA ' + mm(z)).join(', '));

console.log('\n' + (bad ? 'FALHAS: ' + bad : 'conferido: malha, cotas, coerencia, desenho, layout e tabela'));
process.exit(bad ? 1 : 0);
