# Sprint 3 — Beta com iPhone e Android

> Plano para o Claude Code dar continuidade ao SubManager. Leia este arquivo inteiro antes de começar e siga a ordem das tarefas.

## Ponto de partida (15/10/2026)

- `main` na versão 2.2.0, com Sprint 1 e Sprint 2 concluídas (ciclos mensal, anual e semanal, CI, e2e, analytics, PWA).
- 54 testes unitários passam (`npm test`).
- Dados em `localStorage` (chave `subDataV5`). `SCHEMA = 8`. Esta sprint sobe para 9 uma única vez, na T1.
- Lint passa com 2 avisos de `react-hooks`, um deles em `src/hooks/useCompanySearch.js`. Tratar na T5.
- Lint e build podem falhar em máquinas onde `node_modules` foi instalado em outro sistema operacional (ver pré-requisitos).

## Pré-requisitos manuais (Victor)

Estes passos são seus, antes da T0.

1. **Criar o formulário de feedback no Google Forms.**
   - O que é: formulário gratuito do Google onde os testers escrevem o feedback.
   - Por que: o botão "Enviar feedback" do app abre esse formulário com a versão e a plataforma já preenchidas.
   - Passos: acesse forms.google.com, clique em "Em branco" e crie três perguntas: "Versão do app" (resposta curta), "Aparelho" (resposta curta) e "O que você achou ou o que deu errado?" (parágrafo, opcional). No topo, escreva: "Não envie dados bancários nem números de cartão."
   - Link pré-preenchido: nos três pontos do canto superior do formulário, escolha "Obter link pré-preenchido", preencha os campos com valores de exemplo ("9.9.9" e "TESTE") e clique em "Obter link". O link terá trechos como `entry.123456789` para cada campo.
   - Resultado esperado: ao abrir o link, os campos Versão e Aparelho aparecem preenchidos.
   - Me envie: a URL do link (até `viewform`) e os três códigos `entry.` (Versão, Aparelho e Comentário).
   - Aba "Respostas": ative a notificação por e-mail a cada resposta (pode aparecer como ícone de sino ou no menu ⋮, conforme a interface). Resultado esperado: você recebe um e-mail a cada envio.
2. **Reinstalar as dependências se o projeto estiver numa máquina Windows.**
   - O que é: `node_modules` é a pasta com as bibliotecas do projeto.
   - Por que: os atalhos instalados apontam para `node.exe`, então lint e build falham.
   - Passos: no terminal, dentro da pasta do projeto, rode `npm ci`.
   - Resultado esperado: a instalação termina sem erros, e `npm run build` gera a pasta `dist`.

## Objetivo

Preparar o SubManager para um beta fechado com algumas pessoas, em iPhone e Android.

**Critério de sucesso:** um tester consegue instalar o app, cadastrar assinaturas, dividir custos com nomes, ver o gasto pessoal correto, configurar avisos, apagar os dados e enviar feedback, sem ajuda.

## Convenções

Valem as da Sprint 2, com estes acréscimos:

- **Teto pessoal:** todo total de gasto e o teto usam a sua parte. Sem divisão, a sua parte é o preço cheio.
- **Dados de terceiros:** nomes de pessoas ficam só no aparelho e nunca entram em analytics.
- **Privacidade no feedback:** o formulário recebe apenas o que o tester escrever, mais versão e plataforma. Nenhum dado financeiro sai do aparelho nesta sprint.
- **Schema:** `SCHEMA` sobe de 8 para 9 uma única vez, na T1. As tarefas seguintes adicionam campos aditivos com default em `normalizeSub`, sem subir o número de novo.
- **Testes:** TDD nas regras de vencimento e totais (`dueStatus`, `lastDue`, `totals`), escrevendo os casos de borda antes.
- **Dependências:** nenhuma nova.
- **Ações manuais:** ao pedir algo ao Victor, explique o que é, por que serve e qual resultado esperar em cada passo.

## Ordem e PRs

