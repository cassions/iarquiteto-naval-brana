# Calibração da fotografia

Uma foto de caderno tirada à mão tem perspectiva. Decalcar contando pixels erra de 5 a
7 % de canto a canto — o suficiente para a seção mestra desenhada não bater com a vista
superior e você concluir, errado, que o croqui está inconsistente.

## O retângulo que o próprio desenho oferece

O croqui traz duas coisas que são retas conhecidas no papel:

1. as **verticais das balizas**, igualmente espaçadas;
2. a **linha das marcas** onde os números das balizas foram escritos, que corre sobre um
   traço da malha.

Os cantos formados pela primeira e pela última baliza, cruzadas com a linha de centro da
vista superior e com a linha das marcas, dão **quatro pontos de um retângulo de
proporções conhecidas**. Isso basta para uma homografia plano a plano.

Meça, em quadrados da malha:

- `LOA_SQ` — comprimento do casco (nº de vãos entre balizas × quadrados por vão);
- `H_MARCAS` — distância vertical da linha de centro da planta até a linha das marcas.

Nenhuma das duas precisa ser inteira.

## Resolver

```bash
python scripts/homografia.py --loa-sq 20 --h-marcas 4.38 \
    --p1 452,216 --p2 1471,213 --p3 1470,437 --p4 447,440
```

Os quatro pontos, em pixels, na ordem: baliza 1 × linha de centro, última baliza × linha
de centro, última baliza × linha das marcas, baliza 1 × linha das marcas.

O script imprime H, a escala em px por quadrado nos dois eixos, a inclinação da câmera, e
— o que interessa — **onde cada marca de baliza cai quando devolvida pela inversa de H**.

## O teste que decide

As balizas devolvidas têm de cair nas posições nominais (0, 4, 8, … em quadrados).

| Erro máximo | Leitura |
|---|---|
| < 0,03 qd | ótimo, foto quase perpendicular |
| 0,03 – 0,05 qd | aceitável |
| > 0,05 qd | **alguma leitura está errada — refaça antes de seguir** |

Nos dois croquis de referência deu 0,027 qd (redondo, foto quase perpendicular) e
0,20 qd no primeiro ajuste do quinado, que foi de fato um erro de leitura das marcas
intermediárias: só as balizas 1 e 8 tinham sido ancoradas.

## Ler a inclinação da câmera

A razão entre as escalas dos dois eixos denuncia o ângulo:

- 0,4 % de anisotropia → câmera quase perpendicular (~5°);
- 7 % → câmera bem inclinada (~22°), típico de foto tirada em pé sobre a mesa.

Vale registrar no relatório: explica por que uma foto foi mais fácil de ler que outra.

## Armadilhas

- **Não use a moldura do papel** como referência: a folha empena e a borda não é reta.
- **A linha de centro da planta não é dada** — recupere bissectando o contorno em cada
  baliza. Se as duas metades discordarem mais de 0,15 quadrado, você leu errado; até
  isso é a assimetria natural do traço à mão.
- **As vistas podem estar desalinhadas entre si.** No croqui quinado a vista lateral
  estava 0,55 quadrado à direita da superior. Normalize as duas para X ∈ [0, LOA_SQ] e
  registre a correção.
- **A seção mestra é desenhada à parte**, com posição vertical própria no papel. Ela dá
  proporções (meia-boca, pontal, forma), não altura absoluta.
