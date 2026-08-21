---
name: brana-plano-linhas
description: Gera o plano de linhas de um casco em PDF, duas folhas A3 na identidade Brana: perfil, TOPO e plano de balizas com a malha de balizas, linhas d'água e planos do alto, cotas de LOA, LWL e balanços, e a tabela de cotas. Serve casco quinado (com chine) e de bojo redondo. Use quando pedirem plano de linhas, lines plan, desenhar as linhas do casco, plano de balizas, ou tabela de offsets em PDF. Exige a tabela de cotas e o ângulo do espelho de popa.
license: Proprietário — Brana · Projetos Navais
metadata:
  category: brana
  version: 1.1.0
  requisitos: Node.js 18+ no PATH. Sem dependências externas.
---

# Plano de linhas em PDF

Um comando gera as duas folhas e já se confere. **Não leia os arquivos de `scripts/`** —
o resumo impresso traz tudo o que você precisa saber.

## Três coisas antes de rodar

**1. A tabela de cotas — obrigatória.** Se o usuário colou a tabela na conversa, salve-a
como `.txt` **antes** de rodar, preservando as linhas de comentário que começam com `#`.
Dê ao arquivo um nome descritivo (`casco-quinado-6m.txt`): ele vira o começo do nome do PDF.

Colunas separadas por tabulação ou espaços, nunca por `|`, e todas as balizas com o mesmo
número de colunas. Quinado: `stn x sheer_hb chine_hb sheer_ht chine_ht keel_ht` (uma oitava
coluna é ignorada). Redondo: `baliza x altura_quilha altura_borda <níveis...> meia_boca_borda`.
Alturas acima da linha de base, meias-bocas do CL, em milímetros.

**2. O nome de quem está usando — obrigatório.** Pergunte se não souber. Ele entra no nome
do arquivo de saída e no selo do desenho.

**3. O ângulo do espelho de popa — obrigatório.** Três caminhos:

- o usuário informa o ângulo → `--espelho=<graus>`;
- a tabela já traz `# espelho: <graus> graus da vertical` → rode **sem** a flag;
- o usuário não tem o ângulo → **confirme com ele, em palavras, que o plano será gerado com
  o espelho reto na última baliza a ré, exatamente como a tabela de cotas dá**, e só então
  rode com `--espelho-reto`. Essa flag é a sua declaração de que a confirmação aconteceu.

Sem nenhum dos três o script se recusa a gerar. Não é escolha cosmética: inclinar o espelho
move a baliza 0, encurta o LWL, muda o espaçamento das balizas e cria os balanços de popa e
de proa.

O ângulo é medido **da vertical**, positivo quando o topo cai para ré (o usual). O topo do
espelho fica ancorado na abscissa da última baliza a ré, o que preserva o comprimento total
que a tabela declara.

## Rodar

```bash
node scripts/gerar-plano-linhas.js --tabela=casco.txt --nome="Nome Sobrenome" --espelho=12
```

```bash
node scripts/gerar-plano-linhas.js --tabela=casco.txt --nome="Nome Sobrenome" --espelho-reto
```

Opcionais: `--saida=arq.pdf`, `--titulo="..."`, `--sub="..."`, `--escala=25`. Sem `--escala`,
o script usa a maior escala normalizada que couber na folha A3.

O PDF sai como `<Tabela>-Plano-de-Linhas-<Nome>.pdf` no diretório atual, com o sufixo
`-Espelho-<N>g` quando o espelho é inclinado.

## Depois de rodar

O resumo dá arquivo, escala, casco, espelho, LOA/LWL/BOA/BWL, a malha, os balanços e o
número de checagens. Repasse isso ao usuário e entregue o PDF.

- Linhas começando com `atenção` são achados reais do casco (baliza que colapsa na roda,
  linha d'água fora do casco): mencione-as.
- `ATENÇÃO a tabela é suspeita` indica provável troca de colunas: pare e confira com o
  usuário antes de entregar.
- Se o resumo disser `REPROVADO NA CONFERENCIA`, **não entregue o PDF** (ele fica salvo como
  `.INVALIDO.pdf`): as causas estão em `references/solucao-de-problemas.md`.

## O que o desenho traz

Folha 1: PERFIL, TOPO e PLANO DE BALIZAS, mais os quadros de convenção das linhas e de
notas. Folha 2: a tabela de cotas nas balizas do plano, em milímetros inteiros, e as notas.

A malha sai destas regras, sempre:

| | |
|---|---|
| Linha de base | tangente ao ponto mais baixo da quilha |
| DWL | 300 mm acima da base |
| Linhas d'água | 300/3 = 100 mm, múltiplo de 50, contadas a partir da DWL |
| Baliza 0 | onde a DWL encontra o fundo do casco no CL, a ré |
| Balizas | LWL/10, múltiplo de 50 mm, positivas para vante |
| Planos do alto | BOA/6, múltiplo de 100 mm, a partir do CL |

Perfil, TOPO, plano de balizas e a tabela saem todos da **mesma superfície** — as três
vistas e os números concordam a menos de 20 µm de papel.

## Só leia se precisar

- `references/formato-da-tabela.md` — a tabela não foi aceita, ou o usuário pergunta o
  formato aceito.
- `references/solucao-de-problemas.md` — o script falhou, ou o desenho saiu estranho.
- `exemplos/` — três tabelas prontas com as saídas que produzem.
