# Exemplos de entrada e de saída

Três tabelas prontas, cobrindo os dois tipos de casco e as três maneiras de resolver o
espelho. Rode de dentro de `exemplos/` (ou aponte o caminho) trocando o nome pelo seu.

## 1. Casco quinado, espelho reto

A tabela **não declara** espelho. O script recusa sem decisão explícita; depois de confirmar
com o usuário, rode com `--espelho-reto`.

```bash
node ../scripts/gerar-plano-linhas.js --tabela=casco-quinado-6m.txt --nome="Ana Ribeiro" --espelho-reto
```

Sai `Casco-Quinado-6m-Plano-de-Linhas-Ana-Ribeiro.pdf`, 1:25.
LOA 6.000 · LWL 4.959 · BOA 2.012 · BWL 1.140 · balizas 0..12 a 500 mm ·
planos do alto 300/600/900 · balanços nulos nos dois extremos.

## 2. Casco quinado, espelho a 12° declarado na tabela

A tabela traz `# espelho: 12 graus da vertical`, então o ângulo já está resolvido e nada
precisa ser passado na linha de comando.

```bash
node ../scripts/gerar-plano-linhas.js --tabela=casco-quinado-6m-espelho12.txt --nome="Ana Ribeiro"
```

Sai `Casco-Quinado-6m-Espelho-12g-Plano-de-Linhas-Ana-Ribeiro.pdf`, 1:25.
LWL cai para 4.856 (a baliza 0 sai de x=0 para x=103), balizas 0..11 a 500 mm,
balanços de 103 mm a popa e 397 mm a proa.

O mesmo resultado sai da tabela sem declaração com `--espelho=12`.

## 3. Casco de bojo redondo, espelho a 5°

Formato redondo com 3 níveis intermediários (25%, 50%, 75%) e vírgula decimal.

```bash
node ../scripts/gerar-plano-linhas.js --tabela=casco-redondo-6m-espelho5.txt --nome="Cássio Brana"
```

Sai `Casco-Redondo-6m-Espelho-5g-Plano-de-Linhas-Cassio-Brana.pdf`, 1:25.
LOA 6.000 · LWL 4.626 · BOA 2.073 · BWL 1.614 · balizas 0..13 a 450 mm ·
treze linhas d'água (0 a 1.200) · balanços de 52 e 98 mm.

## Como o nome do arquivo se forma

`<Tabela>-Plano-de-Linhas-<Nome>.pdf`, com o nome da tabela capitalizado. Qualquer
`espelhoNN` do nome da tabela é **descartado** e o sufixo `-Espelho-NNg` é recolocado a
partir do ângulo **efetivamente desenhado** — assim `--espelho=12` sobre uma tabela chamada
`...espelho5` sai como `...Espelho-12g`, sem mentir e sem sobrescrever o PDF de 5 graus.
Espelho reto não leva sufixo. Acentos do nome da pessoa são removidos; se o arquivo já
existir, o script acrescenta `-2` em vez de sobrescrever. `--saida` sobrepõe tudo isso (e o
resumo avisa se o nome da pessoa ficar de fora).

## Referência de saída

Os três PDFs deste projeto foram gerados com estas mesmas tabelas, sem o sufixo do nome:
`Casco-Quinado-6m-Plano-de-Linhas.pdf`, `Casco-Quinado-6m-Espelho-12g-Plano-de-Linhas.pdf`
e `Casco-Redondo-6m-Espelho-5g-Plano-de-Linhas.pdf`. Servem de referência de layout: as
folhas geradas pela skill são idênticas a elas, salvo o nome no arquivo e a linha de
subtítulo do selo, que passa a citar quem desenhou.
