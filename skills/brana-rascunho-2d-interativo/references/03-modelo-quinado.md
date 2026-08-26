# Casco quinado (com chine)

Modelo: `assets/modelo-quinado.html`. Saída: `Plano-de-Linhas-Quinado-<Nome>.html`.

## Cinco curvas

| Chave | Vista | O que é |
|---|---|---|
| `planSheer` | planta | meia-boca da borda (aresta do convés) |
| `planChine` | planta | meia-boca do chine |
| `profSheer` | perfil | altura da borda |
| `profChine` | perfil | altura do chine |
| `profKeel`  | perfil | altura da quilha |

Ordem: `['planSheer','planChine','profSheer','profChine','profKeel']`. A baliza em qualquer
estação é a poligonal `quilha → chine → borda`, com dois trechos retos. É isso que faz o
casco ser quinado.

## O chine em planta quase nunca está desenhado

O croqui costuma dar só o contorno do convés na vista superior. Sem a meia-boca do chine
o casco não pode ser seccionado em lugar nenhum além da meia-nau.

**Acrescente a curva**, tirando a proporção da seção mestra desenhada: meça
`meia-boca do chine ÷ meia-boca do convés` na seção e aplique essa razão à borda,
afinando um pouco em direção à proa (na referência: 0,80 no espelho, 0,76 na meia-nau,
0,74 à vante). Ela entra no `ajustar.py` como qualquer outra curva, então as cruzes de
`planChine` no desenho são pontos **reconstruídos**, não leituras — diga isso no registro.

## Restrições próprias deste modelo

Além do alisamento, o motor exige:

```
chine ≤ borda            (em planta)
quilha ≤ chine ≤ borda   (em perfil)
```

## Ângulos que a tabela mostra

- **Ângulo de V** = `atan((z_chine − z_quilha) / y_chine)` — cresce quando a boca aperta
  ou o pontal aumenta, e o número tem de acompanhar o estiramento.
- **Abertura** = `atan((y_borda − y_chine) / (z_borda − z_chine))`.

## Onde as vistas costumam brigar

A altura do chine. No croqui de referência o perfil punha o chine 0,944 quadrado acima
da quilha na meia-nau (V de 28,3°) e a seção desenhada punha 0,759 (23,3°). Alturas vêm
do perfil; a seção reprojetada fica tracejada por cima para a diferença continuar
visível. Relate os dois números.

## O projeto.json deste casco

É o **único** arquivo que você escreve, e você não escreve tudo dele: `ajustar.py
--projeto projeto.json` grava `curvas` e `medidos` sozinho, fundindo com o que já estiver
no arquivo. Não copie a saída dele de volta.

```bash
python scripts/ajustar.py --loa-sq 14 --projeto projeto.json \
    --curva planSheer 0,1.690 2,2.226 4,2.356 6,2.271 10,1.597 14,0 \
    --curva planChine 0,1.352 2,1.751 4,1.822 6,1.726 10,1.198 14,0 \
    --curva profSheer 0,2.55 4,2.36 8,2.34 11,2.50 14,2.95 \
    --curva profChine 0,1.36 3,1.02 6,0.99 9,1.20 14,2.95 \
    --curva profKeel  0,0.62 3,0.14 5.5,0 9,0.22 14,2.95
```

Casco quinado não passa por `homografia.py --secao`: não há família de forma a ajustar, a
baliza sai das cinco curvas. Os três pontos de `secao` você escreve à mão, da seção
reprojetada. O resto do arquivo, também à mão, cabe em poucas linhas:

```json
{
  "casco": "quinado",
  "nome": "Fulano",
  "titulo": "Casco Quinado",
  "loa_m": 6.0, "loa_sq": 14, "balizas": 8, "mid_x": 6,
  "curvas": {
    "planSheer": [[0,1.69,0.37413],[2,2.226,0.16187], ..., [14,0,-0.51462]],
    "planChine": [[0,1.352,0.28025],[2,1.751,0.11875], ..., [14,0,-0.38325]],
    "profSheer": [[0,2.55,-0.06875], ..., [14,2.95,0.20958]],
    "profChine": [[0,1.36,-0.17667],[3,1.02,-0.05],[6,0.99,0.03],[9,1.2,0.11],[14,2.95,0.59]],
    "profKeel":  [[0,0.62,-0.212],[3,0.14,-0.108],[5.5,0,-0.004], ..., [14,2.95,0.96229]]
  },
  "medidos": { "planSheer": [[0,1.69],[2,2.226], ...], "planChine": [...],
               "profSheer": [...], "profChine": [...], "profKeel": [...] },
  "secao": { "keel": [0,0.047], "chine": [1.765,0.806], "deck": [2.34,2.104] },
  "registro": { "calibracao": "…", "notas": ["…"] }
}
```

Os `...` são corte desta página: `curvas` e `medidos` saem inteiros do `ajustar.py`.
Arrays sempre compactos, um ponto por linha no máximo — nunca um número por linha: o mesmo
arquivo custa 383 tokens compacto e 1.001 com `indent=2` explodindo os números.

Obrigatórios: `casco`, `nome`, `loa_m` (metros, informado pela pessoa), `loa_sq`
(quadrados da malha, não metros nem balizas), `balizas`, `mid_x` (a coordenada X da
meia-nau, não o número da baliza) e as cinco `curvas`. `titulo` e `subtitulo` são
opcionais — sem `titulo`, o padrão vem do tipo de casco. Os demais:

| Campo | O que é |
|---|---|
| `medidos` | pontos lidos na foto; viram as cruzes das vistas |
| `secao` | `{ "keel": [0,z], "chine": [y,z], "deck": [y,z] }`: a seção reprojetada e assentada na altura inicial da quilha na meia-nau, tracejada sobre o plano de balizas |
| `registro` | `{ "calibracao": "…", "notas": ["…"] }`. Só fato deste barco |

Nada de `cheia` nem de `alefriz` aqui: são campos de casco sem quina.

Não escreva o que é derivado: `montar.py` e o motor cuidam de rótulos, camadas de
exportação, ordem das curvas, escala, altura dos painéis, limites dos nós, `viewBox`,
espaçamento das balizas e posição dos números. Dois vínculos que ele impõe sozinho:
`fixLast:'both'` crava o último nó das curvas de planta em `(LOA_SQ, 0)` — a proa é um
ponto — e `link:'stem'` faz as três curvas de perfil se encontrarem no topo da roda, de
modo que arrastar uma leva as outras.

## O que escrever no `registro`

Só fato deste croqui. O painel do documento já traz gravada, acima do seu texto, a seção
estática *Como isto é feito*: a homografia e a tolerância de 0,05 quadrado, o alisamento
por convexidade, e por que num casco quinado a baliza sai das cinco curvas em vez de uma
família de forma com expoente a ajustar. Não reescreva nada disso — é idêntico em toda
corrida, e reescrevê-lo é pagar de novo pela mesma prosa.

No `registro` vão: resíduo da calibração; a verificação independente da seção mestra
contra a planta; a briga entre perfil e seção na altura do chine, com os dois números e
qual você adotou; o chine em planta que foi **acrescentado** e não medido; e quanto cada
nó foi deslocado para a curva fechar sem inflexão. Teste cada frase com *"ela seria
idêntica para outro croqui?"* — se for, é método, e método já está no modelo.
