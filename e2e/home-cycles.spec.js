import { test, expect, seed, withSubs, sampleSubs, iso } from './fixtures.js';
import { browserToday } from './timezone.js';

test('lista ordenada por urgência: atrasada, hoje, futura, paga', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await expect(page.locator('.sub-card .sub-title')).toHaveText(['AtrasadaApp', 'HojeApp', 'FuturaApp', 'PagaApp']);
});

test('caso misto: preço com sufixo, vencimento, equivalente mensal e projeção anual', async ({ page }) => {
  const t = browserToday();
  const base = { domain: '', category: 'IA', paymentMethod: 'Pix', paidCycle: '', lastNotified: '', createdAt: iso(t) };
  await seed(page, withSubs([
    { ...base, id: 'm', name: 'Mensal', price: 50, dueDate: '' },
    { ...base, id: 'a', name: 'Anual', price: 120, cycle: 'yearly', dueDate: '15', dueMonth: '3' },
    { ...base, id: 's', name: 'Semanal', price: 10, cycle: 'weekly', dueWeekday: '1' },
  ], { budget: 500 }));

  await expect(page.locator('#total-month')).toContainText('103,33'); // 50 + 10 + 43,33
  await expect(page.locator('#annual-projection')).toContainText('1.240,00'); // 600 + 120 + 520
  await expect(page.locator('#budget-note')).toContainText('convertidas para mensal');

  const anual = page.locator('.sub-card', { hasText: 'Anual' });
  await expect(anual).toContainText('/ano');
  await expect(anual).toContainText('Vence 15/03');
  const semanal = page.locator('.sub-card', { hasText: 'Semanal' });
  await expect(semanal).toContainText('/semana');
  await expect(semanal).toContainText('Toda segunda');
});

test('só mensais: sem nota de conversão e card como antes', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await expect(page.locator('#budget-note')).toHaveCount(0);
  await expect(page.locator('.sub-card', { hasText: 'HojeApp' })).toContainText(/Dia \d+/);
});
