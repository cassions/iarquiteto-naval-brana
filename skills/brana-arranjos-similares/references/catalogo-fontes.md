# Catálogo de fontes que publicam planta baixa

Leia este arquivo **antes** de qualquer busca na web. Ele resolve a maioria dos
casos de 4 a 7 m com download direto.

Todas as URLs abaixo foram verificadas em **26/08/2026**: 72 de 72 responderam
HTTP 200. Ainda assim, **confirme o 200 antes de citar** — sites mudam.

**Como confirmar que uma URL está viva**, em uma linha:

```bash
curl -sIL -A "Mozilla/5.0" -m 45 "<URL>" | grep -iE "^(HTTP|content-type|content-length)"
```

> **Cuidado com HEAD.** Lund, Crestliner e o OpenKnowledge da FAO não devolvem
> `Content-Length`, e a FAO ainda anuncia `application/json`. Nesses hosts o HEAD
> engana: valide por GET e pelos primeiros bytes.
>
> ```bash
> curl -s -A "Mozilla/5.0" -m 90 "<URL>" -o /tmp/x && head -c 4 /tmp/x && wc -c < /tmp/x
> ```
>
> Mais simples ainda: `coletar.py "<URL>" --info` já baixa, identifica o tipo e
> diz quantas páginas tem. Uma chamada em vez de duas.

---

## 1. Levefort — Brasil, alumínio naval

**O que publica:** uma folha A4 por modelo, com perfil, planta, a relação
numerada dos itens de série e a tabela "Dados de Referência" (boca, calado,
pontal, peso, carga, lotação, potência, espessura de chapa). É o formato mais
completo do catálogo.

**Os hashes já estão na tabela — não abra a página do produto** para descobri-los.
A página só serve como link do rodapé (`levefort.com.br/produto/<id>`) e para
modelo que não esteja listado aqui (aí sim: abra e extraia o `href` do PDF).

**Dados:** `--texto` na própria folha devolve a tabela "Dados de Referência"
inteira. Não precisa olhar imagem.

**Recorte:** folha retrato, desenho no topo. Os valores abaixo já foram medidos —
use direto, sem `--probe`.

| Modelo | LOA × boca | Uso | PDF `…/storage/products/doc/` | `--crop` | id da página |
|---|---|---|---|---|---|
| Marajó 16′ Freestyle | 5,00 × 1,80 | pesca/lazer | `a70713edbafcb31c8b93.pdf` | `0,0,1,0.378` | 3153 |
| Marajó 17′ Machine Freestyle | 5,20 × 1,80 | pesca/lazer | `4ec09a25f976a58681d3.pdf` | `0,0,1,0.395` | 3570 |
| Marajó 17′ Machine Fisharound | 5,40 × 1,80 | pesca | `cd24243bc5a9ef5f3700.pdf` | `0,0,1,0.455` | 1935 |
| Apolus TR CLX | 5,50 × 1,50 | pesca leve | `ccab49242b8a16c81d75.pdf` | `0,0,1,0.370` | 2996 |
| Apolus 600 S Sport Fishing | 6,00 × 1,70 | pesca | `512860f2c582de8e5ef5.pdf` | `0,0,1,0.425` | 2825 |
| **Marajó 19′ Master Bass** | 6,00 × 2,00 | **pesca esportiva** | `33c411fbb1796a1dba0b.pdf` | `0,0,1,0.42` | 3930 |
| **Marajó 19′ Matrix Freestyle** | 6,00 × 2,20 | **lazer** | `bd4bd5f5d5152bcc5297.pdf` | `0,0,1,0.352` | 1553 |
| Marajó 19′ Wide Freestyle | 6,00 × 2,40 | lazer | `a9f146d12fd41603d724.pdf` | `--probe` | 3184 |
| Grand Apolus Extreme | 6,50 × 1,90 | pesca | `b13362419828c104709a.pdf` | `--probe` | 3169 |
| Paraty 260 Fisharound | 8,275 | pesca | `50318392e92deca71c7c.pdf` | `--probe` | 1739 |

Master Bass × Matrix é o **par pesca / lazer no mesmo porte** — use quando o
caso de uso pedir duas versões.

---

## 2. Plate Alloy — Austrália, kit em chapa de alumínio 5083

**O que publica:** folha `GENERAL ARRANGEMENT` por modelo, com perfil cotado,
planta, malha de cotas longitudinais, placa de construtor e — o mais raro —
**deadrise no espelho, pontal, calado e deslocamento seco**. A folha 2 costuma
trazer variantes 3D de convés sobre o mesmo casco; a folha 3, fotos.

