# Sprint 4 — Navegação e organização (UX)

> Plano para o Claude Code dar continuidade ao SubManager. Leia este arquivo inteiro antes de começar e siga a ordem dos PRs.

## Ponto de partida (16/10/2026)

- `main` na versão 2.3.0 (merge da PR #15, commit `0c92eba`), com Sprint 3 concluída.
- Dados em `localStorage` (chave `subDataV5`). `SCHEMA = 9`. **Esta sprint não muda o schema.**
- A aba Perfil reúne nome, teto, interesses, notificações, pessoas, backup, apagar dados, privacidade, instalação e sobre, em uma única página longa. Esse é o problema que a sprint resolve.
- Plano de decisões: `claude/plano-navegacao-ux.md` no projeto do Claude. Este arquivo é a versão executável.

## Objetivo

Organizar o app em telas claras, com navegação previsível entre telas, detalhes e cadastro. O Perfil vira um hub com cinco linhas. Cada linha abre uma tela de detalhe com uma responsabilidade só.

**Critério de sucesso:** uma pessoa encontra notificações, orçamento e apagar dados em um toque no hub, volta com ← ou com o Voltar do sistema, e nunca sai do app sem querer.

## Decisões já aprovadas

1. **Testes e2e:** os testes que dependem do caminho até um elemento podem ser migrados. As verificações de comportamento não mudam. A regra do CLAUDE.md é ajustada na PR 0, antes de qualquer migração.
2. **Salvar:** campos de texto e número têm botão Salvar dentro da própria tela. Chaves de notificação e ações de lista (adicionar, renomear, remover pessoa) aplicam na hora.
3. **Nomes:** "Meu perfil", "Orçamento" (substitui "Teto") e "Dados e privacidade". Nada de "Minha conta": não há contas.
4. **Beta:** ainda não convidado. Esta sprint acontece antes do convite.
5. **Navegação:** telas de detalhe entram pela direita e saem pela direita, com ← no topo. Nada de bottom sheet.
6. **Escopo:** Início, Descobrir e cadastro de assinatura entram nesta sprint.
7. **Feedback:** dentro de "Sobre". No hub, a linha "Sobre" mostra "v2.3.0 · Enviar feedback" como resumo.
8. **Orçamento** junta valor máximo por mês e a seção **Divisão** (quem divide com você).
9. **Divisão** é o nome da seção de pessoas. Não usar "Compartilhamento": a política diz que os nomes nunca saem do aparelho.
10. **Cadastro de assinatura** vira tela de detalhe, não janela centralizada.

## Contrato de navegação (vale para o app inteiro)

1. **Abas são destinos.** Trocar de aba não empilha nada.
2. **Telas de detalhe empilham.** Título no topo, ← à esquerda. Esc no desktop faz o mesmo que ←.
3. **Voltar do sistema faz o mesmo que ←.** Cada tela aberta é uma entrada do histórico do navegador. Voltar nunca fecha o app enquanto houver tela aberta.
4. **Alteração não salva + ← ou Voltar = pergunta "Descartar alterações?"** com "Descartar" e "Continuar editando".
5. **Confirmação só para ação irreversível.** Continua centralizada, com "Cancelar" focado.
6. **Ação destrutiva nunca fica no nível da tela.** Fica em "Dados e privacidade" ou no fim da própria tela, separada e em vermelho (zona de risco).
7. **Título de seção não tem cara de campo.** Use o componente de título de seção novo (ver U0), não `<label>`.
8. **Texto de ajuda aparece uma vez**, perto do controle a que se refere.
9. **Reduzir movimento:** com `prefers-reduced-motion`, a troca de tela é instantânea.

## Estrutura

### Hub (aba Perfil)

| Linha | Resumo na linha | Tela |
|---|---|---|
| Meu perfil | "Victor · 2 interesses" (ou "Sem interesses") | Nome; Interesses com a frase "Usados para sugerir serviços ao cadastrar" |
| Orçamento | "R$ 300 por mês · dividindo com 2" (sem pessoas: sem o trecho; sem valor: "Sem valor definido") | Valor máximo por mês (ajuda: "Conta só a sua parte"); seção Divisão |
| Notificações | "Ativas · 1 dia antes" (ou "Desligadas") | Navegador · Avisos · Quando avisar |
| Dados e privacidade | "Último backup em DD/MM" (ou "Nenhum backup ainda") | Backup · o que fica e o que sai do aparelho · Zona de risco |
| Sobre | "v2.3.0 · Enviar feedback" (sem a parte do feedback se a URL estiver vazia) | Versão · instalar (só quando aplicável) · enviar feedback · política |

### Divisão (dentro de Orçamento)

- Lista de pessoas com a quantidade de assinaturas divididas com cada uma ("divide 2 assinaturas").
- Adicionar pessoa (campo + "Adicionar"; Enter confirma). Nome com até 40 caracteres.
- Renomear. Nome repetido (sem diferenciar maiúsculas) é bloqueado com a mensagem "Já existe uma pessoa com esse nome".
- Remover pede confirmação e recalcula as divisões, como hoje.

### Cadastro de assinatura (tela de detalhe)

- Passo 1 (buscar) é a raiz da tela. ← fecha a tela. Remove o botão "Cancelar" do passo 1.
- Passo 2 (detalhes) empilha. ← volta ao passo 1 no cadastro novo. Na edição, ← fecha a tela.
- O Voltar do sistema no passo 2 volta ao passo 1 (não fecha).
- Seções do passo 2: **Serviço** (nome, cobrança, valor, vencimento), **Pagamento** (método, cobrança automática), **Divisão** ("Dividido com"), **Avisos** ("Não avisar desta assinatura"), **Histórico** (só na edição).
- "Remover Assinatura" sai do meio do formulário e vai para o fim, separado por uma linha, em vermelho.

## Convenções

Valem as da Sprint 3, com estes acréscimos:

- **Textos de UI em pt-BR.** Sem parênteses duplicados (ex.: "Teto mensal (sua parte) (R$)" não existe mais).
- **Cada PR deixa o app funcional.** Uma tela que ainda não foi redesenhada abre com o conteúdo atual, movido sem mudanças. O redesenho vem na PR da tarefa.
- **Testes:** migrar mantendo as mesmas verificações de comportamento. Cada teto ou caminho alterado fica registrado no corpo do PR, com a lista de testes migrados.
- **Testes novos** para toda regra nova em `src/lib/` (TDD para qualquer função pura nova, como renomear pessoa e interpretar valor em R$).
- **Dependências:** nenhuma nova. Animação com CSS.
- **Schema:** sem mudança. Nenhum campo novo no estado nesta sprint.
- **Analytics:** manter os eventos existentes com os mesmos nomes e propriedades (`notification_permission`, `backup_exported`, `backup_imported`, `subscription_added`, `subscription_removed`, `onboarding_completed`). Não criar eventos novos nesta sprint. Nunca enviar nome, valor ou data.
- **Z-index:** tela de detalhe 200 (como `.modal-overlay`), `ConfirmDialog` 350, toast 400.
- **Estilo de seção:** criar `.section-title` (ou equivalente) para títulos de seção, separado de `label`.
- **docs/ fora do Git:** a pasta `docs/` está excluída pelo `.git/info/exclude` do computador do Victor. Victor decidiu manter os planos só localmente (16/10/2026). Não commitar nem alterar arquivos de `docs/`, e não mexer no `.git/info/exclude`.
- **Ações manuais:** ao pedir algo ao Victor, explique o que é, por que serve e qual resultado esperar em cada passo.

## Ordem e PRs

| PR | Tarefas | Branch sugerida | Observação |
|----|---------|-----------------|------------|
| 0 | Regra de testes no CLAUDE.md | `chore/sprint-4-regra-testes` | Pequena. Precisa estar na `main` antes das migrações. |
| 1 | U0 | `feat/sprint-4-tela-detalhe` | Componente de tela e histórico. |
| 2 | U1 + U2 | `feat/sprint-4-hub-perfil` | Hub, Meu perfil e valor do Orçamento. Notificações, Dados e Sobre entram como estão. |
| 3 | U3 | `feat/sprint-4-divisao` | Seção Divisão com ações na hora. |
| 4 | U4 | `feat/sprint-4-notificacoes` | Tela Notificações em três blocos. |
| 5 | U5 | `feat/sprint-4-dados-sobre` | Dados e privacidade, zona de risco e Sobre com alinhamento corrigido. |
| 6 | U6a | `feat/sprint-4-inicio-descobrir` | Início, Descobrir e rótulo de Orçamento no onboarding. |
| 7 | U6b | `feat/sprint-4-cadastro-tela` | Cadastro como tela de detalhe. |
| 8 | U7 | `chore/sprint-4-fechamento` | e2e final, revisão de texto, README, roteiro de QA, versão 2.4.0. |

Cada PR precisa de CI verde (`unit-and-build` e `e2e`) antes do merge. Merge na `main` publica em produção.

## PR 0 — Regra de testes (chore)

- `CLAUDE.md`, linha "Os testes existentes não podem ser alterados, só ampliados.": manter a regra e acrescentar a exceção:
  > Exceção: quando uma sprint aprovada muda a navegação ou o layout (ex.: `docs/sprint-4-ux.md`), os testes que dependem do caminho até um elemento podem ser migrados, desde que as mesmas verificações de comportamento continuem valendo. A migração é descrita no corpo do PR.
- Sem mudança de código de app.
- Não incluir arquivos de `docs/` no commit: a pasta fica fora do Git (ver Convenções).

## U0 — Tela de detalhe e histórico · tamanho M

Arquivos: `src/hooks/useScreenStack.js` (novo), `src/components/DetailScreen.jsx` (novo), `src/styles.css`, `e2e/detail-screen.spec.js` (novo).

**a) Histórico**
- Ao abrir uma tela, `history.pushState({ screen: id }, '')`. Sem mudar a URL.
- ← e Esc chamam `history.back()`. O evento `popstate` fecha a tela atual.
- Trocar de aba não empilha.

