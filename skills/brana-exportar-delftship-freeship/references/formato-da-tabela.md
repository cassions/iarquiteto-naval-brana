# Formato da tabela de cotas

- [Regras comuns](#regras-comuns)
- [Casco quinado](#casco-quinado)
- [Casco de bojo redondo](#casco-de-bojo-redondo)
- [Como o formato é detectado](#como-o-formato-é-detectado)
- [Separador decimal](#separador-decimal)
- [O que o .part não representa](#o-que-o-part-não-representa)

## Regras comuns

- Colunas separadas por tabulação, espaços ou ponto e vírgula.
- Linhas começadas por `#` são comentário; linhas em branco são ignoradas.
- Uma linha de cabeçalho com os nomes das colunas é opcional, mas recomendada:
  é o que torna a detecção do formato inequívoca.
- Mínimo de 3 balizas. Todas precisam ter o mesmo número de colunas.
- **Unidades: milímetros.** Meias-bocas a partir da linha de centro; alturas acima
  da linha de base, que é o ponto mais baixo da quilha.
- `x` cresce da popa para a proa. A **primeira baliza é o contorno do espelho de
  popa** — é dela que sai a face do espelho.
- A última baliza é a proa. Se quilha e borda estiverem na mesma altura com todas
  as meias-bocas zeradas, ela vira um ponto único. Se as meias-bocas zerarem mas as
  alturas diferirem, vira o segmento vertical da cabeça do talha-mar.

## Casco quinado

7 colunas obrigatórias, mais `deadrise_deg` opcional na oitava:

```
stn  x  sheer_hb  chine_hb  sheer_ht  chine_ht  keel_ht  [deadrise_deg]
```

| Coluna | Significado |
|---|---|
| `sheer_hb` | meia-boca na borda |
| `chine_hb` | meia-boca no chine |
| `sheer_ht` | altura da borda |
| `chine_ht` | altura do chine |
| `keel_ht` | altura da quilha |

A seção é feita de dois painéis retos: quilha → chine → borda. O `deadrise_deg`,
quando presente, é lido mas não usado — a geometria vem das cotas. Serve de
conferência: `deadrise = atan((chine_ht − keel_ht) / chine_hb)`.

Fundo chato se representa com `chine_ht = keel_ht`.

A **linha do chine é marcada como quina viva** (crease) ao longo de todo o casco.

## Casco de bojo redondo

No mínimo 6 colunas; o número de meias-bocas é livre:

```
baliza  x  altura_quilha  altura_borda  <meias-bocas intermediárias...>  meia_boca_borda
```

Os níveis intermediários são **igualmente espaçados no pontal local de cada baliza**.
Com *k* colunas de meia-boca (contando a da borda), o nível *i* fica em `i/k` do pontal:

| Colunas de meia-boca | Frações dos níveis |
|---|---|
| 4 (`mb_25pc mb_50pc mb_75pc meia_boca_borda`) | 25 % / 50 % / 75 % / 100 % |
| 8 (`mb_12pc … mb_87pc meia_boca_borda`) | 12,5 % / 25 % / … / 87,5 % / 100 % |

A meia-boca na quilha é zero por definição e não entra na tabela. Entre os níveis a
skill interpola com spline monótona, que não gera meia-boca negativa perto da quilha
nem barriga acima da borda.

Fundo chato **não** é representável neste formato.

## Como o formato é detectado

1. Palavras do cabeçalho, quando houver: `sheer_hb`, `chine_hb`, `chine_ht`,
   `keel_ht`, `deadrise` → quinado. `altura_quilha`, `altura_borda`, `mb_`,
   `meia_boca`, `baliza` → redondo.
2. Sem cabeçalho útil, decide por votação nas linhas de dados: se a 3ª coluna for
   maior que a 4ª na maioria das balizas é quinado (`sheer_hb > chine_hb`); se for
   menor é redondo (`altura_quilha < altura_borda`).

Contagem de colunas **não** serve para distinguir: as duas famílias podem ter 7 ou 8.

## Separador decimal

Decidido para a tabela inteira, não token a token — `283,5` lido como `2835` não
geraria erro nenhum, geraria um casco errado em silêncio.

| Escrito | Lido como |
|---|---|
| `283.5` | 283,5 |
| `283,5` | 283,5 |
| `1.009,8` | 1009,8 |
| `1,009.8` | 1009,8 |

## O que o .part não representa

- **Espelho inclinado.** O espelho sai como face plana vertical no `x` da primeira
  baliza. A forma (bocas e alturas) e o LOA ficam corretos; a inclinação, não.
- Tosamento transversal do convés, pé de quilha, skeg, bolina e apêndices.
- O `.part` é meio casco de bombordo. O DELFTship e o FREE!ship espelham camada
  simétrica; se vier metade, é a flag de simetria da camada.
- É rede de controle de superfície de subdivisão, não a superfície final. A malha é
  densa o bastante para o desvio ficar na casa de milímetros, mas quem alisa é você.
