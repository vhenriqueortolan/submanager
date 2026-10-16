import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upcomingStatus, pendingDue, describe } from './notifications.js';
import { DEFAULT_SETTINGS, ADVANCE_OPTIONS, normalizeSettings } from './settings.js';
import { normalize, parseImport, defaultState } from './storage.js';

const day = (y, m, d) => new Date(y, m - 1, d);
const base = { id: 'x', name: 'Serviço', price: 40, paymentMethod: 'Pix', createdAt: '2026-10-01', paidCycle: '', lastNotified: '' };
const monthly = (dueDate, extra = {}) => ({ ...base, dueDate: String(dueDate), ...extra });

// ---------- upcomingStatus ----------
test('vence amanhã: antecedência de 1 dia avisa', () => {
  const st = upcomingStatus(monthly(16), day(2026, 10, 15), 1);
  assert.deepEqual(st, { type: 'upcoming', days: 1, cycle: '2026-10' });
});

test('vence daqui a 7 dias entra com antecedência 7; daqui a 8 não', () => {
  assert.equal(upcomingStatus(monthly(22), day(2026, 10, 15), 7).days, 7);
  assert.equal(upcomingStatus(monthly(23), day(2026, 10, 15), 7), null);
});

test('antecedência menor que a distância não avisa', () => {
  assert.equal(upcomingStatus(monthly(18), day(2026, 10, 15), 1), null);
  assert.equal(upcomingStatus(monthly(18), day(2026, 10, 15), 3).days, 3);
});

test('hoje não é antecedência', () => {
  assert.equal(upcomingStatus(monthly(15), day(2026, 10, 15), 7), null);
});

test('antecedência 0 desliga', () => {
  assert.equal(upcomingStatus(monthly(16), day(2026, 10, 15), 0), null);
});

test('virada de mês e de ano', () => {
  const m = upcomingStatus(monthly(2), day(2026, 10, 30), 7);
  assert.equal(m.days, 3);
  assert.equal(m.cycle, '2026-11');
  const y = upcomingStatus(monthly(3), day(2026, 12, 29), 7);
  assert.equal(y.days, 5);
  assert.equal(y.cycle, '2027-01');
});

test('anual e semanal', () => {
  const yearly = { ...base, cycle: 'yearly', dueDate: '20', dueMonth: '10' };
  assert.deepEqual(upcomingStatus(yearly, day(2026, 10, 17), 3), { type: 'upcoming', days: 3, cycle: '2026' });
  const weekly = { ...base, cycle: 'weekly', dueWeekday: '5' }; // sexta
  assert.deepEqual(upcomingStatus(weekly, day(2026, 10, 15), 1), { type: 'upcoming', days: 1, cycle: '2026-10-16' });
});

test('sem vencimento válido, nada', () => {
  assert.equal(upcomingStatus({ ...base, dueDate: '' }, day(2026, 10, 15), 7), null);
});

test('upcomingStatus não altera dueStatus (função separada)', async () => {
  const { dueStatus } = await import('./dates.js');
  assert.equal(dueStatus(monthly(16), day(2026, 10, 15)), null);
});

// ---------- pendingDue com preferências ----------
const now = day(2026, 10, 15);
const subs = () => [
  monthly(15, { id: 'hoje', name: 'Hoje' }),
  monthly(12, { id: 'atrasada', name: 'Atrasada' }),
  monthly(16, { id: 'amanha', name: 'Amanhã' }),
];
const ids = (list) => list.map((p) => `${p.sub.id}:${p.st.type}`);

test('padrão (antecedência 0): só hoje e atrasadas, como antes', () => {
  assert.deepEqual(ids(pendingDue(subs(), now)), ['hoje:today', 'atrasada:overdue']);
  assert.deepEqual(ids(pendingDue(subs(), now, DEFAULT_SETTINGS)), ['hoje:today', 'atrasada:overdue']);
});

test('"Receber avisos" desligado silencia tudo', () => {
  assert.deepEqual(pendingDue(subs(), now, { ...DEFAULT_SETTINGS, enabled: false, advanceDays: 7 }), []);
});

test('"Avisar no dia" desligado', () => {
  assert.deepEqual(ids(pendingDue(subs(), now, { ...DEFAULT_SETTINGS, notifyToday: false })), ['atrasada:overdue']);
});

test('"Avisar atrasadas" desligado', () => {
  assert.deepEqual(ids(pendingDue(subs(), now, { ...DEFAULT_SETTINGS, notifyOverdue: false })), ['hoje:today']);
});

test('antecedência de 1 dia notifica no dia anterior', () => {
  const s = { ...DEFAULT_SETTINGS, advanceDays: 1 };
  assert.deepEqual(ids(pendingDue(subs(), now, s)), ['hoje:today', 'atrasada:overdue', 'amanha:upcoming']);
  assert.deepEqual(ids(pendingDue(subs(), day(2026, 10, 14), s)).filter((x) => x.startsWith('hoje')), ['hoje:upcoming']);
});

test('sem duplicar: já avisada hoje, não avisa de novo', () => {
  const s = { ...DEFAULT_SETTINGS, advanceDays: 1 };
  const list = subs().map((x) => ({ ...x, lastNotified: '2026-10-15' }));
  assert.deepEqual(pendingDue(list, now, s), []);
});

test('atrasada com próxima cobrança em breve gera um único aviso (o de atraso)', () => {
  const weekly = { ...base, id: 'w', cycle: 'weekly', dueWeekday: '3' }; // quarta; hoje é quinta
  const out = pendingDue([weekly], now, { ...DEFAULT_SETTINGS, advanceDays: 7 });
  assert.deepEqual(ids(out), ['w:overdue']);
});

test('"Avisar no dia" desligado não troca o aviso do dia por antecedência', () => {
  const out = pendingDue([monthly(15)], now, { ...DEFAULT_SETTINGS, notifyToday: false, advanceDays: 7 });
  assert.deepEqual(out, []);
});

test('texto do aviso de antecedência', () => {
  const [tomorrow] = pendingDue([monthly(16, { name: 'Netflix' })], now, { ...DEFAULT_SETTINGS, advanceDays: 3 });
  const d = describe(tomorrow.sub, tomorrow.st);
  assert.match(d.title, /Netflix vence amanhã/);
  const [inThree] = pendingDue([monthly(18, { name: 'Netflix' })], now, { ...DEFAULT_SETTINGS, advanceDays: 3 });
  assert.match(describe(inThree.sub, inThree.st).title, /vence em 3 dias/);
});

// ---------- settings no estado ----------
test('padrões e opções de antecedência', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { enabled: true, notifyToday: true, notifyOverdue: true, advanceDays: 0 });
  assert.deepEqual(ADVANCE_OPTIONS, [0, 1, 3, 7]);
  assert.deepEqual(defaultState().settings, DEFAULT_SETTINGS);
});

test('normalizeSettings: valores inválidos voltam ao padrão, parciais completam', () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ advanceDays: 5, enabled: 'sim' }), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ advanceDays: '3', notifyToday: false }), { ...DEFAULT_SETTINGS, advanceDays: 3, notifyToday: false });
});

test('backup antigo (sem settings) carrega com o padrão; backup novo preserva as preferências', () => {
  assert.deepEqual(parseImport(JSON.stringify({ name: 'V', subs: [] })).settings, DEFAULT_SETTINGS);
  const custom = { enabled: false, notifyToday: false, notifyOverdue: true, advanceDays: 7 };
  assert.deepEqual(normalize({ settings: custom }).settings, custom);
});
