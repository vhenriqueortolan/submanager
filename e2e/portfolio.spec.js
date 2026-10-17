import { test, expect, seed, withSubs, sampleSubs, readStorage } from './fixtures.js';

const ATRASADA = /Atrasada · \d+d/;

test('sem assinaturas: hero escondido, mensagem e CTA abrem o cadastro', async ({ page }) => {
  await seed(page, withSubs([]));
  await expect(page.locator('#hero-card')).toHaveCount(0);
  await expect(page.locator('#subs-section')).toHaveCount(0);
  await expect(page.locator('#hero-empty')).toContainText('Nenhuma assinatura ainda');
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await expect(page.locator('#modal-step-1')).toBeVisible();
  await expect(page.locator('#modal-quick-grid .quick-item').first()).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('#add-modal')).toHaveCount(0);
});

test('com assinaturas: hero, status de vencimento e "Paguei" persistente', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await expect(page.locator('#hero-card')).toBeVisible();
  await expect(page.locator('#hero-empty')).toHaveCount(0);
  await expect(page.locator('#hero-count')).toHaveText('4');

  const hoje = page.locator('.sub-card', { hasText: 'HojeApp' });
  const atrasada = page.locator('.sub-card', { hasText: 'AtrasadaApp' });
  await expect(hoje).toContainText('Vence hoje');
  await expect(atrasada).toContainText(ATRASADA);
  await expect(page.locator('.sub-card', { hasText: 'PagaApp' })).not.toContainText(/Vence hoje|Atrasada · /);
  await expect(page.locator('.sub-card', { hasText: 'FuturaApp' })).not.toContainText(/Vence hoje|Atrasada · /);

  await hoje.getByRole('button', { name: /Paguei/ }).click();
  await expect(hoje).not.toContainText('Vence hoje');
  await page.reload();
  await expect(page.locator('.sub-card', { hasText: 'HojeApp' })).not.toContainText('Vence hoje');
  await expect(page.locator('.sub-card', { hasText: 'AtrasadaApp' })).toContainText('Atrasada');
});

test('gasto mensal, orçamento e projeção anual', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { budget: 240 })); // 4 × R$ 50 = 200 (83% do orçamento)
  await expect(page.locator('#total-month')).toContainText('200,00');
  await expect(page.locator('#budget-status')).toContainText('240,00');
  await expect(page.locator('#annual-projection')).toContainText('2.400,00');
  await expect(page.locator('#budget-alert')).toContainText('Próximo ao limite');
});

test('sem assinaturas não mostra projeção anual; orçamento excedido avisa', async ({ page }) => {
  await seed(page, withSubs([]));
  await expect(page.locator('#annual-projection')).toHaveCount(0);
  await seed(page, withSubs(sampleSubs(), { budget: 100 }));
  await expect(page.locator('#budget-alert')).toContainText('Orçamento excedido');
});

test('cadastro manual, edição e remoção com diálogo de confirmação', async ({ page }) => {
  await seed(page, withSubs([]));
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await expect(page.getByRole('button', { name: 'Salvar Assinatura' })).toBeDisabled(); // nome obrigatório
  await page.fill('#add-name', 'Meu Serviço');
  await page.fill('#add-price', '29.9');
  await page.fill('#add-due-date', '12');
  await page.selectOption('#add-payment', 'Boleto');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();

  const card = page.locator('.sub-card', { hasText: 'Meu Serviço' });
  await expect(card).toContainText('29,90');
  await expect(card).toContainText('Dia 12');
  let [sub] = (await readStorage(page)).subs;
  expect(sub).toMatchObject({ name: 'Meu Serviço', price: 29.9, dueDate: '12', paymentMethod: 'Boleto' });
  expect(sub.id).toBeTruthy();

  // edição preserva o id
  await card.click();
  await page.fill('#add-price', '35');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  const [edited] = (await readStorage(page)).subs;
  expect(edited.id).toBe(sub.id);
  expect(edited.price).toBe(35);

  // remoção: cancelar mantém, confirmar remove
  await page.locator('.sub-card', { hasText: 'Meu Serviço' }).click();
  await page.getByRole('button', { name: 'Remover Assinatura' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Remover assinatura?');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  expect((await readStorage(page)).subs).toHaveLength(1);

  await page.getByRole('button', { name: 'Remover Assinatura' }).click();
  await page.keyboard.press('Escape'); // Esc fecha só o diálogo, o modal continua aberto
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('#add-modal')).toBeVisible();

  await page.getByRole('button', { name: 'Remover Assinatura' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click();
  await expect(page.locator('#hero-empty')).toBeVisible();
  expect((await readStorage(page)).subs).toHaveLength(0);
});
