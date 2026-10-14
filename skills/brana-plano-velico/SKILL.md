---
name: brana-plano-velico
description: >-
  Monta o painel interativo de plano vélico da Brana a partir de uma tabela de cotas — um HTML
  único e offline, com a trilha de ensino em oito passos e o painel completo de uma página,
  memória de cálculo e PDF em escala. Estima a área vélica pela razão área
  vélica/deslocamento, dimensiona quilha e leme pela área lateral submersa do casco, monta o
  rig (1 ou 2 mastros; cat, sloop, cutter, cat-ketch, ketch, yawl, escuna; vela triangular, de
  içar, de pena, de espicha, de verga longa) e fecha no equilíbrio: CE, CLR, avanço do centro
  vélico (lead), ângulo de Dellenbaugh e curva de braços de endireitamento até 180°. Use
  sempre que pedirem plano vélico, área vélica de um veleiro, quantos m² de vela, dimensionar
  quilha, leme, lastro, mastro ou velas, escolher a armação, achar a posição do mastro, lead,
  Dellenbaugh ou estabilidade à vela — e também quando enviarem uma tabela de cotas de
  veleiro. Pede o nome de quem está usando; a tabela de cotas é obrigatória.
license: Proprietário — Brana Arquitetura Naval. Uso interno e nos cursos da Brana.
compatibility: Python 3.8 ou mais novo, só biblioteca padrão. Não usa rede, nem instala nada. Se houver node no caminho, o relatório sai com os números do barco. O painel gerado é um HTML único que roda offline no navegador e no celular.
metadata:
  category: brana
  version: "1.2"
  author: Brana Arquitetura Naval
---

# Plano vélico a partir da tabela de cotas

O painel inteiro — hidrostática, estabilidade, estimadores, desenho e o gerador de
PDF — já está pronto e testado dentro de `assets/painel-modelo.html`. Seu trabalho
aqui é curto: pegar o nome, pegar a tabela de cotas, rodar um comando e entregar o
arquivo.

## O caminho curto

1. **Peça o nome e a tabela de cotas numa única mensagem.** Se a pessoa já se
   apresentou na conversa, use o nome dela e não pergunte de novo; se a tabela já
   está aí, peça só o que falta. O nome vai no arquivo de saída e na legenda do
   painel e do PDF; a tabela é o casco.
2. Se a tabela veio colada no chat, salve-a num arquivo `.txt` antes de seguir.
3. Rode o montador. O script fica na pasta desta skill; a tabela e o destino são do
   usuário, então use o caminho da skill no primeiro e o caminho dele nos outros
   dois — `--saida .` escreve na pasta em que ele está trabalhando, que é o que se
   quer. **Não escreva a saída dentro da pasta da skill.**

```bash
python "<pasta desta skill>/scripts/montar.py" --nome "Ana Ribeiro" --cotas cotas.txt --saida .
```

4. **Entregue o arquivo** — pelo meio que este ambiente tiver para mandar arquivos;
   se não houver nenhum, diga o caminho completo. E repasse o que o script imprimiu:
   ele traz o formato lido, o tamanho do casco e, quando há `node` na máquina, os
   números com que o painel abre. É com isso que você responde "quantos m² de vela?"
   sem abrir coisa alguma.

Duas linhas do relatório valem repassar quando aparecerem:

- **`linha d'agua nao declarada`** — a tabela não trouxe a flutuação de projeto,
  então o calado inicial é uma sugestão do painel; diga isso, e que o aluno acerta no
  passo 1 da trilha.
- **`ATENCAO ... confira a unidade`** — o casco saiu com menos de 2 m ou mais de
  120 m. Não é erro (barco pequeno existe), mas quase sempre é tabela em centímetros
  ou em polegadas. Pergunte antes de dar o resultado por bom.

## Não abra os arquivos grandes

`assets/painel-modelo.html` tem cerca de 400 KB, e o HTML de saída tem o mesmo
tamanho. Ler qualquer um dos dois não acrescenta nada — o modelo já foi testado, e o
relatório do script já traz os números do barco — e queima uma conversa inteira de
contexto. **Não leia o modelo, não abra o resultado para conferir, não reescreva
pedaço nenhum do painel à mão.**

Quem confere é o script: se a tabela não presta, ele para com uma mensagem clara
antes de escrever qualquer coisa. Se ele escreveu o arquivo, o painel está de pé.

`references/formatos-tabela.md` só entra em um caso: o script reclamou do formato e
você precisa entender o que ele espera.

## A tabela de cotas é obrigatória

Sem tabela não há painel — o casco é o começo de tudo, e todo o resto sai dele
(deslocamento, superfície molhada, área lateral submersa). **Nunca invente uma
tabela**, nem "aproxime" um casco a partir de comprimento e boca: o painel diria
números com cara de verdade sobre um barco que não existe.

Se a pessoa não tem tabela de cotas, o caminho é outro:

- tem um croqui à mão em papel quadriculado → skill `brana-rascunho-2d-interativo`,
  que digitaliza o desenho e devolve a tabela;
- não tem casco nenhum ainda → o projeto começa por caso de uso e estudo de
  similares (`brana-caso-de-uso`, `brana-estudo-similar`).

