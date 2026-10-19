import { test, expect, seed, withSubs, sampleSubs, readStorage, iso } from './fixtures.js';
import { browserToday } from './timezone.js';

const people = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bruno' }];
const today = () => iso(browserToday());

test('pagar uma assinatura dividida registra a sua parte e o histórico mostra esse valor', async ({ page }) => {
  const [hoje] = sampleSubs();
  await seed(page, withSubs([{ ...hoje, price: 60, sharedWith: ['p1', 'p2'] }], { people }));
  await page.locator('.sub-card', { hasText: 'HojeApp' }).getByRole('button', { name: /Paguei/ }).click();
  const [sub] = (await readStorage(page)).subs;
  expect(sub.payments).toHaveLength(1);
  expect(sub.payments[0]).toMatchObject({ amount: 60, price: 60, share: 20, kind: 'manual', estimated: false });

  await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
  await page.getByRole('tablist', { name: 'Seções da assinatura' }).getByRole('tab', { name: 'Histórico' }).click();
  await expect(page.locator('#payment-history .payment-row')).toContainText('R$ 20,00');
  await expect(page.locator('#payment-history .payment-row')).not.toContainText('total');
});

test('registro antigo de assinatura dividida aparece como total, e o app guarda sua parte desconhecida', async ({ page }) => {
  const [hoje] = sampleSubs();
  const antigo = { id: 'old', cycle: '2026-01', paidAt: '2026-01-10', amount: 60 };
  await seed(page, withSubs([{ ...hoje, price: 60, sharedWith: ['p1'], payments: [antigo] }], { people }));
  await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
  await page.getByRole('tablist', { name: 'Seções da assinatura' }).getByRole('tab', { name: 'Histórico' }).click();
  await expect(page.locator('#payment-history .payment-row')).toContainText('R$ 60,00 total');
  // Salvar a edição mantém o registro como estava (o botão fica na subaba Plano).
  await page.getByRole('tablist', { name: 'Seções da assinatura' }).getByRole('tab', { name: 'Plano' }).click();
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  const [sub] = (await readStorage(page)).subs;
  expect(sub.payments[0]).toMatchObject({ id: 'old', amount: 60, price: 60, share: null, kind: 'manual', estimated: false });
});

test('registro antigo de assinatura sem divisão vira manual com sua parte igual ao valor', async ({ page }) => {
  const [hoje] = sampleSubs();
  await seed(page, withSubs([{ ...hoje, price: 50, payments: [{ id: 'old', cycle: '2026-01', paidAt: today(), amount: 50 }] }]));
  await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
  await page.getByRole('tablist', { name: 'Seções da assinatura' }).getByRole('tab', { name: 'Histórico' }).click();
  await expect(page.locator('#payment-history .payment-row')).toContainText('R$ 50,00');
  const stored = (await readStorage(page)).subs[0].payments[0];
  expect(stored).toMatchObject({ share: 50, kind: 'manual' });
});
