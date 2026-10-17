# Design System do SubManager

Fonte única de cor, tipografia, espaço, forma, movimento e componentes. O código aqui é a fonte oficial; o catálogo publicado como artefato serve para revisar no celular.

- `tokens.css`: único lugar com valores literais de cor, tamanho de fonte, sombra e duração.
- `components.css` e `index.jsx`: componentes base, que só usam variáveis de `tokens.css`.
- `Catalog.jsx`: catálogo vivo, só no build de e2e (botão "Abrir catálogo").
- Guardrail: `src/lib/design-tokens.test.js` falha quando um CSS fora de `tokens.css` tem cor hexadecimal ou tamanho de fonte (inclui o atalho `font:`). Arquivos ainda por migrar ficam na lista `EXCECOES` do teste; a lista só encolhe e chega a zero em D5.

## Regra de ouro

Valores visuais só em `src/design/tokens.css`. Componente novo usa `var(--...)`; se faltar um token, crie-o em `tokens.css`.

## Tokens

- **Cor, por função:** `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-focus`, `--color-text`, `--color-text-muted`, `--color-action`, `--color-danger`, `--color-warning`, `--color-success`. Os nomes antigos (`--bg`, `--surface`, `--text`, `--accent`) seguem valendo até o fim de D4.
- **Tipografia:** `display` 56px (número de destaque), `title-lg` 28px (nome do serviço), `title` 18px (título de seção), `body` 17px (campos e textos), `label` 13px (rótulos, muted), `caption` 12px (ajuda). Use os atalhos `font: var(--text-body)` etc. Peso 500 no corpo e nos campos, 600 nos títulos. Espaçamento entre letras: `--letter-spacing-title` (-0.04em) e `--letter-spacing-field` (-0.01em).
- **Espaço:** `--space-1` a `--space-8` = 4, 8, 12, 16, 20, 24, 32, 40.
- **Forma:** `--radius-control` 12 (controles), `--radius-card` 16 (cards), `--radius-screen` 24 (telas e diálogos).
- **Toque:** `--touch-min` 44px para qualquer alvo; `--field-height` 52px para campos. Campos com 16px ou mais, sempre (abaixo disso o iPhone dá zoom).
- **Movimento:** `--motion-screen` 250ms para entrar e sair de telas; `--motion-fast` 150ms. Ambos viram 0 com `prefers-reduced-motion`.
- **Elevação e camadas:** sombra só em toast e overlay (`--shadow-overlay`). `--z-base` 0, `--z-sticky` 1, `--z-detail` 200, `--z-sheet` 300, `--z-confirm` 350, `--z-toast` 400.

## Componentes (`import { ... } from '../design/index.jsx'`)

| Componente | Quando usar |
| --- | --- |
| `Button` | Ação. `variant`: `primary`, `secondary`, `ghost`, `danger` (zona de risco). `size`: `md` ou `sm`. Com `href` vira link em bloco. |
| `EditableHero` | Nome e valor: texto grande com lápis; tocar abre o editor (`onEdit`). |
| `SettingRow` / `SettingList` | Rótulo, valor e chevron. Com `switchChecked`, variante com switch. |
| `Field` | Campo com rótulo e uma ajuda. `prefix="R$"` para valores, `type="search"` para busca. |
| `OptionList` | Escolha única, no lugar do select nativo. |
| `Switch` | Sim ou não. Precisa de nome acessível. |
| `Chip` | Filtro ou escolha múltipla (categorias, pessoas), com `aria-pressed`. |
| `ItemCard` | Item de lista (assinatura): nome, linha de detalhes e valor. |
| `Banner` | `offer` (neutro) ou `alert` (cor de aviso, `role="alert"`). |
| `StatusBadge` | `automatic`, `estimated`, `late`, `paused`, `cancelled`. Sempre com texto. |
| `SectionTitle` | Título de seção (não é rótulo de campo). |
| `EmptyState` | Lista ou tela sem conteúdo, com uma ação opcional. |
| `FieldEditor`, `OptionEditor`, `EditorSheet` (`Editors.jsx`) | Folha que abre ao tocar num herói ou linha. `FieldEditor`: texto, número ou dinheiro (`prefix="R$"`), com `validate`; Pronto ou Enter salva, Cancelar, Esc, toque fora e o Voltar do sistema descartam. `OptionEditor`: escolher uma opção salva e fecha. |
| `DetailScreen`, `ConfirmDialog`, `Toast` | Componentes do app, reexportados aqui. |

Exemplo:

```jsx
<EditableHero label="Serviço" value={form.name} onEdit={() => setEditing('name')} />
<SettingList>
  <SettingRow label="Cobrança" value="Mensal" onClick={() => setEditing('cycle')} />
  <SettingRow label="Cobrança automática" switchChecked={form.autoCharge} onSwitch={setAutoCharge} />
</SettingList>
```

## Diretrizes de uso

- **Título de seção sem repetição:** o título de uma seção não vira também rótulo de um campo dentro dela (nada de "Serviço" como título e como rótulo).
- **Ordem de ações na tela da assinatura:** bloco de status (pausar e cancelar), depois a edição, depois as secundárias, e por último a destrutiva, separada por uma linha (zona de risco).
- Botões com verbo no infinitivo. Uma ajuda por controle. Valores em R$ com vírgula e "por mês" explícito.
- Ação destrutiva sempre na zona de risco, com confirmação.
- Foco: campos mostram só a borda; botões e links mantêm o `:focus-visible`. Em tela de toque, a tela abre com o foco no ←, nunca num campo.
- Status nunca depende só de cor: use `StatusBadge` (texto) ou ícone.

## Anti-padrões

- Campo sempre aberto para dado que quase não muda (nome, valor mensal).
- Select nativo (no iOS abre a roda do sistema e não acompanha o estilo).
- Título de seção com a mesma aparência de rótulo de campo.
- A mesma informação dita duas ou três vezes na mesma tela.
- Ação destrutiva ao lado ou logo abaixo da ação principal.
- Cancelar e remover com o mesmo peso visual ou o mesmo tipo de confirmação.
- Foco automático em campo quando a tela abre por toque.
- Campo com fonte menor que 16px.
- Dois contornos de foco no mesmo campo.
- Link com classe de botão sem `display: block` (o `<a>` ignora a largura).
- Pedido de permissão de notificação em mais de um lugar.
- Rótulo com parênteses empilhados, como "Teto mensal (sua parte) (R$)".
- Botão "Salvar" global para telas diferentes.
- Cor como único indicador de status.
- Diálogo dentro de diálogo.
- Valores fixos em componentes (cor, tamanho ou sombra fora de `tokens.css`).
