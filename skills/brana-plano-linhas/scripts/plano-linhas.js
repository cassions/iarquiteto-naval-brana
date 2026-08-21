// Plano de linhas em PDF, duas folhas A3, a partir de uma tabela de cotas.
//
// Serve casco redondo e casco quinado, com espelho no plano inclinado (quando a tabela
// declara) ou face vertical (quando nao declara). Todas as curvas e todos os numeros saem
// de superficie.js - uma superficie unica - e o layout de layout.js.
//
//   node plano-linhas.js <tabela> <saida.pdf> "<titulo>" "<subtitulo>" [escala]
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
/* Argumentos por nome. --sub e --titulo tem padrao construido a partir do proprio casco,
   para o selo sair com as mesmas informacoes do modelo mesmo quando quem chama nao as sabe. */
const A = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)=([\s\S]*)$/); if (m) A[m[1]] = m[2]; });
if (!A.tabela) { console.error('uso: node plano-linhas.js --tabela=<arq> --saida=<pdf> [--titulo=] [--sub=] [--autor=] [--escala=]'); process.exit(2); }
const S = require(path.join(__dirname, 'superficie.js')).montar(A.tabela);
const L = require(path.join(__dirname, 'layout.js')).calcular(S.R, +A.escala || null);
const { R, C, parsed } = S;
const { ESC, k, MG, PXo, PZb, BY0, AY0, D1, D2, D3, PX, PZ, AY, BZ, BY, FT } = L;

const MM = 2.834645;
const mm = v => Math.round(v).toLocaleString('pt-BR');     // milimetro sempre inteiro
const gr = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const semExt = path.basename(R.arquivo).replace(/\.[^.]+$/, '');
const TITULO = A.titulo || semExt.replace(/[-_]espelho[-_ ]?-?\d+g?/i, '').replace(/[-_]+/g, ' ')
  .toUpperCase().replace(/(\d)\s*M(?![A-Z])/g, '$1 m');
/* Largura real do Helvetica: a estimativa de 0,5 x corpo subestima maiusculas, e um
   subtitulo comprido cruzava a moldura do selo - a conferencia reprovava e o PDF nao era
   entregue. Aqui ele e encurtado por partes ate caber. */
const LARG_HELV = { M: 0.68, m: 0.52, d: 0.556, e: 0.278, o: 0.5 };
function largReal(txt, size) {
  let w = 0;
  for (const ch of String(txt)) {
    if (ch === ' ') w += LARG_HELV.e;
    else if (/[0-9]/.test(ch)) w += LARG_HELV.d;
    else if (/[A-ZÁÂÃÇÉÊÍÓÔÕÚ]/.test(ch)) w += LARG_HELV.M;
    else if (/[a-záâãçéêíóôõú]/.test(ch)) w += LARG_HELV.m;
    else w += LARG_HELV.o;
  }
  return w * size / MM;
}
function abrevia(nome) {
  const p = String(nome).trim().split(/\s+/);
  if (p.length < 2) return p[0] || '';
  /* particulas em minuscula (de, da, dos, e) nao rendem inicial */
  const resto = p.slice(1).filter(x => /^[A-ZÁÂÃÇÉÊÍÓÔÕÚ]/.test(x[0] || ''));
  if (!resto.length) return p[0];
  return p[0] + ' ' + resto.map(x => x[0].toUpperCase() + '.').join(' ');
}
const SUB = A.sub || (function () {
  const LIM = 420 - 2 * MG - 104 - 55 - 4;      /* do inicio do subtitulo a divisoria do selo */
  const casco = 'Casco ' + (R.temChine ? 'quinado' : 'de bojo redondo') +
                ', comprimento total ' + mm(R.LOA) + ' mm';
  const esp = R.inclinado ? 'espelho a ' + gr(Math.abs(R.rakeGraus)) + '° da vertical'
                          : 'espelho reto na última baliza a ré';
  const cotas = 'cotas de ' + path.basename(R.arquivo);
  const junta = ps => ps.filter(Boolean).join('  ·  ');
  const tenta = [
    () => junta([casco, esp, cotas, A.autor && 'desenho de ' + A.autor]),
    () => junta([casco, esp, cotas, A.autor && 'desenho de ' + abrevia(A.autor)]),
    () => junta([casco, esp, A.autor && 'desenho de ' + abrevia(A.autor)]),
    () => junta([casco, esp])
  ];
  for (const t of tenta) { const s = t(); if (largReal(s, FT.sub) <= LIM) return s; }
  return junta([casco, esp]);
})();

/* extremos, balancos e a baliza da roda */
const xPopa = R.xPopa, xProa = R.xProa, LOA = R.LOA;
const proaSec = S.sec(R.TMAX);
const ultBal = R.balizas[R.balizas.length - 1];
const balPopa = R.xBaliza0 - xPopa, balProa = xProa - ultBal.x;
const espelho = S.contornoEspelho(100);
const CHINE = R.temChine;

