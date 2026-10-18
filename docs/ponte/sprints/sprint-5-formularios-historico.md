# Sprint 5 — Fundação visual, formulários, ciclo de vida e histórico

> Plano para o Claude Code dar continuidade ao SubManager. Leia este arquivo inteiro antes de começar e siga a ordem dos PRs.

## Ponto de partida (16/10/2026)

- `main` na versão 2.4.0 (Sprint 4 concluída, commit `abfca58`).
- Dados em `localStorage` (chave `subDataV5`). `SCHEMA = 9`. Esta sprint sobe o schema para 10 (bloco de histórico), com migração aditiva.
- Problemas que a sprint resolve:
  - campos com fonte menor que 16px, que dão zoom automático no iPhone;
  - foco automático em campo, que abre o teclado sem o usuário pedir;
  - formulários com caixas abertas para dados que quase não mudam;
  - falta de um Design System, que deixa os valores espalhados;
  - falta de pausar e cancelar;
  - falta de histórico de pagamentos e de visão unificada dos gastos.
- Plano de decisões: `claude/sprint-5-formularios-e-historico.md` no projeto do Claude. Este arquivo é a versão executável. Se houver diferença, este arquivo vale.

## Decisões já tomadas (não reabrir)

1. **Hotfix primeiro**, em PR separada, antes de qualquer outra mudança.
2. **Padrão de edição:** heróis editáveis para nome e valor, e linhas de configuração com chevron para o resto. Tocar abre o editor.
3. **Histórico desde o cadastro.** Cobranças automáticas dos ciclos passados são preenchidas ao abrir o app, marcadas como `estimated` e com o preço atual. Meses pausados ficam de fora. Nada é preenchido antes do cadastro.
4. **Entradas do histórico:** card no Portfólio e linha "Histórico" dentro da tela Orçamento.
5. **Mock do cadastro** publicado como artefato e aprovado pelo Victor antes de F0.
6. **Pausar e cancelar:** bloco de status logo abaixo do herói, em botões de tamanho normal. O destaque vem da posição, não do tamanho.
7. **Design System** em `src/design/`, criado nesta sprint e aplicado no app em seguida.
8. **Entregas:** 5A (fundação e formulários) e 5B (ciclo de vida e histórico). O beta é convidado depois da 5A.
9. **Preço por cobrança:** cada registro de pagamento guarda o preço do dia (`price`). Reajustes que o app não registrou não aparecem.
10. **Registros antigos de assinatura dividida** mostram o valor cheio, com o rótulo "total" e uma nota. Ficam fora dos totais de "sua parte".
11. **Pausa:** meses pausados não viram cobrança. Reativar volta a gerar cobranças a partir da reativação.
12. **Cancelar é reversível:** botão Reativar a qualquer momento. O histórico continua.
13. **Catálogo do Design System** publicado como artefato, além do código.
14. **Guardrail de tokens** com lista de exceções, que encolhe até zerar em D5.

## Regras do projeto (CLAUDE.md)

- Nunca commitar direto na `main`. Uma branch e uma PR por tarefa indicada.
- CI verde (`unit-and-build` e `e2e`) antes do merge.
- Testes existentes não são alterados, só ampliados. **Exceção aprovada nesta sprint:** a verificação de foco no mobile em `e2e/a11y-storage.spec.js` (tarefa H2). Mais nenhuma.
- Datas: sempre por `src/lib/dates.js`. Nunca `toISOString()` para "hoje".
- Analytics: nunca enviar nome do serviço, valor ou data. No máximo 2 propriedades por evento.
- Sem dependência nova, a menos que seja indispensável.
- Textos da interface e mensagens de commit em pt-BR, com prefixos `feat:`, `fix:`, `chore:` ou `test(e2e):`.
- Commits terminam com as linhas de atribuição que o ambiente informar. PRs terminam com a linha "Generated with Claude Code".
- A pasta `docs/` nunca entra em commit. Não alterar `.git/info/exclude`.
- Passos manuais (GitHub, celular, terminal): explicar um por um, dizendo o que é, por que se faz e qual é o resultado esperado. O Victor está começando com git, CI, Vercel e teste em aparelho.
- Dados pessoais de backup nunca entram no repositório.

## Escopo e nomes

Cada tarefa tem um código. Os blocos não têm letra própria, para não confundir com o código das tarefas.

- **Design System:** D0 a D5.
- **Hotfix:** H1 a H4.
- **Formulários:** F0 a F5.
- **Ciclo de vida (pausar e cancelar):** C0 a C3.
- **Histórico:** HS0 a HS4.

