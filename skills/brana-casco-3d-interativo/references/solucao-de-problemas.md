# Solução de problemas

Leia isto quando o script recusar a tabela ou sair com erro. Para o detalhe das
colunas, veja [formato-da-tabela.md](formato-da-tabela.md).

## Falta argumento

| Mensagem | O que fazer |
|---|---|
| `falta --tabela=...` | A tabela é obrigatória. Se a pessoa colou no chat, grave num `.txt` e aponte. Se não mandou, peça. |
| `falta --nome=...` | Pergunte o nome do projetista antes de gerar. |
| `nao encontrei a tabela em ...` | Caminho errado. Confira se o arquivo foi gravado onde você acha que gravou. |

## A tabela não é aceita

| Mensagem | Causa provável | O que fazer |
|---|---|---|
| `sao necessarias ao menos 3 balizas; encontrei 0` | O texto não tem linhas com pelo menos 5 campos numéricos — colado incompleto, ou é um PDF/imagem em vez de texto. | Peça a tabela em texto. |
| `sao necessarias ao menos 3 balizas; encontrei 1` ou `2` | Tabela truncada. | Peça o restante. |
| `duas balizas na mesma posicao x = N` | Linha duplicada, ou duas balizas realmente com o mesmo `x`. | Aponte o `x` repetido e pergunte qual vale. |
| `a baliza N tem X colunas, as outras tem Y` | No formato redondo todas as balizas precisam do mesmo número de níveis intermediários. | Diga qual baliza e quantas colunas faltam ou sobram. |
| `formato quinado pede 7 colunas; a baliza N tem X` | Faltam colunas no formato com chine. | Confira contra a lista de colunas do formato quinado. |
| `formato redondo pede ao menos 5 colunas` | A tabela foi lida como redonda mas é curta demais. | Talvez seja quinada e a detecção errou: acrescente o cabeçalho. |
| `valor nao numerico em zk/zs/ys na baliza N` | Um campo tem letra, símbolo ou casa vazia. | Aponte a baliza. |
| `o pontal saiu zero` | Altura de quilha e de borda iguais em todas as balizas, ou as duas colunas trocadas. | Confira a ordem das colunas. |
| `o nome informado nao gerou nome de arquivo utilizavel` | O nome só tinha símbolos ou pontuação. | Peça um nome com letras. |

## O formato foi detectado errado

Sintoma: a tabela é de casco redondo e o script diz `baliza quinada`, ou o contrário.
As duas tabelas de exemplo têm oito colunas, então a contagem não distingue — sem
cabeçalho a decisão vem de uma heurística sobre a primeira linha de números.

Solução mais curta: **acrescente a linha de cabeçalho** à tabela. Palavras como
`altura_quilha`, `mb_`, `meia_boca` ou `baliza` forçam redondo; `sheer_hb`,
`chine_hb`, `keel_ht` ou `deadrise` forçam quinado.

## O script rodou mas com avisos

Aviso não interrompe: a tabela descreve um casco, só com alguma coisa geometricamente
estranha. Repasse à pessoa e deixe a decisão com ela.

- `chine fora da borda` — meia-boca do chine maior que a da borda. Pode ser bordo
  tombado intencional, pode ser coluna trocada.
- `quilha acima do chine` / `chine acima da borda` — alturas fora de ordem.
- `meia-boca negativa` — quase sempre erro de digitação.

Uma nota de `N amostras precisaram de correcao na interpolacao` significa que, entre
as balizas, a forma pedida se autointersecta e o motor corrigiu. Um número pequeno é
normal em cascos com transição rápida; um número grande (centenas) indica cotas
incoerentes e vale conferir a tabela.

## Números lidos errado

Se o deslocamento sair absurdo (dez vezes maior ou menor que o esperado), suspeite do
separador decimal. O leitor decide olhando a tabela inteira, mas uma tabela em que
*todos* os números são ambíguos — só grupos de exatamente três dígitos, como `1,714`
— não dá para desempatar. Escreva um dos números com casa decimal explícita e rode de
novo. Detalhe em [formato-da-tabela.md](formato-da-tabela.md#números-ponto-ou-vírgula).

## Conferência de coerência que vale fazer antes de gerar

Quando a tabela quinada traz coluna de deadrise, ela tem de ser reproduzida pela
geometria:

```
deadrise = atan((chine_ht − keel_ht) / chine_hb)   em graus
```

Se não reproduzir, alguma coluna está trocada de lugar — e é melhor perguntar do que
gerar um casco errado que parece certo.

## O navegador não mostra nada

O HTML precisa de WebGL. Se o visualizador aparecer com a mensagem *"Este
visualizador precisa de WebGL"*, a tabela de cotas e a hidrostática continuam
funcionando na mesma página; só a superfície 3D não. Em geral é aceleração de hardware
desligada no navegador.
