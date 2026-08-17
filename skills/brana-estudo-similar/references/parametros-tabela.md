# Parâmetros da tabela comparativa e formato do JSON

## O conjunto de parâmetros

A lista canônica vive em `scripts/parametros.py` — os dois scripts leem dela, então
a planilha e o documento nunca saem fora de sincronia. A tabela abaixo é a mesma
lista em forma legível, com a chave que você usa no JSON.

| Chave | Parâmetro (PT) | Original (imperial) | SI |
|---|---|---|---|
| `loa` | Comprimento total (LOA) | ft | m |
| `lwl` | Comprimento na linha d'água (LWL) | ft | m |
| `boa` | Boca máxima (BOA) | ft | m |
| `calado` | Calado | ft | m |
| `pontal` | Pontal (fundo até o convés) | ft | m |
| `deslocamento` | Deslocamento | lbs | kg |
| `deadrise` | Ângulo de V do fundo (deadrise) | graus | graus |
| `pe_direito` | Altura livre interna (pé-direito) | ft | m |
| `area_velica` | Área vélica (se veleiro) | ft² | m² |
| `combustivel` | Combustível | US gal | L |
| `agua` | Água doce | US gal | L |
| `dejetos` | Tanque de dejetos (águas negras) | US gal | L |
| `potencia` | Potência instalada | HP | kW |
| `motorizacao` | Motorização (marca / modelo / qtd.) | texto | texto |
| `motorizacao_det` | Motorização (detalhe) | texto | texto |
| `vel_max` | Velocidade máxima | MPH | kn |
| `vel_cruzeiro` | Velocidade de cruzeiro | MPH | kn |
| `autonomia` | Autonomia | NM | NM |
| `ff` | Borda livre à proa (FF) | ft | m |
| `fm` | Borda livre a meia-nau (FM) | ft | m |
| `para_brisa` | Altura do para-brisa | ft | m |
| `deck_cl` | Altura máxima do deck na linha de centro | ft | m |
| `plataforma_wl` | Plataforma de banho: topo até a linha d'água | ft | m |
| `balaustre` | Altura do balaústre (corrimão) | ft | m |

### Razões — calculadas, não coletadas

| Chave | Razão | Como sai |
|---|---|---|
| `loa_boa` | LOA / BOA | Calculada por fórmula na planilha a partir de `loa` e `boa`. Adimensional: não se converte. |
| `dlr` | Razão deslocamento-comprimento | `Δ[long tons] / (0,01 × LWL[pés])³`. Definida em unidades imperiais — recalcular em SI mudaria a definição, por isso permanece como está. Calculada por fórmula. |
| `disp_potencia` | Deslocamento / Potência | Calculada por fórmula. Aparece como kg/HP no documento e kg/kW na aba métrica. |

Você pode informar `loa_boa`, `dlr` ou `disp_potencia` no JSON se a **fonte
publicar** o valor (Sailboatdata publica D/L, por exemplo). Nesse caso o script
usa o valor da fonte e marca a célula como vinda da fonte. Se você não informar,
a planilha calcula.

### O que significa cada razão — para explicar ao projetista

- **LOA/BOA** — quantas vezes o barco é mais comprido que largo. Baixo (≈2,5–3)
  = barco largo, estável, muito espaço interno. Alto (≈4+) = barco esguio, mais
  eficiente e rápido, menos volume.
- **DLR (razão deslocamento-comprimento)** — quão pesado o barco é para o
  comprimento que tem. Baixo = leve, planeia fácil. Alto = pesado, mais
  confortável no mar formado, mais potência para a mesma velocidade.
- **Deslocamento / Potência** — quantos quilos cada unidade de potência precisa
  empurrar. Quanto menor, mais esportivo.

## Formato do `dados.json`

Um único arquivo alimenta os dois scripts. Campos ausentes são tratados como
lacuna — nunca inventados.

```json
{
  "projetista": "Ana Ribeiro",
  "data": "2026-08-17",
  "embarcacao_pretendida": "Lancha de 38 pés para pesca costeira e passeio, 8 pessoas, sem pernoite",
  "caso_de_uso_resumo": "Três a quatro linhas resumindo missão, usuário, área de navegação e orçamento.",
  "criterios_selecao": "Como os similares foram escolhidos: faixa de comprimento, propulsão, missão equivalente.",
  "leitura_parametrica": "O que a comparação mostra: faixas encontradas, onde os similares concordam e divergem.",
  "recomendacao": "Recomendação preliminar de dimensões e potência para o barco novo.",
  "observacoes": "Divergências entre fontes, avisos de dado possivelmente desatualizado, o que ficou de fora.",
  "similares": [
    {
      "nome": "400 Super Sport",
      "estaleiro": "Formula Boats",
      "ano": "2019",
      "sistema": "imperial",
      "porque_similar": "Mesma faixa de comprimento e missão de passeio costeiro com motorização de popa.",
      "foto": "fotos/formula400.jpg",
      "foto_credito": "Formula Boats, catálogo do modelo",
      "fontes": [
        {
          "nome": "Formula Boats — especificação do 400 SS",
          "url": "https://... (link que apareceu literalmente na busca)",
          "data_publicacao": "2019-05-10",
          "data_acesso": "2026-08-17",
          "tipo": "estaleiro"
        }
      ],
      "dados": {
        "loa": 41.5,
        "lwl": 33.4,
        "boa": 11,
        "calado": 3,
        "deslocamento": 17100,
        "deadrise": 22,
        "combustivel": 250,
        "potencia": 1040,
        "motorizacao": "(2) Mercury Racing 520 Bravo Three XR w/Axius",
        "vel_max": 47.2,
        "vel_cruzeiro": 28.8,
        "autonomia": 341
      },
      "lacunas": ["pontal", "dejetos", "area_velica"],
      "divergencias": "TheBoatDB publica LOA 41,5 ft; um anúncio de revenda publica 42 ft — provável inclusão da plataforma de banho."
    }
  ]
}
```

### Regras do JSON

- **`sistema`** é obrigatório por embarcação: `"imperial"` ou `"metrico"`. Ele diz
  em que unidade os valores de `dados` foram **publicados**. A planilha guarda o
  valor como publicado e converte por fórmula só o que precisa. Errar este campo
  corrompe a coluna inteira.
- Se a mesma embarcação tem dados em unidades misturadas na fonte (comum: casco em
  metros, tanque em galões), declare `sistema` pelo predominante e passe os
  divergentes já na unidade declarada — anotando isso em `divergencias`.
- **Valores numéricos vão como número**, não como texto: `41.5`, não `"41,5 ft"`.
  Sem unidade dentro do valor, sem separador de milhar.
- **`motorizacao`** e `motorizacao_det` são texto livre, copiados como publicados.
- Parâmetro que a fonte não informa: **omita a chave**. Não use `0`, `"-"` nem
  `"N/D"` — zero é um número e vira gráfico errado. A ausência é registrada em
  `lacunas`.
- `fontes` aceita mais de uma entrada por embarcação, e deve ter pelo menos uma.
  Sem fonte, o script recusa a embarcação — de propósito.
- `data_publicacao` sem data identificável na página: use a string
  `"sem data identificável"`.

## Quantas embarcações

Mínimo 3. A planilha comporta até 8 colunas confortavelmente; o documento, até 6
(além disso o script acrescenta colunas, mas a tabela fica apertada na página).
Se o estudo tiver mais de 6 similares, considere entregar a tabela completa no
`.xlsx` e no documento destacar os 6 mais próximos, dizendo isso explicitamente.
