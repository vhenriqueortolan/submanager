import { test, expect, STORAGE_KEY } from './fixtures.js';

test('falha ao salvar avisa o usuário (armazenamento cheio ou bloqueado)', async ({ page }) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(k, v) {
      if (k === key) throw new DOMException('cheio', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  }, STORAGE_KEY);

  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Não foi possível salvar os dados neste navegador');
});
