# Exemplos de entrada e de saída

**Estas tabelas não são o casco de ninguém.** Servem para ver o painel funcionando
antes de mandar a sua. Nunca gere um painel a partir delas fingindo que é o barco
de quem pediu.

## Entradas

| arquivo | casco | para que serve de exemplo |
|---|---|---|
| `exemplo-quinado-8-balizas.txt` | 6,00 × 2,01 × 0,90 m, 8 balizas | formato quinado, casco pequeno em deslocamento |
| `exemplo-quinado-12m-planeio.txt` | 12,00 × 3,90 × 1,55 m, 11 balizas | formato quinado, casco de planeio — mostra a carga de impacto mandando |
| `exemplo-redondo-12-balizas.txt` | 3,78 × 1,44 × 0,73 m, 12 balizas | formato de bojo redondo, com três níveis de meia-boca |

A tabela de 12 m foi **gerada** por um envelope paramétrico para servir de
demonstração; as outras duas vieram de plano de linhas alisado. As três estão em
milímetros, como o formato pede.

## Saída

`Arranjo-Estrutural-Quinado-Cassio.html` — 445 KB, saiu de:

```bash
node scripts/gerar-painel.js --tabela=exemplos/exemplo-quinado-12m-planeio.txt \
  --nome="Cassio" --barco="Lancha de trabalho" --material=alu \
  --deslocamento=12 --velocidade=28 --saida=exemplos
```

É o mesmo layout que qualquer pessoa vai receber: nove passos guiados, do barco ao
quadro de pesos e centros, mais a versão avançada e o botão do PDF. Abra por duplo
clique: não pede rede, não instala nada, e funciona no celular.

Vale abrir os passos **6, 7 e 8** para ver o que a tabela de cotas alimenta além da
espessura: o catálogo de perfis de cada reforço, as anteparas de colisão pousadas
sobre caverna, e o peso da estrutura com o centro cotado no desenho.

## Três comandos para experimentar

O mesmo casco em outro material — a espessura muda, o peso muda mais:

```bash
node scripts/gerar-painel.js --tabela=exemplos/exemplo-quinado-12m-planeio.txt \
  --nome="Teste" --material=frp --deslocamento=12 --velocidade=28 --saida=/tmp
```

O casco pequeno, sem informar nada além do obrigatório — repare no aviso de que a
velocidade foi **assumida**:

```bash
node scripts/gerar-painel.js --tabela=exemplos/exemplo-quinado-8-balizas.txt \
  --nome="Teste" --saida=/tmp
```

O casco de bojo redondo, para ver a volta do bojo separando fundo de costado — e,
no passo 7, o que acontece quando o cavernamento é largo demais para caber uma
antepara dentro da faixa usual:

```bash
node scripts/gerar-painel.js --tabela=exemplos/exemplo-redondo-12-balizas.txt \
  --nome="Teste" --material=alu --saida=/tmp
```
