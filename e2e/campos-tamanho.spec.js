import { test, expect, seed, withSubs, sampleSubs, openProfileScreen } from './fixtures.js';

// Campos com menos de 16px fazem o Safari do iPhone dar zoom ao focar. Vale para toda tela com campos.
async function expectFieldsAtLeast16px(page) {
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input, select, textarea'))
      .filter((el) => !['checkbox', 'radio', 'file', 'hidden'].includes(el.type))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => ({ id: el.id || el.className || el.tagName, size: parseFloat(getComputedStyle(el).fontSize) })),
  );
  for (const f of sizes) expect(f.size, `campo ${f.id}`).toBeGreaterThanOrEqual(16);
  return sizes.length;
}

test('cadastro: campos dos passos 1 e 2 têm 16px ou mais', async ({ page }) => {
  await seed(page, withSubs([]));
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  expect(await expectFieldsAtLeast16px(page)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await expect(page.locator('#add-name')).toBeVisible();
  expect(await expectFieldsAtLeast16px(page)).toBeGreaterThan(0);
});

for (const title of ['Meu perfil', 'Orçamento', 'Notificações', 'Dados e privacidade']) {
  test(`Perfil > ${title}: campos têm 16px ou mais`, async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await openProfileScreen(page, title);
    await expect(page.locator('.detail-screen')).toBeVisible();
    await expectFieldsAtLeast16px(page);
  });
}
