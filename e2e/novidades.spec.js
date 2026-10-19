import { test, expect, seed, withSubs, sampleSubs, readStorage, iso } from './fixtures.js';
import { browserToday } from './timezone.js';

// Dados vêm de NOVIDADES_FIXTURE (fixtures.js): xbox.com ok com 7 itens, spotify.com ok, chess.com de terceiro,
// netflix.com ok sem itens, openai.com com erro, anthropic.com sem feed.
const sub = (domain, name) => ({
  id: `s-${domain || 'manual'}`, name, domain, category: 'IA', price: 50, dueDate: '5', paymentMethod: 'Pix',
  paidCycle: '', lastNotified: '', createdAt: iso(browserToday()),
});
const abrir = async (page, domain, name, extra = {}) => {
  await seed(page, withSubs([sub(domain, name)], extra));
  await page.locator('.sub-card', { hasText: name }).click();
  await expect(page.getByRole('dialog', { name: 'Editar assinatura' })).toBeVisible();
};
const aba = (page, nome) => page.getByRole('tablist', { name: 'Seções da assinatura' }).getByRole('tab', { name: nome, exact: true });
const painel = (page) => page.locator('#novidades');

// Novidades já vistas ficam em chave própria. Antes desta data, as novidades da fixture contam como não lidas.
const VISTAS_KEY = 'subNovidadesVistasV1';
const lerVistas = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), VISTAS_KEY);
const semearVistas = async (page, vistas) => {
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [VISTAS_KEY, vistas]);
  await page.reload();
};
const VISTAS_ANTIGAS = { 'xbox.com': '2026-10-14T12:00:00.000Z', 'spotify.com': '2026-10-08T12:57:31.000Z' }; // Xbox: 2 novas; Spotify: 1 nova

