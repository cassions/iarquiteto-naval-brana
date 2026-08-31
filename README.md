# iarquiteto-naval-brana

Ferramenta de apoio ao projeto de embarcações de esporte e recreio com IA. Skills de arquitetura naval em português.

## Skills

| Skill | O que faz |
|---|---|
| `brana-caso-de-uso` | Entrevista guiada, item a item, para levantar os requisitos de projeto de uma embarcação e gerar o formulário de Caso de Uso preenchido. |
| `brana-estudo-similar` | Pesquisa embarcações reais da mesma missão e porte, coleta as dimensões com fonte citada, monta a planilha comparativa e gera o documento "Estudo de Similar". |
| `brana-arranjos-similares` | Reúne no mínimo 10 arranjos gerais publicados (planta baixa, layout de convés) dos barcos similares e monta a apresentação em PDF. Exige o Caso de Uso e o Estudo de Similar. |
| `brana-area-navegacao` | Gera o PDF de Área de Navegação (bloco 3 do Caso de Uso) para a derrota entre dois pontos do Brasil: cartas da Marinha, distância, rumo, tempos, clima, maré, calado e classificação NORMAM e ISO. |
| `brana-rascunho-2d-interativo` | Transforma a foto de um croqui em papel quadriculado — com TOP, SIDE e MIDSHIP — em plano de linhas interativo em HTML, corrigindo a perspectiva e digitalizando as cotas. |
| `brana-plano-linhas` | Plano de linhas em PDF, duas folhas A3: perfil, topo e plano de balizas com a malha, cotas de LOA, LWL e balanços, e a tabela de cotas. |
| `brana-casco-3d-interativo` | Visualizador 3D do casco (HTML único, offline) a partir da tabela de cotas, com hidrostática ao vivo, espelho de popa por plano de corte ajustável e curva de áreas. |
| `brana-casco-planificado` | Abre o casco em chapa plana: relatório HTML interativo e PDF vetorial de corte, com as peças planificadas e os gabaritos das balizas sobre malha quadrada. |
| `brana-pesos-trim-banda` | Painel de pesos e centros (HTML único, offline): a pessoa leva pesos a bordo e o casco encontra a posição em que flutua — trim, banda, calados, borda livre, GM e curva de braços de endireitamento. |
| `brana-estimativa-velocidade` | Painel de estimativa de velocidade e potência (HTML único, offline) pelas fórmulas de Dave Gerr, conferidas contra o método de John Teale. Cobre deslocamento, semi-planeio e planeio. |
| `brana-exportar-delftship-freeship` | Converte a tabela de cotas em arquivo `.part` do FREE!ship, que abre nele e no DELFTship, já com o espelho de popa fechado e as quinas marcadas como crease. |

## Estrutura

```
iarquiteto-naval-brana/
├── plugin.json                 # Agent Plugins v1.0.0 (Hermes, Codex, VS Code, Cursor…)
├── .claude-plugin/
│   ├── plugin.json             # manifesto do plugin para Claude Code / Claude.ai
│   └── marketplace.json        # catálogo — aponta para a própria raiz ("./")
└── skills/
    └── brana-caso-de-uso/
        ├── SKILL.md
        ├── references/
        ├── scripts/
        └── assets/
    └── ...
```

A raiz do repositório **é** o plugin nos dois padrões. Os dois manifestos convivem sem conflito: cada cliente lê o seu e ignora o outro.

## Instalação

### Hermes

Como plugin (recomendado — pega todas as skills e recebe atualizações):

```bash
hermes plugins install cassions/iarquiteto-naval-brana
```

### Claude Code

```bash
claude plugin marketplace add cassions/iarquiteto-naval-brana
claude plugin install iarquiteto-naval-brana@brana-naval
```

### Claude.ai e Cowork

Menu Customize → aba Plugins → Personal plugins → "+" → Add marketplace → cole a URL do repositório.

### Outros clientes (VS Code, Codex, Cursor)

Leem o `plugin.json` da raiz pelo padrão Agent Plugins 1.0. Descobrem as skills sozinhos em `skills/`.

## Atualizações

### Hermes

Executar:

```bash
hermes plugins update iarquiteto-naval-brana
```

### Claude

```bash
claude plugin update iarquiteto-naval-brana
```

No Claude.ai a atualização entra na próxima sessão, não no meio de uma conversa em andamento.