| PR | Tarefas | Branch sugerida | Observação |
|----|---------|-----------------|------------|
| 1 | T0 | `feat/sprint-3-pre-beta` | Pequeno, primeiro. Depende da URL do formulário. |
| 2 | T1 | `feat/sprint-3-paguei-historico` | Sobe o schema para 9. |
| 3 | T2 | `feat/sprint-3-divisao` | Usa o schema 9 da T1. |
| 4 | T3a | `feat/sprint-3-notificacoes` | Tela de configuração e antecedência. |
| 5 | T3b | `feat/sprint-3-cobranca-automatica` | Cobrança automática e silenciar assinatura. |
| 6 | T4 | `feat/sprint-3-apagar-dados` | Exclusão e política de privacidade. |
| 7 | T5 | `chore/sprint-3-fechamento` | QA, lint e versão 2.3.0. |

Cada PR precisa de CI verde (`unit-and-build` e `e2e`) antes do merge. Merge na `main` publica em produção.

## T0 — Pré-beta · tamanho P

**a) Canal de feedback**

- `src/lib/feedback.js` (novo), com:
  - `FEEDBACK_FORM = { url: '', fields: { version: '', platform: '', comment: '' } }`. Com `url` vazia, o botão não aparece. Os valores reais entram quando o Victor enviar os códigos `entry.`.
  - `platformOf(userAgent)`: retorna `'iPhone'`, `'iPad'`, `'Android'`, `'Computador'` ou `'Outro'`.
  - `buildFeedbackUrl(form, { version, platform })`: retorna `''` sem URL; caso contrário, a URL com `usp=pp_url` e os valores codificados via `URLSearchParams`.
- Testes: URL vazia; campos codificados (espaços e acentos); `platformOf` para user agents de iPhone, Android e Windows.
- Perfil, seção "Sobre": versão do app (lida de `package.json`) e botão "Enviar feedback" (abre em nova aba, com `rel="noopener"`), só quando a URL estiver preenchida.

**b) Instalação**

- `src/lib/install.js` (novo): `installState({ userAgent, standalone, hasPrompt })` retorna `'installed'`, `'ios'`, `'prompt'` ou `'unavailable'`. Testes para cada retorno.
- `standalone` vem de `matchMedia('(display-mode: standalone)')` ou de `navigator.standalone`.
- `src/hooks/useInstallPrompt.js` (novo): captura `beforeinstallprompt`, guarda o evento, expõe `promptInstall()` e limpa o evento ao receber `appinstalled`. Não rastrear `appinstalled` de novo: `analytics.js` já faz isso.
- Perfil, seção "Instalar o app":
  - `installed`: texto "App instalado".
  - `prompt` (Android): botão "Instalar app".
  - `ios`: passos para tocar em Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início". Texto fixo: "No iPhone, os avisos só funcionam com o app instalado."
  - `unavailable`: seção oculta.

**Aceite:** `npm test`, lint e build ok. e2e: a versão aparece no Perfil; o bloco de instalação mostra as instruções de iPhone com user agent de iPhone.

**Manual (Victor):** instalar o app no Android e no iPhone, pelo preview ou pela produção. Resultado esperado em cada aparelho: o ícone aparece na Tela de Início e o app abre sem a barra do navegador. Se o preview pedir login da Vercel, é a proteção padrão de previews; use a conta dele.

## T1 — "Paguei" com desfazer, histórico e backup · tamanho M

Arquivos: `src/lib/payments.js` (novo), `storage.js`, `subs.js`, `useStore.js`, `App.jsx`, `Toast.jsx`, `Home.jsx`, `SubModal.jsx`, `backup.js`, testes correspondentes.

**a) Modelo (schema 9)**
- `payments`: array de `{ id, cycle, paidAt, amount }`. `cycle` segue o formato do ciclo (`YYYY-MM`, `YYYY` ou `YYYY-MM-DD`). `paidAt` é a data local do registro. Default `[]`.
- `paidCycle` continua existindo e espelha o último pagamento, para não quebrar `dueStatus` nem os testes atuais. `markPaid` e o desfazer mantêm os dois sincronizados.
- Estado: `lastBackupAt` (default `''`) e `backupSnoozeUntil` (default `''`).

