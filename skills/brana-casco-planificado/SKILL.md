---
name: brana-casco-planificado
description: Abre um casco em chapa plana a partir da tabela de cotas. Gera um relatório interativo (HTML único, offline, identidade Brana) e um PDF vetorial de corte com todas as peças sobre malha quadrada. Confere se os painéis são desenvolvíveis, corta casco de bojo redondo por diagonais em tiras, planifica as chapas e desenha os gabaritos das balizas, com a hidrostática antes e depois. Use quando pedirem para planificar, abrir ou expandir chapa de casco, saber se a superfície é desenvolvível, cortar casco redondo em tiras ou diagonais, tirar gabarito de baliza ou de cavername, gerar traçado para corte, ou passar o casco para papel quadriculado. A tabela de cotas é obrigatória.
license: Proprietário. Brana · Projetos Navais
compatibility: Requer Node.js 18+ para rodar scripts/gerar-relatorio.js. O HTML abre em qualquer navegador com WebGL, inclusive celular; o PDF, em qualquer leitor.
metadata:
  brana-categoria: brana
  brana-versao: "1.0"
---

# Casco planificado: relatório interativo e PDF de corte

Transforma uma tabela de cotas em dois arquivos: um relatório que a pessoa gira
na mão no navegador, e um PDF vetorial com todas as peças abertas em chapa plana
sobre malha quadrada, pronto para imprimir e cortar.

## Duas coisas são obrigatórias

**A tabela de cotas.** É a única fonte da forma. Sem ela, peça — não invente
cotas, não estime a partir de uma descrição ("um barco de 6 m") e não use os
arquivos de `exemplos/` como se fossem o casco da pessoa.

**O nome de quem está usando.** Pergunte: *"Qual o nome do projetista, para
constar nos arquivos?"* Vai no título, no rodapé e no **nome dos dois arquivos**.
Se ela já disse o nome na conversa, use o que ela disse.

## Como gerar

Se a tabela veio colada no chat, grave num `.txt` e aponte:

```bash
node scripts/gerar-relatorio.js --tabela=<arquivo> --nome="<projetista>" --saida=<pasta>
```

Opcionais: `--tiras=6..20` (em quantas tiras cortar um casco de bojo redondo,
padrão 10) e `--calado=<mm>` (padrão 40 % do pontal). O formato da baliza sai da
própria tabela. Saem `Relatorio-Casco-{Quinado|Redondo}-Planificado-<Nome>.html`
e `Planificacao-Casco-{Quinado|Redondo}-<Nome>.pdf`.

## Trabalhe só com o que o script imprime

Os assets viajam comprimidos de propósito: são 193 KB de motor e modelo que
servem de **entrada para o script, não de leitura para você**. Não há o que abrir
ali.

Pela mesma razão, **não abra o HTML gerado para conferir**: são 200 KB, uns 50 mil
tokens, para reler um arquivo que o script acabou de validar em 22 verificações —
se algo estivesse errado ele teria saído com erro. O PDF é binário.

Num uso normal você roda um comando e lê cinco linhas. Se estiver prestes a usar
Read num arquivo gerado, é sinal de que algo falhou, e aí o caminho é
[references/solucao-de-problemas.md](references/solucao-de-problemas.md).

## O que dizer depois

Repasse o que o script imprimiu: formato e número de balizas, quantas chapas e
gabaritos, a deformação ao planificar — **o pico e o rms, os dois**, porque o pico
costuma ser um ponto duro localizado no garboard perto da roda e sozinho assusta
sem motivo —, a hidrostática antes e depois, e quantas folhas tem o PDF. Repasse **os avisos, se houver** — aviso não é erro: a
tabela foi aceita mas tem algo geometricamente estranho; diga qual baliza e deixe
a decisão com a pessoa.

Vale explicar o que a comparação significa, que é o miolo do relatório:

- **quinado** — se os painéis admitem geratrizes de torção nula, o casco é
  desenvolvível e a alteração é só regrar por elas: nenhuma cota muda e o
  deslocamento se move fração de por cento.
- **redondo** — chapa plana nenhuma assenta nele inteiro, então ele é cortado por
  diagonais em tiras, o que equivale a construí-lo como casco de N quinas: a
  corda corta por dentro do bojo e o deslocamento cai. Mais tiras, menos perda —
  o desvio cai com o quadrado da largura da tira.

Entregue os dois arquivos com a ferramenta de envio que você tiver; sem nenhuma,
diga os caminhos.

## Duas regras que evitam retrabalho

**Não reescreva o relatório nem o PDF à mão** — o motor faz busca de regramento
de torção nula, ajuste de diagonais por mínimos quadrados, relaxamento
multirresolução e um escritor de PDF conferido byte a byte. **Não gere duas vezes
para comparar**: mude o argumento e rode de novo.

## Quando algo falha

- [references/solucao-de-problemas.md](references/solucao-de-problemas.md) — as
  mensagens de erro e o que fazer com cada uma
- [references/formato-da-tabela.md](references/formato-da-tabela.md) — as colunas
  dos dois formatos e como o formato é detectado
- [exemplos/saida-esperada.md](exemplos/saida-esperada.md) — o que o script
  imprime e o que vai dentro de cada arquivo

Leia **quando precisar**, não por antecipação.
