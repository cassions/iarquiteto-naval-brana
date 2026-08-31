---
name: brana-estimativa-velocidade
description: "Gera um painel interativo de estimativa de velocidade de embarcações (HTML único, offline, identidade Brana) a partir de uma tabela de cotas. Duas versões no mesmo arquivo — uma aula em sete passos e um painel de página única — com um botão de rodapé alternando entre elas. As medidas saem da tabela de cotas, o calado sai do peso pela hidrostática, e a velocidade sai das fórmulas do capítulo 2 do Propeller Handbook de Dave Gerr, conferida contra um segundo método independente, o de John Teale, pela resistência do casco. Cobre deslocamento, semi-planeio e planeio. Use quando pedirem estimativa de velocidade de um barco, quantos nós ele faz, que motor ou quantos HP são necessários, velocidade de casco, razão velocidade-comprimento, razão deslocamento-comprimento, coeficiente prismático ótimo, resistência ao avanço, potência para uma velocidade desejada, ou o teto de velocidade de um casco. A tabela de cotas é obrigatória."
license: "Proprietário — Brana · Projetos Navais"
metadata:
  category: brana
  version: "1.0"
  author: Brana Projetos Navais
  language: pt-BR
  compatibility: "Requer Node.js 18+ para rodar scripts/gerar-painel.js. O HTML gerado abre em qualquer navegador, inclusive celular, sem rede e sem instalar nada."
---

# Estimativa de velocidade

Da tabela de cotas ao número de nós: a geometria dá a forma, o peso dá o calado pela
hidrostática, e a linha d'água que sai daí entra nas fórmulas. Sai **um arquivo HTML
só**, offline, que abre por duplo clique e roda no celular.

## Duas coisas antes de gerar

**1. A tabela de cotas.** É a única fonte da forma do casco, e é **obrigatória**. Se a
pessoa não anexou nem colou uma, peça. Não invente cotas, não estime a partir de uma
descrição ("uma lancha de 7 m") e não use os exemplos desta skill como se fossem o
casco dela.

**2. O nome de quem está usando.** Pergunte: *"Qual o nome do projetista, para constar
no arquivo?"* Vai para o rodapé, o autor da página e o **nome do arquivo**. Se a pessoa
já disse o nome na conversa, use e não pergunte de novo.

## Como gerar

Se a tabela veio colada no chat, grave o texto num `.txt` e aponte para ele:

```bash
node scripts/gerar-painel.js --tabela=<arquivo> --nome="<projetista>" --saida=<pasta>
```

O script detecta se a baliza é redonda ou quinada, **resolve a hidrostática ali mesmo**
para provar que o casco fecha, escolhe um peso e uma potência de partida coerentes com
este casco, embute um casco de referência do formato oposto para comparação, roda 17
verificações e imprime sete linhas. Sai `Estimativa-Velocidade-<Nome>.html`.

Se a pessoa quiser ver o painel antes de mandar a tabela dela, mande
`exemplos/Estimativa-Velocidade-Cassio.html` — é o mesmo layout que ela vai receber.

## Trabalhe só com o que o script imprime

A pasta `assets/` guarda um modelo de página e um núcleo de cálculo. **São entrada para
o script, não leitura para você**: abrir o modelo custa cerca de **85 mil tokens**, e os
arquivos grandes desta pasta somam mais de 175 mil — cem vezes este arquivo que você
acabou de ler. Você não edita o modelo, você o preenche pelo script.

Pela mesma razão **não abra o HTML gerado para conferir**. Se algo estivesse errado o
script teria saído com `RECUSADO` em vez de *todas as 17 verificações passaram*. E não
reescreva o painel à mão, não calcule a velocidade por fora, e não gere duas vezes para
comparar — para outro nome ou outra tabela, rode de novo com o argumento mudado.

Num uso normal você roda um comando e lê sete linhas. Se estiver prestes a usar Read num
arquivo desta skill, provavelmente algo falhou.

## O que dizer depois

Repasse em duas ou três frases o que o script imprimiu: o casco lido, com que peso e
potência o painel abre, e os três números de forma — razão D/L, C<sub>p</sub> e ângulo
do alto de quarto de boca — que decidem o teto de velocidade. **Aviso não é erro**: a
tabela foi aceita, mas tem algo geometricamente estranho; diga qual baliza e deixe a
pessoa decidir. Entregue o arquivo com a ferramenta de envio que você tiver; sem
nenhuma, diga o caminho completo.

## Quando precisar de mais

- [references/formato-da-tabela.md](references/formato-da-tabela.md) — os dois formatos
  aceitos, como são detectados, e o que a tabela **não** informa
- [references/solucao-de-problemas.md](references/solucao-de-problemas.md) — cada
  mensagem de recusa e o que fazer com ela
- [references/o-que-o-painel-mostra.md](references/o-que-o-painel-mostra.md) — os dois
  métodos, o que cada leitura significa, e onde o número é estimativa

Leia esses arquivos **quando precisar deles**, não por antecipação.
