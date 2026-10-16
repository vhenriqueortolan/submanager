import { test, expect, seed, withSubs, sampleSubs } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });

test('campos refletem o que está salvo e rascunhos são descartados', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await tab(page, 'Perfil').click();
  await expect(page.locator('#prof-name')).toHaveValue('Victor');
  await expect(page.locator('#prof-budget')).toHaveValue('500');
  await expect(page.locator('#prof-interests .category-pill.active')).toHaveText(['IA', 'Games']);

  await page.fill('#prof-name', 'Rascunho');
  await tab(page, 'Portfólio').click();
  await tab(page, 'Perfil').click();
  await expect(page.locator('#prof-name')).toHaveValue('Victor');
});

test('salvar mostra toast e sobrevive ao reload', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await tab(page, 'Perfil').click();
  await page.fill('#prof-name', 'Victor S');
  await page.fill('#prof-budget', '800');
  await page.locator('#prof-interests [data-val="Dev"]').click();
  await page.getByRole('button', { name: 'Salvar Configurações' }).click();
  await expect(page.getByRole('status')).toContainText('Perfil salvo com sucesso!');

  await page.reload();
  await tab(page, 'Perfil').click();
  await expect(page.locator('#prof-name')).toHaveValue('Victor S');
  await expect(page.locator('#prof-budget')).toHaveValue('800');
  await expect(page.locator('#prof-interests .category-pill.active')).toHaveText(['IA', 'Cloud & Dev', 'Games']);
});