**b) Regras (`src/lib/payments.js`)**
- `addPayment(sub, cycle, today)`: cria o registro e atualiza `paidCycle`.
- `removePayment(sub, paymentId)`: remove o registro e recalcula `paidCycle` a partir do último restante (ou `''`).
- O desfazer remove só o registro indicado pelo id, nunca "o último" de forma cega, para não desfazer um pagamento mais novo.

**c) Interface**
- Toast com ação: "Pago. Desfazer" por ~5 s. Estender `Toast.jsx` para aceitar um botão de ação.
- Edição da assinatura: lista de pagamentos (mais recentes primeiro, com data e valor) e botão para desmarcar cada um.
- Banner no Home quando nunca houve exportação ou a última tem mais de 30 dias, com "Exportar backup" e "Agora não" (oculta por 7 dias, via `backupSnoozeUntil`). Só aparece se houver assinaturas.
- `downloadBackup` atualiza `lastBackupAt`.

**d) Testes**
- Pagar e desfazer; desfazer um registro antigo não mexe nos mais novos; desfazer sem pagamentos não faz nada.
- Normalização: assinatura antiga sem `payments` vira `[]`; `paidCycle` inconsistente com o último pagamento é corrigido.
- Backup antigo (sem os campos novos) carrega sem perda.

**Aceite:** pagar faz os avisos do ciclo pararem; desfazer os faz voltar; o histórico mostra os registros; o banner aparece e some depois do backup.

**Manual (Victor):** antes do merge, exportar um backup da produção (Perfil → Exportar) e importar no preview. Resultado esperado: os dados aparecem intactos, e o histórico começa vazio. O preview é a cópia de teste que a Vercel publica para cada PR.

## T2 — Divisão com pessoas e teto pessoal · tamanho M

Arquivos: `src/lib/people.js` (novo), `totals.js`, `cycles.js`, `subs.js`, `storage.js`, `SubModal.jsx`, `Home.jsx`, `Profile.jsx`, `notifications.js`, testes.

**a) Modelo (schema 9, aditivo)**
- `people`: array de `{ id, name }` no estado. Default `[]`.
- `sharedWith`: array de ids de pessoas em cada assinatura. Default `[]`. Ids em UUID, via `newId()`.
- Ids que não existem mais em `people` são ignorados nos cálculos.

**b) Regras**
- `sharers(sub, people)`: ids válidos de `sharedWith`.
- `myShare(sub, people)`: `price ÷ (sharers + 1)`.
- `totals.js`: gasto mensal, projeção anual e teto usam `myShare`. Acrescentar `totalServiceMonthly` (preço cheio), para o "Total dos serviços".
- Testes: R$ 120 anual dividida com 2 pessoas = R$ 40 por ano; R$ 39,90 mensal dividida com 2 pessoas = R$ 13,30; ids inexistentes são ignorados; assinatura sem divisão mantém os números atuais.

**c) Nomes**
- Campo "Dividido com" em `SubModal.jsx`: chips das pessoas já cadastradas e campo "Adicionar pessoa" (Enter confirma). Nome com até 40 caracteres, sem espaços extras. Se o nome já existir (sem diferenciar maiúsculas), reutiliza o id.
- Perfil, seção "Pessoas": lista com "Remover". Remover pede confirmação e tira a pessoa de todas as assinaturas.

**d) Home e textos**
- Card principal: "Seu gasto mensal" (sua parte).
- Segunda linha, só se houver alguma assinatura dividida: "Total dos serviços: R$ X".
- Teto: "Teto mensal (sua parte)", no onboarding e no Perfil.
- Aviso de vencimento: valor cobrado e, quando dividido, a sua parte.
- Analytics: nenhum nome, valor ou data. As propriedades de `subscription_added` não mudam.

**Aceite:** Netflix de R$ 39,90 com 2 pessoas mostra R$ 13,30 no gasto pessoal e R$ 39,90 no total dos serviços. e2e: cadastrar uma pessoa, dividir uma assinatura e ver o número no card.

