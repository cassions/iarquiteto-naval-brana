# Casco de quilha cheia (full keel)

Modelo: `assets/modelo-quilha-cheia.html`. Saída: `Plano-de-Linhas-Quilha-Cheia-<Nome>.html`.

## Três curvas — as mesmas do redondo

| Chave | Vista | O que é |
|---|---|---|
| `planSheer` | planta | meia-boca da borda |
| `profSheer` | perfil | altura da borda |
| `profKeel`  | perfil | altura da quilha |

Ordem: `['planSheer', 'profSheer', 'profKeel']`. Não há chine, então não há quarta curva.
A quilha corrida não é uma curva a mais: é uma `profKeel` que corre rasa por metade do
comprimento e sobe num só sentido de curvatura até o topo da roda.

**O que muda é a forma da baliza.** A super-elipse do bojo redondo é côncava em todo o
domínio — não sabe inverter. A baliza de quilha cheia inverte: sobe estreita e quase
vertical junto ao madeiramento morto, abre numa **garganta** e daí vira taça até o convés.

## A família de dois expoentes

```
s(u) = [ 1 − (1−u)^p ] ^ k        u = 0 na quilha, u = 1 no convés
```

`s` é a meia-boca relativa à meia-boca do convés; `u`, a altura relativa ao pontal local.

- `p` — **cheia**. Vem de `fullAt(x)`: o cursor Cm vezes a distribuição longitudinal.
- `k` — **estrangulamento do pé**. Vem de `pinchAt(x, segs)`, calculado a partir da linha
  de alefriz.

Perto da quilha `s ≈ (p·u)^k`: com `k > 1` o pé sobe convexo, como lâmina fina, e a
garganta aparece; com `k = 1` a curva é côncava pura, sem garganta — o corpo canoa
inteiro. As outras propriedades caem de graça: `s(0)=0`, `s(1)=1`, monótona crescente,
`s'(1)=0` para `p>1` (boca máxima no convés) e **no máximo uma** inflexão.

A inflexão tem forma fechada nos dois sentidos:

```
u_garganta = 1 − [ (p−1) / (k·p − 1) ]^(1/p)     dado k, onde fica a garganta
k          = [ (p−1) / (1−u)^p + 1 ] / p         dada a garganta, qual k
```

`pinchAt` usa a segunda. É cálculo direto, sem busca numérica — e tem de ser: ele roda
para cada baliza a cada quadro de arrasto.

## O que cada parâmetro faz

`p` isolado, com `k` travado no valor do croqui de referência (2,372):

| p | Garganta (do pontal) | Cm | Forma |
|---|---|---|---|
| 1,5 | 0,663 | 0,415 | lâmina longa demais — a garganta sai acima do bojo |
| 2,0 | 0,483 | 0,501 | wineglass magra, taça curta |
| 2,5 | 0,379 | 0,566 | wineglass estreita |
| 3,0 | 0,311 | 0,616 | wineglass de veleiro clássico |
| 3,23 | 0,287 | 0,635 | o ajuste do croqui de referência |
| 3,5 | 0,264 | 0,656 | taça cheia |
| 4,0 | 0,229 | 0,688 | U com pé de lâmina |
| 5,0 | 0,181 | 0,738 | quase caixa com pé |

`k` nunca é escolhido: sai da garganta alvo. Com `p = 3,23` fixo:

| Garganta alvo | k | Cm | Nota |
|---|---|---|---|
| 0,00 | 1,000 | 0,764 | corpo canoa: sem garganta |
| 0,10 | 1,280 | 0,728 | |
| 0,20 | 1,729 | 0,683 | |
| 0,288 | 2,378 | 0,635 | o croqui de referência |
| 0,35 | 3,085 | 0,595 | |
| 0,45 | 5,071 | 0,522 | |
| 0,55 | 9,413 | 0,438 | teto do motor |

Leia as duas juntas: **`p` enche a baliza e empurra a garganta para baixo; `k` aperta o pé
e come área.** Cm de wineglass é estruturalmente menor que o de bojo redondo — a garganta
tira área. Não estranhe 0,63 onde a super-elipse de `p = 2,3` daria 0,83.

