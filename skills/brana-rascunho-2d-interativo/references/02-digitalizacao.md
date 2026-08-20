# Digitalizar as cotas

Trabalhe em **quadrados da malha**, não em milímetros. A escala absoluta entra só no
fim, pelo LOA informado.

## Sistema de coordenadas

- `X` — 0 no espelho de popa, `LOA_SQ` na roda de proa.
- `Y` — meia-boca a partir da linha de centro (vista superior).
- `Z` — altura acima do **ponto mais baixo da quilha** (vista lateral).

O datum de Z é o ponto mais fundo da linha de quilha, não o espelho: em casco com
balanço a quilha sobe para as duas pontas.

## Procedimento

1. Em cada baliza, leia em pixels a borda superior e a inferior do contorno na vista
   superior; devolva as duas pela inversa de H; a meia-boca é a **semidiferença** e o
   desvio da linha de centro é a semissoma.
2. Na vista lateral, leia cada linha (borda, quilha, e o chine se houver) em várias
   estações, incluindo os pontos notáveis: espelho, ponto mais fundo da quilha, e onde a
   curvatura muda de ritmo.
3. Ache o ponto mais fundo da quilha e use-o como Z = 0.
4. Leia a seção mestra: cantos do convés, e para casco redondo mais 5 a 7 pontos ao
   longo da metade direita.

## Confira o alisamento ANTES de ajustar

Calcule as declividades entre pontos consecutivos de cada curva. **Elas têm de ser
monótonas** — só decrescentes, ou só crescentes.

```
meia-boca: 1,690  2,226  2,356  2,271  2,031  1,597  0,963  0,000
declives:    0,298  0,066 -0,042 -0,119 -0,210 -0,309 -0,472   -> monótono, sem inflexão
```

Se não for monótono, **o erro é seu, não do croqui**: refaça a leitura do ponto que
quebra a sequência. Nos dois croquis de referência os dados brutos já eram livres de
inflexão; alisar foi ajustar splines pelos pontos, não corrigir a forma.

## Dos pontos para os nós da spline

Escolha 4 a 6 nós por curva, nos pontos notáveis. Para cada nó, a declividade `m` tem de
satisfazer, em cada trecho entre nós:

```
m[i] + m[i+1] ≈ 2 · c[i]          onde c[i] é a declividade da corda do trecho
```

e a sequência `m[0] … m[n]` tem de ser **monótona**, no mesmo sentido das cordas. Resolva
da ponta onde a curva é mais bem definida para a outra. É isso que faz a spline de
Hermite passar pelos pontos e ficar alisada de primeira.

Um nó com declividade zero marca o máximo (a boca máxima, na vista superior) ou o mínimo
(o ponto mais fundo da quilha).

## Verificação independente

A **seção mestra é desenhada à parte** e a calibração não a usou. Compare:

- meia-boca do convés na seção × meia-boca máxima da vista superior;
- pontal da seção × pontal medido na vista lateral.

Concordância de 2 a 3 % confirma a calibração. Discordância maior é informação real
sobre o croqui — relate qual vista você adotou e por quê. Em ambos os projetos de
referência a **largura** bateu bem (0,7 % e 2,3 %) e a **altura** discordou mais (5 a
8 %): a regra é tirar meias-bocas da planta e alturas do perfil.