## T3a — Configuração de notificações · tamanho M

Arquivos: `src/lib/notifications.js`, `src/hooks/useDueNotifications.js`, `Profile.jsx`, `storage.js`, testes e e2e.

**a) Modelo**
- `settings` no estado (default aditivo): `{ enabled: true, notifyToday: true, notifyOverdue: true, advanceDays: 0 }`. `advanceDays` aceita 0, 1, 3 ou 7.
- As preferências entram no backup.

**b) Regras**
- `pendingDue` respeita `enabled`, `notifyToday` e `notifyOverdue`. Assinaturas silenciadas (T3b) ficam de fora.
- Antecedência: função pura `upcomingStatus(sub, now, advanceDays)` retorna `{ type: 'upcoming', days }` quando o próximo vencimento está entre 1 e `advanceDays` dias à frente. Não altera `dueStatus`.
- Uma notificação por assinatura, por dia e por tipo. Tag: `sub-${id}-${cycle}-${type}`.
- O agrupamento acima de 3 notificações continua valendo.

**c) Interface (Perfil, seção "Notificações")**
- Estado do navegador: ativadas, bloqueadas (com o caminho para reativar nas configurações do navegador) ou não pedidas.
- No iPhone fora da Tela de Início: aviso para instalar o app.
- Chave "Receber avisos".
- Chaves "Avisar no dia" e "Avisar atrasadas".
- Antecedência: "Não avisar antes", "1 dia antes", "3 dias antes", "7 dias antes".
- Texto fixo: "Os avisos chegam quando o app está aberto."

**d) Testes (TDD)**
- Casos de borda de `upcomingStatus`: vence amanhã, daqui a 7 dias, daqui a 8 dias, hoje (não é antecedência), virada de mês e de ano.
- `pendingDue` com cada chave desligada.
- Sem duplicar: já avisada hoje, não avisa de novo.

**Aceite:** antecedência de 1 dia notifica no dia anterior; desligar "Receber avisos" silencia tudo; e2e em desktop e Pixel 7.

## T3b — Cobrança automática e silenciar · tamanho M

**a) Modelo**
- `autoCharge`: booleano, default `false`. Ao cadastrar com "Cartão", a opção vem marcada, mas pode ser desmarcada.
- `muted`: booleano, default `false`. Corresponde a "Não avisar desta assinatura".

**b) Regras**
- Assinatura automática: `dueStatus` não retorna `overdue`. Não há botão "Paguei". No dia do vencimento, o status `today` é informativo ("Cobrado hoje"), e o aviso segue a chave `notifyToday`.
- Silenciada: fica fora de `pendingDue` e de `upcomingStatus`. Continua nos totais.
- Testes: anual automática sem toque não vira atrasada nem notifica a cada dia; assinatura manual continua como antes; silenciada não notifica.

**c) Interface**
- SubModal: "Cobrança automática" e "Não avisar desta assinatura".
- Card: "Cobrado em DD/MM" no lugar de "Paguei" quando a assinatura é automática.

**Aceite:** a anual automática do levantamento não gera aviso diário. Os testes de `dueStatus` da Sprint 2 continuam passando sem alteração.

## T4 — Apagar dados e privacidade · tamanho M

Arquivos: `storage.js`, `App.jsx`, `ConfirmDialog.jsx`, `Profile.jsx`, testes e e2e.

**a) Limpeza (`storage.js`)**
- `clearAllData(storage)`: remove `STORAGE_KEY`, todas as `LEGACY_KEYS` e as chaves que terminam em `:corrupt-backup`. Não mexe em outras chaves.
- Testes com um storage falso: remove as chaves certas e preserva as outras.

**b) Fluxo (Perfil, seção "Seus dados", com estilo de ação perigosa)**
- Botão "Apagar todos os dados".
- Diálogo: explica o que será apagado, oferece "Exportar backup antes" e exige digitar `APAGAR` para confirmar. O `ConfirmDialog` ganha esse modo, mantendo foco inicial e Esc como hoje.
- Depois de apagar: o estado volta ao padrão, o app volta ao onboarding e aparece um toast.
- Textos na tela: a permissão de notificação só é revogada nas configurações do navegador, e os backups já baixados não são apagados pelo app.