Dois tetos no motor, que existem por isso: `pinchAt` trava a garganta em `u = 0,55` (acima
disso ela deixaria o madeiramento e viraria bojo) e `fullAt` trava `p` em 1,10 (abaixo de
~1 a curva deixa de ser casco, e a forma fechada da inflexão exige `p > 1`).

## A linha de alefriz

A garganta **não** é uma fração do pontal — é uma **cota absoluta**, e a fração é
consequência dela. O que põe a garganta onde ela está é o topo do madeiramento morto, uma
linha de construção traçada a uma altura acima da base e que praticamente não muda de
altura ao longo do casco. O pontal local, esse muda muito: a quilha sobe para as pontas.
Amarrar a garganta a uma fração do pontal a arrastaria junto com o perfil e poria
madeiramento onde não há.

```js
function rabbetZ(x){
  var z = RAB_Z0 + RAB_SUBIDA*(x - MID_X), r;
  if(x < RAB_TLEN){ r = (RAB_TLEN - x)/RAB_TLEN; z += RAB_TUCK*r*r; }
  return z;
}
```

Três parcelas: a cota na meia-nau, a subida linear para vante (o madeiramento afina) e o
levantamento do tuck ao entrar no cadaste. O termo do tuck é **quadrático, não
smoothstep**: a smoothstep chega plana em `x = 0` e criava um biquinho de alefriz junto ao
espelho.

### O madeiramento morre sozinho no pé de roda

`pinchAt` mede `u = (rabbetZ(x) − z_quilha) / (z_borda − z_quilha)`. Onde o perfil da
quilha sobe e alcança o alefriz, esse `u` chega a zero: ali não existe mais madeiramento
**sob** a baliza — ele está à vante dela, não embaixo. `pinchAt` devolve 1, a seção vira
corpo canoa inteiro e a garganta some.

Isso não é caso especial escrito à mão. Alvo `u = 0` dá `k = [(p−1)/1 + 1]/p = 1`
exatamente, e é por isso que a garganta desaparece sem degrau, sozinha, na estação certa.

## Como se obtém `alefriz.z0`

Do ajuste da seção mestra, nunca de palpite. `homografia.py --secao` ajusta `p` e `k` aos
pontos medidos (comparando com a super-elipse), tira a garganta pela forma fechada e leva-a
à cota:

```
z0 = z_quilha(MID_X) + u_garganta(p, k) · [ z_borda(MID_X) − z_quilha(MID_X) ]
```

Passe `--meia-nau z_quilha,z_borda` — as duas cotas na meia-nau, em quadrados, lidas de
`profKeel` e `profSheer` — e ele faz essa conta e grava `alefriz.z0` no `projeto.json`.
Sem `--meia-nau` ele só imprime a fórmula, e a conta sobra para você.

`subida`, `tuck` e `extensao` **não** são medidas: são valores de projeto, a prática de
traçado de quilha corrida. Padrões 0,010 / 0,40 / 2,5. Só deixam de ser arbitrados se o
croqui trouxer uma segunda seção — de preferência a do espelho, que é quem fixa o tuck.
Diga no relatório que esses três foram arbitrados.

## Distribuição de cheia, e por que `exp_vante = 0.7`

```js
function fullAt(x){
  var r, f;
  if(x <= MID_X){ r = x/MID_X;                  f = FULL_RE + (1-FULL_RE)*(3*r*r - 2*r*r*r); }
  else          { r = (x-MID_X)/(LOA_SQ-MID_X); f = 1.00 - (1-FULL_VANTE)*Math.pow(3*r*r - 2*r*r*r, FULL_EXP); }
  return Math.max(1.10, ui.pmid*f);
}
```

A ré é a do modelo redondo. À vante a smoothstep é elevada a `FULL_EXP`, e o motivo é que
aqui a garganta está **desacoplada** da cheia: perto da proa ela some, e uma baliza sem
garganta é muito mais cheia com o mesmo `p` — em `p = 3,23`, Cm 0,764 sem garganta contra
0,635 com ela. Se `p` não cair depressa o bastante, o Cm da baliza vizinha à proa sai
**maior que o da mestra**, o que não existe: por definição o Cm máximo é o da meia-nau.

