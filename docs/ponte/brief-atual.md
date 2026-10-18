# Brief: seleção de testes no CI e ajustes da ponte

Tipo: infraestrutura. Sem funcionalidade, sem mudança de schema, sem bump de versão.

## Antes de começar: decisão pendente do Victor
A regra do CLAUDE.md diz que testes existentes não mudam, só ampliam. Alterar um existente exige aprovação do Victor. Dois pontos deste brief alteram testes existentes:
- A PR `fix/teste-dia-da-semana` (commit `83bc3bb`) fixa o relógio em testes de `e2e/notifications.spec.js`. Hoje dois testes desse arquivo falham (linha 60, aviso semanal atrasado).
- O item 1 do escopo fixa o relógio em outros testes que dependem de data.

Até o Victor responder:
- Não faça merge da PR #49 e não altere teste existente.
- Pode fazer a auditoria do item 1 só em leitura e listar, no `relatorio-atual.md`, cada teste que depende de data, com o motivo.
- Se o Victor aprovar, a exceção vale só para os testes que você listou. Qualquer outro teste existente continua intocado.
- Se ele não aprovar, pare e registre no relatório o que ficou pendente.

## Pré-requisito
PR #49 mergeada na `main`, com autorização do Victor e com `lint`, `unit-and-build` e `e2e` verdes. Commit de partida: a `main` depois do merge. Registre no relatório.

## Regras que valem nesta sprint (copiadas do log de decisões)
- Durante o trabalho, rode só os testes afetados pela mudança.
- No CI, no PR, só os testes afetados. Mudança só em `docs/` ou em `.md` não roda testes. Push para `main` roda a suíte completa.
- Não use `paths:` no workflow para pular testes: o check obrigatório fica pendente e o PR trava. Use um job de detecção de mudanças e condições `if` nos jobs de teste.
- Mantenha os nomes dos checks obrigatórios: `lint`, `unit-and-build` e `e2e`.
- O mecanismo de seleção fica versionado no repositório, porque o CI não lê `docs/`.
- Meça a duração dos jobs antes e depois (`gh run list`, `gh run view`).
- Audite antes de confiar na seleção: testes que usam `browserToday()` ou o relógio real, como em `sampleSubs` e `cycleSubs`, podem depender do dia da semana ou do mês.

## Objetivo
Rodar no CI só os testes que a mudança afeta, sem perder a rede de segurança da suíte completa. Esta sprint também testa a ponte.

## Escopo
1. **Auditoria de datas.** Encontrar os testes que dependem de dia da semana, dia do mês ou relógio real. Liste todos antes de alterar qualquer um. Fixe o relógio só nos que a exceção cobrir. Critério: nenhum teste muda de resultado conforme o dia da semana, verificado com a data fixada em um domingo, uma segunda e um dia útil. Branch `chore/testes-relogio`.
2. **Mecanismo de seleção.** Criar, versionado no repositório, o cálculo dos testes afetados: unitário por imports, direto ou indireto; e2e por tela ou fluxo. Sem dependência nova, salvo justificativa pela regra do CLAUDE.md. Critério: uma mudança em um módulo seleciona só os testes que o importam, e o log do CI mostra a lista selecionada. Branch `chore/ci-testes-afetados`.
3. **CI.** Job de detecção de mudanças e jobs de teste com condição `if`, seguindo as regras acima. Critério: `lint`, `unit-and-build` e `e2e` aparecem e passam no PR da seleção; nenhum fica pendente.
4. **Medição.** Duração dos jobs de CI nos últimos cinco runs de `main`, antes da mudança, e em três PRs de teste, depois. Registre os dois conjuntos no relatório.
5. **Mapa do repositório.** Conferir `docs/ponte/mapa.md` contra o repositório, corrigir o que estiver defasado e atualizá-lo em cada mudança de estrutura desta sprint. Não recriar do zero. Critério: uma tarefa nova começa lendo só o mapa e o brief, sem explorar o repositório.

## Fora de escopo
- Funcionalidade, schema e versão.
- Alterar `CLAUDE.md`. Proponha a mudança no relatório.
- Mudar as regras de proteção da `main`. Isso é do Victor.
- Alterar testes existentes além da exceção que o Victor aprovar.
- Mexer nos documentos do Project.

## Ordem dos PRs
1. PR #49 (`fix/teste-dia-da-semana`), só depois da aprovação do Victor.
2. `chore/testes-relogio` (item 1), a partir da `main` com a PR #49 mergeada. Merge com checks verdes.
3. `chore/ci-testes-afetados` (itens 2, 3 e 5). Este PR já roda o CI novo. Merge só com `lint`, `unit-and-build` e `e2e` verdes.
4. PRs de teste para medir a seleção (item 4): um que muda só um módulo e um que muda só `docs/`. Não mergear. Feche depois de registrar os números.

## Riscos
- Regressão em área não afetada pode passar no PR e aparecer só no push para `main`. Liste no relatório o que só o push pega.
- Se o mapeamento ficar desatualizado, a seleção pode deixar de fora um teste. Se houver dúvida num caso, rode a suíte completa e registre o caso.
- Check obrigatório pendente trava o merge. Siga as regras acima.

## Checkpoints em aparelho
Nenhum.

## Pendências que bloqueiam
Decisão do Victor sobre a exceção de testes existentes (seção "Antes de começar"). Sem ela, só a auditoria em leitura.