**Entrega 5A** = D0 a D3, H1 a H4, F0 a F5 e a parte de D4 que cobre os formulários. Fim da 5A: convite de beta.
**Entrega 5B** = C0 a C3, HS0 a HS4, o restante de D4 e D5. Fim da 5B: release.

---

## 1. Hotfix (H1 a H4) — primeiro PR

Branch: `fix/sprint-5-campos-zoom`.

**Diagnóstico (verificado no código):**
- `focusFirst` está ligado nos dois passos do cadastro (`src/components/SubModal.jsx`). `DetailScreen` foca o primeiro campo ao abrir. No iPhone isso abre o teclado sozinho.
- `src/styles.css` define `input, select` sem `font-size`, então o navegador usa 13,33px. O iOS dá zoom em campos com menos de 16px. A meta `viewport` não bloqueia zoom e não deve ser mudada.
- O campo focado mostra a borda de `input:focus` e o contorno azul de `:focus-visible` ao mesmo tempo.

**Tarefas:**
- **H1.** Campos com `font-size: 16px` no mínimo, incluindo `textarea`. Comentário no CSS explicando o motivo.
- **H2.** Telas de detalhe e passos do cadastro não focam campo quando abertos por toque. O foco inicial vai para o botão ←. No desktop, o foco pode ir ao primeiro campo. O segundo efeito de `src/hooks/useFocusTrap.js` (que foca o primeiro elemento ao montar) é o ponto a ajustar. **Alteração autorizada:** em `e2e/a11y-storage.spec.js` (linhas próximas a 9–12 e 34–36), a asserção de foco em `#add-name` e `#modal-search-input` passa a valer só no projeto desktop. No projeto mobile (Pixel 7), a asserção passa a verificar que o foco está no botão ←. Registrar essa mudança no corpo da PR.
- **H3.** Foco visual único nos campos: borda e fundo, sem contorno azul. Referência:
  ```css
  :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea):focus {
    border-color: var(--text);
    outline: none;
  }
  ```
  Botões e links mantêm o `:focus-visible` atual. Checkboxes e switches também.
- **H4.** Teste e2e novo, `e2e/campos-tamanho.spec.js`. Para cada tela com campos (cadastro passos 1 e 2, Perfil > Meu perfil, Orçamento, Notificações, Dados e privacidade), todo `input`, `select` e `textarea` visível tem `getComputedStyle(el).fontSize` de 16px ou mais. Ignorar checkbox e radio.

**Acompanhamento manual:** M2 e M3 (teste no iPhone e no Android).

---

## 2. Design System (D0 a D5)

**Objetivo:** uma única fonte de verdade para cor, tipografia, espaço, forma, movimento, componentes e regras de uso.

**Onde mora:** `src/design/` (dentro do código, versionado com o app).
- `src/design/tokens.css`: variáveis em `:root`. Único lugar com valores literais de cor, tamanho, sombra e duração.
- `src/design/README.md`: diretrizes, componentes, anti-padrões e exemplos de uso.
- Catálogo publicado como artefato do tipo "Design System", para revisão no celular. O código é a fonte oficial.

**Tokens:**
- **Cor, por função:** `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-focus`, `--color-text`, `--color-text-muted`, `--color-action`, `--color-danger`, `--color-warning`, `--color-success`.
- **Aliases:** `styles.css` usa hoje `--surface`, `--border`, `--text` e `--accent`. Os nomes novos entram como aliases desses valores. Os antigos saem só quando D4 terminar.
- **Tipografia:** `display` (56px, número de destaque), `title-lg` (28px, nome do serviço), `title` (18px, títulos de seção), `body` (17px, campos e textos), `label` (13px, muted), `caption` (12px, ajuda). Pesos: 500 para corpo e campos, 600 para títulos. Espaçamento entre letras: -0.04em em títulos, -0.01em em campos.
- **Espaço:** 4, 8, 12, 16, 20, 24, 32, 40.
- **Forma:** raio 12 (controles), 16 (cards), 24 (telas e diálogos).
- **Toque:** alvo mínimo de 44px. Campos com 52px.
- **Movimento:** 250ms para entrar e sair de telas. Sem movimento com `prefers-reduced-motion`.
- **Elevação e z-index:** sombra só em toast e overlay. Base 0, sticky 1, tela de detalhe 200, confirmação 350, toast 400.

