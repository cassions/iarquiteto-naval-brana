# O que o painel faz, e como

Leia isto quando a pessoa perguntar o que ela recebeu, como o número foi obtido, ou
até onde ele vale. Não é preciso ler para gerar.

## O que está na tela

**Tabela de pesos.** O barco na primeira linha — não removível, mas editável em massa
e nas três coordenadas do CG. Cada carga a bordo nas linhas seguintes: entram por
chips prontos (Pessoa 75 kg, Motor 60 kg, Combustível 40 kg, Carga 20 kg) ou pelo
`+ peso`, saem pelo `✕`, até onze pesos. Clicar numa linha escolhe qual peso os
sliders movem; as células aceitam valor digitado. O rodapé da tabela mostra o peso
total e o CG resultante.

**Visualizador 3D.** O casco em WebGL, orbitável, com o plano d'água inclinado ao vivo
e grade sobre ele para a inclinação ser legível. Obra viva e obra morta trocam de cor
por pixel contra o plano, então a linha d'água fica nítida em qualquer aproximação.
Marcadores de **G** (centro de gravidade do conjunto), **B** (centro de carena) e de
cada peso, com etiqueta; o peso selecionado ganha um traço até G, que é o quanto ele
puxou a média. Os marcadores aparecem em fantasma quando estão dentro do casco.

**Leituras.** Trim e banda em graus e em diferença de calados, calado a ré e a
meia-nau, imersão máxima perpendicular ao plano d'água, borda livre mínima com o lugar
onde ocorre, deslocamento, volume, LCG/LCB, TCG/TCB, KG/KB, GM<sub>t</sub> e
GM<sub>l</sub>, BM, momento para 1° de banda e para 1° de trim, área do plano d'água,
LCF, comprimento e boca na linha d'água. Tudo em metro.

**Dois diagramas 2D e a curva de braços.** Seção transversal com a linha d'água
inclinada, área imersa, G, B, o metacentro M e os pesos; perfil pela linha de centro
com o trim; e a curva GZ de −90° a +90°, com a tangente do GM, a banda de equilíbrio
marcada, o pico do braço contado a partir do equilíbrio, o ângulo onde o braço se
anula e o ângulo em que a borda mergulha. A curva responde ao ponteiro.

**Botão "Copiar condição"** copia a condição de carga inteira em texto com tabulação
entre as colunas: cola em planilha como colunas, em documento como tabela.

## Como o equilíbrio é resolvido

O casco flutuando livre tem três incógnitas que interessam: quanto afunda, quanto
inclina de banda, quanto de trim. O plano d'água fica descrito por uma normal
`n̂(trim, banda)` e uma distância `d`, e as três condições que o fecham são de livro:

1. `ρ · V(plano) = peso`
2. `(G − B) · ê₁ = 0` — sem momento longitudinal
3. `(G − B) · ê₂ = 0` — sem momento transversal

As duas últimas dizem apenas que **B fica exatamente sob G**. O CG que entra ali é a
média ponderada da tabela de pesos, `G = Σ(wᵢ·gᵢ)/Σwᵢ`.

O calado é resolvido primeiro, por Newton, com a área do plano d'água como derivada
exata (`dV/dd = A_wp`) dentro de um intervalo de segurança. Com o volume certo, os dois
braços residuais viram correção angular dividindo pelo raio metacêntrico —
`Δθ = r_L/GM_L`, `Δφ = r_T/GM_T` — com os momentos de inércia do plano d'água como
jacobiano. Em banda grande, ou com GM negativo e equilíbrio adernado, o GM
metacêntrico erra o sinal; aí manda a inclinação medida entre as duas últimas
iterações. Converge em 4 a 8 iterações para braço residual abaixo de 0,00002 m, e cada
solução custa cerca de 2 ms — o slider acompanha a mão.

Com banda, a linha d'água deixa de ser horizontal dentro da baliza: é uma reta de
declividade `tan(banda)`. Então a área imersa passa a ser o recorte do **polígono
inteiro** da seção — de bombordo, em volta da quilha, até estibordo, fechado pela linha
do convés — por um semiplano, com área e centroide exatos sobre a poligonal. São 201
balizas integradas por trapézios.

## O que foi conferido

O motor foi validado contra valores com resposta conhecida, 57 verificações:

- **caixote 10 × 2 × 0,5 m**: volume, LCB, KB, área do plano d'água,
  `BM_t = B²/12T` e `BM_l = L²/12T` exatos; adernado 12°, o TCB e o KB batem com a
  forma fechada do trapézio imerso;
- **trim e banda de equilíbrio** contra a fórmula de bordo reto
  `GZ = (GM + BM·tg²/2)·sen`, dentro de 0,005°;
- **GM negativo com equilíbrio adernado**: o caixote com o CG 30 mm acima do KM assenta
  em 11,980° contra 11,977° analítico;
- **B sob G** no caso combinado: `|(G−B) × n̂|` abaixo de 0,05 mm;
- **casco real**: volume e LCB batem com o motor hidrostático do visualizador anterior;
  espelhar o CG em y espelha a banda exatamente; 200 e 480 balizas dão o mesmo volume
  dentro de 0,00002%.

## Onde o número é estimativa

**O casco é tratado como sólido estanque** — casco, convés e espelho. Quando a borda
mergulha, o painel avisa, mas continua somando a flutuação de reserva do convés como se
ele fosse uma tampa. Daí em diante o número é otimista em relação ao barco real, que
embarcaria água.

**A curva de braços é traçada com trim congelado** no valor do equilíbrio, a volume
constante. Deixar o trim livre a cada ângulo mudaria a curva nos ângulos grandes,
sobretudo em popa larga.

**Não entram**: superfície livre de tanques, água embarcada, apêndices fora da tabela
de cotas (quilha, skeg, hélice), permeabilidade de compartimentos, momento do vento.
O CG do barco vazio é uma **hipótese** — começa no centro de carena da flutuação
inicial, e a pessoa deve substituir pelo valor real na primeira linha da tabela.

**Entre as balizas o casco é interpolado**, e a finura do bojo depende de quantos
níveis a tabela traz. O espelho de popa entra como face plana vertical na primeira
baliza: forma e comprimento ficam certos, a inclinação real não aparece.

Nada disto impede o uso a que o painel se presta — comparar condições de carga,
enxergar o efeito de mover peso, achar o limite de borda livre. Impede usá-lo como
prova de estabilidade para classe ou autoridade, que pede o casco completo, com
tanques e apêndices, no software de classificação.
