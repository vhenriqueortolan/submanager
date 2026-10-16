import { test, expect, seed, withSubs, sampleSubs, readStorage } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });

test('"Paguei" mostra "Desfazer"; desfazer traz o aviso de volta', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const hoje = page.locator('.sub-card', { hasText: 'HojeApp' });
  await hoje.getByRole('button', { name: /Paguei/ }).click();

  const toast = page.getByRole('status');
  await expect(toast).toContainText('Pago.');
  await expect(hoje).not.toContainText('Vence hoje');
  const saved = (await readStorage(page)).subs.find((s) => s.id === 'hoje');
  expect(saved.payments).toHaveLength(1);
  expect(saved.paidCycle).toBe(saved.payments[0].cycle);

  await toast.getByRole('button', { name: 'Desfazer' }).click();
  await expect(hoje).toContainText('Vence hoje');
  const undone = (await readStorage(page)).subs.find((s) => s.id === 'hoje');
  expect(undone.payments).toEqual([]);
  expect(undone.paidCycle).toBe('');
});

test('histórico na edição lista o pagamento e permite desmarcar', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const atrasada = page.locator('.sub-card', { hasText: 'AtrasadaApp' });
  await atrasada.getByRole('button', { name: /Paguei/ }).click();
  await expect(page.getByRole('status')).toContainText('Pago.');

  await atrasada.click();
  const history = page.locator('#payment-history');
  await expect(history.locator('.payment-row')).toHaveCount(1);
  await expect(history).toContainText(/\d{2}\/\d{2}\/\d{4} · R\$\s50,00/);

  await history.getByRole('button', { name: /Desmarcar/ }).click();
  await expect(history).toContainText('Nenhum pagamento registrado.');
  expect((await readStorage(page)).subs.find((s) => s.id === 'atrasada').paidCycle).toBe('');
});

test('banner de backup: aparece, "Agora não" oculta, exportar zera', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const banner = page.locator('#backup-banner');
  await expect(banner).toBeVisible();

  await banner.getByRole('button', { name: 'Agora não' }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#backup-banner')).toHaveCount(0);
  expect((await readStorage(page)).backupSnoozeUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  // Sem soneca, o banner volta e some depois de exportar.
  await seed(page, withSubs(sampleSubs()));
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#backup-banner').getByRole('button', { name: 'Exportar backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^submanager-backup-/);
  await expect(page.locator('#backup-banner')).toHaveCount(0);
  expect((await readStorage(page)).lastBackupAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('sem assinaturas, o banner de backup não aparece', async ({ page }) => {
  await seed(page, withSubs([]));
  await expect(page.locator('#backup-banner')).toHaveCount(0);
});

test('dados antigos (schema 8, sem payments) carregam e ganham os campos novos', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { schema: 8 }));
  await expect(page.locator('#hero-count')).toHaveText('4');
  const hoje = page.locator('.sub-card', { hasText: 'HojeApp' });
  await hoje.getByRole('button', { name: /Paguei/ }).click();
  await tab(page, 'Perfil').click();
  const st = await readStorage(page);
  expect(st.schema).toBe(9);
  expect(st.subs.every((s) => Array.isArray(s.payments))).toBe(true);
});
