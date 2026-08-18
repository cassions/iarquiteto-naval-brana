#!/usr/bin/env node
// Verifica um plano de linhas gerado por esta skill, quinado ou redondo.
//
//   node scripts/verificar.js Plano-de-Linhas-Fulano.html
//
// Carrega o <script> do arquivo num DOM de mentira e exercita o modelo. Nesta skill,
// todo defeito real apareceu ao testar, nao ao ler o codigo — por isso este passo nao
// e opcional.
'use strict';
const fs = require('fs');

const ARQ = process.argv[2];
if (!ARQ) { console.error('uso: node verificar.js <arquivo.html>'); process.exit(2); }

/* ---------- DOM de mentira ---------- */
const noop = () => {};
const pia = {};
function el(id) {
  if (!pia[id]) pia[id] = {
    id, innerHTML: '', value: '', textContent: '', hidden: true, max: 0,
    style: { width: '', setProperty: noop, removeProperty: noop },
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    dataset: {}, addEventListener: noop, querySelectorAll: () => [],
    getAttribute: () => null, setAttribute: noop, removeAttribute: noop,
    setPointerCapture: noop, releasePointerCapture: noop, focus: noop, select: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1180, height: 420 }),
  };
  if (!pia[id].parentNode) pia[id].parentNode = { addEventListener: noop, clientWidth: 1180,
                                                  getBoundingClientRect: pia[id].getBoundingClientRect };
  return pia[id];
}
global.document = { getElementById: el, querySelectorAll: () => [],
                    documentElement: { setAttribute: noop, removeAttribute: noop, dataset: {} } };
global.window = global;
global.innerWidth = 1280;
global.addEventListener = noop;
global.requestAnimationFrame = noop;
// navigator e getter-only em versoes recentes do Node: define sem quebrar
try { if (!global.navigator) global.navigator = {}; }
catch (e) { try { Object.defineProperty(global, 'navigator', { value: {}, configurable: true }); } catch (e2) {} }
global.ResizeObserver = undefined;

/* ---------- carregar o modelo do arquivo ---------- */
const html = fs.readFileSync(ARQ, 'utf8');
const i0 = html.lastIndexOf('<script>'), i1 = html.lastIndexOf('</script>');
if (i0 < 0 || i1 < 0) { console.error('ERRO: nao achei o <script> do modelo.'); process.exit(2); }
let src = html.slice(i0 + 8, i1);
const EXPORTA = 'model,INITIAL,cloneModel,ORDER,SPEC,ui,validate,moveNode,isFair,convexOK,ctrlPoly,' +
  'segments,curvature,evalAt,sectionAt,allSegs,metrics,offsetRows,stationX,RAW,LOA_SQ,VIEW,' +
  'renderPlan,renderProf,renderBody,tsv,NST';
src = src.replace('})();', '__api={' + EXPORTA + '};\n})();');
src = 'var __api;\n' + src.replace('"use strict";', '') + '\n__api;';

let A;
try { A = eval(src); }
catch (e) { console.error('ERRO ao carregar o modelo: ' + e.message); process.exit(2); }

let falhas = 0, passes = 0;
const ok = (n, c, extra) => {
  if (c) { passes++; console.log('  PASSOU  ' + n + (extra ? '   ' + extra : '')); }
  else { falhas++; console.log('  FALHOU  ' + n + (extra ? '   ' + extra : '')); }
};
const zerar = () => Object.assign(A.model, A.cloneModel(A.INITIAL));
const QUINADO = A.ORDER.indexOf('planChine') >= 0;
const MM = () => A.ui.loa * 1000 / A.LOA_SQ;   // mm por quadrado

/* razao entre o sinal minoritario e o dominante da curvatura: acima de 2% e inflexao real */
function inflexao(nodes) {
  let pos = 0, neg = 0;
  for (const s of A.segments(nodes)) for (let j = 0; j <= 40; j++) {
    const k = A.curvature(s, j / 40);
    if (k > pos) pos = k;
    if (-k > neg) neg = -k;
  }
  const dom = Math.max(pos, neg);
  return dom < 1e-9 ? 0 : Math.min(pos, neg) / dom;
}

console.log('\n' + ARQ + '  ·  casco ' + (QUINADO ? 'QUINADO' : 'REDONDO') +
            '  ·  ' + A.ORDER.length + ' curvas  ·  ' + A.NST + ' balizas  ·  ' +
            A.LOA_SQ + ' quadrados');

