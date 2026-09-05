---
name: brana-arranjo-estrutural
description: "Gera um painel interativo de arranjo estrutural de casco (HTML único, offline, identidade Brana) a partir de uma tabela de cotas. Duas telas: uma aula em nove passos e um painel de página única, mais a memória de cálculo completa em PDF. Vai da espessura da chapa ao perfil de cada reforçador, às anteparas de colisão sobre caverna e ao quadro de pesos e centros. A forma vem da tabela: perímetros, áreas e alturas saem dela. Cálculo pelo ABS Guide for Building and Classing Offshore Racing Yachts (1994), conferido pela regra Sn de Dave Gerr e pela carga de impacto do IBEX 2010. Use quando pedirem escantilhão, scantlings, espessura de chapa, espaçamento de longitudinais, sicordas, balizas ou cavernas, arranjo estrutural, módulo de seção, perfil de reforçador, cantoneira, barra chata ou chapéu, antepara de colisão, peso da estrutura, LCG ou VCG, fator de segurança da chapa, ou comparar madeira, compensado naval, alumínio, aço e fibra de vidro. A tabela de cotas é obrigatória."
license: Proprietário — Brana · Projetos Navais
compatibility: Requer Node.js 18+ para rodar scripts/gerar-painel.js. O HTML gerado abre em qualquer navegador, inclusive celular, sem rede e sem instalar nada.
metadata:
  category: brana
  version: "1.1"
  author: Brana Projetos Navais
  language: pt-BR
---

# Arranjo estrutural: da tabela de cotas à estrutura inteira

A tabela de cotas descreve a **forma**. Esta skill pergunta o que vem depois: de que
espessura tem de ser a chapa, a que distância um reforço do outro, **que peça é cada
reforço**, **onde ficam as anteparas de colisão** e **quanto pesa tudo isso, e
onde**. Ela mede os perímetros do fundo, do costado e do convés na sua tabela,
distribui os longitudinais e as balizas neles, e leva a conta até o quadro de pesos
e centros.

O resultado é **um arquivo HTML só**, sem rede e sem biblioteca: abre por duplo
clique, funciona offline e roda no celular. Dentro dele há duas telas — uma aula em
nove passos e um painel de página única — e um botão que monta a memória de cálculo
inteira, em catorze seções, para salvar em PDF.

Os nove passos: **1** que barco é este · **2** de que material · **3** quão rápido
ele anda · **4** onde ficam os reforços · **5** que espessura comprar · **6** que
perfil vai ser cada reforço · **7** onde ficam as anteparas de colisão · **8** quanto
pesa, e onde · **9** o casco inteiro, com o PDF.

## Duas coisas são obrigatórias antes de gerar

**1. A tabela de cotas.** É a única fonte da forma do casco. Se a pessoa não anexou
nem colou uma tabela, **peça** — não invente cotas, não estime a partir de uma
descrição ("uma lancha de 8 m") e **não use os arquivos de `exemplos/` como se
fossem o casco dela**. Os dois formatos aceitos estão em
[references/formato-da-tabela.md](references/formato-da-tabela.md).

**2. O nome de quem está usando.** Pergunte: *"Qual o nome do projetista, para
constar no arquivo?"* Vai para o título, o rodapé, o autor da página e o **nome do
arquivo** — é assim que a pessoa distingue este painel dos outros gerados pela mesma
skill. Se ela já disse o nome na conversa, use o que ela disse e não pergunte de novo.

## Como gerar

Se a tabela veio colada no chat, grave o texto num `.txt` e aponte para ele. Depois:

```bash
node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" --saida=<pasta>
```

Opcionais, e vale oferecer os três primeiros se a pessoa souber os valores:

| opção | o que faz | padrão |
|---|---|---|
| `--material` | `wood` `ply` `alu` `steel` `frp` | `ply` |
| `--deslocamento` | em toneladas; dele sai o calado | — |
| `--velocidade` | em nós | velocidade de casco, tirada do L<sub>WL</sub> |
| `--calado` | em mm; dele sai o deslocamento. Não use junto com `--deslocamento` | 35% do pontal |
| `--espelho` | inclinação do espelho de popa, em graus | 12 |
| `--barco` | nome da embarcação | o nome do arquivo da tabela |

O script lê a tabela com o mesmo código que vai rodar no navegador, mede o casco,
resolve calado e deslocamento um a partir do outro, **roda o motor de escantilhão
ali mesmo** — escantilhão, perfis, anteparas e pesos — para provar que fecha, monta
a página, confere 32 propriedades e imprime o resumo. O arquivo sai como `Arranjo-Estrutural-Quinado-<Nome>.html` ou
`Arranjo-Estrutural-Redondo-<Nome>.html`.

