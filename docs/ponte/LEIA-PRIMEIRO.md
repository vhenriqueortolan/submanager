# Leia primeiro (Code)

Protocolo permanente do Code nesta ponte. Só muda quando uma regra de trabalho muda. O que é específico de uma tarefa fica no brief.

## Arquivos desta ponte
- `LEIA-PRIMEIRO.md`: este protocolo.
- `brief-atual.md`: a tarefa da vez. Escrito pelo Chat.
- `relatorio-atual.md`: o resultado da tarefa. Escrito por você.
- `mapa.md`: mapa do repositório. Você mantém.
- `decisoes-vigentes.md`: decisões do produto que afetam o código. Leia quando o brief citar uma decisão ou quando mexer no que ela regula. Escrito pelo Chat.
- `sprints/`: históricos fechados. Leia só se o brief pedir.

Regra de escrita: os arquivos de entrada são reescritos por inteiro. Nunca acrescente seção no fim de um deles.

## Ao começar
1. Leia `CLAUDE.md`.
2. Leia `brief-atual.md`. Sem brief, não implemente: responda o que foi pedido e avise que falta o brief.
3. O brief é autocontido: as decisões e regras que ele cita vêm copiadas nele ou em `decisoes-vigentes.md`. Se citar algo que não está no repositório, pare e avise.
4. Confirme o ponto de partida do brief (branch, commit, versão). Se não bater com o repositório, pare e avise.
5. Leia `mapa.md` e use-o para localizar os arquivos da tarefa. Abra só esses arquivos. Não explore o repositório para achar o que o mapa já diz. Não leia `docs/` inteira nem `sprints/` sem pedido.

## Pedidos e autorização
- Se você consegue fazer a ação (merge de PR, abrir ou fechar PR, criar branch, rodar comandos de CI), não peça ao Victor para fazê-la. Peça autorização numa linha, por exemplo: "Autoriza eu mergear a PR #49, com unit-and-build e e2e verdes?". Execute você mesmo depois do sim.
- Peça ao Victor só o que depende dele: testes em aparelho, decisões de produto, exceções às regras (testes existentes, proteção da `main`, CLAUDE.md) e acesso ao Project.
- Antes de qualquer merge, confira os checks obrigatórios.
- Teste existente não muda, só amplia (CLAUDE.md). Antes de alterar um, peça autorização no relatório, com o nome do teste e o motivo. Não altere antes da resposta, salvo se o brief já autorizar o teste pelo nome.

## Testes
1. Rode só o que a mudança afeta:
   - unitário: os arquivos de teste que importam o módulo alterado, direta ou indiretamente;
   - e2e: as specs das telas e fluxos alterados. Mudança em estilos globais, em `storage.js` ou na estrutura do app afeta tudo: nesse caso, rode o e2e completo.
2. Lint e build rodam sempre.
3. Se a seleção não for confiável num caso, rode a suíte completa e diga no relatório por quê.
4. Não altere o CI, salvo se o brief pedir.

## Ao terminar
1. Rode os testes selecionados, o lint e o build.
2. Se a estrutura mudou (pasta nova, arquivo-chave movido, regra ou teste em outro lugar), atualize `mapa.md` no mesmo ciclo.
3. Reescreva `relatorio-atual.md` com o modelo abaixo. O relatório começa pelo resumo.
4. Não altere o status nem a âncora do Project: você não tem acesso a eles. Quem atualiza é o Chat, depois de ler o relatório.
5. Decisões novas vão em "Decisões sugeridas". Você não decide sozinho.

## Modelo do relatório
```
# Relatório: <título do brief>
Resumo (até 5 linhas): resultado; o que está pronto para merge; o que precisa de decisão do Victor.
Data:
Commit de partida: <sha> | versão: X.Y.Z | schema: <n>
Commit final na main (após merge): <sha>
Commits e PRs: #nº, título, branch, estado, CI
Itens do brief: ✅, ⚠️ ou ❌ por item, com evidência
Testes rodados e motivo da seleção:
Resultado: lint; unit (contagem); build; e2e (passam, ignorados, falham, nome de cada teste que falha)
Mapa: o que mudou em mapa.md, ou "sem mudança"
Desvios do brief e motivo (inclua qualquer teste existente alterado, com o nome e a autorização):
Validação em aparelho: por checkpoint e por aparelho, com o resultado informado pelo Victor, ou "sem detalhe"
Propostas de regra (não aplicadas):
Decisões sugeridas (não decididas):
Dívida técnica nova:
Ponte: o que faltou ou atrapalhou no protocolo ou no brief (ou "nada")
Próximo passo sugerido:
```

## Regras
- Se código e documento divergem, o código vale. Registre a divergência.
- Teste que depende de data ou dia da semana fixa o relógio.
- Commits e textos de interface em pt-BR, como manda o CLAUDE.md.
- Não mude regras de proteção da `main` nem o CLAUDE.md. Proponha no relatório.
