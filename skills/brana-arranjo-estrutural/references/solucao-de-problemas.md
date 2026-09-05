# Quando o script recusa

O gerador prefere recusar a gravar um painel errado. Toda recusa começa com
`RECUSADO:` e diz o que fazer. Abaixo, as mensagens agrupadas.

## Faltou argumento

**`falta --tabela=...`** — a tabela é obrigatória e não tem substituto. Se a pessoa
colou a tabela no chat, grave num `.txt` e aponte para ele. Se ela não tem tabela,
**peça**; se ela só tem as dimensões principais, esta skill não serve — ela precisa
das balizas.

**`falta --nome=...`** — pergunte o nome de quem está usando. Vai para o arquivo.

**`--material precisa ser um de: wood, ply, alu, steel, frp`** — em português:
madeira maciça, compensado naval, alumínio, aço, fibra de vidro.

**`passe --deslocamento OU --calado, não os dois`** — um sai do outro pela
hidrostática da tabela. Passar os dois seria pedir ao painel que ignore um.

## A tabela não foi lida

**`são necessárias ao menos 3 balizas; encontrei N`** — o leitor descarta linhas com
menos de cinco campos e as que começam com `#`. Se a tabela tem balizas de sobra e
mesmo assim caiu aqui, provavelmente as colunas estão separadas por algo que ele não
reconhece, ou a tabela veio de uma planilha coladas as células numa coluna só.

**`o formato quinado pede 7 colunas; a baliza N tem M`** — falta coluna nessa linha.
Confira se algum campo vazio comeu o separador.

**`o formato redondo precisa de ao menos uma meia-boca intermediária`** — com só
quilha e borda a baliza vira uma reta, e não há volta de bojo para separar fundo de
costado. Acrescente ao menos uma coluna de meia-boca no meio.

**`a baliza N tem M colunas, as outras têm K`** — no formato redondo todas as linhas
precisam do mesmo número de níveis.

**`duas balizas na mesma posição x`** — duas linhas com o mesmo `x`. Costuma ser
linha duplicada na cópia.

**`valor não numérico em x/zk/zs/ys na baliza N`** — campo em branco, ou texto onde
devia haver número, ou vírgula e ponto misturados na mesma tabela.

## A geometria não fecha

**`o comprimento saiu em 0,006 m`** — quase sempre **unidade**: as cotas são em
milímetros. Uma tabela em metros dá um casco mil vezes menor.

**`boca X e pontal Y: geometria degenerada`** — mesma família. Confira se as colunas
de meia-boca e de altura não trocaram de lugar.

**`na meia-nau o costado ficou com 0 mm de perímetro`** — as cotas da borda estão
iguais às do chine em toda a extensão. O casco sairia sem costado, e o painel
calcula quatro regiões.

**`o calado de X mm passa do pontal de Y mm`** — o `--calado` pedido é maior que a
altura do casco.

**`o deslocamento de X t afunda o casco além da borda`** — cheio até o trincaniz
esta forma desloca menos que isso. A mensagem diz quanto. Ou o deslocamento está
errado, ou a tabela é de outro barco.

**`no calado de X mm o casco não desloca volume nenhum`** — calado abaixo da quilha.

## O cálculo não fechou

**`o motor de escantilhão não fechou com esta tabela`** — raro; a mensagem traz o
erro original. Vale conferir se a tabela tem baliza com meia-boca negativa.

**`a espessura exigida no fundo saiu em NaN`** — igual: algo na tabela produziu
número inválido. Rode com `--calado` explícito para isolar.

## O arquivo não passou nas verificações

O script lista quais das 32 falharam. Isso é defeito da própria skill, não da
tabela: os ativos foram alterados ou estão incompletos. Confira se `assets/` tem os
cinco arquivos. Não tente contornar editando o HTML gerado.

## Não é recusa: os avisos de geometria

O script imprime avisos e **gera o painel assim mesmo**:

- `baliza N: chine fora da borda` — meia-boca do chine maior que a da borda
- `baliza N: quilha acima do chine`
- `baliza N: chine acima da borda`
- `baliza N: quilha acima da borda`
- `baliza N: meia-boca negativa`
- `baliza N: meia-boca do nível K fora da borda`

Cada um aponta uma baliza específica. Repasse à pessoa dizendo qual, e deixe que ela
decida se corrige: às vezes é erro de digitação, às vezes é o casco mesmo.

## Coisas que parecem defeito e não são

**"A velocidade veio errada."** Sem `--velocidade` o painel assume a velocidade de
casco tirada do L<sub>WL</sub>. Num barco de planeio isso subestima a carga de
impacto. Não é bug: é o painel dizendo que não adivinha. Gere de novo com o valor
certo.

**"O FS impacto deu 100."** A poucos nós a pressão de impacto é minúscula, e a razão
explode. Olhe o FS regra.

**"Fora da faixa do livro de Gerr."** A regra S<sub>n</sub> declara valer para
monocasco de 3 a 37 m, até 45 nós e D/L de 100 a 275. Fora disso o painel continua
calculando e avisa. A coluna do ABS não depende dessa faixa.

**"O convés pede mais espessura que o fundo."** Acontece em painel largo: a Tabela
7.4 reduz muito a carga do casco e a 7.5 reduz pouco a do convés. Aperte o
espaçamento e a ordem se inverte. O painel explica isso no passo 9.

**"ATENÇÃO: N reforço(s) sem perfil que passe."** Nenhuma bitola da escada alcança o
módulo exigido. Quase sempre é o **vau do convés**: ele atravessa o barco sem apoio
no meio, e no módulo de seção o vão entra ao quadrado. Não é defeito da skill — é o
arranjo pedindo um pé-de-carneiro ou uma antepara no meio do barco, que cortaria o
vão pela metade e a exigência a um quarto. Repasse assim.

**"ATENÇÃO: a chapa do costado não passa em N antepara(s)."** A antepara reaproveita
a chapa do costado, como o passo pede. Quando não passa, quase sempre quem mandou
foi a **espessura mínima construtiva** (`s ÷ 100` em alumínio, `s ÷ 115` em aço) num
painel largo entre prumos — e a saída é apertar o espaçamento no passo 4, não
engrossar o costado. O painel diz qual dos dois mandou.

**"N antepara(s) fora da faixa usual."** Com cavernamento largo pode não existir
**nenhuma** caverna dentro da faixa de 5% a 15% do comprimento. A antepara tem de
ficar numa caverna, então ela fica na mais próxima possível, e o painel avisa. A
saída é apertar o espaçamento das balizas — não é escolha ruim de quem usou.

**"As duas anteparas se encontraram."** Só em cavernamento muito largo, com poucas
cavernas internas. O painel afasta uma delas e diz que afastou.

**"As duas colunas de FS deram o mesmo número."** Fora do fundo, é o esperado — a
§12 do PDF explica por quê.

**"A caverna e a hastilha pediram o mesmo módulo."** Não é engano: as duas têm o
mesmo vão, o mesmo espaçamento e a mesma pressão de impacto, e quando é a carga de
Gerr que manda ela não distingue uma da outra. Quem distingue é o ABS, com C = 817
contra 1800 — e essa diferença aparece na coluna *SM ABS* do PDF.
