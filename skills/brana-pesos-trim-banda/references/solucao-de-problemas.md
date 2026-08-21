# Solução de problemas

O gerador recusa em vez de gravar um painel errado. Toda recusa sai como
`RECUSADO: <motivo>` e devolve código de saída 1. Abaixo, o que cada mensagem quer
dizer.

## Recusas de argumento

**`falta --tabela=...`**
A tabela de cotas é obrigatória. Se a pessoa colou a tabela no chat, grave o texto num
`.txt` e aponte para ele. Não use os arquivos de `exemplos/` como se fossem o casco
dela — eles são outros barcos.

**`falta --nome="<projetista>"`**
Pergunte o nome de quem está usando. Vai para o título, o rodapé, o autor da página e
o nome do arquivo.

**`não encontrei a tabela em <caminho>`**
Caminho errado, ou o arquivo foi gravado em outra pasta. Em Windows, caminho com espaço
precisa de aspas: `--tabela="C:\Meus Cascos\tabela.txt"`.

**`argumento não reconhecido`**
Só existem `--tabela`, `--nome`, `--saida`, `--calado` e `--ajuda`. O formato é
`--chave=valor`, com sinal de igual.

**`--calado precisa ser um número em milímetros`**
Em milímetros, não em metros: `--calado=369`, não `--calado=0.369`.

**`o nome do projetista ficou vazio depois de tirar os caracteres...`**
O nome era só pontuação proibida em nome de arquivo (`< > : " / \ | ? *`). Acento,
espaço e hífen podem.

## Recusas de tabela

**`o arquivo está vazio` / `não tem número nenhum`**
Provavelmente foi gravado o texto errado, ou a tabela ficou como imagem. Precisa ser
texto com números.

**`sao necessarias ao menos 3 balizas; encontrei N`**
Com duas balizas não há forma longitudinal. Se a tabela tem mais linhas do que isso,
elas foram descartadas por não parecerem numéricas — confira separador de coluna
(tabulação ou espaços) e se cada linha tem o mesmo número de colunas.

**`a baliza N tem X colunas, as outras tem Y`**
Uma linha ficou com coluna a mais ou a menos. Célula vazia no meio costuma ser a causa.

**`formato quinado pede 7 colunas; a baliza N tem X`**
O cabeçalho indicou quinado mas falta coluna. Ordem certa:
`stn x sheer_hb chine_hb sheer_ht chine_ht keel_ht`.

**`duas balizas na mesma posicao x`**
Duas linhas com o mesmo `x`. Corrija ou remova uma.

**`valor nao numerico em ... na baliza N`**
Célula com texto onde devia ter número. Cuidado com `-` usado como "sem valor".

**`a geometria saiu degenerada: comprimento ... boca ... pontal ...`**
Quase sempre **unidade**: a tabela veio em metros. As cotas são em milímetros —
`6000`, não `6.0`.

**`no calado de partida o casco não desloca volume nenhum`**
Só acontece com `--calado` abaixo do fundo da quilha. Tire o argumento e deixe o padrão
de 41% do pontal.

## Avisos (não são recusa)

`chine fora da borda`, `quilha acima do chine`, `chine acima da borda`, `quilha acima
da borda`, `meia-boca negativa` — a tabela foi aceita e o painel foi gerado. Diga à
pessoa qual baliza e deixe ela decidir se corrige: às vezes é intencional (borda
tombada), às vezes é dígito trocado.

## Recusas de montagem

**`o núcleo não carregou` / `não achei o marcador da tabela`**
Ativo de `assets/` corrompido ou faltando. Confira se a pasta veio inteira:
`pagina.html`, `nucleo.js`, `painel.js`, `brana-logo.txt`.

**`o arquivo não passou nas verificações`** seguido da lista
Sai com o nome de cada verificação que falhou. `ids sem alvo` significa que o modelo e
o renderizador estão em versões diferentes — a pasta veio misturada com outra cópia da
skill.

## Depois de gerar, no navegador

**A página abre sem o casco, com aviso vermelho.**
Navegador sem WebGL, ou aceleração desligada. As leituras de equilíbrio, os dois
diagramas 2D e a curva de braços continuam funcionando; só o 3D não desenha.

**"Copiar condição" não copia.**
Alguns navegadores bloqueiam a área de transferência em página aberta como arquivo
local. O botão tenta duas rotas; se as duas falharem, ele diz na barra do palco e joga
o texto no console do navegador (F12), de onde dá para copiar à mão.

**O casco aparece capotado ao abrir.**
Não deveria: o painel parte com o peso pousado sobre o CG do barco, a prumo. Se
acontecer, o aviso vermelho no alto explica — é sinal de que a tabela descreve um casco
sem estabilidade inicial no calado de partida (muito estreito, ou pontal grande com
fundo em V profundo). Gere de novo com `--calado` maior.

**Quero mudar o peso do barco, e não o calado.**
Não precisa gerar de novo: a primeira linha da tabela de pesos é o barco, e ela é
editável — massa e as três coordenadas do CG.
