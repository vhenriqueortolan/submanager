import { test, expect, seed, withSubs, sampleSubs, editTrigger } from './fixtures.js';

test('Enter em "Paguei" marca o pagamento sem abrir o cadastro', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const card = page.locator('.sub-card', { hasText: 'HojeApp' });
  const pay = card.getByRole('button', { name: /Paguei/ });
  await pay.focus();
  await page.keyboard.press('Enter');
  await expect(pay).toHaveCount(0);
  await expect(page.locator('#add-modal')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Enter na busca do cadastro avança para os dados', async ({ page }) => {
  await seed(page, withSubs([]));
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  const search = page.locator('#modal-search-input');
  await search.fill('Meu Serviço Raro');
  await search.press('Enter');
  await expect(page.locator('#modal-step-2')).toBeVisible();
  await expect(editTrigger(page, 'name')).toContainText('Meu Serviço Raro');
});

test('Enter no nome do onboarding avança para o orçamento', async ({ page }) => {
  await page.goto('/');
  const name = page.locator('#setup-name');
  await name.fill('Ana');
  await name.press('Enter');
  await expect(page.locator('#step-2')).toBeVisible();
  const budget = page.locator('#setup-budget');
  await budget.fill('100');
  await budget.press('Enter');
  await expect(page.locator('#step-3')).toBeVisible();
});

test('Tab percorre os cartões do Portfólio na ordem visual', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.sub-card').first().focus();
  // A ordem do foco (índice do cartão no DOM) tem de bater com a ordem visual (de cima para baixo).
  const idx = [];
  for (let i = 0; i < 8; i += 1) {
    const n = await page.evaluate(() => {
      const c = document.activeElement?.closest('.sub-card');
      return c ? Array.from(document.querySelectorAll('.sub-card')).indexOf(c) : null;
    });
    if (n !== null) idx.push(n);
    await page.keyboard.press('Tab');
  }
  expect(new Set(idx).size).toBeGreaterThan(3);
  expect([...idx].sort((x, y) => x - y)).toEqual(idx);
  const tops = await page.locator('.sub-card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top + window.scrollY)));
  expect([...tops].sort((x, y) => x - y)).toEqual(tops);
});

test('Esc fecha a folha de edição e depois a tela', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await page.locator('.sub-card', { hasText: 'HojeApp' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#modal-step-2')).toBeVisible();
  await editTrigger(page, 'name').click();
  await expect(page.locator('.ds-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ds-sheet')).toHaveCount(0);
  await expect(page.locator('#modal-step-2')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#add-modal')).toHaveCount(0);
});
