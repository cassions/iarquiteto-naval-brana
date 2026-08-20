# Casco quinado (com chine)

Modelo: `assets/modelo-quinado.html`. Saída: `Plano-de-Linhas-<Nome>.html`.

## Cinco curvas

| Chave | Vista | O que é |
|---|---|---|
| `planSheer` | planta | meia-boca da borda (aresta do convés) |
| `planChine` | planta | meia-boca do chine |
| `profSheer` | perfil | altura da borda |
| `profChine` | perfil | altura do chine |
| `profKeel`  | perfil | altura da quilha |

A baliza em qualquer estação é a poligonal `quilha → chine → borda`, com dois trechos
retos. É isso que faz o casco ser quinado.

## O chine em planta quase nunca está desenhado

O croqui costuma dar só o contorno do convés na vista superior. Sem a meia-boca do chine
o casco não pode ser seccionado em lugar nenhum além da meia-nau.

**Acrescente a curva**, tirando a proporção da seção mestra desenhada: meça
`meia-boca do chine ÷ meia-boca do convés` na seção e aplique essa razão à borda,
afinando um pouco em direção à proa (na referência: 0,80 no espelho, 0,76 na meia-nau,
0,74 à vante). Marque isso no registro com o selo `acrescentado` — é uma adição sua, não
uma leitura.

## Bloco do projeto

No modelo, substitua só o que está entre as marcas:

```js
var LOA_SQ = 14;      /* comprimento em quadrados */
NST = 8;              /* numero de balizas */

var SPEC = {
  planSheer:{ view:'plan', label:'Planta · borda', layer:'PLANTA_BORDA',
    pts:[[x, y, declividade], ...], fixLast:'both' },
  planChine:{ view:'plan', ... , fixLast:'both' },
  profSheer:{ view:'prof', ... , fixLast:'x', link:'stem' },
  profChine:{ view:'prof', ... , fixLast:'x', link:'stem' },
  profKeel :{ view:'prof', ... , fixLast:'x', link:'stem' }
};
var ORDER = ['planSheer','planChine','profSheer','profChine','profKeel'];

var RAW = { ... };            /* pontos medidos, para as cruzes nas vistas */
var PHOTO_SECT = { keel:[0,z], chine:[y,z], deck:[y,z] };   /* secao reprojetada */
var MID_X = 6;                /* X da meia-nau, onde o pontal e medido */
```

- `fixLast:'both'` — o último nó das curvas de planta fica cravado em (LOA_SQ, 0): a
  proa é um ponto.
- `link:'stem'` — as três curvas de perfil se encontram no topo da roda; arrastar uma
  leva as outras.
- `PHOTO_SECT` é a seção desenhada, reprojetada e assentada na altura inicial da quilha
  na meia-nau. Aparece tracejada sobre o plano de balizas.

## Restrições próprias deste modelo

Além do alisamento, o motor exige:

```
chine ≤ borda            (em planta)
quilha ≤ chine ≤ borda   (em perfil)
```

## Ângulos que a tabela mostra

- **Ângulo de V** = `atan((z_chine − z_quilha) / y_chine)` — cresce quando a boca aperta
  ou o pontal aumenta, e o número tem de acompanhar o estiramento.
- **Abertura** = `atan((y_borda − y_chine) / (z_borda − z_chine))`.

## Onde as vistas costumam brigar

A altura do chine. No croqui de referência o perfil punha o chine 0,944 quadrado acima
da quilha na meia-nau (V de 28,3°) e a seção desenhada punha 0,759 (23,3°). Alturas vêm
do perfil; a seção reprojetada fica tracejada por cima para a diferença continuar
visível. Relate os dois números.
