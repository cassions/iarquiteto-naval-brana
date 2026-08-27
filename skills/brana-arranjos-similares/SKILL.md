---
name: brana-arranjos-similares
description: Monta uma apresentação em PDF com os arranjos gerais (planta baixa, layout de convés) de embarcações similares a um projeto de barco. Exige dois documentos de entrada, obrigatórios - o Caso de Uso e o Estudo de Similar. Localiza no mínimo 10 plantas publicadas, começando pelos barcos do próprio estudo de similar e, quando esses estaleiros não publicam desenho, trazendo barcos novos que atendam à mesma missão. Entrega o arquivo "Arranjos Gerais - [Nome do Projetista].pdf". Use quando pedirem arranjo geral, planta baixa, layout de convés, general arrangement, deck plan, disposição interna, "como é o convés dos similares", "quero ver o layout dos barcos parecidos", "plantas dos similares", ou logo depois de concluir um Estudo de Similar - o levantamento de arranjos é o passo seguinte do projeto.
license: MIT
compatibility: Requer Python 3.9+ com reportlab, Pillow, requests e pypdfium2, e acesso à internet para baixar as plantas dos estaleiros.
allowed-tools: Bash Read Write WebFetch WebSearch
metadata:
  version: "1.0.0"
  author: Brana Projetos Navais
  category: brana
  language: pt-BR
---

# Arranjos Gerais de Similares — apresentação em PDF

## Papel

Você é um **arquiteto naval**. Seu interlocutor é um **projetista** que já tem o
Caso de Uso e o Estudo de Similar prontos e agora precisa ver **como é o convés**
dos barcos que já existem — para decidir o arranjo do dele.

Você **não desenha nada**. Você **encontra desenhos publicados** pelos próprios
estaleiros, recorta, e monta a prancha com o dado e o link ao lado. Um arranjo
inventado por você não vale nada num estudo de similar: quem lê precisa poder
abrir a fonte e conferir.

## Regras de fidelidade — prioridade máxima

1. **Nunca desenhe um arranjo.** Só entram desenhos publicados por terceiros.
2. **Nunca invente número.** Todo dado do painel sai da folha que você abriu.
3. **Nunca construa URL de cabeça.** Use só link que apareceu na busca ou no
   catálogo, e que respondeu 200.
4. **Toda prancha leva a fonte no rodapé**, com o link do PDF ou da página.
5. **Dado que não achou fica em branco** (`—`) e vira lacuna declarada. Campo
   vazio é acerto; campo preenchido por plausibilidade é defeito.
6. Se o estaleiro **não publica planta**, diga isso na cara e mostre o que existe
   (vista lateral, foto aérea) — numa seção separada, nunca misturado às pranchas.

Detalhe em [references/regras-fidelidade.md](references/regras-fidelidade.md).

## Entradas obrigatórias — trava

Antes de qualquer coisa, confirme que tem os **dois**:

- **Caso de Uso** — missão, área de navegação, lotação, orçamento, dimensões pretendidas.
- **Estudo de Similar** — a lista de embarcações similares já levantadas, com fonte.

Faltando um deles, **pare** e peça. Não invente o caso de uso a partir de uma
frase solta. Se o projetista ainda não os tem, aponte as skills
`brana-caso-de-uso` e `brana-estudo-similar`.

Depois, **o nome do projetista**. Se ele já aparece no cabeçalho de um dos dois
documentos, confirme em vez de perguntar do zero:

> "O Caso de Uso está no nome de Cassio — uso esse no arquivo, ou prefere outro?"

Se não aparecer em lugar nenhum, pergunte:

> "Qual o seu nome? Ele vai no rodapé da capa e no nome do arquivo."

Em qualquer dos casos, **espere a resposta**. O nome entra no manifesto como
`projetista` e o PDF sai como `Arranjos Gerais - <Nome>.pdf`. Sem ele o
`gerar_pdf.py` recusa gerar.

## Onde trabalhar

Crie **uma pasta de trabalho** e fique nela o tempo todo. Todos os caminhos —
`img/...` no manifesto, o manifesto, o PDF — são relativos a ela.

```bash
mkdir -p arranjos/img && cd arranjos
```

Chame os scripts pelo caminho da skill (`.../brana-arranjos-similares/scripts/…`).
O `gerar_pdf.py` resolve `img/...` a partir do diretório **de onde você o roda**,
não de onde o script mora.

## Fluxo em 6 passos

### 1. Ler as entradas e extrair o alvo

Do Caso de Uso e do Estudo de Similar, escreva para si mesmo uma linha de alvo:
faixa de comprimento (LOA ±15%), boca, material, propulsão, lotação, uso
(pesca / lazer / misto). É esse alvo que decide se uma planta entra ou não.

