import { test, expect, seed, withSubs, sampleSubs, iso, readStorage } from './fixtures.js';
import { browserToday } from './timezone.js';

const people = [{ id: 'p1', name: 'Ana' }];

/** Dia `d` de `n` meses atrás, como AAAA-MM-DD. */
function monthsAgo(n, d = 10) {
  const t = browserToday();
  return iso(new Date(t.getFullYear(), t.getMonth() - n, d));
}
const rec = (id, n, share, extra = {}) => ({
  id, cycle: monthsAgo(n).slice(0, 7), paidAt: monthsAgo(n), amount: extra.price ?? share ?? 0, price: extra.price ?? share ?? 0,
  share, kind: 'manual', estimated: false, ...extra,
});

function subsWithHistory() {
  const [hoje, , , futura] = sampleSubs();
  return [
    { ...hoje, price: 50, payments: [rec('a1', 0, 50), rec('a2', 1, 40, { price: 40 }), rec('a3', 2, 40, { price: 40 })] },
    { ...futura, category: 'Games', price: 30, payments: [rec('b1', 0, 30, { kind: 'auto' }), rec('b2', 1, 30, { kind: 'auto', estimated: true })] },
  ];
}

const openFromCard = async (page) => {
  await page.locator('#history-card').click();
  await expect(page.getByRole('dialog', { name: 'Histórico' })).toBeVisible();
};

test('o card do Portfólio mostra o pago no mês e abre a tela com o total e a variação', async ({ page }) => {
  await seed(page, withSubs(subsWithHistory()));
  await expect(page.locator('#history-card')).toContainText('R$ 80,00'); // 50 + 30 neste mês
  await openFromCard(page);
  await expect(page.locator('#hist-month-total')).toHaveText(/R\$\s*80,00/);
  await expect(page.locator('.hist-variation')).toContainText('Subiu');
  await expect(page.locator('.hist-variation')).toContainText('R$ 70,00'); // mês passado: 40 + 30
});

test('lista agrupada por mês com etiquetas Paguei, Automática e Estimada; Desmarcar só nos manuais', async ({ page }) => {
  await seed(page, withSubs(subsWithHistory()));
  await openFromCard(page);
  await page.getByRole('button', { name: '12 meses' }).click();
  const list = page.locator('#hist-list');
  await expect(list.locator('.hist-month')).toHaveCount(3);
  await expect(list.locator('.hist-entry', { hasText: 'HojeApp' }).first().getByText('Paguei')).toBeVisible();
  await expect(list.locator('.hist-entry', { hasText: 'FuturaApp' }).first().getByText('Automática')).toBeVisible();
  await expect(list.locator('.hist-entry', { hasText: 'FuturaApp' }).nth(1).getByText('Estimada')).toBeVisible();
  const futura = list.locator('.hist-entry', { hasText: 'FuturaApp' });
  await expect(futura.getByRole('button', { name: /Desmarcar/ })).toHaveCount(0);
  await expect(list.locator('.hist-entry', { hasText: 'HojeApp' }).first().getByRole('button', { name: /Desmarcar/ })).toBeVisible();
});

test('Desmarcar remove o registro manual e o total do mês cai', async ({ page }) => {
  await seed(page, withSubs(subsWithHistory()));
  await openFromCard(page);
  await page.getByRole('button', { name: /Desmarcar pagamento de HojeApp/ }).first().click();
  await expect(page.locator('#hist-month-total')).toHaveText(/R\$\s*30,00/);
  const [hoje] = (await readStorage(page)).subs;
  expect(hoje.payments.map((p) => p.id)).not.toContain('a1');
});