**b) Guarda de alterações**
- Prop `dirty`. Se for verdadeira e a pessoa sair (← ou Voltar), abrir `ConfirmDialog`: "Descartar alterações?", com "Descartar" e "Continuar editando".
- Atenção: quando o Voltar do sistema é usado, o navegador já removeu a entrada antes da pergunta. Para cancelar, é preciso empilhar de novo com `pushState` e manter a tela aberta. Esse caso precisa de teste.

**c) Animação**
- Entrada: `translateX(100%)` → `0`, cerca de 250 ms. Saída: o inverso.
- A tela continua montada até o fim da animação de saída.
- `@media (prefers-reduced-motion: reduce)`: sem animação.

**d) Título de seção**
- Componente ou classe `.section-title` (já existe no CSS com outro uso; criar nome novo para o título de seção do Perfil, por exemplo `.section-heading`).

**e) Esc**
- Fecha a tela se não houver alteração. Com alteração, pergunta.

**Aceite:** e2e em desktop e Pixel 7:
- Abrir uma tela de detalhe de teste e `page.goBack()` fecha a tela e o app continua na aba.
- Esc fecha. ← fecha.
- Alteração não salva + ← pergunta. "Continuar editando" mantém a tela aberta e a alteração.
- A tela não sai do app quando há tela aberta.

