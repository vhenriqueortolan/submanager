import { test, expect, seed, withSubs, sampleSubs, readStorage } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });
const cards = (page) => page.locator('#discover-list .sub-card');

test('abre em "Todos", filtra e volta para "Todos" ao reabrir a aba', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await tab(page, 'Descobrir').click();
  await expect(page.locator('#discover-categories .category-pill.active')).toHaveAttribute('data-cat', 'Todos');
  await expect(cards(page)).toHaveCount(16);

  await page.locator('[data-cat="Games"]').click();
  await expect(cards(page)).toHaveCount(2);
  await page.locator('[data-cat="Dia a Dia"]').click();
  await expect(cards(page)).toHaveCount(2);

  await tab(page, 'Portfólio').click();
  await tab(page, 'Descobrir').click();
  await expect(page.locator('#discover-categories .category-pill.active')).toHaveAttribute('data-cat', 'Todos');
  await expect(cards(page)).toHaveCount(16);
});

test('busca global: resultado abre o cadastro já preenchido', async ({ page }) => {
  await seed(page, withSubs([]));
  await tab(page, 'Descobrir').click();
  await page.fill('#search-api', 'acme');
  const result = page.locator('#search-results .sub-card', { hasText: 'Acme Cloud' });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator('#add-name')).toHaveValue('Acme Cloud');
});

test('busca indisponível: mostra aviso e permite adicionar manualmente', async ({ page }) => {
  await seed(page, withSubs([]));
  await tab(page, 'Descobrir').click();
  await page.fill('#search-api', 'falha total');
  await expect(page.locator('#search-results')).toContainText('Busca indisponível');
  await page.getByRole('button', { name: /Adicionar “falha total” manualmente/ }).click();
  await expect(page.locator('#add-name')).toHaveValue('falha total');
  await page.keyboard.press('Escape');
  await expect(page.locator('#add-modal')).toHaveCount(0);
});

test('adicionar pelo Descobrir depois de editar outra assinatura não sobrescreve nada', async ({ page }) => {
  const subs = [
    { id: 'a', name: 'A', domain: '', category: 'IA', price: 10, dueDate: '5', paymentMethod: 'Pix', createdAt: '2020-01-01', paidCycle: '', lastNotified: '' },
    { id: 'b', name: 'B', domain: '', category: 'IA', price: 20, dueDate: '', paymentMethod: 'Pix', createdAt: '2020-01-01', paidCycle: '', lastNotified: '' },
  ];
  await seed(page, withSubs(subs));
  await page.locator('.sub-card', { hasText: 'A' }).first().click();
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  await tab(page, 'Descobrir').click();
  await cards(page).nth(3).click(); // Netflix
  await expect(page.locator('#add-name')).toHaveValue('Netflix');
  await expect(page.locator('#add-due-date')).toHaveValue(''); // não herda o vencimento da edição anterior
  await page.fill('#add-due-date', '12');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  const names = (await readStorage(page)).subs.map((s) => s.name);
  expect(names).toEqual(['A', 'B', 'Netflix']);
});
