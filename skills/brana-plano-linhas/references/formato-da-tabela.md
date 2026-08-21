# Formato da tabela de cotas

Arquivo de texto. Colunas separadas por tabulação ou por espaços. Linhas que começam com
`#` são comentário e podem trazer a declaração do espelho. Uma linha de cabeçalho com os
nomes das colunas é opcional, mas ajuda o leitor a escolher o formato certo.

Decimal com vírgula ou com ponto — o leitor decide olhando a tabela inteira, então **não
misture as duas convenções nos números das balizas**. Milhar não pode ter separador
(`1036,5`, nunca `1.036,5`).

As alturas são medidas **acima da linha de base** (o ponto mais baixo da quilha) e as
meias-bocas **a partir da linha de centro**. Tudo em milímetros. As balizas podem vir em
qualquer ordem: são ordenadas por `x`.

Mínimo de 3 balizas. Duas balizas não podem ter o mesmo `x`.

## Casco quinado (com chine) — 7 colunas

```
stn	x	sheer_hb	chine_hb	sheer_ht	chine_ht	keel_ht	deadrise_deg
1	0	724.3	579.4	784.7	390.0	34.7	31.52
2	857	952.6	741.2	812.9	394.7	0.3	28.02
```

Nesta ordem: número da baliza, abscissa, meia-boca na borda, meia-boca no chine, altura da
borda, altura do chine, altura da quilha. Uma oitava coluna (o ângulo de deadrise, por
exemplo) é aceita e ignorada.

O formato é reconhecido pelo cabeçalho (`sheer_hb`, `chine_hb`, `keel_ht`, `deadrise`) ou,
sem cabeçalho, por a terceira coluna ser maior que a quarta.

## Casco de bojo redondo — 5 colunas ou mais

```
baliza	x	altura_quilha	altura_borda	mb_25pc	mb_50pc	mb_75pc	meia_boca_borda
1	0	283,5	890,7	533,4	678,0	744,6	762,6
2	1200	69,1	948,5	708,3	888,2	967,8	987,8
```

Nesta ordem: número da baliza, abscissa, altura da quilha, altura da borda, depois as
meias-bocas dos níveis intermediários, e por último a meia-boca na borda. Os níveis
intermediários são repartidos em partes iguais da altura entre a quilha e a borda: com 3
níveis eles caem a 25%, 50% e 75%; com 7 níveis, a cada oitavo. Qualquer quantidade serve,
desde que **todas as balizas tenham o mesmo número de colunas**.

O formato é reconhecido pelo cabeçalho (`altura_quilha`, `mb_`, `meia_boca`, `baliza`).

## Baliza da proa

Se a última baliza a vante tiver meia-boca zero em todos os níveis, ela é a roda de proa:
o plano fecha o contorno ali e essa baliza não ganha seção no plano de balizas. Isso é
normal e o resumo avisa.

## Declarar o espelho na própria tabela

Três formas, todas em linha de comentário. A primeira que aparecer vale:

```
# espelho: de x 159,4 z 34,7 a x 0 z 784,7
# espelho: 12 graus da vertical
```

A forma em graus ancora o **topo** do espelho na abscissa da última baliza a ré e joga o pé
para vante, preservando o comprimento total que a tabela declara. Ângulo negativo inclina
ao contrário (pé a ré do topo).

A terceira forma é o cabeçalho de exportação do Rhino, com as faixas do contorno e as
transformações para a abscissa e a altura da tabela (`X de ... a ...`, `Z de ... a ...`,
`x_tabela = X_rhino + ...`, `altura_tabela = Z_rhino + ...`).

`--espelho=<graus>` na linha de comando sobrepõe qualquer declaração da tabela.
`--espelho-reto` remove todas elas e usa a face reta da última baliza a ré.

## Mensagens do leitor

| Mensagem | O que fazer |
|---|---|
| `sao necessarias ao menos 3 balizas` | a tabela veio truncada, ou os separadores não são tabulação nem espaço |
| `formato quinado pede 7 colunas` | falta uma coluna numa baliza |
| `a baliza N tem X colunas, as outras tem Y` | uma baliza está com coluna a mais ou a menos |
| `duas balizas na mesma posicao x` | `x` repetido |
| `valor nao numerico em zk/zs/ys` | célula vazia ou com texto |
| `chine fora da borda`, `quilha acima do chine` (aviso) | provável troca de colunas |
