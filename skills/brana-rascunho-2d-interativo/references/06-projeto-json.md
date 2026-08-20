# O projeto.json

É o **único** arquivo que você escreve. Umas 40 linhas, ~300 tokens. `montar.py` injeta
o conteúdo dele no modelo, que nunca precisa entrar no seu contexto.

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

## Campos

| Campo | Obrigatório | O que é |
|---|---|---|
| `casco` | sim | `"quinado"` ou `"redondo"` |
| `nome` | sim | primeiro nome de quem pediu; entra no nome do arquivo |
| `loa_m` | sim | comprimento total em metros, **informado pela pessoa** |
| `loa_sq` | sim | comprimento em quadrados da malha |
| `balizas` | sim | quantas balizas o croqui numera |
| `mid_x` | sim | X da meia-nau, onde o pontal é medido |
| `curvas` | sim | saída de `ajustar.py`: `[x, y, declividade]` por nó |
| `medidos` | não | pontos lidos na foto; viram as cruzes nas vistas |
| `secao` | não | seção mestra reprojetada, tracejada sobre o plano de balizas |
| `cheia` | só redondo | `p` da super-elipse, e as frações de cheia a ré e a vante |
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
