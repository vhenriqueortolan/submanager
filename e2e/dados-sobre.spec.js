import { test, expect, seed, withSubs, sampleSubs, openProfileScreen } from './fixtures.js';
import { browserToday } from './timezone.js';

const pad = (n) => String(n).padStart(2, '0');

test('"Apagar todos os dados" não aparece no hub e fica no fim de Dados e privacidade, em Zona de risco', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.bottom-nav').getByRole('button', { name: 'Perfil' }).click();
  await expect(page.getByRole('button', { name: 'Apagar todos os dados' })).toHaveCount(0);

  await page.getByRole('button', { name: /^Dados e privacidade\./ }).click();
  await expect(page.getByRole('heading', { name: 'Zona de risco' })).toBeVisible();
  const clear = page.getByRole('button', { name: 'Apagar todos os dados' });
  const privacy = await page.locator('#privacy-section').boundingBox();
  const risk = await clear.boundingBox();
  expect(risk.y).toBeGreaterThan(privacy.y + privacy.height);
});

test('Backup mostra "Último backup em DD/MM" depois de exportar', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Dados e privacidade');
  await expect(page.locator('#last-backup')).toHaveText('Nenhum backup ainda');
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar' }).click()]);
  const t = browserToday();
  await expect(page.locator('#last-backup')).toHaveText(`Último backup em ${pad(t.getDate())}/${pad(t.getMonth() + 1)}`);
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('button', { name: /^Dados e privacidade\./ })).toHaveAccessibleName(
    `Dados e privacidade. Último backup em ${pad(t.getDate())}/${pad(t.getMonth() + 1)}`,
  );
});

test('o botão de feedback ocupa a largura toda, como os demais botões', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Sobre');
  const link = await page.getByRole('link', { name: 'Enviar feedback' }).boundingBox();
  const box = await page.locator('#about-section').boundingBox();
  expect(Math.abs(link.width - box.width)).toBeLessThan(1);
});
