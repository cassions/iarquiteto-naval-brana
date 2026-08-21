---
name: brana-pesos-trim-banda
description: Gera um painel interativo de pesos e centros (HTML único, offline, identidade Brana) a partir de uma tabela de cotas. A pessoa leva pesos a bordo — tripulantes, motor, combustível, carga — numa tabela de pesos editável, e o casco encontra sozinho a posição em que flutua: trim, banda, calados, borda livre, GM e curva de braços de endireitamento saem do equilíbrio livre em três graus de liberdade. G, B e cada peso ficam marcados no 3D, e um botão copia a condição de carga em texto. Atende casco quinado (com chine) e de bojo redondo, detectando o formato da própria tabela. Use quando pedirem estudo de pesos e centros, distribuição de carga, condição de carga, efeito de mover peso a bordo, cálculo de trim e banda (inclinação transversal), calado com trim, LCG, TCG, KG, GM, GZ, estabilidade inicial, risco de capotamento ou de embarcar água pela borda. A tabela de cotas é obrigatória.
license: Proprietário — Brana · Projetos Navais
metadata:
  category: brana
  version: "1.0"
  author: Brana Projetos Navais
  language: pt-BR
  compatibility: Requer Node.js 18+ para rodar scripts/gerar-painel.js. O HTML gerado abre em qualquer navegador com WebGL, inclusive celular, sem rede e sem instalar nada.
---

# Pesos e centros: do peso a bordo ao trim e à banda

No visualizador de casco o calado é um botão. Aqui a pergunta se inverte, que é como
ela aparece no projeto: **dado o peso e onde ele está, em que posição o casco
flutua?** A pessoa monta a tabela de pesos — o barco na primeira linha, cada carga
nas seguintes — e o painel resolve o equilíbrio livre: quanto afunda, quanto inclina
de trim, quanto inclina de banda.

O resultado é **um arquivo HTML só**, sem rede e sem biblioteca: abre por duplo
clique, funciona offline e roda no celular.

## Duas coisas são obrigatórias antes de gerar

**1. A tabela de cotas.** É a única fonte da forma do casco. Se a pessoa não anexou
nem colou uma tabela, peça — não invente cotas, não estime a partir de uma descrição
("uma lancha de 7 m") e **não use os exemplos da pasta `exemplos/` como se fossem o
casco dela**. Os dois formatos aceitos estão em
[references/formato-da-tabela.md](references/formato-da-tabela.md).

**2. O nome de quem está usando.** Pergunte: *"Qual o nome do projetista, para
constar no arquivo?"* Vai para o título, o rodapé, o autor da página e o **nome do
arquivo** — é assim que a pessoa distingue este painel dos outros gerados pela mesma
skill. Se ela já disse o nome na conversa, use o que ela disse e não pergunte de novo.

## Como gerar

Se a tabela veio colada no chat, grave o texto num `.txt` e aponte para ele. Depois:

```bash
node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" --saida=<pasta>
```

Opcional: `--calado=<mm>` fixa o calado de partida. Sem ele, o painel abre com 41% do
pontal, e de todo modo a pessoa muda o peso do barco na tabela depois de abrir.

O script descobre sozinho se a baliza é redonda ou quinada, injeta a tabela no núcleo,
**resolve a flutuação a prumo ali mesmo** para provar que o casco fecha, monta a
página, confere 22 propriedades do arquivo e imprime o resumo. O nome sai como
`Pesos-Trim-Banda-v2-Quinado-<Nome>.html` ou `Pesos-Trim-Banda-v2-Redondo-<Nome>.html`.

## Trabalhe só com o que o script imprime

Esta skill embute um modelo de página de 34 KB, um núcleo geométrico e de equilíbrio
de 44 KB, um renderizador de 74 KB, um logotipo de 11 KB e um painel de exemplo já
gerado de 160 KB. **São entrada para o script e referência para a pessoa, não leitura
para você.** Abrir esses arquivos custa mais de 80 mil tokens e não muda nada no que
você vai fazer: você não edita o modelo, você o preenche pelo script.

