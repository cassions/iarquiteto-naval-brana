---
name: brana-rascunho-2d-interativo
description: Transforma um croqui de casco desenhado à mão em papel quadriculado num plano de linhas interativo em HTML, na identidade visual da Brana. O croqui precisa ter as três vistas — superior (TOP), lateral (SIDE) e seção mestra (MIDSHIP). Corrige a perspectiva da fotografia por homografia, digitaliza as cotas, alisa as curvas com splines que não podem inflexionar, e entrega um arquivo único que roda no navegador e no celular. Suporta casco quinado (com chine), casco de bojo redondo, e casco de quilha cheia (full keel), este com baliza em wineglass e madeiramento morto. Use quando alguém enviar um desenho, croqui ou foto de um casco em papel quadriculado e pedir para transformar em CAD, plano de linhas, tabela de cotas, ou um modelo editável de casco.
license: Proprietário — Brana Projetos Navais
compatibility: Requer Node.js e Python 3 para os scripts. Sem acesso à rede.
metadata:
  category: brana
  author: Brana Projetos Navais
  version: "3.0"
---

# Plano de linhas interativo a partir de um croqui

Entrada: a **fotografia de um croqui em papel quadriculado**, com as três vistas
rotuladas — superior (TOP), lateral (SIDE) e seção mestra (MIDSHIP) — e as balizas
numeradas ao longo do comprimento.

Saída: **um arquivo HTML único**, autocontido, que abre no navegador e no celular.

## Regra de ouro: você escreve ~300 tokens, não 23 mil

Os modelos em `assets/` têm 23 mil tokens cada. Eles **não devem ser lidos nem
reescritos** — `scripts/montar.py` injeta neles um `projeto.json` de umas 40 linhas. Isso
é a diferença entre gastar ~25 mil tokens numa corrida e gastar ~140 mil.

**Nunca faça, em nenhuma hipótese:**

- ler `assets/modelo-*.html` (23 mil tokens de entrada);
- copiar o modelo e editar (23 mil de entrada + 23 mil de saída, que custam ~5×);
- usar `Read` na imagem do croqui — ela já está no contexto, reler é pagar de novo;
- tirar capturas de tela do resultado; `scripts/verificar.js` cobre o que importa e
  devolve texto;
- ler mais de uma referência de modelo — leia só a do casco que você identificou.

Se algo no modelo precisar mudar de verdade (e quase nunca precisa), use `grep -n` para
achar a linha e `sed`/`python` para trocar só ela. Nunca despeje o arquivo no contexto.

## Antes de começar, pergunte duas coisas

Numa única mensagem, e não avance sem as duas respostas:

1. **O nome de quem está usando a skill.** Vai no nome do arquivo de saída.
2. **O comprimento total (LOA) em metros.** O croqui dá só proporções — a escala
   absoluta tem de ser informada. Se a pessoa não souber, pergunte de novo em vez de
   arbitrar.

Aproveite e diga que uma foto de ~1500 px de largura já basta: fotos de 4000 px custam
quatro vezes mais tokens e não melhoram a leitura.

## Nome do arquivo

O nome carrega **sempre** o tipo de casco e o nome da pessoa:

| Tipo de casco | Arquivo de saída |
|---|---|
| Quinado (com chine) | `Plano-de-Linhas-Quinado-<Nome>.html` |
| Redondo (bojo redondo) | `Plano-de-Linhas-Redondo-<Nome>.html` |
| Quilha cheia (full keel) | `Plano-de-Linhas-Quilha-Cheia-<Nome>.html` |

```
boat-hand-drawing-example-chine-midship.jpeg      ->  Plano-de-Linhas-Quinado-Brana.html
boat-hand-drawing-example-round-midship.jpg       ->  Plano-de-Linhas-Redondo-Brana.html
boat-hand-drawing-example-full-keel-midship.jpg   ->  Plano-de-Linhas-Quilha-Cheia-Luiz.html
```

`montar.py` monta esse nome sozinho quando você omite o segundo argumento. Use isso em
vez de digitá-lo.

## Que tipo de casco é

Olhe **a seção mestra**. Os três se separam por duas perguntas.

**Tem vértice?**

- **Sim → quinado.** Fundo reto do centro até a quina, depois costado reto até o convés.
  A vista lateral costuma mostrar **três** linhas.

**Não tem vértice. Então: a curva inverte perto da quilha?**

- **Não → redondo.** A meia-baliza é côncava do fundo ao convés: a meia-boca cresce cada
  vez mais devagar à medida que sobe. Fundo arredondado, tangente horizontal na linha de
  centro. A lateral mostra **duas** linhas.
- **Sim → quilha cheia.** A meia-baliza sobe estreita e quase vertical junto à quilha —
  a lâmina do madeiramento morto —, abre numa **garganta**, e daí vira taça até o convés.
  É a seção em *wineglass*. Na lateral a quilha corre o comprimento inteiro, com pé de
  roda profundo à proa e, em geral, espelho lançado.

O olho erra nessa segunda pergunta. **Confirme com número**, no passo 3 do roteiro: o
ajuste das duas famílias de forma decide por você.

Em dúvida, diga o que vê e pergunte. Trocar depois custa caro.

## Roteiro

