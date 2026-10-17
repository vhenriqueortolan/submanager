import { test as base, expect } from '@playwright/test';
import { browserToday } from './timezone.js';

export const STORAGE_KEY = 'subDataV5';

/** Resposta falsa da busca global (o teste nunca depende da internet). */
const CLEARBIT_FIXTURE = [{ name: 'Acme Cloud', domain: 'acme.example' }];

// Registra qualquer notificação disparada, seja por `new Notification` ou por registration.showNotification.
const notificationStub = (permission) => `
  (() => {
    const key = '__notifs';
    window.__notifs = JSON.parse(sessionStorage.getItem(key) || '[]');
    const rec = (title, opts) => { window.__notifs.push({ title, body: opts && opts.body }); sessionStorage.setItem(key, JSON.stringify(window.__notifs)); };
    function Fake(title, opts) { rec(title, opts); }
    Fake.permission = ${JSON.stringify(permission)};
    Fake.requestPermission = () => { Fake.permission = 'granted'; return Promise.resolve('granted'); };
    window.Notification = Fake;
    if (window.ServiceWorkerRegistration) {
      ServiceWorkerRegistration.prototype.showNotification = function (t, o) { rec(t, o); return Promise.resolve(); };
    }
  })();
`;

export const test = base.extend({
  /** 'granted' | 'default' | 'denied' — use com test.use({ notifPermission: 'default' }) */
  notifPermission: ['granted', { option: true }],

  page: async ({ page, notifPermission }, use) => {
    await page.addInitScript(notificationStub(notifPermission));

    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (['localhost', '127.0.0.1'].includes(url.hostname)) {
        // Script do Vercel Analytics não existe fora da Vercel: responde vazio.
        if (url.pathname.startsWith('/_vercel/')) {
          return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
        }
        return route.continue();
      }
      if (url.hostname === 'autocomplete.clearbit.com') {
        if (url.searchParams.get('query')?.includes('falha')) return route.abort();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(CLEARBIT_FIXTURE),
        });
      }
      return route.abort(); // logos (icon.horse / ui-avatars) e qualquer outra rede
    });

    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await use(page);
    expect(errors, 'erros JS não tratados na página').toEqual([]);
  },
});

export { expect };

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Grava o estado no localStorage e recarrega (o app lê o storage ao montar). */
export async function seed(page, state) {
  await page.goto('/');
  await page.evaluate(([key, s]) => localStorage.setItem(key, JSON.stringify(s)), [STORAGE_KEY, state]);
  await page.reload();
}

export const readStorage = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);

export const readNotifs = (page) => page.evaluate(() => window.__notifs || []);

/** Assinaturas de exemplo relativas a hoje: vence hoje, atrasada, paga e futura. */
export function sampleSubs(now = new Date()) {
  const t = browserToday(now);
  const yesterday = new Date(t); yesterday.setDate(t.getDate() - 1);
  const threeMonthsAgo = new Date(t); threeMonthsAgo.setMonth(t.getMonth() - 3);
  const thisCycle = `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
  const otherDay = (t.getDate() % 28) + 1; // nunca igual a hoje
  const base = { domain: '', category: 'IA', price: 50, paymentMethod: 'Pix', paidCycle: '', lastNotified: '' };
  return [
    { ...base, id: 'hoje', name: 'HojeApp', dueDate: String(t.getDate()), createdAt: iso(threeMonthsAgo) },
    { ...base, id: 'atrasada', name: 'AtrasadaApp', dueDate: String(yesterday.getDate()), createdAt: iso(threeMonthsAgo) },
    { ...base, id: 'paga', name: 'PagaApp', dueDate: String(t.getDate()), createdAt: iso(threeMonthsAgo), paidCycle: thisCycle },
    { ...base, id: 'futura', name: 'FuturaApp', dueDate: String(otherDay), createdAt: iso(t) },
  ];
}

export const withSubs = (subs, extra = {}) => ({
  onboarded: true, name: 'Victor', budget: 500, interests: ['IA', 'Games'], subs, ...extra,
});

/** Abre a aba Perfil e entra na tela de detalhe de uma linha do hub ("Meu perfil", "Orçamento", ...). */
export async function openProfileScreen(page, title) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: new RegExp(`^${title}\\.`) }).click();
}

// ---------- formulários (folhas de edição do Design System) ----------
/** Botão (herói ou linha) que abre o editor de um campo: data-edit="name" | "price" | "cycle" | "due-date" ... */
export const editTrigger = (page, key) => page.locator(`[data-edit="${key}"]`);

/** Abre o editor de texto/valor/dia, digita e confirma com Enter; espera a folha fechar. */
export async function editText(page, key, text) {
  await editTrigger(page, key).click();
  const field = page.locator(`#editor-${key}-field`);
  await field.fill(text);
  await field.press('Enter');
  await page.locator('.ds-sheet').waitFor({ state: 'detached' });
}

/** Abre o editor de escolha única e toca na opção (o nome visível, ex.: 'Anual'); espera a folha fechar. */
export async function pickOption(page, key, label) {
  await editTrigger(page, key).click();
  await page.locator('.ds-sheet').getByRole('radio', { name: label, exact: true }).click();
  await page.locator('.ds-sheet').waitFor({ state: 'detached' });
}
