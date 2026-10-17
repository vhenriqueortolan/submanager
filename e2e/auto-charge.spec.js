import { test, expect, seed, withSubs, sampleSubs, readNotifs, readStorage, iso, editText, pickOption } from './fixtures.js';
import { browserToday } from './timezone.js';

const pad = (n) => String(n).padStart(2, '0');

/** Anuais que venceram há 5 dias: uma automática e uma manual (a manual fica atrasada). */
function yearlySubs() {
  const t = browserToday();
  const due = new Date(t);
  due.setDate(t.getDate() - 5);
  const old = new Date(t);
  old.setFullYear(t.getFullYear() - 2);
  const base = {
    domain: '', category: 'IA', price: 120, paymentMethod: 'Cartão', paidCycle: '', lastNotified: '',
    createdAt: iso(old), cycle: 'yearly', dueDate: String(due.getDate()), dueMonth: String(due.getMonth() + 1),
  };
  return {
    subs: [
      { ...base, id: 'auto', name: 'AutoAnual', autoCharge: true },
      { ...base, id: 'manual', name: 'ManualAnual', paymentMethod: 'Boleto' },
    ],
    label: `${pad(due.getDate())}/${pad(due.getMonth() + 1)}`,
  };
}

test('anual automática não fica atrasada, não tem "Paguei" e mostra "Cobrado em"', async ({ page }) => {
  const { subs, label } = yearlySubs();
  await seed(page, withSubs(subs));

  const auto = page.locator('.sub-card', { hasText: 'AutoAnual' });
  await expect(auto).not.toContainText(/Atrasada/);
  await expect(auto.getByRole('button', { name: /Paguei/ })).toHaveCount(0);
  await expect(auto).toContainText(`Cobrado em ${label}`);

  const manual = page.locator('.sub-card', { hasText: 'ManualAnual' });
  await expect(manual).toContainText(/Atrasada/);
  await expect(manual.getByRole('button', { name: /Paguei/ })).toBeVisible();

  // só a manual gera aviso; a automática não notifica a cada dia
  await expect.poll(async () => (await readNotifs(page)).length).toBe(1);
  expect((await readNotifs(page))[0].title).toBe('ManualAnual está atrasada');
});

test('automática no dia da cobrança: "Cobrado hoje" e aviso informativo', async ({ page }) => {
  const subs = sampleSubs().filter((s) => s.id === 'hoje').map((s) => ({ ...s, autoCharge: true }));
  await seed(page, withSubs(subs));
  const card = page.locator('.sub-card', { hasText: 'HojeApp' });
  await expect(card).toContainText('Cobrado hoje');
  await expect(card).not.toContainText('Vence hoje');
  await expect(card.getByRole('button', { name: /Paguei/ })).toHaveCount(0);
  await expect.poll(async () => (await readNotifs(page)).length).toBe(1);
  expect((await readNotifs(page))[0].title).toBe('HojeApp é cobrada hoje');
});

test('assinatura silenciada não avisa, mas continua nos totais', async ({ page }) => {
  const subs = sampleSubs().map((s) => (s.id === 'hoje' ? { ...s, muted: true } : s));
  await seed(page, withSubs(subs));
  await expect.poll(async () => (await readNotifs(page)).length).toBe(1);
  expect((await readNotifs(page))[0].title).toBe('AtrasadaApp está atrasada');
  await expect(page.locator('#total-month')).toContainText('200,00'); // 4 × R$ 50
});

test('cadastro: Cartão marca a cobrança automática; mexer na opção vale mais que o método', async ({ page }) => {
  await seed(page, withSubs([]));
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await editText(page, 'name', 'Streaming');
  await editText(page, 'price', '30');
  await editText(page, 'due-date', '12');

  await expect(page.locator('#add-auto')).toBeChecked();
  await pickOption(page, 'payment', 'Pix');
  await expect(page.locator('#add-auto')).not.toBeChecked();
  await pickOption(page, 'payment', 'Cartão');
  await expect(page.locator('#add-auto')).toBeChecked();

  await page.locator('#add-auto').uncheck(); // decisão do usuário
  await pickOption(page, 'payment', 'Pix');
  await pickOption(page, 'payment', 'Cartão');
  await expect(page.locator('#add-auto')).not.toBeChecked();

  await page.locator('#add-muted').check();
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  const [sub] = (await readStorage(page)).subs;
  expect(sub).toMatchObject({ name: 'Streaming', paymentMethod: 'Cartão', autoCharge: false, muted: true });
});

test('edição mostra e preserva as opções salvas', async ({ page }) => {
  const [s] = sampleSubs().filter((x) => x.id === 'futura');
  await seed(page, withSubs([{ ...s, autoCharge: true, muted: true }]));
  await page.locator('.sub-card', { hasText: 'FuturaApp' }).click();
  await expect(page.locator('#add-auto')).toBeChecked();
  await expect(page.locator('#add-muted')).toBeChecked();
  await page.locator('#add-muted').uncheck();
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  const [saved] = (await readStorage(page)).subs;
  expect(saved).toMatchObject({ autoCharge: true, muted: false });
});

test('dados antigos (sem os campos) carregam como cobrança manual', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const subs = (await readStorage(page)).subs;
  expect(subs.every((s) => s.autoCharge === false && s.muted === false)).toBe(true);
  await expect(page.locator('.sub-card', { hasText: 'AtrasadaApp' }).getByRole('button', { name: /Paguei/ })).toBeVisible();
});
