# Solução de problemas

## O script se recusa a gerar

**`a tabela nao declara o plano do espelho e nenhum angulo foi informado`** — é o
comportamento pretendido, não um defeito. Pergunte o ângulo ao usuário. Se ele não tiver,
confirme em palavras que o plano sairá com o espelho reto na última baliza a ré e rode com
`--espelho-reto`.

**`--espelho=N graus e implausivel`** — o limite é 60° da vertical. Confira se o usuário não
informou o ângulo medido da horizontal (um espelho a 78° da horizontal é 12° da vertical).

**`nao achei brana-logo.txt`** — a skill foi desmembrada. `assets/brana-logo.txt` tem de
estar ao lado de `scripts/`, ou dentro de `scripts/`.

**`a DWL de 300 mm nao corta o casco`** — a tabela tem alturas em outra unidade (metros, ou
polegadas), ou a linha de base não é o ponto mais baixo da quilha. Converta para milímetros
acima da base antes de gerar.

**`a tabela menciona o espelho, mas a declaracao nao foi reconhecida`** — a linha existe mas
está fora da forma aceita (falta `da vertical`, por exemplo). Corrija a linha para
`# espelho: <graus> graus da vertical`, ou passe `--espelho=<graus>`. O script recusa em vez
de adivinhar porque, antes, uma declaração malformada fazia o plano sair **reto em silêncio**.

**`linha nao numerica DEPOIS das balizas`** — uma baliza tem célula vazia, texto no lugar de
número, ou está truncada. A mensagem diz quantas balizas já havia sido lidas. Antes essa
linha era descartada em silêncio e o plano saía com uma baliza de menos.

**`a baliza N tem X colunas, as outras tem Y`** — coluna faltando ou sobrando. Sem isso as
colunas deslocavam e o casco saía outro.

**`--espelho precisa de um valor em graus`** — `--espelho=` vazio virava 0° (plano reto
rotulado como inclinado). Use `--espelho-reto` para espelho reto.

Erros de leitura da tabela (colunas, decimais, balizas repetidas) estão em
`formato-da-tabela.md`.

## O resumo trouxe FALHA(S)

Não entregue o PDF. As checagens conferem o desenho contra as regras da malha e contra a
superfície, medindo dentro do próprio content stream do PDF, então uma falha é real.

| Falha | Causa provável |
|---|---|
| `nenhum valor em milimetro com casa decimal` | um `--titulo` ou `--sub` com decimal (`6,00 m`). Escreva `6.000 mm`. |
| `nenhum texto sobreposto` | `--titulo` longo demais para o selo. Encurte, ou use `--sub` para escrever o subtítulo à mão. O subtítulo automático já se encurta sozinho (abrevia o nome, depois solta o nome da tabela). |
| `nada a menos de 5 mm da borda` | `--escala` forçada grande demais para a folha. Tire o `--escala`. |
| `tabela x secao`, `tabela x linha d agua` | a superfície e o desenho divergiram: não deve acontecer, reporte com a tabela em mão. |
| `nenhum segmento interior costurando um vao` | idem. |

## O desenho saiu estranho

**Balanços de popa e de proa nulos** — a baliza 0 caiu exatamente no extremo de popa e a
última exatamente na roda. Acontece quando o espelho é reto e o espaçamento das balizas
divide o comprimento em partes inteiras. O plano informa isso em nota, no lugar das cotas.

**Uma linha d'água aparece em dois trechos separados** — é correto: no meio do casco a borda
desce abaixo daquela altura, e a linha d'água existe só junto ao espelho e da meia-nau para
a proa. Cada trecho é desenhado à parte, de propósito.

**Uma linha d'água inteira vazia na tabela** — a altura fica fora do casco em todas as
balizas do plano. Típico da LA 0 (a quilha reconstruída não chega a zero em nenhuma baliza
do plano) e da linha d'água mais alta (só a roda de proa a alcança, e lá a meia-boca é zero).

**A baliza 0 sem altura de quilha** — o plano do espelho trunca a baliza: o fundo dela é o
próprio espelho, e o valor está na linha da DWL. Nota no desenho explica.

**O desenho parece pequeno na folha** — a escala é a maior normalizada que cabe com as três
vistas na A3. Um casco de 6 m cabe em 1:25; 1:20 exigiria tirar o plano de balizas de ao
lado do perfil. `--escala` força outro valor, mas aí confira as falhas de margem.

**O plano de balizas divide os bordos num lugar inesperado** — a divisão é na **boca
máxima**, não no meio do comprimento. É o que faz cada bordo receber seções que se encaixam
monotonamente.

**O PDF saiu como `.INVALIDO.pdf`** — a conferência reprovou e o script renomeou o arquivo
de propósito, para não haver como entregá-lo por engano. As linhas `FALHA` do resumo dizem o
quê.

**Saiu com sufixo `-2`** — já existia um PDF com aquele nome. O script não sobrescreve.

## Conferir por fora

```bash
node scripts/confere-plano.js <tabela> <arquivo.pdf>
```

Imprime uma linha por checagem. Útil para ver qual passou, não só quantas.
