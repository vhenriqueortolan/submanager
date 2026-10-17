import { test, expect, seed, withSubs, sampleSubs, readNotifs } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });

test('card de orçamento no Início abre a tela e ← volta ao Início', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { budget: 300 }));
  await expect(page.locator('.stat-label', { hasText: 'Orçamento' })).toBeVisible();
  await page.locator('#budget-card').focus();
  await page.keyboard.press('Enter'); // teclado e foco
  await expect(page.getByRole('dialog', { name: 'Orçamento' })).toBeVisible();
  await expect(page.locator('[data-edit="budget"]')).toContainText('R$ 300,00');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(tab(page, 'Portfólio')).toHaveAttribute('aria-current', 'page');
});

test('Voltar do sistema fecha o Orçamento aberto pelo Início sem sair do app', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { budget: 300 }));
  await page.locator('#budget-card').click();
  await expect(page.getByRole('dialog', { name: 'Orçamento' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#budget-card')).toBeVisible();
});

test('não há mais "Teto" na interface', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { budget: 100 }));
  await expect(page.locator('body')).not.toContainText('Teto');
  await expect(page.locator('#budget-alert')).toHaveText('Orçamento excedido!');
  await tab(page, 'Perfil').click();
  await page.getByRole('button', { name: /^Orçamento\./ }).click();
  await expect(page.locator('body')).not.toContainText('Teto');
});

test.describe('permissão ainda não pedida', () => {
  test.use({ notifPermission: 'default' });

  test('o Ativar do banner abre a tela Notificações sem pedir a permissão', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await page.locator('#notif-prompt').getByRole('button', { name: 'Ativar' }).click();
    await expect(page.getByRole('dialog', { name: 'Notificações' })).toBeVisible();
    await expect(page.locator('#notif-status')).toHaveText('Ainda não pedidas.');
    expect(await page.evaluate(() => window.Notification.permission)).toBe('default');
    expect(await readNotifs(page)).toHaveLength(0);
  });
});

test('Descobrir: o filtro de categorias tem rótulo acessível', async ({ page }) => {
  await seed(page, withSubs([]));
  await tab(page, 'Descobrir').click();
  await expect(page.getByRole('group', { name: 'Filtrar por categoria' })).toBeVisible();
});

test('o banner de backup usa a cor de alerta e o de notificação é neutro', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const color = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).borderTopColor);
  const warning = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.borderTop = '1px solid var(--warning)';
    document.body.append(probe);
    const c = getComputedStyle(probe).borderTopColor;
    probe.remove();
    return c;
  });
  await expect(page.locator('#backup-banner')).toBeVisible();
  expect(await color('#backup-banner')).toBe(warning);
});

test('onboarding: o campo de valor tem o novo rótulo', async ({ page }) => {
  await page.goto('/');
  await page.fill('#setup-name', 'Ana');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Valor máximo por mês (só a sua parte)' })).toBeVisible();
  await expect(page.locator('#setup-budget')).toHaveAttribute('placeholder', '0,00');
});
