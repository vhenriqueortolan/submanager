import { test, expect, seed, withSubs, sampleSubs, readStorage, editText, pickOption, editTrigger } from './fixtures.js';

const ATRASADA = /Atrasada · \d+d/;

async function openManualForm(page) {
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
}

test('cadastra assinatura anual com dia, mês e equivalente mensal', async ({ page }) => {
  await seed(page, withSubs([]));
  await openManualForm(page);
  await expect(editTrigger(page, 'cycle')).toContainText("Mensal");
  await expect(editTrigger(page, 'price')).toContainText('por mês');

  await editText(page, 'name', 'Seguro Anual');
  await pickOption(page, 'cycle', 'Anual');
  await expect(editTrigger(page, 'price')).toContainText('por ano');
  await editText(page, 'price', '120');
  await expect(page.locator('#add-monthly-hint')).toContainText('10,00');
  await editText(page, 'due-date', '15');
  await pickOption(page, 'due-month', 'Março');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  const card = page.locator('.sub-card', { hasText: 'Seguro Anual' });
  await expect(card).toContainText('120,00');
  const [sub] = (await readStorage(page)).subs;
  expect(sub).toMatchObject({ cycle: 'yearly', price: 120, dueDate: '15', dueMonth: '3', dueWeekday: '' });
  await expect(card).not.toContainText(ATRASADA);

  // edição: valores aparecem preenchidos
  await card.click();
  await expect(editTrigger(page, 'cycle')).toContainText("Anual");
  await expect(editTrigger(page, 'price')).toContainText("120,00");
  await expect(editTrigger(page, 'due-date')).toContainText("Dia 15");
  await expect(editTrigger(page, 'due-month')).toContainText("Março");
});

test('cadastra assinatura semanal com dia da semana', async ({ page }) => {
  await seed(page, withSubs([]));
  await openManualForm(page);
  await editText(page, 'name', 'Faxina');
  await pickOption(page, 'cycle', 'Semanal');
  await expect(editTrigger(page, 'due-date')).toHaveCount(0);
  await expect(editTrigger(page, 'due-weekday')).toBeVisible();
  await editText(page, 'price', '10');
  await expect(page.locator('#add-monthly-hint')).toContainText('43,33');
  await pickOption(page, 'due-weekday', 'Terça');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  const card = page.locator('.sub-card', { hasText: 'Faxina' });
  await expect(card).toBeVisible();
  const [sub] = (await readStorage(page)).subs;
  expect(sub).toMatchObject({ cycle: 'weekly', price: 10, dueDate: '', dueMonth: '', dueWeekday: '2' });
  await expect(card).not.toContainText(ATRASADA);

  await card.click();
  await expect(editTrigger(page, 'cycle')).toContainText("Semanal");
  await expect(editTrigger(page, 'due-weekday')).toContainText("Terça");
});

test('trocar o ciclo de uma assinatura atrasada não gera atraso falso', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const card = page.locator('.sub-card', { hasText: 'AtrasadaApp' });
  await expect(card).toContainText(ATRASADA);

  await card.click();
  await pickOption(page, 'cycle', 'Anual');
  await editText(page, 'due-date', '1');
  await pickOption(page, 'due-month', 'Janeiro');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  await expect(page.locator('.sub-card', { hasText: 'AtrasadaApp' })).not.toContainText(ATRASADA);
  const saved = (await readStorage(page)).subs.find((s) => s.id === 'atrasada');
  expect(saved).toMatchObject({ cycle: 'yearly', paidCycle: '' });
});