## Exemplo de entrada e de saída

**Entrada** — `exemplos/exemplo-quinado-12m-planeio.txt`, com o comando:

```bash
node scripts/gerar-painel.js --tabela=exemplos/exemplo-quinado-12m-planeio.txt \
  --nome="Cassio" --barco="Lancha de trabalho" --material=alu \
  --deslocamento=12 --velocidade=28 --saida=exemplos
```

```
stn   x       sheer_hb  chine_hb  sheer_ht  chine_ht  keel_ht  deadrise_deg
1     0       1365.0    1092.0    1085.0    876.4     542.5    17.00
2     1200    1628.4    1302.7    1041.2    651.6     253.4    17.00
…                                                     (11 balizas ao todo)
11    12000   0.0       0.0       1550.0    1286.5    1286.5   0.00
```

**Saída** — vinte linhas no terminal, e o arquivo:

```
  Arranjo-Estrutural-Quinado-Cassio.html   445 KB

  casco quinado, 11 balizas · 12,000 × 3,899 × 1,550 m · boca máxima a 40% da popa · deadrise 17,0°
  calado 751 mm (do deslocamento) · desloca 12,000 t · LWL 10,600 m · BWL 3,546 m
  28,0 nós (pedida) · Sₙ 2,303 · teto do método 44,2 nós

  alumínio · carga no fundo 6,55 m · painel 272 × 923 mm
  fundo exige 3,79 mm (manda a hidrostática do ABS) · adota 4,0 mm · FS regra 1,85
  5 longitudinais por bordo no fundo a 272 mm · 12 balizas a 923 mm
  chapeamento das quatro regiões: Fundo 4,0 · Costado 3,0 · Espelho de popa 3,0 · Convés 3,0 mm · 756 kg
  pelo livro de Gerr, o fundo daria 6,11 mm (61% do caminho longo)

  perfis escolhidos, os mais leves que passam · 583 kg de reforço:
    Longitudinal do fundo: T de 32 × 3 com flange 40 × 3 mm (SM 5,1 de 5,0 cm³ exigidos)
    Baliza · caverna do costado: T de 200 × 3 com flange 200 × 3 mm (SM 144,8 de 141,8 cm³ exigidos)
    Hastilha na linha de centro: T de 200 × 3 com flange 200 × 3 mm (SM 151,2 de 141,8 cm³ exigidos)
    Vau do convés: T de 300 × 5 com flange 150 × 5 mm (SM 303,7 de 288,3 cm³ exigidos)

  anteparas de colisão, sobre caverna · 12 cavernas internas:
    vante: 1ª caverna da proa (baliza 12, 11,08 m do espelho, 7,7% de L) · 0,68 m² · chapa 3,0 de 2,61 mm exigidos pelo mínimo construtivo
    ré: 1ª caverna da popa (baliza 1, 0,92 m do espelho, 7,7% de L) · 1,68 m² · chapa 3,0 de 2,86 mm exigidos pelo mínimo construtivo

  estrutura completa 1.384 kg (chapa 756 · reforços 583 · anteparas 45) · 11,5% do deslocamento
  L_CG 5,51 m do espelho (46% de L) · V_CG 0,811 m da linha de base · com 12% de margem de construção, 1.550 kg
  fora da faixa do livro de Gerr: razão D/L de 281, fora de 100 a 275

  todas as 32 verificações passaram
```

O painel correspondente está em `exemplos/Arranjo-Estrutural-Quinado-Cassio.html`.
Se a pessoa quiser ver antes de mandar a tabela dela, mande esse arquivo.

## Trabalhe só com o que o script imprime

Esta skill embute um modelo de página de 153 KB, um motor de 146 KB, um painel de
129 KB, um leitor de cotas de 17 KB, um logotipo de 11 KB e um painel de exemplo já
gerado de 445 KB. **São entrada para o script e referência para a pessoa, não
leitura para você.** Abrir esses arquivos custa mais de 200 mil tokens e não muda
nada no que você vai fazer: você não edita o modelo, você o preenche pelo script.

Pela mesma razão, **não abra o HTML gerado para conferir**. São mais 110 mil tokens
para reler um arquivo que o script acabou de validar — se alguma coisa estivesse
errada ele teria saído com `RECUSADO` em vez de dizer *todas as 32 verificações
passaram*. Confie na saída dele: é a evidência, e é o que você repassa.

Num uso normal você roda um comando e lê vinte linhas. Se em algum momento você
estiver prestes a usar Read num arquivo desta skill ou no painel gerado,
provavelmente é sinal de que algo falhou — e aí o caminho é
[references/solucao-de-problemas.md](references/solucao-de-problemas.md), não o
arquivo grande.