console.log('\n=== 1. Modelo de partida ===');
zerar();
ok('valido em todas as restricoes', A.validate(A.model) === null, A.validate(A.model) || '');
A.ORDER.forEach(k => ok(k + ' sem inflexao', A.isFair(A.model[k]) && inflexao(A.model[k].nodes) < 0.02,
  (inflexao(A.model[k].nodes) * 100).toFixed(3) + ' %'));
ok('balizas cobrem o casco inteiro',
   Math.abs(A.stationX(1)) < 1e-9 && Math.abs(A.stationX(A.NST) - A.LOA_SQ) < 1e-9,
   'baliza 1 em X=' + A.stationX(1) + ', baliza ' + A.NST + ' em X=' + A.stationX(A.NST));

console.log('\n=== 2. As curvas passam pelos pontos medidos ===');
Object.keys(A.RAW || {}).forEach(k => {
  if (!A.model[k]) return;
  const segs = A.segments(A.model[k].nodes);
  let pior = 0;
  A.RAW[k].forEach(p => { pior = Math.max(pior, Math.abs(A.evalAt(segs, Math.min(A.LOA_SQ, p[0])) - p[1])); });
  ok(k + ' adere aos pontos da foto', pior < 0.06,
     'desvio max ' + pior.toFixed(4) + ' qd = ' + (pior * MM()).toFixed(0) + ' mm');
});

console.log('\n=== 3. Ordenacao entre curvas ===');
{
  const segs = A.allSegs();
  let pior = 0;
  for (let i = 0; i <= 400; i++) {
    const s = A.sectionAt(A.LOA_SQ * i / 400, segs);
    pior = Math.max(pior, s.zk - s.zs);
    if (QUINADO) pior = Math.max(pior, s.zk - s.zc, s.zc - s.zs, s.yc - s.ys);
  }
  ok(QUINADO ? 'quilha <= chine <= borda e chine dentro da borda' : 'quilha nunca passa da borda',
     pior < 2e-3, 'pior sobreposicao ' + (pior * MM()).toFixed(3) + ' mm');
}

console.log('\n=== 4. A restricao de alisamento segura o que deve ===');
{
  zerar();
  const alvo = A.ORDER[0];
  const n = A.model[alvo].nodes[2];
  const why = A.moveNode(A.model[alvo], 2, n.x, 0.4);
  ok('arrasto que criaria um S e segurado', why !== null, 'motivo: ' + why);
  ok('a curva continua alisada', A.isFair(A.model[alvo]) && inflexao(A.model[alvo].nodes) < 0.02);

  zerar();
  let pior = 0, estados = 0, travados = 0;
  A.ORDER.forEach(k => {
    const nn = A.model[k].nodes.length;
    for (let idx = 1; idx < nn - 1; idx++) {
      for (let d = -8; d <= 8; d++) {
        zerar();
        const nd = A.model[k].nodes[idx];
        if (A.moveNode(A.model[k], idx, nd.x, nd.y + d * 0.12) !== null) travados++;
        estados++;
        A.ORDER.forEach(j => { pior = Math.max(pior, inflexao(A.model[j].nodes)); });
        if (A.validate(A.model) !== null) pior = 9;
      }
    }
  });
  ok(estados + ' estados alcancaveis, nenhuma inflexao', pior < 0.02,
     'pior ' + (pior * 100).toFixed(3) + ' % · ' + travados + ' arrastos segurados');
  zerar();
}

console.log('\n=== 5. Os nos nao saem da folha ===');
{
  let fugiu = 0, apertou = 0;
  A.ORDER.forEach(k => {
    const nn = A.model[k].nodes.length;
    for (let idx = 0; idx < nn; idx++) {
      [+40, -40].forEach(d => {
        zerar();
        const nd = A.model[k].nodes[idx];
        A.moveNode(A.model[k], idx, nd.x + d, nd.y + d);
        const lim = A.model[k].view === 'plan' ? [0.0, A.VIEW.y] : [A.VIEW.zBot, A.VIEW.zTop];
        const y = A.model[k].nodes[idx].y;
        if (y < lim[0] - 1e-6 || y > lim[1] + 1e-6) fugiu++;
        const arr = A.model[k].nodes;
        for (let j = 0; j < arr.length - 1; j++) if (arr[j + 1].x - arr[j].x < 0.29) apertou++;
      });
    }
  });
  ok('nenhum no sai do quadro desenhado', fugiu === 0);
  ok('balizas continuam ordenadas em x', apertou === 0);
  zerar();
}

