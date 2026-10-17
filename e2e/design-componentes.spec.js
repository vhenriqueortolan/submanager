import { test, expect, seed, withSubs } from './fixtures.js';

// Catálogo vivo dos componentes base (src/design/Catalog.jsx), que só existe no build de e2e.
async function openCatalog(page) {
  await seed(page, withSubs([]));
  await page.getByRole('button', { name: 'Abrir catálogo' }).click();
  await expect(page.getByRole('dialog', { name: 'Catálogo' })).toBeVisible();
}

test('herói editável tem nome acessível com o valor e avisa quando está vazio', async ({ page }) => {
  await openCatalog(page);
  await expect(page.getByRole('button', { name: 'Serviço: Netflix. Editar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Valor: vazio. Editar' })).toContainText('R$ 0,00');
});

test('editor de texto: Pronto salva, Cancelar descarta, valor vazio bloqueia o Pronto', async ({ page }) => {
  await openCatalog(page);
  const hero = (nome) => page.getByRole('button', { name: `Serviço: ${nome}. Editar` });
  await hero('Netflix').click();
  const sheet = page.getByRole('dialog', { name: 'Nome do serviço' });
  await expect(sheet.getByLabel('Serviço')).toHaveValue('Netflix');
  await expect(sheet.getByLabel('Serviço')).toBeFocused();

  await sheet.getByLabel('Serviço').fill('');
  await expect(sheet.getByRole('button', { name: 'Pronto' })).toBeDisabled();
  await expect(sheet).toContainText('Informe o nome do serviço');

  await sheet.getByLabel('Serviço').fill('Disney+');
  await sheet.getByRole('button', { name: 'Cancelar' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(hero('Netflix')).toBeVisible();

  await hero('Netflix').click();
  await page.getByLabel('Serviço', { exact: true }).fill('Disney+');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Nome do serviço' })).toHaveCount(0);
  await expect(hero('Disney+')).toBeVisible();
  await expect(hero('Disney+')).toBeFocused(); // o foco volta a quem abriu
});

test('editor: Esc e o ← do sistema fecham só a folha, sem salvar', async ({ page }) => {
  await openCatalog(page);
  const sheet = page.getByRole('dialog', { name: 'Nome do serviço' });
  await page.getByRole('button', { name: 'Serviço: Netflix. Editar' }).click();
  await page.getByLabel('Serviço', { exact: true }).fill('X');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Catálogo' })).toBeVisible();

  await page.getByRole('button', { name: 'Serviço: Netflix. Editar' }).click();
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Catálogo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Serviço: Netflix. Editar' })).toBeVisible();
});

test('editor de valor tem prefixo R$ e guarda o texto digitado; linha abre a lista e escolher fecha', async ({ page }) => {
  await openCatalog(page);
  await page.getByRole('button', { name: 'Valor: vazio. Editar' }).click();
  const sheet = page.getByRole('dialog', { name: 'Valor por mês' });
  await expect(sheet.locator('.ds-input-prefix')).toHaveText('R$');
  await sheet.getByLabel('Valor cobrado').fill('44,90');
  await sheet.getByRole('button', { name: 'Pronto' }).click();
  await expect(page.getByRole('button', { name: 'Valor: R$ 44,90. Editar' })).toBeVisible();

  await page.getByRole('button', { name: /^Cobrança Mensal/ }).click();
  const lista = page.getByRole('dialog', { name: 'Cobrança' });
  await lista.getByRole('radio', { name: 'Semanal' }).click();
  await expect(lista).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Cobrança Semanal/ })).toBeVisible();
});

test('linha de configuração: a variante com switch alterna', async ({ page }) => {
  await openCatalog(page);
  const sw = page.getByRole('switch', { name: 'Cobrança automática' });
  await expect(sw).toBeChecked();
  await sw.click();
  await expect(sw).not.toBeChecked();
});

test('lista de opções: escolha única com marca e estado acessível', async ({ page }) => {
  await openCatalog(page);
  const group = page.getByRole('radiogroup', { name: 'Ciclo de cobrança' });
  await expect(group.getByRole('radio', { name: 'Mensal' })).toBeChecked();
  await group.getByRole('radio', { name: /^Anual/ }).click();
  await expect(group.getByRole('radio', { name: /^Anual/ })).toBeChecked();
  await expect(group.getByRole('radio', { name: 'Mensal' })).not.toBeChecked();
});

test('chip alterna aria-pressed e badges de status sempre trazem texto', async ({ page }) => {
  await openCatalog(page);
  const chip = page.getByRole('button', { name: 'Streaming' });
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  for (const texto of ['Automática', 'Estimada', 'Atrasada', 'Pausada', 'Cancelada']) {
    await expect(page.locator('.ds-status', { hasText: texto }).first()).toBeVisible();
  }
});

test('campo liga rótulo e ajuda, com prefixo R$ e fonte de 16px ou mais', async ({ page }) => {
  await openCatalog(page);
  const field = page.getByLabel('Valor mensal');
  await expect(field).toHaveValue('39,90');
  await expect(field).toHaveAccessibleDescription('Por mês, em reais.');
  await expect(page.locator('.ds-input-prefix')).toHaveText('R$');
  const size = await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(16);
});

test('banner de alerta usa role alert e a oferta é uma região nomeada', async ({ page }) => {
  await openCatalog(page);
  await expect(page.getByRole('alert', { name: 'Orçamento excedido' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Faça um backup' })).toBeVisible();
});

test('botões e linhas têm alvo de toque de 44px no mínimo; link de botão ocupa a largura toda', async ({ page }) => {
  await openCatalog(page);
  const boxes = await page.evaluate(() =>
    ['.ds-btn:not(.ds-btn-sm)', '.ds-row', '.ds-option', '.ds-chip'].map((sel) => {
      const el = document.querySelector(sel);
      return { sel, h: el.getBoundingClientRect().height };
    }),
  );
  for (const b of boxes) expect(b.h, b.sel).toBeGreaterThanOrEqual(44);
  const link = page.getByRole('link', { name: 'Link' });
  const [linkW, btnW] = await Promise.all([
    link.evaluate((el) => el.getBoundingClientRect().width),
    page.getByRole('button', { name: 'Primário' }).evaluate((el) => el.getBoundingClientRect().width),
  ]);
  expect(Math.abs(linkW - btnW)).toBeLessThan(1);
});

test('campos do catálogo têm alvo de 52px e estado vazio mostra título e ação', async ({ page }) => {
  await openCatalog(page);
  const h = await page.getByLabel('Valor mensal').evaluate((el) => el.getBoundingClientRect().height);
  expect(h).toBeGreaterThanOrEqual(52);
  await expect(page.getByRole('heading', { name: 'Nada por aqui' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cadastrar', exact: true })).toBeVisible();
});
