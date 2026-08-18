---
name: brana-plano-linhas-interativo
description: Transforma um croqui de casco desenhado à mão em papel quadriculado num plano de linhas interativo em HTML, na identidade visual da Brana. O croqui precisa ter as três vistas — superior (TOP), lateral (SIDE) e seção mestra (MIDSHIP). Corrige a perspectiva da fotografia por homografia, digitaliza as cotas, alisa as curvas com splines que não podem inflexionar, e entrega um arquivo único que roda no navegador e no celular. Suporta casco quinado (com chine) e casco de bojo redondo. Use quando alguém enviar um desenho, croqui ou foto de um casco em papel quadriculado e pedir para transformar em CAD, plano de linhas, tabela de cotas, ou um modelo editável de casco.
license: Proprietário — Brana Projetos Navais
compatibility: Requer Node.js e Python 3 para os scripts de verificação e montagem. Sem acesso à rede.
metadata:
  category: brana
  author: Brana Projetos Navais
  version: "1.0"
---

# Plano de linhas interativo a partir de um croqui

Entrada: a **fotografia de um croqui em papel quadriculado**, com as três vistas
rotuladas — superior (TOP), lateral (SIDE) e seção mestra (MIDSHIP) — e as balizas
numeradas ao longo do comprimento.

Saída: **um arquivo HTML único**, autocontido, que abre no navegador e no celular, com
as três vistas editáveis por punhos, tabela de cotas ao vivo, cursores de estiramento e
o registro completo de como o desenho foi lido.

## Antes de começar, pergunte duas coisas

Não avance sem as duas respostas. Nenhuma delas dá para adivinhar do desenho.

1. **O nome de quem está usando a skill.** Vai no nome do arquivo de saída.
2. **O comprimento total (LOA) em metros.** O croqui dá só proporções — a escala
   absoluta tem de ser informada. Se a pessoa não souber, pergunte de novo em vez de
   arbitrar: todas as cotas em milímetros dependem disso.

Pergunte as duas de uma vez, numa única mensagem, e só então comece a ler o desenho.

## Nome do arquivo

| Tipo de casco | Arquivo de saída |
|---|---|
| Quinado (com chine) | `Plano-de-Linhas-<Nome>.html` |
| Redondo (bojo redondo) | `Casco-Redondo-<Nome>.html` |

`<Nome>` é o primeiro nome de quem pediu, capitalizado, sem acentos e sem espaços
(use hífen se forem dois nomes). Exemplos reais:

```
boat-hand-drawing-example-chine-midship.jpeg  ->  Plano-de-Linhas-Brana.html
boat-hand-drawing-example-round-midship.jpg   ->  Casco-Redondo-Brana.html
```

## Que tipo de casco é

Olhe **a seção mestra**, que é onde a diferença aparece:

- **Quinado** — a seção tem um vértice: fundo reto do centro até a quina, depois
  costado reto até o convés. A vista lateral costuma mostrar **três** linhas (borda,
  chine, quilha).
- **Redondo** — a seção é uma curva contínua, em U ou semi-elipse, sem vértice. A vista
  lateral mostra **duas** linhas (borda e quilha).

Se ficar em dúvida, diga o que você vê e pergunte. Os dois modelos são diferentes por
dentro e trocar depois custa caro.

## Roteiro

### 1 · Calibrar a fotografia

Leia [references/01-calibracao.md](references/01-calibracao.md). Em resumo: as balizas
numeradas e a linha das marcas formam um retângulo de proporções conhecidas no papel;
quatro cantos dele fixam uma homografia que desfaz a perspectiva.

Rode `scripts/homografia.py` para resolver H, inverter os pontos lidos e conferir se as
balizas voltam às posições nominais. **Esse é o teste que diz se a calibração presta** —
erro acima de 0,05 quadrado significa que alguma leitura está errada.

### 2 · Digitalizar as cotas

Leia [references/02-digitalizacao.md](references/02-digitalizacao.md). Leia os contornos
baliza por baliza, devolva cada ponto pela inversa de H, e **confira que a sequência de
declividades é monótona** antes de ajustar qualquer spline. Se os dados já inflexionam,
o problema é a leitura, não o croqui.

### 3 · Montar o modelo

- Quinado: [references/03-modelo-quinado.md](references/03-modelo-quinado.md)
- Redondo: [references/04-modelo-redondo.md](references/04-modelo-redondo.md)

Copie o modelo correspondente de `assets/` e substitua **só** o bloco marcado
`BLOCO DO PROJETO`. Todo o resto — motor de geometria, restrição de alisamento,
arrasto, cursores, layout, identidade — já está pronto e verificado; não reescreva.

A geometria de vista (escala, altura dos painéis, limites dos nós) é **calculada do
modelo** pela função `layout()`. Não acerte essas constantes na mão.

### 4 · Montar o arquivo

```bash
python scripts/montar.py <modelo-preenchido.html> <Saida.html>
```

Injeta o logotipo da Brana, embrulha num documento completo com `viewport` e
`color-scheme`, e confere que não sobrou nenhuma referência externa.

### 5 · Verificar — não pule

```bash
node scripts/verificar.js <Saida.html>
```

Checa o que realmente importa: o modelo é válido, nenhuma curva inflexiona, as curvas
passam pelos pontos medidos, a ordenação entre curvas se mantém, os arrastos são
segurados na fronteira certa, e o desenho não transborda a moldura em nenhum estiramento.

Se puder, abra o arquivo e confira também com os olhos. Nesta skill, **todo defeito real
apareceu ao testar, não ao ler o código**.

### 6 · Entregar

Entregue o arquivo e relate, em poucas linhas:

- o resíduo da calibração (erro das balizas em quadrados e em mm);
- a verificação independente: a meia-boca da seção mestra desenhada contra a meia-boca
  máxima da planta — as duas vêm de partes diferentes do croqui e devem bater;
- **toda discordância entre vistas** e qual delas você adotou. Croqui à mão sempre tem
  alguma; esconder é pior que relatar.

## O que não negociar

- **Alisamento.** Toda curva mantém um único sentido de curvatura. O motor recusa
  arrastos que criariam inflexão, deslizando até a fronteira em vez de travar seco.
  Não afrouxe a tolerância para fazer um arrasto passar.
- **Escala informada.** Sem o LOA não há cota em milímetros. Não invente.
- **Perspectiva.** Decalcar contando pixels erra de 5 a 7 % numa foto de caderno.
  A homografia é o que torna a leitura defensável.
- **Identidade Brana.** Fundo grafite, vermelho #9A3231, Calibri, logotipo sobre ficha
  clara. Ver [references/05-identidade-brana.md](references/05-identidade-brana.md).
