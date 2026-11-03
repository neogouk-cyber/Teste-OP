# Sistematização do projeto — Central da OP 2026 (SME Goiânia)

Documento de referência sobre como o repositório está organizado, como os dados fluem
e o que falta para a versão final. Descreve o estado atual (protótipo).

## 1. Objetivo

Site de consulta das **Orientações Pedagógicas (OP) mensais** da SME Goiânia: agenda por
etapa/perfil, busca, calendário, destaques da rede e exportação de eventos para agenda
(.ics e Google Agenda).

## 2. Estrutura do repositório

| Caminho | Papel |
|---|---|
| `index.html` (~2 MB) | Versão anterior, autônoma (dados embutidos no próprio arquivo). Título: "Orientações Pedagógicas 2026". Não usa `prototipo/`. |
| `prototipo/index.html` | Página de apresentação "Central da OP 2026", com as três propostas de site. |
| `prototipo/v1/index.html` | **Agenda da OP** — proposta 1. |
| `prototipo/v2/index.html` | **Portal da OP** — proposta 2 (usa também destaques do Instagram). |
| `prototipo/v3/index.html` | **Meu mês na rede** — proposta 3 (usa também destaques do Instagram). |
| `prototipo/shared/op-core.js` | Núcleo comum: leitura dos dados, interpretação de datas e responsáveis, cartões, leitor, calendário, busca, exportação `.ics`/Google Agenda, tema e tamanho de fonte. Exposto em `window.OPCore`. |
| `prototipo/shared/brand.css` | Tokens da marca "Prefeitura de Goiânia · Gestão que Resolve" (cores do logotipo) e componentes comuns. |
| `prototipo/data/op2026.js` | Dados das OP 01–09 (≈2 MB), gerados dos PDFs oficiais. |
| `prototipo/data/destaques.js` | Destaques da rede ("Na rede"), formato de exemplo. |
| `prototipo/data/destaques-instagram.js` | Destaques vindos do Instagram (v2 e v3). |
| `prototipo/assets/logo-goiania.jpeg` | Logotipo. |

Cada versão carrega, nesta ordem: `data/op2026.js` → `data/destaques*.js` → `shared/op-core.js`,
e só acrescenta o próprio layout/CSS. Toda a lógica de negócio fica no núcleo.

## 3. Modelo de dados

Globais definidas pelos arquivos de `data/`:

- `window.OP_META` — `{ fonte, atualizado }` (origem e data da última atualização).
- `window.OP_DB` — lista de meses/OPs:
  - `id` (`jan`…), `op` (nº), `name`, `mnum`, `year`, `period`;
  - `sections[]`: `key` (ex.: `ef`), `title`, `color`, `agenda[]`, e `html` do texto completo;
  - `agenda[]`: `action`, `date` (texto livre, ex. `16 e 19/01`), `resp`, `links[]`.
- `window.OP_DESTAQUES` — `titulo, texto, inicio, fim, tipo, cor, arte, link` (+ `foto`, `alt` opcionais).

OPs presentes: 01 Jan, 02 Fev, 03 Mar, 04 Abr, 05 Mai, 06 Jun, 07 Ago, 08 Set, 09 Out
(não há OP de julho, nem de novembro/dezembro ainda).

### Interpretação de campos de texto livre (em `op-core.js`)

- Datas (`parseWhen`, `ranges`, `daysFor`): transformam `"16 e 19/01"`, intervalos etc. em dias reais.
- Responsáveis (`rolesOf`, `matchPerfil`): classificam o texto de `resp` em perfis (`PERFIS`).
- Local (`placeOf`) e rótulos de links (`hostLabel`, `linkLabel`).

> Ponto de atenção: como datas e responsáveis vêm de texto livre extraído de PDF, cada nova OP
> deve ser conferida contra o PDF (formatos novos de data podem não ser reconhecidos).

## 4. Configuração e atualização (hoje x versão final)

`op-core.js` aceita `window.OP_CONFIG` com:

- `dataUrl` — JSON gerado a partir do Google Drive (Apps Script ou GitHub Action);
- `destaquesCsv` — planilha "Destaques" publicada como CSV
  (colunas: `titulo, texto, inicio, fim, tipo, link, imagem`);
- `siteUrl` — padrão `https://neogouk-cyber.github.io/Teste-OP/`.

**Hoje:** ambos vazios; o site usa a cópia local de `data/`.
**Versão final prevista:** equipe da SME publica o PDF no Drive e edita a planilha de destaques;
um processo automático regera `op2026.js`/JSON e o site passa a ler a fonte remota.

Modo de apresentação: `?hoje=AAAA-MM-DD` simula a data atual (ex.: `?hoje=2026-10-20`).

## 5. Fluxo de atualização mensal (proposto)

1. SME publica o PDF da nova OP no Drive.
2. Processo automático extrai o PDF → atualiza `OP_DB` / `OP_META.atualizado`.
3. Equipe edita a planilha de destaques (uma linha por destaque, com início/fim).
4. Site publicado (GitHub Pages) reflete os dados novos.
5. Conferência humana rápida: datas, responsáveis e links da OP nova.

## 6. Pendências para a versão final

- [ ] Escolher uma das três propostas (v1, v2 ou v3) e descartar/arquivar as demais.
- [ ] Decidir o destino do `index.html` da raiz (substituir pela versão escolhida ou removê-lo).
- [ ] Implementar o gerador de dados (PDF/Drive → JSON) e preencher `dataUrl`.
- [ ] Publicar a planilha de destaques como CSV e preencher `destaquesCsv`.
- [ ] Definir responsável e rotina mensal de atualização/conferência.
- [ ] Reduzir o peso de `op2026.js` (≈2 MB) se o público usar redes móveis lentas.
- [ ] Revisar licença/uso das imagens de destaques vindas do Instagram.
