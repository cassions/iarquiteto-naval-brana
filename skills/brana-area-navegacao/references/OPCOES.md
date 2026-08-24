# Opções do gerar_relatorio.py e o que entra em cada item do PDF

Leia só quando precisar de um detalhe. O `SKILL.md` já cobre o uso normal.

## Opções

| Opção | Obrigatória | O que faz |
|---|---|---|
| `--nome` | sim | Nome de quem preenche. Entra no cabeçalho e no arquivo: `Area_de_Navegacao_<Nome>.pdf` |
| `--partida`, `--chegada` | sim | Nome do lugar, `"lat,lon"` ou `"lat,lon:Rótulo"` |
| `--wp` | não | Ponto intermediário, na ordem. Repetível. Mesmo formato de `--partida` |
| `--velocidades` | não | Padrão `5,10,20,30` (nós). O relatório converte para km/h |
| `--afastamento-mn` | não | Maior afastamento da costa, em milhas. **Sem ele a NORMAM sai N/A** |
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
- **Cartas**: acervo raster BSB/KAP do CHM. A da saída e a da chegada são as de maior escala em que cabe, inteiro e sem invadir a margem, um recorte de `--zoom-km` centrado no ponto. A do percurso é a de maior escala que contém todos os pontos.
- **Clima, maré e corrente**: `data/clima_nautico_brasil.md`, que divide o Brasil em 59 setores (33 costeiros e 26 de hidrovia). A skill escolhe os setores mais próximos de cada ponto da derrota.
- **Categoria ISO**: a **recomendada** usa os extremos já registrados nos setores (maior vento horário da série e maior onda). A **mínima** usa as condições da metade mais calma do ano (p99 de vento e mediana das médias mensais de onda) — só vale para quem navega na janela boa, com previsão confirmada. Limites da ISO 12217: A acima de 40 nós e 4 m; B até 40 nós (74 km/h) e 4 m; C até 27 nós (49 km/h) e 2 m; D até 16 nós (28 km/h) e 0,3 m.
- **Área NORMAM**: NORMAM-211/DPC (esporte e recreio). Interior = águas abrigadas ou parcialmente abrigadas, Arrais-Amador. Costeira = dentro da visibilidade da costa, até 20 milhas, Mestre-Amador. Oceânica = sem restrições, Capitão-Amador. Para uso comercial vale a NORMAM-201/DPC.

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