Com `exp_vante = 1.0` (a suavização simples do redondo) a curva sai da meia-nau com
derivada nula e demora a afinar. Elevar a smoothstep a 0,7 puxa a queda para perto da
meia-nau — no croqui de referência isso leva `p` em `x = 12` de 1,68 para 1,43 — e a curva
de Cm volta a ser unimodal. Só mexa nesse expoente se o Cm por baliza deixar de ser
unimodal; é o sintoma que ele existe para curar.

## Exemplo trabalhado

Casco de 6,8 m, croqui de 5 balizas, `loa_sq = 16`, `mid_x = 6.788`.

**Ajuste da seção mestra** (nove pontos): `p = 3,23`, `k = 2,372`. Resíduo eficaz **2,9 %
da meia-boca**, pior ponto 5,0 % no joelho do bojo, contra 8,7 % da super-elipse — é essa
diferença que decide o tipo de casco. Garganta em `u = 0,288` do pontal local, medida no
croqui 0,31. `Cm = 0,635` contra 0,623 integrado no croqui.

**Cota do alefriz.** Na meia-nau as curvas dão `z_quilha = 0,082` e `z_borda = 4,592`,
pontal local 4,510. Então:

```
z0 = 0,082 + 0,2874 · 4,510 = 1,3779
```

**Ao longo do comprimento**, com `re = 0.51`, `vante = 0.20`, `exp_vante = 0.7`:

| Baliza | 1 (espelho) | 2 | 3 | 4 | 5 (proa) |
|---|---|---|---|---|---|
| Garganta | 35,0 % | 28,6 % | 28,5 % | 12,9 % | sem garganta |
| Cm | 0,551 | 0,620 | 0,629 | 0,574 | 0,524 |

Unimodal, máximo na meia-nau: é o que se confere. A baliza 5 cai no piso `p = 1,10` com
`k = 1`, e vale exatamente `1 − 1/(p+1) = 0,524`. O madeiramento morre em `x ≈ 12,3`
quadrados, a 23 % do comprimento contados da proa.

## O projeto.json deste casco

É o **único** arquivo que você escreve, e você não escreve tudo dele. Dois scripts gravam
direto no arquivo, fundindo com o que já estiver lá — não copie a saída deles de volta:

```bash
# grava curvas e medidos
python scripts/ajustar.py --loa-sq 16 --projeto projeto.json \
    --curva planSheer 0,1.6328 1.865,2.2898 ... --curva profSheer ... --curva profKeel ...

# grava secao.pts, cheia.p e — por causa do --meia-nau — alefriz.z0
python scripts/homografia.py --secao 0,0 0.340,0.542 ... 3.083,4.198 \
    --projeto projeto.json --meia-nau 0.0817,4.5915
```

À mão sobram a identificação, as dimensões, as frações de cheia, os três parâmetros
arbitrados do alefriz e o `registro`:

```json
{
  "casco": "quilha-cheia",
  "nome": "Luiz",
  "titulo": "Casco de Quilha Corrida",
  "subtitulo": "Quilha corrida · baliza em wineglass · pé de roda profundo",
  "loa_m": 6.8, "loa_sq": 16, "balizas": 5, "mid_x": 6.788,
  "curvas": {
    "planSheer": [[0,1.6328,0.367],[1.865,2.2898,0.33756], ..., [16,0,-0.68897]],
    "profSheer": [[0,4.821,-0.04228], ..., [16,5.571,0.20858]],
    "profKeel":  [[0,0.032,-0.03373],[2.581,0,0.00893], ..., [16,5.571,1.41532]]
  },
  "medidos": { "planSheer": [[0,1.6328],[1.865,2.2898], ...], "profSheer": [...],
               "profKeel": [...] },
  "secao":   { "pts": [[0,0],[0.34,0.542],[0.683,0.948], ..., [3.083,4.198]] },
  "cheia":   { "p": 3.23, "re": 0.51, "vante": 0.20, "exp_vante": 0.7 },
  "alefriz": { "z0": 1.3779, "subida": 0.010, "tuck": 0.40, "extensao": 2.5 },
  "registro": { "calibracao": "…", "notas": ["…"] }
}
```

