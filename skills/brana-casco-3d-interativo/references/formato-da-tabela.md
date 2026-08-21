# Formato da tabela de cotas

Referência do que o leitor aceita. Leia isto quando o script recusar uma tabela, ou
quando precisar montar uma tabela a partir de dados soltos.

## Índice

- [Regras gerais](#regras-gerais)
- [Formato quinado (com chine)](#formato-quinado-com-chine)
- [Formato redondo (bojo curvo)](#formato-redondo-bojo-curvo)
- [Como o formato é detectado](#como-o-formato-é-detectado)
- [Números: ponto ou vírgula](#números-ponto-ou-vírgula)
- [Avisos contra erros](#avisos-contra-erros)
- [Limites do que a tabela informa](#limites-do-que-a-tabela-informa)

## Regras gerais

- Uma linha por baliza. Campos separados por tabulação ou por espaços — tanto faz.
- Linhas começando com `#` são comentário e são ignoradas. Linhas vazias também.
- Uma linha de cabeçalho com nomes de coluna é reconhecida e ignorada como dado,
  mas é ela que decide o formato — vale manter.
- **Tudo em milímetros.** Meias-bocas medidas a partir da linha de centro; alturas
  medidas acima da linha de base, que é o ponto mais baixo da quilha.
- Mínimo de 3 balizas. As balizas são ordenadas por `x` automaticamente, então a
  ordem das linhas não importa; duas balizas com o mesmo `x` são erro.
- A primeira coluna é o número da baliza e serve só de rótulo. A segunda é a
  posição longitudinal `x`, que é o que realmente posiciona a baliza.

## Formato quinado (com chine)

Sete colunas obrigatórias; uma oitava de deadrise é aceita e ignorada como dado
(mas serve para conferir a coerência da tabela).

```
stn   x   sheer_hb   chine_hb   sheer_ht   chine_ht   keel_ht   [deadrise_deg]
```

| Coluna | Significado |
|---|---|
| `sheer_hb` | meia-boca da borda |
| `chine_hb` | meia-boca do chine |
| `sheer_ht` | altura da borda |
| `chine_ht` | altura do chine |
| `keel_ht` | altura da quilha |

A baliza é montada como quilha → chine → borda, com interpolação reta entre os três
nós, então o canto vivo do chine fica exatamente onde a tabela o coloca.

Exemplo completo em [`../exemplos/exemplo-quinado.txt`](../exemplos/exemplo-quinado.txt).

**Conferência útil:** `atan((chine_ht − keel_ht) / chine_hb)` em graus tem de
reproduzir a coluna de deadrise. Se não reproduzir, alguma coluna está trocada de
lugar.

**Fundo chato** é representável aqui: ponha o chine na altura da quilha
(`chine_ht = keel_ht`) com a meia-boca cheia. A baliza sai fundo chato mais costado,
e o perímetro molhado inclui o fundo.

## Formato redondo (bojo curvo)

Cinco colunas no mínimo, com quantos níveis intermediários você quiser:

```
baliza   x   altura_quilha   altura_borda   <meias-bocas intermediárias...>   meia_boca_borda
```

Os níveis intermediários são **igualmente espaçados no pontal**. Com três deles, as
alturas são 25 %, 50 % e 75 % do pontal — daí os nomes `mb_25pc`, `mb_50pc`,
`mb_75pc`. Com sete, seriam 12,5 %, 25 %, … 87,5 %. Todas as balizas precisam do
mesmo número de níveis.

A baliza encosta na linha de centro na quilha: a meia-boca em `altura_quilha` é zero
por definição. Casco de fundo chato **não** é representável neste formato — use o
quinado com o chine na altura da quilha.

Exemplo completo em [`../exemplos/exemplo-redondo.txt`](../exemplos/exemplo-redondo.txt).

**Quantos níveis usar.** Três definem bem uma baliza da família da super-elipse, que
cobre a maioria dos cascos de bojo redondo. Formas fora dessa família — bojo com
raio marcado, costado tombado, pé de quilha — pedem mais níveis, porque três não
dizem nada sobre o trecho entre a quilha e o primeiro deles. O leitor aceita quantos
você fornecer.

## Como o formato é detectado

Primeiro pelo cabeçalho:

- palavras como `altura_quilha`, `mb_`, `meia_boca`, `baliza` → **redondo**
- palavras como `sheer_hb`, `chine_hb`, `keel_ht`, `deadrise` → **quinado**

Sem cabeçalho, vale a heurística sobre a primeira linha de números. As duas tabelas
de exemplo têm oito colunas, então a contagem não resolve; o que distingue é:

- **redondo**: a terceira coluna é altura de quilha, menor que a quarta (altura de
  borda), e as meias-bocas crescem da quilha para a borda;
- **quinado**: a terceira coluna é meia-boca da borda, maior que a quarta
  (meia-boca do chine).

Se a detecção errar, acrescente o cabeçalho — é o caminho mais curto.

## Números: ponto ou vírgula

O leitor aceita as quatro convenções e decide olhando a tabela inteira, não número
por número, porque uma tabela não mistura convenções:

| Escrita | Lido como |
|---|---|
| `283.5` | 283,5 |
| `283,5` | 283,5 |
| `1.009,8` | 1009,8 |
| `1,009.8` | 1009,8 |

Um separador seguido de 1, 2 ou 4+ dígitos no fim do número só pode ser decimal.
Grupos de exatamente três dígitos são ambíguos (`1,714` pode ser mil setecentos e
quatorze ou um vírgula sete um quatro) e o desempate vem dos outros números da mesma
tabela. Se a tabela tiver *apenas* números ambíguos, escreva um deles com casa
decimal para tirar a dúvida.

Isso importa: ler `283,5` como `2835` não geraria erro nenhum — geraria um casco
errado em silêncio.

## Avisos contra erros

**Erro** interrompe a geração: a tabela não descreve um casco.

**Aviso** deixa passar mas relata, porque a forma é estranha e só quem projetou sabe
se é intencional:

- `chine fora da borda` — meia-boca do chine maior que a da borda (bordo tombado?)
- `quilha acima do chine` ou `chine acima da borda` — alturas fora de ordem
- `meia-boca negativa`

Entre balizas, se a interpolação produzir uma forma que se autointersecta, o motor
corrige e conta quantas amostras precisaram de correção. Um número alto aí é sinal
de que a tabela pede uma forma incoerente, e vale conferir as cotas.

## Limites do que a tabela informa

A tabela é a única fonte da forma. Entre as balizas o casco é interpolado por cúbica
monótona — escolhida em vez de spline natural porque esta última estoura onde as
meias-bocas fecham na proa e devolve boca negativa.

O que a tabela **não** diz, e que o visualizador portanto não mostra: tosamento
transversal do convés (é tratado como superfície regrada entre as bordas), pé de
quilha, skeg, bolina e apêndices.

**O espelho de popa é a exceção, e não vem da tabela.** A tabela dá a forma do
casco; o espelho é um plano de corte com posição e inclinação ajustáveis na própria
página, ancorado na borda da baliza de ré. Ele abre a prumo, o que reproduz a
geometria de uma tabela lida ao pé da letra, e a inclinação vai removendo material
para vante e para baixo. Duas consequências: a **última baliza a ré da tabela deve
ser a seção do espelho** (ou algo próximo dela), porque é dali que o corte parte; e
não há casco a ré dela para o plano recuar, então a posição só caminha para vante.
