# Roteiro de QA do beta — iPhone e Android

Roteiro para testar o SubManager (versão 2.3.0) de ponta a ponta em um celular. Faça uma vez no **iPhone** e uma vez no **Android**, e anote o resultado de cada etapa na tabela do final.

## Antes de começar

- **O que é este roteiro:** uma lista de passos, cada um com o resultado esperado. Se o que você vê for igual ao esperado, a etapa passou. Se for diferente, ela falhou.
- **Por que serve:** é assim que achamos erros que só aparecem no celular de verdade (teclado, instalação, avisos).
- **O que você precisa:** o celular, o endereço do app em produção e uns 20 minutos.
- **Dica:** use dados de mentira (nomes e valores inventados). Não digite dados bancários nem números de cartão em nenhum lugar.

## Se algo falhar: abrir uma Issue no GitHub

Uma *Issue* é um cartão de problema no GitHub; é como deixamos o erro anotado para ser corrigido.

1. No computador, abra `github.com/vhenriqueortolan/submanager` e clique na aba **Issues**.
2. Clique em **New issue**.
3. Título curto, por exemplo: `iPhone: botão Paguei não desfaz`.
4. No texto, escreva: **aparelho** (ex.: iPhone 13, iOS 17), **navegador** (Safari, Chrome), **versão do app** (Perfil → Sobre), **o passo** deste roteiro (ex.: "Etapa 6") e **o que você esperava e o que aconteceu**. Uma foto da tela ajuda.
5. Clique em **Submit new issue**.

Resultado esperado: a Issue aparece na lista com um número (`#15`, por exemplo).

## Etapas

### 1. Instalar o app

**Android (Chrome):**
1. Abra o endereço do app no Chrome.
2. Vá em **Perfil** (menu de baixo) e role até "Instalar o app".
3. Toque em **Instalar app** e confirme.

Esperado: o ícone do SubManager aparece na tela inicial, e ao abri-lo o app aparece **sem a barra do navegador**. De volta ao Perfil, aparece "App instalado".

**iPhone (Safari):**
1. Abra o endereço do app no **Safari** (não funciona em outros navegadores para instalar).
2. Toque em **Compartilhar** (o quadrado com uma seta para cima) na barra do Safari.
3. Role e toque em **Adicionar à Tela de Início**, depois em **Adicionar**.
4. Abra o app pelo ícone novo.

Esperado: o ícone aparece na Tela de Início e o app abre **sem a barra do Safari**. No Perfil aparece "App instalado".

> A partir daqui, use sempre o app instalado.

Se falhar: Issue com o passo e o navegador. Se o endereço pedir login da Vercel, é a proteção de links de teste; use o endereço de produção.

### 2. Onboarding

1. Abra o app pela primeira vez (ou depois de apagar os dados, etapa 9).
2. Preencha o nome, o teto mensal (por exemplo `300`) e escolha dois interesses. Toque em **Continuar** até **Ir para o App**.

Esperado: aparece a tela inicial com "Olá, <seu nome>." e "Nenhuma assinatura ainda". O texto do teto fala em "a sua parte".

### 3. Cadastrar assinatura mensal, anual e semanal

Para cada uma, toque em **+ Cadastrar assinatura → + Inserir Dados Manualmente**.

| Ciclo | Nome | Cobrança | Valor | Vencimento | Pagamento |
|-------|------|----------|-------|------------|-----------|
| Mensal | `Teste Mensal` | Mensal | `39,90` | dia de amanhã | Pix |
| Anual | `Teste Anual` | Anual | `120` | dia e mês de hoje | Pix |
| Semanal | `Teste Semanal` | Semanal | `10` | dia da semana de ontem | Pix |

Troque o **Pagamento** para **Pix** nas três. O padrão é Cartão, que já marca "Cobrança automática" (ela nunca fica atrasada e não tem botão "Paguei"; veja a etapa 6).

Esperado:
- O teclado do celular mostra números nos campos de valor e dia.
- Cada card aparece com o valor certo (a anual como `R$ 120,00/ano`, a semanal como `R$ 10,00/semana`).
- A anual mostra **Vence hoje**; a semanal mostra **Atrasada**.
- Em **Seu gasto mensal**, o total soma os três já convertidos para mês (39,90 + 10,00 + 43,33 = **R$ 93,23**).

### 4. Dividir com nomes

1. Toque em `Teste Mensal` para editar.
2. Em **Dividido com**, digite `Ana` e toque em **Adicionar**. Digite `Bruno` e confirme com a tecla Enter/OK do teclado.
3. Confira a linha "Sua parte" e toque em **Salvar Assinatura**.

