# Estrutura do formulário Caso de Uso

Ordem, títulos e campos do documento final. Corresponde a `assets/Caso_de_Uso_Formulario_embranco_v2.docx`. As chaves entre colchetes são as usadas no JSON de entrada do `scripts/gerar_documento.py`.

## Instruções (texto fixo, copiado no topo do documento)

> Despenda algum tempo refletindo sobre os requisitos e uso da embarcação a ser desenvolvida. Uma embarcação é uma solução de compromisso entre requisitos conflitantes, este questionário irá nos ajudar a priorizar estas demandas. Lembre que um barco precisa de uma missão, tarefa ou propósito a ser cumprido, este será nosso norte nas escolhas de projeto.

## Caso de Uso

### Missão
- Qual o uso principal da embarcação? (lazer, esporte, transporte de carga, transporte de passageiros, pesca esportiva, pesca profissional ou outro) `[uso_principal]`
- Qual o papel mais importante este barco precisa cumprir? `[papel_principal]`

### Perfil do Usuário
- Usuário principal (faixa etária, gênero, limitações físicas, outras informações relevantes) `[usuario_principal]`
- O usuário principal é também o proprietário? `[usuario_e_dono]`
- O que o usuário principal ou capitão mais gosta com relação a navegar — durante o caminho `[gosta_caminho]`
- — enquanto parado `[gosta_parado]`
- Outras coisas o usuário ou capitão deseja desta embarcação `[outros_desejos]`
- Quem irá pilotar a embarcação? (proprietário ou marinheiro profissional) `[quem_pilota]`
- Haverá pernoite? Para quantas pessoas? `[pernoite]`
- Usuários em potencial (demais pessoas que utilizarão a embarcação) `[usuarios_potenciais]`
- Tipo de grupo (amigos, família, pesca profissional, turismo, passageiros) `[tipo_grupo]`
- Número médio de tripulantes `[tripulantes_medio]`
- Número máximo de tripulantes (dia) `[tripulantes_max_dia]`
- Número máximo de tripulantes (pernoite) `[tripulantes_max_pernoite]`
- Local de residência do usuário principal `[residencia]`
- Tipo de casa `[tipo_casa]`
- Média anual de dias utilizando embarcação `[dias_ano]`
- Média anual (dias) de uso contínuo `[dias_continuos]`

### Área de Navegação
- Região `[regiao]`
- Derrota habitual — ponto inicial, ponto final, distância `[derrota]`
- Pontes e eclusas no trajeto `[pontes_eclusas]`
- Clima `[clima]`
- Vento/ondas `[vento_ondas]`
- Regime de chuvas `[chuvas]`
- Variação de maré `[mare]`
- Há restrição de calado? Qual o calado máximo? `[restricao_calado]`
- Informações relevantes/restrições `[restricoes_gerais]`
- Operação — tempo `[tempo_operacao]`
- Travessias (distância máxima) `[travessia_max]`

### Orçamento
- Orçamento total para construção/aquisição `[orcamento_total]`
- Capacidade de desembolso mensal `[desembolso_mensal]`
- Orçamento anual para manutenção/melhorias `[orcamento_manutencao]`
- Mantido por (marinheiro? proprietário?) `[mantido_por]`

### Construtor
- Construtor/Estaleiro `[construtor]`
- Tipo de construtor (amador, artesanal, profissional) `[tipo_construtor]`
- Experiência do construtor/estaleiro `[experiencia_construtor]`
- Material de construção `[material]`
- Método de construção `[metodo_construcao]`
- Faixa de tamanho em que tem experiência `[faixa_tamanho_experiencia]`
- Tipo de embarcação em que tem experiência `[tipo_embarcacao_experiencia]`

### Outros Requisitos
- Propulsão principal (remo, vela ou motor) `[propulsao]`
- Motorização (popa, centro, centro-rabeta, potência, combustível) `[motorizacao]`
- Armação (apenas veleiros: Sloop, Ketch, Cutter, Gaff, Schooner, Catboat, Yawl) `[armacao]`
- Requisitos de performance `[performance]`

### Dimensões Principais (proposta do arquiteto naval, confirmada pelo projetista)
- Comprimento (LOA) `[loa]`
- Boca (BOA) `[boca]`
- Pontal `[pontal]`
- Calado `[calado]`
- Justificativa das dimensões `[justificativa_dimensoes]`

## Rodapé de identificação
- Projetista `[projetista]`
- Data de preenchimento `[data]`

Campos sem resposta são escritos como `N/A`.
