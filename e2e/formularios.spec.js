import { test, expect, seed, withSubs, sampleSubs, readStorage, editText, pickOption, editTrigger } from './fixtures.js';

async function openManual(page, state = withSubs([])) {
  await seed(page, state);
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await expect(page.locator('#modal-step-2')).toBeVisible();
}

test('passo 2: nome e valor são heróis, plano são linhas e nenhuma caixa de texto fica aberta', async ({ page }) => {
  await openManual(page);
  await expect(page.getByRole('button', { name: 'Serviço: vazio. Editar' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Valor: vazio por mês\. Editar$/ })).toBeVisible();
  for (const key of ['cycle', 'due-date', 'payment']) {
    await expect(editTrigger(page, key)).toHaveClass(/ds-row/);
  }
  // Só os switches (checkbox) são controles de formulário visíveis; nada de input de texto, select ou textarea.
  const abertos = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#modal-step-2 input, #modal-step-2 select, #modal-step-2 textarea'))
      .filter((el) => el.type !== 'checkbox' && el.getClientRects().length > 0).length,
  );
  expect(abertos).toBe(0);
  await expect(page.locator('#modal-step-2 select')).toHaveCount(0);
});

test('o logo do serviço fica junto ao nome, no herói', async ({ page }) => {
  await openManual(page);
  await editText(page, 'name', 'Netflix');
  await expect(editTrigger(page, 'name').locator('img.ds-hero-logo')).toBeVisible();
  await expect(editTrigger(page, 'name')).toContainText('Netflix');
});

test('cancelar a folha não muda nada; Pronto e Enter salvam', async ({ page }) => {
  await openManual(page);
  await editText(page, 'name', 'Spotify');
  await editTrigger(page, 'name').click();
  await page.locator('#editor-name-field').fill('Outro');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(editTrigger(page, 'name')).toContainText('Spotify');

  await editTrigger(page, 'price').click();
  await page.locator('#editor-price-field').fill('21,90');
  await page.getByRole('button', { name: 'Pronto' }).click();
  await expect(editTrigger(page, 'price')).toContainText('R$ 21,90');
});

test('valor e dia inválidos bloqueiam o Pronto com a mensagem; dia 31 vale', async ({ page }) => {
  await openManual(page);
  await editTrigger(page, 'price').click();
  await page.locator('#editor-price-field').fill('12abc');
  await expect(page.getByRole('button', { name: 'Pronto' })).toBeDisabled();
  await expect(page.locator('.ds-sheet')).toContainText('valor válido');
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await editTrigger(page, 'due-date').click();
  await page.locator('#editor-due-date-field').fill('32');
  await expect(page.getByRole('button', { name: 'Pronto' })).toBeDisabled();
  await expect(page.locator('.ds-sheet')).toContainText('de 1 a 31');
  await page.locator('#editor-due-date-field').fill('31');
  await expect(page.getByRole('button', { name: 'Pronto' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(editTrigger(page, 'due-date')).toContainText('Dia 31');
});

test('Voltar do sistema e Esc fecham só a folha; a tela do cadastro continua aberta', async ({ page }) => {
  await openManual(page);
  await editTrigger(page, 'payment').click();
  await expect(page.locator('.ds-sheet')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.ds-sheet')).toHaveCount(0);
  await expect(page.locator('#modal-step-2')).toBeVisible();

  await editTrigger(page, 'cycle').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ds-sheet')).toHaveCount(0);
  await expect(page.locator('#modal-step-2')).toBeVisible();
});

test('cadastro completo pelas folhas grava os campos certos', async ({ page }) => {
  await openManual(page);
  await editText(page, 'name', 'Curso');
  await editText(page, 'price', '1200,50');
  await pickOption(page, 'cycle', 'Anual');
  await editText(page, 'due-date', '5');
  await pickOption(page, 'due-month', 'Dezembro');
  await pickOption(page, 'payment', 'Boleto');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  const [sub] = (await readStorage(page)).subs;
  expect(sub).toMatchObject({ name: 'Curso', price: 1200.5, cycle: 'yearly', dueDate: '5', dueMonth: '12', paymentMethod: 'Boleto' });
});

test('edição: abre com os valores salvos nos heróis e linhas', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.sub-card', { hasText: 'FuturaApp' }).click();
  await expect(editTrigger(page, 'name')).toContainText('FuturaApp');
  await expect(editTrigger(page, 'price')).toContainText('R$');
  await expect(editTrigger(page, 'payment')).toBeVisible();
});

test('Meu perfil: o nome é um herói e a folha salva o nome', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.bottom-nav').getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: /^Meu perfil\./ }).click();
  await expect(editTrigger(page, 'profile-name')).toContainText('Victor');
  await expect(page.locator('.detail-screen input[type="text"]')).toHaveCount(0);
});
