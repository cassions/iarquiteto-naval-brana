# Opções do gerar_relatorio.py e o que entra em cada item do PDF

Leia só quando precisar de um detalhe. O `SKILL.md` já cobre o uso normal.

## Opções

| Opção | Obrigatória | O que faz |
|---|---|---|
| `--nome` | sim | Nome de quem preenche. Entra no cabeçalho e no arquivo: `Area_de_Navegacao_<Nome>.pdf` |
| `--partida`, `--chegada` | sim | Nome do lugar, `"lat,lon"` ou `"lat,lon:Rótulo"` |
| `--wp` | não | Ponto intermediário, na ordem. Repetível. Mesmo formato de `--partida` |
| `--velocidades` | não | Padrão `5,10,20,30` (nós). O relatório converte para km/h |
| `--afastamento-mn` | não | Maior afastamento da costa, em milhas. **O script mede sozinho no raster**; só passe para sobrepor |
| `--so-abrigado` | não | Força NORMAM "Interior" (derrota inteira em águas abrigadas) |
| `--declinacao` | não | Declinação magnética em graus, W positivo. Lida na rosa da carta |
| `--zoom-km` | não | Lado do recorte das cartas de saída e chegada. Padrão 12 km |
| `--margem-km` | não | Folga em volta da derrota na carta do percurso. Padrão 9 km |
| `--atencao-saida/-percurso/-chegada` | não | Texto extra nos pontos de atenção. Repetível |
| `--calado-max` | não | Ex.: `"1,5 m"`. Sem ele o campo sai `N/A` |
| `--calado-linha` | não | Linha extra da tabela: `"trecho\|profundidade\|restrição"`. Repetível |
| `--data` | não | `dd/mm/aaaa`. Padrão: hoje |
| `--dados` | não | Pasta do acervo raster do CHM. Também lê `CARTAS_NAUTICAS_DIR` |
| `--saida` | não | Pasta de saída. Padrão: pasta atual |
| `--sem-desvio` | não | Não contorna a terra sozinho; deixa a derrota em reta |
| `--sem-timbrado` | não | Gera sem o papel timbrado Brana |

## As 10 páginas

1. **Resumo** — números da travessia, tempos e a caixa "Respostas rápidas" com NORMAM, ISO, janela, calado, vento/mar e cartas.
2. **Instruções, Região e Derrota** — texto fixo do Caso de Uso, setores de clima atravessados, área METAREA e a tabela de pontos de passagem com rumo e milhas.
3. **Saída** — carta de maior escala que cabe no recorte, com a derrota traçada e os alertas do setor de partida.
4. **Percurso** — carta que cobre a derrota inteira. Se a carta for alta, o texto vai ao lado.
5. **Chegada** — igual à saída, no ponto final.
6. **Clima** — quadro mensal de vento (nós e km/h), direção, ondas e chuva, mais os extremos já registrados.
7. **Maré, corrente e calado** — marégrafo de referência de cada ponta, sizígia e quadratura, correntes e a tabela de calado.
8. **NORMAM** — tabela das três áreas de navegação com a escolhida em negrito, habilitação, equipamentos e porte.
9. **ISO e janela operacional** — tabela das quatro categorias, a recomendada e a mínima, e a janela de cada setor.
10. **Cartas e fontes** — procedência de cada carta, fontes de clima e maré, cálculos e os avisos.

## De onde vem cada número

- **Distância e rumo**: loxodrômica (rumo constante) sobre datum WGS-84, calculada ponto a ponto.
- **Pontos de passagem**: os que você passar em `--wp` são mantidos na ordem; os demais
  saem do desvio automático sobre o raster, e o console diz de qual carta veio cada um.
- **Cartas**: acervo raster BSB/KAP do CHM. A da saída e a da chegada são as de maior escala em que cabe, inteiro e sem invadir a margem, um recorte de `--zoom-km` centrado no ponto. A do percurso é a de maior escala que contém todos os pontos.
- **Clima, maré e corrente**: `data/clima_nautico_brasil.md`, que divide o Brasil em 59 setores (33 costeiros e 26 de hidrovia). A skill escolhe os setores mais próximos de cada ponto da derrota.
- **Categoria ISO**: a **recomendada** usa o p99 de vento e de onda dos setores, ou seja, a condição superada em 1% das horas — o pico absoluto de uma série de reanálise não deve, sozinho, empurrar um barco costeiro para a categoria oceânica. A **mínima** usa o p90 de vento e a onda típica da metade mais calma do ano, e só vale para quem navega na janela boa com previsão confirmada. Se o pico já registrado cair numa categoria acima da recomendada, o relatório diz isso como ressalva. Limites da ISO 12217: A acima de 40 nós e 4 m; B até 40 nós (74 km/h) e 4 m; C até 27 nós (49 km/h) e 2 m; D até 16 nós (28 km/h) e 0,3 m.
- **Área NORMAM**: NORMAM-211/DPC (esporte e recreio). Interior = águas abrigadas ou parcialmente abrigadas, Arrais-Amador. Costeira = dentro da visibilidade da costa, até 20 milhas, Mestre-Amador. Oceânica = sem restrições, Capitão-Amador. Para uso comercial vale a NORMAM-201/DPC.

## Desvio automático, conferência e sondagem

O `gerar_relatorio.py` faz três coisas sozinho, sem gerar imagem nenhuma, e é isso que
torna uma única invocação suficiente.