**Componentes base (D1):**
1. Botão: primário, secundário, fantasma, perigo (zona de risco). Dois tamanhos.
2. Herói editável (texto grande, com lápis).
3. Linha de configuração (rótulo, valor, chevron; variante com switch).
4. Campo: texto, número com prefixo R$, busca.
5. Lista de opções (escolha única, com marca).
6. Switch.
7. Chip (categorias, pessoas).
8. Card de item (assinatura).
9. Banner: oferta (neutro) e alerta (cor de aviso).
10. Badge de status: automática, estimada, atrasada, pausada, cancelada.
11. Título de seção.
12. Tela de detalhe (cabeçalho com ←, corpo).
13. Diálogo de confirmação.
14. Toast com ação (desfazer).
15. Estado vazio.

**Anti-padrões (o que não fazer):**
- Campo sempre aberto para dado que quase não muda (nome, valor mensal).
- Select nativo. No iOS abre a roda do sistema e não acompanha o estilo.
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
- Cor como único indicador de status (precisa de texto ou ícone).
- Diálogo dentro de diálogo.
- Valores fixos em componentes (cor, tamanho ou sombra fora de `tokens.css`).

**Diretrizes de uso:**
- Ordem de ações: primeiro o bloco de status (pausar e cancelar), depois a edição, depois as secundárias, e por último a destrutiva, separada por uma linha.
- Botões com verbo no infinitivo. Uma ajuda por controle. Valores em R$ com vírgula e "por mês" explícito.
- Ação destrutiva sempre na zona de risco, com confirmação.

**Guardrail automático (D0):** teste unitário em `src/lib/` (sem dependência nova) que lê os CSS e falha quando há cor hexadecimal ou tamanho de fonte fora de `tokens.css`. Os arquivos que ainda têm valores fixos entram numa lista de exceções. A lista encolhe a cada tarefa de D4 e chega a zero em D5. Limite conhecido: enquanto um arquivo estiver na lista, uma cor nova nele passa sem falhar. Registrar a regra no CLAUDE.md (D3).

**Tarefas:**
- **D0.** `src/design/tokens.css` com aliases, e o guardrail com lista de exceções. Branch `chore/sprint-5-tokens`.
- **D1.** Componentes base em React, usando as classes e variáveis do `tokens.css`. Branch `feat/sprint-5-componentes-base`.
- **D2.** Mock do cadastro usando os componentes, publicado como artefato. **Sem código.** Só depois da aprovação do Victor, F0 começa.
- **D3.** `src/design/README.md` com diretrizes e anti-padrões. Regra nova no CLAUDE.md: valores visuais só em `src/design/tokens.css`. Catálogo publicado como artefato. Branch `docs/sprint-5-design-system`.
- **D4.** Aplicação gradual. Primeiro os formulários (F0 a F5). Depois o restante do app, na 5B.
- **D5.** Revisão de todo o app contra o README e guardrail sem exceções. Fim da 5B.

---

## 3. Formulários (F0 a F5)

**Diagnóstico:**
- Caixas de campo aparecem mesmo para dados de exibição (nome do serviço, valor mensal).
- O título "SERVIÇO" e o rótulo "Serviço" repetem a mesma coisa.
- O select "Cobrança" não tem seta, então parece texto.
- A família de fonte é a mesma (o seletor `*` define), mas os campos não herdam tamanho, peso, espaçamento entre letras nem altura de linha.

**Padrão, "ver primeiro, tocar para editar":**
- Herói editável para nome e valor.
- Linha de configuração para cobrança, vencimento, pagamento e demais campos. Tocar abre o editor.
- Lista de opções do próprio app no lugar dos selects nativos.
- Switch para sim ou não.
- Um título por informação.

**Tarefas:**
- **F0.** Tokens de formulário e regra de título de seção, sem repetição. Branch `feat/sprint-5-formularios-base`.
- **F1.** Componente Herói editável. Branch `feat/sprint-5-heroi-editavel`.
- **F2.** Componente Linha de configuração e editor (texto e valor).
- **F3.** Componente Lista de opções, substituindo os selects.
- **F4.** Aplicar no cadastro (passo 2, `src/components/SubModal.jsx`), no Orçamento (valor) e em Meu perfil (nome; `src/components/profile/MeuPerfil.jsx` e `Orcamento.jsx`).
- **F5.** Testes e2e ampliados e documentação. Fim da 5A.

**Critérios de aceite de F4:**
- No cadastro, o passo 2 mostra o nome e o valor como herói; cobrança, vencimento e pagamento como linhas.
- Nenhum campo com menos de 16px (H4 passa).
- O foco não abre o teclado sozinho no toque (H2 passa).

---

## 4. Ciclo de vida (C0 a C3)

