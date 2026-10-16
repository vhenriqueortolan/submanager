import { test, expect, seed, withSubs, sampleSubs } from './fixtures.js';

const tab = (page, name) => page.locator('.bottom-nav').getByRole('button', { name });

test('campos refletem o que está salvo e rascunhos são descartados', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await tab(page, 'Perfil').click();
  await expect(page.locator('#prof-name')).toHaveValue('Victor');
  await expect(page.locator('#prof-budget')).toHaveValue('500');
  await expect(page.locator('#prof-interests .category-pill.active')).toHaveText(['IA', 'Games']);

  await page.fill('#prof-name', 'Rascunho');
  await tab(page, 'Portfólio').click();
  await tab(page, 'Perfil').click();
  await expect(page.locator('#prof-name')).toHaveValue('Victor');
});

test('salvar mostra toast e sobrevive ao reload', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await tab(page, 'Perfil').click();
  await page.fill('#prof-name', 'Victor S');
  await page.fill('#prof-budget', '800');
  await page.locator('#prof-interests [data-val="Dev"]').click();
  await page.getByRole('button', { name: 'Salvar Configurações' }).click();
  await expect(page.getByRole('status')).toContainText('Perfil salvo com sucesso!');

  await page.reload();
  await tab(page, 'Perfil').click();
  await expect(page.locator('#prof-name')).toHaveValue('Victor S');
  await expect(page.locator('#prof-budget')).toHaveValue('800');
  await expect(page.locator('#prof-interests .category-pill.active')).toHaveText(['IA', 'Cloud & Dev', 'Games']);
});

test('Perfil mostra a versão do app', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await tab(page, 'Perfil').click();
  await expect(page.locator('#app-version')).toHaveText(/^\d+\.\d+\.\d+$/);
});

test.describe('instalação no iPhone', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test('mostra as instruções de Tela de Início', async ({ page }) => {
    await seed(page, withSubs(sampleSubs()));
    await tab(page, 'Perfil').click();
    const section = page.locator('#install-section');
    await expect(section).toContainText('Adicionar à Tela de Início');
    await expect(section).toContainText('No iPhone, os avisos só funcionam com o app instalado.');
  });
});

test('botão de feedback abre o formulário com versão e plataforma', async ({ page }, testInfo) => {
  await seed(page, withSubs(sampleSubs()));
  await tab(page, 'Perfil').click();
  const link = page.getByRole('link', { name: 'Enviar feedback' });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  const url = new URL(await link.getAttribute('href'));
  expect(url.hostname).toBe('docs.google.com');
  expect(url.searchParams.get('usp')).toBe('pp_url');
  expect(url.searchParams.get('entry.999524458')).toMatch(/^\d+\.\d+\.\d+$/);
  expect(url.searchParams.get('entry.204667521')).toBe(testInfo.project.name === 'mobile' ? 'Android' : 'Computador');
});