**Casco emprestado.** É comum a pessoa trazer a tabela de outro barco — um similar,
um casco de exemplo — para ver o plano vélico "por enquanto". Faça: o painel é
justamente para experimentar. Mas diga, junto com a entrega, que **todos os números
são do casco da tabela**, não do barco que ela pretende construir, e use o LOA que o
script imprimiu como prova. Plano vélico dimensionado sobre o casco errado é
exatamente o tipo de número que depois ninguém lembra de onde veio.

## Formatos de tabela aceitos

O script detecta e converte sozinho:

- **balizas, bojo redondo** — `baliza x altura_quilha altura_borda mb_… meia_boca_borda`;
- **balizas, casco quinado** — `stn x sheer_hb chine_hb sheer_ht chine_ht keel_ht`;
- **linhas d'água** — exportação estilo DELFTship / FREE!ship, com o cabeçalho
  `Number of waterlines / stations`.

Alturas acima da linha de base, meias-bocas a partir da linha de centro, **em
milímetros**. O resto ele arruma: tabulação, espaço, `;` ou vírgula (CSV de planilha),
vírgula decimal, fim de linha do Windows, comentários com `#` e linha de cabeçalho.
Tabela em metros é multiplicada por 1000, com aviso.

Uma linha de comentário `# linha_dagua 500` fixa a flutuação de projeto que veio com
o casco. Sem ela, o painel procura o calado da esbeltez típica do programa.

## Exemplo de entrada e de saída

**Entrada** (`examples/entrada-balizas.tsv`, um patilhão de 7,20 m; as três primeiras
balizas de treze):

```
# Alturas acima da linha de base, meias-bocas da linha de centro, em mm.
baliza	x	altura_quilha	altura_borda	mb_12pc	mb_25pc	mb_38pc	mb_50pc	mb_62pc	mb_75pc	mb_88pc	meia_boca_borda
1	0.0	1080.0	1780.0	229.4	310.5	376.2	433.5	485.3	533.1	577.8	620.0
2	600.0	860.0	1720.0	234.7	360.2	456.1	538.1	611.4	678.6	741.1	800.0
3	1200.0	560.0	1670.0	64.6	237.8	418.4	549.4	659.7	757.7	847.0	930.0
```

**Comando**

```bash
python scripts/montar.py --nome "Ana Ribeiro" --cotas examples/entrada-balizas.tsv --saida .
```

**Saída** — o arquivo `Plano Velico - Ana Ribeiro.html` e este relatório:

```
formato       balizas, bojo redondo (12 colunas, 13 balizas)
casco         LOA 7.200 m | boca max 2.240 m | 13 balizas
linha d'agua  nao declarada: o painel abre no calado da esbeltez do programa
projetista    Ana Ribeiro
saida         <pasta de trabalho>\Plano Velico - Ana Ribeiro.html (~394 KB)

o painel abre assim (numeros do motor do proprio painel):
  casco        Delta 2306 kg | calado do casco 1.145 m | Cp 0.588 | Cb 0.190
  apendices    Patilhao (full keel) | quilha 1.572 m2 | leme 0.763 m2 | calado total 1.14 m
  ...
```

O bloco de números só sai quando há `node` no caminho; sem ele, o script avisa que os
números estão no passo 1 do painel. O segundo exemplo,
`examples/entrada-linhas-dagua.txt`, é um veleiro de 12 m no formato por linhas
d'água — serve para ver a conversão em ação (fecha o espelho de popa e o talha-mar
pelos contornos, e sai com 21 balizas). `examples/saida-esperada.md` traz, com os
números completos, o que cada um dos dois deve produzir.

## Quando o script reclama

Ele para antes de escrever e diz o que achou — tabela vazia, menos de três balizas,
balizas com números de colunas diferentes, duas balizas no mesmo `x`, cabeçalho de
linhas d'água incompleto. Conserte a tabela com o usuário e rode de novo; se o
formato for o problema, `references/formatos-tabela.md` tem os três em detalhe. Não
contorne o erro editando o painel.

## O que o painel entrega

Vale saber para descrever ao usuário:

- **Trilha de ensino, oito passos**, que é o que abre: casco, área vélica, quilha,
  leme, lastro e estabilidade, armação, equilíbrio e o fechamento. Cada passo tem a
  ideia, a fórmula, a decisão, o que a decisão fez, o glossário e a fonte.
- **Versão avançada** no botão do rodapé: a mesma coisa numa página só, com todos os
  cursores, oito abas de leitura e a memória de cálculo completa. As duas vistas
  compartilham o estado — trocar de vista não muda o barco.
- **PDF em escala**: prancha A3 do plano vélico cotado, folha da curva de braços de
  endireitamento e a memória de cálculo com a fonte de cada estimativa.
- **Patilhão desenhado**: o perfil sai tangente à linha de quilha na proa e corre reto
  até o final do espelho, com a profundidade num cursor, medida da linha de base para
  baixo. Entra no plano lateral só o que fica abaixo da linha de quilha e dentro
  d’água, de modo que nada é contado duas vezes.
- Fontes: Larsson & Eliasson, *Principles of Yacht Design* (4ª ed.); John Teale,
  *How to Design a Boat* (2ª ed.); ISSC 2009, Comitê V.8.
