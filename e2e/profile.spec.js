import { test, expect, seed, withSubs, sampleSubs, openProfileScreen, editText, editTrigger } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });

test('hub mostra as cinco linhas, na ordem, com resumos que batem com os dados', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { people: [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bruno' }] }));
  await tab(page, 'Perfil').click();
  const rows = page.locator('.hub-row');
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(0)).toHaveAccessibleName('Meu perfil. Victor · 2 interesses');
  await expect(rows.nth(1)).toHaveAccessibleName('Orçamento. R$ 500 por mês · dividindo com 2');
  await expect(rows.nth(2)).toHaveAccessibleName('Notificações. Ativas');
  await expect(rows.nth(3)).toHaveAccessibleName('Dados e privacidade. Nenhum backup ainda');
  await expect(rows.nth(4)).toHaveAccessibleName(/^Sobre\. v\d+\.\d+\.\d+ · Enviar feedback$/);
});

test('campos refletem o que está salvo e a edição não salva é descartada', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Meu perfil');
  await expect(page.locator('[data-edit="profile-name"]')).toContainText('Victor');
  await expect(page.locator('#prof-interests .category-pill.active')).toHaveText(['IA', 'Games']);

  await editText(page, 'profile-name', 'Rascunho');
  await page.getByRole('button', { name: 'Voltar' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Descartar alterações?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Descartar' }).click();
  await expect(page.locator('[data-edit="profile-name"]')).toHaveCount(0);

  await page.getByRole('button', { name: /^Meu perfil\./ }).click();
  await expect(page.locator('[data-edit="profile-name"]')).toContainText('Victor');

  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: /^Orçamento\./ }).click();
  await expect(page.locator('[data-edit="budget"]')).toContainText('R$ 500,00');
});

test('salvar mostra toast e sobrevive ao reload', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Meu perfil');
  await editText(page, 'profile-name', 'Victor S');
  await page.locator('#prof-interests [data-val="Dev"]').click();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Perfil salvo com sucesso!');
  await page.getByRole('button', { name: 'Voltar' }).click(); // salvo: não pergunta
  await expect(page.locator('[data-edit="profile-name"]')).toHaveCount(0);

  await page.getByRole('button', { name: /^Orçamento\./ }).click();
  await editText(page, 'budget', '800,50'); // sem botão Salvar: confirmar a folha já salva
  await expect(page.getByRole('status')).toContainText('Perfil salvo com sucesso!');

  await page.reload();
  await openProfileScreen(page, 'Meu perfil');
  await expect(page.locator('[data-edit="profile-name"]')).toContainText('Victor S');
  await expect(page.locator('#prof-interests .category-pill.active')).toHaveText(['IA', 'Cloud & Dev', 'Games']);
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: /^Orçamento\./ }).click();
  await expect(page.locator('[data-edit="budget"]')).toContainText('R$ 800,50');
});

test('Orçamento: valor inválido bloqueia o Pronto e vazio zera o teto', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Orçamento');
  // Valor inválido não chega a virar valor: o Pronto da folha fica bloqueado, com a mensagem de erro.
  await editTrigger(page, 'budget').click();
  const sheet = page.getByRole('dialog', { name: 'Valor máximo por mês' });
  await sheet.getByLabel('Valor máximo').fill('abc');
  await expect(sheet.getByRole('button', { name: 'Pronto' })).toBeDisabled();
  await expect(sheet).toContainText('valor válido');
  await sheet.getByRole('button', { name: 'Cancelar' }).click();
  await expect(sheet).toHaveCount(0);
  await editText(page, 'budget', '');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('button', { name: /^Orçamento\./ })).toHaveAccessibleName('Orçamento. Sem valor definido');
});

test('Sobre mostra a versão do app', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Sobre');
  await expect(page.locator('#app-version')).toHaveText(/^\d+\.\d+\.\d+$/);
});

test.describe('instalação no iPhone', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test('mostra as instruções de Tela de Início', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await openProfileScreen(page, 'Sobre');
    const section = page.locator('#install-section');
    await expect(section).toContainText('Adicionar à Tela de Início');
    await expect(section).toContainText('No iPhone, os avisos só funcionam com o app instalado.');
  });
});

test('botão de feedback abre o formulário com versão e plataforma', async ({ page }, testInfo) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Sobre');
  const link = page.getByRole('link', { name: 'Enviar feedback' });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  const url = new URL(await link.getAttribute('href'));
  expect(url.hostname).toBe('docs.google.com');
  expect(url.searchParams.get('usp')).toBe('pp_url');
  expect(url.searchParams.get('entry.999524458')).toMatch(/^\d+\.\d+\.\d+$/);
  expect(url.searchParams.get('entry.204667521')).toBe(testInfo.project.name === 'mobile' ? 'Android' : 'Computador');
});
