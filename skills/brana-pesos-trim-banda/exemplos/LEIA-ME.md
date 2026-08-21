# Exemplos

## Entradas — tabelas de cotas

| arquivo | casco | balizas | níveis intermediários |
|---|---|---|---|
| `exemplo-redondo-6-balizas.txt` | bojo redondo, 6,000 m | 6 | 3 (25% / 50% / 75%) |
| `exemplo-redondo-12-balizas.txt` | bojo redondo, 3,779 m | 12 | 7 (12,5% … 87,5%) |
| `exemplo-quinado-8-balizas.txt` | quinado com chine, 6,000 m | 8 | — (chine é nó exato) |

Os dois primeiros mostram que o número de níveis intermediários é livre: o leitor
deduz o espaçamento do número de colunas. O terceiro traz a coluna `deadrise_deg`,
que é lida e ignorada.

**São outros barcos.** Não use nenhum deles como se fosse o casco de quem está
pedindo o painel — sirva-se deles para testar a skill, ou para mostrar à pessoa como
uma tabela deve chegar.

## Saída — painel interativo

`Pesos-Trim-Banda-v2-Quinado-Cassio.html` saiu de:

```bash
node scripts/gerar-painel.js --tabela=exemplos/exemplo-quinado-8-balizas.txt \
                            --nome=Cassio --saida=exemplos
```

Abre por duplo clique, offline. É o mesmo layout que qualquer tabela vai receber: só
mudam a forma do casco, os números e o nome na folha.

Neste casco o painel abre com 0,369 m de calado, 939 kg de deslocamento
(864 kg de barco mais um peso de 75 kg pousado sobre o CG do barco) e
GM<sub>t</sub> de 0,760 m — a prumo, sem trim nem banda.