test('serviço com fonte abre em Novidades: 5 itens com data local, fonte oficial e botão Abrir novidade', async ({ page }) => {
  await abrir(page, 'xbox.com', 'Xbox Game Pass');
  await expect(aba(page, 'Novidades')).toHaveAttribute('aria-selected', 'true');
  await expect(painel(page)).toContainText('Fonte oficial');
  const itens = painel(page).locator('.novidade');
  await expect(itens).toHaveCount(5);
  await expect(itens.first()).toContainText('Xbox novidade 1');
  await expect(itens.first()).toContainText('16/10/2026');
  const abrirLink = itens.first().getByRole('link', { name: /Abrir novidade/ });
  await expect(abrirLink).toHaveAttribute('href', /^https:\/\/exemplo\.test\//);
  await expect(abrirLink).toHaveAttribute('target', '_blank');
  await expect(abrirLink).toHaveAttribute('rel', /noopener/);
  await expect(abrirLink).toHaveAttribute('rel', /noreferrer/);
});

test('Mostrar todas expande a lista e Mostrar menos recolhe', async ({ page }) => {
  await abrir(page, 'xbox.com', 'Xbox Game Pass');
  await page.getByRole('button', { name: 'Mostrar todas (7)' }).click();
  await expect(painel(page).locator('.novidade')).toHaveCount(7);
  await page.getByRole('button', { name: 'Mostrar menos' }).click();
  await expect(painel(page).locator('.novidade')).toHaveCount(5);
});

test('serviço com poucos itens não mostra o botão Mostrar todas', async ({ page }) => {
  await abrir(page, 'spotify.com', 'Spotify');
  await expect(painel(page).locator('.novidade')).toHaveCount(2);
  await expect(page.getByRole('button', { name: /Mostrar todas/ })).toHaveCount(0);
});

test('fonte de terceiro mostra o domínio da fonte', async ({ page }) => {
  await abrir(page, 'chess.com', 'Chess.com');
  await expect(painel(page)).toContainText('Fonte de terceiro: rss.exemplo.test');
});

test('estado sem itens', async ({ page }) => {
  await abrir(page, 'netflix.com', 'Netflix');
  await expect(painel(page)).toContainText('Nenhuma novidade recente nesta fonte.');
  await expect(painel(page).locator('.novidade')).toHaveCount(0);
});

test('estado de erro de leitura da fonte', async ({ page }) => {
  await abrir(page, 'openai.com', 'ChatGPT Plus');
  await expect(painel(page)).toContainText('Não foi possível ler a fonte de novidades agora.');
});

test('serviço sem feed: abre em Plano e a subaba Novidades mostra "Sem feed ainda"', async ({ page }) => {
  await abrir(page, 'anthropic.com', 'Claude Pro');
  await expect(aba(page, 'Plano')).toHaveAttribute('aria-selected', 'true');
  await aba(page, 'Novidades').click();
  await expect(painel(page).getByRole('heading', { name: 'Sem feed ainda' })).toBeVisible();
  await expect(painel(page)).toContainText('Ainda não há uma fonte oficial de novidades para este serviço.');
});

test('assinatura manual, sem domínio: abre em Plano e Novidades mostra "Sem feed ainda"', async ({ page }) => {
  await abrir(page, '', 'Meu serviço');
  await expect(aba(page, 'Plano')).toHaveAttribute('aria-selected', 'true');
  await aba(page, 'Novidades').click();
  await expect(painel(page).getByRole('heading', { name: 'Sem feed ainda' })).toBeVisible();
});

test('todos os estados têm o link "Abrir página do serviço" e nenhum preço aparece', async ({ page }) => {
  for (const [domain, name] of [['xbox.com', 'Xbox Game Pass'], ['openai.com', 'ChatGPT Plus'], ['anthropic.com', 'Claude Pro']]) {
    await abrir(page, domain, name);
    await aba(page, 'Novidades').click();
    const link = painel(page).getByRole('link', { name: 'Abrir página do serviço' });
    await expect(link).toHaveAttribute('href', `https://${domain}`);
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(painel(page)).not.toContainText(/R\$|\d+,\d{2}/);
  }
});

test.describe('JSON indisponível', () => {
  test.use({ novidades: 'indisponivel' });
  test('serviço com domínio abre em Novidades com o erro de leitura', async ({ page }) => {
    await abrir(page, 'xbox.com', 'Xbox Game Pass');
    await expect(aba(page, 'Novidades')).toHaveAttribute('aria-selected', 'true');
    await expect(painel(page)).toContainText('Não foi possível ler a fonte de novidades agora.');
  });
});

test('subabas: Tab percorre na ordem visual e ← → movem a seleção', async ({ page }) => {
  await abrir(page, 'xbox.com', 'Xbox Game Pass');
  await aba(page, 'Novidades').focus();
  await page.keyboard.press('ArrowRight');
  await expect(aba(page, 'Plano')).toHaveAttribute('aria-selected', 'true');
  await expect(aba(page, 'Plano')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(aba(page, 'Histórico')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(aba(page, 'Plano')).toHaveAttribute('aria-selected', 'true');
});

test('Plano mantém Divisão, Avisos e Remover Assinatura; Histórico tem a lista de pagamentos', async ({ page }) => {
  await abrir(page, 'anthropic.com', 'Claude Pro');
  await expect(page.locator('#modal-step-2 .ds-section-title')).toHaveText(['Plano', 'Divisão', 'Avisos']);
  await expect(page.getByRole('button', { name: 'Remover Assinatura' })).toBeVisible();
  await aba(page, 'Histórico').click();
  await expect(page.locator('#payment-history')).toContainText('Nenhum pagamento registrado.');
  await expect(page.getByRole('button', { name: 'Remover Assinatura' })).toHaveCount(0);
});

test('nome ou valor alterado no topo mostra Salvar Assinatura mesmo fora da subaba Plano', async ({ page }) => {
  await abrir(page, 'xbox.com', 'Xbox Game Pass');
  await expect(page.getByRole('button', { name: 'Salvar Assinatura' })).toHaveCount(0);
  await page.locator('[data-edit="name"]').click();
  await page.locator('#editor-name-field').fill('Xbox da casa');
  await page.locator('#editor-name-field').press('Enter');
  await page.locator('.ds-sheet').waitFor({ state: 'detached' });
  await expect(page.getByRole('button', { name: 'Salvar Assinatura' })).toBeVisible();
});

test('cadastro novo continua em uma tela só, sem subabas', async ({ page }) => {
  await seed(page, withSubs([]));
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: '+ Inserir Dados Manualmente' }).click();
  await expect(page.locator('#modal-step-2')).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.locator('#modal-step-2 .ds-section-title')).toHaveText(['Plano', 'Divisão', 'Avisos']);
});

// ---------- Home ----------
test('Home: as três subabas aparecem na ordem Assinaturas, Novidades, Histórico', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass')]));
  await expect(page.getByRole('tab')).toHaveText(['Assinaturas', 'Novidades', 'Histórico']);
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await expect(page.locator('#hist-month-total')).toBeVisible();
  await expect(page.locator('#subs-section')).toHaveCount(0);
  await expect(page.locator('#budget-card')).toBeVisible(); // o orçamento continua acima das abas
});

