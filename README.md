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

- **Lint** (`npm run lint`): ESLint; roda no job `unit-and-build`.
- **Unitários** (`npm test`): ciclos e vencimento, pagamentos, divisão, normalização do storage, notificações, totais, ordenação.
- **E2E** (`npm run test:e2e`): Playwright em Chromium, nos viewports desktop e mobile (Pixel 7). A rede externa é bloqueada/simulada, então os testes não dependem da internet. Para testar um deploy de preview: `E2E_BASE_URL=https://seu-preview.vercel.app npm run test:e2e`.
- **CI** (`.github/workflows/ci.yml`): em todo PR e push na `main` roda `unit-and-build` e `e2e`. Em falha, o relatório do Playwright fica anexado à execução. Marque os dois como *required* na proteção da branch `main`.

## Analytics

`src/lib/analytics.js` usa o Vercel Web Analytics (sem cookies). Visualizações de página funcionam em todos os planos; **eventos customizados** (`onboarding_completed`, `subscription_added`, `subscription_removed`, `notification_permission`, `backup_exported`, `backup_imported`, `pwa_installed`) só aparecem no painel em planos Pro/Enterprise, com no máximo 2 propriedades por evento. Regra: nunca enviar nomes de serviços, valores ou datas. Só roda em build de produção.

## Estrutura

```
public/            sw.js, manifest, ícones (copiados como estão para a raiz do site)
src/
  lib/             lógica pura, sem React (testada em *.test.js)
    cycles.js        ciclos de cobrança (semanal/mensal/anual), valor anual, validação de vencimento
    dates.js         lastDue/nextDue e status de vencimento/atraso por ciclo
    storage.js       load/save/normalize do localStorage, migração, import e clearAllData
    subs.js          montagem de assinatura a partir do formulário
    payments.js      histórico de pagamentos (pagar, desfazer, paidCycle espelhado)
    people.js        pessoas, divisão (sua parte) e remoção em cascata
    settings.js      preferências de aviso (padrões e normalização)
    reminder.js      lembrete de backup (30 dias, "Agora não" por 7 dias)
    feedback.js      formulário de feedback, plataforma e contato de privacidade
    install.js       estado de instalação do PWA (instalado, iOS, prompt)
    notifications.js regras e envio de notificações (dia, atraso, antecedência)
    totals.js        seu gasto mensal (sua parte), total dos serviços e projeção anual
    sort.js          ordenação da lista por urgência
    format.js        moeda, rótulos de preço e de vencimento
    analytics.js     eventos de uso (sem dados financeiros)
    search.js        busca global de serviços (Clearbit) — troque só este arquivo se o provedor mudar
    catalog.js       categorias e catálogo curado
  hooks/           useStore, useToday, useDueNotifications, useCompanySearch, useFocusTrap...
  components/      Home, Discover, Profile, SubModal, ConfirmDialog, Onboarding, BottomNav...
  App.jsx          composição, abas, modal e diálogo de confirmação
e2e/               testes Playwright (fixtures com rede simulada)
.github/workflows/ CI
```

## Ciclos de cobrança

Cada assinatura tem um ciclo: **semanal**, **mensal** (padrão) ou **anual**.

| Campo | Valores | Usado em |
|-------|---------|----------|
| `cycle` | `weekly` | `monthly` | `yearly` (ausente = `monthly`) | todos |
| `dueDate` | `1`..`31` | mensal e anual; vazio no semanal |
| `dueMonth` | `1`..`12` | só anual |
| `dueWeekday` | `0`..`6` (0 = domingo) | só semanal |

- **Dia 29–31:** vence no último dia do mês quando o mês é mais curto (29/02 em ano não bissexto vence 28/02).
- **Chave do ciclo pago (`paidCycle`):** mensal `YYYY-MM`, anual `YYYY`, semanal `YYYY-MM-DD` (data do vencimento). A comparação `paidCycle >= chave` só vale dentro do mesmo tipo de ciclo, por isso `normalizeSub` descarta um `paidCycle` de formato incompatível com o ciclo.
- **Equivalência mensal:** o "Seu gasto mensal" soma `preço × períodos por ano / 12` (semanal ×52, mensal ×12, anual ×1) e a projeção anual soma `preço × períodos por ano`. Ex.: R$ 120/ano = R$ 10,00/mês; R$ 10/semana = R$ 43,33/mês e R$ 520,00/ano.
- **Mudar o ciclo ou o vencimento** reinicia o controle (`createdAt` = hoje, `lastNotified` e `paidCycle` vazios), para não gerar atraso retroativo.
- **Dados antigos:** `SCHEMA = 9` (subiu de 8 para 9 na Sprint 3, uma única vez). Toda mudança de schema é aditiva: campo novo ganha default em `normalizeSub`, então assinaturas e backups antigos (sem `cycle`, `payments`, `sharedWith` etc.) carregam normalmente.
- **Lista da Home:** ordenada por urgência (atrasadas → vence hoje → próximas → sem vencimento).

