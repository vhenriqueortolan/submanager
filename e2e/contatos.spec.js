import { test, expect, seed, withSubs, readStorage, openProfileScreen } from './fixtures.js';

const people = [{ id: 'p1', name: 'Ana' }];
const section = (page) => page.locator('#people-section');
const openAdd = async (page) => {
  await openProfileScreen(page, 'Orçamento');
  await page.locator('#divisao-add').click();
};

const VCF = [
  'BEGIN:VCARD', 'VERSION:3.0', 'FN:Bruno Lima', 'TEL;TYPE=CELL:+55 11 91234-5678', 'EMAIL:bruno@exemplo.com', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'FN:Carla', 'TEL:912 345 678', 'END:VCARD',
  'BEGIN:VCARD', 'VERSION:3.0', 'FN:ana', 'END:VCARD', // repetida de Ana
  'BEGIN:VCARD', 'VERSION:3.0', 'TEL:11 90000-0000', 'END:VCARD', // sem nome
].join('\r\n');

test('digitar: só o nome é obrigatório; telefone e e-mail opcionais salvam normalizados', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openAdd(page);
  const sheet = page.getByRole('dialog', { name: 'Adicionar pessoa' });
  await expect(sheet.getByLabel('País do telefone')).toHaveValue('BR');
  await page.fill('#person-name', 'Bruno');
  await page.fill('#person-phone', '(11) 91234-5678');
  await page.fill('#person-email', 'bruno@exemplo.com');
  await sheet.getByRole('button', { name: 'Pronto' }).click();
  const saved = (await readStorage(page)).people.find((p) => p.name === 'Bruno');
  expect(saved).toMatchObject({ phone: '+5511912345678', phoneCountry: 'BR', email: 'bruno@exemplo.com' });
  await expect(section(page)).toContainText('+5511912345678');

  // Pessoa só com nome continua valendo.
  await page.locator('#divisao-add').click();
  await page.fill('#person-name', 'Dora');
  await page.press('#person-name', 'Enter');
  expect((await readStorage(page)).people.find((p) => p.name === 'Dora')).toEqual({ id: expect.any(String), name: 'Dora' });
});

test('número com + muda o país sugerido; telefone inválido bloqueia o Pronto', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openAdd(page);
  const sheet = page.getByRole('dialog', { name: 'Adicionar pessoa' });
  await page.fill('#person-name', 'Rui');
  await page.fill('#person-phone', '+351 912 345 678');
  await expect(sheet.getByLabel('País do telefone')).toHaveValue('PT');
  await page.fill('#person-phone', '+1 202 555 0100');
  await expect(sheet.getByLabel('País do telefone')).toHaveValue('US');
  await expect(sheet).toContainText('+1 é de vários países');
  await page.fill('#person-phone', '123');
  await expect(sheet.getByRole('button', { name: 'Pronto' })).toBeDisabled();
  await page.fill('#person-phone', '');
  await expect(sheet.getByRole('button', { name: 'Pronto' })).toBeEnabled();
});

test('tocar numa pessoa edita nome e contato na mesma folha', async ({ page }) => {
  await seed(page, withSubs([], { people: [{ id: 'p1', name: 'Ana', phone: '+5511912345678', phoneCountry: 'BR' }] }));
  await openProfileScreen(page, 'Orçamento');
  await section(page).getByRole('button', { name: 'Editar Ana' }).click();
  await expect(page.locator('#person-phone')).toHaveValue('+5511912345678');
  await page.fill('#person-phone', '');
  await page.fill('#person-email', 'ana@exemplo.com');
  await page.getByRole('button', { name: 'Pronto' }).click();
  expect((await readStorage(page)).people[0]).toEqual({ id: 'p1', name: 'Ana', email: 'ana@exemplo.com' });
});

test('importar .vcf: tela de revisão com duplicado e sem nome marcados; só os marcados entram', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openAdd(page);
  await page.locator('input[type="file"]').setInputFiles({ name: 'contatos.vcf', mimeType: 'text/vcard', buffer: Buffer.from(VCF) });
  await expect(page.getByRole('dialog', { name: 'Revisar contatos' })).toBeVisible();
  const items = page.locator('.review-item');
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText('Bruno Lima');
  await expect(items.nth(0)).toContainText('+5511912345678');
  await expect(items.nth(1)).toContainText('+55912345678'); // sem +: vale o Brasil
  await expect(items.nth(2)).toContainText('Já existe uma pessoa com esse nome');
  await expect(items.nth(3)).toContainText('Informe um nome');
  await expect(items.nth(2).locator('input')).toBeDisabled();
  await expect(items.nth(3).locator('input')).toBeDisabled();

  await items.nth(1).locator('input').uncheck(); // Carla fica de fora
  await page.getByRole('button', { name: 'Adicionar 1 pessoa' }).click();
  const names = (await readStorage(page)).people.map((p) => p.name);
  expect(names).toEqual(['Ana', 'Bruno Lima']);
});

test('arquivo sem contatos mostra o aviso e não abre a revisão', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openAdd(page);
  await page.locator('input[type="file"]').setInputFiles({ name: 'vazio.vcf', mimeType: 'text/vcard', buffer: Buffer.from('nada aqui') });
  await expect(page.getByRole('alert')).toContainText('Não encontrei contatos');
  await expect(page.getByRole('dialog', { name: 'Revisar contatos' })).toHaveCount(0);
});

test.describe('seletor da agenda (Android)', () => {
  test('sem navigator.contacts: botão escondido e aviso para importar ou digitar', async ({ page }) => {
    await seed(page, withSubs([], { people }));
    await openAdd(page);
    await expect(page.getByRole('button', { name: 'Escolher da agenda' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Adicionar pessoa' })).toContainText('Importe um arquivo .vcf ou digite');
  });

  test('com navigator.contacts simulado: escolhe, revisa e adiciona', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'contacts', {
        configurable: true,
        value: { select: async () => [{ name: ['Eva Souza'], tel: ['+55 21 98888-7777'], email: ['eva@exemplo.com'] }] },
      });
    });
    await seed(page, withSubs([], { people }));
    await openAdd(page);
    await page.getByRole('button', { name: 'Escolher da agenda' }).click();
    const item = page.locator('.review-item');
    await expect(item).toHaveCount(1);
    await expect(item).toContainText('Eva Souza');
    await page.getByRole('button', { name: 'Adicionar 1 pessoa' }).click();
    expect((await readStorage(page)).people.find((p) => p.name === 'Eva Souza')).toMatchObject({ phone: '+5521988887777', phoneCountry: 'BR', email: 'eva@exemplo.com' });
    await expect(section(page)).toContainText('Eva Souza');
  });
});

test('o texto de privacidade da Divisão cita nomes, telefones e e-mails', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openProfileScreen(page, 'Orçamento');
  await expect(section(page)).toContainText('Nomes, telefones e e-mails ficam só neste aparelho.');
});

test('campos da folha de pessoa (nome, país, telefone, e-mail) têm 16px ou mais', async ({ page }) => {
  await seed(page, withSubs([], { people }));
  await openAdd(page);
  await expect(page.locator('#person-email')).toBeVisible();
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ds-sheet input, .ds-sheet select'))
      .filter((el) => !['checkbox', 'radio', 'file', 'hidden'].includes(el.type))
      .map((el) => ({ id: el.id, size: parseFloat(getComputedStyle(el).fontSize) })));
  expect(sizes.map((s) => s.id).sort()).toEqual([expect.any(String), 'person-email', 'person-name', 'person-phone'].sort());
  for (const f of sizes) expect(f.size, `campo ${f.id}`).toBeGreaterThanOrEqual(16);
});