## U1 — Hub do Perfil · tamanho P/M

Arquivos: `src/components/Profile.jsx` (vira hub), `src/App.jsx`.

- Cartão superior com nome (ou "Olá, Victor") e cinco linhas, cada uma com título, resumo e chevron (›).
- Linha = `<button>` com nome acessível (ex.: "Orçamento. R$ 300 por mês").
- Remover o formulário inline e o botão global "Salvar Configurações".
- O `key` de remontagem no `App.jsx` deixa de ser necessário para o hub.
- Resumos conforme a tabela da seção "Hub".

**Aceite:** hub mostra as cinco linhas nessa ordem; cada linha abre sua tela; os resumos batem com os dados salvos.

## U2 — Meu perfil e valor do Orçamento · tamanho M

Arquivos: `src/components/profile/MeuPerfil.jsx` (novo), `src/components/profile/Orcamento.jsx` (novo), `src/lib/` (função pura de valor, se necessário), testes.

**a) Meu perfil**
- Nome (campo) e Interesses (chips das categorias, com a frase de ajuda). Botão Salvar.
- Interesses continuam salvos com `saveProfile`.

**b) Orçamento: valor**
- Campo "Valor máximo por mês" com prefixo R$, aceita vírgula e ponto (ex.: `300`, `300,50`, `300.50`). Ajuda: "Conta só a sua parte."
- Função pura para interpretar o valor digitado, com testes em `src/lib/` (casos: vazio, `0`, vírgula, ponto, texto inválido).
- Botão Salvar. Valor 0 = sem teto.

