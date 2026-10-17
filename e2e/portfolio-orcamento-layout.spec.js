import { test, expect, seed, withSubs, sampleSubs, editText } from './fixtures.js';

test('Portfólio: a saudação fica acima do bloco de contagem, fora dele', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const greeting = page.locator('#hero-greeting');
  await expect(greeting).toContainText('Olá');
  await expect(page.locator('#hero-card #hero-greeting')).toHaveCount(0);
  const g = await greeting.boundingBox();
  const c = await page.locator('#hero-card').boundingBox();
  expect(g.y + g.height).toBeLessThanOrEqual(c.y);
});

test('Orçamento: sem botão Salvar, o valor salva ao confirmar a folha e o Histórico tem espaço próprio', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.bottom-nav').getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: /^Orçamento\./ }).click();
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toHaveCount(0);
  await editText(page, 'budget', '123');
  await expect(page.getByRole('status')).toContainText('Perfil salvo com sucesso!');

  const hero = await page.locator('[data-edit="budget"]').boundingBox();
  const hist = await page.locator('.orcamento-historico').boundingBox();
  expect(hist.y - (hero.y + hero.height)).toBeGreaterThan(16);
  await expect(page.locator('.orcamento-historico [data-edit="history"]')).toBeVisible();
});