### 1 · Ler a imagem UMA vez

Numa única passada, anote em pixels **tudo** que você vai precisar. Voltar na imagem
depois é o erro mais caro desta skill.

- os quatro pontos de calibração (ver [01-calibracao.md](references/01-calibracao.md));
- os `u` das marcas de baliza;
- na vista superior: bordas superior e inferior do contorno em cada baliza;
- na lateral: cada linha em 4 a 6 estações, incluindo espelho, ponto mais fundo da
  quilha e a roda;
- na seção mestra: cantos do convés e mais 5 a 7 pontos do contorno. Se a seção parecer
  wineglass, **adense na garganta** — ver
  [02-digitalizacao.md](references/02-digitalizacao.md).

### 2 · Calibrar

```bash
python scripts/homografia.py --loa-sq 16 --h-marcas 14.55 \
    --p1 100,1160 --p2 1268,1149 --p3 1268,82 --p4 100,90 \
    --balizas 100,393,686,977,1268 \
    --pontos 100,88 250,118 393,140 ...
```

Ele resolve H, devolve todos os pontos ao papel de uma vez, e **reprova a calibração**
se as balizas não caírem nas posições nominais (limite 0,05 quadrado). Passe todos os
pontos numa chamada só.

### 3 · Decidir o tipo de casco, com número

Para casco sem quina, passe a seção mestra pelo mesmo script:

```bash
python scripts/homografia.py ... --secao u,v u,v ...
```

Ele ajusta **as duas** famílias de forma — a super-elipse do bojo redondo e a de dois
expoentes da quilha cheia — e recomenda uma, por critério explícito: quanto o segundo
ajuste reduz o resíduo, e onde cai a garganta. Siga a recomendação. Quando ela for
quilha cheia, o script também imprime como obter `alefriz.z0`.

### 4 · Ajustar as curvas

```bash
python scripts/ajustar.py --loa-sq 16 \
    --curva planSheer 0,1.633 1.865,2.290 4.166,3.000 6.788,3.343 ... \
    --curva profSheer 0,4.821 3.995,4.672 7.984,4.563 11.995,4.836 16,5.571 \
    --curva profKeel  0,0.032 2.581,0 6.422,0.071 ... 16,5.571
```

Ele resolve as declividades dos nós impondo a mesma convexidade que o motor verifica, e
imprime o bloco `"curvas"` pronto. Não faça essa álgebra à mão — era o segundo maior
gasto de tokens.

Se ele reclamar que as cordas não são monótonas, **o erro é da sua leitura**, não do
croqui: refaça o ponto que quebra a sequência.

Se ele reclamar que as declividades saíram não monótonas com as cordas boas, o problema
é ruído de leitura amplificado pela cadeia. Mova um nó dentro da margem de leitura da
foto, ou tire um nó, até fechar — e diga no relatório quanto você mexeu.

### 5 · Escrever o projeto.json

Umas 40 linhas. Esquema em [06-projeto-json.md](references/06-projeto-json.md), e o
modelo do casco em **uma** destas — leia só a que corresponde ao tipo que você
identificou:

| Casco | Referência |
|---|---|
| Quinado | [03-modelo-quinado.md](references/03-modelo-quinado.md) |
| Redondo | [04-modelo-redondo.md](references/04-modelo-redondo.md) |
| Quilha cheia | [07-modelo-quilha-cheia.md](references/07-modelo-quilha-cheia.md) |

### 6 · Montar e verificar

```bash
python scripts/montar.py projeto.json
node   scripts/verificar.js Plano-de-Linhas-Quilha-Cheia-Fulano.html
```

`verificar.js` reconhece sozinho o tipo de casco e roda ~31 checagens comuns — validade,
ausência de inflexão nas curvas longitudinais em todos os estados alcançáveis, aderência
aos pontos medidos, ordenação entre curvas, nós dentro da folha, marcação SVG e
transbordo nos extremos do estiramento — mais ~13 específicas quando o casco é de quilha
cheia, sobre a garganta, o alefriz e a curva de cheia.

**Não pule.** Nesta skill todo defeito real apareceu ao testar, nenhum ao ler o código.

### 7 · Entregar

Entregue o arquivo e relate em poucas linhas: o resíduo da calibração, a verificação
independente (meia-boca da seção mestra contra a meia-boca máxima da planta) e **toda
discordância entre vistas**, dizendo qual você adotou.

Num casco de quilha cheia, diga também o que ali é **reconstrução e não medida**: o
croqui traz uma seção só, e a inclinação do alefriz e o levantamento do tuck são valores
de projeto, não medidos.

## O que não negociar

- **Alisamento das curvas longitudinais.** Toda curva de planta e de perfil mantém um
  único sentido de curvatura. Não afrouxe a tolerância para fazer um arrasto passar.
- **A baliza transversal é outra coisa.** Num casco de quilha cheia ela inflexiona por
  definição, na garganta, e deve. Não confunda as duas regras.
- **Escala informada.** Sem o LOA não há cota em milímetros.
- **Perspectiva.** Decalcar contando pixels erra de 5 a 7 % numa foto de caderno.
- **Identidade Brana.** Ver [05-identidade-brana.md](references/05-identidade-brana.md).
