---
name: brana-area-navegacao
description: Gera o relatório PDF de Área de Navegação da Brana (bloco 3 do Caso de Uso) para uma derrota entre dois pontos do litoral ou das hidrovias do Brasil, em no máximo 10 páginas no papel timbrado, com resumo de 1 página. Traz distância, rumos, tempo por velocidade, três recortes de carta náutica da Marinha (saída, percurso e chegada) com a derrota traçada, clima, vento em nós e km/h, ondas, chuva, maré, corrente, restrição de calado, janela operacional e a classificação da embarcação pela NORMAM e pela categoria de projeto ISO. Use quando pedirem área de navegação, derrota ou rota entre dois portos, praias ou cidades do litoral brasileiro, estudo de rota para projeto de embarcação, "por onde o barco vai navegar", "de onde até onde", ou quando o Caso de Uso chegar no bloco de área de navegação.
license: Proprietário — Brana Projetos Navais. Cartas raster do CHM sujeitas a direitos autorais da DHN.
compatibility: Requer Python 3.9+ com reportlab, pypdf e Pillow, e o acervo raster de cartas náuticas do CHM (~300 MB), montado por scripts/baixar.py. Acesso à internet só para geocodificar nomes de lugares e para baixar o acervo.
metadata:
  author: Brana Projetos Navais
  category: brana
  version: "1.0.0"
---

# Área de Navegação — relatório PDF

Preenche o **bloco 3 do Caso de Uso** e entrega um PDF de até 10 páginas no papel
timbrado Brana. Segue as convenções da skill `brana-caso-de-uso`: português simples,
termo técnico explicado entre parênteses na primeira vez, **nunca inventar** (campo
sem resposta vira `N/A`) e o nome de quem preencheu no arquivo de saída.

## Antes de tudo: o acervo de cartas

O relatório não sai sem as cartas raster do CHM. Se `scripts/gerar_relatorio.py`
reclamar de acervo, monte uma vez (~300 MB, uns 80 s):

```
python scripts/baixar.py --destino "<pasta>"
python scripts/carta.py --dados "<pasta>" indexar
```

Depois aponte com `--dados "<pasta>"` ou com a variável `CARTAS_NAUTICAS_DIR`.
Leia a mensagem de erro antes de improvisar: ela diz qual é o próximo passo.

## Passo 1 — pergunte, uma pergunta por vez

Pare e espere a resposta de cada uma antes de seguir. Não despeje a lista.

1. **Qual o seu nome?** (vai no arquivo: `Area_de_Navegacao_<Nome>.pdf`)
2. **Qual o ponto de partida?** Nome do lugar, ou o cais/marina exato, ou `lat,lon`.
3. **Qual o ponto de chegada?** Idem.

Os três são obrigatórios. Sem partida e chegada não há derrota e a skill não roda.
Confirme numa linha o que entendeu de cada resposta antes de continuar.

## Passo 2 — rode

```
python scripts/gerar_relatorio.py --nome "NOME" --partida "PARTIDA" --chegada "CHEGADA" --saida "PASTA"
```

Partida e chegada aceitam nome de lugar (geocodificado), `"-13.045,-38.560"` ou
`"-13.045,-38.560:Rótulo que aparece no relatório"`. Prefira coordenadas com rótulo
quando o nome for ambíguo — existe mais de uma "Barra Grande" no litoral.

O script imprime a distância, as cartas escolhidas, os setores de clima, a
classificação NORMAM e a categoria ISO. Ele **não** passa de 10 páginas; se passar,
avisa e diz o que encurtar.

## Passo 3 — olhe a carta do percurso e ajuste

Abra o PNG do percurso que o script salvou em `PASTA/cartas/`. A linha tracejada é
uma loxodrômica (rumo constante): ela ignora profundidade, perigos e áreas restritas.
Confira e refaça com o que for necessário:

| O que você viu na carta | O que acrescentar |
|---|---|
| A linha corta baixio, laje, recife ou área de plataformas | `--wp "lat,lon"` (repetível, na ordem) para desviar |
| A rosa da carta traz a declinação (ex.: 23°04'W) | `--declinacao 23` — sem isso a coluna do rumo de bússola sai vazia |
| Deu para medir o afastamento máximo da costa | `--afastamento-mn 8` — **sem isso a classificação NORMAM sai N/A** |
| A derrota fica toda em baía, rio ou lagoa | `--so-abrigado` |
| O recorte da saída/chegada ficou largo ou apertado demais | `--zoom-km 8` (padrão 12) |
| Você sabe o calado máximo, ou tem sondagem de barra | `--calado-max "1,5 m"`, `--calado-linha "trecho\|profundidade\|restrição"` |
| Falta um perigo que a carta mostra e o texto não citou | `--atencao-saida/--atencao-percurso/--atencao-chegada "texto"` |

Para medir o afastamento da costa: na carta, **1 minuto de latitude = 1 milha
náutica**. Use a escala de latitude na borda.

Rode de novo até a derrota ficar limpa. `python scripts/gerar_relatorio.py --help`
lista tudo.

## Passo 4 — entregue

Entregue o PDF e diga, em poucas linhas: distância e rumo, os tempos, a classificação
NORMAM e a categoria ISO, a janela operacional e o que ficou `N/A`. Aponte as
ressalvas do item 10 do relatório (não substitui carta oficial; derrota ilustrativa;
direitos autorais da DHN).

## O que o relatório já resolve sozinho

Não refaça à mão: distância e rumo de cada perna, tempos por velocidade, escolha das
três cartas e sua procedência (número, escala, edição, Aviso aos Navegantes), setores
de clima da rota, quadro mensal de vento (nós **e** km/h), ondas e chuva, maré,
corrente, os pontos de atenção de cada trecho, a categoria ISO a partir do vento e da
onda medidos, e a tabela de áreas de navegação da NORMAM.

## Limites que precisam ser ditos, não escondidos

- **Não substitui a carta náutica oficial atualizada.** São recortes reescalados, sem
  a margem da carta, e o acervo local não recebe os Avisos aos Navegantes semanais.
- **A derrota traçada é ilustrativa**, não é plano de navegação aprovado.
- **Datum WGS-84** na carta e no GPS.
- **Direitos autorais da DHN**: as raster do CHM não podem ser reproduzidas nem
  servir de base a produtos derivados para fim comercial.
- Há trechos do litoral sem carta de grande escala. Quando a melhor carta disponível
  for de escala pequena, diga isso ao usuário em vez de fingir detalhe.

Detalhes de cada opção e o que entra em cada item do PDF:
[references/OPCOES.md](references/OPCOES.md).
