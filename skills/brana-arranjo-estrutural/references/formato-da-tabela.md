# O formato da tabela de cotas

São os mesmos dois formatos das outras skills de casco da Brana: uma tabela que
serviu ao visualizador 3D ou ao estudo de pesos serve aqui sem mudar nada.

Cotas em **milímetros**. Meias-bocas a partir da **linha de centro**; alturas acima
da **linha de base**, que é o ponto mais baixo da quilha. Uma linha por baliza.
Colunas separadas por tabulação, ponto e vírgula ou espaços. Linhas começando com
`#` são comentário e são ignoradas.

## Casco quinado (com chine)

Sete colunas. A oitava, o deadrise, é aceita e ignorada — o painel mede o ângulo na
própria geometria.

```
stn   x      sheer_hb  chine_hb  sheer_ht  chine_ht  keel_ht  [deadrise_deg]
1     0      724.3     579.4     784.7     390.0     34.7     31.52
2     857    952.6     741.2     812.9     394.7     0.3      28.02
```

| coluna | é |
|---|---|
| `stn` | número da baliza, só para você se achar |
| `x` | posição a partir da popa |
| `sheer_hb` | meia-boca na borda (trincaniz) |
| `chine_hb` | meia-boca no chine |
| `sheer_ht` | altura da borda |
| `chine_ht` | altura do chine |
| `keel_ht` | altura da quilha |

## Casco de bojo redondo

Sem chine, a baliza é descrita por meias-bocas em níveis intermediários entre a
quilha e a borda. **No mínimo seis colunas** — é preciso pelo menos um nível
intermediário, senão a baliza vira uma reta e não há volta de bojo.

```
baliza  x      altura_quilha  altura_borda  mb_25pc  mb_50pc  mb_75pc  meia_boca_borda
1       0      283.5          890.7         533.4    678.0    744.6    762.6
2       1200   69.1           948.5         708.3    888.2    967.8    987.8
```

As meias-bocas do meio ficam em **níveis igualmente espaçados** entre a quilha e a
borda: com três delas, a 25%, 50% e 75% da altura. Com duas, a 33% e 67%. Com
cinco, a cada 1/6. O painel aceita quantas você puser.

## Como o formato é detectado

Pelo **cabeçalho**, nesta ordem:

1. `chine` ou `quina` em qualquer coluna → **quinado**. Vem primeiro de propósito:
   um cabeçalho quinado em português também traz `altura_quilha`.
2. Meia-boca em nível intermediário — `mb_25pc`, `mb_33pc`, `mb 1`, `meio`, `mid`,
   qualquer porcentagem → **redondo**.
3. `quilha` e `borda` juntos, sem `chine` → **redondo**.

Sem cabeçalho, pelo **número de colunas**: sete ou mais → quinado; menos → redondo.

Se a detecção errar, o leitor costuma perceber: quando a quilha sai acima da borda
na maioria das balizas, ele recusa dizendo qual formato adotou. **A correção é pôr
um cabeçalho** — é o caminho mais curto, e é a única coisa que não deixa dúvida.

## Ponto ou vírgula decimal

Os dois funcionam, e não precisam ser declarados: o leitor conta quantos campos
numéricos usam vírgula e quantos usam ponto na tabela inteira, e adota o mais
frequente. `1.234,5` e `1234.5` chegam ao mesmo lugar. Não misture os dois na mesma
tabela.

## O que o painel mede da tabela

Sozinho, sem perguntar:

- **comprimento**, da primeira à última baliza;
- **boca**, o dobro da maior meia-boca;
- **pontal**, da quilha mais baixa à borda mais alta;
- **posição da boca máxima**, que vira a estação de referência da seção mestra;
- **deadrise**, o ângulo do primeiro trecho da baliza na meia-nau;
- **perímetro do fundo, do costado e do convés** em cada estação — é neles que os
  longitudinais são distribuídos, e é o que distingue um reforço posto na curva do
  bojo de um posto na corda;
- **calado e deslocamento**, um a partir do outro, integrando as balizas.

## O que a tabela não informa

E que por isso entra por argumento ou por suposição:

| falta na tabela | como entra |
|---|---|
| deslocamento | `--deslocamento`; sem ele, sai do calado |
| calado | `--calado`; sem ele, 35% do pontal |
| velocidade máxima | `--velocidade`; sem ela, a velocidade de casco tirada do L<sub>WL</sub> — **suposição, não medida** |
| inclinação do espelho | `--espelho`; sem ele, 12° |
| material | `--material`; sem ele, compensado naval |
| tosado do convés | fixo em 3% da boca, fora das fontes |

A velocidade é a que mais muda o resultado: ela entra na carga de impacto do fundo.
Se o barco planeia e ninguém informou, o painel dimensiona como se ele não
planeasse. Vale perguntar.

## Onde a tabela é escalada, e onde não é

Na grade "Ajustar os números deste barco", do passo 1, comprimento, boca e pontal
são editáveis. Mexer neles **escala** a forma da tabela — as balizas continuam sendo
as suas, com as mesmas proporções relativas. Serve para responder "e se este mesmo
casco tivesse 20% mais boca". Não serve para trocar de casco: para outro casco,
outra tabela.
