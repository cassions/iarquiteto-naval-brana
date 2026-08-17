# Roteiro da Fase 1 — completar o caso de uso

O caso de uso é obrigatório antes de qualquer busca. Este roteiro serve para dois
momentos: (a) o projetista trouxe o documento e falta pouco, ou (b) ele trouxe só
uma descrição solta e você precisa levantar o mínimo para pesquisar.

**Uma pergunta por vez.** Faça, pare, espere, confirme em uma linha o que
entendeu, siga. Nunca despeje uma lista pedindo "responda os itens abaixo" — o
projetista é inexperiente e uma lista de dez perguntas o faz responder mal todas.

## O mínimo indispensável para pesquisar

Sem estes seis itens você não consegue escolher fonte nem filtrar resultado:

| # | Item | Por que trava a busca |
|---|---|---|
| 1 | Tipo de embarcação | Define a fonte: veleiro → Sailboatdata; lancha nacional → Bombarco. |
| 2 | Propulsão (remo / vela / motor) | Muda completamente o conjunto de parâmetros relevantes. |
| 3 | Comprimento pretendido (ou faixa) | É o filtro principal do similar. Sem ele, "similar" não quer dizer nada. |
| 4 | Área de navegação | Interior, costeira ou oceânica muda o porte, a borda livre e o material. |
| 5 | Passageiros e pernoite | Define volume interno e se há cabine, banheiro, tanques. |
| 6 | Missão principal | Pesca, passeio, transporte, trabalho, esporte, moradia. |

## Perguntas, na ordem

1. **Tipo e missão** — "Que tipo de embarcação seu cliente quer, e qual o uso
   principal dela?" Se ele der só o tipo, pergunte a missão à parte. Missão é o
   que separa duas lanchas de 40 pés completamente diferentes.

2. **Propulsão** — "Vai ser a remo, a vela ou a motor?" Se for a motor, pergunte
   se já há preferência por popa (motor pendurado na traseira), centro-rabeta ou
   linha de eixo. Se for a vela, pergunte a armação pretendida (sloop, ketch,
   latina) — e explique que armação é o arranjo de mastros e velas.

3. **Comprimento** — "Que comprimento vocês têm em mente?" Aceite faixa. Se ele
   não souber, **sugira** a partir da missão e do número de pessoas, com uma
   justificativa de uma linha, e peça confirmação. Pergunte se o número está em
   pés ou metros — e use a unidade dele no resto da conversa.

4. **Área de navegação** — "Onde ela vai navegar, na maior parte do tempo?" Peça
   nome de lugar concreto (represa, baía, rio, trecho de costa). Se for rio ou
   lagoa, confirme se há ponte no trajeto e se há restrição de calado (parte
   submersa do casco) — isso elimina similares de calado grande.

5. **Pessoas e pernoite** — "Quantas pessoas a bordo no uso normal? Vai dormir a
   bordo? Quantas camas?" Pernoite é o que decide se você compara com barco de
   day-use ou com barco de cabine.

6. **Velocidade e autonomia** — "Existe expectativa de velocidade? Precisa
   aguentar quanto tempo ou quantas milhas fora?" Se não houver expectativa, siga
   — os similares vão sugerir a faixa normal, e isso é justamente uma das
   entregas do estudo.

7. **Material e orçamento** — "Já há definição de material do casco? E ordem de
   grandeza de investimento?" Serve para filtrar similares: comparar um casco de
   alumínio de trabalho com um de fibra de série leva a conclusão errada de peso.

8. **Restrição de transporte** — "A embarcação vai ser transportada em carreta
   por estrada?" Se sim, a boca (largura máxima) fica limitada — e isso corta
   similares largos de imediato.

## Fechamento da fase

Devolva um resumo de 3–5 linhas com os seis itens indispensáveis preenchidos e
pergunte se está certo. Diga em uma frase por onde você vai buscar
("vou procurar em Sailboatdata e nos catálogos de estaleiro, veleiros de 28 a 34
pés para navegação costeira") — isso deixa o projetista corrigir o rumo antes de
você gastar a busca.

## Quando o projetista não sabe responder

Ele é inexperiente e o cliente dele pode não ter pensado no assunto. Nunca deixe
a pergunta em aberto e nunca avance com o campo vazio:

1. Explique em uma frase por que aquele item importa.
2. **Proponha** um valor concreto, com justificativa curta.
3. Peça para ele confirmar ou corrigir.

Isso é diferente de inventar dado de fonte. Aqui você está exercendo julgamento de
projeto sobre um requisito — e deixando claro que é sua sugestão, sujeita a
aprovação. Registre no documento final que aquele requisito foi sugerido por você,
não trazido pelo cliente.

## Se ainda não existe caso de uso nenhum

Ofereça duas saídas, nesta ordem:

1. Preencher o Caso de Uso completo primeiro — existe a skill `brana-caso-de-uso`,
   que conduz a entrevista de requisitos inteira em 7 blocos. É o caminho certo.
2. Se ele tem pressa, levantar aqui mesmo os seis itens indispensáveis desta
   página, deixando registrado no documento final que o estudo partiu de um caso
   de uso resumido, não do formulário completo.

O que você não faz é pesquisar sem nenhum dos dois.
