# SAÍDA — o que a skill entrega

Rodando os dois exemplos de entrada, a skill produz **um único arquivo**:

```
Arranjos Gerais - Cassio.pdf     23 páginas · 16:9 (960 × 540 pt) · ~5,7 MB
```

O nome vem de `projetista`. Trocando para "Marina", sai
`Arranjos Gerais - Marina.pdf`.

## Estrutura das 23 páginas

| Página | Conteúdo |
|---|---|
| 1 | **Capa** — fundo grafite, título, resumo, 4 números-destaque, projetista e data |
| 2 | **Índice** — as 12 pranchas com LOA, boca, pontal, calado, peso, máx HP, deadrise, material e país. Montado sozinho a partir dos rótulos de `dados` |
| 3 | Divisória **01 — Reino Unido · Orkney Boats** |
| 4–7 | Pranchas PR-01 a PR-04 (Coastliner 14, 452, Longliner 16, 522) |
| 8 | Divisória **02 — Brasil · Levefort** |
| 9–10 | Pranchas PR-05 e PR-06 (Marajó 16′ e 17′) |
| 11 | Divisória **03 — Austrália · Plate Alloy** |
| 12–15 | Pranchas PR-07 a PR-10, com o par pesca × lazer sobre o mesmo casco |
| 16 | Divisória **04 — Nova Zelândia · Stabicraft** |
| 17–18 | Pranchas PR-11 e PR-12 |
| 19–20 | **Sem planta publicada** — Carolina Skiff e Panga, os similares do estudo |
| 21 | **Comparativo** — 6 linhas: faixa nas pranchas × o seu projeto × comentário |
| 22 | **Leituras** — 6 cards com o que muda no projeto |
| 23 | **Fontes** — agrupadas por estaleiro, com os links |

## Anatomia de uma prancha

```
┌─ PR-04 ─ Orkney 522 ──────────────────────────────────────────────┐
│  Reino Unido · fibra + vinilester · o similar mais próximo         │
│                                                                     │
│  ┌───────────────────────────┐   ┌──────────────────────────────┐ │
│  │                           │   │ DADOS PUBLICADOS             │ │
│  │   planta (desenho do      │   │ Comprimento        5,20 m    │ │
│  │   estaleiro, recortado)   │   │ Boca               2,00 m    │ │
│  │                           │   │ Peso do casco      545 kg    │ │
│  │   perfil (empilhado       │   │ Potência máxima    60 HP     │ │
│  │   pelo coletar.py)        │   │ Lotação            6 pessoas │ │
│  │                           │   │ ...                          │ │
│  │                           │   │                              │ │
│  │                           │   │ É ESTE O SIMILAR EM FIBRA    │ │
│  │                           │   │ 5,20 m, 6 pessoas, popa de   │ │
│  │                           │   │ 60 HP, cockpit autoesgotável │ │
│  │                           │   │                              │ │
│  │                           │   │ LACUNA                       │ │
│  │                           │   │ Não publica pontal.          │ │
│  └───────────────────────────┘   └──────────────────────────────┘ │
│  Fonte: Orkney Boats (©) — orkneyboats.com/our-range/orkney-522   │
└────────────────────────────────────────────────────────────────────┘
```

## O que o console mostra ao gerar

Execução limpa — é assim que tem de terminar:

```
$ python scripts/gerar_pdf.py manifesto.json
PDF gerado: Arranjos Gerais - Cassio.pdf  (12 pranchas)
```

Sem aviso nenhum. **Se não reclamou, não abra o PDF.**

Avisos possíveis, e o que fazer com cada um:

```
AVISO: 2 imagem(ns) nao encontrada(s): img/cs_lateral.jpg, img/panga.jpg
```
Faltou baixar. A página sai com um retângulo mostrando o caminho esperado.
Rode o `coletar.py` para essas duas e gere de novo — **não entregue assim**.

```
AVISO: so 7 pranchas. A skill exige no minimo 10.
```
Volte ao catálogo e traga mais três.

```
AVISO: PR-04 tem mais de 12 linhas de 'dados'; o painel mostra so as 12 primeiras.
```
Corte as linhas menos úteis, senão o índice e o painel discordam.

## Antes de entregar

```bash
python scripts/gerar_pdf.py manifesto.json --faixas
```

Confira se as faixas do comparativo batem com o que você escreveu. Saída típica:

```
Faixas nas 12 pranchas — cole no 'comparativo':
  loa        4,37 m (14'4") a 5,20 m (17'1")   (12 de 12 pranchas informam)
  boca       1,73 m a 2,01 m                    (12 de 12 pranchas informam)
  deadrise   14° a 15°                          (6 de 12 pranchas informam)
```

## O que você diz ao entregar

Resuma em texto, não repita o PDF:

> 12 pranchas de 4 estaleiros, sendo 4 em fibra de vidro — o mesmo material do
> seu projeto. Os três similares do estudo (Carolina Skiff 17 LS, 162 JLS e
> Panga 15 Large) não publicam planta; estão na seção final com o que existe.
>
> Três leituras que mudam o projeto: o Orkney 522 é o similar em fibra que
> faltava (5,20 m, 545 kg, 60 HP, 6 pessoas, cockpit autoesgotável); a Plate
> Alloy publica Fly Fisher, Centre Console e Runabout sobre o mesmo fundo, o que
> documenta a sua ideia de duas versões; e a boca interna cotada (1.407 mm num
> casco de 2,00 m) é a medida que o seu 1,80 m precisa responder.
