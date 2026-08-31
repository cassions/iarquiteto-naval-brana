# Exemplos de entrada e de saída

## Entradas

Três tabelas de cotas reais, nos dois formatos que a skill aceita. Servem para
**testar** a skill e para mostrar à pessoa como a tabela dela deve estar — nunca como
substituto do casco dela.

| Arquivo | Formato | Balizas | LOA | Observação |
|---|---|---|---|---|
| `entrada-redondo-6-balizas.tsv` | redondo | 6 | 6,000 m | 3 níveis intermediários (25/50/75%). Lancha de trabalho de deslocamento. |
| `entrada-quinado-8-balizas.tsv` | quinado | 8 | 6,000 m | Com chine. Mesmo comprimento do anterior — bom par de comparação. |
| `entrada-redondo-12-balizas.tsv` | redondo | 12 | 3,779 m | 7 níveis intermediários. Bote pequeno; o único dos três em que a trava do capítulo dispara. |

O da esquerda mostra que **qualquer número de níveis intermediários serve**, desde que
seja o mesmo em todas as balizas: um tem 3, outro tem 7.

## Saída

`Estimativa-Velocidade-Cassio.html` — gerado de `entrada-redondo-6-balizas.tsv` com:

```bash
node scripts/gerar-painel.js \
  --tabela=exemplos/entrada-redondo-6-balizas.tsv \
  --nome="Cassio" --saida=exemplos
```

e o script imprimiu:

```
painel gerado: .../Estimativa-Velocidade-Cassio.html
  casco ....... redondo · 6 balizas · LOA 6,000 m
  capacidade .. 5810 kg ate a borda mais baixa, em agua salgada
  abre com .... 830 kg e 4,50 HP  ->  calado 0,267 m · LWL 4,520 m · BWL 1,551 m
  forma ....... D/L 250 · Cp 0,600 · alto de quarto de boca 6,13 graus
  referencia .. Casco quinado · 6,00 m, para comparar os regimes
  todas as 17 verificacoes passaram · 330 KB
```

É o mesmo layout que qualquer pessoa vai receber — só mudam a tabela embutida, o peso e
a potência de partida, e o nome. **Mande este arquivo** se a pessoa quiser ver o painel
antes de decidir mandar a tabela dela.

## O que acontece com cada entrada

Rodando as três, o script escolhe sozinho o ponto de partida e o casco de referência:

| Entrada | Abre com | D/L | C<sub>p</sub> | Alto | Referência embutida |
|---|---|---|---|---|---|
| redondo 6 balizas | 830 kg · 4,5 HP | 250 | 0,600 | 6,13° | quinado de 6,00 m |
| quinado 8 balizas | 440 kg · 2,5 HP | 118 | 0,686 | 2,78° | redondo de 6,00 m |

A referência é sempre do **formato oposto** ao da tabela fornecida: é o contraste que
faz o passo 4 da aula funcionar, porque ele precisa de um casco que planeie e de um que
não planeie.
