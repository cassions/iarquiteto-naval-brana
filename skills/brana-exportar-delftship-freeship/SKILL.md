---
name: brana-exportar-delftship-freeship
description: Converte uma tabela de cotas em arquivo .part do FREE!ship (freeship), que abre nele e no DELFTship por File → Import → Part, já com o espelho de popa fechado e as quinas vivas (chine e costado/espelho) marcadas como crease. Use quando pedirem para levar um casco para o DELFTship ou o FREE!ship, exportar .part ou .fbm, importar tabela de cotas ou offsets nesses programas, gerar o casco 3D para rodar hidrostática neles, ou reclamarem que o casco importou com a popa aberta, sem espelho, ou com a quina arredondada. Atende casco quinado (com chine) e de bojo redondo, detectando o formato da própria tabela. A tabela de cotas é obrigatória.
license: Proprietário. Brana · Projetos Navais
compatibility: Requer Python 3.8+ para rodar scripts/gerar-part.py. O .part gerado abre no DELFTship e no FREE!ship (formato partfile versão 21).
metadata:
  brana-categoria: brana
  brana-versao: "1.0"
---

# Exportar casco para DELFTship / FREE!ship

## Duas coisas antes de gerar

**1. A tabela de cotas.** É obrigatória. Sem ela não há casco — não invente balizas
nem use as de `exemplos/` como se fossem do usuário. Se ele não forneceu, peça.

**2. O nome de quem está usando.** Pergunte: *"Qual o nome do projetista, para constar
no arquivo?"* O nome entra no arquivo de saída. Não gere sem perguntar.

## Como gerar

```bash
python scripts/gerar-part.py --tabela=<arquivo> --nome="<projetista>" --saida=<pasta>
```

Opcional: `--projeto=<nome do barco>`, que também entra no nome do arquivo. Sem ele,
o script usa o nome do arquivo da tabela.

Saída: `Casco-<Quinado|Redondo>-<Projeto>-<Nome>.part`.

O script detecta sozinho se a tabela é de casco quinado ou de bojo redondo, aceita
vírgula ou ponto decimal, fecha o espelho de popa e marca as arestas vivas. Ele
imprime seis linhas e é isso que você repassa ao usuário.

## Trabalhe só com o que o script imprime

Esta skill embute um motor geométrico de 21 KB. **É entrada para o script, não leitura
para você.** Abri-lo custa milhares de tokens e não muda nada no que você vai fazer:
você não edita o motor, você o aciona pelo script.

Pela mesma razão, **não abra o .part gerado**. É binário — ler não te diz nada, e o
script já conferiu 16 a 17 propriedades do arquivo antes de gravar. Se alguma tivesse
falhado ele teria saído com erro e não gravado nada. Confie na saída dele: é a
evidência, e é o que você repassa.

Num uso normal você roda um comando e lê seis linhas. Se estiver prestes a usar Read
num arquivo desta skill ou no `.part` gerado, provavelmente algo falhou — e aí o
caminho é `references/solucao-de-problemas.md`, não o arquivo grande.

## O que dizer ao usuário depois

Que importe por **File → Import → Part**, e que a partir daí pode salvar como `.fbm`
pelo próprio programa. Vale mencionar o volume de meio casco que o script imprime:
é o número que ele pode conferir contra a hidrostática do DELFTship.

## Duas regras que evitam retrabalho

**Não reescreva o gerador à mão.** O formato `.part` é binário proprietário; foi
decifrado a partir de um arquivo real e validado por round-trip byte a byte. Qualquer
tentativa de gerar o binário "na unha" vai produzir arquivo que abre errado ou não abre.

**Não gere duas vezes para comparar.** O resultado é determinístico: mesma tabela e
mesmo nome dão o mesmo arquivo.

## Referências

- `references/formato-da-tabela.md` — colunas aceitas nos dois formatos, separador
  decimal, e o que o `.part` não representa.
- `references/solucao-de-problemas.md` — cada mensagem de erro, a causa provável e o
  que fazer.

Leia esses arquivos **quando precisar deles**, não por antecipação.
