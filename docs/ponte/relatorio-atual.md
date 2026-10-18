# Relatório: seleção de testes no CI e ajustes da ponte (PARCIAL)
Resumo (até 5 linhas): Item 1 (relógio fixo) pronto na PR #50, com `unit-and-build` e `e2e` verdes; falta só o merge, que o classificador do Code negou (sua autorização cobria só a #49).
PR #49 foi mergeada (main em 1f49b5c). Itens 2, 3, 4 (parte "depois") e 5 não iniciados, pois dependem da #50 na main.
Decisão do Victor: mergear a #50 (botão "Merge pull request" no GitHub, ou me autorizar por escrito) e confirmar as propostas abaixo.
Data: 2026-10-18
Commit de partida: 1f49b5c (main após merge da #49) | versão: 2.7.0 | schema: sem mudança
Commit final na main (após merge): pendente (#50 aberta)
Commits e PRs: #49 test(e2e) relógio fixo no aviso semanal, MERGED, CI verde. #50 test(e2e): relógio fixo nas specs, `chore/testes-relogio`, OPEN, e2e e unit-and-build verdes (4m30s / 17s).
Itens do brief:
1. Auditoria de datas: ✅ na #50 (aguarda merge). Suíte e2e completa (desktop + Pixel 7) com E2E_NOW em domingo 18/10, segunda 19/10 e quarta 21/10: 375 passam, 5 ignorados, 0 falham em cada data. Dia do mês extremo (1, 29-31) não foi varrido.
2. Mecanismo de seleção: ❌ não iniciado
3. CI: ❌ não iniciado
4. Medição: ⚠️ só o "antes" (abaixo)
5. Mapa: ❌ não iniciado
Lista da exceção (testes existentes alterados): nenhum arquivo `*.spec.js` foi alterado na #50. Só `e2e/fixtures.js` e `e2e/timezone.js` (infraestrutura). A alteração anterior foi na #49: `e2e/notifications.spec.js`, testes de ciclos anual/semanal (linha ~66, "anual vencendo hoje e semanal atrasada notificam…", dois casos) e o de "Paguei" interrompe avisos do ciclo semanal.
Testes dependentes de data (auditoria, motivo: "hoje" vinha do relógio real via `browserToday()`/`sampleSubs()`, agora fixo): auto-charge, dados-sobre, historico-auto, historico-schema, historico, home-cycles, notification-settings, notifications, payments, portfolio, status, divisao, cadastro-tela (todas as specs que usam `sampleSubs`/`browserToday`). Unitários: nenhum usa relógio real.
Testes rodados e motivo da seleção: e2e completo ×3 datas (mudança em fixtures afeta tudo); lint.
Resultado: lint ok; unit não rodado (nenhum módulo de `src/` mudou; o CI rodou e passou); build ok; e2e acima. Falhas iniciais ao rodar 3 datas em paralelo eram timeout por sobrecarga da máquina, não do código.
Medição "antes" (5 últimos runs do CI em main, duração dos jobs): e2e 269s, 258s, 266s, 238s, 254s; unit-and-build 12s, 19s, 12s, 22s, 17s.
Mapa: sem mudança ainda. Defasagem vista: `ci.yml` não tem job `lint` separado (lint roda dentro de `unit-and-build`); mapa diz "fora do Git" para `docs/`.
Desvios do brief e motivo: (a) o brief pede checks `lint`, `unit-and-build` e `e2e`, mas hoje `lint` é um passo de `unit-and-build`, não um check; (b) CLAUDE.md linha 33 corrigida na #50, conforme sua autorização (caminho `docs/ponte/sprints/sprint-4-ux.md`).
Validação em aparelho: sem detalhe (nenhum checkpoint).
Propostas de regra (não aplicadas): nenhuma.
Decisões sugeridas (não decididas): criar o job `lint` separado (novo check) ou manter `lint` dentro de `unit-and-build`. Recomendo manter, para não criar check obrigatório novo na proteção da `main`, que é seu.
Dívida técnica nova: nenhuma.
Ponte: o brief citava o log de decisões do Project, inacessível ao Code; as regras foram copiadas no brief e funcionaram.
Próximo passo sugerido: mergear a #50; depois sigo com `chore/ci-testes-afetados` (itens 2, 3, 5) e os PRs de medição.
