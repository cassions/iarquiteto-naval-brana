#!/usr/bin/env node
// Verifica um plano de linhas gerado por esta skill: quinado, redondo ou quilha cheia.
//
//   node scripts/verificar.js Plano-de-Linhas-Quilha-Cheia-Fulano.html
//
// Carrega o <script> do arquivo num DOM de mentira e exercita o modelo. Nesta skill,
// todo defeito real apareceu ao testar, nao ao ler o codigo — por isso este passo nao
// e opcional.
'use strict';
const fs = require('fs');

/* --resumo: cala as linhas de PASSOU e as secoes, mantendo falhas, dimensoes e placar.
   A saida completa custa ~1.200 tokens; o resumo custa ~30. Quando algo falhar, rode
   de novo sem --resumo para ver o detalhe. */
const RESUMO = process.argv.includes('--resumo');
const grita = console.log.bind(console);      // sai sempre
if (RESUMO) console.log = () => {};           // o resto cala
const ARQ = process.argv.slice(2).find(a => a.indexOf('--') !== 0);
if (!ARQ) { console.error('uso: node verificar.js [--resumo] <arquivo.html>'); process.exit(2); }

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
// Nem todo modelo declara tudo. sectY/sectCm/sectThroat/rabbetZ/pinchAt/fullAt/PHOTO_PTS
// so existem em parte deles, e NST nao existe nos arquivos da geracao antiga. Um
// identificador que nao foi declarado, escrito cru dentro do objeto literal, joga
// ReferenceError e derruba a carga do arquivo INTEIRO — nao apenas aquele campo. O unico
// jeito de tocar num nome possivelmente inexistente sem estourar e o operador typeof, que
// nunca lanca. Por isso cada nome sai embrulhado: o que faltar chega aqui como undefined,
// e quem consome verifica antes de usar.
const EXPORTA = (
  'model,INITIAL,cloneModel,ORDER,SPEC,ui,validate,moveNode,isFair,convexOK,ctrlPoly,' +
  'segments,curvature,evalAt,sectionAt,allSegs,metrics,offsetRows,stationX,RAW,LOA_SQ,VIEW,' +
  'renderPlan,renderProf,renderBody,tsv,NST,' +
  /* maquinaria da baliza analitica: redondo tem parte, quilha cheia tem tudo */
  'sectY,sectCm,sectThroat,rabbetZ,pinchAt,fullAt,PHOTO_PTS,MID_X'
).split(',');
const INJECAO = '__api={' +
  EXPORTA.map(n => n + ':(typeof ' + n + '!=="undefined"?' + n + ':undefined)').join(',') + '};';
src = src.replace('})();', INJECAO + '\n})();');
src = 'var __api;\n' + src.replace('"use strict";', '') + '\n__api;';

// eval DIRETO roda o codigo no escopo lexico deste arquivo: qualquer const/let daqui com
// o mesmo nome de um identificador do modelo entra no caminho — se estiver na zona morta
// (declarado mais abaixo), ate um typeof estoura, e a carga morre. eval INDIRETO, que e o
// que esta chamada por referencia produz, roda em escopo global e nao ve nada deste
// arquivo. O modelo so precisa dos globais do DOM de mentira, que ja estao la.
const evalGlobal = eval;
let A;
try { A = evalGlobal(src); }
catch (e) { console.error('ERRO ao carregar o modelo: ' + e.message); process.exit(2); }

// O typeof deixa a carga passar mesmo com um modelo capenga, entao o minimo comum aos
// tres tipos e conferido aqui, com mensagem que diz o que faltou.
const FALTA = ['model', 'INITIAL', 'cloneModel', 'ORDER', 'ui', 'allSegs', 'sectionAt',
               'metrics', 'offsetRows', 'LOA_SQ'].filter(n => A[n] === undefined);
if (FALTA.length) { console.error('ERRO: o modelo nao expoe ' + FALTA.join(', ') + '.'); process.exit(2); }

