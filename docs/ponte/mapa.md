# Mapa do repositório SubManager

Mantido pelo Code. Atualize quando pastas, arquivos-chave ou o lugar de regras e testes mudarem, no mesmo ciclo da mudança. `docs/` fica fora do Git; o mapa não é visto pelo CI.

Use este mapa para localizar arquivos antes de abri-los. Não explore o repositório para achar o que está aqui.

## Comandos
- `npm run dev` | `npm run lint` | `npm test` (node --test em `src/lib/*.test.js`) | `npm run build` | `npm run test:e2e` (Playwright, desktop e Pixel 7)

## Raiz e infraestrutura
- `index.html`: meta viewport (sem bloqueio de zoom)
- `vite.config.js`, `vercel.json`, `eslint.config.js`, `playwright.config.js`
- `.github/workflows/ci.yml`: jobs `changes` (calcula a seleção), `unit-and-build` (lint, testes unitários selecionados, build) e `e2e`. `lint` não é um check separado: roda dentro de `unit-and-build`. Sem `paths:`; jobs pulados por `if`. Push na `main` roda tudo
- `scripts/affected-tests.js`: seleção de testes afetados (imports para unitários; `scripts/e2e-map.json` para e2e). Testado em `src/lib/affected-tests.test.js`. Spec nova do e2e entra no `e2e-map.json`, senão o teste falha
- `CLAUDE.md`: regras do projeto. Não duplicar regras aqui
- `docs/`: fora do Git. Histórico de sprints em `docs/ponte/sprints/`

## Entrada e PWA
- `src/main.jsx`: entrada. Registra o service worker e a analytics, e carrega os CSS (`design/tokens.css`, `design/components.css`, `styles.css`)
- `src/App.jsx`: raiz do app
- `public/sw.js`: service worker (rede primeiro, cache offline, clique em notificação). Também `public/manifest.webmanifest` e `public/icons/`

## Telas (`src/components/`)
- `Home.jsx`: Portfólio (saudação, hero, cards com "Paguei", ordenação por urgência)
- `SubModal.jsx`: cadastro e edição em passos, como tela de detalhe. `StatusBlock` para pausar e cancelar
- `DetailScreen.jsx`: tela de detalhe (← no topo, Esc, Voltar do sistema). Conferir o comportamento de foco
- `Discover.jsx`: aba Descobrir (catálogo e busca)
- `Historico.jsx`: histórico e indicadores, usado no Portfólio e no Orçamento
- `Onboarding.jsx`, `BottomNav.jsx`, `Toast.jsx`, `ConfirmDialog.jsx` (diálogo próprio), `Logo.jsx`, `AppBrand.jsx`
- `PullIndicator.jsx`: indicador de puxar para atualizar
- `TestScreen.jsx`: só no build de e2e
- `Profile.jsx`: hub do Perfil
- `profile/`: `Orcamento.jsx`, `Divisao.jsx`, `PersonSheet.jsx` (pessoa), `ContactReview.jsx` (revisão do .vcf), `MeuPerfil.jsx`, `Notificacoes.jsx`, `DadosPrivacidade.jsx`, `Sobre.jsx`, `ProfileScreens.jsx`

## Design (`src/design/`)
- `tokens.css`: único lugar com valores visuais. Vigiado por `src/lib/design-tokens.test.js`
- `components.css`, `index.jsx` (componentes e `STATUS_LABELS`), `Editors.jsx` (editor de campo), `Catalog.jsx`, `README.md` (diretrizes)

## Hooks (`src/hooks/`)
- `useStore`: estado e cobranças automáticas
- `useToday`: muda quando o dia vira ou o app volta ao primeiro plano
- `useScreenStack`: telas empilhadas no histórico do navegador
- `usePullToRefresh`: puxar para atualizar (lógica em `lib/pull.js`)
- `useFocusTrap`: foco em diálogos e telas
- `useDueNotifications`, `useCompanySearch`, `useInstallPrompt`, `useNotificationPermission`

## Lógica pura (`src/lib/`, cada módulo com `*.test.js` ao lado)
- Datas: `dates.js` (datas locais, `dueStatus`, regra do "Paguei"). Datas de hoje sempre por aqui
- Dados: `storage.js` (`SCHEMA`, chave `subDataV5`), `subs.js`, `status.js`, `payments.js`, `auto-charges.js`, `people.js`
- Cálculos: `history.js`, `totals.js`, `budget.js`, `cycles.js`, `sort.js`, `search.js`
- Notificações e lembretes: `notifications.js`, `reminder.js`, `settings.js`
- Contatos: `phone.js`, `contacts.js` (agenda), `vcard.js` (.vcf)
- Gestos e puxar: `gestures.js` (pinça), `pull.js`
- Outros: `catalog.js`, `format.js`, `backup.js`, `install.js`, `analytics.js`, `feedback.js`, `profile-summary.js`, `registerSW.js`

## Testes
- Unitários: `src/lib/*.test.js`
- E2E: `e2e/`, specs Playwright. `fixtures.js` (rede simulada), `timezone.js` (fuso e relógio fixos: `testNow()`; `E2E_NOW` verifica outra data)
- `e2e/a11y-storage.spec.js`: verificação de foco no Voltar em mobile