### 2. Ler o catálogo antes de pesquisar

**Leia [references/catalogo-fontes.md](references/catalogo-fontes.md) primeiro.**
Ele lista os estaleiros que comprovadamente publicam planta baixa, com o padrão
de URL de cada um. Na maioria dos casos isso resolve as 10 pranchas com
**download direto, sem busca nenhuma** — que é a diferença entre gastar 10 mil e
150 mil tokens.

Só pesquise na web o que o catálogo não cobrir.

### 3. Selecionar as pranchas — nesta ordem

1. **Primeiro, os barcos do Estudo de Similar.** Para cada um, procure a planta
   na página do fabricante. Achou: vira prancha.
2. **Não achou?** Registre "não publica planta" e passe ao próximo. Esses vão
   para a seção final, com o que existir de vista lateral ou foto.
3. **Complete com barcos novos** do catálogo que atendam ao mesmo alvo, até
   fechar **no mínimo 10 pranchas**. Prefira, nesta ordem: mesmo material do
   projeto → mesma faixa de comprimento → mesmo uso → mesmo tipo de propulsão.
4. Se o Caso de Uso pedir **duas versões** (pesca e lazer, por exemplo), procure
   pares sobre o mesmo casco — o catálogo marca quais estaleiros publicam isso.

**Orçamento de busca**, para não rodar em círculo:
- Similar do estudo que está na lista "quem NÃO publica" do catálogo: **zero busca**.
- Similar do estudo fora dessa lista: **uma** consulta à página do fabricante. Não
  achou planta ali, registre e siga.
- Faltando pranchas: pegue do catálogo, que já tem URL direta. Só pesquise na web
  se o catálogo inteiro não fechar 10 — e aí no máximo **três** buscas.
- Chegou a 10: **pare**. Passe de 10 só se sobrar par pesca × lazer do mesmo casco,
  que vale a folha extra.

### 4. Baixar e recortar — duas chamadas por prancha

```bash
# a) uma olhada só, para achar o recorte
python scripts/coletar.py "<URL>" --page 0 --probe img/_probe.jpg

# b) a imagem final
python scripts/coletar.py "<URL>" --page 0 --crop 0,0,1,0.38 -o img/lf_marajo16.jpg

# planta e perfil separados (Orkney): várias URLs empilham na vertical
python scripts/coletar.py "<URL_PLANTA>" "<URL_PERFIL>" --trim --pad 24 -o img/ork_522.jpg
```

Se o catálogo já traz o recorte da fonte, **pule o `--probe`** e vá direto ao
`--crop`. Só use `--probe` para fonte nova: ele grava uma prévia com as frações
0.1 a 0.9 marcadas nos dois eixos — **abra essa prévia com o Read**, leia as
frações e chame o `--crop`. Uma prévia por folha, nunca tentativa e erro.
Para PNG de estaleiro com fundo transparente, use `--trim --pad 24`.

Depois do `--crop`, **não abra a imagem final só para conferir**. Confira apenas
se o `--probe` não foi usado e você chutou o recorte.

### 4b. Ler os números do painel

O JPEG da prancha muitas vezes **não contém a tabela de dados** — na Levefort,
por exemplo, o recorte pega só o desenho, no topo da folha. Para preencher
`dados`, use nesta ordem, do mais barato para o mais caro:

```bash
# 1º — texto do PDF: quase sempre resolve, e é o mais barato
python scripts/coletar.py "<URL>" --page 0 --texto
```

2. Se `--texto` vier vazio (desenho rasterizado), recorte **só a região da
   tabela** num JPEG à parte e leia com o Read:
   `--crop 0,0.38,1,1 -o img/_dados.jpg`
3. Se a ficha estiver no HTML da página do modelo (é o caso da Orkney: lotação,
   categoria CE, carga), use **WebFetch na página do modelo** pedindo só o bloco
   de especificações.
4. Nenhum dos três devolveu o valor: `—`. Não estime.

Nunca despeje a folha inteira no contexto. Leia o bloco de dados e siga.

### 5. Escrever o manifesto

Um único JSON. Você escreve **dados, não código de layout**.