let falhas = 0, passes = 0;
const ok = (n, c, extra) => {
  if (c) { passes++; console.log('  PASSOU  ' + n + (extra ? '   ' + extra : '')); }
  else { falhas++; grita('  FALHOU  ' + n + (extra ? '   ' + extra : '')); }
};
const zerar = () => Object.assign(A.model, A.cloneModel(A.INITIAL));
const MM = () => A.ui.loa * 1000 / A.LOA_SQ;   // mm por quadrado

/* ---------- que tipo de casco e este ---------- */
zerar();
const QUINADO = A.ORDER.indexOf('planChine') >= 0;   // so o quinado tem a curva do chine
// Quilha cheia e redondo tem a mesma lista de curvas, entao ORDER nao separa os dois. O
// que separa e a maquinaria do alefriz: so o modelo de quilha cheia exporta rabbetZ,
// pinchAt e sectThroat, e so nele sectionAt devolve o estrangulamento do pe (.k). O
// redondo exporta sectY e fullAt, mas a baliza dele tem um parametro so.
const QUILHA = !QUINADO &&
  typeof A.rabbetZ === 'function' && typeof A.pinchAt === 'function' &&
  typeof A.sectThroat === 'function' &&
  A.sectionAt(A.LOA_SQ / 2, A.allSegs()).k !== undefined;
const TIPO = QUINADO ? 'QUINADO' : (QUILHA ? 'QUILHA CHEIA' : 'REDONDO');
// NST so aparece a partir dos modelos de tres tipos; nos arquivos antigos o numero de
// balizas estava embutido nos lacos, e se le da propria tabela de cotas.
let NST = A.NST;
if (NST === undefined) { try { NST = A.offsetRows(A.metrics()).length; } catch (e) { NST = 0; } }

/* Razao entre o sinal minoritario e o dominante da curvatura: acima de 2% e inflexao real.
   Isto olha SO as curvas LONGITUDINAIS que estao em ORDER — planta e perfil —, que sao
   splines de nos e nao podem virar S. A baliza transversal nao passa por aqui: ela nao e
   spline nenhum, e gerada ponto a ponto por sectY(u,p,k). Num casco de quilha cheia a
   baliza inflexiona por definicao, e e exatamente isso que a secao 10 exige dela. */
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

grita('\n' + ARQ + '  ·  casco ' + TIPO +
            '  ·  ' + A.ORDER.length + ' curvas  ·  ' + NST + ' balizas  ·  ' +
            A.LOA_SQ + ' quadrados');

console.log('\n=== 1. Modelo de partida ===');
zerar();
ok('valido em todas as restricoes', A.validate(A.model) === null, A.validate(A.model) || '');
A.ORDER.forEach(k => ok(k + ' sem inflexao', A.isFair(A.model[k]) && inflexao(A.model[k].nodes) < 0.02,
  (inflexao(A.model[k].nodes) * 100).toFixed(3) + ' %'));
