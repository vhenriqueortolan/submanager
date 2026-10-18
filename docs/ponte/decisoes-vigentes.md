# Decisões vigentes que afetam o código

Cópia das decisões vigentes que dizem o que o app faz ou como ele é testado. Lista só o que está vigente; decisões propostas aparecem quando forem aprovadas. O Chat reescreve este arquivo sempre que uma decisão mudar.

## Dados e schema
- Dados ficam no localStorage do aparelho. Chave `subDataV5` fixa. Mudança de schema é aditiva, com valor padrão para registros antigos.
- Sem backend até o beta pedir. Sync, contas e Web Push ficam para depois do feedback do beta.

## Acessibilidade e teclado
- Pinça bloqueada no app inteiro. Custo de acessibilidade aceito.
- Nenhum foco automático ao abrir telas, em todas as plataformas. Diálogo de confirmação começa em Cancelar. Folha de edição mantém o foco no primeiro campo. O ajuste do teste de foco em `e2e/a11y-storage.spec.js` foi aprovado como exceção: serve de precedente para exceções a testes existentes.
- Teclado: Esc fecha a camada de cima; Enter envia a ação principal; Espaço ativa botões e cartões; Tab segue a ordem visual; sem atalhos de letra.

## Contatos
- Três caminhos: agenda (onde o aparelho suporta), `.vcf` e digitação. Só nome é obrigatório. Brasil (+55) como padrão. Nome, telefone e e-mail ficam só no aparelho.

## Analytics
- Nunca envia nome de serviço, valor, data ou dado de pessoa. No máximo 2 propriedades por evento.

## Assinaturas
- Histórico desde o cadastro. Cobranças automáticas passadas são marcadas como estimadas e usam o preço atual. Meses pausados ficam de fora. Nada é preenchido antes do cadastro.
- Cancelar é reversível (botão Reativar). Pausa não gera cobrança; ao reativar, a cobrança volta a ser gerada.

## Testes
- Testes por mudança. Como regra de trabalho, vale já: rodam só os testes afetados. No CI, no PR, só os testes afetados; mudança só em `docs/` não roda testes; push para `main` roda a suíte completa. Aplicação no CI: pendente.
- Testes existentes não mudam, só ampliam (CLAUDE.md). Alterar um existente exige aprovação do Victor, dada por escrito, com o nome do teste.