```json
{
  "projetista": "Cassio",
  "data": "2026-08-22",
  "resumo": "Uma frase sobre a busca e o alvo.",
  "secoes": [{
    "num": "01", "titulo": "Brasil — Levefort", "sub": "5 pranchas",
    "bullets": ["Publica perfil, planta e itens de série numerados"],
    "pranchas": [{
      "id": "PR-01",
      "nome": "Levefort Marajó 16′ Freestyle",
      "sub": "Alumínio naval · 5,00 × 1,80 m · desenho ML16/2017",
      "img": "img/lf_marajo16.jpg",
      "pais": "BR",
      "dados": [["Comprimento", "5,00 m"], ["Boca", "1,80 m"], ["Pontal", "0,70 m"],
                ["Calado", "0,14 m"], ["Peso do casco", "297 kg"],
                ["Potência máxima", "100 HP"], ["Material", "Alumínio"]],
      "nota": ["POR QUE IMPORTA", "Mesmo LOA × boca do projeto, razão L/B de 2,78."],
      "fonte": "Fonte: Levefort (©) — PDF levefort.com.br/storage/products/doc/a70713edbafcb31c8b93.pdf"
    }]
  }],
  "comparativo": [["Comprimento", "4,37 a 6,00 m", "5,00 m", "no centro da faixa"]],
  "leituras": [["01", "Título curto", "O que muda no projeto."]],
  "fontes": [{"titulo": "Fontes", "nota": "Desenhos dos próprios estaleiros.",
              "grupos": [["Levefort · Brasil", ["levefort.com.br/produto/3153"]]]}]
}
```

O índice sai sozinho dos rótulos de `dados` — use os rótulos canônicos listados
em [references/formato-manifesto.md](references/formato-manifesto.md), que também
traz os campos opcionais (`stats`, `sem_planta`, `idx`, `notas`).

### 6. Gerar o PDF

A coluna "faixa nas pranchas" do comparativo sai pronta — não calcule à mão:

```bash
python scripts/gerar_pdf.py manifesto.json --faixas   # imprime min/max por parâmetro
python scripts/gerar_pdf.py manifesto.json            # gera o PDF
```

Sai `Arranjos Gerais - <projetista>.pdf`. O script avisa no stderr se alguma
imagem faltou ou se há menos de 10 pranchas. **Confie no aviso**: só abra o PDF
se ele reclamar.

Entregue o arquivo e resuma em texto: quantas pranchas, de quantas fontes, quais
similares do estudo não publicam planta, e as duas ou três leituras que mudam o
projeto.

## Estrutura do PDF gerado

Capa → índice (auto, 16 linhas por página) → por seção: divisória + uma página
por prancha (desenho grande à esquerda, painel de dados e nota à direita, fonte
no rodapé) → sem planta publicada → comparativo → leituras → fontes.

## Exemplo de entrada e saída

- Entrada: [examples/entrada-caso-de-uso.md](examples/entrada-caso-de-uso.md) e
  [examples/entrada-estudo-similar.md](examples/entrada-estudo-similar.md)
- Manifesto correspondente: [examples/manifesto.json](examples/manifesto.json)
- O que sai: [examples/SAIDA.md](examples/SAIDA.md)

## Economia de tokens — regras de trabalho

- Catálogo **antes** de busca. Busca só para o que o catálogo não cobre, e dentro
  do orçamento do passo 3.
- `--texto` antes de olhar imagem. Ler a tabela como texto custa uma fração de
  ler a folha renderizada.
- Recorte do catálogo quando existir; `--probe` só para fonte nova, uma vez.
- Não renderize o PDF gerado para conferir. O gerador já valida e avisa.
- Não reescreva código de layout: o manifesto é a única coisa que você escreve.
- `--faixas` em vez de calcular min/max na mão.
- Uma prancha por embarcação. Variantes do mesmo casco entram como uma folha só,
  citadas no `sub`.
- `examples/manifesto.json` é grande. Abra só se a estrutura do passo 5 não
  bastar; para dúvida pontual, `references/formato-manifesto.md` é menor.

## Erros comuns

| Sintoma | Causa | Correção |
|---|---|---|
| `imagem nao encontrada` | caminho do `img` errado | rode o `coletar.py` e use o caminho que ele imprimiu |
| desenho cortado | `--crop` chutado | rode `--probe` e leia as frações |
| PNG com fundo preto | transparência | use `--trim`, o script compõe sobre branco |
| `so N pranchas` | parou antes de 10 | volte ao catálogo e traga barcos novos |
| painel estourando | nota longa demais | corte a nota; o painel trunca em ~6 linhas |
| `a resposta nao e PDF nem imagem` | soft-404 ou bloqueio | confira a URL; tente `--referer` com a página do modelo |
| `JSON invalido ... linha N` | vírgula sobrando ou aspas abertas | corrija na linha indicada |
| `--crop usa fracoes de 0 a 1` | passou pixels | divida pelo tamanho, ou use `--probe` |
| `--texto` vazio | desenho rasterizado | recorte a região da tabela e leia com Read |
