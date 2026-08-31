# O formato da tabela de cotas

Tudo em **milímetros**. Alturas **acima da linha de base** (o ponto mais baixo da
quilha); meias-bocas **a partir da linha de centro** — metade da boca, porque o casco
é simétrico. É o formato do plano de linhas, então a exportação entra direto.

Linhas começadas com `#` e a linha de cabeçalho são ignoradas. Separador de decimal
pode ser vírgula ou ponto — o leitor detecta qual é pelo conjunto dos números.
Separador de coluna pode ser tabulação, ponto-e-vírgula ou espaços.

Mínimo de **3 balizas**. Duas balizas no mesmo `x` são recusadas.

## Casco de bojo redondo

```
baliza  x     altura_quilha  altura_borda  mb_25pc  mb_50pc  mb_75pc  meia_boca_borda
1       0     283,5          890,7         533,4    678,0    744,6    762,6
2       1200  69,1           948,5         708,3    888,2    967,8    987,8
...
```

- `x` — posição longitudinal. **Não importa qual ponta é a proa**: o leitor descobre
  pela meia-boca da borda (a ponta mais estreita é a proa).
- `altura_quilha`, `altura_borda` — o fundo e o topo daquela baliza.
- as colunas **`mb_*` do meio** — meias-bocas em níveis **igualmente espaçados no
  pontal daquela baliza**. Com 3 colunas elas estão a 25%, 50% e 75% do pontal; com 7,
  a 12,5%, 25%, … 87,5%. **Qualquer número de níveis serve**, desde que seja o mesmo em
  todas as balizas.
- `meia_boca_borda` — a última coluna, a meia-boca no topo (100% do pontal).

Entre os níveis tabelados a baliza é reconstruída por **super-elipse** ajustada aos
pontos; se o ajuste não fechar em 1,5%, cai para cúbica monótona pelos mesmos pontos.

Quantos níveis usar: com poucos, o trecho entre a quilha e o primeiro nível fica por
conta do modelo. Se o barco vai flutuar raso — linha d'água abaixo de ~25% do pontal —
vale acrescentar níveis **baixos** (10%, 20%) em vez de aumentar o número de balizas.

## Casco quinado (com chine)

```
stn  x     sheer_hb  chine_hb  sheer_ht  chine_ht  keel_ht
1    0     724,3     579,4     784,7     390,0     34,7
2    857   952,6     741,2     812,9     394,7     0,3
...
```

Sete colunas, nesta ordem. `_hb` é meia-boca, `_ht` é altura. Uma oitava coluna
(`deadrise_deg`) é aceita e ignorada — o ângulo sai da própria geometria. Dentro da
baliza, a meia-boca é reconstruída por **retas** entre quilha, chine e borda, o que
preserva o canto vivo.

## Como o formato é detectado

Pelo cabeçalho: `sheer_hb`, `chine_hb`, `keel_ht` ou `deadrise` → quinado;
`altura_quilha`, `mb_`, `meia_boca` ou `baliza` → redondo. Sem cabeçalho reconhecível,
decide pelo número de colunas e pelo padrão dos valores da primeira linha.

## A ponta que fecha

A baliza da proa costuma ter todas as meias-bocas em zero e a quilha na altura da
borda — um ponto único. Isso é esperado e o leitor trata.

## O que a tabela NÃO informa

- **peso** — quem dá é você, no painel; é dele que sai o calado
- **potência** — idem
- **apêndices** — quilha, pé de galinha, eixo, hélice e leme estão fora da tabela, logo
  fora da superfície molhada e do volume
- **inclinação do espelho** — a tabela representa o espelho como uma face vertical no
  `x` da primeira baliza; a forma e o comprimento ficam certos, a inclinação não aparece

O painel abre com um peso e uma potência **sugeridos** a partir da própria tabela — o
peso que põe a linha d'água a 30% do pontal, e a potência que leva à velocidade de
casco. São um ponto de partida para a pessoa mexer, não uma recomendação de projeto.
