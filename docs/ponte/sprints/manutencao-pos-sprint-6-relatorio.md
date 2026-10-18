# Relatório: correção do teste de data (pós-Sprint 6)
Data: 18/10/2026
Commit de partida: 00b3ef7 (main) | versão: 2.7.0 | schema: 10
Commits e PRs: #49, "test(e2e): fixa o relógio no teste de aviso semanal atrasado", branch `fix/teste-dia-da-semana`, commit de teste único, estado: aberta, CI verde (e2e, unit-and-build, Vercel). Não mergeei: aguardo a sua ordem (merge publica em produção).

Itens do brief:
- ✅ 1. Teste de data: `e2e/notifications.spec.js` (bloco "ciclos anual e semanal") roda com `page.clock.setFixedTime` em duas datas, quarta 21/10/2026 (ontem terça, "toda terça") e segunda 19/10/2026 (ontem domingo, "todo domingo"). Confere a frase inteira do aviso. Evidência: 12 testes da spec passam (desktop e Pixel 7); trocando "Venceu há" por "Venceu faz" em `src/lib/notifications.js` os dois testes falham (mutação revertida, `src/` intacto); o e2e completo do CI passou hoje, domingo, que era o dia em que quebrava.
- ✅ 2. Validação da Sprint 6 registrada abaixo, em "Validação em aparelho". Sem teste novo em aparelho.
- ✅ Sem mudança de CI, CLAUDE.md, regras da `main`, versão, schema ou arquivos do Project.

Testes rodados e motivo da seleção: só `e2e/notifications.spec.js` (a única spec alterada; nenhum arquivo de `src/` mudou, então nenhum unitário importa algo alterado). Lint e build rodaram. O CI rodou a suíte inteira.

Resultado:
- lint: limpo
- unit: não rodado (nenhum módulo alterado); última contagem, na `main`: 260 de 260
- build: ok
- e2e local (spec selecionada): 12 passam, 0 ignorados, 0 falham
- e2e no CI (suíte inteira, PR #49): verde. Na `main` antes da correção: 371 passam, 5 ignorados, 2 falham (`notifications.spec.js:60`, desktop e mobile)

Desvios do brief e motivo: nenhum. Detalhe: o teste original virou dois (um por gênero do dia), com o nome antigo mais "(ontem: …)". O teste "Paguei" do mesmo bloco também ganhou relógio fixo, porque usa os mesmos dados.

Validação em aparelho (Sprint 6), conforme o que o Victor informou no chat:
- D1 pinça: "Pinça ok".
- D2 puxar para atualizar (iPhone): na primeira rodada, "puxar para baixo não atualizou" e, perguntado, "nada aparece" (provável teste no app instalado, sem a PR). Na segunda rodada, no link de preview da PR #46 atualizado com a `main`: "Tudo ok agora".
- D3 agenda no Android, D4 .vcf no iPhone, D5 teclado no desktop: "Tudo ok", numa única mensagem. Passou, sem detalhe por checkpoint.

Propostas de regra (não aplicadas):
- Nenhuma nova. A regra "teste que depende de data fixa o relógio" já está no protocolo.

Decisões sugeridas (não decididas):
- Mergear a #49 agora, para deixar a `main` verde nos próximos domingos e segundas.

Dívida técnica nova:
- Outros specs montam datas a partir do relógio real (`sampleSubs`, `cycleSubs` e afins, por `browserToday()`). Não auditei se mais algum depende do dia da semana ou do dia do mês; só este quebrou na verificação de hoje.
- O monitor automático de CI foi negado pelo sistema na PR #44 da Sprint 6; o CI foi acompanhado por `gh pr checks`.

Próximo passo sugerido: mergear a #49 (se aprovar), depois Sprint 7: seleção de testes no CI, medindo os tempos antes e depois.