**c) Divisão nesta PR:** a lista atual de pessoas (com Remover) é movida para dentro da tela Orçamento, sem mudanças. O redesenho vem na U3.

**d) Notificações, Dados e privacidade e Sobre nesta PR:** cada linha do hub abre uma tela com o conteúdo atual movido, sem redesenho. Isso garante que o app continua funcional.

**Testes migrados (ver tabela "Testes que passam pela aba Perfil"):** `profile.spec.js` (campos, salvar e reload, rascunho descartado), `split.spec.js` (remover pessoa).

**Aceite:** salvar nome e valor reflete no Início. Salvar interesses reflete no cadastro (recomendados). Descartar é perguntado (U0).

## U3 — Seção Divisão · tamanho M

Arquivos: `src/components/profile/Orcamento.jsx`, `src/lib/people.js`, `src/lib/people.test.js`, e2e.

- Função pura `renamePerson(people, id, name)` em `people.js`, com testes: renomear, nome repetido (bloqueado), nome vazio, nome com mais de 40 caracteres.
- Lista com a contagem de assinaturas divididas por pessoa.
- Adicionar, renomear e remover aplicam na hora, sem Salvar.
- Remover mantém o texto de confirmação atual e recalcula as divisões.
- Usar `resolvePerson` (já existe) para adicionar; não duplicar a lógica.

**Aceite:** e2e: adicionar pessoa aqui aparece em "Dividido com" no cadastro; renomear reflete nas assinaturas divididas; remover recalcula o "Sua parte" no Início.

## U4 — Tela Notificações · tamanho M

Arquivos: `src/components/profile/Notificacoes.jsx` (novo), `src/components/Profile.jsx`, e2e.

Três blocos, cada um com título de seção novo:

1. **Navegador:** estado ("Ativadas no navegador", "Bloqueadas…", "Ainda não pedidas.") com botão "Ativar" quando não pedidas. Este é o **único** botão que pede a permissão.
2. **Avisos:** "Receber avisos" (master, com a ajuda "Os avisos chegam quando o app está aberto."), "Avisar no dia" e "Avisar atrasadas". Os dois últimos ficam desabilitados com o master desligado.
3. **Quando avisar:** select com "Não avisar antes", "1 dia antes", "3 dias antes", "7 dias antes".

Regras:
- Chaves aplicam na hora (`updateSettings`).
- No iPhone fora da Tela de Início, um aviso curto: "Para receber avisos no iPhone, instale o app. Veja como em Sobre." Essa é a única menção no bloco. A frase completa sobre iPhone fica em Sobre.
- Manter o `trackEvent('notification_permission', …)` no botão Ativar.

**Testes migrados:** `notification-settings.spec.js` (chaves e antecedência salvas, bloqueado, iOS hint). Os seletores `#set-*`, `#notif-status` e `#notif-ios-hint` podem ser mantidos.