Pela mesma razão, **não abra o HTML gerado para conferir**. São mais 40 mil tokens
para reler um arquivo que o script acabou de validar — se alguma coisa estivesse
errada ele teria saído com `RECUSADO` em vez de dizer *todas as 22 verificações
passaram*. Confie na saída dele: é a evidência, e é o que você repassa.

Num uso normal você roda um comando e lê sete linhas. Se em algum momento você
estiver prestes a usar Read num arquivo desta skill ou no painel gerado,
provavelmente é sinal de que algo falhou — e aí o caminho é
[references/solucao-de-problemas.md](references/solucao-de-problemas.md), não o
arquivo grande.

## O que dizer depois

Repasse em duas ou três frases o que o script imprimiu:

- o formato detectado e o número de balizas, comprimento, boca e pontal;
- o calado de partida com o deslocamento nele, e o **GM<sub>t</sub>**, que é o número
  que diz se o casco é duro ou mole;
- que a tabela de pesos abre com o barco mais um peso de 75 kg pousado sobre o CG do
  barco, e por isso o casco parte a prumo — qualquer inclinação que apareça depois é
  resultado do que a pessoa mexeu;
- **os avisos, se houver.** Aviso não é erro: a tabela foi aceita mas tem algo
  geometricamente estranho (chine fora da borda, quilha acima do chine, meia-boca
  negativa). Diga qual baliza e deixe a pessoa decidir se corrige.

Entregue o arquivo com a ferramenta de envio que você tiver; sem nenhuma, diga o
caminho completo. Se a pessoa perguntar o que o painel faz ou como ele calcula, a
resposta está em
[references/o-que-o-painel-calcula.md](references/o-que-o-painel-calcula.md) — inclusive
as duas hipóteses que deixam o número otimista.

## Três regras que evitam retrabalho

**Não reescreva o painel à mão.** O núcleo embutido tem interpolação monótona ao longo
do comprimento, ajuste da super-elipse no bojo redondo, recorte da baliza por plano
inclinado e um solver de equilíbrio conferido contra valores analíticos — caixote de
volume conhecido, fórmula de bordo reto para trim e banda, equilíbrio adernado com GM
negativo. Montar a página do zero perderia isso, gastaria dezenas de milhares de
tokens e sairia com layout diferente do que a pessoa já conhece.

**Não gere duas vezes para comparar.** Se precisar de outro nome, outro calado ou
outra tabela, rode de novo com o argumento mudado — uma passada resolve o caso normal.

**Não monte a condição de carga por fora.** Somar pesos e centros na mão, ou num
script à parte, é exatamente o que o painel faz ao vivo e com o casco respondendo.
Gere o painel e deixe a pessoa arrastar.

## Quando algo falha

O script recusa com mensagem específica em vez de gerar um painel errado. As
mensagens, o que cada uma significa e os dois formatos de tabela em detalhe estão em:

- [references/solucao-de-problemas.md](references/solucao-de-problemas.md) — as
  mensagens de recusa, uma a uma, e o que fazer com cada uma
- [references/formato-da-tabela.md](references/formato-da-tabela.md) — as colunas dos
  dois formatos, como o formato é detectado, ponto ou vírgula decimal, e o que a
  tabela **não** informa
- [references/o-que-o-painel-calcula.md](references/o-que-o-painel-calcula.md) — o que
  a pessoa vê na tela, como o equilíbrio é resolvido e onde o número é estimativa

Leia esses arquivos **quando precisar deles**, não por antecipação.

## O que vem na pasta

```
assets/     modelo da página, núcleo de geometria e equilíbrio, renderizador, logotipo
scripts/    gerar-painel.js — o único comando desta skill
exemplos/   três tabelas de entrada (redonda de 6 e de 12 balizas, quinada de 8)
            e um painel de saída já gerado, para a pessoa ver antes de decidir
references/ formato da tabela, solução de problemas, o que o painel calcula
```

O painel de exemplo em `exemplos/Pesos-Trim-Banda-v2-Quinado-Cassio.html` saiu de
`exemplos/exemplo-quinado-8-balizas.txt` com `--nome=Cassio`. Se a pessoa quiser ver
o painel antes de mandar a tabela dela, mande esse arquivo — é o mesmo layout que ela
vai receber.
