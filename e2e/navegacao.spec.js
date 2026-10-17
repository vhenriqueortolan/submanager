import { test, expect, seed, withSubs, sampleSubs, editText } from './fixtures.js';

const ROWS = ['Meu perfil', 'Orçamento', 'Notificações', 'Dados e privacidade', 'Sobre'];

for (const title of ROWS) {
  test(`hub → ${title}: Voltar do sistema e ← fecham a tela e o app continua no Perfil`, async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    const nav = page.locator('.bottom-nav');
    await nav.getByRole('button', { name: 'Perfil' }).click();
    const row = page.getByRole('button', { name: new RegExp(`^${title}\\.`) });

    await row.click();
    await expect(page.getByRole('dialog', { name: title })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');
    await expect(row).toBeVisible();

    await row.click();
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(row).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
}

test('Orçamento: alteração não salva + Voltar do sistema → Continuar editando mantém o valor', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.bottom-nav').getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: /^Orçamento\./ }).click();
  await editText(page, 'budget', '999');
  await page.goBack();
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(page.locator('[data-edit="budget"]')).toContainText('R$ 999,00');
  await page.goBack();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Orçamento\./ })).toHaveAccessibleName('Orçamento. R$ 500 por mês');
});

test('Início: Notificações e Orçamento abertos a partir do Início voltam ao Início', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('#budget-card').click();
  await page.goBack();
  await expect(page.locator('#budget-card')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
