# iarquiteto-naval-brana

Ferramenta de apoio ao projeto de embarcações com IA. Skills de arquitetura naval em português.

## Skills

| Skill | O que faz |
|---|---|
| `brana-caso-de-uso` | Entrevista guiada, item a item, para levantar os requisitos de projeto de uma embarcação e gerar o formulário de Caso de Uso preenchido. |
| `brana-estudo-similar` | Entrevista guiada, para criar estudo de similar com base no caso de uso. |

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

Como tap (recomendado — pega todas as skills e recebe atualizações):

```bash
hermes skills tap add cassions/iarquiteto-naval-brana
hermes skills install brana-caso-de-uso
```

O tap assume o caminho `skills/` por padrão, que é o que este repositório usa.

Uma skill só, sem assinar o repositório inteiro:

```bash
hermes skills install cassions/iarquiteto-naval-brana/skills/brana-caso-de-uso
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

Quem instalou recebe a nova versão quando o campo `version` sobe. Fluxo ao editar uma skill:

1. Edite os arquivos em `skills/<skill>/`.
2. Suba o `version` em **`plugin.json`**, em **`.claude-plugin/plugin.json`** e na entrada de `marketplace.json` — os três precisam bater.
3. Commit e push.

Se você omitir `version` num plugin servido por git, o SHA do commit vira a versão e todo push vai para os usuários — inclusive commit pela metade. Por isso os três arquivos declaram versão explícita.

Do lado de quem usa:

```bash
hermes skills update brana-caso-de-uso
claude plugin update iarquiteto-naval-brana
```

No Claude.ai a atualização entra na próxima sessão, não no meio de uma conversa em andamento.

## Versionamento

SemVer. `1.0.0` → `1.0.1` para correção de texto, `1.1.0` para pergunta ou seção nova, `2.0.0` se mudar a estrutura do documento gerado.
