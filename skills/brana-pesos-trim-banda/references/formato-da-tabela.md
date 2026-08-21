# A tabela de cotas: os dois formatos

Tudo em **milímetros**. Meias-bocas a partir da linha de centro; alturas acima da
linha de base, que é o **ponto mais baixo da quilha** do casco inteiro. `x` cresce da
popa para a proa e pode começar em qualquer valor — o painel mede tudo a partir da
primeira baliza.

Linhas que começam com `#` são comentário e são ignoradas. A linha de cabeçalho
também é ignorada, mas é ela que decide o formato — vale a pena mandá-la.

## Formato redondo (bojo redondo, sem chine)

```
baliza  x  altura_quilha  altura_borda  mb_25pc  mb_50pc  mb_75pc  meia_boca_borda
```

| coluna | o que é |
|---|---|
| `baliza` | número ou nome da baliza; só rótulo |
| `x` | posição longitudinal |
| `altura_quilha` | altura da quilha naquela baliza |
| `altura_borda` | altura do tosado (a borda) naquela baliza |
| `mb_*` | meias-bocas em níveis intermediários, **igualmente espaçados no pontal** |
| `meia_boca_borda` | meia-boca na borda |

**Quantos níveis intermediários você quiser.** Com três (`mb_25pc`, `mb_50pc`,
`mb_75pc`) eles ficam a 25%, 50% e 75% do pontal daquela baliza. Com sete, ficam a
12,5%, 25%, 37,5%, 50%, 62,5%, 75% e 87,5%. O painel deduz o espaçamento do número de
colunas: são sempre `n` níveis igualmente espaçados entre a quilha e a borda,
exclusive. Os nomes das colunas do meio não importam; a **ordem** importa, da quilha
para a borda.

Três níveis já descrevem bem uma baliza da família da super-elipse. Uma forma fora
dela — bojo com raio marcado, costado tombado, pé de quilha — pede mais níveis.

Exemplo com três níveis: [`exemplos/exemplo-redondo-6-balizas.txt`](../exemplos/exemplo-redondo-6-balizas.txt)
Exemplo com sete: [`exemplos/exemplo-redondo-12-balizas.txt`](../exemplos/exemplo-redondo-12-balizas.txt)

## Formato quinado (com chine)

```
stn  x  sheer_hb  chine_hb  sheer_ht  chine_ht  keel_ht  [deadrise_deg]
```

| coluna | o que é |
|---|---|
| `sheer_hb` | meia-boca na borda (*half breadth*) |
| `chine_hb` | meia-boca no chine |
| `sheer_ht` | altura da borda (*height*) |
| `chine_ht` | altura do chine |
| `keel_ht` | altura da quilha |
| `deadrise_deg` | opcional, **lida e ignorada** — o deadrise já está implícito nas alturas e meias-bocas do chine e da quilha |

O chine entra como **nó exato** da baliza: a interpolação entre nós é reta, então o
canto vivo aparece como canto na malha 3D e nos diagramas, sem arredondamento.

Exemplo: [`exemplos/exemplo-quinado-8-balizas.txt`](../exemplos/exemplo-quinado-8-balizas.txt)

## Como o formato é detectado

Primeiro pelo cabeçalho: `altura_quilha`, `mb_`, `meia_boca` ou `baliza` → redondo;
`sheer_hb`, `chine_hb`, `keel_ht` ou `deadrise` → quinado.

Sem cabeçalho, pela heurística: as duas tabelas podem ter oito colunas, então a
decisão olha a terceira. Se ela é **menor** que a quarta e as meias-bocas crescem, é
altura de quilha → redondo. Se é **maior**, é meia-boca de borda → quinado.

Na dúvida, mande o cabeçalho. Um formato lido pelo outro não dá erro: dá um casco
errado em silêncio.

## Ponto ou vírgula decimal

O leitor decide olhando a tabela **inteira**, não número por número — uma tabela não
mistura convenções. Um separador seguido de 1, 2 ou 4+ dígitos no fim do número só
pode ser decimal (`283,5`); grupos de exatamente três dígitos são ambíguos (`1,714`
pode ser mil setecentos e quatorze) e ficam para o desempate pelo resto da tabela.
Separador de milhar é aceito e removido. Se os dois sinais aparecem no mesmo número,
o último é o decimal.

## O mínimo, e o que a tabela não diz

- **Ao menos três balizas.** Com duas não há forma longitudinal para interpolar.
- Todas as linhas com o **mesmo número de colunas**.
- Duas balizas não podem ter o mesmo `x`.

Estas situações passam com **aviso**, porque às vezes são intencionais: quilha acima
da borda, meia-boca negativa, chine fora da borda, chine acima da borda, quilha acima
do chine. O aviso diz qual baliza.

A tabela **não** informa: o peso do barco vazio, o CG do casco, o espelho de popa
inclinado (ele entra como face plana vertical na primeira baliza), tanques, apêndices,
lastro, superestrutura, nem a permeabilidade de compartimentos. O painel assume o CG
do barco no centro de carena da flutuação inicial e deixa a pessoa corrigir na
primeira linha da tabela de pesos, que é editável.
