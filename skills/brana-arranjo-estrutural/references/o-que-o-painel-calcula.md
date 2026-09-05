# O que o painel calcula, e de onde vem cada número

## As duas telas

**Versão de aula**, que é a que abre — nove passos, um por decisão:

1. **Que barco é este.** As três medidas saem da tabela. Delas saem o número de
   escantilhão S<sub>n</sub> de Gerr e a carga de projeto do ABS, as duas com a
   conta aberta linha a linha.
2. **De que material.** Cinco materiais, cada um com a sua tensão de projeto e a
   sua equação. Uma barra compara a espessura que cada um pediria no mesmo casco e
   no mesmo espaçamento.
3. **A que velocidade.** A carga de impacto de planeio entra aqui, e o painel mostra
   a partir de quantos nós ela passa à frente da carga hidrostática.
4. **Onde ficam os reforços.** Dois desenhos da mesma grade — vista de topo e corte
   transversal — e os dois espaçamentos em sliders.
5. **Que espessura comprar.** A conta inteira pelos dois caminhos, as bitolas
   comerciais e os dois fatores de segurança.
6. **Que perfil vai ser cada reforço.** Os sete reforços do arranjo, um a um. Para
   cada um o painel monta um catálogo de bitolas de mercado, calcula a seção
   composta com a faixa de chapa que trabalha junto (subseção 3.5) e oferece as
   oito mais leves que passam, com o corte desenhado e a linha neutra marcada.
7. **Onde ficam as anteparas de colisão.** Uma de vante e uma de ré, e o cursor
   escolhe **em que caverna** cada uma fica, contada da ponta para dentro — não uma
   distância livre. Elas reaproveitam a chapa do costado, o espaçamento dos
   longitudinais e o perfil da baliza.
8. **Quanto pesa, e onde.** Chapeamento, reforços e anteparas numa tabela de pesos e
   centros, com L<sub>CG</sub> medido do espelho e V<sub>CG</sub> da linha de base.
9. **O casco inteiro.** Fundo, costado, espelho e convés numa tabela, o módulo de
   seção exigido dos reforços, o peso do chapeamento, e o botão do PDF — catorze
   seções, incluindo os perfis escolhidos, as anteparas e o quadro de pesos.

**Versão avançada**, pelo botão do rodapé: o mesmo cálculo numa página só, com o 3D
do casco, a curva de espessura ao longo do comprimento e a ficha de conferência.

As duas telas leem **o mesmo `compute()`**. Elas não podem discordar.

## As três fontes

**[A] ABS, Guide for Building and Classing Offshore Racing Yachts, 1994.** Daqui vem
a espessura exigida pelo caminho longo e o módulo de seção dos reforços. Carga na
Tabela 7.1; desconto por área nas 7.4 e 7.5; forma do painel na 7.3; tensão de
projeto na 7.2; materiais nas 4.1 a 4.4. Chapeamento pela 7.1 em metal e madeira
laminada, 7.3.1 em fibra, 7.5.1 em tabuado liso; reforços pela 8.1.3, com C = 817
nos reforços de casco e convés, 1800 na hastilha da linha de centro e **619 no prumo
de antepara**. A largura efetiva de chapeamento que trabalha junto com o reforço sai
da subseção **3.5** — 100·t em metal, 50·t em compensado, 18·t mais a base em fibra,
e **nenhuma em tabuado liso** (3.5.4), que é o que faz a caverna de tabuado sair tão
mais alta. Da antepara: carga na **Tabela 7.1 d)**, com piso de 1,52 m; tensão de
projeto da chapa na 7.2 e a do prumo na 8.2.

**[B] Dave Gerr, The Elements of Boat Strength.** O caminho curto: S<sub>n</sub>
pela Fórmula 1-1, com as correções 1-2 e 1-3, e as espessuras diretas — 4-1, 4-2 e
4-4 em fibra; 9-1, 9-3 e 9-19 em madeira; 11-13, 11-14 e 11-15 em casca laminada;
15-1A a 15-6A em alumínio; 15-1S a 15-6S em aço; 15-9, 5-1 e 5-5 nos espaçamentos.
Todas conferidas contra os exemplos resolvidos do próprio livro.

**[C] Gerr, IBEX 2010, sessão 501.** A cadeia de carga de impacto: pressão de pico
de Hendrickson &amp; Spencer (p.25), redução por área de Koelbel (p.26), tensão de
membrana de Rawson &amp; Tupper (p.28), os fatores de segurança alvo (p.29) e o teto
`45 − 0,33·S<sub>n</sub>`.

## Os dois fatores de segurança

O painel mostra dois, e eles não medem a mesma coisa.