test('Home: com serviços com feed, a subaba Novidades mostra a contagem e até 3 itens, do mais novo ao mais antigo', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass'), sub('spotify.com', 'Spotify'), sub('anthropic.com', 'Claude Pro')]));
  await semearVistas(page, VISTAS_ANTIGAS);
  const tab = page.getByRole('tab', { name: /Novidades/ });
  await expect(tab).toContainText('3');
  await expect(page.getByRole('tab', { name: 'Assinaturas' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#subs-list .sub-card')).toHaveCount(3);
  await tab.click();
  const itens = page.locator('#home-novidades .resumo-item');
  await expect(itens).toHaveCount(3);
  await expect(itens.nth(0)).toContainText('Xbox novidade 1');
  await expect(itens.nth(1)).toContainText('Spotify novidade 1');
  await expect(itens.nth(2)).toContainText('Xbox novidade 2');
  await expect(itens.first()).toContainText('Xbox Game Pass');
  await expect(itens.first()).toContainText('16/10/2026');
  await expect(itens.first()).toHaveAttribute('href', /^https:\/\/exemplo\.test\//);
  await expect(itens.first()).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('#subs-section')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Assinaturas' }).click();
  await expect(page.locator('#subs-section')).toBeVisible();
});

test('Home: sem serviço com feed, a subaba Novidades não existe; Assinaturas e Histórico continuam', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  await expect(page.getByRole('tab')).toHaveText(['Assinaturas', 'Histórico']);
  await expect(page.getByRole('tab', { name: /Novidades/ })).toHaveCount(0);
  await expect(page.locator('#subs-section')).toBeVisible();
});

test('Home: serviço com erro ou sem itens não gera subaba', async ({ page }) => {
  await seed(page, withSubs([sub('openai.com', 'ChatGPT Plus'), sub('netflix.com', 'Netflix'), sub('anthropic.com', 'Claude Pro')]));
  await expect(page.getByRole('tab', { name: /Novidades/ })).toHaveCount(0);
});

test('Home: assinatura pausada não entra no resumo', async ({ page }) => {
  const pausada = { ...sub('xbox.com', 'Xbox Game Pass'), status: 'paused', pauses: [{ from: '2026-10-01', to: '' }] };
  await seed(page, withSubs([pausada, sub('spotify.com', 'Spotify')]));
  await semearVistas(page, { 'spotify.com': '2026-10-01T00:00:00.000Z' });
  await expect(page.getByRole('tab', { name: /Novidades/ })).toContainText('2');
  await page.getByRole('tab', { name: /Novidades/ }).click();
  await expect(page.locator('#home-novidades')).not.toContainText('Xbox novidade');
});

// ---------- Não lidas ----------
test('primeira vez: nada conta como novo e a base das vistas é gravada', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass'), sub('spotify.com', 'Spotify')]));
  await expect(page.getByRole('tab', { name: /Novidades/ })).toBeVisible();
  await expect(page.locator('.ds-tab-count')).toHaveCount(0);
  await expect.poll(() => lerVistas(page)).toMatchObject({ 'xbox.com': '2026-10-16T18:13:02.000Z', 'spotify.com': '2026-10-16T04:00:51.000Z' });
  await page.getByRole('tab', { name: /Novidades/ }).click();
  await expect(page.locator('.novidade-nova')).toHaveCount(0);
});

test('Home: itens novos trazem o rótulo Nova; os já vistos, não', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass'), sub('spotify.com', 'Spotify')]));
  await semearVistas(page, { 'xbox.com': '2026-10-15T15:01:53.000Z', 'spotify.com': '2026-10-08T12:57:31.000Z' }); // Xbox: 1 nova (a 1); Spotify: 1 nova
  await expect(page.getByRole('tab', { name: /Novidades/ })).toContainText('2');
  await page.getByRole('tab', { name: /Novidades/ }).click();
  const itens = page.locator('#home-novidades .resumo-item');
  await expect(itens).toHaveCount(3);
  await expect(itens.nth(0)).toContainText('Nova'); // Xbox novidade 1
  await expect(itens.nth(1)).toContainText('Nova'); // Spotify novidade 1
  await expect(itens.nth(2)).not.toContainText('Nova'); // Xbox novidade 2, já vista
  await expect(itens.nth(0)).toHaveAccessibleName(/^Nova. Xbox Game Pass: Xbox novidade 1/);
});

