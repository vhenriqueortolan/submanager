import fs from 'node:fs';
import { test, expect, seed, withSubs, sampleSubs, readNotifs, readStorage, iso, openProfileScreen, pickOption } from './fixtures.js';
import { browserToday } from './timezone.js';


/** Vence amanhã, cadastrada hoje (sem atraso retroativo). */
function tomorrowSub() {
  const t = browserToday();
  const tomorrow = new Date(t);
  tomorrow.setDate(t.getDate() + 1);
  return {
    id: 'amanha', name: 'AmanhaApp', domain: '', category: 'IA', price: 50, paymentMethod: 'Pix',
    paidCycle: '', lastNotified: '', createdAt: iso(t), dueDate: String(tomorrow.getDate()),
  };
}

test('antecedência de 1 dia avisa no dia anterior, uma vez só', async ({ page }) => {
  await seed(page, withSubs([tomorrowSub()], { settings: { enabled: true, notifyToday: true, notifyOverdue: true, advanceDays: 1 } }));
  await expect.poll(async () => (await readNotifs(page)).length).toBe(1);
  expect((await readNotifs(page))[0].title).toBe('AmanhaApp vence amanhã');

  await page.reload();
  await page.waitForTimeout(500);
  expect(await readNotifs(page)).toHaveLength(1);
});

test('sem antecedência (padrão), assinatura de amanhã não avisa', async ({ page }) => {
  await seed(page, withSubs([tomorrowSub()]));
  await page.waitForTimeout(700);
  expect(await readNotifs(page)).toHaveLength(0);
});

test('"Receber avisos" desligado silencia tudo', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { settings: { enabled: false, notifyToday: true, notifyOverdue: true, advanceDays: 0 } }));
  await page.waitForTimeout(700);
  expect(await readNotifs(page)).toHaveLength(0);
});

test('Perfil: chaves e antecedência são salvas e voltam após recarregar', async ({ page }) => {
  await seed(page, withSubs([]));
  await openProfileScreen(page, 'Notificações');
  await expect(page.locator('#notif-section')).toContainText('Os avisos chegam quando o app está aberto.');
  await expect(page.locator('#set-enabled')).toBeChecked();

  await page.locator('#set-today').uncheck();
  await page.locator('#set-overdue').uncheck();
  await pickOption(page, 'advance', '3 dias antes');
  expect((await readStorage(page)).settings).toEqual({ enabled: true, notifyToday: false, notifyOverdue: false, advanceDays: 3 });

  await page.reload();
  await openProfileScreen(page, 'Notificações');
  await expect(page.locator('#set-today')).not.toBeChecked();
  await expect(page.locator('#set-advance')).toContainText('3 dias antes');

  await page.locator('#set-enabled').uncheck();
  await expect(page.locator('#set-today')).toBeDisabled();
  await expect(page.locator('#set-advance')).toBeDisabled();
  await page.locator('#set-enabled').check();
  await page.locator('#set-advance').click();
  await expect(page.getByRole('dialog', { name: 'Antecedência' }).getByRole('radio')).toHaveText([/^Não avisar antes/, /^1 dia antes/, /^3 dias antes/, /^7 dias antes/]);
});

test('as preferências entram no backup exportado', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { settings: { enabled: true, notifyToday: true, notifyOverdue: false, advanceDays: 7 } }));
  await openProfileScreen(page, 'Dados e privacidade');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar', exact: true }).click()]);
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(exported.settings).toEqual({ enabled: true, notifyToday: true, notifyOverdue: false, advanceDays: 7 });
});

test.describe('permissão bloqueada', () => {
  test.use({ notifPermission: 'denied' });

  test('explica como reativar nas configurações do navegador', async ({ page }) => {
    await seed(page, withSubs([]));
    await openProfileScreen(page, 'Notificações');
    await expect(page.locator('#notif-status')).toContainText('Bloqueadas no navegador');
    await expect(page.locator('#notif-status')).toContainText('configurações do site');
  });
});

test.describe('iPhone fora da Tela de Início', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test('avisa para instalar o app', async ({ page }) => {
    await seed(page, withSubs([]));
    await openProfileScreen(page, 'Notificações');
    await expect(page.locator('#notif-ios-hint')).toContainText('instale o app. Veja como em Sobre.');
  });
});

test('fora do iPhone, o aviso de instalar não aparece', async ({ page }) => {
  await seed(page, withSubs([]));
  await openProfileScreen(page, 'Notificações');
  await expect(page.locator('#notif-ios-hint')).toHaveCount(0);
});

test('Notificações: três blocos e a frase sobre o app aberto aparece uma vez', async ({ page }) => {
  await seed(page, withSubs([]));
  await openProfileScreen(page, 'Notificações');
  await expect(page.locator('.section-heading')).toHaveText(['Navegador', 'Avisos', 'Quando avisar']);
  await expect(page.getByText('Os avisos chegam quando o app está aberto.')).toHaveCount(1);
});

test.describe('permissão ainda não pedida', () => {
  test.use({ notifPermission: 'default' });

  test('Ativar na tela Notificações pede a permissão', async ({ page }) => {
    await seed(page, withSubs([]));
    await openProfileScreen(page, 'Notificações');
    await expect(page.locator('#notif-status')).toHaveText('Ainda não pedidas.');
    await page.locator('#notif-btn').click();
    await expect(page.locator('#notif-status')).toHaveText('Ativadas no navegador.');
    await expect(page.locator('#notif-btn')).toHaveCount(0);
  });
});
