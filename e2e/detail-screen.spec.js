import { test, expect, seed, withSubs, sampleSubs } from './fixtures.js';

const open = async (page) => {
  await seed(page, withSubs(sampleSubs()));
  await page.getByRole('button', { name: 'Abrir tela de teste' }).click();
  await expect(screen(page)).toBeVisible();
};
const screen = (page) => page.getByRole('dialog', { name: 'Tela de teste' });
const discardDialog = (page) => page.getByRole('alertdialog', { name: 'Descartar alterações?' });

test('Voltar do sistema fecha a tela e o app continua', async ({ page }) => {
  await open(page);
  await page.goBack();
  await expect(screen(page)).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('← fecha a tela', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(screen(page)).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).toBeVisible();
});

test('Esc fecha a tela', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Escape');
  await expect(screen(page)).toHaveCount(0);
});

test('trocar de aba não empilha: um Voltar fecha a tela e só isso', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const nav = page.locator('.bottom-nav');
  await nav.getByRole('button', { name: 'Descobrir' }).click();
  await nav.getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: 'Abrir tela de teste' }).click();
  await page.goBack();
  await expect(screen(page)).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');
});

test('alteração não salva + ← pergunta; Continuar editando mantém tela e texto', async ({ page }) => {
  await open(page);
  await page.fill('#test-field', 'rascunho');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(discardDialog(page)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(discardDialog(page)).toHaveCount(0);
  await expect(screen(page)).toBeVisible();
  await expect(page.locator('#test-field')).toHaveValue('rascunho');
});

test('alteração não salva + ← e Descartar fecha a tela', async ({ page }) => {
  await open(page);
  await page.fill('#test-field', 'rascunho');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await discardDialog(page).getByRole('button', { name: 'Descartar' }).click();
  await expect(screen(page)).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).toBeVisible();
});

test('alteração não salva + Voltar do sistema: Continuar editando mantém a tela, e um novo Voltar ainda pergunta', async ({ page }) => {
  await open(page);
  await page.fill('#test-field', 'rascunho');
  await page.goBack();
  await expect(discardDialog(page)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(screen(page)).toBeVisible();
  await expect(page.locator('#test-field')).toHaveValue('rascunho');

  // a entrada do histórico foi recolocada: Voltar de novo pergunta de novo
  await page.goBack();
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Descartar' }).click();
  await expect(screen(page)).toHaveCount(0);
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('Esc com alteração pergunta antes de fechar', async ({ page }) => {
  await open(page);
  await page.fill('#test-field', 'x');
  await page.keyboard.press('Escape');
  await expect(discardDialog(page)).toBeVisible();
  await expect(screen(page)).toBeVisible();
});

test('com prefers-reduced-motion a tela fecha na hora', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(screen(page)).toHaveCount(0, { timeout: 150 });
});
