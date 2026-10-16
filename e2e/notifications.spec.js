import { test, expect, seed, withSubs, sampleSubs, readNotifs, readStorage } from './fixtures.js';

const ATRASADA = /Atrasada · \d+d/;

test.describe('permissão concedida', () => {
  test('avisa vence-hoje e atrasada; ignora paga e futura; não duplica no mesmo dia', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await expect.poll(async () => (await readNotifs(page)).length).toBe(2);
    const titles = (await readNotifs(page)).map((n) => n.title);
    expect(titles).toContain('HojeApp vence hoje');
    expect(titles).toContain('AtrasadaApp está atrasada');

    const subs = (await readStorage(page)).subs;
    expect(subs.filter((s) => s.lastNotified).map((s) => s.id).sort()).toEqual(['atrasada', 'hoje']);

    await page.reload();
    await page.waitForTimeout(500);
    expect(await readNotifs(page)).toHaveLength(2); // sessionStorage preserva o log entre reloads
  });

  test('"Paguei" interrompe os avisos daquele ciclo', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await page.locator('.sub-card', { hasText: 'AtrasadaApp' }).getByRole('button', { name: /Paguei/ }).click();
    await expect(page.locator('.sub-card', { hasText: 'AtrasadaApp' })).not.toContainText(ATRASADA);
    const s = (await readStorage(page)).subs.find((x) => x.id === 'atrasada');
    expect(s.paidCycle).toMatch(/^\d{4}-\d{2}$/);
  });
});

test.describe('permissão ainda não pedida', () => {
  test.use({ notifPermission: 'default' });

  test('card de ativação aparece e some após permitir; nada é enviado antes', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await expect(page.locator('#notif-prompt')).toBeVisible();
    expect(await readNotifs(page)).toHaveLength(0);

    await page.locator('#notif-prompt').getByRole('button', { name: 'Ativar' }).click();
    await expect(page.locator('#notif-prompt')).toHaveCount(0);
    await expect.poll(async () => (await readNotifs(page)).length).toBe(2);
  });
});
