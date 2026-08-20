# Identidade visual Brana

Vem do modelo dos Cursos DPE. O arquivo é assumidamente escuro — não existe variante
clara, e tudo é pintado explicitamente para a página não pegar o fundo de quem hospeda.

## Paleta

| Token | Hex | Uso |
|---|---|---|
| `--ground` | `#333333` | fundo da página |
| `--graf` | `#404040` | grafite da folha de desenho |
| `--box` | `#2E2E2E` | caixa escura (barras, blocos) |
| `--card` | `#F7F7F7` | ficha clara (logotipo) |
| `--red` | `#9A3231` | vermelho Brana — preenchimentos, cabeçalho de tabela |
| `--red-l` | `#EE9A98` | títulos e rótulos sobre grafite |
| `--red-xl` | `#F5DADA` | texto secundário dentro do vermelho |
| `--white` / `--light` / `--muted` | `#FFFFFF` / `#E8E8E8` / `#BFBFBF` | texto |
| `--cell-a` / `--cell-b` | `#4D4D4D` / `#585858` | zebra da tabela |
| `--amber` | `#FBB12F` | dourado do logotipo — pente de curvatura |
| `--green` | `#9BD79B` | cruzes dos pontos digitalizados |

O vermelho `#9A3231` e o dourado `#FBB12F` foram **medidos nos pixels do logotipo**, não
escolhidos de olho.

## Um desvio deliberado do modelo original

O modelo DPE usa `#C00000` para títulos sobre grafite. Sobre `#404040` isso dá contraste
**1,59** — funciona projetado numa sala escura a 32 pt, não numa página de leitura. Use
`--red-l` (`#EE9A98`), que a própria paleta indica para rótulo sobre fundo escuro:
contraste **4,79** no título e **8,46** no corpo. O vermelho cheio fica onde é sólido —
cabeçalho de tabela, chip ativo, filete do logotipo, rodapé.

## Tipografia

- Títulos: `"Calibri Light", Calibri, "Segoe UI Light", system-ui, sans-serif`
- Corpo: `Calibri, "Segoe UI", system-ui, sans-serif`
- Dados e rótulos: `Consolas, "Cascadia Mono", ui-monospace, monospace`, com
  `font-variant-numeric: tabular-nums`

São as fontes do tema do template DPE. Nada de webfont: o arquivo tem de abrir sem rede.

## Logotipo

`assets/brana-logo.png`, 466 × 102, fundo transparente, embutido como data URI por
`scripts/montar.py`. Vai sobre **ficha clara** com filete vermelho embaixo — arte em
traço escura desaparece sobre grafite, e é assim que o modelo DPE trata o caso.

## Layout

Selo com logotipo e três campos · barra de ferramentas · barra de estiramento ·
folha de desenho (planta, perfil, plano de balizas) · tabela de cotas · blocos
recolhíveis de exportação e do registro da extração · rodapé vermelho.

No celular tudo empilha; os alvos de toque ficam em 42 px e a espessura dos traços
acompanha a escala pela variável `--lw`, calculada em JS a partir da largura medida.

## Números em português

`toLocaleString('pt-BR')` na tela — vírgula decimal e ponto de milhar. **Na exportação,
sem ponto de milhar** (`useGrouping:false`): um `1.234,5` dentro de um TSV parte em dois
campos para quem separa por ponto. Esse defeito já apareceu de verdade.
