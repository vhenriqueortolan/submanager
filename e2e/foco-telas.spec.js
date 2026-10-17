import { test, expect, seed, withSubs, sampleSubs } from './fixtures.js';

const focusedInside = (page, selector) => page.evaluate((s) => !!document.activeElement?.closest(s), selector);

test.describe('foco ao abrir telas (Sprint 6)', () => {
  test('abrir a tela de detalhe não foca nada', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
    await expect(page.locator('[data-screen]').first()).toBeVisible();
    expect(await focusedInside(page, '[role="dialog"]')).toBe(false);
  });

  test('a busca do cadastro abre sem foco no campo', async ({ page }) => {
    await seed(page, withSubs([]));
    await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
    await expect(page.locator('#modal-search-input')).toBeVisible();
    await expect(page.locator('#modal-search-input')).not.toBeFocused();
  });

  test('a confirmação foca Cancelar', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
    await page.getByRole('button', { name: 'Remover Assinatura' }).click();
    await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' })).toBeFocused();
  });
});
