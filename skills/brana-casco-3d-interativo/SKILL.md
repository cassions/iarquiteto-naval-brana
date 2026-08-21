---
name: brana-casco-3d-interativo
description: Gera um visualizador 3D interativo de casco (HTML único, offline, identidade Brana) a partir de uma tabela de cotas, com hidrostática ao vivo — deslocamento, Cb, Cp, Cm, LCB, superfície molhada — em água salgada ou doce. Atende casco quinado (com chine) e de bojo redondo, detectando o formato da própria tabela. Use quando pedirem para ver, girar ou visualizar um casco em 3D, transformar tabela de cotas ou offsets em modelo tridimensional, conferir a hidrostática de uma tabela, ou mencionarem plano de linhas, balizas, meia-boca, chine, bojo redondo, deadrise ou pontal e quiserem ver a forma como superfície. O espelho de popa nasce de um plano de corte ajustável em posição longitudinal e inclinação, e a página traz a curva de áreas das balizas — então também atende quem pedir para criar, mover, aprumar ou inclinar o espelho, cortar a popa por um plano, ver o transom, ou olhar a curva de áreas. A tabela de cotas é obrigatória.
license: Proprietário. Brana · Projetos Navais
compatibility: Requer Node.js 18+ para rodar scripts/gerar-casco-3d.js. O HTML gerado abre em qualquer navegador com WebGL, inclusive celular.
metadata:
  brana-categoria: brana
  brana-versao: "1.2"
---

# Casco 3D interativo a partir da tabela de cotas

Transforma uma tabela de cotas em um visualizador tridimensional que a pessoa gira
na mão, com a hidrostática saindo da mesma geometria que está na tela. O resultado é
**um arquivo HTML só**, sem rede e sem biblioteca: abre por duplo clique, funciona
offline e roda no celular.

## Duas coisas são obrigatórias antes de gerar

**1. A tabela de cotas.** É a única fonte da forma. Se a pessoa não anexou nem colou
uma tabela, peça — não invente cotas, não estime a partir de uma descrição ("um
barco de 6 m") e não use os exemplos da pasta `exemplos/` como se fossem o casco
dela.

**2. O nome de quem está usando.** Pergunte: *"Qual o nome do projetista, para
constar no arquivo?"* Vai para o título, o rodapé e o **nome do arquivo** — é assim
que a pessoa distingue este casco dos outros gerados pela mesma skill. Se ela já
disse o nome na conversa, use o que ela disse.

## Como gerar

Se a tabela veio colada no chat, grave o texto num `.txt` e aponte para ele. Depois:

```bash
node scripts/gerar-casco-3d.js --tabela=<arquivo> --nome="<projetista>" --saida=<pasta>
```

O script descobre sozinho se a baliza é redonda ou quinada, calcula o calado inicial
a partir do pontal, monta o HTML, valida 23 propriedades do arquivo e imprime o
resumo. O nome sai como `Casco-Quinado-3D-<Nome>.html` ou
`Casco-Redondo-3D-<Nome>.html`.

## O espelho de popa e a curva de áreas

O espelho **não** é mais a baliza mais a ré e ponto: é um **plano de corte**, e a
página tem dois controles para ele — posição longitudinal (que caminha entre as duas
balizas mais a ré) e inclinação, 0 a 55° do vertical. O plano é ancorado na borda: em
`pos` ele encontra o tosado e dali desce para vante, então a inclinação sempre remove
material e nunca pede casco a ré da primeira baliza.

Isso importa para você em três pontos:

- **Abre a prumo na baliza de ré**, que é exatamente a geometria de antes. Se a pessoa
  não falar de espelho, o resultado é o mesmo de sempre — não precisa avisar nada.
- **A posição muda o LOA**, o centro e as abscissas; a inclinação não muda o LOA,
  porque o plano pivota na borda e o ponto mais a ré fica onde estava. Se alguém
  estranhar que inclinar não encurta o barco, é isso.
- **Na condição de projeto o espelho costuma estar seco.** Se o pé do espelho fica
  acima da linha de água, inclinar não altera o deslocamento — só a Lwl. Não é defeito
  do modelo, é o barco. Para ver a hidrostática responder, o calado tem de passar do
  pé do espelho.

A curva de áreas sai do mesmo integrador da hidrostática, sobre a poligonal já
recortada pelo plano. Por isso o script confere a integral da curva contra o volume e
**falha** se as duas divergirem mais de 1 % — é a única checagem numérica das 23, e a
que pegaria um erro de geometria que as outras deixariam passar.

## Trabalhe só com o que o script imprime

Esta skill embute um modelo de página de 54 KB, um motor geométrico de 28 KB e um
logotipo de 11 KB. **São entrada para o script, não leitura para você.** Abrir os
três custa cerca de 25 mil tokens e não muda nada no que você vai fazer: você não
edita o modelo, você o preenche pelo script.

Pela mesma razão, **não abra o HTML gerado para conferir**. São mais 25 mil tokens
para reler um arquivo que o script acabou de validar — se alguma coisa estivesse
errada ele teria saído com erro em vez de dizer *todas as verificacoes passaram*.
Confie na saída dele: é a evidência, e é o que você repassa.

Em resumo, num uso normal você roda um comando e lê seis linhas. Se em algum momento
você estiver prestes a usar Read num arquivo desta skill ou no arquivo gerado,
provavelmente é sinal de que algo falhou — e aí o caminho é
[references/solucao-de-problemas.md](references/solucao-de-problemas.md), não o
arquivo grande.

## O que dizer depois

Repasse em uma ou duas frases o que o script imprimiu: o formato detectado e o
número de balizas, comprimento e pontal, o calado inicial com a hidrostática nele, o
Amax da curva de áreas com a integral fechando no volume, e **os avisos, se houver**. Aviso não é erro — a tabela foi aceita mas tem algo
geometricamente estranho (chine fora da borda, quilha acima do chine, meia-boca
negativa). Diga qual baliza e deixe a pessoa decidir se corrige.

Entregue o arquivo com a ferramenta de envio que você tiver; sem nenhuma, diga o
caminho completo.

## Duas regras que evitam retrabalho

**Não reescreva o visualizador à mão.** O motor embutido tem interpolação monótona ao
longo do comprimento, ajuste da super-elipse no bojo redondo e hidrostática conferida
contra um caixote de volume conhecido e um meio-cilindro. Montar a página do zero
perderia isso, gastaria dezenas de milhares de tokens e sairia com layout diferente
do que a pessoa já conhece.

**Não gere duas vezes para comparar.** Se precisar de outro calado, outro nome ou
outra tabela, rode de novo com o argumento mudado — mas uma passada só resolve o caso
normal.

## Quando algo falha

O script recusa com mensagem específica em vez de gerar um casco errado. As mensagens,
o que cada uma significa e os dois formatos de tabela em detalhe estão em:

- [references/solucao-de-problemas.md](references/solucao-de-problemas.md) — as
  mensagens de erro e o que fazer com cada uma
- [references/formato-da-tabela.md](references/formato-da-tabela.md) — as colunas dos
  dois formatos, como o formato é detectado, ponto ou vírgula decimal, e o que a
  tabela não informa

Leia esses arquivos **quando precisar deles**, não por antecipação.
