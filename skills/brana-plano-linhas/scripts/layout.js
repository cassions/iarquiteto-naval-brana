// Layout da folha do plano de linhas, derivado do tamanho do casco.
//
// O arranjo e sempre o mesmo - PERFIL em cima a esquerda, PLANO DE BALIZAS a direita, TOPO
// no meio, quadros no pe - mas a escala e as coordenadas saem do casco, senao um casco de
// 6 m nao cabe na mesma folha A3 de um de 3,8 m. As duas restricoes que mandam:
//
//   horizontal: o perfil (LOA) e o plano de balizas (2 x meia-boca) lado a lado
//   vertical:   o perfil (pontal) e o TOPO (meia-boca) empilhados
//
// Escala escolhida entre as normalizadas, a maior que couber.
'use strict';

const PADRAO = [10, 12.5, 15, 20, 25, 30, 40, 50, 75, 100];
const FOLGA_H = 356;                 // mm de papel para LOA + boca, descontadas margens e cotas
const FOLGA_V = 100.6;               // mm de papel para pontal + meia-boca empilhados

function escolherEscala(R) {
  for (const E of PADRAO)
    if ((R.LOA + 2 * R.mbMax) / E <= FOLGA_H && (R.zBordaMax + R.mbMax) / E <= FOLGA_V) return E;
  return PADRAO[PADRAO.length - 1];
}

function calcular(R, escFixa) {
  const ESC = escFixa || escolherEscala(R), k = 1 / ESC, MG = 14;
  const w = R.mbMax * k;                                   // meia-largura do plano de balizas
  const BY0 = Math.round(420 - MG - 6 - w);                // CL do plano de balizas
  const PXo = 20;                                          // x = 0 do casco, no papel
  const PZb = Math.round(243 - R.zBordaMax * k);            // linha de base do perfil
  const D1 = PZb - 9, D2 = PZb - 21, D3 = PZb - 32;         // tres niveis de cota
  /* O TOPO fica centrado na faixa que sobra entre os quadros do pe e a cota mais baixa. */
  const topoAlt = 8 + w + 20.4;
  const y0 = 76, y1 = D3 - 6;
  const AY0 = Math.round(y0 + 8 + Math.max(0, (y1 - y0) - topoAlt) / 2);
  return {
    ESC: ESC, k: k, MG: MG, PXo: PXo, PZb: PZb, BY0: BY0, AY0: AY0,
    D1: D1, D2: D2, D3: D3,
    PX: x => PXo + x * k, PZ: z => PZb + z * k,
    AY: y => AY0 + y * k, BZ: z => PZb + z * k, BY: y => BY0 + y * k,
    SELO_H: 26, SELO_BASE: 297 - MG - 26,
    LX: 20, LY: 22, LW: 124, LH: 48,                        // quadro da convencao
    NX: 152, NY: 22, NW: 420 - MG - 152, NH: 48,            // quadro das notas
    FT: {
      titulo: 15, sub: 8.5, seloA: 9, seloB: 8, assin: 7.5,
      vista: 11, alt: 7, ref: 7.5, esp: 7,
      cota: 7.2, cotaGr: 8, legCota: 6.5,
      balTopo: 7.5, balBody: 6.5, boaBwl: 8,
      cx: 9.5, cxTxt: 7.6,
      tabHdr: 8, tabNum: 8.5, tabCel: 7.4, tabRot: 7.6, nota: 7.4
    }
  };
}
module.exports = { calcular: calcular, escolherEscala: escolherEscala, PADRAO: PADRAO };
