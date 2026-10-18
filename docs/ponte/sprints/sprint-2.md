# Sprint 2 — Ciclos de cobrança e vencimentos

> Plano para o Claude Code dar continuidade ao SubManager. Leia este arquivo inteiro antes de começar e siga a ordem das tarefas.

## Ponto de partida (15/10/2026)

- React 19 + Vite 7, em produção na Vercel. Deploy via GitHub: **merge na `main` publica em produção**; PR/branch gera preview.
- Sprint 1 concluída (PR #1): projeção anual, CI (`unit-and-build` + `e2e`), Playwright (desktop + Pixel 7), analytics sem cookies, `ConfirmDialog`, "Pular por enquanto" no onboarding.
- 25 testes unitários passam (`npm test`). Dados em `localStorage` (chave `subDataV5`, `SCHEMA = 7`).
- **Premissa:** o roadmap original não está no repositório. Este plano foi derivado do código. O único vestígio é o comentário em `src/lib/totals.js` ("Na Fase 1 passa a normalizar ciclos anuais/semanais"). Se o Victor trouxer o roadmap com outra ordem, reconcilie com ele antes de começar; as tarefas T1–T4 continuam válidas, só muda a prioridade.

## Objetivo

Hoje o app só entende cobrança **mensal**: o campo é "Preço Mensal" e o vencimento é um dia do mês. Uma assinatura anual (ex.: Prime, seguro, domínio) ou semanal entra com total errado e aviso na data errada.

A Sprint 2 faz o app tratar **ciclos de cobrança** (semanal, mensal, anual) de ponta a ponta: cadastro, totais, vencimento, notificação e ordenação da lista. Em paralelo, deixa o repositório mais seguro para crescer (lint, foco do modal, armazenamento persistente).

**Critério de sucesso:** cadastrar uma assinatura anual e uma semanal; ver o gasto mensal equivalente e a projeção anual corretos; receber o aviso na data certa; ver a lista ordenada por urgência; dados e backups antigos carregam sem perda; CI verde.

## Convenções (valem para todas as tarefas)

- **Idioma:** textos de UI e mensagens de commit em pt-BR, no padrão já usado (`feat:`, `fix:`, `chore:`, `test(e2e):`).
- **Onde fica o quê:** lógica pura em `src/lib/` (sem React) com teste `node:test` ao lado (`*.test.js`); hooks em `src/hooks/`; UI em `src/components/`; e2e em `e2e/` (Playwright; rede bloqueada/simulada em `e2e/fixtures.js`; fuso fixo em `e2e/timezone.js`).
- **Git:** uma branch por PR (`feat/sprint-2-<tema>`), PR pequeno, **nunca commit direto na `main`**. Só fazer merge com `unit-and-build` e `e2e` verdes. Cada PR leva os próprios testes (unitários e e2e).
- **Antes de abrir PR:** `npm test && npm run build && npm run test:e2e`.
- **Dados:** a chave `subDataV5` não muda. Mudança de schema é **aditiva**: campo novo ganha default em `normalizeSub`, então dados antigos e backups antigos continuam carregando. `SCHEMA` sobe de 7 para 8.
- **Datas:** sempre locais, via `src/lib/dates.js`. Nunca `toISOString()` para obter "hoje" (fuso).
- **Privacidade no analytics:** nunca enviar nome de serviço, valor ou data; no máximo 2 propriedades por evento (`subscription_added` já usa as 2: `source`, `first`).
- **Dependências:** não adicionar além das listadas na T0.
- **Compatibilidade:** os testes atuais montam assinaturas **sem** o campo `cycle` (ex.: `dates.test.js`, `notifications.test.js`, `e2e/fixtures.js`). `dueStatus`, `nextDue` e os totais devem tratar `cycle` ausente como `'monthly'`. Os 25 testes atuais não podem ser alterados, só ampliados.
- **O Victor é iniciante** em git/GitHub, CI, Vercel e testes em dispositivo. Sempre que pedir uma ação manual a ele, explique o que é, por que serve e qual resultado esperar em cada passo.

## Ordem e PRs

| PR | Tarefas | Observação |
|----|---------|------------|
| 1 | T0 | Higiene. Mergear sozinha primeiro. |
| 2 | T1 | Lib pura + testes, sem mudança visual. É o coração da sprint. |
| 3 | T2 + T3 + T4 | UI e notificações em cima da T1 (pode dividir em 2–3 PRs se ficar grande). |
| 4 | T5 | Armazenamento e acessibilidade. Independente; pode ir em paralelo ao PR 3. |
| 5 | T6 | Docs, versão e QA em dispositivo real. |

---

## T0 — Higiene do repositório · tamanho P

**a) `.gitattributes`** com `* text=auto eol=lf` (e `*.png binary`).
Contexto: visto por um git sem `core.autocrlf`, 27 arquivos aparecem como modificados só por CRLF no working tree (`git ls-files --eol` mostra `i/lf w/crlf`; `git diff --ignore-space-at-eol` é vazio). Confirme com `git status` na máquina atual antes de agir. Não commite reescrita de conteúdo, só o `.gitattributes`.

