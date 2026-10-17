import { test, expect, seed, withSubs, sampleSubs, iso, editText } from './fixtures.js';
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

// ---------- bloco de status na tela da assinatura ----------
const openEdit = async (page, nome) => {
  await page.locator('.sub-card', { hasText: nome }).click();
  await expect(page.locator('#status-block')).toBeVisible();
};

test('o bloco de status vem logo abaixo do herói, antes do plano, e a zona de risco fica por último', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openEdit(page, 'HojeApp');
  const y = (loc) => loc.evaluate((el) => el.getBoundingClientRect().top);
  const ys = {
    heroi: await y(page.locator('[data-edit="price"]')),
    status: await y(page.locator('#status-block')),
    plano: await y(page.locator('#modal-step-2 .ds-section-title', { hasText: 'Plano' })),
    risco: await y(page.locator('.risk-zone')),
  };
  expect(ys.heroi).toBeLessThan(ys.status);
  expect(ys.status).toBeLessThan(ys.plano);
  expect(ys.plano).toBeLessThan(ys.risco);
  const block = page.locator('#status-block');
  await expect(block.getByText('Ativa', { exact: true })).toBeVisible();
  await expect(block.getByRole('button', { name: 'Pausar assinatura' })).toBeVisible();
  await expect(block.getByRole('button', { name: 'Cancelar assinatura' })).toBeVisible();
  await expect(block.getByRole('button', { name: 'Reativar assinatura' })).toHaveCount(0);
});

test('pausar tira dos totais, grava o período e o aviso traz Desfazer', async ({ page }) => {
  await seed(page, withSubs(mixedSubs().slice(0, 2)));
  await expect(page.locator('#total-month')).toContainText('80,00');
  await openEdit(page, 'HojeApp');
  await page.getByRole('button', { name: 'Pausar assinatura' }).click();
  await expect(page.getByRole('status')).toContainText('Assinatura pausada.');
  await expect(page.locator('#status-block')).toContainText('Pausada desde');
  await expect(page.getByRole('button', { name: 'Reativar assinatura' })).toBeVisible();
  const st = (await page.evaluate(() => JSON.parse(localStorage.getItem('subDataV5')))).subs.find((s) => s.name === 'HojeApp');
  expect(st.status).toBe('paused');
  expect(st.pauses).toEqual([{ from: today(), to: '' }]);

  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.locator('#total-month')).toContainText('30,00'); // só a FuturaApp
  await expect(page.locator('#stopped-list .sub-card', { hasText: 'HojeApp' })).toContainText('Pausada');

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.locator('#total-month')).toContainText('80,00');
  await expect(page.locator('#stopped-list')).toHaveCount(0);
});

test('cancelar e reativar: reversível, o histórico fica e salvar a edição não perde o status', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openEdit(page, 'FuturaApp');
  await page.getByRole('button', { name: 'Cancelar assinatura' }).click();
  await expect(page.getByRole('status')).toContainText('Assinatura cancelada.');
  await expect(page.locator('#status-block')).toContainText('Cancelada em');
  await expect(page.getByRole('button', { name: 'Pausar assinatura' })).toHaveCount(0);
  // Sem diálogo de confirmação: cancelar é reversível, só remover pede confirmação.
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await editText(page, 'price', '77');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  let sub = (await page.evaluate(() => JSON.parse(localStorage.getItem('subDataV5')))).subs.find((s) => s.name === 'FuturaApp');
  expect(sub).toMatchObject({ status: 'cancelled', cancelledAt: today(), price: 77 });

  await page.locator('.sub-card', { hasText: 'FuturaApp' }).click();
  await page.getByRole('button', { name: 'Reativar assinatura' }).click();
  await expect(page.locator('#status-block')).toContainText('Entra nos totais');
  sub = (await page.evaluate(() => JSON.parse(localStorage.getItem('subDataV5')))).subs.find((s) => s.name === 'FuturaApp');
  expect(sub.status).toBe('active');
  expect(sub.cancelledAt).toBe('');
});

test('remover continua pedindo confirmação, na zona de risco', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openEdit(page, 'HojeApp');
  await page.getByRole('button', { name: 'Remover Assinatura' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
});
