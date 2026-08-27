---
name: brana-area-navegacao
description: Gera o PDF de Área de Navegação da Brana (bloco 3 do Caso de Uso) para a derrota entre dois pontos do Brasil, com cartas da Marinha, distância, rumo, tempos, clima, maré, calado e classificação NORMAM e ISO. Use para área de navegação, derrota ou rota de embarcação.
license: Proprietário — Brana Projetos Navais. Cartas raster do CHM sujeitas a direitos autorais da DHN.
compatibility: Python 3.9+ com reportlab, pypdf, Pillow e numpy, e o acervo raster do CHM montado por scripts/baixar.py.
metadata:
  author: Brana Projetos Navais
  category: brana
  version: "1.2.0"
---

# Área de Navegação — relatório PDF

Preenche o **bloco 3 do Caso de Uso**: 10 páginas no timbrado Brana, resumo de 1
página. Convenções da `brana-caso-de-uso`: português simples, termo técnico explicado
entre parênteses na primeira vez, **nunca inventar** (sem resposta vira `N/A`), nome de
quem preencheu no arquivo.

## 1. Pergunte só o que faltar, numa única mensagem

**Nome de quem preenche**, **partida** e **chegada**. O que o pedido já trouxe não se
pergunta de novo. Sem os três, não rode.

## 2. Rode uma vez

```
python scripts/gerar_relatorio.py --nome "NOME" --partida "PARTIDA" --chegada "CHEGADA" --saida "PASTA"
```

Aceita nome de lugar, `"-13.045,-38.560"` ou `"-13.045,-38.560:Rótulo"` — prefira
coordenada com rótulo quando o nome for ambíguo ou o ponto for um cais, não a cidade.
`--saida` é a pasta atual, salvo pedido diferente; não pergunte por ela.

O script traça a derrota, **contorna a terra sozinho** lendo o raster das cartas,
confere pixel a pixel e imprime umas dez linhas. Leva de 30 s a 6 min.

## 3. Leia o console — não abra a imagem da carta

A figura custa milhares de tokens e não diz nada além destas linhas.

| O que apareceu | O que fazer |
|---|---|
| `nenhum trecho por terra: derrota limpa` | vá para o passo 4 |
| `Desvio automatico \| perna N: ...` | é o programa contornando a terra; só relate |
| `afastamento maximo da costa: X MN` | já entrou sozinho na classificação NORMAM |
| `X km ... agua rasa` | informação, não erro: confira contra o calado |
| `AVISO: ... hidrovia ... costeiros` | confirme que existe caminho navegável |
| `AVISO: passou de 10 paginas` | encurte os textos `--atencao-*` |
| `ERRO: ...` | a mensagem diz o que fazer |
| `ATENCAO - N trecho(s) ... por TERRA` | o desvio não achou caminho: sonde e passe os pontos na mão (abaixo) |
| `perna partida em N pedaco(s)` | o programa dividiu a perna para achar o vão; só relate |

```
python scripts/sondar.py -23.90 -45.45 --raio 12
python scripts/gerar_relatorio.py ... --wp "-23.90,-45.45" --wp "-23.95,-45.50"
```

## 4. Entregue

Em poucas linhas: distância e rumo, tempos, NORMAM e ISO, janela operacional, os pontos
que o programa inseriu e o que ficou `N/A`. Aponte as ressalvas do item 10.

## Limites que precisam ser ditos

- **Não substitui a carta oficial atualizada**: recortes reescalados, sem os Avisos aos
  Navegantes semanais.
- **A derrota é ilustrativa**, inclusive os pontos escolhidos pelo programa. Não é plano
  de navegação aprovado. Datum WGS-84.
- O raster mostra **terra e água rasa** — não pedra isolada, laje, balizamento nem área
  restrita. Isso continua sendo leitura de carta.
- Em **canal urbano estreito** (Estreito de Florianópolis, Baía de Vitória) a ponte e o
  cais desenhados fecham a passagem aos olhos do programa. É o caso típico do passo 5:
  sonde e passe os pontos na mão.
- **Direitos autorais da DHN**: as raster do CHM não servem de base a produto derivado
  comercial.
- Há litoral sem carta de grande escala; quando for o caso, diga.

Opções e problemas: [references/OPCOES.md](references/OPCOES.md).
