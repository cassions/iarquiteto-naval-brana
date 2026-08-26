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

Da foto de um croqui quadriculado, com TOP, SIDE e MIDSHIP rotuladas e as balizas
numeradas, sai **um HTML único** que abre no navegador e no celular.

## Regra de ouro: você escreve ~300 tokens, não 23 mil

Os modelos em `assets/` têm 23 mil tokens cada; `montar.py` injeta neles um `projeto.json`
de 40 linhas. São ~25 mil tokens por corrida, não ~140 mil. **Nunca:**

- ler `assets/modelo-*.html` nem copiá-lo para editar (a saída custa ~5×); precisando
  mexer, ache a linha com `grep -n` e troque só ela;
- usar `Read` na imagem do croqui — ela já está no contexto;
- tirar captura de tela: `verificar.js` devolve o que importa em texto;
- ler mais de uma referência de modelo;
- redigitar número que um script já gravou no `projeto.json` (passos 3 e 4).

## Antes de começar, pergunte duas coisas

Numa mensagem só, e não avance sem as duas respostas:

1. **O nome de quem está usando a skill** — vai no arquivo de saída.
2. **O LOA em metros.** O croqui dá só proporções; se a pessoa não souber, pergunte de
   novo em vez de arbitrar.

Peça foto de ~1500 px: a imagem é reduzida antes de ser lida, então pixel a mais não vira leitura melhor — e em modelo de resolução alta chega a triplicar o custo.

## Que tipo de casco é

Olhe **a seção mestra**; duas perguntas separam os três.

**Tem vértice?** Sim → **quinado**: fundo reto até a quina, costado reto até o convés; a
lateral costuma mostrar três linhas.

**Não tem. A curva inverte perto da quilha?**

- **Não → redondo.** Côncava do fundo ao convés, tangente horizontal na linha de centro:
  a meia-boca cresce cada vez mais devagar ao subir. Lateral com duas linhas.
- **Sim → quilha cheia.** Sobe estreita e quase vertical junto à quilha — a lâmina do
  madeiramento morto —, abre numa **garganta** e vira taça: a seção em *wineglass*, com a
  quilha correndo o casco inteiro na lateral.

O olho erra na segunda: **confirme com número** no passo 3.

O arquivo carrega sempre o tipo de casco e o nome da pessoa; `montar.py` o monta se você
omitir o segundo argumento:

| Casco | Arquivo de saída | Modelo |
|---|---|---|
| Quinado | `Plano-de-Linhas-Quinado-<Nome>.html` | [03](references/03-modelo-quinado.md) |
| Redondo | `Plano-de-Linhas-Redondo-<Nome>.html` | [04](references/04-modelo-redondo.md) |
| Quilha cheia | `Plano-de-Linhas-Quilha-Cheia-<Nome>.html` | [07](references/07-modelo-quilha-cheia.md) |

## Roteiro

### 1 · Ler a imagem UMA vez

Numa passada só, anote em pixels **tudo** que vai precisar: voltar na imagem é o erro mais
caro daqui.

- os quatro pontos de calibração — [01](references/01-calibracao.md) — e os `u` das
  marcas de baliza;
- na superior: bordas de cima e de baixo do contorno em cada baliza;
- na lateral: cada linha em 4 a 6 estações, com espelho, fundo da quilha e roda;
- na seção mestra: cantos do convés e 5 a 7 pontos; se parecer wineglass, **adense na
  garganta** — [02](references/02-digitalizacao.md).

### 2 · Calibrar

```bash
python scripts/homografia.py --loa-sq 16 --h-marcas 14.55 --balizas 100,393,686,977,1268 \
    --p1 100,1160 --p2 1268,1149 --p3 1268,82 --p4 100,90 --pontos 100,88 250,118 ...
```

Todos numa chamada só: resolve H, devolve tudo ao papel e **reprova a calibração** se as
balizas saírem das posições nominais (limite 0,05 qd).

### 3 · Decidir o tipo de casco, com número

Casco sem quina, seção mestra já em quadrados:

```bash
python scripts/homografia.py --secao 0,0 0.34,0.542 ... \
    --projeto projeto.json --meia-nau 0.0817,4.5915
```

Ajusta **as duas** famílias de forma, recomenda uma por critério explícito e **grava
sozinho** `secao.pts` e `cheia.p`; com `--meia-nau z_quilha,z_borda`, também `alefriz.z0`.
Siga-a. Essas duas cotas se leem da **curva** em `mid_x` — rode este passo depois do 4.

### 4 · Ajustar as curvas

```bash
python scripts/ajustar.py --loa-sq 16 --projeto projeto.json \
    --curva planSheer 0,1.6328 1.865,2.2898 ... --curva profSheer ... --curva profKeel ...
```

Resolve as declividades com a mesma convexidade que o motor verifica e **grava `curvas`
e `medidos`**, fundindo com o que já estiver lá; a tela devolve só o veredito por
curva. Reprovou: a saída diz se o problema é a leitura ou a cadeia de nós — conserte pela
[02](references/02-digitalizacao.md) e diga quanto mexeu.

### 5 · Completar o projeto.json

Os passos 3 e 4 já escreveram `curvas`, `medidos`, `secao` e `cheia`. À mão sobram `casco`,
`nome`, `titulo`, `loa_m`, `loa_sq`, `balizas`, `mid_x`, as frações de cheia e o
`registro`; cada um com exemplo pronto na referência do seu casco.

**O `registro` é curto e só fala deste barco.** O método já está gravado no documento, na
seção estática *Como isto é feito*. Aqui vai só: resíduo da calibração, verificação
independente, discordância entre vistas e qual você adotou, o que é reconstrução e não
medida, quanto mexeu em cada nó. Frase que seria idêntica para outro croqui é método —
apague.

### 6 · Montar e verificar

```bash
python scripts/montar.py projeto.json
node scripts/verificar.js --resumo Plano-de-Linhas-Quilha-Cheia-Fulano.html
```

`verificar.js` reconhece o tipo de casco e roda ~31 checagens comuns, mais ~13 de quilha cheia. Com `--resumo` ele devolve 4 linhas; falhando alguma, rode sem `--resumo` para o
detalhe. **Não pule:** aqui todo defeito real apareceu ao testar, nenhum ao ler o código.

### 7 · Entregar

Entregue o arquivo e relate em poucas linhas o que foi para o `registro`.

## O que não negociar

- **Alisamento das longitudinais.** Planta e perfil mantêm um só sentido de curvatura;
  não afrouxe a tolerância para um arrasto passar.
- **A baliza transversal é outra coisa:** em quilha cheia ela inflexiona na garganta, por
  definição, e deve.
- **Escala informada.** Sem o LOA não há cota em milímetros.
- **Perspectiva.** Decalcar contando pixels erra de 5 a 7 % numa foto de caderno.
- **Identidade Brana.** Ver [05](references/05-identidade-brana.md).