## Dados e migração do app antigo

O `localStorage` é isolado por origem: o app em HTML único (outro domínio ou `file://`) **não** compartilha dados com o novo domínio da Vercel. Para levar os dados:

1. No app antigo, abra o console do navegador e rode `copy(localStorage.getItem('subDataV5'))`.
2. Cole o conteúdo num arquivo `backup.json`.
3. No novo app: **Perfil → Backup dos dados → Importar**.

A chave de armazenamento (`subDataV5`) é a mesma, então o formato é compatível.

## Pagamentos e histórico

Tocar em **✓ Paguei** registra um pagamento (`payments`: `id`, `cycle`, `paidAt`, `amount`) e mostra o aviso **"Pago. Desfazer"** por cerca de 5 segundos. O desfazer remove só o registro indicado, nunca "o último" às cegas. Na edição da assinatura há a lista de pagamentos (mais recentes primeiro) com **Desmarcar**. `paidCycle` continua existindo e espelha o último pagamento; mudar o vencimento reinicia o controle, mas o histórico fica.

## Pessoas e divisão

Em **Dividido com** (cadastro/edição) você escolhe pessoas já cadastradas ou adiciona uma nova (até 40 caracteres; nome repetido, sem diferenciar maiúsculas, reutiliza a pessoa). **Perfil → Pessoas** lista todas e permite remover (com confirmação), tirando a pessoa de todas as assinaturas.

- **Sua parte** = preço ÷ (pessoas + você). Sem divisão, é o preço cheio. Ids de pessoas que não existem mais são ignorados.
- **Seu gasto mensal**, a projeção anual e o **teto mensal (sua parte)** usam a sua parte. Quando há alguma assinatura dividida, a Home mostra também o **Total dos serviços** (preço cheio).
- Ex.: R$ 39,90 mensal com 2 pessoas = R$ 13,30; R$ 120 anual com 2 pessoas = R$ 40 por ano.
- Os nomes ficam só no aparelho e nunca entram em analytics.

## Notificações

Preferências em **Perfil → Notificações** (salvas na hora e incluídas no backup): **Receber avisos**, **Avisar no dia**, **Avisar atrasadas** e **antecedência** (não avisar antes, 1, 3 ou 7 dias antes). Tipos de aviso: **vence hoje**, **atrasada** e **vence em N dias** (antecedência). No máximo 1 aviso por dia por assinatura (o de atraso/dia vale mais que o de antecedência); mais de 3 no mesmo momento viram um aviso agrupado.

- **Cobrança automática** (vem marcada com Cartão): nunca fica atrasada nem tem "Paguei"; no dia aparece "Cobrado hoje" (segue "Avisar no dia") e o card mostra "Cobrado em DD/MM".
- **Não avisar desta assinatura**: fica fora de todos os avisos, mas continua nos totais.

Os avisos chegam **enquanto o app está aberto** (ou ao voltar para ele). Avisos com o app **fechado** exigem Web Push (backend + chaves VAPID), que não está incluído. No iOS, notificações só funcionam com o app instalado na Tela de Início.

## Backup, apagar dados e privacidade

- **Backup:** Perfil → Backup dos dados (Exportar/Importar). A Home lembra de exportar quando nunca houve exportação ou a última tem mais de 30 dias (**Agora não** oculta por 7 dias). O arquivo exportado leva a data do backup.
- **Apagar todos os dados:** Perfil → Seus dados. Exige digitar `APAGAR`, oferece "Exportar backup antes" e remove `subDataV5`, as chaves antigas e as cópias `*:corrupt-backup` (nenhuma outra chave). Depois o app volta ao onboarding. A permissão de notificação só se revoga nas configurações do navegador, e backups já baixados não são apagados pelo app.
- **Privacidade:** assinaturas, pessoas, pagamentos e preferências ficam só no aparelho. Sai do aparelho apenas o que a pessoa escrever no formulário de feedback (com versão e plataforma) e as métricas anônimas de uso (sem cookies, sem nomes, valores ou datas). O e-mail para pedir a exclusão das respostas do formulário é a constante `PRIVACY_CONTACT` em `src/lib/feedback.js`.

## Feedback do beta e QA

O botão **Enviar feedback** (Perfil → Sobre) abre o Google Forms com versão e plataforma preenchidas; a URL e os códigos `entry.` ficam em `FEEDBACK_FORM` (`src/lib/feedback.js`). O roteiro de teste em iPhone e Android está em [`docs/qa-beta.md`](docs/qa-beta.md).

## Armazenamento

Os dados ficam no `localStorage`. Após o onboarding e ao salvar a primeira assinatura o app pede `navigator.storage.persist()` para o navegador não apagar o armazenamento. É um pedido best-effort, **sem garantia**: o backup (Perfil → Exportar) continua sendo a rede de segurança.

## PWA

`public/manifest.webmanifest` + `public/sw.js` (rede primeiro, cache como plano B offline). O service worker só é registrado em build de produção.