test('ler no detalhe da assinatura reduz a contagem da Home e continua assim depois de recarregar', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass'), sub('spotify.com', 'Spotify')]));
  await semearVistas(page, VISTAS_ANTIGAS); // Xbox 2 + Spotify 1
  await expect(page.getByRole('tab', { name: /Novidades/ })).toContainText('3');
  await page.locator('.sub-card', { hasText: 'Xbox Game Pass' }).click();
  await expect(painel(page).locator('.novidade-nova')).toHaveCount(2); // as Nova aparecem enquanto a subaba está aberta
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('dialog', { name: 'Editar assinatura' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Novidades/ })).toContainText('1');
  expect((await lerVistas(page))['xbox.com']).toBe('2026-10-16T18:13:02.000Z');
  await page.reload();
  await expect(page.getByRole('tab', { name: /Novidades/ })).toContainText('1');
});

test('lendo todas, a contagem some mas a subaba Novidades continua', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass')]));
  await semearVistas(page, { 'xbox.com': '2026-10-01T00:00:00.000Z' });
  await expect(page.getByRole('tab', { name: /Novidades/ })).toContainText('7');
  await page.locator('.sub-card', { hasText: 'Xbox Game Pass' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('dialog', { name: 'Editar assinatura' })).toHaveCount(0);
  await expect(page.getByRole('tablist', { name: 'Seções do início' }).getByRole('tab', { name: 'Novidades', exact: true })).toBeVisible();
  await expect(page.locator('.ds-tab-count')).toHaveCount(0);
});

test('no detalhe, as marcas Nova somem ao sair da subaba e voltar', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass')]));
  await semearVistas(page, { 'xbox.com': '2026-10-14T12:00:00.000Z' });
  await page.locator('.sub-card', { hasText: 'Xbox Game Pass' }).click();
  await expect(painel(page).locator('.novidade-nova')).toHaveCount(2);
  await aba(page, 'Plano').click();
  await aba(page, 'Novidades').click();
  await expect(painel(page).locator('.novidade-nova')).toHaveCount(0);
});

test('tocar numa novidade da Home marca o serviço como visto até aquela novidade', async ({ page }) => {
  await seed(page, withSubs([sub('xbox.com', 'Xbox Game Pass'), sub('spotify.com', 'Spotify')]));
  await semearVistas(page, VISTAS_ANTIGAS); // 3 não lidas
  await page.getByRole('tab', { name: /Novidades/ }).click();
  const [popup] = await Promise.all([
    page.context().waitForEvent('page'),
    page.locator('#home-novidades .resumo-item', { hasText: 'Spotify novidade 1' }).click(),
  ]);
  await popup.close();
  await expect(page.getByRole('tab', { name: /Novidades/ })).toContainText('2');
  expect((await lerVistas(page))['spotify.com']).toBe('2026-10-16T04:00:51.000Z');
  expect((await lerVistas(page))['xbox.com']).toBe('2026-10-14T12:00:00.000Z');
});

test('serviço com erro ou sem itens não gera contagem nem registro de vistas', async ({ page }) => {
  await seed(page, withSubs([sub('openai.com', 'ChatGPT Plus'), sub('netflix.com', 'Netflix')]));
  await expect.poll(() => lerVistas(page)).not.toBeNull(); // a base dos serviços com itens é gravada
  const vistas = await lerVistas(page);
  expect(vistas).not.toHaveProperty('openai.com');
  expect(vistas).not.toHaveProperty('netflix.com');
  await expect(page.getByRole('tab', { name: /Novidades/ })).toHaveCount(0);
});

// ---------- Pedido de fonte simulado ----------
test('escolher no cadastro um serviço sem feed não envia nada, não grava nada e não diz "enviado"', async ({ page }) => {
  await seed(page, withSubs([], { interests: ['IA'] }));
  const antes = await readStorage(page);
  const pedidos = [];
  page.on('request', (r) => { if (r.method() !== 'GET') pedidos.push(`${r.method()} ${r.url()}`); });
  await page.getByRole('button', { name: '+ Cadastrar assinatura' }).click();
  await page.getByRole('button', { name: 'Claude Pro' }).click();
  await expect(page.locator('#modal-step-2')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Nova assinatura' })).not.toContainText(/enviad|solicitad|pedid/i);
  await expect(page.locator('body')).not.toContainText(/enviad|solicitad|pedid/i);
  expect(pedidos).toEqual([]);
  expect(await readStorage(page)).toEqual(antes);
});
