---
name: brana-plano-linhas-interativo
description: Transforma um croqui de casco desenhado à mão em papel quadriculado num plano de linhas interativo em HTML, na identidade visual da Brana. O croqui precisa ter as três vistas — superior (TOP), lateral (SIDE) e seção mestra (MIDSHIP). Corrige a perspectiva da fotografia por homografia, digitaliza as cotas, alisa as curvas com splines que não podem inflexionar, e entrega um arquivo único que roda no navegador e no celular. Suporta casco quinado (com chine) e casco de bojo redondo. Use quando alguém enviar um desenho, croqui ou foto de um casco em papel quadriculado e pedir para transformar em CAD, plano de linhas, tabela de cotas, ou um modelo editável de casco.
license: Proprietário — Brana Projetos Navais
compatibility: Requer Node.js e Python 3 para os scripts. Sem acesso à rede.
metadata:
  category: brana
  author: Brana Projetos Navais
  version: "2.0"
---

# Plano de linhas interativo a partir de um croqui

Entrada: a **fotografia de um croqui em papel quadriculado**, com as três vistas
rotuladas — superior (TOP), lateral (SIDE) e seção mestra (MIDSHIP) — e as balizas
numeradas ao longo do comprimento.

Saída: **um arquivo HTML único**, autocontido, que abre no navegador e no celular.

## Regra de ouro: você escreve ~300 tokens, não 23 mil

O modelo em `assets/` tem 23 mil tokens. Ele **não deve ser lido nem reescrito** —
`scripts/montar.py` injeta nele um `projeto.json` de umas 40 linhas. Isso é a diferença
entre gastar ~25 mil tokens numa corrida e gastar ~140 mil.

**Nunca faça, em nenhuma hipótese:**

- ler `assets/modelo-*.html` (23 mil tokens de entrada);
- copiar o modelo e editar (23 mil de entrada + 23 mil de saída, que custam ~5×);
- usar `Read` na imagem do croqui — ela já está no contexto, reler é pagar de novo;
- tirar capturas de tela do resultado; `scripts/verificar.js` cobre o que importa e
  devolve texto;
- ler as duas referências de modelo — leia só a do casco que você identificou.

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

| Tipo de casco | Arquivo de saída |
|---|---|
| Quinado (com chine) | `Plano-de-Linhas-<Nome>.html` |
| Redondo (bojo redondo) | `Casco-Redondo-<Nome>.html` |

```
boat-hand-drawing-example-chine-midship.jpeg  ->  Plano-de-Linhas-Brana.html
boat-hand-drawing-example-round-midship.jpg   ->  Casco-Redondo-Brana.html
```

## Que tipo de casco é

Olhe **a seção mestra**:

- **Quinado** — a seção tem um vértice: fundo reto do centro até a quina, depois costado
  reto até o convés. A lateral costuma mostrar **três** linhas.
- **Redondo** — a seção é uma curva contínua, em U, sem vértice. A lateral mostra
  **duas** linhas.

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
- na seção mestra: cantos do convés e, se for redondo, mais 5 pontos do bojo.

### 2 · Calibrar

```bash
python scripts/homografia.py --loa-sq 20 --h-marcas 4.38 \
    --p1 452,216 --p2 1471,213 --p3 1470,437 --p4 447,440 \
    --balizas 452,657,860,1062,1267,1470 \
    --pontos 860,38 860,390 443,810 ...
```

Ele resolve H, devolve todos os pontos ao papel de uma vez, e **reprova a calibração**
se as balizas não caírem nas posições nominais (limite 0,05 quadrado). Passe todos os
pontos numa chamada só.

Para casco redondo, ajuste a seção no mesmo script: `--secao u,v u,v ...`

### 3 · Ajustar as curvas

```bash
python scripts/ajustar.py --loa-sq 20 \
    --curva planSheer 0,2.542 3.96,3.288 8.00,3.455 11.94,2.994 15.98,1.826 20,0 \
    --curva profSheer 0,2.969 8.06,3.369 15.98,3.791 20,4.011 \
    --curva profKeel  0,0.945 4.25,0.203 8.06,0.000 12.12,0.104 20,4.011
```

Ele resolve as declividades dos nós impondo a mesma convexidade que o motor verifica, e
imprime o bloco `"curvas"` pronto. Não faça essa álgebra à mão — era o segundo maior
gasto de tokens.

Se ele reclamar que as cordas não são monótonas, **o erro é da sua leitura**, não do
croqui: refaça o ponto que quebra a sequência.

### 4 · Escrever o projeto.json

Umas 40 linhas. Esquema em [06-projeto-json.md](references/06-projeto-json.md), e o
modelo do casco em [03-modelo-quinado.md](references/03-modelo-quinado.md) **ou**
[04-modelo-redondo.md](references/04-modelo-redondo.md) — leia só um dos dois.

### 5 · Montar e verificar

```bash
python scripts/montar.py projeto.json Casco-Redondo-Fulano.html
node   scripts/verificar.js Casco-Redondo-Fulano.html
```

`verificar.js` reconhece sozinho o tipo de casco e roda ~32 checagens: validade,
ausência de inflexão em todos os estados alcançáveis, aderência aos pontos medidos,
ordenação entre curvas, nós dentro da folha, marcação SVG e transbordo nos extremos do
estiramento. **Não pule** — nesta skill todo defeito real apareceu ao testar.

### 6 · Entregar

Entregue o arquivo e relate em poucas linhas: o resíduo da calibração, a verificação
independente (meia-boca da seção mestra contra a meia-boca máxima da planta) e **toda
discordância entre vistas**, dizendo qual você adotou.

## O que não negociar

- **Alisamento.** Toda curva mantém um único sentido de curvatura. Não afrouxe a
  tolerância para fazer um arrasto passar.
- **Escala informada.** Sem o LOA não há cota em milímetros.
- **Perspectiva.** Decalcar contando pixels erra de 5 a 7 % numa foto de caderno.
- **Identidade Brana.** Ver [05-identidade-brana.md](references/05-identidade-brana.md).