**Descoberta:** baixe os três índices e extraia `href="*.pdf"`. A raiz é plana:
`https://www.platealloy.com/<ARQUIVO>`.

- `https://www.platealloy.com/4m-mono.htm` — 10 desenhos
- `https://www.platealloy.com/5m-mono.htm` — 20 desenhos
- `https://www.platealloy.com/6m-mono.htm` — 10 desenhos

**Nunca construa o nome do arquivo.** A nomenclatura é inconsistente:
`460-CCON-WEB.pdf`, `483CCON.pdf`, `52%20ADV.pdf`, `5.3%20XCab.pdf`,
`55XCAB.pdf`. Copie o href literal do índice.

Faixa de 4 m — `425-ADV-WEB` · `455-ADV-WEB` · `460-CCON-WEB` · `460-RUN-WEB` ·
`465-TIL-WEB` · `480-RUN-WEB` · `480-SCON-WEB` · `483CCON` · `485-ADV-WEB` ·
`485-FLY-WEB`

Faixa de 5 m — `52%20ADV` · `53CCON` · `53RUN` · `5.3%20XCab` · `535%20ADV` ·
`54FLY` · `54SKI` · `55CCON` · `55RUN` · `55XCAB` · `56ADV` · `58%20FLY` ·
`58%20RUN` · `58CCON` · `58cuddy` · `58XCab` · `59%20ADV` · `59%20DISPL` ·
`59%20SKI` · `59%20TOU`

Faixa de 6 m — `62CCON` · `62CUDDY` · `62HT` · `62XCAB` · `62%20TUG` · `65CCAB` ·
`68CCON` · `68CUDDY` · `68HT` · `68IC`

Sufixos: `CCON` console central · `SCON` console lateral · `RUN` runabout ·
`TIL` cana de leme · `FLY` fly fisher (plataformas de arremesso) · `ADV`
adventurer (aberto) · `XCab`/`HT`/`CUDDY` cabine · `SKI` esqui · `TUG` rebocador.

Para pares **pesca × lazer no mesmo casco**: `485-FLY-WEB` × `480-RUN-WEB`, ou
`54FLY` × `53RUN`.

**Recorte:** folha paisagem; a **página 0 já é o desenho inteiro**. Use sem
`--crop` e sem `--probe`.

**Dados:** `--texto --page 0` devolve o bloco `PRINCIPAL PARTICULARS` completo
(LOA, boca, pontal, calado, deadrise, deslocamento) em poucas linhas.

**Link do rodapé:** `platealloy.com/<ARQUIVO>.pdf` e o índice da faixa.

---

## 3. Orkney Boats — Reino Unido, **fibra de vidro**

**O que publica:** planta e perfil como PNG limpos, com fundo transparente. É a
única fonte confirmada com casco em **laminação manual sólida em fibra** — a
mais próxima de um projeto brasileiro em fibra.

**Descoberta:** abra `https://www.orkneyboats.com/our-range/<slug>` e pegue os
PNG em `/sites/default/files/AAAA-MM/…`. **Descarte tudo que contiver
`/styles/`, `/logos/` ou `/icons/`** — são fotos e ícones do Drupal. Sobram dois
arquivos por modelo.

> Filtrar por `plan`/`profile` no nome **não basta**: três perfis não têm a
> palavra (`coastliner.png`, `fastliner-2.png`, `ph20.png`). Regra melhor: dos
> dois PNG restantes, o **maior** (0,5–1,7 MB) é a planta e o **menor**
> (68–280 kB) é o perfil.

| Modelo | LOA × boca | Peso | Máx HP | Uso | Planta / perfil |
|---|---|---|---|---|---|
| Coastliner 14 | 4,37 × 1,73 | 200 kg | 20 | lazer | `2024-07/coastliner-nocuddy-plan.png` · `2024-05/coastliner.png` |
| Orkney 452 | 4,52 × 1,83 | 365 kg | 30 | misto | `2024-07/orkney-452-plan.png` · `-profile.png` |
| Longliner 16 | 4,88 × 1,83 | 270 kg | 25 | pesca | `2024-06/longliner2-plan.png` · `longliner2-cuddy-profile.png` |
| **Orkney 522** | 5,20 × 2,00 | 545 kg | 60 | misto | `2024-07/orkney-522-plan.png` · `-profile.png` |
| Orkney 592 | 5,92 × 2,26 | 750 kg | 100 | misto | `2024-07/orkney-592-plan.png` · `-profile.png` |
| Dayangler 19 | 5,95 × 2,26 | — | 100 | **pesca** | `2024-09/dangler-19-plan-84.png` · `da19-profile-9.png` |
| Fastliner 19 | 5,92 × 2,26 | 670 kg | 80 | **lazer** | `2024-06/fastliner-2-plan.png` · `fastliner-2.png` |
| Pilothouse 20 | — | — | — | misto | `2024-06/ph20-plan-2_0.png` · `2024-07/ph20.png` |

