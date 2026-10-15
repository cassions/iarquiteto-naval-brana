# Entrada e saída

Dois exemplos. **Caminho e tamanho do arquivo não entram na conferência** — o
caminho é absoluto e o tamanho varia alguns KB com o comprimento do nome. O que tem
de bater são as linhas de casco, pano, apêndices e estabilidade.

## 1. Exemplo da skill — sloop de 8,5 m

Entrada: `examples/exemplo-plano-velico.pdf`, um plano vélico fictício escrito com as
mesmas linhas que o painel da Brana imprime. É o teste de instalação.

```bash
python scripts/montar.py --nome "Ana Ribeiro" --pdf examples/exemplo-plano-velico.pdf --saida .
```

```
barco         sloop, triangular (bermudiana), buja
casco         LOA 8.500 m | LWL 7.300 m | boca LWL 2.540 m | calado 1.520 m
peso          2640 kg | superficie molhada 13.420 m2 | Cwp 0.704 | LCB 4.180 m da popa
pano          32.10 m2 nominais (SA/D 17.1) | grande 19.60 m2 + buja 16.80 m2
apendices     quilha 1.090 m2 (AR 1.45) | leme 0.460 m2 (AR 3.00)
estabilidade  GM 0.640 m | KG 0.830 m | GZ max 0.392 m a 52 graus | AVS 118 graus | lastro: 0,34 (898 kg)
no jogo       velocidade de casco 6.6 nos | 2 vela(s), 1 mastro(s) | sonda alerta abaixo de 1.52 m
projetista    Ana Ribeiro
saida         <pasta de trabalho>\Jogo de Vela - Ana Ribeiro.html (112 KB)
```

No jogo, esse barco abre com velocidade máxima de **6,6 nós** na polar de 14 nós de
vento (a própria velocidade de casco do LWL) e o melhor VMG de ceñida a 45°. Com AVS
de 118° o menu diz que ele volta sozinho de quase qualquer banda.

## 2. O veleiro de 12 m do painel

Entrada: o PDF de quatro folhas gerado pela skill `brana-plano-velico` para o casco
de 12 m (`Plano-Velico-Vel12m.pdf`).

```
barco         sloop, triangular (bermudiana), genoa
casco         LOA 11.969 m | LWL 10.473 m | boca LWL 3.162 m | calado 2.304 m
peso          8882 kg | superficie molhada 26.683 m2 | Cwp 0.716 | LCB 6.078 m da popa
pano          73.52 m2 nominais (SA/D 17.4) | grande 39.99 m2 + genoa 49.25 m2
apendices     quilha 2.116 m2 (AR 1.34) | leme 0.888 m2 (AR 3.00)
estabilidade  GM 0.989 m | KG 1.075 m | GZ max 0.505 m a 45 graus | AVS 94 graus | lastro: nao lastrado
no jogo       velocidade de casco 7.9 nos | 2 vela(s), 1 mastro(s) | sonda alerta abaixo de 2.30 m
projetista    Ana Ribeiro
ATENCAO       AVS de 94 graus: o simulador vai emborcar com facilidade - e o que o plano diz.
```

Cada número aí sai do PDF, sem conta nenhuma pelo caminho: confira contra as folhas
1 e 3 do plano vélico. A linha `ATENCAO` é leitura do barco, não defeito — o casco
não é lastrado, e o jogo emborca passados 86° de banda (0,92 do AVS).

Na água esse barco faz **6,5 nós a 45° de TWA** e 7,7 nós de máximo em 14 nós de
vento, com 22° de banda em ceñida — o mesmo adernamento que a folha 2 do plano
vélico anuncia para a brisa de referência.

## O que o montador faz com o PDF

1. Tira o texto do PDF com a biblioteca padrão (os streams do gerador da Brana são
   texto `Tj` com coordenadas), agrupa por linha e tira os acentos.
2. Lê os números por expressão regular, linha a linha: casco, apêndices, rig, velas,
   equilíbrio e estabilidade.
3. Deriva o que o desenho precisa e o PDF não traz: boca máxima do convés
   (1,17 × boca na linha d'água), contorno do convés e da linha d'água (curva de
   potência com a área do plano d'água igual ao Cwp medido e boca máxima no LCF),
   punho de amura e pé de cada vela (de AR = punho²/área, definição de Teale) e o
   centro hidrodinâmico do casco, que é o que dá leme de barlavento.
4. Troca os três marcadores do modelo (`@@BARCO@@`, `@@NOME@@`, `@@DATA@@`) e
   escreve o HTML.

Nada de hidrostática é refeito aqui: deslocamento, superfície molhada, Cwp, GM e a
curva de braços vêm medidos do painel, pelo PDF.
