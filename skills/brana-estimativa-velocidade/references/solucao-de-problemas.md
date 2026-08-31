# Quando o script recusa

Ele prefere recusar com mensagem específica a entregar um painel errado. Cada `RECUSADO`
já traz a dica na segunda linha; abaixo, o que fazer com cada um.

## Falta argumento

**`falta --tabela=<arquivo>`**
A tabela de cotas é obrigatória — é a única fonte da forma do casco. Se ela veio colada
no chat, grave o texto num `.txt` e aponte para ele. **Não** use um arquivo de
`exemplos/` no lugar: o painel sairia do casco errado, com o nome certo.

**`falta --nome="<projetista>"`**
Pergunte o nome de quem vai usar. Vai para o rodapé, o autor da página e o nome do
arquivo.

**`nao achei o arquivo <caminho>`**
Caminho errado. No Windows, caminho com espaço precisa de aspas.

## A tabela não passou

**`sao necessarias ao menos 3 balizas; encontrei N`**
O leitor não achou linhas numéricas suficientes. Causas comuns: o arquivo é outra coisa
(um PDF, uma imagem, um texto solto); as colunas vieram coladas numa só; ou a tabela foi
colada com quebras dentro de cada linha. Confira que cada baliza é **uma linha** com as
colunas separadas por tabulação, ponto-e-vírgula ou espaços.

**`a baliza X tem N colunas, as outras tem M`**
No formato redondo todas as balizas precisam do **mesmo número de níveis intermediários**.
Uma linha com coluna a mais ou a menos derruba a leitura. Procure a baliza citada.

**`formato quinado pede 7 colunas; a baliza X tem N`**
Faltou coluna no formato com chine. A ordem é
`stn, x, sheer_hb, chine_hb, sheer_ht, chine_ht, keel_ht`.

**`duas balizas na mesma posicao x = N`**
Duas linhas com o mesmo `x`. Ou é duplicata, ou uma delas está com o `x` errado.

**`valor nao numerico em zk/zs/ys na baliza X`**
Uma célula com texto onde deveria haver número — resto de cabeçalho, unidade escrita
junto ("890,7 mm"), ou célula vazia.

**`a tabela fecha um volume nulo ate a borda`**
A geometria foi lida mas não delimita volume. Quase sempre é **unidade**: a tabela veio
em metros ou em pés, não em milímetros. Confira se as alturas são da ordem de centenas
ou milhares.

## O painel não passou nas verificações

**`o painel gerado nao passou nas conferencias`** seguido da lista.
Isso não deveria acontecer com o modelo íntegro: indica que `assets/modelo.html` foi
alterado ou truncado. Restaure a skill. **Não** tente consertar o HTML gerado à mão.

## Avisos — que não são erros

O script aceita a tabela e imprime `AVISOS DA TABELA (aceita, mas confira)` quando a
geometria tem algo estranho:

- *quilha acima da borda* — as duas colunas de altura podem estar trocadas
- *meia-boca negativa* — provável erro de sinal
- *chine fora da borda* / *quilha acima do chine* / *chine acima da borda* — no formato
  quinado, os três níveis estão fora de ordem

O painel é gerado assim mesmo. Diga qual baliza e deixe a pessoa decidir se corrige.
