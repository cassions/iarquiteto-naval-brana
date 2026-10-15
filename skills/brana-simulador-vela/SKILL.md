---
name: brana-simulador-vela
description: >-
  Monta o simulador de navegação a vela da Brana a partir do PDF do plano vélico — um jogo em
  HTML único e offline, com o barco do próprio projeto navegando na Baía de Todos os Santos.
  Física de quatro graus de liberdade (avanço, deriva, guinada e banda) com vento, rajada,
  corrente de maré e vaga ajustáveis, polar calculada do próprio modelo, oito aulas de vela
  (orçar, arribar, cambar, trimar, ler a corrente), três regatas com cronômetro e o desafio do
  canal de Itaparica. Use sempre que pedirem simulador, jogo ou treino de vela, "navegar com o
  meu barco", testar o plano vélico na água, ver o barco adernar, sentir o leme de barlavento
  ou brincar com vento, maré e onda. Pede o nome de quem está usando; o PDF do plano vélico,
  com as folhas de rig e de estabilidade, é obrigatório.
license: Proprietário — Brana Arquitetura Naval. Uso interno e nos cursos da Brana.
compatibility: Python 3.8 ou mais novo, só biblioteca padrão — não usa rede, não instala nada, não precisa de leitor de PDF. O jogo é um HTML único que roda offline no navegador e no celular.
metadata:
  category: brana
  version: "1.0"
  author: Brana Arquitetura Naval
---

# Simulador de vela a partir do plano vélico

O jogo inteiro — física, baía, aulas e regatas — já está pronto e testado em
`assets/jogo-modelo.html`. Seu trabalho é curto: pegar o nome, pegar o PDF, rodar
um comando e entregar o arquivo.

## O caminho curto

1. **Peça o nome e o PDF do plano vélico numa única mensagem.** Se a pessoa já se
   apresentou, use o nome dela e não pergunte de novo. O nome vai no arquivo de
   saída e no menu do jogo.
2. Rode o montador — script na pasta da skill, PDF e destino na pasta do usuário.
   `--saida .` escreve onde ele está trabalhando. **Não escreva dentro da pasta da skill.**

```bash
python "<pasta desta skill>/scripts/montar.py" --nome "Ana Ribeiro" --pdf plano.pdf --saida .
```

3. **Entregue o arquivo** `Jogo de Vela - <Nome>.html` e repasse o relatório que o
   script imprimiu: barco, casco, pano, apêndices, estabilidade e velocidade de
   casco. É com ele que você responde "quantos nós esse barco faz?" sem abrir nada.

## Não abra os arquivos grandes

O modelo e a saída têm ~110 KB cada. Ler qualquer um dos dois não acrescenta nada —
o modelo já foi testado e o relatório traz os números — e queima a conversa inteira.
**Não leia o modelo, não abra o resultado para conferir, não reescreva pedaço nenhum
do jogo à mão.** Quem confere é o script: se o PDF não serve, ele para com uma
mensagem clara antes de escrever qualquer coisa.

## O PDF é obrigatório

Sem ele não há barco. O montador lê **LOA, LWL, boca, calado, deslocamento,
superfície molhada, Cwp, LCB, GM, KG, curva de braços (GZ máximo e AVS), área
vélica, cada vela com área, razão de aspecto e centro vélico, quilha, leme, mastro,
CE e CLR** — tudo que a física precisa. É o PDF gerado pela skill
`brana-plano-velico` (folha 1 com os dados, folha 3 com a memória de cálculo).

**Nunca invente um barco** a partir de comprimento e boca: o jogo diria números com
cara de verdade sobre um barco que não existe. Se a pessoa não tem o PDF, o caminho
é a skill `brana-plano-velico` — ela parte da tabela de cotas e gera exatamente este
PDF.

Serve PDF de qualquer armação que o painel desenhe (cat, sloop, cutter, ketch,
yawl): cada vela vira uma vela no jogo, com a sua área e o seu centro vélico, e os
mastros aparecem no desenho.

## Exemplo de entrada e de saída

**Entrada:** `examples/exemplo-plano-velico.pdf` — um sloop fictício de 8,5 m, com as
mesmas linhas que o painel escreve.

```bash
python scripts/montar.py --nome "Ana Ribeiro" --pdf examples/exemplo-plano-velico.pdf --saida .
```

**Saída:** o arquivo `Jogo de Vela - Ana Ribeiro.html` e este relatório:

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

`examples/saida-esperada.md` traz o mesmo para o veleiro de 12 m do painel, que é o
teste de instalação.

## Quando o script reclama

Ele para antes de escrever: PDF que não é PDF, PDF sem texto, sem a linha
`LOA / LWL`, sem `GM / KG`, sem as velas da seção 5.1. Quase sempre é PDF de outra
origem — peça o do plano vélico. Linhas `ATENCAO` não param nada: são leitura do
barco (GM baixo, AVS baixo, calado estranho) e valem repassar ao usuário.

## O que o jogo entrega

- **Quatro modos:** navegação livre saindo do Terminal Náutico de Salvador, oito
  aulas com verificação automática, três regatas com cronômetro e recorde (entre
  elas a travessia Salvador–Mar Grande) e o desafio do canal de Itaparica com a maré
  contra.
- **Comandos:** `A`/`D` leme, `W`/`S` escota, `R` rizar, `F` enrolar a vela de proa,
  `M` motor, `Z` zoom, `P` pausa, `Esc` menu. No celular, quatro botões.
- **Condições ajustáveis:** vento (módulo, direção, rajada e rondada), corrente de
  maré com ciclo de 6 h que inverte sozinho, onda (altura, período, direção).
- **Instrumentos:** SOG, rumo, vento real e aparente, TWA, banda, abatimento, VMG,
  sonda e o alvo da polar — que é o próprio modelo resolvido no equilíbrio, não uma
  tabela.
- **A baía** é traçada das cartas raster da DHN (1110, 1107, 2250), com 36 m de erro
  mediano contra a linha de costa. **Continua sendo desenho de jogo, não carta
  náutica** — o menu diz isso, e vale repetir na entrega.
