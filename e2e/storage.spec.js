import fs from 'node:fs';
import { test, expect, seed, withSubs, sampleSubs, readStorage, STORAGE_KEY, openProfileScreen } from './fixtures.js';


test('JSON corrompido não quebra o app e fica guardado como backup', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.setItem(k, '{quebrado'), STORAGE_KEY);
  await page.reload();
  await expect(page.locator('#onboarding-fs')).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(`${k}:corrupt-backup`), STORAGE_KEY)).toBe('{quebrado');
});

test('recupera dados salvos por versões antigas (chave legada, sem ids)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('subDataV5'); // a 1ª visita já gravou o estado padrão; simula quem só tem a chave antiga
    localStorage.setItem('subDataV4', JSON.stringify({
      name: 'Antigo', budget: '300', subs: [{ name: 'Netflix', domain: 'netflix.com', price: '39.9', dueDate: '10' }],
    }));
  });
  await page.reload();
  await expect(page.locator('#onboarding-fs')).toHaveCount(0);
  await expect(page.locator('#subs-list')).toContainText('Netflix');
  const saved = await readStorage(page);
  expect(saved.subs[0].id).toBeTruthy();
  expect(saved.budget).toBe(300);
});

test('estado parcial é normalizado', async ({ page }) => {
  await seed(page, { name: 'Parcial' });
  await expect(page.locator('#onboarding-fs')).toHaveCount(0);
  await expect(page.locator('#hero-empty')).toContainText('Olá, Parcial.');
});

test('exportar gera o backup e importar substitui os dados após confirmação', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Dados e privacidade');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^submanager-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(exported.subs).toHaveLength(4);

  const file = {
    name: 'import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ name: 'Importado', budget: 123, subs: [{ name: 'Zeta', price: 9.9, dueDate: '7' }] })),
  };
  await page.setInputFiles('input[type=file]', file);

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('1 assinatura');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  expect((await readStorage(page)).subs).toHaveLength(4); // cancelar não altera nada

  await page.setInputFiles('input[type=file]', file);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Substituir' }).click();
  await expect(page.getByRole('status')).toContainText('Backup importado.');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: /^Meu perfil./ }).click();
  await expect(page.locator('#prof-name')).toHaveValue('Importado');
  expect((await readStorage(page)).subs.map((s) => s.name)).toEqual(['Zeta']);
});

test('backup inválido é rejeitado sem alterar os dados', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Dados e privacidade');
  await page.setInputFiles('input[type=file]', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('isso não é json') });
  await expect(page.getByRole('status')).toContainText('JSON válido');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect((await readStorage(page)).subs).toHaveLength(4);
});

test('mudanças em outra aba chegam via evento storage', async ({ page, context }) => {
  await seed(page, withSubs(sampleSubs()));
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.locator('#hero-count')).toHaveText('4');

  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k));
    s.subs.push({ ...s.subs[0], id: 'novo-id', name: 'Sincronizada' });
    localStorage.setItem(k, JSON.stringify(s));
  }, STORAGE_KEY);
  await expect(other.locator('#subs-list')).toContainText('Sincronizada');
  await expect(other.locator('#hero-count')).toHaveText('5');
});