**b) ESLint** (flat config): `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `globals`. Script `npm run lint`; novo passo no job `unit-and-build` do `.github/workflows/ci.yml`. Corrigir apenas o que for problema real; sem reformatação em massa.

**c) `CLAUDE.md`** curto na raiz, com comandos, estrutura de pastas e as "Convenções" acima.

**Aceite:** `npm run lint` verde localmente e no CI; `git status` limpo após clone novo; `npm test`, build e e2e inalterados.

---

## T1 — Modelo de ciclos (lib pura) · tamanho M

Arquivos: `src/lib/cycles.js` (novo), `dates.js`, `storage.js`, `subs.js`, `totals.js` e os testes correspondentes. **Sem mudança visual.** Fazer em TDD: escreva os testes de borda primeiro. `dueStatus` é o coração do app e já teve bug de "atraso falso".

### Modelo

```js
// src/lib/cycles.js
export const CYCLES = {
  weekly:  { label: 'Semanal', unit: 'semana', perYear: 52 },
  monthly: { label: 'Mensal',  unit: 'mês',    perYear: 12 },
  yearly:  { label: 'Anual',   unit: 'ano',    perYear: 1  },
};
export const DEFAULT_CYCLE = 'monthly';
```

Campos novos em cada assinatura:

| Campo | Valores | Usado em |
|-------|---------|----------|
| `cycle` | `'weekly' \| 'monthly' \| 'yearly'` (default `'monthly'`) | todos |
| `dueDate` | `'1'..'31'` (já existe) | mensal e anual; `''` no semanal |
| `dueMonth` | `'1'..'12'` | só anual; `''` nos demais |
| `dueWeekday` | `'0'..'6'` (0 = domingo) | só semanal; `''` nos demais |

Chave do ciclo pago (`paidCycle`, que `markPaid` grava a partir de `status.cycle`):

- mensal: `'YYYY-MM'` (inalterado)
- anual: `'YYYY'`
- semanal: `'YYYY-MM-DD'` (a data do vencimento)

A comparação `paidCycle >= key` é lexicográfica e só vale **dentro do mesmo tipo de ciclo**. Por isso `normalizeSub` descarta `paidCycle` cujo formato não bate com o `cycle`.

### Funções

- `cycleKey(d, cycle = 'monthly')` em `dates.js`: estender sem quebrar a assinatura atual.
- `lastDue(sub, today)` → `Date | null`: vencimento mais recente `<= hoje`.
  - mensal: como hoje (`dueOn` ajusta dia 31 em mês curto).
  - anual: `dueOn(ano, dueMonth - 1, dueDate)`; se for futuro, usa o ano anterior. 29/02 em ano não bissexto vence 28/02.
  - semanal: último dia da semana `dueWeekday` que seja `<= hoje`.
- `nextDue(sub, today)` → `Date | null`: próximo vencimento `>= hoje`.
- `dueStatus(sub, now)`: generalizar usando `lastDue`, **mantendo o retorno** `{ type: 'today'|'overdue', days, cycle }` e as regras atuais (ciclo anterior ao cadastro → `null`; ciclo pago → `null`). Continua valendo "só o ciclo mais recente conta".
- `totals.js`:
  - `annualAmount(sub) = price × CYCLES[cycle].perYear`
  - `monthlyTotal = round2(Σ annualAmount / 12)`
  - `annualProjection = round2(Σ annualAmount)`
  - Assinaturas só mensais devem dar exatamente os mesmos números de hoje.
- `subs.js` (`emptyForm`, `formFromSub`, `buildSub`): incluir `cycle`, `dueMonth`, `dueWeekday`. Mudar **ciclo ou qualquer campo de vencimento** reinicia o controle (`createdAt = hoje`, `lastNotified = ''`, `paidCycle = ''`), a mesma regra que já existe para mudança de dia.
- `storage.js`: `normalizeSub` com defaults e validação (`cycle` inválido → `'monthly'`; `dueMonth` só se anual; `dueWeekday` só se semanal; `paidCycle` conforme o ciclo). `SCHEMA = 8`.

### Casos de borda obrigatórios nos testes

- Anual: 29/02 em ano não bissexto; vencimento ainda neste ano vs. já passado; virada de ano; `createdAt` posterior ao último vencimento → `null` (sem atraso falso).
- Semanal: hoje é o dia (`today`); ontem (`overdue`, `days = 1`); pago na semana (`null`); semana seguinte.
- Trocar o ciclo descarta `paidCycle` incompatível (ex.: `'2026-10'` numa assinatura que virou anual não pode contar como pago).
- Backup antigo (sem `cycle`) importa como mensal, tanto por `parseImport` quanto por `loadState` com chave legada.
- Totais: R$ 120 anual = R$ 10,00/mês; R$ 10 semanal = R$ 43,33/mês e R$ 520,00/ano; caso misto.
- Regressão: todos os testes atuais de `dates`, `notifications`, `storage`, `subs`, `totals` passam sem alteração.

**Aceite:** `npm test` verde com os novos casos; `npm run build` ok; nenhum arquivo em `components/` alterado neste PR.

---

## T2 — Cadastro e edição com ciclo (UI) · tamanho M

Arquivo principal: `src/components/SubModal.jsx` (passo 2).

- Seletor **"Cobrança"**: Semanal / Mensal / Anual (default Mensal). Itens vindos do catálogo ou da busca entram como mensal.
- Rótulo do valor dinâmico: "Valor cobrado por semana/mês/ano (R$)". Em ciclos não mensais, dica abaixo do campo: "≈ R$ X,XX por mês" (usar `annualAmount / 12`).
- Campos de vencimento conforme o ciclo:
  - mensal: "Vencimento (Dia)" (como hoje)
  - anual: dia + mês (select com nomes dos meses em pt-BR)
  - semanal: "Dia da semana" (select Domingo..Sábado)
- Manter `label`/`htmlFor` em todos os campos e o `disabled` do botão enquanto não houver nome.

**Aceite (e2e, desktop e mobile):** cadastrar anual R$ 120 com dia/mês e ver o card correto; cadastrar semanal; editar e confirmar que os valores aparecem preenchidos; trocar o ciclo de uma assinatura não gera "atrasada" falsa.

---

## T3 — Home: exibição, totais e ordenação · tamanho M

Arquivos: `src/components/Home.jsx`, nova função pura `sortByUrgency` (em `src/lib/subs.js` ou `src/lib/sort.js`) com testes, `src/lib/format.js` se precisar de formatadores.

- Card: preço com sufixo do ciclo (`R$ 120,00/ano`). Em não mensais, mostrar o próximo vencimento ("Vence 15/03" ou "Toda segunda") no lugar de "Dia N". Mensal mantém "Dia N".
- `BudgetCard`: "Gasto Mensal" passa a ser o **equivalente mensal**; havendo assinatura não mensal, uma nota discreta: "Anuais e semanais convertidas para mensal". O teto compara com esse valor.
- **Ordenação** por urgência: atrasadas (mais dias primeiro) → vence hoje → próximas por `nextDue` crescente → sem vencimento (por nome). Ordenação estável.

**Aceite:** teste unitário da ordenação; e2e com `sampleSubs` (atrasada, hoje, paga, futura) conferindo a ordem na lista; totais e projeção corretos num caso misto.

---

## T4 — Notificações para ciclos · tamanho P

Arquivos: `src/lib/notifications.js` (`describe`, hoje usa `sub.dueDate`), `e2e/notifications.spec.js`.

- Textos por ciclo: semanal "Venceu há N dias (toda segunda)"; anual "Venceu há N dias (dia 15/03)"; mensal inalterado.
- A `tag` continua `sub-${id}-${st.cycle}`; agrupamento acima de 3 e limite de 1 aviso por dia por assinatura inalterados.
- Analytics: não adicionar propriedade a `subscription_added`. Opcional: evento novo `cycle_selected` com só `{ cycle }`.

**Aceite (e2e):** anual vencendo hoje notifica; semanal atrasada notifica; "Paguei" interrompe os avisos do ciclo; não duplica no mesmo dia.

---

## T5 — Armazenamento persistente e foco do modal · tamanho P/M

**a) `navigator.storage.persist()`**
- Em `src/lib/storage.js`, `requestPersistence()` best-effort: detecção de recurso, `try/catch`, sem UI.
- Chamar após o onboarding concluído e após salvar a primeira assinatura.
- Por quê: todos os dados vivem no `localStorage`; no Safari/iOS fora da Tela de Início o navegador pode apagar o armazenamento de sites pouco usados. O `persist()` reduz o risco, mas **não é garantia**. O backup continua sendo a rede de segurança.

**b) Acessibilidade do `SubModal`**
- Hook `useFocusTrap` em `src/hooks/`: foco inicial no primeiro campo; Tab/Shift+Tab presos no diálogo; ao fechar, devolver o foco ao elemento que abriu; sem scroll do `body` com o modal aberto.
- Conferir o mesmo no `ConfirmDialog` (já tem `autoFocus` em "Cancelar"; falta devolver o foco).

**Aceite (e2e):** Esc fecha o modal e devolve o foco; Tab não sai do diálogo; nenhum erro de JS (a fixture já falha o teste em `pageerror`).

---

## T6 — Docs, versão e QA em dispositivo real · tamanho M

- **README:** seção "Ciclos de cobrança" (modelo, chaves de `paidCycle`, equivalência mensal); atualizar "Estrutura" (`cycles.js`) e remover o comentário "Na Fase 1…" de `totals.js`.
- `package.json`: versão `2.2.0`.
- **QA manual no celular** (carry-over da Sprint 1, ainda sem registro de execução). Guie o Victor passo a passo:

1. **Abrir o PR no GitHub.** A Vercel comenta no PR com um link de **Preview**: uma cópia do app publicada só para teste, com endereço próprio, que não afeta a produção. Resultado esperado: um comentário "Visit Preview".
2. **Abrir o link no celular** (Android: Chrome; iPhone: Safari). Se pedir login da Vercel, é a proteção padrão de previews: entre com a conta dele.
3. **Instalar na Tela de Início** (Android: menu ⋮ → "Instalar app"; iPhone: Compartilhar → "Adicionar à Tela de Início"). Resultado: ícone do SubManager e o app abre sem barra do navegador. Se a instalação falhar só no preview (a proteção da Vercel pode bloquear o `manifest`), repetir esse passo na produção depois do merge.
4. **Roteiro:** onboarding; cadastrar uma assinatura mensal, uma anual e uma semanal; conferir gasto mensal e projeção anual; cadastrar uma com vencimento hoje e ativar as notificações (no iPhone só funcionam com o app instalado, iOS 16.4+); tocar "Paguei"; exportar e importar um backup; ativar modo avião e reabrir o app (deve carregar do cache).
5. **Avisos com o app fechado não funcionam** nesta versão (exigem Web Push). Isso é esperado, não é bug.
6. **Registrar problemas** como *Issues* no GitHub (aba Issues → New issue), com o aparelho, o navegador e o passo que falhou.

- **Migração com dado real:** antes do merge, o Victor exporta um backup do app em produção (Perfil → Exportar) e importa no preview. Os dados devem aparecer intactos, como mensais.

---

## Definição de pronto da sprint

- [ ] CI verde (`unit-and-build` com lint, e `e2e`) em todos os PRs; `main` protegida exigindo os dois checks.
- [ ] `npm test`, `npm run build`, `npm run test:e2e` passam localmente (desktop e mobile).
- [ ] Os 25 testes anteriores continuam passando sem alteração.
- [ ] README atualizado.
- [ ] QA no celular feito e problemas registrados como issues.
- [ ] Após o merge, fumaça em produção: criar e remover uma assinatura de cada ciclo.

## Riscos

- **`dueStatus` generalizado** pode reintroduzir "atrasos falsos". Mitigação: TDD na T1 e regressão dos testes atuais.
- **Migração:** `paidCycle` em formato errado marcaria como pago indevidamente. Mitigação: validação por ciclo no `normalizeSub` + teste de troca de ciclo.
- **Preview da Vercel protegido** pode atrapalhar a instalação do PWA no QA. Mitigação: repetir na produção.

## Fora do escopo (candidatos à Sprint 3)

- Web Push para avisos com o app fechado (exige backend + chaves VAPID).
- Ciclos trimestral/semestral (a tabela `CYCLES` já comporta; falta generalizar o vencimento por mês-âncora).
- Gasto por categoria / gráficos.
- Multi-moeda, sincronização entre aparelhos, exportação CSV.
- Lembrete periódico para exportar backup.

---

## Prompt para iniciar no Claude Code

> Leia `docs/sprint-2.md` e siga a ordem dos PRs. Comece pela T0 em uma branch `chore/sprint-2-higiene`, sem commitar na `main`. Antes de qualquer mudança, rode `git status` e `npm test` e me diga o que encontrou. Quando precisar de alguma ação minha (GitHub, Vercel, celular), explique passo a passo, porque é minha primeira vez.
