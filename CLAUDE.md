# SubManager

PWA de gestão de assinaturas. React 19 + Vite 7, deploy na Vercel (merge na `main` publica em produção; PR gera preview). Dados em `localStorage` (chave `subDataV5`, `SCHEMA` em `src/lib/storage.js`).

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run lint` — ESLint
- `npm test` — testes unitários (`node --test src/lib/*.test.js`)
- `npm run build` — build de produção
- `npm run test:e2e` — Playwright (desktop + Pixel 7)
- Antes de abrir PR: `npm run lint && npm test && npm run build && npm run test:e2e`

## Estrutura

- `src/lib/` — lógica pura (sem React), com teste `*.test.js` ao lado
- `src/hooks/` — hooks React
- `src/components/` — UI
- `e2e/` — Playwright (rede simulada em `e2e/fixtures.js`, fuso fixo em `e2e/timezone.js`)
- `docs/` — planos de sprint

## Convenções

- Textos de UI e commits em pt-BR, padrão `feat:`, `fix:`, `chore:`, `test(e2e):`.
- Git: uma branch por PR (`feat/sprint-2-<tema>`), PR pequeno, **nunca commit direto na `main`**; merge só com `unit-and-build` e `e2e` verdes; cada PR leva seus testes.
- Dados: a chave `subDataV5` não muda; mudança de schema é aditiva (campo novo ganha default em `normalizeSub`), para dados e backups antigos continuarem carregando.
- Datas: sempre locais, via `src/lib/dates.js`; nunca `toISOString()` para obter "hoje" (fuso).
- Analytics: nunca enviar nome de serviço, valor ou data; no máximo 2 propriedades por evento.
- Dependências: não adicionar novas sem necessidade explícita.
- Os testes existentes não podem ser alterados, só ampliados.
- O responsável é iniciante em git/GitHub, CI, Vercel e testes em dispositivo: ao pedir uma ação manual, explique o que é, por que serve e o resultado esperado em cada passo.
