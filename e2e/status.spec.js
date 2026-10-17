import { test, expect, seed, withSubs, sampleSubs, iso } from './fixtures.js';
import { browserToday } from './timezone.js';

const today = () => iso(browserToday());

/** Duas ativas (HojeApp e FuturaApp) mais uma pausada e uma cancelada, com preços distintos. */
function mixedSubs() {
  const [hoje, , , futura] = sampleSubs();
  return [
    { ...hoje, price: 50 },
    { ...futura, price: 30 },
    { ...hoje, id: 'pausada', name: 'PausadaApp', price: 100, status: 'paused', pauses: [{ from: today(), to: '' }], paidCycle: '' },
    { ...hoje, id: 'cancelada', name: 'CanceladaApp', price: 200, status: 'cancelled', cancelledAt: today(), paidCycle: '' },
  ];
}

test('totais, contagem e logos só contam as ativas', async ({ page }) => {
  await seed(page, withSubs(mixedSubs()));
  await expect(page.locator('#total-month')).toContainText('80,00'); // 50 + 30
  await expect(page.locator('#hero-count')).toHaveText('2');
  await expect(page.locator('#annual-projection')).toContainText('960,00');
});

test('pausadas e canceladas aparecem à parte, com selo de texto, sem vencimento nem Paguei', async ({ page }) => {
  await seed(page, withSubs(mixedSubs()));
  const parte = page.locator('#stopped-list');
  await expect(parte).toBeVisible();
  const pausada = parte.locator('.sub-card', { hasText: 'PausadaApp' });
  await expect(pausada).toContainText('Pausada');
  await expect(pausada.getByRole('button', { name: /Paguei/ })).toHaveCount(0);
  await expect(pausada).not.toContainText('Atrasada');
  await expect(parte.locator('.sub-card', { hasText: 'CanceladaApp' })).toContainText('Cancelada');
  // As ativas ficam na lista principal.
  await expect(page.locator('#subs-list .sub-card')).toHaveCount(2);
});

test('sem pausadas nem canceladas, a seção à parte não existe', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await expect(page.locator('#stopped-list')).toHaveCount(0);
});

test('pausada e cancelada não disparam aviso de vencimento', async ({ page }) => {
  await seed(page, withSubs(mixedSubs().filter((s) => s.id === 'pausada' || s.id === 'cancelada')));
  await page.waitForTimeout(500);
  const notifs = await page.evaluate(() => window.__notifs || []);
  expect(notifs).toHaveLength(0);
});