**Aceite:** a frase "Os avisos chegam quando o app está aberto." aparece uma vez na tela. Desligar "Receber avisos" desabilita os dois itens dependentes.

## U5 — Dados e privacidade e Sobre · tamanho M

Arquivos: `src/components/profile/DadosPrivacidade.jsx` (novo), `src/components/profile/Sobre.jsx` (novo), `src/styles.css`, e2e.

**a) Dados e privacidade**
- Bloco Backup: "Exportar" e "Importar", com "Último backup em DD/MM" (usa `lastBackupAt`).
- Bloco Privacidade: o que fica e o que sai do aparelho (manter as frases atuais, que os testes verificam).
- **Zona de risco** no fim: título "Zona de risco" em vermelho e botão "Apagar todos os dados" em estilo de linha vermelha, não botão grande. ConfirmDialog igual ao atual (APAGAR + Exportar antes).

**b) Sobre**
- Versão.
- Instalar o app (só quando `installState` não for `unavailable`), com os passos do iPhone. A frase "No iPhone, os avisos só funcionam com o app instalado." fica aqui, uma vez.
- **Enviar feedback:** corrigir o alinhamento. Causa: `.btn` tem `width: 100%`, mas `<a>` é inline e ignora a largura. Correção: o link vira bloco (`display: block`) ou usa uma classe própria. Teste: a largura do link é igual à do botão Exportar.
- Política de privacidade (o texto de "Privacidade" vai para cá ou fica em Dados; escolher um lugar só).

**Testes migrados:** `clear-data.spec.js` (apagar com APAGAR, exportar antes, o que fica e o que sai), `storage.spec.js` (exportar, importar), `profile.spec.js` (versão, instalação no iPhone, feedback).

**Aceite:** botão de feedback com a mesma largura do botão Exportar. "Apagar todos os dados" fica no fim de Dados e privacidade, sem aparecer no hub.

## U6a — Início, Descobrir e onboarding · tamanho M

Arquivos: `src/components/Home.jsx`, `src/components/Discover.jsx`, `src/components/Onboarding.jsx`, e2e.

**Início**
- Card "Teto" vira **"Orçamento"**. O card inteiro é um botão que abre a tela Orçamento (teclado e foco).
- Alertas: "Teto excedido!" vira "Orçamento excedido!". "Próximo ao limite." fica.
- Banner de notificação: o botão "Ativar" passa a abrir a tela Notificações (lá está o único pedido de permissão). Remover o botão "Ativar" do Perfil.
- Banner de backup: borda com a cor de alerta (`--warning`). Banner de notificação: neutro.

**Descobrir**
- Rótulo acessível das pílulas: "Filtrar por categoria".
- "Adicionar manualmente" vira "Inserir dados manualmente", como no cadastro.

**Onboarding**
- Rótulo do campo: "Valor máximo por mês (só a sua parte)".

**Testes migrados:** `notifications.spec.js` (`#notif-prompt`), `discover.spec.js` (copy), testes que buscam "Teto" (inclusive `portfolio` e `home-cycles`).

**Aceite:** tocar no card de orçamento no Início abre a tela. O banner de notificação leva à tela Notificações. Não há mais "Teto" na interface.

## U6b — Cadastro como tela de detalhe · tamanho M/G

Arquivos: `src/components/SubModal.jsx` (vira tela), `src/components/DetailScreen.jsx`, testes.

- Renderizar o cadastro dentro de `DetailScreen` (U0).
- Passo 1 e passo 2 entram no histórico. Voltar do sistema no passo 2 volta ao passo 1.
- Seções do passo 2 (ver seção "Estrutura > Cadastro").
- "Remover Assinatura" no fim, separado, em vermelho.
- Botão Salvar desabilitado sem nome: mostrar a dica "Informe o nome do serviço".
- Placeholder de valor "0,00" (pt-BR).
- Dirty guard: cadastro novo com dados digitados pergunta ao sair com ← ou Voltar. Esc também pergunta.
- Esc, ConfirmDialog de "Remover assinatura?" e demais diálogos continuam como estão.

