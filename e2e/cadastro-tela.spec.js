import { test, expect, seed, withSubs, sampleSubs, readStorage, editText, editTrigger } from './fixtures.js';

const openNew = async (page, state = withSubs([])) => {
  await seed(page, state);
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await expect(page.locator('#modal-step-1')).toBeVisible();
};
const goManual = async (page) => {
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await expect(page.locator('#modal-step-2')).toBeVisible();
};
const discardDialog = (page) => page.getByRole('alertdialog', { name: 'Descartar alterações?' });

test('cadastro novo: ← no passo 2 volta ao passo 1 e ← no passo 1 fecha a tela', async ({ page }) => {
  await openNew(page);
  await expect(page.getByRole('button', { name: 'Cancelar' })).toHaveCount(0);
  await goManual(page);
  await page.getByRole('button', { name: 'Voltar' }).last().click();
  await expect(page.locator('#modal-step-2')).toHaveCount(0);
  await expect(page.locator('#modal-step-1')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.locator('#add-modal')).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).toBeVisible();
});

test('Voltar do sistema no passo 2 volta ao passo 1; no passo 1 fecha a tela e o app continua', async ({ page }) => {
  await openNew(page);
  await goManual(page);
  await page.goBack();
  await expect(page.locator('#modal-step-2')).toHaveCount(0);
  await expect(page.locator('#modal-step-1')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#add-modal')).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('cadastro novo com dados digitados pergunta ao sair (←, Voltar do sistema e Esc)', async ({ page }) => {
  await openNew(page);
  await goManual(page);
  await editText(page, 'name', 'Rascunho');

  await page.getByRole('button', { name: 'Voltar' }).last().click();
  await expect(discardDialog(page)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(editTrigger(page, 'name')).toContainText("Rascunho");

  await page.goBack();
  await expect(discardDialog(page)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(editTrigger(page, 'name')).toContainText("Rascunho");

  await page.keyboard.press('Escape');
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Descartar' }).click();
  await expect(page.locator('#modal-step-2')).toHaveCount(0);
  await expect(page.locator('#modal-step-1')).toBeVisible(); // descartar volta ao passo 1
  expect((await readStorage(page)).subs).toHaveLength(0);
});

test('salvar fecha as duas telas e deixa o histórico limpo', async ({ page }) => {
  await openNew(page);
  await goManual(page);
  await editText(page, 'name', 'Meu Serviço');
  await editText(page, 'price', '29.9');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  await expect(page.locator('#add-modal')).toHaveCount(0);
  await expect(page.locator('.sub-card', { hasText: 'Meu Serviço' })).toBeVisible();
  await page.waitForFunction(() => !history.state?.screen);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('sem nome, o Salvar fica desabilitado com a dica; o valor tem placeholder em pt-BR', async ({ page }) => {
  await openNew(page);
  await goManual(page);
  await expect(page.getByRole('button', { name: 'Salvar Assinatura' })).toBeDisabled();
  await expect(page.locator('#save-hint')).toHaveText('Informe o nome do serviço');
  await expect(editTrigger(page, 'price')).toContainText("R$ 0,00");
  await editText(page, 'name', 'X');
  await expect(page.locator('#save-hint')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salvar Assinatura' })).toBeEnabled();
});

test('edição: seções, ← fecha a tela e Remover Assinatura fica no fim, em vermelho', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
  await expect(page.getByRole('dialog', { name: 'Editar assinatura' })).toBeVisible();
  await expect(page.locator('#modal-step-2 .ds-section-title')).toHaveText(['Plano', 'Divisão', 'Avisos']);
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await expect(page.locator('#modal-step-2 .ds-section-title')).toHaveText(['Histórico']);
  await page.getByRole('tab', { name: 'Plano' }).click();

  const save = await page.getByRole('button', { name: 'Salvar Assinatura' }).boundingBox();
  const remove = page.getByRole('button', { name: 'Remover Assinatura' });
  const box = await remove.boundingBox();
  expect(box.y).toBeGreaterThan(save.y + save.height);
  const color = await remove.evaluate((el) => getComputedStyle(el).color);
  const danger = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--danger)';
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(color).toBe(danger);

  await page.getByRole('button', { name: 'Voltar' }).click(); // edição: ← fecha, sem passo 1
  await expect(page.locator('#add-modal')).toHaveCount(0);
});

test('edição com alteração pergunta ao sair; sem alteração fecha direto', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
  await editText(page, 'price', '77');
  await page.goBack();
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Descartar' }).click();
  await expect(page.locator('#add-modal')).toHaveCount(0);
  expect((await readStorage(page)).subs.find((s) => s.id === 'hoje').price).toBe(50);
});