Esperado:
- Os nomes aparecem como botões marcados.
- O card mostra `R$ 39,90` e abaixo **Sua parte R$ 13,30**.
- Na tela inicial aparece "Total dos serviços" maior que "Seu gasto mensal".
- Em **Perfil → Pessoas** aparecem Ana e Bruno, cada um com **Remover**. Remover pede confirmação e tira a pessoa da assinatura.

### 5. Pagar e desfazer

1. No card `Teste Semanal` (atrasada), toque em **✓ Paguei**.
2. Logo depois, toque em **Desfazer** no aviso que aparece embaixo (dura uns 5 segundos).
3. Toque em **✓ Paguei** de novo e espere o aviso sumir.
4. Toque no card para editar e olhe **Histórico de pagamentos**.

Esperado:
- Depois do passo 1, o card deixa de mostrar "Atrasada".
- Depois do passo 2, "Atrasada" volta.
- No passo 4 há um pagamento com data e valor; **Desmarcar** o remove e a assinatura volta a ficar atrasada.

### 6. Configurar avisos

1. Vá em **Perfil → Notificações**.
2. Toque em **Ativar** (se aparecer) e permita as notificações quando o celular perguntar.
3. Teste as chaves **Receber avisos**, **Avisar no dia** e **Avisar atrasadas**, e escolha **1 dia antes** em Antecedência.
4. Marque uma assinatura como **Não avisar desta assinatura** e outra com **Cobrança automática** (edição da assinatura).

Esperado:
- Estado "Ativadas no navegador." (no iPhone fora da Tela de Início aparece o pedido para instalar o app).
- Com o app aberto, chega um aviso por assinatura para "vence hoje" e "atrasada", no máximo um por dia.
- Com antecedência de 1 dia, a assinatura que vence amanhã avisa hoje.
- Desligando "Receber avisos", nenhum aviso chega.
- A silenciada não avisa. A automática mostra **Cobrado em DD/MM** no lugar de "Paguei" e nunca fica atrasada.
- Se você bloquear as notificações, o Perfil explica como reativar nas configurações do navegador.

> Lembrete: os avisos só chegam quando o app está aberto.

### 7. Exportar e importar backup

1. No **Perfil**, toque em **Exportar**. O celular baixa um arquivo `submanager-backup-AAAA-MM-DD.json`.
2. Em **Backup dos dados**, toque em **Importar** e escolha o mesmo arquivo.
3. Leia o aviso e toque em **Substituir**.

Esperado:
- Aparece "Backup exportado." e o arquivo fica nos Downloads (Android) ou em Arquivos (iPhone).
- A importação pergunta antes de substituir e, ao confirmar, todos os dados voltam iguais (assinaturas, pessoas, pagamentos e preferências de aviso).
- O lembrete de backup na tela inicial ("Faça um backup dos seus dados") some depois de exportar.

### 8. Enviar feedback

1. No **Perfil**, em **Sobre**, confira a versão (`2.3.0`).
2. Toque em **Enviar feedback**.

Esperado: abre o formulário do Google em uma nova aba, com **Versão** e **Aparelho** já preenchidos (por exemplo `2.3.0` e `iPhone`). Escreva uma frase de teste e envie; o Victor recebe um e-mail com a resposta.

### 9. Apagar dados

1. No **Perfil**, em **Seus dados**, toque em **Apagar todos os dados**.
2. Veja que o botão **Apagar tudo** está desabilitado. Digite `APAGAR` (maiúsculas) no campo.
3. Se quiser, toque antes em **Exportar backup antes**. Depois toque em **Apagar tudo**.
4. Feche o app e abra de novo.

Esperado:
- Antes de digitar `APAGAR` (e com `apagar` em minúsculas), o botão continua desabilitado.
- Depois de confirmar, aparece a mensagem "Todos os dados foram apagados." e o app volta à tela de boas-vindas.
- Ao reabrir, o app continua vazio.
- Em **Privacidade** (no Perfil) estão listados o que fica no aparelho, o que sai dele e como pedir a exclusão das respostas do formulário.

## Registro dos resultados

Marque **OK** ou **Falhou (#número da Issue)** em cada célula.

| # | Etapa | Android | iPhone |
|---|-------|---------|--------|
| 1 | Instalar o app | | |
| 2 | Onboarding | | |
| 3 | Cadastrar mensal, anual e semanal | | |
| 4 | Dividir com nomes | | |
| 5 | Pagar e desfazer | | |
| 6 | Configurar avisos | | |
| 7 | Exportar e importar backup | | |
| 8 | Enviar feedback | | |
| 9 | Apagar dados | | |

**Aparelho e navegador:** Android ______________________ · iPhone ______________________

**Data do teste:** ____ / ____ / ________