ok('balizas cobrem o casco inteiro',
   Math.abs(A.stationX(1)) < 1e-9 && Math.abs(A.stationX(NST) - A.LOA_SQ) < 1e-9,
   'baliza 1 em X=' + A.stationX(1) + ', baliza ' + NST + ' em X=' + A.stationX(NST));

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
  grita('   LOA ' + (M.loa / 1000).toFixed(3) + ' m · boca ' + (M.boa / 1000).toFixed(3) +
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
  ok('uma linha por baliza', rows.length === NST, rows.length + ' linhas');
  ok('nenhum valor invalido', rows.every(r => Object.values(r).flat().every(v => isFinite(v))));
  ok('quilha abaixo da borda em toda a tabela', rows.every(r => r.zk <= r.zs + 1e-9));
  const linhas = A.tsv().split('\n').filter(l => /^\d+\t/.test(l));
  ok('TSV com uma linha por baliza', linhas.length === NST);
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
  ok('as balizas geradas aparecem', (A.renderBody().match(/class="sect/g) || []).length >= NST);
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

/* =====================================================================================
   SO QUILHA CHEIA — secoes 10 a 14.

   As secoes 1 a 9 olham as curvas longitudinais e o desenho; elas valem para os tres
   tipos e nao dizem nada sobre a forma da baliza. Num casco de quilha cheia a baliza e
   a familia s(u) = [1-(1-u)^p]^k, com p vindo de fullAt(x) e k de pinchAt(x), e e ela
   que carrega a garganta do wineglass. Nada disso existe no quinado nem no redondo,
   entao tudo aqui fica dentro do if.
   ===================================================================================== */
if (QUILHA) {
  zerar();
  const SEGS = A.allSegs();
  const meia = A.sectionAt(A.MID_X, SEGS);

  /* Onde s(u) muda de concavidade. Segunda diferenca numa malha fina: a inflexao tem
     forma fechada, mas conta-la numericamente e o que prova que a formula implementada
     faz o que a formula escrita promete. */
  function inflexoes(p, k) {
    const N = 1500, h = 1 / N, ondes = [];
    let ant = null;
    for (let i = 2; i < N - 1; i++) {
      const u = i * h;
      const d2 = A.sectY(u + h, p, k) - 2 * A.sectY(u, p, k) + A.sectY(u - h, p, k);
      if (Math.abs(d2) < 1e-13) continue;
      const sg = d2 > 0 ? 1 : -1;
      if (ant !== null && sg !== ant) ondes.push(u);
      ant = sg;
    }
    return ondes;
  }

  /* Uma varredura serve as quatro secoes: p, k, pontal local, onde esta a garganta, e se
     ha madeiramento morto SOB aquela baliza — isto e, se o alefriz esta acima do perfil
     da quilha ali. */
  const amostras = [];
  for (let i = 0; i <= 48; i++) {
    const x = A.LOA_SQ * i / 48;
    const sc = A.sectionAt(x, SEGS);
    const d = sc.zs - sc.zk;
    const inf = inflexoes(sc.p, sc.k);
    amostras.push({
      x, p: sc.p, k: sc.k, d, n: inf.length, u: inf.length === 1 ? inf[0] : 0,
      mad: d > 1e-6 && (A.rabbetZ(x) - sc.zk) / d > 0.02,
    });
  }

  console.log('\n=== 10. Quilha cheia: a garganta do wineglass ===');
  {
    const im = inflexoes(meia.p, meia.k);
    ok('a baliza mestra inverte a curvatura', im.length === 1,
       im.length ? 'inflexao em u = ' + im.map(v => v.toFixed(3)).join(', ')
                 : 'NENHUMA inflexao - a curva e so concava');

    /* A garganta E a linha de alefriz. Tem de existir onde o alefriz corre acima do
       perfil da quilha, e tem de SUMIR a vante do ponto em que o pe de roda o alcanca:
       ali o madeiramento esta a vante da baliza, nao embaixo dela, e a secao e corpo
       canoa inteiro. Cai de graca da formula: alvo u = 0 da exatamente k = 1. */
    const multi = amostras.filter(a => a.n > 1).map(a => a.x.toFixed(1));
    const deviaTer = amostras.filter(a => a.mad && a.n === 0).map(a => a.x.toFixed(1));
    const naoDevia = amostras.filter(a => !a.mad && a.n > 0 && a.d > 1e-6).map(a => a.x.toFixed(1));
    const ultimoMad = amostras.filter(a => a.mad).slice(-1)[0];
    ok('nenhuma baliza tem mais de uma inflexao', multi.length === 0,
       multi.length ? 'em x = ' + multi.join(' ') : amostras.length + ' estacoes');
    ok('ha garganta em toda baliza com madeiramento sob ela', deviaTer.length === 0,
       deviaTer.length ? 'faltou em x = ' + deviaTer.join(' ') : '');
    ok('nao ha garganta onde o pe de roda ja alcancou o alefriz', naoDevia.length === 0,
       naoDevia.length ? 'sobrou em x = ' + naoDevia.join(' ')
                       : 'o madeiramento morre em x = ' + (ultimoMad ? ultimoMad.x.toFixed(1) : '0') + ' qd');
  }

  console.log('\n=== 11. Quilha cheia: a curva de cheia ao longo do comprimento ===');
  const cms = amostras.filter(a => a.d > 1e-6).map(a => ({ x: a.x, cm: A.sectCm(a.p, a.k) }));
  {
    /* Cm tem de subir da popa ate a meia-nau e cair dai para a proa. Um Cm que sobe de
       novo perto da proa e o sintoma do exp_vante = 1: a baliza vizinha a proa sai mais
       cheia que a mestra, o que nao existe em casco nenhum. */
    let iMax = 0;
    cms.forEach((c, i) => { if (c.cm > cms[iMax].cm) iMax = i; });
    let sobeAntes = true, desceDepois = true;
    for (let i = 0; i + 1 < iMax; i++) if (cms[i].cm > cms[i + 1].cm + 1e-6) sobeAntes = false;
    for (let i = iMax; i + 1 < cms.length; i++) if (cms[i + 1].cm > cms[i].cm + 1e-6) desceDepois = false;
    ok('Cm sobe ate a meia-nau e desce dai em diante', sobeAntes && desceDepois,
       'Cm ' + cms[0].cm.toFixed(3) + ' -> ' + cms[iMax].cm.toFixed(3) +
       ' -> ' + cms[cms.length - 1].cm.toFixed(3));
    ok('o Cm maximo cai na meia-nau', Math.abs(cms[iMax].x - A.MID_X) < 1.0,
       'maximo em x = ' + cms[iMax].x.toFixed(1) + ' contra meia-nau em ' + A.MID_X.toFixed(2));
  }

  console.log('\n=== 12. Quilha cheia: a baliza mestra contra a secao da foto ===');
  {
    const P = A.PHOTO_PTS || [];
    if (!P.length) console.log('  (sem PHOTO_PTS no arquivo - nada a comparar)');
    else {
      const Y = Math.max.apply(null, P.map(q => q[0])), D = Math.max.apply(null, P.map(q => q[1]));
      let pior = 0, ondePior = 0, soma = 0;
      P.forEach(q => {
        const dv = A.sectY(q[1] / D, meia.p, meia.k) - q[0] / Y;
        soma += dv * dv;
        if (Math.abs(dv) > pior) { pior = Math.abs(dv); ondePior = q[1] / D; }
      });
      ok('a forma gerada segue os pontos da secao da foto', pior < 0.06,
         'pior desvio ' + (pior * 100).toFixed(1) + ' % da meia-boca, em u = ' + ondePior.toFixed(2));
      console.log('          residuo eficaz ' + (Math.sqrt(soma / P.length) * 100).toFixed(2) +
                  ' % da meia-boca');
      /* Cm medido na foto, por trapezios sobre os proprios pontos digitalizados */
      let cmFoto = 0;
      for (let i = 0; i + 1 < P.length; i++)
        cmFoto += (P[i + 1][1] - P[i][1]) / D * (P[i][0] + P[i + 1][0]) / (2 * Y);
      const cmGer = A.sectCm(meia.p, meia.k);
      ok('o Cm gerado bate com o integrado na foto', Math.abs(cmGer - cmFoto) < 0.03,
         'gerado ' + cmGer.toFixed(3) + ' contra ' + cmFoto.toFixed(3) + ' medido');
    }
  }

  console.log('\n=== 13. Quilha cheia: a baliza continua bem-comportada ===');
  {
    /* s(u) e monotona crescente por construcao; se alguma baliza estreitar subindo, e
       porque p ou k saiu da faixa em que a formula vale. */
    const tumble = [];
    amostras.forEach(a => {
      let ant = -1;
      for (let i = 0; i <= 400; i++) {
        const v = A.sectY(i / 400, a.p, a.k);
        if (v < ant - 1e-9) { tumble.push(a.x.toFixed(1)); break; }
        ant = v;
      }
    });
    ok('nenhuma baliza estreita subindo (sem tumblehome)', tumble.length === 0,
       tumble.length ? 'em x = ' + tumble.join(' ') : amostras.length + ' estacoes');
    /* s'(1) = 0 para p > 1: a boca maxima fica no conves e o costado chega vertical la.
       Derivada a re do topo maior que 0.5 quer dizer topo inclinado, boca maxima abaixo. */
    const vert = amostras.filter(a => a.d > 1e-6 &&
      (1 - A.sectY(1 - 1e-4, a.p, a.k)) / 1e-4 > 0.5);
    ok('o costado sobe vertical no conves em todas as balizas', vert.length === 0,
       vert.length ? vert.length + ' balizas com topo inclinado' : '');
  }

  console.log('\n=== 14. Quilha cheia: a linha de alefriz ===');
  {
    /* O alefriz NAO e monotono: ele levanta no tuck ao entrar no cadaste e sobe de leve
       para vante. Logo tem exatamente um ponto de retorno. O que nao pode e oscilar. */
    let viradas = 0, sinalAnt = 0;
    for (let x = 0; x + 0.05 <= A.LOA_SQ; x += 0.05) {
      const dz = A.rabbetZ(x + 0.05) - A.rabbetZ(x);
      if (Math.abs(dz) < 1e-9) continue;
      const sg = dz > 0 ? 1 : -1;
      if (sinalAnt !== 0 && sg !== sinalAnt) viradas++;
      sinalAnt = sg;
    }
    ok('o alefriz nao oscila: no maximo um ponto de retorno', viradas <= 1,
       viradas + ' virada(s) - levanta ' + (A.rabbetZ(0) - A.rabbetZ(2.5)).toFixed(3) +
       ' qd no tuck, sobe ' + (A.rabbetZ(A.LOA_SQ) - A.rabbetZ(2.5)).toFixed(3) + ' qd ate a proa');

    const fora = amostras.filter(a => {
      if (!a.mad) return false;
      const sc = A.sectionAt(a.x, SEGS);
      return A.rabbetZ(a.x) <= sc.zk || A.rabbetZ(a.x) >= sc.zs;
    });
    ok('o alefriz fica entre a quilha e a borda onde ha madeiramento', fora.length === 0,
       fora.length ? fora.length + ' estacoes fora' : '');

    /* Prova de fechamento: reconstroi o alefriz de volta a partir da altura da garganta
       das balizas GERADAS (zk + u*pontal) e compara com a reta de projeto rabbetZ(x). Se
       pinchAt inverteu a formula certo, os dois coincidem. */
    const alef = amostras.filter(a => a.d > 1e-6).map(a => ({ x: a.x, h: a.u * a.d, prof: a.d }));
    let piorRab = 0;
    alef.forEach(a => {
      if (a.h <= 1e-6) return;
      piorRab = Math.max(piorRab, Math.abs(A.sectionAt(a.x, SEGS).zk + a.h - A.rabbetZ(a.x)));
    });
    ok('o alefriz reconstruido bate com a reta de projeto', piorRab < 0.02,
       'pior desvio ' + piorRab.toFixed(4) + ' qd = ' + (piorRab * MM()).toFixed(1) + ' mm');

    console.log('          perfil da garganta (x, altura acima da quilha, em quadrados):');
    const passo = Math.max(1, Math.ceil(alef.length / 9));
    for (let i = 0; i < alef.length; i += passo)
      console.log('            x=' + alef[i].x.toFixed(1).padStart(5) +
                  '  h=' + alef[i].h.toFixed(3) +
                  '  (pontal local ' + alef[i].prof.toFixed(3) + ')');
  }
  zerar();
}

grita('\n' + (falhas ? 'FALHAS: ' + falhas : 'todas as ' + passes + ' verificacoes passaram') +
            '   (' + passes + '/' + (passes + falhas) + ')');
process.exit(falhas ? 1 : 0);
