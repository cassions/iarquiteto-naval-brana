# O que o painel mostra

## Dois métodos, de propósito

Uma estimativa sozinha não tem como se conferir. O painel traz dois autores que chegam
ao mesmo número por caminhos independentes.

**Dave Gerr**, *Propeller Handbook*, cap. 2 — curva empírica ajustada sobre barcos
reais. A porta de entrada é a razão **libras por cavalo**:

| | |
|---|---|
| 2-1 | `V/√L = 10,665 ÷ ∛(LB ÷ SHP)` — deslocamento e semi-planeio |
| 2-2 | `D/L = ton. longas ÷ (0,01 × WL)³` — quão leve o barco é para o comprimento |
| 2-3 | `V/√L máx = 8,26 ÷ (D/L)^0,311` — o teto do casco não planante |
| 2-4 | `Kts = C ÷ √(LB ÷ SHP)` — Crouch, para casco de planeio |

**John Teale**, *How to Design a Boat*, cap. 5 — pelo outro lado: estima a
**resistência** e converte em potência. `BHP = 2 × R × V / 550`, com R em libras e V em
pés/s. A Fig 47 dá a resistência em libras por tonelada, separada em **friccional**
(atrito) e **residual** (onda); a Fig 48 dá o **C<sub>p</sub> ótimo** para cada
velocidade.

Teale vale de V/√L **0,80 a 2,40** — deslocamento e semi-deslocamento. Em planeio o
bloco se apaga e diz por quê.

**Os dois costumam discordar**, e a diferença é a margem honesta da estimativa. Nenhum
dos dois olha a forma do casco além do peso e do comprimento.

## O teto de velocidade, regime por regime

O ponto que o capítulo de Gerr situa com precisão, e que o painel respeita:

- **Deslocamento** — manda a **razão D/L** (fórmula 2-3). É a regra geral.
- **Semi-planeio** — manda o **ângulo do alto de quarto de boca** (tabela 2-1). O livro
  a apresenta dizendo, textualmente, que estes ângulos indicam potencial de velocidade
  *para cascos de semi-deslocamento*. Em deslocamento ela é leitura de forma, não limite.
- **Planeio** — nenhum teto por D/L: um casco de planeio puro passa do que a razão D/L
  indicaria.

A **trava** do capítulo — alto acima de 8° **com** D/L acima de 290 a 300 — diz que
esse casco não pode ser *empurrado* acima de V/√L 1,4. Aparece onde alguém tenta.

## O alto de quarto de boca

O plano longitudinal a um quarto da boca da linha de centro; o que interessa é o ângulo
que a linha dele faz com a linha d'água **no corpo de ré**. Fundo chato e corrida
paralela dão ângulo perto de zero, e esse casco planeia. Popa afilada dá ângulo grande.
O painel **mede esse ângulo na tabela de cotas**, na flutuação corrente, e desenha.

Em português: *alto* é a linha longitudinal (buttock). *Vau* é o barrote transversal do
convés — coisa diferente.

## O coeficiente prismático

`Cp = ∇ ÷ (Am × LWL)`. Diz como o volume se distribui ao longo do casco. A Fig 48 de
Teale dá o ótimo para cada velocidade, e o painel compara com o do casco. O livro mostra
o que a diferença custa: quatro traineiras iguais de 65 pés, mesmo peso e mesma
velocidade — a de C<sub>p</sub> 0,537 precisou de **75 BHP**, a de 0,645 precisou de
**123**.

## Onde é estimativa

- A flutuação é **a prumo e sem trim**. Barco real raramente flutua nas linhas de
  projeto, e diferenças pequenas de trim afetam a resistência.
- **Apêndices não entram** — quilha, eixo, hélice e leme estão fora da tabela.
- **Água chata.** Teale é explícito: *«these are calm water figures, of course»*. Vale
  para os dois métodos: não há vento nem onda em nenhum dos dois.
- A **perda na transmissão** é premissa de quem usa. Gerr manda somá-la e não dá número.
  Do lado de Teale ela **não** se aplica: o «2 ×» da fórmula dele já é um rendimento
  propulsivo de 50% que inclui hélice e redutor.
- O **rendimento do hélice** já está dentro das constantes de Gerr (50 a 60%). Não
  descontar de novo.
- Quando a linha d'água alcança a borda o cálculo segue somando o convés como tampa
  estanque. O aviso aparece, e daí para cima o número fica otimista.

## As duas versões

A **aula** abre em sete passos: a tabela de cotas, o peso, a onda do casco, o regime, a
potência, a resposta e a ficha. Cada passo traz o conceito, a decisão, a conta com os
números da pessoa e uma pergunta de conferência. O passo 7 tem um botão que gera a
**ficha em PDF** pela impressão do navegador.

O **painel de página única** põe tudo à vista de uma vez: leituras, gráficos de
velocidade por potência e por peso, o casco desenhado na flutuação, as medidas lidas da
tabela, e um campo para colar outra tabela de cotas sem gerar de novo.

O botão do rodapé alterna, e o estado atravessa. O endereço guarda o modo: `#p1` a `#p7`
abre a aula no passo, `#simples` abre a página única.