**Se a tarefa ficar grande,** dividir em U6b1 (estrutura de tela e histórico) e U6b2 (seções e zona de risco).

**Testes migrados:** `portfolio.spec.js`, `a11y-storage.spec.js` (botão "Remover Assinatura"), `onboarding.spec.js` e demais testes que usam o cadastro (verificar o caminho até o formulário).

**Aceite:** cadastro abre com ← no topo. Voltar do sistema no passo 2 volta ao passo 1. Remover assinatura fica no fim, em vermelho, e continua pedindo confirmação.

## U7 — Fechamento · tamanho M

- e2e final em desktop e Pixel 7. Acrescentar testes de Voltar em cada tipo de tela: hub → tela; passo 2 → passo 1 → fechar; descarte com "Continuar editando".
- Revisão de texto do app inteiro. Procurar e corrigir: "Teto" (restante), parênteses duplicados, "Afeta as recomendações", placeholders com ponto decimal.
- Lint sem avisos. Se os dois avisos de `react-hooks` da Sprint 3 ainda existirem, resolver aqui.
- README: seção de navegação (hub, telas de detalhe, Voltar).
- `docs/qa-beta.md`: atualizar o roteiro com os novos caminhos (Voltar, zona de risco, Orçamento e Divisão).
- Versão 2.4.0 em `package.json`.

## Testes que passam pela aba Perfil

| Arquivo | O que testa hoje | Onde vai migrar |
|---|---|---|
| `profile.spec.js` | campos e rascunho; salvar e reload; versão; instalação no iPhone; feedback | Meu perfil (U2); Sobre (U5) |
| `clear-data.spec.js` | apagar com APAGAR; exportar antes; o que fica e o que sai | Dados e privacidade (U5) |
| `notification-settings.spec.js` | chaves e antecedência salvas; bloqueado; aviso iOS | Notificações (U4) |
| `split.spec.js` | remover pessoa pede confirmação e recalcula | Orçamento > Divisão (U2/U3) |
| `storage.spec.js` | exportar; importar e nome importado | Dados (U5); Meu perfil (U2) |
| `payments.spec.js` (perto da linha 72) | verificar o que o teste faz na aba Perfil | conforme o caso |
| `notifications.spec.js` | `#notif-prompt` no Início | Início (U6a) |
| `portfolio.spec.js`, `a11y-storage.spec.js` | "Remover Assinatura" e passos do cadastro | Cadastro (U6b) |
| `discover.spec.js`, `home-cycles.spec.js` | copy e rótulo "Teto" | U6a |

Regra: a verificação é a mesma; muda o caminho até o elemento. Teste do descarte de rascunho (`profile.spec.js`, "rascunhos são descartados") vira o teste da pergunta "Descartar alterações?", com a mesma garantia: a edição não salva não vira valor salvo.

## Passos manuais (Victor)

Estes passos são seus. Cada um explica o que é, por que serve e o resultado esperado.

**M1. Instalar as dependências (se ainda não fez na Sprint 3).**
- O que é: `npm ci` instala as bibliotecas do projeto na sua máquina.
- Por que: sem isso, `npm run lint` e `npm run build` falham no Windows.
- Passos: abra o terminal na pasta do projeto e rode `npm ci`.
- Resultado esperado: a instalação termina sem erro, e `npm run build` cria a pasta `dist`.

**M2. Testar o Voltar do Android (depois da PR 1, no preview).**
- O que é: o preview é a cópia de teste que a Vercel publica para cada PR. O link aparece no próprio Pull Request, num comentário da Vercel ("Visit Preview").
- Por que: é o teste que confirma que o Voltar do sistema fecha a tela, e não o app.
- Passos: abra o preview no Chrome do Android (se pedir login da Vercel, use a sua conta). Instale o app pelo menu ⋮ → "Instalar app" ou "Adicionar à tela inicial". Abra o app instalado, vá em Perfil → Orçamento e toque no Voltar do sistema (gesto ou botão ◁).
- Resultado esperado: a tela fecha e você continua no Perfil. O app não fecha. Depois, altere o valor sem salvar, toque Voltar e escolha "Continuar editando": a alteração continua lá.

