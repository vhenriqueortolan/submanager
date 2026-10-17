import { test, expect, seed, withSubs, sampleSubs } from './fixtures.js';

// Toque simulado pelo DevTools (Chromium): o Pixel 7 emula tela de toque, mas page.touchscreen só faz toque simples.
async function drag(page, { fromY, toY, x = 200, steps = 8 }) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', fromY);
  for (let i = 1; i <= steps; i += 1) await touch('touchMove', fromY + ((toY - fromY) * i) / steps);
  await touch('touchEnd', toY);
}

test.describe('puxar para atualizar', () => {
  test.skip(({ isMobile }) => !isMobile, 'gesto de toque: só no Pixel 7');

  test('puxar além do limiar na tela inicial mostra "Atualizado"', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await drag(page, { fromY: 150, toY: 400 });
    await expect(page.getByRole('status')).toContainText('Atualizado');
  });

  test('puxar pouco não atualiza', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await drag(page, { fromY: 150, toY: 190 });
    await page.waitForTimeout(500);
    await expect(page.getByRole('status')).not.toContainText('Atualizado');
  });

  test('sem conexão mostra "Sem conexão"', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await page.context().setOffline(true);
    await drag(page, { fromY: 150, toY: 400 });
    await expect(page.getByRole('status')).toContainText('Sem conexão');
    await page.context().setOffline(false);
  });

  test('com uma tela aberta o gesto não atualiza', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
    await expect(page.locator('#modal-step-2')).toBeVisible();
    await drag(page, { fromY: 150, toY: 400 });
    await page.waitForTimeout(500);
    await expect(page.getByRole('status')).not.toContainText('Atualizado');
  });

  test('fora da tela inicial o gesto não atualiza', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await page.locator('.bottom-nav').getByRole('button', { name: 'Perfil' }).click();
    await drag(page, { fromY: 150, toY: 400 });
    await page.waitForTimeout(500);
    await expect(page.getByRole('status')).not.toContainText('Atualizado');
  });
});