Os `...` são corte desta página: `curvas`, `medidos` e `secao` saem inteiros dos scripts.
Arrays sempre compactos, um ponto por linha no máximo — nunca um número por linha: o mesmo
arquivo custa 383 tokens compacto e 1.001 com `indent=2` explodindo os números.

Obrigatórios: `casco`, `nome`, `loa_m` (metros, informado pela pessoa), `loa_sq`
(quadrados da malha, não metros nem balizas), `balizas`, `mid_x` (a coordenada X da
meia-nau, não o número da baliza), `curvas` e `alefriz.z0`. `titulo` e `subtitulo` são
opcionais — sem `titulo`, o padrão vem do tipo de casco. Os demais:

| Campo | Padrão | O que é |
|---|---|---|
| `medidos` | — | pontos lidos na foto; viram as cruzes das vistas |
| `secao.pts` | — | seção reprojetada, `[meia_boca, altura_acima_da_quilha]`. **Nove** pontos, não os cinco a sete do redondo: quatro entre 10 % e 45 % do pontal, cercando a garganta |
| `cheia.p` | 2,32 | cheia da baliza, ajustada na seção mestra. O padrão é o do croqui redondo de referência, não o do seu — deixe o script gravar |
| `cheia.re` | 0,93 | fração da cheia da meia-nau no espelho |
| `cheia.vante` | 0,62 | fração da cheia da meia-nau na proa |
| `cheia.exp_vante` | 0,7 | expoente da suavização à vante; a seção acima diz por quê |
| `alefriz.z0` | **nenhum** | cota do alefriz na meia-nau, em quadrados; `montar.py` recusa o projeto sem ela |
| `alefriz.subida` | 0,010 | subida do alefriz por quadrado, para vante |
| `alefriz.tuck` | 0,40 | levantamento do tuck em quadrados, sobre o prolongamento da reta — rende 0,375 qd em relação à cota do alefriz no fim do tuck, que é o que se mede num traçado pronto |
| `alefriz.extensao` | 2,5 | extensão do tuck a partir do espelho, em quadrados |
| `registro` | — | `{ "calibracao": "…", "notas": ["…"] }`. Só fato deste barco |

Não escreva o que é derivado: `montar.py` e o motor cuidam de rótulos, camadas de
exportação, ordem das curvas, `fixLast` e o vínculo das curvas de perfil no topo da roda,
escala, altura dos painéis, limites dos nós, `viewBox`, espaçamento das balizas e posição
dos números — e do bloco `var` do modelo, que você nunca digita.

## Restrição própria deste modelo

Só `quilha ≤ borda`, como no redondo. Não há chine para ordenar. A garganta não entra nas
restrições de alisamento: ela é da baliza transversal, que **deve** inflexionar. O que não
pode inflexionar são as curvas de planta e de perfil.

## Tabela de cotas

Igual à do redondo — meias-bocas em linhas de água fracionárias do pontal local (um
quarto, metade, três quartos), mais altura de quilha e de borda. O painel da seção mostra
à parte, em texto, a que porcentagem do pontal está a garganta daquela baliza.

## O que escrever no `registro`

Só fato deste croqui. O painel do documento já traz gravada, acima do seu texto, a seção
*Como isto é feito*, e ela cobre tudo que esta referência explica: a homografia e a
tolerância de 0,05 quadrado, o alisamento por convexidade, a família de dois expoentes e o
que `p` e `k` fazem, a garganta como cota absoluta e não fração do pontal, o alefriz, o
madeiramento que morre sozinho no pé de roda, e por que a suavização à vante é elevada a
um expoente menor que 1. **Não reescreva nada disso** — foi metade do registro da versão
anterior, e é idêntico em toda corrida.

No `registro` vão os números: resíduo da calibração; `p` e `k` ajustados e o resíduo, com
a comparação contra a super-elipse; onde caiu a garganta e onde ela está medida no croqui;
`alefriz.z0` e quais dos parâmetros do alefriz são valores de projeto e não medidas; a
estação em que o madeiramento morre; a garganta e o Cm baliza a baliza; a discordância
entre vistas e qual você adotou; e quanto cada nó foi deslocado. Teste cada frase com
*"ela seria idêntica para outro croqui?"* — se for, é método, e método já está no modelo.
