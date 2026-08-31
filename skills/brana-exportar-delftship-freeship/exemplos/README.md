# Exemplos de entrada e saída

Três casos que cobrem tudo que a skill trata. Os `.part` aqui foram gerados com
`--nome="Ana Souza"` e são a saída real dos comandos abaixo — servem de referência,
**não** são o casco de quem está usando a skill.

## 1. Casco quinado — chine, 8 balizas, LOA 6,000 m

Entrada: [`entrada-quinado.txt`](entrada-quinado.txt) · cabeçalho `stn x sheer_hb
chine_hb sheer_ht chine_ht keel_ht deadrise_deg`, ponto decimal.

```bash
python scripts/gerar-part.py --tabela=exemplos/entrada-quinado.txt --nome="Ana Souza"
```

```
formato detectado : quinado, 8 balizas, LOA 6.000 m
malha             : 493 pontos, 956 arestas (117 vivas), 464 faces
camadas           : Fundo, Costado, Espelho
volume meio casco : 2.2631 m3 ate a borda
arquivo           : Casco-Quinado-Ana-Souza.part  (28705 bytes)
todas as 17 verificacoes passaram - arquivo pronto, nao precisa abrir para conferir
```

Saída: [`Casco-Quinado-Ana-Souza.part`](Casco-Quinado-Ana-Souza.part). Das 117 arestas
vivas, 73 são de contorno, 20 são a quina costado/espelho e 24 são a **linha do chine**.
Três camadas, porque casco quinado tem fundo e costado separados pela quina.

## 2. Casco de bojo redondo — 3 níveis, 6 balizas, LOA 6,000 m

Entrada: [`entrada-redondo.txt`](entrada-redondo.txt) · níveis a 25/50/75 % do pontal,
e **vírgula decimal**, de propósito, para exercitar a detecção do separador.

```bash
python scripts/gerar-part.py --tabela=exemplos/entrada-redondo.txt --nome="Ana Souza"
```

```
formato detectado : redondo, 6 balizas, LOA 6.000 m
malha             : 651 pontos, 1270 arestas (101 vivas), 620 faces
camadas           : Casco, Espelho
volume meio casco : 3.2838 m3 ate a borda
arquivo           : Casco-Redondo-Ana-Souza.part  (38066 bytes)
todas as 16 verificacoes passaram - arquivo pronto, nao precisa abrir para conferir
```

Saída: [`Casco-Redondo-Ana-Souza.part`](Casco-Redondo-Ana-Souza.part). Bojo redondo não
tem quina longitudinal, então as 101 arestas vivas são só contorno (81) e a quina do
espelho (20). A proa fecha num ponto único.

## 3. Traquino — 7 níveis, 12 balizas, LOA 3,779 m

Entrada: [`entrada-traquino.txt`](entrada-traquino.txt) · níveis a 12,5 % … 87,5 %, e a
última baliza com meias-bocas zeradas mas **quilha e borda em alturas diferentes**.

```bash
python scripts/gerar-part.py --tabela=exemplos/entrada-traquino.txt --nome="Ana Souza"
```

```
formato detectado : redondo, 12 balizas, LOA 3.779 m
malha             : 734 pontos, 1413 arestas (127 vivas), 680 faces
camadas           : Casco, Espelho
volume meio casco : 0.6708 m3 ate a borda
arquivo           : Casco-Redondo-Traquino-Ana-Souza.part  (42367 bytes)
todas as 16 verificacoes passaram - arquivo pronto, nao precisa abrir para conferir
```

Saída: [`Casco-Redondo-Traquino-Ana-Souza.part`](Casco-Redondo-Traquino-Ana-Souza.part).
Este é o caso que separa os dois tratamentos de proa: como quilha (615,4) e borda
(740,4) diferem, a proa **não** é um ponto — é o segmento vertical de 125 mm da cabeça
do talha-mar, que vira aresta de contorno e portanto quina viva. Tratar como ponto
achataria essa aresta.

Repare também no nome do arquivo: o `Traquino` veio do nome do arquivo da tabela.
Sem isso, este caso e o exemplo 2 disputariam o mesmo nome, já que os dois são redondos
do mesmo projetista. Para controlar, use `--projeto=<nome do barco>`.