**c) Política de privacidade curta (Perfil, seção "Privacidade")**
- O que fica no aparelho: assinaturas, pessoas, pagamentos e preferências.
- O que sai do aparelho: apenas o que o tester escreve no formulário de feedback, com versão e plataforma.
- Como pedir a exclusão das respostas do formulário: e-mail de contato do Victor (a definir).

**Aceite:** e2e: sem digitar APAGAR, o botão não apaga; depois de apagar, o onboarding aparece, e recarregar a página mantém o app vazio.

**Manual (Victor):** definir o e-mail de contato para pedidos de exclusão e revisar o texto da política.

## T5 — Fechamento · tamanho P/M

**a) QA em iPhone e Android**
- Roteiro passo a passo, com resultado esperado em cada etapa e o que fazer se algo falhar (abrir uma Issue no GitHub, com aparelho, navegador e passo).
- Itens: instalar; onboarding; cadastrar mensal, anual e semanal; dividir com nomes; pagar e desfazer; configurar avisos; exportar e importar backup; apagar dados; enviar feedback.
- Registrar o resultado no próprio roteiro ou numa Issue.

**b) Pendências**
- Resolver os 2 avisos de `react-hooks`. O de `useCompanySearch.js` é um `setState` chamado dentro de `useEffect`. Corrigir sem mudar o comportamento da busca.
- Proteção da `main` (manual, Victor): no GitHub, em Settings → Branches, criar regra para `main` exigindo os checks `unit-and-build` e `e2e`. Resultado esperado: a regra aparece como ativa, e merge com teste vermelho fica bloqueado.
- Fumaça em produção, depois do merge: criar e remover uma assinatura de cada ciclo.

**c) Versão e documentação**
- `package.json` na versão 2.3.0.
- README: seções de pessoas e divisão, notificações, apagar dados e privacidade, e backup.

## Durante o beta: Sprint 4

Só começar depois do feedback inicial. Itens candidatos, na ordem definida pelo feedback:
- Pausar e cancelar, com a economia acumulada.
- Exportar para o calendário (.ics).
- Teste grátis com aviso antes da primeira cobrança.
- Home com próximos 30 dias e gasto por categoria.
- Exportar CSV.
- Moeda estrangeira com cotação manual e IOF configurável.
- Histórico de preço e ciclo trimestral.

## Riscos

- **Migração para o schema 9:** dados antigos precisam carregar sem perda. Validar com backup real (T1).
- **iPhone e armazenamento:** sem instalar, o Safari pode apagar dados após cerca de 7 dias sem uso. Por isso a T0 e o lembrete de backup vêm antes do beta.
- **Preview protegido:** o login da Vercel pode impedir a instalação do PWA no preview. Se acontecer, testar a instalação na produção depois do merge.
- **Lint e build locais:** podem falhar em máquinas com `node_modules` de outro sistema. Ver pré-requisitos.

## Definição de pronto

- [ ] Cada PR com testes unitários e e2e (desktop e Pixel 7).
- [ ] Os testes existentes continuam passando sem alteração.
- [ ] `npm run lint` sem avisos, e build ok.
- [ ] Migração testada com backup real da produção.
- [ ] Roteiro de QA executado em iPhone e Android, com registro.
- [ ] Formulário de feedback testado de ponta a ponta: botão, formulário e e-mail de resposta.
- [ ] Política de privacidade e contato no app.
- [ ] README atualizado, versão 2.3.0.

## Prompt para iniciar no Claude Code

> Leia `docs/sprint-3.md` inteiro e siga a ordem dos PRs. Comece pela T0 em uma branch `feat/sprint-3-pre-beta`, sem commitar na `main`. Antes de qualquer mudança, rode `git status` e `npm test` e me diga o que encontrou. Quando eu precisar fazer algo manual (GitHub, Google Forms, celular, terminal), explique passo a passo, porque é a minha primeira vez.
