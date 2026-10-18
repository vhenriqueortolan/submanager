# Sprint 6: teclado, contatos e ajustes de UX

> Versão executável do plano. As decisões ficam em `claude/sprint-6-ux-contatos-teclado.md` no projeto. Se houver diferença, este arquivo vale. A pasta `docs/` nunca entra em commit.

## Ponto de partida (17/10/2026)

- `main` na versão 2.6.0 (merge da PR #39, Sprint 5 fechada).
- `CLAUDE.md` tem a seção "Economia de contexto" alterada na pasta, sem commit. Vai como primeira PR, em branch própria.
- Chave de dados `subDataV5`, `SCHEMA = 10`. Esta sprint não sobe o schema: os campos novos de pessoa são opcionais, com default em `normalizePeople`. Confirmar na PR-6.

## Decisões já tomadas (não reabrir)

1. Pinça bloqueada no app inteiro. Custo de acessibilidade aceito.
2. Atualizar puxando verifica versão nova e recalcula os status. Só na tela inicial, sem telas abertas.
3. Nenhum foco automático ao abrir telas, em todas as plataformas. Diálogo de confirmação mantém foco em Cancelar. Folha de edição mantém foco no primeiro campo, como hoje.
4. Exceção aprovada: `e2e/a11y-storage.spec.js`, linha 8, passa a exigir nenhum foco ao abrir a tela no mobile.
5. Pessoa: só o nome é obrigatório. Telefone e e-mail são opcionais.
6. País em select, com Brasil (+55) como padrão. Número com + sugere outro país pelo código. Número sem + usa o país selecionado.
7. Contatos só via PWA, sem custo, sem domínio próprio e sem servidor.
8. Contatos em três caminhos, com uma só tela de revisão: seletor da agenda (quando houver), importação `.vcf` e digitação.
9. Teclado: Esc, Enter, Espaço e Tab. Sem atalhos de letra.
10. Nome, telefone e e-mail nunca vão para o analytics.

## Regras do projeto (CLAUDE.md)

- Uma branch e uma PR por tarefa. Nunca commit direto na `main`. Merge só com `unit-and-build` e `e2e` verdes.
- Testes existentes não mudam. Exceções desta sprint: (a) a linha 8 de `a11y-storage.spec.js`, aprovada; (b) migração de caminho nas PRs que mudam layout (Portfólio, Orçamento), descrita no corpo da PR.
- Datas sempre por `src/lib/dates.js`.
- Valores visuais só em `src/design/tokens.css`. Componentes novos usam `var(--...)`.
- Campos de texto com fonte de 16px ou mais (`e2e/campos-tamanho.spec.js`). Vale para os campos de contato.
- Textos de interface e mensagens de commit em pt-BR.
- Passo manual: explicar o que é, por que serve e o resultado esperado, um a um.

## Ordem das PRs

### PR-0 · `chore/economia-contexto`
- Commitar a seção "Economia de contexto" do `CLAUDE.md`, em branch própria.
- Aceite: diff só com essa seção.

### PR-1 · `fix/sprint-6-foco`
- `src/hooks/useFocusTrap.js`: aceitar a opção `initialFocus`, com valores `none` (telas), `first` (folhas de edição) e `cancel` (confirmação). Hoje o hook foca o primeiro item por padrão, perto da linha 67.
- `src/components/DetailScreen.jsx`: remover o foco automático no desktop (`focusFirst`, linha 19).
- `src/components/ConfirmDialog.jsx`: manter `autoFocus` em Cancelar (linha 62).
- `e2e/a11y-storage.spec.js`, linha 8: trocar a expectativa de foco no Voltar por nenhum elemento focado ao abrir a tela. Registrar a exceção no corpo da PR.
- Testes novos: abrir tela de detalhe não foca nada (desktop e Pixel 7). Confirmação foca Cancelar.
- Aceite: CI verde e nenhum outro teste alterado.

### PR-2 · `fix/sprint-6-portfolio-orcamento`
- `src/components/Home.jsx`, componente `Hero` (linhas 15 a 35): saudação em elemento próprio, acima do bloco de contagem.
- `src/components/profile/Orcamento.jsx`: remover o `Button` "Salvar" (linha 29). O valor salva ao confirmar a folha de edição. Confirmar que é o comportamento atual.
- `src/components/profile/Orcamento.jsx`: a linha "Histórico" (linha 32) ganha espaço próprio, com separação visível.
- Migração de caminho permitida nos testes de Portfólio e Orçamento que dependem da estrutura antiga. Descrever no corpo da PR.
- Aceite: sem botão Salvar na tela de orçamento. Saudação fora do bloco de contagem. Histórico com distância visível.

### PR-3 · `feat/sprint-6-teclado`
- `src/components/Home.jsx`, `SubCard` (linhas 87 a 110): tratar Enter e Espaço só quando `e.target === e.currentTarget`. Enter no botão "Paguei" marca o pagamento sem abrir o cadastro.
- `src/components/SubModal.jsx`: passos do cadastro dentro de `<form>`, com `onSubmit` que avança ou salva. Enter no campo avança.
- `src/components/Onboarding.jsx`: mesma correção no "Continuar".
- Conferir Esc em todas as camadas de `src/hooks/useScreenStack.js`.
- Testes novos: Enter em "Paguei" marca pagamento. Enter avança passo do cadastro. Tab percorre o Portfólio na ordem visual. Esc fecha folha e tela.
- Aceite: CI verde e nenhum teste existente alterado.

### PR-4 · `feat/sprint-6-pinca`
- Antes de codar: checkpoint D1 no iPhone e no Android. Se o iOS não bloquear, parar e decidir o plano B.
- `src/main.jsx`: prevenir `gesturestart`, `gesturechange` e `gestureend` (iOS), com `{ passive: false }`.
- `src/styles.css`: `touch-action: pan-x pan-y` em `html` e `body`.
- Helper em `src/lib/gestures.js`, com testes unitários. Teste e2e: o evento de gesto chega com `defaultPrevented`.
- Limite: pinça real não se testa no Playwright. Por isso o D1.
- Aceite: D1 aprovado pelo Victor.

### PR-5 · `feat/sprint-6-atualizar`
- Lógica pura em `src/lib/pull.js`: limiar (70 px), resistência e decisão de disparo. Testes em `src/lib/pull.test.js`.
- Gesto só na tela inicial, com a página no topo e sem telas empilhadas em `useScreenStack`.
- Ao soltar: `registration.update()` (em `src/lib/registerSW.js`). Se houver versão nova, recarregar quando disparar `controllerchange`. Se não houver, recalcular status com `useToday` e recálculo de cobranças em `useStore`.
- Feedback: indicador de carregamento e toast "Atualizado" ou "Sem conexão".
- Teste e2e com toque simulado no Pixel 7.
- Aceite: D2 aprovado pelo Victor.

### PR-6 · `feat/sprint-6-contatos-dados`
- `src/lib/phone.js` (novo): tabela estática de países (ISO alpha-2 e código de discagem), sem dependência nova. Funções: normalizar para formato internacional (8 a 15 dígitos), sugerir país pelo código mais longo e validar.
- `src/lib/vcard.js` (novo): ler um ou vários vCards (`FN`, `N`, `TEL`, `EMAIL`), desdobrar linhas e ignorar `PHOTO`.
- `src/lib/people.js`: `normalizePeople` passa a manter `phone`, `phoneCountry` e `email`, opcionais. `resolvePerson` continua por nome.
- Testes: `phone.test.js` (código mais longo, +1 ambíguo, número sem + não sugere país, tamanhos) e `vcard.test.js`. Ampliar `people.test.js`.
- Verificar `src/lib/backup.js`: os campos novos entram na exportação.
- Aceite: CI verde. `SCHEMA` continua em 10, confirmado nos testes de normalização.

### PR-7 · `feat/sprint-6-contatos-ui`
- `src/components/profile/Divisao.jsx`: o campo único de nome sai. "Adicionar pessoa" abre folha (`EditorSheet` de `src/design/Editors.jsx`) com Nome (obrigatório), País (select, Brasil como padrão), Telefone (opcional) e E-mail (opcional). Tocar numa pessoa abre a mesma folha para editar.
- Botões da folha de adicionar: "Escolher da agenda", visível só com `navigator.contacts.select` e contexto seguro, e "Importar .vcf" (`input type="file"` com `accept=".vcf,text/vcard"`, aceitando vários arquivos).
- `src/lib/contacts.js` (novo): detecção do seletor e chamada `select(['name', 'tel', 'email'], { multiple: false })`.
- Tela de revisão única para o seletor e para o arquivo: lista com caixa de seleção. Nome obrigatório. Nome duplicado marcado com `NAME_ERRORS.duplicate`.
- Texto de privacidade em `Divisao.jsx`: "Nomes, telefones e e-mails ficam só neste aparelho." Conferir `DadosPrivacidade.jsx`.
- Campos com 16 px ou mais.
- Testes e2e: seletor simulado com mock de `navigator.contacts` e upload de `.vcf` com `setInputFiles`.
- Checkpoints D3 (Android), D4 (iPhone, `.vcf`) e D5 (teclado no desktop).
- Aceite: D3, D4 e D5 aprovados pelo Victor.

### PR-8 · fechamento
- Versão 2.7.0 em `package.json`.
- Atualizar o mapa de estrutura na memória e o plano no projeto com o resultado.

## Checkpoints em aparelho

- **D1:** pinça no iPhone instalado e no Android. Esperado: a tela não amplia.
- **D2:** puxar para atualizar no iPhone instalado. Esperado: indicador aparece e a versão nova entra sem fechar o app.
- **D3:** escolher da agenda no Android, no navegador e no app instalado. Esperado: seletor do sistema e campos preenchidos.
- **D4:** exportar um contato do iPhone como `.vcf` e importar no app. Esperado: tela de revisão com nome e telefone.
- **D5:** Tab, Enter e Esc no Chrome, Edge e Firefox. Esperado: fluxos completos e foco visível.

## Riscos

- iPhone sem seletor: a pessoa importa `.vcf` ou digita. A tela deve dizer isso.
- Pinça no iOS pode não bloquear totalmente. Plano B descrito no PR-4.
- Atualizar no iPhone instalado depende do service worker. Validar no D2.
- DDI +1 é compartilhado por EUA, Canadá e outros. A sugestão é EUA, editável.
- Os novos campos entram no backup. Confirmar em `backup.js`.

## Fora desta sprint

- Casar pessoas por telefone (exige servidor, Fase 3).
- Convite por SMS ou WhatsApp.
- Google People API (exige domínio próprio e verificação).
- Web Share Target.
- Atalhos de letra.

## Critérios de pronto

- CI verde em cada PR. Nenhum teste existente alterado, exceto as duas exceções acima.
- D1 a D5 registrados.
- Mapa de estrutura na memória atualizado ao fim de cada PR que cria ou move arquivo.

## Resultado (17/10/2026)

- PRs: #40 (economia de contexto), #41 foco, #42 Portfólio/Orçamento, #43 teclado, #44 pinça, #45 contatos (lib), #46 puxar para atualizar, #47 contatos (UI), #48 versão 2.7.0.
- D1 a D5 aprovados pelo Victor. `SCHEMA` continua em 10.
- Desvios: o valor do Orçamento antes só salvava no botão Salvar; agora salva ao confirmar a folha (testes de `profile.spec.js` e `navegacao.spec.js` migrados). O foco do Tab passou a ser capturado no `document` (sem foco inicial, o Tab nasce fora do diálogo). Telas soltam o foco de quem estava por baixo ao abrir.
