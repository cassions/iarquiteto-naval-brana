# Casco de bojo redondo

Modelo: `assets/modelo-redondo.html`. Saída: `Plano-de-Linhas-Redondo-<Nome>.html`.

> **Antes de seguir: a seção mestra inverte a curvatura perto da quilha?** Se inverte, o
> casco **não** é redondo, e a referência certa é a
> [07-modelo-quilha-cheia.md](07-modelo-quilha-cheia.md). No redondo a meia-boca cresce
> cada vez mais devagar da quilha ao convés, sempre côncava, com tangente horizontal na
> linha de centro. Na quilha cheia ela sobe estreita e quase vertical junto à quilha,
> abre numa garganta e só então vira taça — a seção em wineglass. Não decida no olho:
> `homografia.py --secao` ajusta as duas famílias e diz qual reduz o resíduo.

## Três curvas e uma forma de baliza

| Chave | Vista | O que é |
|---|---|---|
| `planSheer` | planta | meia-boca da borda |
| `profSheer` | perfil | altura da borda |
| `profKeel`  | perfil | altura da quilha |

Ordem: `['planSheer','profSheer','profKeel']`. Sem chine não existe vértice para quebrar a
baliza em trechos retos: ela é **uma curva contínua** da quilha à borda. A forma vem de
uma super-elipse:

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
ajuste `p` por mínimos quadrados. `homografia.py --secao` faz isso e imprime o resíduo. No
croqui de referência: **p = 2,32, resíduo eficaz 1,0 % da meia-boca**, pior ponto 1,9 % no
joelho do bojo.

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

Os coeficientes 0,93 e 0,38 são `cheia.re` e `1 − cheia.vante`; mexa neles se o croqui
mostrar seções de proa mais ou menos finas. O cursor **Cm** escala a distribuição inteira.

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

## O projeto.json deste casco

É o **único** arquivo que você escreve, e você não escreve tudo dele. Dois scripts gravam
direto no arquivo, fundindo com o que já estiver lá — não copie a saída deles de volta:

```bash
# grava secao.pts e cheia.p; a secao vai em quadrados (meia-boca, altura sobre a quilha)
python scripts/homografia.py --secao 0,0 0.735,0.039 ... 3.536,3.083 --projeto projeto.json

# grava curvas e medidos
python scripts/ajustar.py --loa-sq 20 --projeto projeto.json \
    --curva planSheer 0,2.542 3.96,3.288 ... --curva profSheer ... --curva profKeel ...
```

À mão sobram a identificação, as dimensões, as frações de cheia e o `registro`:

```json
{
  "casco": "redondo",
  "nome": "Fulano",
  "titulo": "Casco Redondo",
  "loa_m": 6.0, "loa_sq": 20, "balizas": 6, "mid_x": 8,
  "curvas": {
    "planSheer": [[0,2.542,0.26313],[3.96,3.288,0.11362], ..., [20,0,-0.53325]],
    "profSheer": [[0,2.969,0.04672], ..., [20,4.011,0.05545]],
    "profKeel":  [[0,0.945,-0.25644],[4.25,0.203,-0.09268], ..., [20,4.011,0.92662]]
  },
  "medidos": { "planSheer": [[0,2.542],[4.02,3.288], ...], "profSheer": [...],
               "profKeel": [...] },
  "secao":   { "pts": [[0,0],[0.735,0.039],[1.7,0.234], ..., [3.536,3.083]] },
  "cheia":   { "p": 2.32, "re": 0.93, "vante": 0.62 },
  "registro": { "calibracao": "…", "notas": ["…"] }
}
```

Os `...` são corte desta página: `curvas`, `medidos` e `secao` saem inteiros dos scripts.
Arrays sempre compactos, um ponto por linha no máximo — nunca um número por linha: o mesmo
arquivo custa 383 tokens compacto e 1.001 com `indent=2` explodindo os números.

Obrigatórios: `casco`, `nome`, `loa_m` (metros, informado pela pessoa), `loa_sq`
(quadrados da malha, não metros nem balizas), `balizas`, `mid_x` (a coordenada X da
meia-nau, não o número da baliza) e `curvas`. `titulo` e `subtitulo` são opcionais — sem
`titulo`, o padrão vem do tipo de casco. Os demais:

| Campo | Padrão | O que é |
|---|---|---|
| `medidos` | — | pontos lidos na foto; viram as cruzes das vistas |
| `secao.pts` | — | seção mestra reprojetada, `[meia_boca, altura_acima_da_quilha]`; vai tracejada sobre o plano de balizas |
| `cheia.p` | 2,32 | expoente da super-elipse, ajustado na seção mestra. O padrão é o do croqui de referência, não o do seu — deixe o script gravar |
| `cheia.re` | 0,93 | fração da cheia da meia-nau no espelho |
| `cheia.vante` | 0,62 | fração da cheia da meia-nau na proa |
| `registro` | — | `{ "calibracao": "…", "notas": ["…"] }`. Só fato deste barco |

Nada de `alefriz` nem de `cheia.exp_vante` aqui: são campos de quilha cheia.

Não escreva o que é derivado: `montar.py` e o motor cuidam de rótulos, camadas de
exportação, ordem das curvas, `fixLast` e o vínculo das curvas de perfil no topo da roda,
escala, altura dos painéis, limites dos nós, `viewBox`, espaçamento das balizas e posição
dos números — e do bloco `var` do modelo, que você nunca digita.

## O que escrever no `registro`

Só fato deste croqui. O painel do documento já traz gravada, acima do seu texto, a seção
estática *Como isto é feito*: a homografia e a tolerância de 0,05 quadrado, o alisamento
por convexidade, a super-elipse e o que o expoente `p` significa, e por que a cheia é
suavizada por *smoothstep* ao longo do comprimento. Não reescreva nada disso — é idêntico
em toda corrida, e reescrevê-lo é pagar de novo pela mesma prosa.

No `registro` vão: resíduo da calibração; o `p` ajustado e o resíduo desse ajuste, que é o
que diz se a família serve para este croqui; o Cm que sai dele contra o integrado no
desenho; as frações de cheia adotadas a ré e a vante; a verificação independente da seção
mestra contra a meia-boca máxima da planta; toda discordância entre vistas e qual você
adotou; e quanto cada nó foi deslocado. Teste cada frase com *"ela seria idêntica para
outro croqui?"* — se for, é método, e método já está no modelo.
