import { test, expect, seed, withSubs, sampleSubs, readStorage } from './fixtures.js';

const ATRASADA = /Atrasada · \d+d/;

async function openManualForm(page) {
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
}

test('cadastra assinatura anual com dia, mês e equivalente mensal', async ({ page }) => {
  await seed(page, withSubs([]));
  await openManualForm(page);
  await expect(page.locator('#add-cycle')).toHaveValue('monthly');
  await expect(page.getByLabel('Valor cobrado por mês (R$)')).toBeVisible();

  await page.fill('#add-name', 'Seguro Anual');
  await page.selectOption('#add-cycle', 'yearly');
  await expect(page.getByLabel('Valor cobrado por ano (R$)')).toBeVisible();
  await page.fill('#add-price', '120');
  await expect(page.locator('#add-monthly-hint')).toContainText('10,00');
  await page.fill('#add-due-date', '15');
  await page.selectOption('#add-due-month', '3');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  const card = page.locator('.sub-card', { hasText: 'Seguro Anual' });
  await expect(card).toContainText('120,00');
  const [sub] = (await readStorage(page)).subs;
  expect(sub).toMatchObject({ cycle: 'yearly', price: 120, dueDate: '15', dueMonth: '3', dueWeekday: '' });
  await expect(card).not.toContainText(ATRASADA);

  // edição: valores aparecem preenchidos
  await card.click();
  await expect(page.locator('#add-cycle')).toHaveValue('yearly');
  await expect(page.locator('#add-price')).toHaveValue('120');
  await expect(page.locator('#add-due-date')).toHaveValue('15');
  await expect(page.locator('#add-due-month')).toHaveValue('3');
});

test('cadastra assinatura semanal com dia da semana', async ({ page }) => {
  await seed(page, withSubs([]));
  await openManualForm(page);
  await page.fill('#add-name', 'Faxina');
  await page.selectOption('#add-cycle', 'weekly');
  await expect(page.locator('#add-due-date')).toHaveCount(0);
  await expect(page.getByLabel('Dia da semana')).toBeVisible();
  await page.fill('#add-price', '10');
  await expect(page.locator('#add-monthly-hint')).toContainText('43,33');
  await page.selectOption('#add-due-weekday', '2');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  const card = page.locator('.sub-card', { hasText: 'Faxina' });
  await expect(card).toBeVisible();
  const [sub] = (await readStorage(page)).subs;
  expect(sub).toMatchObject({ cycle: 'weekly', price: 10, dueDate: '', dueMonth: '', dueWeekday: '2' });
  await expect(card).not.toContainText(ATRASADA);

  await card.click();
  await expect(page.locator('#add-cycle')).toHaveValue('weekly');
  await expect(page.locator('#add-due-weekday')).toHaveValue('2');
});

test('trocar o ciclo de uma assinatura atrasada não gera atraso falso', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const card = page.locator('.sub-card', { hasText: 'AtrasadaApp' });
  await expect(card).toContainText(ATRASADA);

  await card.click();
  await page.selectOption('#add-cycle', 'yearly');
  await page.fill('#add-due-date', '1');
  await page.selectOption('#add-due-month', '1');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  await expect(page.locator('.sub-card', { hasText: 'AtrasadaApp' })).not.toContainText(ATRASADA);
  const saved = (await readStorage(page)).subs.find((s) => s.id === 'atrasada');
  expect(saved).toMatchObject({ cycle: 'yearly', paidCycle: '' });
});
