# SubManager

Gestão inteligente do portfólio de assinaturas — PWA em **React 19 + Vite**, com dados no `localStorage`.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes unitários da lógica (node:test, sem dependências extras)
npm run build      # gera ./dist
npm run preview    # serve o build de produção

npx playwright install chromium   # só na primeira vez
npm run test:e2e   # testes de ponta a ponta (faz build + preview sozinho)
```

Requer Node 20.19+ (ou 22.12+).

## Deploy na Vercel (via GitHub)

1. Na Vercel: **Add New → Project** e importe o repositório `vhenriqueortolan/submanager`.
2. O preset **Vite** é detectado sozinho (build `npm run build`, saída `dist`). Não há variáveis de ambiente.
3. A partir daí: push na `main` → deploy de **produção**; qualquer branch/PR → deploy de **preview**.

`vercel.json` só define headers: `sw.js` nunca fica em cache (para o app atualizar) e o `manifest.webmanifest` sai com o content-type correto.

## Testes e CI

- **Unitários** (`npm test`): regras de vencimento, normalização do storage, notificações, totais.
- **E2E** (`npm run test:e2e`): Playwright em Chromium, nos viewports desktop e mobile (Pixel 7). A rede externa é bloqueada/simulada, então os testes não dependem da internet. Para testar um deploy de preview: `E2E_BASE_URL=https://seu-preview.vercel.app npm run test:e2e`.
- **CI** (`.github/workflows/ci.yml`): em todo PR e push na `main` roda `unit-and-build` e `e2e`. Em falha, o relatório do Playwright fica anexado à execução. Marque os dois como *required* na proteção da branch `main`.

## Analytics

`src/lib/analytics.js` usa o Vercel Web Analytics (sem cookies). Visualizações de página funcionam em todos os planos; **eventos customizados** (`onboarding_completed`, `subscription_added`, `subscription_removed`, `notification_permission`, `backup_exported`, `backup_imported`, `pwa_installed`) só aparecem no painel em planos Pro/Enterprise, com no máximo 2 propriedades por evento. Regra: nunca enviar nomes de serviços, valores ou datas. Só roda em build de produção.

## Estrutura

```
public/            sw.js, manifest, ícones (copiados como estão para a raiz do site)
src/
  lib/             lógica pura, sem React (testada em *.test.js)
    dates.js         vencimento/atraso por ciclo mensal
    storage.js       load/save/normalize do localStorage, migração e import
    subs.js          montagem de assinatura a partir do formulário
    notifications.js regras e envio de notificações
    totals.js        gasto mensal e projeção anual
    analytics.js     eventos de uso (sem dados financeiros)
    search.js        busca global de serviços (Clearbit) — troque só este arquivo se o provedor mudar
    catalog.js       categorias e catálogo curado
  hooks/           useStore, useToday, useDueNotifications, useCompanySearch...
  components/      Home, Discover, Profile, SubModal, ConfirmDialog, Onboarding, BottomNav...
  App.jsx          composição, abas, modal e diálogo de confirmação
e2e/               testes Playwright (fixtures com rede simulada)
.github/workflows/ CI
```

## Dados e migração do app antigo

O `localStorage` é isolado por origem: o app em HTML único (outro domínio ou `file://`) **não** compartilha dados com o novo domínio da Vercel. Para levar os dados:

1. No app antigo, abra o console do navegador e rode `copy(localStorage.getItem('subDataV5'))`.
2. Cole o conteúdo num arquivo `backup.json`.
3. No novo app: **Perfil → Backup dos dados → Importar**.

A chave de armazenamento (`subDataV5`) é a mesma, então o formato é compatível.

## Notificações

Disparam quando uma assinatura **vence hoje** ou está **atrasada** (no máximo 1 aviso por dia por assinatura), enquanto o app está aberto ou ao voltar para ele. Uma assinatura sai do estado "atrasada" ao tocar em **✓ Paguei**.

Avisos com o app **fechado** exigem Web Push (backend + chaves VAPID) — não incluído nesta versão. No iOS, notificações só funcionam com o app instalado na Tela de Início.

## PWA

`public/manifest.webmanifest` + `public/sw.js` (rede primeiro, cache como plano B offline). O service worker só é registrado em build de produção.