console.log('\n=== 6. Dimensoes principais ===');
{
  zerar();
  const M = A.metrics();
  console.log('   LOA ' + (M.loa / 1000).toFixed(3) + ' m · boca ' + (M.boa / 1000).toFixed(3) +
              ' m · C/B ' + M.ratio.toFixed(2) + ' · pontal ' + M.depthMid.toFixed(0) + ' mm' +
              (M.cm !== undefined ? ' · Cm ' + M.cm.toFixed(3) : ''));
  ok('todas as dimensoes sao numeros finitos',
     [M.loa, M.boa, M.ratio, M.depthMid, M.maxAtPct].every(v => isFinite(v)));
  ok('C/B numa faixa plausivel de embarcacao', M.ratio > 1.8 && M.ratio < 8,
     M.ratio.toFixed(2));
  ok('boca maxima dentro do casco', M.maxAtPct >= 0 && M.maxAtPct <= 100,
     M.maxAtPct.toFixed(1) + ' % do CT, da popa');
}

console.log('\n=== 7. Tabela de cotas ===');
{
  zerar();
  const rows = A.offsetRows(A.metrics());
  ok('uma linha por baliza', rows.length === A.NST, rows.length + ' linhas');
  ok('nenhum valor invalido', rows.every(r => Object.values(r).flat().every(v => isFinite(v))));
  ok('quilha abaixo da borda em toda a tabela', rows.every(r => r.zk <= r.zs + 1e-9));
  const linhas = A.tsv().split('\n').filter(l => /^\d+\t/.test(l));
  ok('TSV com uma linha por baliza', linhas.length === A.NST);
  ok('TSV sem separador de milhar que parta um campo',
     linhas.every(l => l.split('\t').slice(1).every(v => !/\d[.,]\d{3}(\D|$)/.test(v.replace(',', '.')) || /^\d+[.,]\d$/.test(v))),
     linhas[Math.min(2, linhas.length - 1)]);
}

console.log('\n=== 8. Desenho ===');
{
  zerar();
  [['planta', A.renderPlan], ['perfil', A.renderProf], ['balizas', A.renderBody]].forEach(([nome, fn]) => {
    const svg = fn();
    ok(nome + ': sem NaN nem undefined', !/NaN|undefined|Infinity/.test(svg), svg.length + ' chars');
    const abre = (svg.match(/<(line|circle|path|text|polyline|g)\b/g) || []).length;
    const fecha = (svg.match(/\/>/g) || []).length + (svg.match(/<\/(g|text)>/g) || []).length;
    ok(nome + ': marcacao equilibrada', abre === fecha, abre + ' abertos, ' + fecha + ' fechados');
  });
  ok('a cota do espacamento entre balizas aparece', /class="diml"/.test(A.renderPlan()));
  ok('as balizas geradas aparecem', (A.renderBody().match(/class="sect/g) || []).length >= A.NST);
}

console.log('\n=== 9. Estiramento nao estoura a moldura ===');
{
  const cantos = [[1, 1], [1.15, 1.2], [0.55, 0.55], [1.15, 0.55], [0.55, 1.2]];
  let pior = 0, onde = '';
  cantos.forEach(([ky, kz]) => {
    zerar();
    A.ui.ky = ky; A.ui.kz = kz;
    const segs = A.allSegs();
    for (let i = 0; i <= 200; i++) {
      const s = A.sectionAt(A.LOA_SQ * i / 200, segs);
      const fy = s.ys * ky, fz = Math.max(s.zs, s.zk) * kz;
      const ex = Math.max(fy - A.VIEW.y, fz - A.VIEW.zTop);
      if (ex > pior) { pior = ex; onde = 'ky=' + ky + ' kz=' + kz; }
    }
  });
  A.ui.ky = 1; A.ui.kz = 1; zerar();
  ok('a geometria cabe no quadro em todo o curso dos cursores', pior < 0.02,
     pior > 0 ? 'sobra ' + pior.toFixed(3) + ' qd em ' + onde : '5 combinacoes extremas');
}

console.log('\n' + (falhas ? 'FALHAS: ' + falhas : 'todas as ' + passes + ' verificacoes passaram') +
            '   (' + passes + '/' + (passes + falhas) + ')');
process.exit(falhas ? 1 : 0);
