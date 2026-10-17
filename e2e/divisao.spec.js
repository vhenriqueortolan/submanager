import { test, expect, seed, withSubs, sampleSubs, readStorage, openProfileScreen } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });
const people = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bruno' }];
const section = (page) => page.locator('#people-section');

function sharedState() {
  const subs = sampleSubs().map((s) => (s.id === 'hoje' ? { ...s, sharedWith: ['p1', 'p2'] } : s.id === 'futura' ? { ...s, sharedWith: ['p1'] } : s));
  return withSubs(subs, { people, budget: 500 });
}

test('lista mostra quantas assinaturas são divididas com cada pessoa', async ({ page }) => {
  await seed(page, sharedState());
  await openProfileScreen(page, 'Orçamento');
  const items = section(page).locator('li');
  await expect(items.nth(0)).toContainText('Ana');
  await expect(items.nth(0)).toContainText('Divide 2 assinaturas');
  await expect(items.nth(1)).toContainText('Divide 1 assinatura');
});

test('adicionar pessoa (botão e Enter) aplica na hora e aparece em "Dividido com" no cadastro', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openProfileScreen(page, 'Orçamento');
  // Sprint 6: "Adicionar pessoa" abre a folha (nome, país, telefone, e-mail); Pronto ou Enter salvam.
  await page.locator('#divisao-add').click();
  await page.fill('#person-name', '  Carla ');
  await page.getByRole('button', { name: 'Pronto' }).click();
  await page.locator('#divisao-add').click();
  await page.fill('#person-name', 'Davi');
  await page.press('#person-name', 'Enter');
  await expect(section(page)).toContainText('Carla');
  await expect(section(page)).toContainText('Davi');
  expect((await readStorage(page)).people.map((p) => p.name)).toEqual(['Ana', 'Bruno', 'Carla', 'Davi']);

  await page.getByRole('button', { name: 'Voltar' }).click(); // nada para salvar: não pergunta
  await tab(page, 'Portfólio').click();
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await expect(page.locator('#shared-with').getByRole('button', { name: 'Carla' })).toBeVisible();
  await expect(page.locator('#shared-with').getByRole('button', { name: 'Davi' })).toBeVisible();
});

test('nome repetido ao adicionar é bloqueado', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openProfileScreen(page, 'Orçamento');
  await page.locator('#divisao-add').click();
  await page.fill('#person-name', 'ana');
  const sheet = page.getByRole('dialog', { name: 'Adicionar pessoa' });
  await expect(sheet).toContainText('Já existe uma pessoa com esse nome');
  await expect(sheet.getByRole('button', { name: 'Pronto' })).toBeDisabled();
  await page.press('#person-name', 'Enter'); // Enter também não salva enquanto há erro
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Cancelar' }).click();
  expect((await readStorage(page)).people).toHaveLength(2);
});

test('renomear reflete nas assinaturas divididas', async ({ page }) => {
  await seed(page, sharedState());
  await openProfileScreen(page, 'Orçamento');
  await section(page).getByRole('button', { name: 'Editar Ana' }).click();
  await page.fill('#person-name', 'Ana Paula');
  await page.press('#person-name', 'Enter');
  await expect(section(page).locator('li').first()).toContainText('Ana Paula');
  await expect(section(page).locator('li').first()).toContainText('Divide 2 assinaturas');

  const st = await readStorage(page);
  expect(st.people[0]).toEqual({ id: 'p1', name: 'Ana Paula' });
  expect(st.subs.find((s) => s.id === 'hoje').sharedWith).toEqual(['p1', 'p2']);

  await page.getByRole('button', { name: 'Voltar' }).click();
  await tab(page, 'Portfólio').click();
  await page.locator('.sub-card', { hasText: 'HojeApp' }).click();
  await expect(page.locator('#shared-with').getByRole('button', { name: 'Ana Paula' })).toHaveAttribute('aria-pressed', 'true');
});

test('renomear para nome de outra pessoa é bloqueado e Cancelar mantém o nome', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openProfileScreen(page, 'Orçamento');
  await section(page).getByRole('button', { name: 'Editar Ana' }).click();
  const sheet = page.getByRole('dialog', { name: 'Editar pessoa' });
  await page.fill('#person-name', 'BRUNO');
  await expect(sheet).toContainText('Já existe uma pessoa com esse nome');
  await expect(sheet.getByRole('button', { name: 'Pronto' })).toBeDisabled();
  await sheet.getByRole('button', { name: 'Cancelar' }).click();
  expect((await readStorage(page)).people.map((p) => p.name)).toEqual(['Ana', 'Bruno']);
});

test('remover recalcula "Sua parte" no Início', async ({ page }) => {
  await seed(page, sharedState());
  await tab(page, 'Portfólio').click();
  const card = page.locator('.sub-card', { hasText: 'FuturaApp' });
  await expect(card).toContainText('Sua parte R$ 25,00'); // 50 ÷ 2

  await openProfileScreen(page, 'Orçamento');
  await section(page).getByRole('button', { name: 'Remover Ana' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await tab(page, 'Portfólio').click();
  await expect(page.locator('.sub-card', { hasText: 'FuturaApp' })).not.toContainText('Sua parte');
});
