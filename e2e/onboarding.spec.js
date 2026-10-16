import { test, expect, readStorage } from './fixtures.js';

test('fluxo completo leva ao estado vazio com saudação e persiste o perfil', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#onboarding-fs')).toBeVisible();

  await page.fill('#setup-name', 'Victor');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.fill('#setup-budget', '500');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'IA', exact: true }).click();
  await page.getByRole('button', { name: 'Ir para o App' }).click();

  await expect(page.locator('#onboarding-fs')).toHaveCount(0);
  await expect(page.locator('#hero-empty')).toContainText('Olá, Victor.');
  const saved = await readStorage(page);
  expect(saved).toMatchObject({ onboarded: true, name: 'Victor', budget: 500, interests: ['IA'] });
});

test('"Pular por enquanto" encerra o onboarding mantendo o que já foi preenchido', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pular por enquanto' }).click();
  await expect(page.locator('#hero-empty')).toContainText('Olá, Membro.');

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.fill('#setup-name', 'Ana');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Pular por enquanto' }).click();
  await expect(page.locator('#hero-empty')).toContainText('Olá, Ana.');
});