test('filtros de período e categoria mudam a lista e os números', async ({ page }) => {
  await seed(page, withSubs(subsWithHistory()));
  await openFromCard(page);
  await expect(page.locator('#hist-period-total')).toHaveText(/R\$\s*80,00/);
  await page.getByRole('button', { name: '12 meses' }).click();
  await expect(page.locator('#hist-period-total')).toHaveText(/R\$\s*190,00/); // 80 + 70 + 40
  await page.getByRole('group', { name: 'Categoria' }).getByRole('button', { name: 'Games' }).click();
  await expect(page.locator('#hist-period-total')).toHaveText(/R\$\s*60,00/);
  await expect(page.locator('#hist-list .hist-entry', { hasText: 'HojeApp' })).toHaveCount(0);
  await expect(page.locator('#hist-categories')).toContainText('Games');
});

test('maior peso, média mensal e mudança de preço aparecem como fatos', async ({ page }) => {
  const subs = subsWithHistory();
  subs[0].payments = [rec('a1', 0, 55, { price: 55 }), rec('a2', 1, 40, { price: 40 }), rec('a3', 2, 40, { price: 40 })];
  await seed(page, withSubs(subs));
  await openFromCard(page);
  await expect(page.locator('#hist-top')).toContainText('HojeApp');
  await expect(page.locator('#hist-top')).toContainText('64,7%'); // 55 de 85 neste mês
  await expect(page.locator('#hist-average')).toHaveText(/R\$\s*\d/);
  await expect(page.locator('#hist-changes')).toContainText('HojeApp subiu de R$ 40,00 para R$ 55,00');
  await expect(page.getByText(/corte|cancele|deveria/i)).toHaveCount(0); // só fatos, sem recomendação
});

test('registro antigo de assinatura dividida aparece como total, com nota, e fica fora dos totais', async ({ page }) => {
  const [hoje] = sampleSubs();
  const sub = { ...hoje, price: 60, sharedWith: ['p1'], payments: [rec('old', 0, null, { price: 60, amount: 60 }), rec('new', 0, 30, { price: 60, amount: 60 })] };
  await seed(page, withSubs([sub], { people }));
  await openFromCard(page);
  await expect(page.locator('#hist-list')).toContainText('R$ 60,00 total');
  await expect(page.locator('#hist-total-note')).toBeVisible();
  await expect(page.locator('#hist-month-total')).toHaveText(/R\$\s*30,00/); // só o registro com a sua parte
});

test('carrega os meses sob demanda: três por vez', async ({ page }) => {
  const [hoje] = sampleSubs();
  const payments = [0, 1, 2, 3, 4, 5].map((n) => rec(`m${n}`, n, 10));
  await seed(page, withSubs([{ ...hoje, price: 10, payments }]));
  await openFromCard(page);
  await page.getByRole('button', { name: '12 meses' }).click();
  await expect(page.locator('#hist-list .hist-month')).toHaveCount(3);
  await page.locator('#hist-more').click();
  await expect(page.locator('#hist-list .hist-month')).toHaveCount(6);
  await expect(page.locator('#hist-more')).toHaveCount(0);
});

test('sem pagamentos no período, mostra o estado vazio', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openFromCard(page);
  await expect(page.getByRole('heading', { name: 'Nenhum pagamento no período' })).toBeVisible();
  await expect(page.locator('#hist-average')).toHaveText('Sem dados');
});

test('a tela Orçamento tem a linha Histórico, que abre a mesma tela por cima', async ({ page }) => {
  await seed(page, withSubs(subsWithHistory()));
  await page.locator('#budget-card').click();
  await page.locator('[data-edit="history"]').click();
  await expect(page.getByRole('dialog', { name: 'Histórico' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).last().click();
  await expect(page.getByRole('dialog', { name: 'Histórico' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Orçamento' })).toBeVisible(); // volta ao Orçamento, não ao Portfólio
});

test('o Voltar do sistema fecha só o Histórico', async ({ page }) => {
  await seed(page, withSubs(subsWithHistory()));
  await openFromCard(page);
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Histórico' })).toHaveCount(0);
  await expect(page.locator('#history-card')).toBeVisible();
});
