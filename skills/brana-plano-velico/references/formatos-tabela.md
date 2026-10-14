# Formatos de tabela de cotas

Leia isto só quando `scripts/montar.py` reclamar do formato. Em uso normal o script
detecta e converte sozinho.

Regras comuns aos três formatos: **alturas acima da linha de base** (o ponto mais
baixo do casco), **meias-bocas a partir da linha de centro**, **em milímetros**.

O que o script aceita e arruma antes de embutir no painel: separação por tabulação,
espaço, `;` ou vírgula; vírgula decimal; separador de milhar; fim de linha do Windows;
comentários com `#`; e uma linha de cabeçalho com os nomes das colunas. A tabela sai
sempre reescrita em tabulação com ponto decimal, então o painel recebe a mesma coisa
não importa de onde ela vinha.

A vírgula é ambígua e o script decide pela companhia: muitas vírgulas **e** pontos
decimais é CSV de planilha, e a vírgula separa campos; vírgulas sem pontos é teclado
brasileiro, e a vírgula é decimal.

Tabela em metros é detectada pelo tamanho do casco e multiplicada por 1000. Fora da
faixa plausível (menos de 2 m ou mais de 120 m de comprimento) o script imprime um
aviso `ATENCAO` em vez de recusar — centímetros e polegadas passam por aqui sem
tropeçar em mais nada.

## 1. Balizas, bojo redondo

```
baliza  x  altura_quilha  altura_borda  mb_12pc … mb_88pc  meia_boca_borda
```

Qualquer número de meias-bocas intermediárias, **igualmente espaçadas no pontal
local** da baliza: com 7 colunas intermediárias elas estão a 1/8, 2/8, … 7/8 da
altura entre a quilha e a borda daquela baliza. O painel ajusta uma superelipse a
esses nós, então 3 níveis já dão um casco decente e 7 dão um casco fiel.

Casco de **patilhão** entra aqui: as meias-bocas de baixo são a meia-espessura do
madeiramento morto, e assim o perfil do patilhão já fica dentro da área lateral
submersa do casco. Quando reconhece esse caso, o painel abre em patilhão com a
profundidade em zero — o fundo na linha de base — e só soma o que ficar abaixo da
linha de quilha da tabela, de modo que a mesma área nunca é contada duas vezes.

## 2. Balizas, casco quinado

Sete colunas, na ordem:

```
stn  x  sheer_hb  chine_hb  sheer_ht  chine_ht  keel_ht
```

`hb` é meia-boca (half-breadth), `ht` é altura. O painel liga quilha → chine →
tosado com retas, que é o que a chapa faz.

## 3. Linhas d'água (exportação estilo DELFTship / FREE!ship)

```
19 // Number of waterlines
19 // Number of stations
1  // Read deckline
1  // Read contour
1  // Read aft contour
1  // Read forward contour
0  // Read flat of bottom
12.000 // Length
3.700  // Beam
0.500  // Draft
        <as 19 alturas de linha d'água>
        <contorno de popa: o x onde o casco termina em cada linha d'água>
<x da baliza>  <19 meias-bocas>  <altura do convés>  <meia-boca do convés>  <altura do fundo>
… uma linha por baliza …
        <contorno de proa: o x onde o casco termina em cada linha d'água>
```

O que o conversor faz com isso:

- monta cada baliza com o fundo (última coluna) na linha de centro, as meias-bocas
  das linhas d'água que estão entre o fundo e o convés, e o ponto do convés;
- reamostra em 7 níveis igualmente espaçados no pontal, que é o formato 1;
- fecha as duas pontas, que ficam **fora** da grade de balizas: o **espelho de popa**
  onde o contorno de popa chega a x = 0 (convés e meias-bocas extrapolados das duas
  primeiras balizas, como se faz um espelho só com balizas), e o **talha-mar** no topo
  do contorno de proa, com meia-boca zero;
- guarda o `Draft` do cabeçalho como `# linha_dagua`, para o painel abrir na
  flutuação de projeto que veio com o casco.

As cinco opções `Read …` mandam no número de colunas de cada linha de baliza: sem
`deckline` somem duas colunas, sem `contour` some uma, e sem os contornos somem as
linhas soltas correspondentes. O conversor respeita as opções; quando falta o
deckline, ele toma a linha d'água mais alta com meia-boca como a borda, e quando
falta o contorno, põe o fundo meio passo abaixo da primeira meia-boca.

Os dois contornos e a coluna do fundo são a **mesma curva** vista de dois jeitos: um
como x em função da altura, o outro como altura em função de x. Nas pontas, onde o
perfil é quase vertical, só os contornos servem; no meio, onde ele é quase
horizontal, só a coluna do fundo serve.

## O que o painel rejeita

- menos de 3 balizas;
- duas balizas no mesmo `x`;
- número de colunas diferente entre balizas;
- quilha acima da borda, ou meia-boca negativa (isso vira aviso, não erro).
