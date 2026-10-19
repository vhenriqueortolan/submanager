import { test, expect, seed, withSubs, sampleSubs, readStorage, iso } from './fixtures.js';
import { browserToday } from './timezone.js';

/** Assinatura com cobrança automática cadastrada há ~3 meses, vencendo no dia de hoje (a cobrança de hoje existe). */
function autoSub(extra = {}) {
  const t = browserToday();
  const created = new Date(t); created.setMonth(t.getMonth() - 3); created.setDate(1);
  const [hoje] = sampleSubs();
  return { ...hoje, id: 'auto', name: 'AutoApp', price: 40, dueDate: String(t.getDate()), createdAt: iso(created), autoCharge: true, paidCycle: '', ...extra };
}

test('ao abrir, grava uma cobrança automática por ciclo desde o cadastro, as passadas como estimadas', async ({ page }) => {
  await seed(page, withSubs([autoSub()]));
  await expect(page.locator('.sub-card', { hasText: 'AutoApp' })).toBeVisible(); // a tela inicial não espera o preenchimento
  await expect.poll(async () => (await readStorage(page)).subs[0].payments.length).toBeGreaterThanOrEqual(3);
  const { payments } = (await readStorage(page)).subs[0];
  expect(payments.every((p) => p.kind === 'auto' && p.price === 40 && p.share === 40)).toBe(true);
  const sorted = [...payments].sort((a, b) => (a.paidAt < b.paidAt ? -1 : 1));
  expect(sorted.slice(0, -1).every((p) => p.estimated === true)).toBe(true);
  expect(sorted.at(-1)).toMatchObject({ paidAt: iso(browserToday()), estimated: false }); // a de hoje é real
});

test('abrir de novo não duplica (idempotente) e o gasto mensal não muda', async ({ page }) => {
  await seed(page, withSubs([autoSub()]));
  await expect.poll(async () => (await readStorage(page)).subs[0].payments.length).toBeGreaterThanOrEqual(3);
  const antes = (await readStorage(page)).subs[0].payments;
  await page.reload();
  await expect(page.locator('#total-month')).toContainText('40,00');
  const depois = (await readStorage(page)).subs[0].payments;
  expect(depois).toEqual(antes);
});

test('o histórico na tela da assinatura mostra as cobranças automáticas, sem botão Desmarcar nas automáticas', async ({ page }) => {
  await seed(page, withSubs([autoSub()]));
  await expect.poll(async () => (await readStorage(page)).subs[0].payments.length).toBeGreaterThanOrEqual(3);
  await page.locator('.sub-card', { hasText: 'AutoApp' }).click();
  await page.getByRole('tablist', { name: 'Seções da assinatura' }).getByRole('tab', { name: 'Histórico' }).click();
  const rows = page.locator('#payment-history .payment-row');
  await expect(rows.first()).toContainText('R$ 40,00');
  await expect(rows.first()).toContainText('Automática');
  await expect(page.locator('#payment-history').getByRole('button', { name: /Desmarcar/ })).toHaveCount(0);
});

test('assinatura pausada não ganha cobranças no período pausado', async ({ page }) => {
  const t = browserToday();
  const created = new Date(t); created.setMonth(t.getMonth() - 3); created.setDate(1);
  const longAgo = iso(created);
  await seed(page, withSubs([autoSub({ status: 'paused', pauses: [{ from: longAgo, to: '' }] })]));
  await page.waitForTimeout(600);
  expect((await readStorage(page)).subs[0].payments).toHaveLength(0);
});

test('sem cobrança automática, nada é gravado', async ({ page }) => {
  await seed(page, withSubs([autoSub({ autoCharge: false })]));
  await page.waitForTimeout(600);
  expect((await readStorage(page)).subs[0].payments).toHaveLength(0);
});
