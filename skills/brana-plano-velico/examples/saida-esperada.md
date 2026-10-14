# Saída esperada

Teste de instalação: rode os dois exemplos e compare. **Caminho e tamanho do arquivo
não entram na conferência** — o caminho é absoluto e depende de onde você rodou, e o
tamanho varia alguns KB com o comprimento do nome e da tabela. O que tem de bater são
as linhas de formato, casco, linha d'água e o bloco de números.

O bloco "o painel abre assim" só aparece quando há `node` no caminho: ele roda o
motor do próprio painel sem tela, então os números são exatamente os que o painel vai
mostrar. Sem `node`, o script diz isso e o resto continua igual.

## 1. Tabela por balizas — patilhão de 7,20 m

```bash
python scripts/montar.py --nome "Ana Ribeiro" --cotas examples/entrada-balizas.tsv --saida .
```

```
formato       balizas, bojo redondo (12 colunas, 13 balizas)
casco         LOA 7.200 m | boca max 2.240 m | 13 balizas
linha d'agua  nao declarada: o painel abre no calado da esbeltez do programa
projetista    Ana Ribeiro
saida         <pasta de trabalho>\Plano Velico - Ana Ribeiro.html

o painel abre assim (numeros do motor do proprio painel):
  casco        Delta 2306 kg | calado do casco 1.145 m | Cp 0.588 | Cb 0.190
  apendices    Patilhão (full keel) | quilha 1.572 m2 | leme 0.763 m2 | calado total 1.14 m
  pano         29.2 m2 nominais (k 17.5, SA/Sw 2.11) | Sloop, Triangular (bermudiana)
  equilibrio   lead 10.5% (faixa 8 a 13) | Dellenbaugh 46.6 graus | GM 0.33 m | AVS 136 graus
```

Repare que ele **abre em patilhão** — a baliza junto da quilha é magra (razão de
madeiramento morto 0,057), sinal de que o perfil do patilhão está desenhado na
própria tabela de cotas. O painel abre com a **profundidade do patilhão em zero**, ou
seja o fundo na linha de base, e soma ao plano lateral apenas o que fica abaixo da
linha de quilha da tabela: aqui 1,572 m², que é o vão que sobra porque essa linha
sobe nas pontas. Nada é contado duas vezes, e o passo 3 avisa, nesta tabela, que esse
vão preenchido é quilha nova e não a que o casco já tinha. O leme vem com skeg, que
é o que se usa nessa forma.

O Dellenbaugh de 48° é honesto e é a lição do passo 5: o casco abre **sem lastro**, e
sem lastro este barco adernaria muito para o pano que tem. Ligar o lastro na trilha
resolve.

## 2. Tabela por linhas d'água — veleiro de 12 m

```bash
python scripts/montar.py --nome "Cassio" --cotas examples/entrada-linhas-dagua.txt --saida .
```

```
formato       linhas d'agua (19 linhas x 19 balizas)
              espelho de popa fechado em x=0, fundo a 0.800
              talha-mar fechado em x=11.969, topo a 1.900
              tabela em metros: multipliquei tudo por 1000
casco         LOA 11.969 m | boca max 3.608 m | 21 balizas
linha d'agua  500 mm, declarada na tabela
projetista    Cassio
saida         <pasta de trabalho>\Plano Velico - Cassio.html

o painel abre assim (numeros do motor do proprio painel):
  casco        Delta 5306 kg | calado do casco 0.485 m | Cp 0.532 | Cb 0.390
  apendices    Bolina pivotante | quilha 1.749 m2 | leme 0.780 m2 | calado total 2.34 m
  pano         59.5 m2 nominais (k 20.0, SA/Sw 2.83) | Sloop, Triangular (bermudiana)
  equilibrio   lead 13.0% (faixa 12 a 14) | Dellenbaugh 17.2 graus | GM 1.19 m | AVS 96 graus
```

As 19 balizas do arquivo mais as duas pontas fechadas pelos contornos dão 21. Casco
raso e de boca larga: abre em **bolina pivotante**, e o programa é sugerido pela
esbeltez medida (LWL/∇^⅓ = 5,40, mais perto de cruzeiro-regata) porque **a tabela
declara a linha d'água** — quando ela não declara, medir a esbeltez seria só repetir o
palpite do próprio painel, e o programa fica em cruzeiro.

No passo 1 dele: área lateral submersa 3,070 m², Cp 0,532, Cm 0,732, Cb 0,390 — e
0,532 × 0,732 = 0,390 na tela, que é a identidade Cb = Cp·Cm.

## O que sai no arquivo

Um HTML único de ~400 KB, offline, que abre na **trilha de ensino de oito passos** e
tem o **painel completo** atrás do botão do rodapé. O nome informado aparece no nome
do arquivo, no rodapé, no cabeçalho da versão avançada e na legenda do PDF.

O botão "Baixar PDF" produz a prancha do plano vélico em escala, a folha da curva de
braços de endireitamento e a memória de cálculo. São **três folhas A3** no exemplo 1 e
**quatro** no exemplo 2 — a memória é paginada, então o número depende de quanto ela
tem a dizer sobre aquele barco.
