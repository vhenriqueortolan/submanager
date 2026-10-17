import { test, expect, seed, withSubs, readStorage, openProfileScreen } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });

async function addSplitNetflix(page) {
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await page.fill('#add-name', 'Netflix');
  await page.fill('#add-price', '39.9');
  await page.fill('#add-due-date', '12');
  await page.fill('#add-person', 'Ana');
  await page.press('#add-person', 'Enter'); // Enter confirma e não salva a assinatura
  await page.fill('#add-person', '  bruno ');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.locator('#add-share-hint')).toContainText('13,30');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
}

test('dividir com 2 pessoas: gasto pessoal R$ 13,30 e total dos serviços R$ 39,90', async ({ page }) => {
  await seed(page, withSubs([], { budget: 100 }));
  await addSplitNetflix(page);

  await expect(page.locator('#total-month')).toContainText('13,30');
  await expect(page.locator('#total-services')).toContainText('Total dos serviços: R$ 39,90');
  const card = page.locator('.sub-card', { hasText: 'Netflix' });
  await expect(card).toContainText('39,90');
  await expect(card).toContainText('Sua parte R$ 13,30');

  const st = await readStorage(page);
  expect(st.people.map((p) => p.name)).toEqual(['Ana', 'bruno']);
  expect(st.subs[0].sharedWith).toHaveLength(2);

  await page.reload();
  await expect(page.locator('#total-month')).toContainText('13,30');
});

test('sem divisão, não mostra o total dos serviços', async ({ page }) => {
  await seed(page, withSubs([]));
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await page.fill('#add-name', 'Solo');
  await page.fill('#add-price', '20');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  await expect(page.locator('#total-month')).toContainText('20,00');
  await expect(page.locator('#total-services')).toHaveCount(0);
});

test('nome repetido reutiliza a pessoa (sem diferenciar maiúsculas)', async ({ page }) => {
  await seed(page, withSubs([], { people: [{ id: 'p1', name: 'Ana' }] }));
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await page.fill('#add-name', 'Spotify');
  await page.fill('#add-person', 'ANA');
  await page.press('#add-person', 'Enter');
  await page.getByRole('button', { name: 'Salvar Assinatura' }).click();
  const st = await readStorage(page);
  expect(st.people).toHaveLength(1);
  expect(st.subs[0].sharedWith).toEqual(['p1']);
});

test('Perfil: remover pessoa pede confirmação e recalcula', async ({ page }) => {
  await seed(page, withSubs([], { budget: 100 }));
  await addSplitNetflix(page);
  await openProfileScreen(page, 'Orçamento');
  const section = page.locator('#people-section');
  await expect(section).toContainText('Ana');

  await section.getByRole('button', { name: 'Remover Ana' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('1 assinatura');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  expect((await readStorage(page)).people).toHaveLength(2);

  await section.getByRole('button', { name: 'Remover Ana' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click();
  await expect(section).not.toContainText('Ana');

  await page.getByRole('button', { name: 'Voltar' }).click();
  await tab(page, 'Portfólio').click();
  await expect(page.locator('#total-month')).toContainText('19,95'); // 39,90 ÷ 2
});

test('pessoa que sumiu do cadastro é ignorada nos cálculos', async ({ page }) => {
  await seed(page, withSubs(
    [{ id: 'x', name: 'Fantasma', domain: '', category: 'IA', price: 30, dueDate: '5', paymentMethod: 'Pix', paidCycle: '', lastNotified: '', createdAt: '2026-01-01', sharedWith: ['inexistente'] }],
  ));
  await expect(page.locator('#total-month')).toContainText('30,00');
  await expect(page.locator('#total-services')).toHaveCount(0);
});