**FS regra** — razão entre a ruptura de referência do material e a tensão que a
chapa adotada sofre sob a carga hidrostática do ABS. **O Guia não publica esse
número**: a expressão "factor of safety" não aparece em nenhuma das suas 57 páginas.
O que ele publica é a tensão de projeto da **Tabela 7.2**, e o critério é
`σ ≤ σa`. A razão é calculada pelo painel, e ele diz isso.

A Tabela 7.2 usa **bases diferentes** por material — 0,60 da ruptura à tração em aço
e alumínio, 0,50 da flexão em fibra, 0,50 do módulo de ruptura em madeira laminada,
0,40 em tabuado liso. Os pisos 1,67 / 2,00 / 2,00 / 2,50 são frações de grandezas
distintas: **a coluna não se compara entre materiais**, só entre regiões do mesmo
material.

**FS impacto** — a mesma razão contra a tensão de membrana sob a pressão de impacto.
Os alvos são do paper do IBEX, p.29: 1,5 para carga dinâmica de fundo, 3,0 para
carga estática. Vem do **paper**, não do livro: o livro não publica fator de
segurança para a regra S<sub>n</sub>.

Fora do fundo os dois costumam dar o mesmo número, porque ali a verificação de
impacto toma emprestada a carga do ABS e o painel ainda trabalha em flexão. A §12 do
PDF abre isso, e explica quando eles se separam.

## Onde este painel estende a fonte

Está dito na tela e no PDF, mas vale ter à mão:

- **O fator de velocidade** que multiplica a pressão de impacto é construção deste
  painel. Nem o Guia nem o paper põem velocidade na pressão. Por isso o número do FS
  impacto não se reproduz a partir das planilhas do paper sem zerar esse fator.
- **Os alvos 1,5 e 3,0** estão impressos na p.29 dentro dos blocos do laminado de
  fibra e do alumínio 5083. Aplicá-los a aço, madeira maciça e compensado é extensão.
- **Compensado em folha** não está em fonte nenhuma: o ABS só exige qualidade naval
  na 4.9, e o livro cobre strip-plank e cold-molded. Aqui ele é calculado como
  madeira laminada.
- **O espelho de popa** não tem cláusula própria e é tratado como casca na
  extremidade de popa.
- **A volta do bojo** no casco redondo — o ponto onde o fundo vira costado — é
  adotada onde a parede da baliza passa de 45°. Nenhuma das fontes define isso; é
  critério deste painel, e muda quanto de perímetro cada região recebe.
- **Densidades** do cálculo de massa: as madeiras saem da Tabela 4.4 do ABS; as
  outras três são valores de catálogo, fora das fontes. O núcleo do chapéu de fibra
  é contado a 80 kg/m³, espuma de PVC, também de catálogo.
- **A posição da antepara de colisão não vem de fonte nenhuma.** O Guia ABS de 1994
  **não exige** antepara de colisão — a palavra não aparece nas suas 57 páginas — e o
  livro de Gerr não a inclui no pacote S<sub>n</sub>. A faixa usual que o painel
  desenha, de 5% a 15% do comprimento a vante e de 5% a 12% a ré, é prática de
  classificação: o piso de 5% vem das regras de navio. O **dimensionamento**, esse
  sim, é do Guia.
- **F = 1 na antepara.** A cláusula 7.1 define o fator F como "dado na Tabela 7.4
  para chapeamento de casco e na 7.5 para chapeamento de convés" — e não dá nenhuma
  tabela para antepara. O painel usa F = 1 ali, que é o lado seguro, e diz isso.
- **O teto do terço.** O cursor da antepara não passa de cerca de um terço do
  comprimento a contar da ponta. É critério deste painel: mais para dentro que isso
  a parede deixa de ser antepara de colisão e vira divisória de compartimento.
- **As bitolas dos perfis** saem de escadas de mercado montadas por este painel, e
  **não são seções normalizadas** de nenhuma das duas fontes. O que vem da fonte é o
  módulo de seção exigido; a peça que o atende é escolha do painel — e sua.

## O que o painel não faz

Não é projeto estrutural completo. Ficam de fora: reforço do fundo na quilha,
anteparas de compartimentação além das duas de colisão, berços de motor, construção
sanduíche, reforço local de ferragens, o incremento das hastilhas pelo peso do
lastro e a resistência longitudinal do casco.

O quadro de pesos do passo 8 cobre **chapeamento, reforços e as duas anteparas**, e
mais nada: não entram margem de construção, solda, cola, resina de laminação,
cantoneiras de canto, chapas de reforço nos cruzamentos, ferragens nem tinta. O
painel mostra o total com 12% de margem ao lado, e diz que é estimativa.

Também não há estabilidade, trim nem banda — para isso existe a skill de pesos e
centros, que lê a mesma tabela.
