# O que entra e o que sai

## Entrada

Dois exemplos completos nesta pasta, um de cada formato:

- [`exemplo-quinado.txt`](exemplo-quinado.txt) — 8 balizas, 6,000 m, chine vivo
- [`exemplo-redondo.txt`](exemplo-redondo.txt) — 12 balizas, 3,779 m, bojo redondo

São tabelas de cotas em texto puro, em milímetros. O formato completo está em
[../references/formato-da-tabela.md](../references/formato-da-tabela.md).

## O que o script imprime

```
node scripts/gerar-relatorio.js --tabela=exemplos/exemplo-quinado.txt --nome="Ana Ribeiro" --saida=.
```

```
Relatorio-Casco-Quinado-Planificado-Ana-Ribeiro.html
Planificacao-Casco-Quinado-Ana-Ribeiro.pdf
  baliza quinada · 8 balizas · comprimento 6.000 m · boca 2.012 m · pontal 0.900 m
  2 chapas + 7 gabaritos · deformacao ao planificar exata: chapa desenvolvivel
  calado 360 mm · deslocamento 888 kg (Como tabelado) -> 897 kg (Desenvolvivel)  +1.03 % · Cb 0.342 -> 0.345
  HTML 193 KB autossuficiente · PDF 85 KB em 10 folhas A3 · 1476 ms
  todas as 22 verificacoes passaram - arquivos prontos, nao precisa abrir para conferir
```

Com o exemplo redondo, em 10 tiras:

```
  baliza redonda · 12 balizas · comprimento 3.779 m · boca 1.436 m · pontal 0.731 m
  10 chapas (10 tiras) + 11 gabaritos · deformacao ao planificar pico de 0.552 % em Tira 2, 0.076 % rms
  calado 302 mm · deslocamento 614 kg (Redondo) -> 610 kg (10 tiras)  -0.53 % · Cb 0.456 -> 0.454
  HTML 195 KB autossuficiente · PDF 205 KB em 22 folhas A3
```

Essas cinco linhas são tudo o que você precisa para relatar o resultado.

**Pico e rms não são a mesma coisa, e a diferença importa.** O pico é a pior
aresta da chapa inteira, e num casco redondo ele quase sempre cai no garboard
perto da roda, onde a costura corre para a quilha e a tira torce depressa — é
onde qualquer chapeador briga com a chapa. O rms diz como está a chapa no geral.
Com 12 tiras, por exemplo, a tira do garboard tem pico de 3,7 % em duas arestas a
91 % do comprimento, com 0,22 % de rms: é um ponto duro localizado, não uma chapa
impossível. Relate os dois.

## O que vai dentro do HTML

Um arquivo só, sem rede, que abre por duplo clique e funciona no celular:

- casco em três dimensões, para girar, deslocar e aproximar, com as geratrizes
  (ou as diagonais) desenhadas por cima e um alternador entre o casco como
  tabelado e o casco em chapas;
- hidrostática **nas duas colunas**, com a diferença em porcentagem: deslocamento,
  volume, LWL, boca, áreas, LCB, LCF, Cb, Cp, Cw, Cm — a calado e densidade
  ajustáveis;
- curva de áreas das balizas;
- **planificação**: todas as chapas e todos os gabaritos de baliza sobre malha
  quadrada, na mesma escala, com o lado do quadrado escrito ao pé;
- tabela das chapas com retângulo de chapa, vão máximo, área em 3D, área plana,
  curvatura gaussiana total e deformação ao planificar;
- veredito de desenvolvibilidade;
- caixa para colar outra tabela de cotas e refazer tudo;
- botão que gera o PDF ali mesmo, com escolha de folha (A4/A3/A2) e escala
  (ajustar, 1:20, 1:10, 1:5, 1:2, 1:1).

Num casco de bojo redondo há ainda um alternador de **número de tiras** (6 a 20)
que refaz as diagonais, as chapas e a hidrostática.

## O que vai dentro do PDF

[`saida-exemplo-Planificacao-Casco-Quinado-Ana-Ribeiro.pdf`](saida-exemplo-Planificacao-Casco-Quinado-Ana-Ribeiro.pdf)
é a saída de verdade do exemplo quinado — abra para ver.

Capa com o casco, a hidrostática antes/depois e as tabelas de chapas e de
gabaritos. Depois **uma folha por peça**: contorno para cortar, geratrizes,
marcas das balizas, e a malha quadrada por baixo. No cabeçalho de cada folha vão
a escala e o lado do quadrado; no rodapé, uma **régua de 100 mm** — se ela não
medir 100 mm com a trena, a impressora reescalou e a folha não serve para cortar.

Em *ajustar*, a escala escolhida é sempre redonda (1:4, 1:16, 1:25), nunca
quebrada, para dar para contar quadrado. Numa escala fixa em que a peça não
caiba, a folha é ladrilhada com 10 mm de sobreposição e cruzetas de registro nos
cantos.