Atenção: o par nem sempre é da mesma configuração (Coastliner traz planta
*nocuddy*, Longliner traz perfil *cuddy*). Diga isso no `sub` da prancha.

**Recorte:** `--trim --pad 24`, sem `--crop` e sem `--probe`. Passe as duas URLs
na mesma chamada e o script empilha planta sobre perfil.

**Dados:** os PNG não têm texto. A ficha está no HTML — use **WebFetch na página
do modelo** (`orkneyboats.com/our-range/<slug>`) pedindo a tabela de
especificações. É de lá que saem lotação, carga máxima e categoria CE.

**Link do rodapé:** `orkneyboats.com/our-range/<slug>`.

---

## 4. Stabicraft — Nova Zelândia, alumínio com câmaras seladas

**O que publica:** brochura por modelo com planta e perfil cotados, e uma tabela
que traz **boca externa e boca interna**, deadrise, espessura de casco e de tubo,
peso seco e volume de flutuação selada.

**Descoberta:** abra `https://stabicraft.com/the-boats/<slug>/` e extraia o href
para `/assets/Uploads/Model-Brochures/<ARQUIVO>.pdf`. O nome não segue padrão —
extraia, não construa. **Ignore `Standard-Paint-Graphics-Udek-Booklet.pdf`**, que
aparece em toda página e não tem desenho.

| Modelo | LOA × boca ext. | Brochura | Página do desenho |
|---|---|---|---|
| 1450 Series (Explorer/Frontier) | 4,42 × 1,89 | `1450_SERIES_PLATFORM.pdf` | 3 |
| 1550 Fisher | 4,64 × 2,01 | `Stabicraft-1550-Fisher.pdf` | 1 |

**Recorte:** 1450 Series → `--page 3 --crop 0.02,0.04,0.98,0.80`;
1550 Fisher → `--page 1 --crop 0.02,0.05,0.98,0.86`. Ambos pegam desenho + tabela.

**Dados:** `--texto` na mesma página devolve a tabela SPECIFICATIONS.

**Link do rodapé:** `stabicraft.com/the-boats/<slug>/`.

---

## 5. Pioner — Noruega, polietileno rotomoldado

**O que publica:** catálogo único, com um spread por modelo trazendo vista de
cima, perfil e tabela (peso, comprimento × boca, lotação, máx HP/kW, categoria
CE, velocidade máxima).

`https://leiflarsenmarine.dk/wp-content/uploads/2023/04/EN_Pioner_katalog2022.pdf`

| Página do PDF | Modelo | Comprimento × boca |
|---|---|---|
| 4 | Pioner Multi | — |
| 5 | Pioner 17 Flexi | 5,20 × 2,15 |
| 6 | Pioner 16 Explorer | 5,07 × 2,10 |
| 7 | Pioner 15 Allround | 4,70 × 1,80 |
| 8 | Pioner 14 Active | 4,11 × 1,73 |

**Recorte:** cada página é um spread duplo; o bloco fica numa metade só. Medidos:
p. 7 (15 Allround) `--crop 0.505,0.55,0.995,0.99`; p. 6 (16 Explorer)
`--crop 0.012,0.585,0.445,0.985`; p. 5 (17 Flexi) `--crop 0.505,0.55,0.995,0.99`.

**Dados:** `--texto --page N` devolve a tabela (peso, comprimento × boca,
lotação, HP/kW, CE, velocidade).

**Link do rodapé:** `pionerboat.com/models/` mais a URL do catálogo.

Risco: o catálogo está hospedado num revendedor dinamarquês, não no domínio
oficial. **Guarde uma cópia local** ao usar.

---

## 6. Estados Unidos — Lund, Crestliner, Alumacraft

**O que publicam:** catálogo anual com **vista de cima renderizada** de cada
versão e a tabela ao lado. Crestliner e Alumacraft publicam deadrise e espessura
de chapa; Lund publica capacidade em vez de peso do casco.

