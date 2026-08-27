# Formato do manifesto

Um único JSON alimenta `scripts/gerar_pdf.py`. Só o que está aqui é lido; chave
desconhecida é ignorada em silêncio.

## Raiz

| Chave | Obrigatória | O que é |
|---|---|---|
| `projetista` | **sim** | nome de quem usa a skill. Vira o nome do arquivo. |
| `data` | não | texto livre, ex. `"22 de agosto de 2026"` |
| `titulo` | não | padrão `"Arranjos Gerais Encontrados"` |
| `eyebrow` | não | linha acima do título na capa |
| `resumo` | não | 1 parágrafo na capa (até 4 linhas) |
| `stats` | não | até 4 pares `["41","pranchas cotadas"]`. Sem isso, conta sozinho. |
| `secoes` | **sim** | lista de seções, cada uma com suas pranchas |
| `sem_planta` | não | páginas de quem **não publica desenho**. Saem depois de todas as seções, no fim do documento. Rotule cada uma no `nome` com "— sem planta", para o leitor nunca confundir foto com desenho (regra 7 de fidelidade) |
| `comparativo` | não | linhas `[rótulo, faixa nas pranchas, seu projeto, comentário]` — até 7 |
| `leituras` | não | cards `[número, título, texto]` — até 6 |
| `fontes` | não | lista de páginas de fonte (ver abaixo) |
| `sub_indice`, `nota_indice` | não | textos do índice |
| `titulo_comparativo`, `sub_comparativo`, `nota_comparativo` | não | textos |
| `titulo_leituras`, `sub_leituras`, `nota_leituras` | não | textos |

## Seção

```json
{ "num": "01", "titulo": "Brasil — Levefort", "sub": "Alumínio naval · 5 pranchas",
  "bullets": ["até 4 linhas curtas"], "pranchas": [ ... ] }
```

## Prancha

```json
{ "id": "PR-01",
  "nome": "Levefort Marajó 16′ Freestyle",
  "sub": "linha fina abaixo do título",
  "img": "img/lf_marajo16.jpg",
  "pais": "BR",
  "dados": [["Rótulo", "valor"], ...],
  "nota":  ["TÍTULO DA NOTA", "texto"],
  "notas": [["TÍTULO 1", "texto"], ["TÍTULO 2", "texto"]],
  "fonte": "Fonte: ... — PDF <url>",
  "idx": ["5,00 × 1,80", "...", "..."] }
```

- `dados`: até 12 pares. O painel trunca rótulo em 34 e valor em 24 caracteres.
- `nota` ou `notas`: use `nota` para um bloco só. O texto trunca em ~6 linhas.
- `fonte`: até 2 linhas no rodapé. Sempre com o link.
- `idx`: opcional. Só use se a derivação automática errar.

## Rótulos canônicos — o índice depende deles

O gerador monta o índice lendo `dados`. Escreva o rótulo exatamente assim (com
ou sem acento, maiúsculas indiferentes):

| Coluna | Rótulos aceitos |
|---|---|
| LOA | `Comprimento`, `LOA`, `Comprimento total`, `Comprimento do casco`, `Comprimento × boca` |
| Boca | `Boca`, `Boca máxima`, `Boca externa` |
| Pontal | `Pontal`, `Depth`, `Borda` |
| Calado | `Calado`, `Draft` |
| Peso | `Peso`, `Peso aproximado`, `Peso do casco`, `Peso seco`, `Deslocamento`, `Deslocamento seco` |
| Máx HP | `Potência máxima`, `Potência`, `Max HP` |
| Deadrise | `Deadrise`, `Deadrise no espelho`, `Ângulo de V` |
| Material | `Material`, `Construção` |

País vem de `pais`, não de `dados`. O que não casar sai como `—`.

O casamento é **por prefixo e sem acento**, e vale o **primeiro** rótulo que
casar. Duas consequências práticas:

- `Boca máxima`, `Boca externa` e `Boca interna` todos casam com `Boca`. Ponha a
  boca que deve ir ao índice **antes** das outras na lista `dados`.
- Um rótulo como `Comprimento do casco` casa com `Comprimento` (coluna LOA). Se
  quiser que o LOA total vá ao índice, liste `LOA` primeiro.

Quando a ordem não resolver, use `idx` para escrever a linha do índice à mão.

## Fontes

```json
"fontes": [
  { "titulo": "Fontes — Brasil e Oceania",
    "nota": "aparece só na primeira página de fontes",
    "grupos": [ ["LEVEFORT · BRASIL", ["linha 1", "linha 2"]] ] }
]
```

Cada item da lista vira uma página. Quebre em duas quando passar de ~20 linhas.

## Limites do layout

Página 960 × 540 pt (16:9). Desenho à esquerda numa caixa de 560 × 400 pt,
ajustado e centrado sem distorcer. Painel à direita, 312 pt de largura.

- Imagem larga (proporção > 1,4) fica limitada pela largura — sobra faixa em cima
  e embaixo. Normal.
- Imagem retrato (proporção < 1,4) fica limitada pela altura. Prefira recortar só
  a região do desenho, não a folha A4 inteira.
- Índice: 16 linhas por página, paginado sozinho.

## Caracteres

O PDF usa Helvetica, que cobre Latin-1. Acentos, `·`, `×`, `°`, `©`, `—` e `²`
saem certos. Glifos fora do Latin-1 (`▸`, `•`, `′`, `″`, `→`, `≈`, `…`) são
trocados automaticamente por equivalentes seguros na hora de gerar — mas escreva
já com o equivalente para o texto sair como você quer:

| Evite | Use |
|---|---|
| `▸` `•` | `—` ou `·` |
| `′` `″` | `'` `"` |
| `…` | `...` |
| `→` | `->` |

## Validações do gerador

- Sem `projetista` e sem `-o`: erro, não gera.
- Imagem faltando: avisa no stderr e desenha um retângulo com o caminho.
- Menos de 10 pranchas: avisa no stderr, mas gera.
