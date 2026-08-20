# Casco de bojo redondo

Modelo: `assets/modelo-redondo.html`. Saída: `Casco-Redondo-<Nome>.html`.

## Três curvas e uma forma de baliza

| Chave | Vista | O que é |
|---|---|---|
| `planSheer` | planta | meia-boca da borda |
| `profSheer` | perfil | altura da borda |
| `profKeel`  | perfil | altura da quilha |

Sem chine não existe vértice para quebrar a baliza em trechos retos: ela é **uma curva
contínua** da quilha à borda. A forma vem de uma super-elipse:

```
(y / Y)^p + (1 − z / D)^p = 1
```

com `Y` = meia-boca na borda, `D` = pontal local, e `p` o único parâmetro de forma:

| p | Forma | Cm |
|---|---|---|
| 1,0 | V reto | 0,500 |
| 1,5 | V cheio | 0,684 |
| 2,0 | semi-elipse | 0,785 |
| 2,3 | U típico de lancha a remo ou vela | 0,827 |
| 3,0 | U bem cheio | 0,883 |
| 4,0 | quase caixa | 0,927 |

Ela entrega, de graça, o que o croqui mostra: **topo vertical** no encontro com a borda
(a boca máxima está no convés) e **tangente horizontal** na linha de centro (fundo
arredondado, sem quina).

## Ajustar p aos pontos medidos

Leia 5 a 7 pontos sobre a metade direita da seção mestra, normalize por `Y` e `D`, e
ajuste `p` por mínimos quadrados. `scripts/homografia.py --secao` faz isso e imprime o
resíduo. No croqui de referência: **p = 2,32, resíduo eficaz 1,0 % da meia-boca**, pior
ponto 1,9 % no joelho do bojo.

Resíduo acima de 4 % significa que a seção não é uma super-elipse — provavelmente tem
chine suave ou tumblehome. Diga isso em vez de forçar o ajuste.

## Cheia ao longo do comprimento

A baliza afina em direção à proa. A distribuição é uma fração do valor da meia-nau,
suavizada por smoothstep, que chega com derivada nula dos dois lados da meia-nau:

```js
function fullAt(x){
  var r, f;
  if(x <= MID_X){ r = x/MID_X;                  f = 0.93 + 0.07*(3*r*r - 2*r*r*r); }
  else          { r = (x-MID_X)/(LOA_SQ-MID_X); f = 1.00 - 0.38*(3*r*r - 2*r*r*r); }
  return Math.max(1.05, ui.pmid*f);
}
```

Ajuste os coeficientes 0,93 e 0,38 se o croqui mostrar seções de proa mais ou menos
finas. O cursor **Cm** escala a distribuição inteira.

## Bloco do projeto

```js
var LOA_SQ = 20;
NST = 6;
var SPEC = { planSheer:{...}, profSheer:{...}, profKeel:{...} };
var ORDER = ['planSheer','profSheer','profKeel'];
var RAW = { ... };
var PHOTO_PTS = [[meia_boca, altura_acima_da_quilha], ...];   /* pontos da secao */
var MID_X = 8;
ui.pmid = 2.32;      /* p ajustado na secao mestra */
```

## Restrição própria deste modelo

Só `quilha ≤ borda`. Não há chine para ordenar.

## Tabela de cotas

Casco redondo não tem chine para tabelar. A tabela dá **meias-bocas em linhas de água**
fracionárias do pontal local — um quarto, metade e três quartos — mais altura de quilha
e de borda. É o formato que se usa numa forma redonda.

## O cursor Cm fica no plano de balizas

Diferente dos cursores de estiramento, que ficam na barra do topo, o cursor **Cm** mora
logo abaixo do cursor de **Baliza**, dentro do painel do plano de balizas: é ele que muda
a forma da seção, então fica ao lado do desenho que altera.
