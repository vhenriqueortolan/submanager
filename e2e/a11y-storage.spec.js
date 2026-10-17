import { test, expect, seed, withSubs, sampleSubs, editText } from './fixtures.js';

const inside = (page, selector) => page.evaluate((s) => !!document.activeElement?.closest(s), selector);

// Desktop: foco inicial no primeiro campo. Mobile (toque): no ←, para não abrir o teclado sozinho.
const expectInitialFocus = async (page, field, isMobile) => {
  // field nulo: tela sem campo para focar (passo 2 do cadastro), o foco inicial é o ← em qualquer aparelho.
  if (isMobile || !field) await expect(page.getByRole('button', { name: 'Voltar' }).last()).toBeFocused();
  else await expect(page.locator(field)).toBeFocused();
};

test.describe('foco do modal', () => {
  test('foco inicial, Tab preso no diálogo, Esc devolve o foco e o body não rola', async ({ page, isMobile }) => {
    await seed(page, withSubs(sampleSubs()));
    const card = page.locator('.sub-card', { hasText: 'HojeApp' });
    await card.focus();
    await page.keyboard.press('Enter');

    await expectInitialFocus(page, null, isMobile);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      expect(await inside(page, '[role="dialog"]')).toBe(true);
    }
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside(page, '[role="dialog"]')).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('#add-modal')).toHaveCount(0);
    await expect(page.locator('.sub-card', { hasText: 'HojeApp' })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('ao trocar de passo o foco vai para o novo conteúdo; diálogo de confirmação devolve o foco', async ({ page, isMobile }) => {
    await seed(page, withSubs([]));
    const open = page.getByRole('button', { name: '+ Cadastrar assinatura' });
    await open.click();
    await expectInitialFocus(page, '#modal-search-input', isMobile);
    await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
    await expectInitialFocus(page, null, isMobile);
    await editText(page, 'name', 'Teste Foco');
    await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
    await expect(page.locator('#add-modal')).toHaveCount(0);

    await page.locator('.sub-card', { hasText: 'Teste Foco' }).click();
    const remove = page.getByRole('button', { name: 'Remover Assinatura' });
    await remove.click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      expect(await inside(page, '[role="alertdialog"]')).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(remove).toBeFocused();
    await expect(page.locator('#add-modal')).toBeVisible();
  });
});

test.describe('armazenamento persistente', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__persistCalls = 0;
      Object.defineProperty(navigator.storage, 'persisted', { value: async () => false, configurable: true });
      Object.defineProperty(navigator.storage, 'persist', {
        value: async () => { window.__persistCalls += 1; return true; },
        configurable: true,
      });
    });
  });
  const calls = (page) => page.evaluate(() => window.__persistCalls);

  test('pede persistência ao concluir o onboarding', async ({ page }) => {
    await page.goto('/');
    expect(await calls(page)).toBe(0);
    await page.getByRole('button', { name: 'Pular por enquanto' }).click();
    await expect(page.locator('#hero-empty')).toBeVisible();
    expect(await calls(page)).toBe(1);
  });

  test('pede persistência ao salvar a primeira assinatura, mas não nas seguintes', async ({ page }) => {
    await seed(page, withSubs([]));
    expect(await calls(page)).toBe(0);
    for (const name of ['Primeira', 'Segunda']) {
      await page.getByRole('button', { name: /Cadastrar assinatura|Adicionar assinatura/ }).first().click();
      await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
      await editText(page, 'name', name);
      await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
      await expect(page.locator('.sub-card', { hasText: name })).toBeVisible();
    }
    expect(await calls(page)).toBe(1);
  });
});
