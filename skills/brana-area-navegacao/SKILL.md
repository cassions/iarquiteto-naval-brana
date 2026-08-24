---
name: brana-area-navegacao
description: Gera o relatório PDF de Área de Navegação da Brana (bloco 3 do Caso de Uso) para uma derrota entre dois pontos do Brasil, com cartas náuticas da Marinha, clima, maré e classificação NORMAM e ISO. Use para área de navegação, derrota ou rota entre dois portos ou praias, estudo de rota de embarcação, ou "por onde o barco vai navegar".
license: Proprietário — Brana Projetos Navais. Cartas raster do CHM sujeitas a direitos autorais da DHN.
compatibility: Requer Python 3.9+ com reportlab, pypdf, Pillow e numpy, e o acervo raster de cartas do CHM (~300 MB) montado por scripts/baixar.py.
metadata:
  author: Brana Projetos Navais
  category: brana
  version: "1.1.0"
---

# Área de Navegação — relatório PDF

Preenche o **bloco 3 do Caso de Uso** e entrega um PDF de 10 páginas no papel timbrado
Brana, com resumo de 1 página. Segue as convenções da `brana-caso-de-uso`: português
simples, termo técnico explicado entre parênteses na primeira vez, **nunca inventar**
(campo sem resposta vira `N/A`) e o nome de quem preencheu no arquivo.

## 1. Pergunte, uma pergunta por vez

Pare e espere cada resposta. **Nome de quem preenche** → **ponto de partida** →
**ponto de chegada**. Os três são obrigatórios. Confirme numa linha o que entendeu.

## 2. Rode

```
python scripts/gerar_relatorio.py --nome "NOME" --partida "PARTIDA" --chegada "CHEGADA" --saida "PASTA"
```

Partida e chegada aceitam nome de lugar, `"-13.045,-38.560"` ou
`"-13.045,-38.560:Rótulo"`. Prefira coordenadas com rótulo quando o nome for ambíguo,
e quando o ponto for um cais e não a cidade inteira.

## 3. Leia a conferência — não abra a imagem da carta

O script confere a derrota **pixel a pixel** sobre o raster das cartas e imprime o
resultado em texto. Abrir a imagem custa milhares de tokens e não acrescenta nada:
só olhe a figura se a conferência apontar algo que o texto não explique.

O que fazer com cada saída:

- `nenhum trecho por terra: derrota limpa` → siga para o passo 4.
- `ATENCAO - N trecho(s) passando por TERRA` → a linha reta corta terra. Acrescente
  `--wp "lat,lon"` (repetível, na ordem) para contornar e rode de novo, até limpar.
- `afastamento maximo da costa: X MN` → já entra sozinho na classificação NORMAM.
- `km correm pela faixa de agua rasa` → é informação, não erro; confira a sondagem
  contra o calado.
- `AVISO: a derrota mistura setores de hidrovia com setores costeiros` → confirme que
  existe caminho navegável antes de entregar.

Para achar por onde desviar, sonde o raster em vez de olhar a figura:

```
python scripts/sondar.py -23.90 -45.45 --raio 12
```

Ele imprime um mapa de texto de água e terra em volta do ponto.

## 4. Entregue

Diga em poucas linhas: distância e rumo, tempos, NORMAM e ISO, janela operacional e o
que ficou `N/A`. Aponte as ressalvas do item 10 do relatório.

## Limites que precisam ser ditos

- **Não substitui a carta náutica oficial atualizada**: são recortes reescalados e o
  acervo local não recebe os Avisos aos Navegantes semanais.
- **A derrota é ilustrativa**, não é plano de navegação aprovado. Datum WGS-84.
- **Direitos autorais da DHN**: as raster do CHM não podem servir de base a produto
  derivado com fim comercial.
- A conferência automática enxerga **terra e água rasa**, não pedra isolada, laje,
  balizamento nem área restrita. Isso continua sendo leitura de carta.
- Há trechos do litoral sem carta de grande escala; quando for o caso, diga.

Opções, montagem do acervo e solução de problemas:
[references/OPCOES.md](references/OPCOES.md).