## O que dizer depois

Repasse em três ou quatro frases o que o script imprimiu:

- o formato detectado, o número de balizas e as três medidas do casco;
- o calado e o deslocamento, dizendo **de onde saiu cada um** — pedido, derivado do
  outro, ou assumido à falta de dado;
- **a velocidade, e se ela foi assumida.** Quando ninguém informa, o painel toma a
  velocidade de casco tirada do L<sub>WL</sub> da tabela. Isso serve para abrir a
  tela, não para dimensionar: se o barco planeia, a carga de impacto muda tudo e a
  pessoa precisa dizer a velocidade;
- a espessura exigida no fundo, quem mandou nela — a hidrostática do ABS ou a carga
  de impacto — e a bitola adotada;
- **em que caverna caiu cada antepara de colisão**, e se ela ficou dentro da faixa
  usual. Quando o cavernamento é largo pode não existir caverna nenhuma dentro da
  faixa — o script diz isso, e a saída é apertar o espaçamento, não mudar a antepara;
- **o peso da estrutura e o centro dela**, com a fração do deslocamento. Diga que é a
  estrutura nua: chapeamento, reforços e as duas anteparas, sem margem de construção;
- **os avisos, se houver.** Aviso não é erro: a tabela foi aceita mas tem algo
  geometricamente estranho (chine fora da borda, quilha acima do chine). Diga qual
  baliza e deixe a pessoa decidir se corrige. Vale o mesmo para as duas linhas de
  `ATENÇÃO` dos passos novos — reforço sem perfil que passe, e antepara cuja chapa
  não passa: são resultado de projeto, não defeito, e a saída dos dois é o passo 4.

Entregue o arquivo com a ferramenta de envio que você tiver; sem nenhuma, diga o
caminho completo. Se a pessoa perguntar o que o painel calcula ou de onde vem cada
número, a resposta está em
[references/o-que-o-painel-calcula.md](references/o-que-o-painel-calcula.md).

## Quatro regras que evitam retrabalho

**Não reescreva o painel à mão.** O motor embutido traz as tabelas 4.1 a 4.4 e 7.1 a
7.5 do Guia ABS, a regra S<sub>n</sub> do livro de Gerr conferida contra os exemplos
resolvidos dele, e a cadeia de impacto do IBEX. Montar a página do zero perderia
isso, gastaria centenas de milhares de tokens e sairia com layout diferente do que a
pessoa já conhece.

**Não calcule escantilhão por fora.** Nem à mão, nem num script à parte. É
exatamente o que o painel faz, com a conta aberta passo a passo e com o casco
respondendo. Gere o painel.

**Não gere duas vezes para comparar.** Para outro material, outra velocidade ou
outro nome, rode de novo com o argumento mudado — uma passada resolve o caso normal.
Comparar materiais é o que o painel já faz sozinho, no passo 2, e trocar o perfil de
um reforço ou mover uma antepara é um clique nos passos 6 e 7 — não é caso de gerar
o arquivo de novo.

**Não dê o resultado como projeto pronto.** Escantilhão define a segurança
estrutural da embarcação. O painel diz isso no rodapé e no PDF; diga você também,
uma vez, sem alarde: confira contra a fonte original e contra a norma aplicável —
NORMAM, ISO 12215 — antes de construir.

## Quando algo falha

O script recusa com mensagem específica em vez de gerar um painel errado. As
mensagens, o que cada uma significa e os dois formatos de tabela em detalhe estão em:

- [references/solucao-de-problemas.md](references/solucao-de-problemas.md) — as
  recusas, uma a uma, e o que fazer com cada uma
- [references/formato-da-tabela.md](references/formato-da-tabela.md) — as colunas
  dos dois formatos, como o formato é detectado, ponto ou vírgula decimal, e o que a
  tabela **não** informa
- [references/o-que-o-painel-calcula.md](references/o-que-o-painel-calcula.md) — os
  nove passos, as duas regras, os dois fatores de segurança e onde o painel estende
  a fonte por conta própria

Leia esses arquivos **quando precisar deles**, não por antecipação.

## O que vem na pasta

```
assets/     modelo da página, motor de escantilhão, painel, leitor de cotas, logotipo
scripts/    gerar-painel.js — o único comando desta skill
exemplos/   três tabelas de entrada (quinada de 8 e de 11 balizas, redonda de 12)
            e um painel de saída já gerado, para a pessoa ver antes de decidir
references/ formato da tabela, solução de problemas, o que o painel calcula
```