**M3. Testar no iPhone (depois da PR 2).**
- O que é: teste de navegação no iPhone instalado.
- Por que: no iPhone não há botão Voltar do sistema. O ← da tela precisa funcionar.
- Passos: no Safari, toque em Compartilhar (quadrado com seta) → "Adicionar à Tela de Início". Abra o app pelo ícone. Vá em Perfil → Orçamento e toque no ←.
- Resultado esperado: a tela desliza para a direita e você volta ao Perfil. Registre o resultado.

**M4. Conferir o Início (depois da PR 6).**
- Toque no card "Orçamento" do Início: deve abrir a tela. Toque em "Ativar" no banner de notificação: deve abrir a tela Notificações.

**M5. Fechamento (PR 8).**
- Execute o roteiro atualizado de `docs/qa-beta.md` no iPhone e no Android, e registre cada resultado.

**M6. Merge de cada PR.**
- Abra o Pull Request no GitHub, aguarde os dois checks ficarem verdes (`unit-and-build` e `e2e`) e clique em "Merge pull request". Merge publica em produção, então só faça quando os checks estiverem verdes.

**M7. Proteção da `main`** (pendência da Sprint 3, se ainda não foi feita). Ver `docs/sprint-3.md`, T5.

## Riscos

- **Histórico e descarte:** o caso "Voltar removeu a entrada e a pessoa cancelou" é o mais delicado. Testar com e2e e no Android antes de avançar para U1.
- **iOS:** o comportamento do gesto de borda varia. O ← visível é a saída garantida.
- **Preview protegido:** a Vercel pode pedir login para o preview. Ver `docs/sprint-3.md`, Riscos.
- **Merge = produção:** por isso cada PR deixa o app funcional (conteúdo movido sem mudança antes do redesenho).
- **Tamanho de U6b:** o cadastro tem mais de 300 linhas. Dividir se necessário.

## Definição de pronto

- [ ] PR 0 na `main`: regra do CLAUDE.md ajustada.
- [ ] Cada PR com testes unitários e e2e (desktop e Pixel 7), CI verde.
- [ ] Testes existentes migrados com as mesmas verificações, registrados no corpo de cada PR.
- [ ] Hub com cinco linhas; todas as telas abrem e fecham com ← e com o Voltar do sistema.
- [ ] Notificações, Dados e privacidade e Sobre redesenhados conforme as tarefas.
- [ ] Divisão com adicionar, renomear e remover; ações na hora.
- [ ] Início mostra "Orçamento"; "Teto" não aparece mais na interface.
- [ ] Cadastro de assinatura como tela de detalhe, com ← no topo e "Remover Assinatura" no fim.
- [ ] Botão de feedback com a largura correta.
- [ ] `npm run lint` sem avisos; `npm test` e `npm run build` ok.
- [ ] Roteiro de QA executado em iPhone e Android, com registro (M2, M3, M5).
- [ ] README e `docs/qa-beta.md` atualizados; versão 2.4.0.

## Depois desta sprint

Os candidatos da Sprint 4 da lista anterior passam para a Sprint 5, na ordem definida pelo feedback do beta: pausar e cancelar, exportar para o calendário (.ics), teste grátis, Início com próximos 30 dias e categorias, CSV, moeda e IOF, histórico de preço e ciclo trimestral.

## Prompt para iniciar no Claude Code

> Leia `docs/sprint-4-ux.md` inteiro e siga a ordem dos PRs. Comece pela PR 0 em uma branch `chore/sprint-4-regra-testes`, sem commitar na `main`. Antes de qualquer mudança, rode `git status` e `npm test` e me diga o que encontrou. Quando eu precisar fazer algo manual (GitHub, celular, terminal), explique passo a passo, porque é a minha primeira vez.
