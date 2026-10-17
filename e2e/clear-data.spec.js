import { test, expect, seed, withSubs, sampleSubs, STORAGE_KEY, openProfileScreen } from './fixtures.js';


async function openClearDialog(page) {
  await openProfileScreen(page, 'Dados e privacidade');
  await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
  return page.getByRole('alertdialog');
}

test('sem digitar APAGAR, o botão não apaga', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const dialog = await openClearDialog(page);
  const confirm = dialog.getByRole('button', { name: 'Apagar tudo' });

  await expect(dialog).toContainText('Não dá para desfazer');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Digite APAGAR/).fill('apagar'); // minúsculas não valem
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Digite APAGAR/).fill('APAGA');
  await expect(confirm).toBeDisabled();

  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  expect(JSON.parse(raw).subs).toHaveLength(4);
});

test('foco inicial em "Cancelar" e Esc fecha sem apagar', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const dialog = await openClearDialog(page);
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).not.toBeNull();
});

test('digitando APAGAR: apaga, volta ao onboarding e recarregar mantém vazio', async ({ page }) => {
  await seed(page, withSubs(sampleSubs(), { people: [{ id: 'p', name: 'Ana' }] }));
  await page.evaluate((k) => {
    localStorage.setItem(`${k}:corrupt-backup`, '{quebrado');
    localStorage.setItem('subDataV4', '{}');
    localStorage.setItem('outra-chave', 'fica');
  }, STORAGE_KEY);

  const dialog = await openClearDialog(page);
  await dialog.getByLabel(/Digite APAGAR/).fill('APAGAR');
  await dialog.getByRole('button', { name: 'Apagar tudo' }).click();

  await expect(page.locator('#onboarding-fs')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Todos os dados foram apagados.');

  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toEqual(['outra-chave']);

  // A tela de Dados foi desmontada pelo reset; espera o histórico terminar de voltar antes de recarregar.
  await page.waitForFunction(() => !history.state?.screen);
  await page.reload();
  await expect(page.locator('#onboarding-fs')).toBeVisible();
  // O app regrava só o estado vazio padrão; nada dos dados antigos volta.
  const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), STORAGE_KEY);
  expect(after).toMatchObject({ onboarded: false, name: '', subs: [], people: [] });
  expect(await page.evaluate(() => localStorage.getItem('subDataV4'))).toBeNull();
});

test('depois de apagar dá para começar de novo', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const dialog = await openClearDialog(page);
  await dialog.getByLabel(/Digite APAGAR/).fill('APAGAR');
  await dialog.getByRole('button', { name: 'Apagar tudo' }).click();
  await page.getByRole('button', { name: 'Pular por enquanto' }).click();
  await expect(page.locator('#hero-empty')).toBeVisible();
  await expect(page.locator('#subs-section')).toHaveCount(0);
});

test('"Exportar backup antes" baixa o arquivo e mantém o diálogo aberto', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const dialog = await openClearDialog(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Exportar backup antes' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^submanager-backup-/);
  await expect(page.getByRole('alertdialog')).toBeVisible();
});

test('Perfil explica o que fica e o que sai do aparelho', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await openProfileScreen(page, 'Dados e privacidade');
  const data = page.locator('#data-section');
  await expect(data).toContainText('configurações do navegador');
  await expect(data).toContainText('backups que você já baixou');
  const privacy = page.locator('#privacy-section');
  await expect(privacy).toContainText('assinaturas, pessoas, pagamentos e preferências');
  await expect(privacy).toContainText('apenas o que você escrever no formulário de feedback');
  await expect(privacy).toContainText('Excluir respostas do formulário');
});
