# Fontes de pesquisa de similares

Comece **sempre** por esta lista. São fontes escolhidas pela Brana porque
publicam dimensões, não só fotos e preço.

Regra que atravessa todo este arquivo: os endereços abaixo são pontos de entrada.
Chegue à página do barco **navegando ou buscando**, e cite o link que apareceu de
verdade. Nunca monte a URL do modelo por padrão adivinhado
(ver `regras-fidelidade.md`, regra 3).

## Barcos modernos

### Barcos em geral

| Fonte | Entrada | Serve para |
|---|---|---|
| TheBoatDB | https://theboatdb.com/ | Banco de dados com ficha dimensional de milhares de modelos, motor e vela. Boa primeira parada. |
| itBoat | https://itboat.com/en | Catálogo internacional, forte em iates e lanchas europeias. |
| Revista Náutica | https://nautica.com.br/category/barcos/ | Testes e lançamentos do mercado **brasileiro** — essencial quando o caso de uso é navegação no Brasil. |

### Barcos a vela

| Fonte | Entrada | Serve para |
|---|---|---|
| Sailboatdata | https://sailboatdata.com/ | A referência para veleiros. Traz LOA, LWL, boca, calado, deslocamento, área vélica e as razões já calculadas (SA/D, D/L, Ballast/Displ.). |

### Barcos a motor

| Fonte | Entrada | Serve para |
|---|---|---|
| Bombarco — Raio-X | https://www.bombarco.com.br/editorial/raio-x/ | Raio-X de lanchas do mercado brasileiro, com dimensões e motorização de linha nacional. |

## Barcos tradicionais

| Fonte | Entrada | Serve para |
|---|---|---|
| Herreshoff | https://herreshoff.info/Menu/home_page.htm | Acervo dos projetos Herreshoff — referência clássica de veleiros e botes de linhas tradicionais. |
| ANGE — Embarcações tradicionais | https://www.ange.pt/index.php/arquivo/embarcacoes-tradicionais | Embarcações tradicionais portuguesas: barcos de trabalho, rabelos, catraias. |
| Marinha do Brasil — Coleção Alves Câmara | https://assets.marinha.mil.br/dphdm/sites/www.marinha.mil.br.dphdm/files/livroColecaoAlvesCamara.pdf | Acervo histórico da náutica brasileira. PDF extenso — localize e cite a página. |

## Como escolher a fonte pelo caso de uso

- **Veleiro, qualquer porte** → Sailboatdata primeiro, sempre. Depois o
  estaleiro.
- **Lancha para navegar no Brasil** → Bombarco e Revista Náutica primeiro: as
  motorizações e os preços de linha nacional só aparecem ali.
- **Iate ou lancha importada** → itBoat e TheBoatDB, depois o site do estaleiro.
- **Canoa, saveiro, bote de trabalho, embarcação regional** → Alves Câmara e
  ANGE. Espere ficha incompleta e não complete por analogia.
- **Barco clássico de linhas tradicionais em madeira** → Herreshoff.

## Depois destas fontes

Se a lista não cobriu o caso, amplie — mas mantendo a hierarquia da regra 5 de
fidelidade: **site do estaleiro** antes de portal, portal antes de anúncio de
revenda. Anúncio de venda é a última opção: o vendedor arredonda dimensão e
descreve motor opcional como se fosse de série. Se usar anúncio, diga que é
anúncio.

## Sinais de que a página não serve

- Só tem foto e preço, nenhuma dimensão.
- Lista o "modelo" mas o texto é claramente uma tradução automática de outro
  catálogo, sem indicar a origem.
- Mistura vários modelos da mesma família na mesma tabela sem dizer qual coluna é
  qual.
- Página de agregador que repete o texto de outra sem creditar. Nesse caso, ache
  a original.

## Registro obrigatório por similar

Para cada embarcação aprovada, guarde no JSON de dados:

- Nome exato do estaleiro e do modelo, como publicado.
- Ano do modelo, se publicado.
- Link de **cada** página aberta (podem ser duas ou três por barco).
- Data de publicação de cada página, ou a marca de "sem data identificável".
- Data de acesso (hoje).
- Sistema de unidades da fonte: imperial ou métrico. Isso define em qual aba da
  planilha o dado original entra.