**Ordem dos blocos na tela da assinatura:**
1. Herói: nome e valor.
2. Status: badge do estado atual, com **Pausar** (ou **Reativar**) e **Cancelar** (ou **Reativar**), em botões de tamanho normal.
3. Plano: cobrança, vencimento, pagamento, cobrança automática.
4. Divisão.
5. Avisos: não avisar desta assinatura.
6. Histórico de pagamentos (edição).
7. Zona de risco: **Remover assinatura**.

**Três ações, três nomes:**
- **Pausar:** sai dos totais, previsões e avisos. Mantém o histórico. Não gera cobrança automática enquanto estiver pausada. Reativar a qualquer momento.
- **Cancelar:** sai dos totais e mostra a economia mensal no Portfólio. Mantém o histórico. Não gera cobrança automática depois da data de cancelamento. Reativar a qualquer momento.
- **Remover:** apaga a assinatura e o histórico. Confirmação, na zona de risco.

**Tarefas:**
- **C0.** Campo `status` (`active`, `paused`, `cancelled`) com normalização aditiva. Guardar os períodos de pausa (início e fim) e a data de cancelamento, para o preenchimento automático pular os meses pausados. Regras puras em `src/lib/`, com TDD. Branch `feat/sprint-5-status-assinatura`.
- **C1.** Totais, previsões e avisos respeitando o status (`src/lib/totals.js` e a lógica de avisos, que deve ser localizada com busca antes de editar).
- **C2.** Bloco de status na tela da assinatura, na ordem acima.
- **C3.** Badges e economia de assinaturas canceladas no Portfólio.

---

## 5. Histórico (HS0 a HS4)

**Diagnóstico (verificado no código):**
1. Cobranças automáticas não geram registro. `autoCharge` vem marcado por padrão quando o método é Cartão (`src/lib/subs.js`).
2. `addPayment` (`src/lib/payments.js`) grava `parseFloat(sub.price)`, ou seja, o preço cheio, e não a sua parte. Numa assinatura dividida, o histórico mostra mais do que você pagou. **Bug a corrigir.**
3. Reajustes não aparecem para cobranças automáticas, porque nenhum valor é guardado por data.

**Modelo (schema 10, aditivo):** cada registro ganha quatro campos.
- `share`: sua parte, no momento do registro.
- `kind`: `manual` ou `auto`.
- `price`: preço do dia.
- `estimated`: `true` para ciclos preenchidos ao abrir o app.

**Registros antigos:**
- `kind = manual`.
- Se a assinatura não é dividida hoje, `share = amount`.
- Se é dividida hoje, `share` fica vazio e o registro sai dos totais de "sua parte" e aparece como "total" com nota. Limitação: a divisão do passado não é guardada, então a divisão atual serve de referência.

**Cobranças automáticas:**
- Gravadas ao abrir o app, uma por ciclo **desde o cadastro** (`createdAt`), de forma idempotente.
- Ciclos passados recebem o preço atual e `estimated = true`.
- Meses pausados e meses depois do cancelamento não viram cobrança.
- Rodam uma vez por abertura, sem bloquear a tela inicial.

**Indicadores (fatos, sem recomendação de corte):**
- Total do período (mês atual e últimos 12 meses), com sua parte. Registros antigos de divididas ficam fora.
- Média mensal dos últimos 6 meses.
- Variação em relação ao mês anterior.
- Assinatura que mais pesa no período, com percentual do total.
- Mudanças de preço entre registros, por exemplo: "subiu de R$ 39,90 para R$ 44,90 em 03/2026". Estimadas não entram.
- Cobranças manuais sem marcação.
- Gasto por categoria.

**Tela "Histórico" (detalhe):**
- Topo: total do mês (sua parte) e variação.
- Indicadores em cartões.
- Filtros: período (mês, 12 meses, ano) e categoria.
- Lista agrupada por mês, com total do mês. Cada item: nome, data, sua parte, etiqueta "Automática", "Estimada" ou "Paguei". Registros antigos de divididas mostram o valor cheio com o rótulo "total" e a nota. "Desmarcar" só nos manuais.

**Entradas:**
- Card "Histórico e insights" no Portfólio, abaixo do card de Orçamento.
- Linha "Histórico" dentro da tela Orçamento, ao lado do valor e da Divisão.

