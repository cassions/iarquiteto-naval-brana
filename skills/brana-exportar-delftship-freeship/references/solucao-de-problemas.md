# Solução de problemas

## Falta argumento

| Mensagem | O que fazer |
|---|---|
| `falta --tabela=...` | A tabela de cotas é obrigatória. Peça ao usuário; não invente e não use `exemplos/`. |
| `falta --nome=...` | Pergunte o nome do projetista antes de gerar. |
| `nao encontrei o arquivo da tabela` | Confira o caminho. Aspas se houver espaço. |
| `o nome informado nao gerou nome de arquivo utilizavel` | O nome só tinha símbolos ou acentos isolados. Peça de novo. |

## A tabela não é aceita

| Mensagem | Causa provável | O que fazer |
|---|---|---|
| `a tabela esta vazia` | Só comentários ou linhas em branco | Confira se o arquivo tem os dados mesmo |
| `sao necessarias ao menos 3 balizas` | Tabela curta demais para interpolar | Peça mais balizas |
| `a baliza N tem X colunas, as outras tem Y` | Coluna faltando, ou espaço dentro de um número | Alinhe as colunas; use tabulação |
| `linha com texto no meio dos dados` | Segundo cabeçalho, ou rótulo no meio da tabela | Deixe uma única linha de cabeçalho, no topo |
| `formato quinado pede 7 colunas` | Falta coluna, ou é redondo com cabeçalho de quinado | Veja `formato-da-tabela.md` |
| `formato redondo pede ao menos 6 colunas` | Falta `altura_quilha`/`altura_borda`, ou meias-bocas de menos | Idem |
| `valor nao numerico na tabela` | Unidade colada no número (`283,5mm`), ou traço no lugar de zero | Deixe só o número |
| `duas balizas na mesma posicao x` | Linha duplicada, ou `x` repetido | Corrija o `x` ou remova a duplicata |
| `o pontal saiu zero` | Colunas de altura trocadas ou todas iguais | Confira quilha e borda |
| `nao consegui distinguir quinado de redondo` | Sem cabeçalho e a votação empatou | Acrescente a linha de cabeçalho |

## O formato foi detectado errado

O script imprime `formato detectado` na primeira linha. Se disser `quinado` para um
casco de bojo redondo (ou o contrário), a tabela não tem cabeçalho e a votação errou.
Acrescente a linha de cabeçalho do `formato-da-tabela.md` e rode de novo. Não tente
contornar mexendo nos números.

## Números lidos errado

Se o volume impresso destoar do esperado por um fator próximo de 10, 100 ou 1000, o
suspeito é o separador decimal. Confira uma cota na tabela contra o que você esperava.
Milhar e decimal misturados na mesma tabela (`1.009,8` numa linha e `1,009.8` noutra)
são resolvidos token a token, mas é melhor padronizar.

## O arquivo não passou nas verificações

O script lista quais falharam e **não grava nada**. Isso não é falha de digitação na
tabela — é geometria impossível ou incoerente. Os casos que aparecem na prática:

- **`Euler de um disco`** ou **`nenhuma aresta em mais de 2 faces`**: a tabela produziu
  balizas que se cruzam. Quase sempre é borda abaixo da quilha em alguma baliza, ou
  meia-boca de borda menor que a do nível anterior.
- **`normais para fora`** com volume negativo: a ordem das balizas está invertida
  (proa em `x = 0`). O `x` deve crescer da popa para a proa.
- **`espelho sem furo`**: a primeira baliza tem meias-bocas não monótonas.
- **`volume da malha x areas de baliza`**: interpolação longitudinal estourou, sinal
  de baliza muito fora de linha com as vizinhas. Confira a tabela; pode ser erro de
  digitação numa cota.

## O DELFTship ou o FREE!ship não importa

- Use **File → Import → Part**, não Open. `.part` é peça, não projeto.
- Se o casco entrar como metade, é a flag de simetria da camada.
- Se entrar mas parecer pequeno demais, confira as unidades do projeto: o `.part` está
  em metros, e o programa precisa estar em metros também.
- Para virar projeto nativo, importe e depois **File → Save as → .fbm**.
