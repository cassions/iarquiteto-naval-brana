# O projeto.json

É o **único** arquivo que você escreve. Umas 40 linhas, ~300 tokens. `montar.py` injeta
o conteúdo dele no modelo, que nunca precisa entrar no seu contexto.

Esquema na **versão 3**: três tipos de casco, e dois campos que só existem no terceiro
(`cheia.exp_vante` e o bloco `alefriz`). Para `quinado` e `redondo` nada mudou — sem
`alefriz`, sem `exp_vante`.

## Casco redondo

```json
{
  "casco": "redondo",
  "nome": "Fulano",
  "titulo": "Casco Redondo",
  "loa_m": 6.0,
  "loa_sq": 20,
  "balizas": 6,
  "mid_x": 8,
  "curvas": {
    "planSheer": [[0,2.542,0.26313], [3.96,3.288,0.11362], [8,3.455,-0.03102],
                  [11.94,2.994,-0.20306], [15.98,1.826,-0.37515], [20,0,-0.53325]],
    "profSheer": [[0,2.969,0.04672], [8.06,3.369,0.05255], [15.98,3.791,0.05402],
                  [20,4.011,0.05545]],
    "profKeel":  [[0,0.945,-0.25644], [4.25,0.203,-0.09268], [8.06,0,-0.01379],
                  [12.12,0.104,0.06513], [20,4.011,0.92662]]
  },
  "medidos": {
    "planSheer": [[0,2.542], [4.02,3.288], [8.01,3.455], [11.97,2.994], [16,1.826], [19.98,0]],
    "profSheer": [[0.08,2.969], [8.06,3.369], [15.98,3.791], [20,4.011]],
    "profKeel":  [[0.08,0.945], [4.25,0.203], [8.06,0], [12.12,0.104], [20,4.011]]
  },
  "secao": { "pts": [[0,0], [0.735,0.039], [1.7,0.234], [2.473,0.683],
                     [3.053,1.366], [3.44,2.147], [3.536,3.083]] },
  "cheia": { "p": 2.32, "re": 0.93, "vante": 0.62 }
}
```

## Casco quinado

Iguais, trocando as curvas e a seção:

```json
{
  "casco": "quinado",
  "nome": "Fulano",
  "loa_m": 6.0, "loa_sq": 14, "balizas": 8, "mid_x": 6,
  "curvas": {
    "planSheer": [...], "planChine": [...],
    "profSheer": [...], "profChine": [...], "profKeel": [...]
  },
  "medidos": { ... },
  "secao": { "keel": [0,0.047], "chine": [1.765,0.806], "deck": [2.34,2.104] }
}
```

## Casco de quilha cheia

Mesmas três curvas do redondo, mesma ordem. O que aparece a mais são `cheia.exp_vante` e
o bloco `alefriz`:

```json
{
  "casco": "quilha-cheia",
  "nome": "Luiz",
  "titulo": "Casco de Quilha Corrida",
  "subtitulo": "Quilha corrida · baliza em wineglass · pé de roda profundo",
  "loa_m": 6.8, "loa_sq": 16, "balizas": 5, "mid_x": 6.788,
  "curvas": {
    "planSheer": [[0,1.6328,0.367], [1.865,2.2898,0.33756], [6.788,3.3428,-0.01907],
                  ..., [16,0,-0.68897]],
    "profSheer": [[0,4.821,-0.04228], ..., [16,5.571,0.20858]],
    "profKeel":  [[0,0.032,-0.03373], [2.581,0,0.00893], ..., [16,5.571,1.41532]]
  },
  "medidos": { "planSheer": [...], "profSheer": [...], "profKeel": [...] },
  "secao": { "pts": [[0,0], [0.34,0.542], [0.683,0.948], [1.026,1.149], [1.711,1.484],
                     [2.328,2.024], [2.74,2.838], [2.973,3.654], [3.083,4.198]] },
  "cheia":   { "p": 3.23, "re": 0.51, "vante": 0.20, "exp_vante": 0.7 },
  "alefriz": { "z0": 1.3779, "subida": 0.010, "tuck": 0.40, "extensao": 2.5 }
}
```

`alefriz.z0` é a cota da garganta na meia-nau, em quadrados. **Não tem padrão** — sai do
ajuste da seção mestra, e `montar.py` recusa o projeto sem ela. Os outros três são valores
de projeto, não medidas. Ver [07-modelo-quilha-cheia.md](07-modelo-quilha-cheia.md).

`secao.pts` vai com nove pontos, não com os cinco a sete do redondo: quatro deles caem
entre 10 % e 45 % do pontal, cercando a garganta. É o adensamento que
[02-digitalizacao.md](02-digitalizacao.md) pede.

## Campos

| Campo | Obrigatório | O que é |
|---|---|---|
| `casco` | sim | `"quinado"`, `"redondo"` ou `"quilha-cheia"` |
| `nome` | sim | primeiro nome de quem pediu; entra no nome do arquivo |
| `loa_m` | sim | comprimento total em metros, **informado pela pessoa** |
| `loa_sq` | sim | comprimento em quadrados da malha |
| `balizas` | sim | quantas balizas o croqui numera |
| `mid_x` | sim | X da meia-nau, onde o pontal é medido |
| `curvas` | sim | saída de `ajustar.py`: `[x, y, declividade]` por nó |
| `medidos` | não | pontos lidos na foto; viram as cruzes nas vistas |
| `secao` | não | seção mestra reprojetada, tracejada sobre o plano de balizas |
| `cheia` | redondo e quilha cheia | `p` da forma da baliza, e as frações de cheia a ré e a vante |
| `cheia.exp_vante` | só quilha cheia | expoente da suavização à vante. Padrão **0,7**. Com 1,0 — a suavização simples do redondo — o Cm da baliza vizinha à proa sai maior que o da mestra, o que não existe |
| `alefriz.z0` | **sim**, em quilha cheia | cota do alefriz na meia-nau, em quadrados. Sem padrão: vem do ajuste da seção mestra |
| `alefriz.subida` | não | subida do alefriz por quadrado, para vante. Padrão **0,010** |
| `alefriz.tuck` | não | levantamento do alefriz no tuck, em quadrados, medido sobre o prolongamento da reta. Padrão **0,40** — que rende 0,375 qd de levantamento em relação à cota do alefriz no fim do tuck, que é o número que se mede num traçado pronto. |
| `alefriz.extensao` | não | extensão do tuck a partir do espelho, em quadrados. Padrão **2,5** |
| `titulo` | não | título da página; o padrão vem do tipo de casco |
| `subtitulo` | não | frase do selo |
| `registro` | não | `{ "calibracao": "…", "notas": ["…"] }`, texto do registro |

## O que o script já faz por você

Não escreva no JSON o que é derivado — `montar.py` e o motor cuidam:

- rótulos, camadas de exportação e a ordem das curvas;
- `fixLast` e o vínculo das curvas de perfil no topo da roda;
- escala, altura dos painéis, limites dos nós e as `viewBox` — tudo derivado do modelo
  pela função `layout()`;
- espaçamento das balizas, cota do espaçamento, posição dos números.

## Erros comuns

- **Declividades escritas à mão.** Use `ajustar.py`. Ele resolve o grau de liberdade do
  sistema impondo a mesma convexidade que o motor verifica.
- **`loa_sq` errado.** É o comprimento em quadrados, não em metros nem em balizas.
- **`mid_x` na baliza errada.** É a coordenada X, não o número da baliza.