| Marca | Catálogo |
|---|---|
| Lund | `https://www.lundboats.com/content/dam/lund/technical/documents/24_ABG_LN_MY25Catalog_v6digital.pdf` |
| Crestliner | `https://www.crestliner.com/content/dam/crestliner/promotions/catalogs/Crestliner-2025-Brochure-v8-r.pdf` |
| Alumacraft | `https://library.rvusa.com/brochure/2025-Alumacraft.pdf` |

Páginas úteis na faixa de 4,5 a 5,5 m (edição 2025 — confira, muda todo ano):

- Lund p. 27 Adventure 1675 (lazer) · p. 29 Rebel XL 1650 (pesca) · p. 31 Fury
  1600/1400 · p. 33 Alaskan 1675
- Crestliner p. 9 Hawk 1650 · p. 11 Kodiak 1650 (3 versões) · p. 25 Ridge 1700
  (pesca, deadrise 3,5°)
- Alumacraft p. 46 Voyageur 175 (3 versões) · p. 55 matriz completa da linha

São catálogos anuais: o nome do arquivo muda a cada ciclo. Se der 404, procure
"<marca> catalog <ano> pdf".

**Recorte:** o bloco de vistas + tabela ocupa uma faixa da página; a folha inteira
tem foto e marketing. Medidos na edição 2025: Lund p. 27 `0.03,0.505,0.99,0.945`,
p. 29 `0.03,0.015,0.99,0.445`, p. 31 `0.03,0.02,0.99,0.36`;
Crestliner p. 11 `0.015,0.03,0.99,0.90`, p. 9 `0.015,0.04,0.99,0.95`,
p. 25 `0.02,0.665,0.99,0.95`; Alumacraft p. 46 `0.13,0.29,0.64,0.85`.
Mudou de edição, use `--probe`.

**Dados:** `--texto --page N` devolve a tabela de specs.

**Link do rodapé:** a URL do catálogo mais o número da página.

---

## 7. FAO — domínio público, em português

`https://openknowledge.fao.org/server/api/core/bitstreams/cb7a4bdd-cfa1-4da8-a945-607e839dba8b/content`

Documento Técnico sobre as Pescas 134 Rev. 2 (Gulbrandsen, 2008): perfil e planta
de quatro barcos de pesca de 5,2 · 6,3 · 7,4 · 8,5 m, com escala gráfica, malha
de cavernas e lista de materiais. Página 3 do PDF = quadro comparativo dos
quatro; página 4 = barco de 5,2 m cotado.

O conteúdo da página 4 está **girado 90°** na folha: renderize e gire 90° no
sentido horário antes de usar (o `coletar.py` não gira; faça com Pillow).

Ressalva obrigatória: são cascos de deslocamento para 4–6 HP. Servem de
referência de arranjo e estrutura, **nunca de desempenho**.

---

## 8. Quem NÃO publica planta — não perca tempo

Verificado no site do fabricante, em revendas, em bancos de ficha técnica e em
testes de revista:

| Fabricante | O que existe |
|---|---|
| Carolina Skiff (EUA) | só vista lateral em recorte |
| Estaleiro Panga (BR) | só fotos |
| Fibrafort (BR) | nada; modelos antigos saem do site |
| Art Sol Náutica (BR) | só fotos em três-quartos |
| Mako (EUA) | render oficial **de cima** na galeria, sem cota; o servidor bloqueia download direto |
| Bar Crusher, Quintrex, Sea Jay (AU) | tabela de specs, sem desenho |
| Terhi, Linder, Buster, Silver (EU) | fotos e specs |
| Tracker, G3, Boston Whaler (EUA) | fotos e specs |
| SeaDek, DeckPad, Castaway Customs | não publicam gabarito de convés destes modelos |

Se um similar do estudo está nesta lista, registre "não publica planta", mostre o
que existe na seção separada, e complete a cota de 10 com barcos do catálogo.

---

## Como escolher quando sobra opção

Ordem de preferência, do mais para o menos importante:

1. **Mesmo material** do projeto (fibra → Orkney; alumínio → Levefort/Plate Alloy)
2. **Mesma faixa de comprimento** (±15 % do LOA alvo)
3. **Mesmo uso** (pesca esportiva, lazer, misto)
4. **Mesma propulsão** (popa, faixa de HP parecida)
5. **Publica deadrise e boca interna** — Plate Alloy e Stabicraft são os únicos
   que dão isso de graça, e é o dado que falta em toda amostra brasileira