**1. Contorna a terra.** Quando a reta entre dois pontos cruza terra, o `roteador.py`
decodifica o recorte da carta mais detalhada que contém a perna, reduz o raster a uma
grade de células (terra é intransponível, água rasa custa mais que água funda, passar
perto da costa custa mais que ir ao largo), atravessa essa grade por uma busca de menor
custo (A\*) e enxuga o caminho: sobra só o mínimo de pontos que ainda se enxergam em
linha reta pela água. Cada ponto inserido aparece no console como `Desvio automatico |`
e no relatório, dito como cálculo do programa.

A busca começa numa grade grossa (260 células no maior lado) e afina até 820 se
preciso. A grossa decide por qual lado da ilha passar e custa pouco; uma célula grande
deixa canal estreito aberto de propósito. **Quem arbitra é sempre a grade fina**: um
caminho só é aceito se estiver limpo nela. Sem essa arbitragem o roteador entregava
caminho que a conferência depois reprovava — numa célula de 0,8 km uma restinga de
0,4 km é minoria e simplesmente desaparece.

São até 4 rodadas, e cada uma reconfere a derrota inteira. Se uma rodada não reduzir a
terra atravessada, insistir no mesmo desvio daria no mesmo: o programa então **parte a
perna suja**, cercando o trecho reclamado com dois pontos na própria reta, e a rodada
seguinte roteia o pedaço curto — onde a carta tem escala útil. Numa perna de 100 MN a
carta é de escala pequena demais para o roteador enxergar a saída do porto; num pedaço
de 6 km, a mesma carta dá célula de 50 m.

**2. Confere a derrota** pixel a pixel. Cada perna é conferida na carta de **maior
escala** que a contém — em escala pequena um canal estreito some e daria alarme falso.
Reporta trecho por terra (a partir de 0,4 km, para não contar símbolo solto), quantos km
correm pela faixa de água rasa, e o **afastamento máximo da costa** em milhas, que
alimenta a classificação NORMAM. Perto do cais os primeiros e últimos 600 m são
ignorados: ali terra é esperada.

**3. Sonda, quando pedido.** Se o desvio não achar caminho, o `sondar.py` imprime um
mapa de texto (`#` terra, `-` raso, `.` fundo, `?` traço da carta) centrado num ponto, na
carta de maior escala que o cobre:

```
python scripts/sondar.py -23.90 -45.45 --raio 12
```

`--carta` força outra carta e `--colunas` alarga o mapa. Escolha um ponto em água funda
e passe `--wp "lat,lon"` na ordem, repetindo até a conferência dizer "derrota limpa".

O `roteador.py` também roda sozinho, para ver só os pontos sem montar o PDF:

```
python scripts/roteador.py "-23.778,-45.358" "-23.995,-46.297"
```

O que nada disso enxerga: pedra isolada, laje, balizamento, área restrita e profundidade
em número. Isso continua sendo leitura de carta.

**Onde o desvio automático não chega.** Em canal urbano estreito o raster fica cheio de
traço — ponte, cais, píer, cabo — e a ponte desenhada atravessando o canal é lida como
terra: o barco passa por baixo, o classificador não sabe disso. Foi o que sobrou em dois
testes de doze, o Estreito de Florianópolis e a Baía de Vitória. Nos dois o `sondar.py`
mostra o vão e dois `--wp` resolvem; em Vitória, `--wp "-20.3233,-40.3369" --wp
"-20.3280,-40.3200"` fecha a derrota limpa.

## Quando algo dá errado

**"Acervo nao encontrado"** — rode `scripts/baixar.py` ou aponte `--dados`.

**"Nenhuma carta do acervo cobre X"** — o ponto está em terra longe da costa, ou o
geocodificador achou a cidade homônima errada. Confira as coordenadas que o script
imprimiu e passe `lat,lon` na mão.

**"Nenhuma carta cobre a derrota inteira"** ou **"os arquivos das cartas faltam no
acervo"** — os dois pontos existem mas nenhuma carta contém os dois, ou o `indice.json`
aponta para `.zip` que não estão em `raster/` (acervo baixado pela metade). Rode
`scripts/baixar.py` de novo para completar e `carta.py indexar` em seguida; se ainda
faltar, divida a viagem em duas etapas.

**"a derrota mistura setores de hidrovia interior (R) com setores costeiros (C)"** —
a linha traçada é geométrica, não hidrográfica: ela não sabe se existe caminho
navegável. Confirme a rota antes de entregar o relatório. O mesmo aviso aparece quando
a derrota passa de 400 MN, caso em que a carta do percurso é de escala pequena demais
para dar detalhe.

**"O banco de clima nao trouxe serie de vento ou de onda"** — os pontos caíram em
setores de hidrovia, que não têm série de ondas. Confira se a derrota é mesmo
marítima.

**Passou de 10 páginas** — encurte os textos `--atencao-*` ou reduza o número de
pontos intermediários.

**A carta da saída ou da chegada saiu grosseira** — é a escala da carta, não a
imagem. Não existe carta de escala maior para aquele ponto: diga isso no lugar de
ampliar mais.

**"a perna N passa por TERRA"** — sobrou travessia de terra que o desvio automático não
resolveu, ou você rodou com `--sem-desvio`. Costuma ser canal sem carta de grande escala
no acervo, ou ponta que caiu em terra firme. Sonde com `sondar.py`, escolha um ponto em
água funda e acrescente `--wp "lat,lon"` na ordem, até limpar.

**"nao achei caminho pela agua na carta X"** — na carta que contém as duas pontas não
existe água ligando uma à outra: em geral porque falta no acervo a carta de detalhe do
canal, ou porque a ponta está num corpo d'água separado (lagoa, represa). Confira as
coordenadas e, se o caminho existir de fato, passe os pontos com `--wp`.
