# Brief: correção do teste de data (pós-Sprint 6)

Tipo: manutenção. Sem funcionalidade, sem mudança de schema, sem mudança de versão, sem mudança de CI.
Ponto de partida: branch `main`, commit `00b3ef7`, versão 2.7.0, schema 10.
Decisões que valem: D-013, como regra de trabalho.

## Objetivo
Deixar a `main` verde. O teste de data quebra aos domingos e às segundas.

## Escopo
1. Corrigir `e2e/notifications.spec.js:60` fixando o relógio do teste. Critério: o teste passa em qualquer dia da semana e continua falhando se a frase do aviso mudar de verdade. Branch `fix/teste-dia-da-semana`. Rode só as specs afetadas.
2. Registrar a validação da Sprint 6 no relatório, conforme o prompt. Sem novo teste em aparelho.

## Fora de escopo
- Seleção de testes no CI: vai para a Sprint 7.
- Mudança de funcionalidade, de schema, de versão, de CLAUDE.md ou das regras de proteção da `main`.

## Checkpoints em aparelho
D1 a D5 da Sprint 6: o Victor informou que passaram. Não há teste novo neste brief.

## Pendências que bloqueiam
Nenhuma.