/* ================================================================== PDF ===== */
function Doc() { this.pages = []; }
Doc.prototype.page = function (w, h) { const p = { w: w * MM, h: h * MM, ops: [] }; this.pages.push(p); return p; };
function esc(s) {
  return String(s).replace(/[—–]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...')
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
/* Um NaN escapando para o content stream faz o leitor abortar o resto da folha em
   silencio - metade do desenho simplesmente nao aparece. Melhor estourar aqui. */
const n2 = v => {
  if (!isFinite(v)) throw new Error('coordenada nao finita no desenho: ' + v);
  return (Math.round(v * 100) / 100).toString();
};
const larguraTxt = (s, size) => String(s).length * size * 0.5 / MM;
const P = {
  cor: (p, r, g, b) => p.ops.push(n2(r) + ' ' + n2(g) + ' ' + n2(b) + ' RG'),
  fill: (p, r, g, b) => p.ops.push(n2(r) + ' ' + n2(g) + ' ' + n2(b) + ' rg'),
  esp: (p, w) => p.ops.push(n2(w) + ' w'),
  trac: (p, a) => p.ops.push(a ? '[' + a.map(n2).join(' ') + '] 0 d' : '[] 0 d'),
  linha: (p, x1, y1, x2, y2) => p.ops.push(n2(x1 * MM) + ' ' + n2(y1 * MM) + ' m ' + n2(x2 * MM) + ' ' + n2(y2 * MM) + ' l S'),
  poli: (p, pts) => {
    if (pts.length < 2) return;
    let s = n2(pts[0][0] * MM) + ' ' + n2(pts[0][1] * MM) + ' m';
    for (let i = 1; i < pts.length; i++) s += ' ' + n2(pts[i][0] * MM) + ' ' + n2(pts[i][1] * MM) + ' l';
    p.ops.push(s + ' S');
  },
  ret: (p, x, y, w, h) => p.ops.push(n2(x * MM) + ' ' + n2(y * MM) + ' ' + n2(w * MM) + ' ' + n2(h * MM) + ' re S'),
  retF: (p, x, y, w, h) => p.ops.push(n2(x * MM) + ' ' + n2(y * MM) + ' ' + n2(w * MM) + ' ' + n2(h * MM) + ' re f'),
  txt: (p, x, y, s, size, bold, align, r, g, b) => {
    const w = larguraTxt(s, size);
    const xx = align === 'c' ? x - w / 2 : align === 'r' ? x - w : x;
    p.ops.push('q ' + n2(r || 0) + ' ' + n2(g || 0) + ' ' + n2(b || 0) + ' rg BT ' + (bold ? '/F2' : '/F1') +
      ' ' + n2(size) + ' Tf ' + n2(xx * MM) + ' ' + n2(y * MM) + ' Td (' + esc(s) + ') Tj ET Q');
  },
  txtV: (p, x, y, s, size, bold, r, g, b) => {
    p.ops.push('q ' + n2(r || 0) + ' ' + n2(g || 0) + ' ' + n2(b || 0) + ' rg BT ' + (bold ? '/F2' : '/F1') +
      ' ' + n2(size) + ' Tf 0 1 -1 0 ' + n2(x * MM) + ' ' + n2(y * MM) + ' Tm (' + esc(s) + ') Tj ET Q');
  },
  img: (p, nome, x, y, w, h) => p.ops.push('q ' + n2(w * MM) + ' 0 0 ' + n2(h * MM) + ' ' +
    n2(x * MM) + ' ' + n2(y * MM) + ' cm /' + nome + ' Do Q')
};
function cotaH(p, x1, x2, y, txt, size) {
  P.esp(p, 0.22); P.cor(p, 0.1, 0.1, 0.1); P.trac(p, null);
  P.linha(p, x1, y, x2, y);
  P.linha(p, x1, y - 1.3, x1, y + 1.3);
  P.linha(p, x2, y - 1.3, x2, y + 1.3);
  P.txt(p, (x1 + x2) / 2, y + 1.8, txt, size || FT.cota, true, 'c');
}
function cotaV(p, y1, y2, x, txt, size) {
  const sz = size || FT.cota;
  P.esp(p, 0.22); P.cor(p, 0.1, 0.1, 0.1); P.trac(p, null);
  P.linha(p, x, y1, x, y2);
  P.linha(p, x - 1.3, y1, x + 1.3, y1);
  P.linha(p, x - 1.3, y2, x + 1.3, y2);
  P.txtV(p, x - 1.6, (y1 + y2) / 2 - larguraTxt(txt, sz) / 2, txt, sz, true);
}

/* --------------------------------------------------- logotipo Brana (PNG -> PDF) */
function carregaLogo() {
  /* na skill o logotipo mora em assets/; solto, fica ao lado do script */
  const cand = [path.join(__dirname, '..', 'assets', 'brana-logo.txt'),
                path.join(__dirname, 'brana-logo.txt')];
  const achado = cand.find(c => fs.existsSync(c));
  if (!achado) throw new Error('nao achei brana-logo.txt em ' + cand.join(' nem '));
  const uri = fs.readFileSync(achado, 'utf8').trim();
  const b = Buffer.from(uri.split(',')[1], 'base64');
  let p = 8, larg = 0, alt = 0, plte = null, trns = null;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), tipo = b.slice(p + 4, p + 8).toString();
    const d = b.slice(p + 8, p + 8 + len);
    if (tipo === 'IHDR') { larg = b.readUInt32BE(p + 8); alt = b.readUInt32BE(p + 12); }
    else if (tipo === 'PLTE') plte = d;
    else if (tipo === 'tRNS') trns = d;
    else if (tipo === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bruto = zlib.inflateSync(Buffer.concat(idat));
  const idx = Buffer.alloc(larg * alt);
  let q = 0;
  for (let y = 0; y < alt; y++) {
    const filtro = bruto[q++];
    for (let x = 0; x < larg; x++) {
      const cru = bruto[q + x];
      const a = x > 0 ? idx[y * larg + x - 1] : 0;
      const bb = y > 0 ? idx[(y - 1) * larg + x] : 0;
      const cc = (x > 0 && y > 0) ? idx[(y - 1) * larg + x - 1] : 0;
      let v;
      if (filtro === 0) v = cru;
      else if (filtro === 1) v = cru + a;
      else if (filtro === 2) v = cru + bb;
      else if (filtro === 3) v = cru + ((a + bb) >> 1);
      else {
        const pp = a + bb - cc, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - cc);
        v = cru + (pa <= pb && pa <= pc ? a : (pb <= pc ? bb : cc));
      }
      idx[y * larg + x] = v & 0xff;
    }
    q += larg;
  }
  const rgb = Buffer.alloc(larg * alt * 3);
  for (let i = 0; i < larg * alt; i++) {
    const c = idx[i], a = trns && c < trns.length ? trns[c] / 255 : 1;
    for (let j = 0; j < 3; j++) rgb[i * 3 + j] = Math.round(plte[c * 3 + j] * a + 255 * (1 - a));
  }
  return { larg: larg, alt: alt, dados: zlib.deflateSync(rgb) };
}
const LOGO = carregaLogo();

function render(doc) {
  const objs = [];
  const add = s => { objs.push(s); return objs.length; };
  const idCat = add(null), idPages = add(null);
  const idF1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const idF2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const idImg = add('<< /Type /XObject /Subtype /Image /Width ' + LOGO.larg + ' /Height ' + LOGO.alt +
    ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ' + LOGO.dados.length +
    ' >>\nstream\n' + LOGO.dados.toString('latin1') + '\nendstream');
  const kids = [];
  doc.pages.forEach(pg => {
    const cont = pg.ops.join('\n');
    const ruim = cont.match(/NaN|Infinity|undefined/g);
    if (ruim) throw new Error('content stream com ' + ruim.length + ' token invalido');
    const idC = add('<< /Length ' + Buffer.byteLength(cont, 'latin1') + ' >>\nstream\n' + cont + '\nendstream');
    const idP = add(null);
    objs[idP - 1] = '<< /Type /Page /Parent ' + idPages + ' 0 R /MediaBox [0 0 ' + n2(pg.w) + ' ' + n2(pg.h) + ']' +
      ' /Resources << /Font << /F1 ' + idF1 + ' 0 R /F2 ' + idF2 + ' 0 R >> /XObject << /Lg ' + idImg + ' 0 R >> >>' +
      ' /Contents ' + idC + ' 0 R >>';
    kids.push(idP);
  });
  objs[idCat - 1] = '<< /Type /Catalog /Pages ' + idPages + ' 0 R >>';
  objs[idPages - 1] = '<< /Type /Pages /Kids [' + kids.map(x => x + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
  /* Comentario binario: a spec recomenda, e leitores estritos o usam para tratar o arquivo
     como binario em vez de texto. */
  let out = '%PDF-1.4\n%' + String.fromCharCode(226, 227, 207, 211) + '\n';
  const off = [];
  objs.forEach((o, i) => { off.push(Buffer.byteLength(out, 'latin1')); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xr = Buffer.byteLength(out, 'latin1');
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  off.forEach(o => { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + idCat + ' 0 R >>\nstartxref\n' + xr + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}

/* ============================================================== FOLHA 1 ===== */
const doc = new Doc();
const pg = doc.page(420, 297);
const CINZA = [0.62, 0.62, 0.62], VERM = [0.65, 0.10, 0.10], AZUL = [0.15, 0.35, 0.6];
const EXT = [0.5, 0.5, 0.5];

function selo(p, titulo, sub, dir) {
  P.esp(p, 0.4); P.cor(p, 0, 0, 0); P.trac(p, null);
  P.ret(p, MG, 297 - MG - 26, 420 - 2 * MG, 26);
  P.linha(p, MG + 50, 297 - MG - 26, MG + 50, 297 - MG);
  P.linha(p, 420 - MG - 104, 297 - MG - 26, 420 - MG - 104, 297 - MG);
  P.img(p, 'Lg', MG + 5, 297 - MG - 18, 40, 40 * LOGO.alt / LOGO.larg);
  P.txt(p, MG + 55, 297 - MG - 11, titulo, FT.titulo, true);
  P.txt(p, MG + 55, 297 - MG - 20, sub, FT.sub);
  dir.forEach((l, i) => P.txt(p, 420 - MG - 100, 297 - MG - 9 - i * 6, l, i ? FT.seloB : FT.seloA, i === 0));
  P.txt(p, 420 - MG - 100, 297 - MG - 25, 'Brana · Projetos Navais', FT.assin);
}
selo(pg, TITULO + '  -  PLANO DE LINHAS', SUB,
  ['Escala 1:' + ESC + '   folha 1/2',
   'LOA ' + mm(LOA) + '   LWL ' + mm(R.Lwl),
   'BOA ' + mm(R.BOA) + '   BWL ' + mm(R.BWL)]);

/* ---------------------------------------------------------------- PERFIL ---- */
P.txt(pg, PXo, PZ(R.zBordaMax) + 6, 'PERFIL', FT.vista, true);
P.esp(pg, 0.15); P.cor(pg, ...CINZA); P.trac(pg, [1.2, 1.2]);
R.wls.forEach(z => { if (z !== R.DWL) P.linha(pg, PX(xPopa) - 1, PZ(z), PX(xProa) + 6, PZ(z)); });
R.balizas.forEach(b => P.linha(pg, PX(b.x), PZ(0) - 3, PX(b.x), PZ(R.zBordaMax) + 2));
P.trac(pg, null);
/* linhas de chamada dos extremos e das pontas das cotas */
P.esp(pg, 0.12); P.cor(pg, ...EXT);
P.linha(pg, PX(xPopa), PZ(R.espAlto.z), PX(xPopa), D3 - 2);
P.linha(pg, PX(xProa), PZ(proaSec.zk), PX(xProa), D3 - 2);
P.linha(pg, PX(R.xBaliza0), PZ(0) - 3, PX(R.xBaliza0), D1 - 2);
P.linha(pg, PX(ultBal.x), PZ(0) - 3, PX(ultBal.x), D1 - 2);
P.linha(pg, PX(R.xProaDWL), PZ(R.DWL), PX(R.xProaDWL), D2 - 2);
P.esp(pg, 0.3); P.cor(pg, 0, 0, 0);
P.linha(pg, PX(xPopa) - 1, PZ(0), PX(xProa) + 8, PZ(0));
P.txt(pg, PX(xProa) + 9, PZ(0) - 1.2, 'BASE', FT.ref, true);
P.esp(pg, 0.45); P.cor(pg, ...VERM); P.trac(pg, [4, 1.5, 1, 1.5]);
P.linha(pg, PX(xPopa) - 1, PZ(R.DWL), PX(xProa) + 8, PZ(R.DWL));
P.txt(pg, PX(xProa) + 9, PZ(R.DWL) - 1.2, 'DWL', FT.ref, true, null, ...VERM);
P.trac(pg, null);
P.esp(pg, 0.3); P.cor(pg, ...AZUL);
R.buts.forEach(yb => S.planoAlto(yb, 300).forEach(tr => P.poli(pg, tr.map(q => [PX(q[0]), PZ(q[1])]))));
P.esp(pg, 0.75); P.cor(pg, 0, 0, 0);
P.poli(pg, S.quilha(300).map(q => [PX(q[0]), PZ(q[1])]));
P.poli(pg, S.borda(300).map(q => [PX(q[0]), PZ(q[1])]));
if (CHINE) P.poli(pg, S.chine(300).map(q => [PX(q[0]), PZ(q[1])]));
P.linha(pg, PX(xProa), PZ(proaSec.zk), PX(xProa), PZ(proaSec.zs));
/* espelho: reta inclinada quando a tabela declara o plano, vertical quando nao */
P.linha(pg, PX(R.espBaixo.x), PZ(R.espBaixo.z), PX(R.espAlto.x), PZ(R.espAlto.z));
/* O rotulo vai ACIMA da borda no extremo de popa: no meio da altura do espelho ele cai
   sobre a linha do chine ou sobre um plano do alto. */
P.txt(pg, PX(R.espAlto.x) + 2, PZ(R.espAlto.z) + 4,
  R.inclinado ? 'espelho ' + gr(Math.abs(R.rakeGraus)) + '° da vertical' : 'espelho vertical', FT.esp, true);
R.wls.forEach(z => P.txt(pg, PX(xPopa) - 5.5, PZ(z) - 1.1, mm(z), FT.alt, false, 'r'));

const b0 = R.balizas[0], b1 = R.balizas[1];
cotaV(pg, PZ(R.DWL), PZ(R.DWL + R.espWL), PX(xProa) + 16, mm(R.espWL));
P.txt(pg, PX(xProa) + 18.5, PZ(R.DWL + R.espWL / 2) - 4, 'LA', FT.legCota, true);
/* nivel 1: balanco de popa, espacamento das balizas, balanco de proa.  Um balanco nulo
   (a baliza cai exatamente no extremo) nao rende cota: vai como nota. */
if (balPopa > 2) {
  cotaH(pg, PX(xPopa), PX(R.xBaliza0), D1, mm(balPopa));
  P.txt(pg, (PX(xPopa) + PX(R.xBaliza0)) / 2, D1 - 4.6, 'popa', FT.legCota, true, 'c');
}
cotaH(pg, PX(b0.x), PX(b1.x), D1, mm(R.espBal));
P.txt(pg, PX(b1.x) + 3, D1 - 0.7, 'esp. balizas', FT.legCota, true);
if (balProa > 2) {
  cotaH(pg, PX(ultBal.x), PX(xProa), D1, mm(balProa));
  P.txt(pg, (PX(ultBal.x) + PX(xProa)) / 2, D1 - 4.6, 'proa', FT.legCota, true, 'c');
}
cotaH(pg, PX(R.xBaliza0), PX(R.xProaDWL), D2, 'LWL = ' + mm(R.Lwl) + ' mm', FT.cotaGr);
cotaH(pg, PX(xPopa), PX(xProa), D3, 'LOA = ' + mm(LOA) + ' mm', FT.cotaGr);

/* --------------------------------------------------- PLANO DE BALIZAS ------- */
P.txt(pg, BY0, BZ(R.zBordaMax) + 9, 'PLANO DE BALIZAS', FT.vista, true, 'c');
P.esp(pg, 0.15); P.cor(pg, ...CINZA); P.trac(pg, [1.2, 1.2]);
R.wls.forEach(z => { if (z !== R.DWL) P.linha(pg, BY(-R.mbMax) - 0.5, BZ(z), BY(R.mbMax) + 0.5, BZ(z)); });
R.buts.forEach(yb => [-1, 1].forEach(sg => P.linha(pg, BY(sg * yb), BZ(0) - 3, BY(sg * yb), BZ(R.zBordaMax) + 2)));
P.trac(pg, null);
P.esp(pg, 0.3); P.cor(pg, 0, 0, 0);
P.linha(pg, BY(-R.mbMax) - 0.5, BZ(0), BY(R.mbMax) + 0.5, BZ(0));
P.esp(pg, 0.45); P.cor(pg, ...VERM); P.trac(pg, [4, 1.5, 1, 1.5]);
P.linha(pg, BY(-R.mbMax) - 0.5, BZ(R.DWL), BY(R.mbMax) + 0.5, BZ(R.DWL));
P.linha(pg, BY(0), BZ(0) - 7, BY(0), BZ(R.zBordaMax) + 1);
P.trac(pg, null);
P.txt(pg, BY(0), BZ(R.zBordaMax) + 2.5, 'CL', FT.ref, true, 'c', ...VERM);
/* O plano de balizas usa a MESMA linha de base e as mesmas linhas d agua do perfil, na
   mesma altura de papel: ficam so as duas referencias, e o lugar sobra para os numeros. */
P.txt(pg, BY(-R.mbMax) - 2.5, BZ(0) - 1.1, 'BASE', FT.alt, true, 'r');
P.txt(pg, BY(-R.mbMax) - 2.5, BZ(R.DWL) - 1.1, 'DWL', FT.alt, true, 'r', ...VERM);

/* O plano de balizas se divide na BOCA MAXIMA, nao na baliza do meio: e o que faz cada
   bordo receber secoes que se encaixam monotonamente. Dividir pelo meio do comprimento
   joga balizas dos dois lados da boca maxima no mesmo bordo, e elas se cruzam - foi o que
   aconteceu neste casco, com a boca maxima a 1.713 de 6.000. */
const meio = R.xMbMax;
const grupos = { '-1': [], '1': [] };
let degeneradas = [];
P.esp(pg, 0.6); P.cor(pg, 0, 0, 0);
R.balizas.forEach(b => {
  const sg = b.x <= meio ? -1 : 1;
  const sc = S.secao(Math.min(b.x, xProa));
  const yMax = sc.length ? Math.max(...sc.map(q => q[0])) : 0;
  if (sc.length < 2 || yMax < 1) { degeneradas.push(b.n); return; }   // baliza colapsada na roda
  P.poli(pg, sc.map(q => [BY(sg * q[0]), BZ(q[1])]));
  const t = sc[sc.length - 1];
  grupos[sg].push({ n: b.n, y: sg * t[0], z: t[1], sg: sg });
});
/* Rotulos das balizas no plano de balizas.
   As secoes se aglomeram: no meio do casco a boca varia pouco, e num casco quinado com boca
   maxima no meio as pontas da borda de tres ou quatro balizas caem dentro de um milimetro de
   papel. Numerar cada uma no seu proprio lugar embaralha a leitura. O que resolve e uma
   FILEIRA igualmente espacada acima do desenho, ordenada pela posicao real da baliza (assim
   as linhas de chamada nunca se cruzam), com uma chamada fina de cada secao ate o seu numero. */
const yRot = BZ(R.zBordaMax) + 3;
[-1, 1].forEach(sg => {
  const g = grupos[sg];
  if (!g.length) return;
  const nat = g.map(r => ({ r: r, x: BY(r.y) + sg * 2.6 })).sort((a, b) => a.x - b.x);
  const passo = Math.max(larguraTxt('00', FT.balBody) + 1.7,
                         (nat[nat.length - 1].x - nat[0].x) / Math.max(1, nat.length - 1));
  const total = passo * (nat.length - 1);
  let x0 = nat[0].x;
  if (sg < 0) x0 = Math.min(x0, BY(0) - 4 - total); else x0 = Math.max(x0, BY(0) + 4);
  x0 = Math.max(x0, MG + 2);
  if (x0 + total > 420 - MG - 2) x0 = 420 - MG - 2 - total;
  nat.forEach((o, i) => {
    const xr = x0 + i * passo;
    P.esp(pg, 0.12); P.cor(pg, 0.45, 0.45, 0.45); P.trac(pg, null);
    P.linha(pg, BY(o.r.y), BZ(o.r.z), xr, yRot - 0.7);
    P.txt(pg, xr, yRot, String(o.r.n), FT.balBody, true, 'c');
  });
});
P.esp(pg, 0.5); P.cor(pg, ...VERM); P.trac(pg, [2, 1.4]);
/* o espelho e uma baliza de re: vai so no bordo de re, para nao poluir o de vante */
P.poli(pg, espelho.map(e => [BY(-e.y), BZ(e.z)]));
P.trac(pg, null);
cotaH(pg, BY(-R.espBut), BY(0), BZ(0) - 9, mm(R.espBut));
P.txt(pg, BY(-R.espBut) - 3, BZ(0) - 8.2, 'esp. planos do alto', FT.legCota, true, 'r');
P.txt(pg, BY(-R.mbMax * 0.5), BZ(0) - 16, 'contorno do espelho tracejado', FT.legCota, true, 'c', ...VERM);

/* ------------------------------------------------------------------ TOPO ---- */
/* Sem cotas: o TOPO fica com as linhas, os numeros das balizas e as alturas dos planos do
   alto. Toda a cotagem longitudinal esta no perfil. */
P.txt(pg, PXo, AY(R.mbMax) + 16.5, 'TOPO', FT.vista, true);
P.esp(pg, 0.15); P.cor(pg, ...CINZA); P.trac(pg, [1.2, 1.2]);
R.buts.forEach(yb => P.linha(pg, PX(xPopa) - 1, AY(yb), PX(xProa) + 6, AY(yb)));
R.balizas.forEach(b => P.linha(pg, PX(b.x), AY(0) - 3, PX(b.x), AY(R.mbMax) + 2));
P.trac(pg, null);
P.esp(pg, 0.35); P.cor(pg, ...AZUL);
R.wls.forEach(z => {
  if (z === R.DWL) return;
  S.linhaAgua(z, 300).forEach(tr => P.poli(pg, tr.map(q => [PX(q[0]), AY(Math.max(0, q[1]))])));
});
P.esp(pg, 0.65); P.cor(pg, ...VERM);
S.linhaAgua(R.DWL, 300).forEach(tr => P.poli(pg, tr.map(q => [PX(q[0]), AY(Math.max(0, q[1]))])));
P.esp(pg, 0.75); P.cor(pg, 0, 0, 0);
P.poli(pg, S.bordaTopo(300).map(q => [PX(q[0]), AY(q[1])]));
if (CHINE) P.poli(pg, S.chineTopo(300).map(q => [PX(q[0]), AY(q[1])]));
P.esp(pg, 0.5); P.cor(pg, ...VERM); P.trac(pg, [2, 1.4]);
P.poli(pg, espelho.map(e => [PX(e.x), AY(e.y)]));
P.trac(pg, null);
P.esp(pg, 0.45); P.cor(pg, ...VERM); P.trac(pg, [4, 1.5, 1, 1.5]);
P.linha(pg, PX(xPopa) - 1, AY(0), PX(xProa) + 8, AY(0));
P.trac(pg, null);
P.txt(pg, PX(xProa) + 9, AY(0) - 1.2, 'CL', FT.ref, true, null, ...VERM);
R.buts.forEach(yb => P.txt(pg, PX(xPopa) - 5.5, AY(yb) - 1.1, mm(yb), FT.alt, false, 'r'));
P.cor(pg, 0, 0, 0);
R.balizas.forEach(b => P.txt(pg, PX(b.x), AY(0) - 8, String(b.n), FT.balTopo, true, 'c'));
P.txt(pg, PX(xPopa) - 5.5, AY(0) - 8, 'BALIZA', FT.alt, true, 'r');
P.txt(pg, PX(R.xMbMax) + 8, AY(R.mbMax) + 9.5, 'BOA = ' + mm(R.BOA) + ' mm  (2 x ' + mm(R.mbMax) + ')', FT.boaBwl, true);
P.txt(pg, PX(R.xMbMax) + 8, AY(R.mbMax) + 3, 'BWL = ' + mm(R.BWL) + ' mm  (2 x ' + mm(R.mbWL) + ')', FT.boaBwl, true, null, ...VERM);

/* ------------------------------------------------ convencao das linhas ------ */
const { LX, LY, LW, LH, NX, NY, NW, NH } = L;
P.esp(pg, 0.3); P.cor(pg, 0, 0, 0); P.trac(pg, null);
P.ret(pg, LX, LY, LW, LH);
P.txt(pg, LX + 4, LY + LH - 7, 'CONVENÇÃO DAS LINHAS', FT.cx, true);
const legendas = [
  [() => { P.esp(pg, 0.75); P.cor(pg, 0, 0, 0); P.trac(pg, null); },
   CHINE ? 'contorno do casco: quilha, chine, borda e roda' : 'contorno do casco: quilha, borda e roda de proa'],
  [() => { P.esp(pg, 0.5); P.cor(pg, ...VERM); P.trac(pg, [2, 1.4]); },
   R.inclinado ? 'contorno do espelho, no plano inclinado' : 'contorno do espelho, face vertical'],
  [() => { P.esp(pg, 0.65); P.cor(pg, ...VERM); P.trac(pg, null); },
   "linha d'água de projeto (DWL) no TOPO"],
  [() => { P.esp(pg, 0.35); P.cor(pg, ...AZUL); P.trac(pg, null); },
   "linhas d'água no TOPO, planos do alto no PERFIL"],
  [() => { P.esp(pg, 0.45); P.cor(pg, ...VERM); P.trac(pg, [4, 1.5, 1, 1.5]); },
   'referências: linha de base, DWL e CL'],
  [() => { P.esp(pg, 0.15); P.cor(pg, ...CINZA); P.trac(pg, [1.2, 1.2]); },
   "malha: balizas, linhas d'água e planos do alto"]
];
legendas.forEach((l, i) => {
  const y = LY + LH - 15 - i * 6.2;
  l[0](); P.linha(pg, LX + 5, y + 1.2, LX + 24, y + 1.2);
  P.trac(pg, null); P.txt(pg, LX + 28, y, l[1], FT.cxTxt);
});

/* ------------------------------------------------------ notas do plano ------ */
P.esp(pg, 0.3); P.cor(pg, 0, 0, 0);
P.ret(pg, NX, NY, NW, NH);
P.txt(pg, NX + 4, NY + NH - 7, 'NOTAS DO PLANO', FT.cx, true);
const balTxt = (balPopa > 2 || balProa > 2)
  ? 'Balanços: ' + (balPopa > 2 ? mm(balPopa) + ' mm da baliza ' + b0.n + ' ao extremo de popa' : 'nulo a popa') +
    ' e ' + (balProa > 2 ? mm(balProa) + ' mm da baliza ' + ultBal.n + ' ao extremo de proa' : 'nulo a proa') + '.'
  : 'Balanços nulos: a baliza ' + b0.n + ' coincide com o extremo de popa e a baliza ' + ultBal.n + ' com a roda de proa.';
[
  'Linha de base tangente ao ponto mais baixo da quilha; CL divide os bordos; DWL a 300 mm da base.',
  "Balizas a " + mm(R.espBal) + " mm (LWL/10 = " + mm(R.espBal_exato) + "); linhas d'água a " + mm(R.espWL) +
    ' mm (300/3); planos do alto a ' + mm(R.espBut) + ' mm (BOA/6 = ' + mm(R.espBut_exato) + ').',
  'Baliza ' + b0.n + ' em x = ' + mm(R.xBaliza0) + ', onde a DWL encontra o fundo do casco no CL a popa. LWL medido dela até x = ' + mm(R.xProaDWL) + '.',
  balTxt,
  R.inclinado
    ? 'Espelho a ' + gr(Math.abs(R.rakeGraus)) + '° da vertical, do pé em x = ' + mm(R.espBaixo.x) + ' ao topo em x = ' + mm(R.espAlto.x) + '. A baliza 0 só existe da DWL para cima.'
    : 'Espelho como face vertical em x = ' + mm(R.espBaixo.x) + ' (a tabela não declara inclinação de plano): z de ' + mm(R.espBaixo.z) + ' a ' + mm(R.espAlto.z) + '.'
].forEach((t, i) => P.txt(pg, NX + 4, NY + NH - 15 - i * 6.2, t, FT.cxTxt));

/* ============================================================== FOLHA 2 ===== */
const pg2 = doc.page(420, 297);
selo(pg2, TITULO + '  -  TABELA DE COTAS',
  'Meias-bocas do CL e alturas acima da linha de base, em milímetros inteiros',
  ['folha 2/2',
   'Balizas a ' + mm(R.espBal) + " mm  ·  linhas d'água a " + mm(R.espWL) + ' mm',
   R.inclinado ? 'Espelho a ' + gr(Math.abs(R.rakeGraus)) + '° da vertical' : 'Espelho vertical em x = ' + mm(R.espBaixo.x)]);

const bal = R.balizas;
const cotas = bal.map(b => S.cotasEm(Math.min(b.x, xProa)));
const linhasT = [];
R.wls.slice().reverse().forEach(z => linhasT.push({
  rot: (z === R.DWL ? 'DWL ' + mm(z) : 'LA ' + mm(z)), dwl: z === R.DWL,
  vals: cotas.map(c => c.wl[z] === null || c.wl[z] === undefined ? '-' : mm(c.wl[z]))
}));
linhasT.push({ sep: true });
linhasT.push({ rot: 'Altura da quilha', vals: cotas.map(c => c.zk === null ? '-' : mm(c.zk)) });
if (CHINE) {
  linhasT.push({ rot: 'Altura do chine', vals: cotas.map(c => mm(c.zc)) });
  linhasT.push({ rot: 'Meia-boca no chine', vals: cotas.map(c => mm(c.yc)) });
}
linhasT.push({ rot: 'Altura da borda', vals: cotas.map(c => mm(c.zs)) });
linhasT.push({ rot: 'Meia-boca na borda', vals: cotas.map(c => mm(c.ys)) });

/* Notas da folha 2, montadas antes para a altura de linha da tabela sair do que resta. */
const notas2 = [
  'Fonte única: ' + path.basename(R.arquivo) + ' (' + parsed.rows.length + ' balizas, casco ' + R.modo + ').',
  'Todas as medidas em milímetros inteiros, arredondadas. A reconstrução do casco usa os valores originais da tabela.',
  R.inclinado
    ? 'ESPELHO: a tabela representa o espelho como face plana vertical, mas o cabeçalho dela declara a posição e a inclinação do plano real.'
    : 'ESPELHO: a tabela não declara inclinação de plano, então o espelho entra como a face vertical da primeira baliza, em x = ' + mm(R.espBaixo.x) + '.',
  R.inclinado
    ? '   O casco é o folheado que passa pelas balizas da tabela com a baliza do espelho assentada nesse plano, a ' + gr(Math.abs(R.rakeGraus)) + '° da vertical.'
    : '   Se o espelho for inclinado no projeto, declarar o plano na tabela muda a popa do desenho: vale conferir.',
  'Esp. das balizas: LWL/10 = ' + mm(R.espBal_exato) + ' mm arredondado a ' + mm(R.espBal) + ' mm (múltiplo de 50).',
  'Esp. dos planos do alto: BOA/6 = ' + mm(R.espBut_exato) + ' mm arredondado a ' + mm(R.espBut) +
    ' mm (múltiplo de 100): ' + R.buts.map(mm).join(', ') + ' mm do CL.',
  'A tabela declara alturas acima do ponto mais baixo da quilha. A quilha reconstruída tem mínimo de ' + mm(R.minQuilha) +
    ' mm em x = ' + mm(R.xMinQuilha) + ' mm.',
  'Perfil, TOPO, plano de balizas e esta tabela saem todos da MESMA superfície. As curvas do desenho são polilinhas achatadas',
  '   adaptativamente contra a forma exata: conferido, ficam a menos de 20 micrometros de papel na escala 1:' + ESC + '.',
  'Um traço "-" indica linha d\'água acima da borda ou abaixo da quilha naquela baliza.'
];
const vazias = R.wls.filter(z => cotas.every(c => c.wl[z] === null));
if (vazias.length) notas2.push('Linhas d\'água sem nenhum valor: ' + vazias.map(z => 'LA ' + mm(z)).join(', ') +
  ' - ficam fora do casco em todas as balizas do plano.');
if (degeneradas.length) notas2.push('Baliza ' + degeneradas.join(', ') +
  ': coincide com a roda de proa, onde a meia-boca é zero. Sem seção no plano de balizas.');
if (cotas.some(c => c.truncada)) notas2.push('Onde a altura da quilha sai vazia, o plano do espelho trunca a baliza: o fundo dela é o próprio espelho.');

const LB = 50, cw = (420 - 2 * MG - LB) / bal.length, c0 = MG + LB;
const ty = 297 - MG - 42;
const nData = linhasT.filter(l => !l.sep).length;
/* altura de linha: o que couber entre o cabecalho e o bloco de notas */
const rh = Math.max(5.6, Math.min(8.8, (ty - 18 - (30 + 7 + notas2.length * 5.3)) / nData));

P.fill(pg2, ...VERM); P.retF(pg2, MG, ty - rh + 2, 420 - 2 * MG, rh);
P.txt(pg2, MG + 2.5, ty - rh + 5, 'BALIZA', FT.tabHdr, true, null, 1, 1, 1);
bal.forEach((b, i) => P.txt(pg2, c0 + i * cw + cw / 2, ty - rh + 5, String(b.n), FT.tabNum, true, 'c', 1, 1, 1));
P.txt(pg2, MG + 2.5, ty - rh - 5.2, 'x (mm)', FT.tabRot, true);
bal.forEach((b, i) => P.txt(pg2, c0 + i * cw + cw / 2, ty - rh - 5.2, mm(b.x), FT.tabCel, false, 'c'));

let yy = ty - rh - 12.5;
linhasT.forEach(l => {
  if (l.sep) { P.cor(pg2, 0, 0, 0); P.esp(pg2, 0.35); P.linha(pg2, MG, yy + rh * 0.58, 420 - MG, yy + rh * 0.58); yy -= 3.2; return; }
  if (l.dwl) { P.fill(pg2, 0.96, 0.90, 0.90); P.retF(pg2, MG, yy - 2.4, 420 - 2 * MG, rh - 0.9); }
  P.txt(pg2, MG + 2.5, yy, l.rot, FT.tabRot, l.dwl);
  l.vals.forEach((v, i) => P.txt(pg2, c0 + i * cw + cw / 2, yy, v, FT.tabCel, false, 'c'));
  P.cor(pg2, 0.82, 0.82, 0.82); P.esp(pg2, 0.15);
  P.linha(pg2, MG, yy - 2.9, 420 - MG, yy - 2.9);
  yy -= rh;
});
P.cor(pg2, 0, 0, 0); P.esp(pg2, 0.4);
P.ret(pg2, MG, yy + rh * 0.72, 420 - 2 * MG, (ty - rh + 2) - (yy + rh * 0.72));

let ny = yy - 6;
P.txt(pg2, MG, ny, 'NOTAS', FT.cx, true); ny -= 7;
notas2.forEach(t => { P.txt(pg2, MG + 2.5, ny, t, FT.nota); ny -= 5.3; });

const saida = A.saida || 'plano-de-linhas.pdf';
fs.writeFileSync(saida, render(doc));
/* Linha estruturada para quem chama este script: mais confiavel que raspar a prosa. */
console.log('RESUMO=' + JSON.stringify({
  arquivo: saida, kb: +(fs.statSync(saida).size / 1024).toFixed(0), escala: ESC,
  folhas: doc.pages.length, modo: R.modo, chine: !!CHINE, nBalTab: parsed.rows.length,
  inclinado: R.inclinado, rake: R.inclinado ? +Math.abs(R.rakeGraus).toFixed(1) : 0,
  espPe: Math.round(R.espBaixo.x), espTopo: Math.round(R.espAlto.x),
  LOA: Math.round(LOA), LWL: Math.round(R.Lwl), BOA: Math.round(R.BOA), BWL: Math.round(R.BWL),
  bal0: b0.n, balN: ultBal.n, espBal: R.espBal, espBalExato: Math.round(R.espBal_exato),
  espWL: R.espWL, espBut: R.espBut, espButExato: Math.round(R.espBut_exato), buts: R.buts,
  balPopa: Math.round(balPopa), balProa: Math.round(balProa),
  nBalizas: bal.length, nLinhasTab: nData, degeneradas: degeneradas, avisos: R.avisos || [],
  sub: SUB, titulo: TITULO,
  wlVazias: vazias.map(z => Math.round(z)), truncadas: cotas.filter(c => c.truncada).length
}));
console.log(saida + '  ' + (fs.statSync(saida).size / 1024).toFixed(1) + ' KB, 2 folhas A3, escala 1:' + ESC);
console.log('  casco ' + R.modo + ', ' + parsed.rows.length + ' balizas na tabela; espelho ' +
  (R.inclinado ? gr(Math.abs(R.rakeGraus)) + '° da vertical' : 'vertical em x = ' + mm(R.espBaixo.x)));
console.log('  LOA ' + mm(LOA) + '  LWL ' + mm(R.Lwl) + '  BOA ' + mm(R.BOA) + '  BWL ' + mm(R.BWL));
console.log('  balizas ' + b0.n + '..' + ultBal.n + ' a ' + mm(R.espBal) + ' mm (LWL/10 = ' + mm(R.espBal_exato) + ')');
console.log('  planos do alto a ' + mm(R.espBut) + ' mm (BOA/6 = ' + mm(R.espBut_exato) + '): ' + R.buts.map(mm).join(', '));
console.log('  balancos: popa ' + mm(balPopa) + ' mm, proa ' + mm(balProa) + ' mm' +
  (degeneradas.length ? '   (baliza ' + degeneradas.join(',') + ' colapsada na roda)' : ''));
console.log('  layout: PZb ' + PZb + '  AY0 ' + AY0 + '  BY0 ' + BY0 + '  cotas em ' + D1 + '/' + D2 + '/' + D3);
console.log('  tabela ' + nData + ' linhas x ' + bal.length + ' balizas, rh ' + rh.toFixed(2) +
  ' mm; ultima nota em y = ' + (ny + 5.3).toFixed(1) + ' mm (margem ' + MG + ')');
