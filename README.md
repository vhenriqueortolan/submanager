# SubManager

Gestão inteligente do portfólio de assinaturas — PWA em **React 19 + Vite**, com dados no `localStorage`.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes da lógica (node:test, sem dependências extras)
npm run build      # gera ./dist
npm run preview    # serve o build de produção
```

Requer Node 20.19+ (ou 22.12+).

## Deploy na Vercel (via GitHub)

1. Na Vercel: **Add New → Project** e importe o repositório `vhenriqueortolan/submanager`.
2. O preset **Vite** é detectado sozinho (build `npm run build`, saída `dist`). Não há variáveis de ambiente.
3. A partir daí: push na `main` → deploy de **produção**; qualquer branch/PR → deploy de **preview**.

`vercel.json` só define headers: `sw.js` nunca fica em cache (para o app atualizar) e o `manifest.webmanifest` sai com o content-type correto.

## Estrutura

```
public/            sw.js, manifest, ícones (copiados como estão para a raiz do site)
src/
  lib/             lógica pura, sem React (testada em *.test.js)
    dates.js         vencimento/atraso por ciclo mensal
    storage.js       load/save/normalize do localStorage, migração e import
    subs.js          montagem de assinatura a partir do formulário
    notifications.js regras e envio de notificações
    search.js        busca global de serviços (Clearbit) — troque só este arquivo se o provedor mudar
    catalog.js       categorias e catálogo curado
  hooks/           useStore, useToday, useDueNotifications, useCompanySearch...
  components/      Home, Discover, Profile, SubModal, Onboarding, BottomNav...
  App.jsx          composição, abas e modal
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