**Tarefas:**
- **HS0.** Schema 10 (`share`, `kind`, `price`, `estimated`), normalização, migração e correção do `addPayment`. Testar a migração com um backup real antes do merge (M4). Branch `feat/sprint-5-historico-schema`.
- **HS1.** Cobranças automáticas gravadas ao abrir, desde o cadastro, idempotentes, pulando meses pausados e meses depois do cancelamento. Ciclos passados marcados como estimados.
- **HS2.** `src/lib/history.js`: agrupamento, totais, variação, média, maior peso e mudanças de preço. TDD com estes casos de borda: virada de mês e de ano, semanal, anual, dividida, removida, pausada e reativada, cancelada, zero registros, cadastro no meio do ciclo, registros antigos de divididas.
- **HS3.** Tela Histórico.
- **HS4.** Entradas no Portfólio e no Orçamento, e evento `history_opened` com uma única propriedade, `origem` (`portfolio` ou `orcamento`). Sem nomes, valores ou datas.

**Riscos:**
- **Volume:** 50 assinaturas com três anos de cobranças mensais dão cerca de 1.800 registros. Agrupar por mês e carregar sob demanda.
- **Primeiro preenchimento:** para assinaturas antigas pode criar muitos registros de uma vez. Precisa ser idempotente e não bloquear a abertura do app.
- **Migração:** testar com backup real antes do merge.

---

## 6. Ordem dos PRs

1. **H1 a H4** — hotfix (`fix/sprint-5-campos-zoom`). Teste no iPhone (M2).
2. **D0** — tokens e guardrail (`chore/sprint-5-tokens`).
3. **D1** — componentes base (`feat/sprint-5-componentes-base`).
4. **D2** — mock do cadastro, publicado. Aguarda aprovação do Victor.
5. **D3** — README, regra no CLAUDE.md, catálogo (`docs/sprint-5-design-system`).
6. **F0 a F5** — formulários, com D4 aplicado a eles. **Fim da 5A:** versão confirmada pelo Victor (M5), convite de beta (M7).
7. **C0 a C3** — ciclo de vida.
8. **HS0 a HS4** — histórico. HS0 só depois do backup (M4).
9. **D4 restante e D5** — aplicação do Design System no app inteiro e revisão final. **Fim da 5B:** release.

Cada PR: CI verde, descrição com o que mudou e o motivo, e nenhuma alteração em teste existente fora das exceções listadas.

## 7. Passos manuais

Explicar cada um ao Victor antes de pedir que ele faça.

- **M1. Instalar e testar no computador.** Rodar `npm ci` e depois `npm test` na pasta do projeto. `npm ci` instala as dependências exatamente como estão no repositório. Resultado esperado: todos os testes unitários passam (159 hoje).
- **M2. Teste de zoom e teclado no iPhone** (depois do H1 a H3). Abrir o app no Safari, tocar em adicionar assinatura e avançar para o passo 2. Esperado: o teclado não abre sozinho e a tela não dá zoom ao tocar em um campo.
- **M3. Teste de foco no Android** (depois do H2). Abrir o cadastro. Esperado: o foco fica no botão ← e o teclado não abre sozinho.
- **M4. Backup antes da migração** (antes de HS0). Exportar o backup pelo app e guardar o arquivo fora do repositório. Ele tem dados pessoais e não pode entrar no Git.
- **M5. Versão de cada entrega** (antes do merge de F5 e de HS4). Confirmar com o Victor o número de versão de 5A e de 5B.
- **M6. Roteiro de QA** (fim da 5A e da 5B). Atualizar `docs/qa-beta.md` e executar em iPhone e Android, registrando o resultado.
- **M7. Convite de beta** (fim da 5A). Só depois do M6.

## 8. Definição de pronto

- Todas as PRs da lista estão mergeadas com CI verde.
- `tokens.css` é a única fonte de cor, tamanho e sombra. O guardrail roda sem exceções (D5).
- `src/design/README.md` existe e descreve os componentes e anti-padrões.
- Histórico: migração testada com backup real, casos de borda cobertos por teste.
- Nenhum teste existente foi alterado, exceto a asserção de foco mobile autorizada.
- Roteiro de QA executado e registrado em iPhone e Android.

## 9. Depois desta sprint

Os candidatos do roadmap que sobram: exportar para o calendário (.ics), teste grátis, Início com próximos 30 dias e categorias, CSV, moeda e IOF, ciclo trimestral. Histórico de preço: a parte de reajustes já entra nesta sprint (HS2).

## Prompt para iniciar no Claude Code

> Leia `docs/sprint-5-formularios-historico.md` inteiro e siga a ordem dos PRs. Comece pelo hotfix (H1 a H4) em uma branch `fix/sprint-5-campos-zoom`, sem commitar na `main`. Antes de qualquer mudança, rode `git status` e `npm test` e me diga o que encontrou. Não comece F0 antes de eu aprovar o mock (D2). Quando eu precisar fazer algo manual (GitHub, celular, terminal), explique passo a passo, porque é a minha primeira vez.
