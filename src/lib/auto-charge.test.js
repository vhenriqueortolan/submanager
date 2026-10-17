import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueStatus, lastCharge } from './dates.js';
import { pendingDue, upcomingStatus, describe } from './notifications.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { monthlyTotal } from './totals.js';
import { normalizeSub } from './storage.js';
import { buildSub, emptyForm, formFromSub } from './subs.js';

const day = (y, m, d) => new Date(y, m - 1, d);
const base = { id: 'x', name: 'Serviço', price: 40, paymentMethod: 'Cartão', createdAt: '2025-01-01', paidCycle: '', lastNotified: '' };
const yearly = (extra = {}) => ({ ...base, cycle: 'yearly', dueDate: '5', dueMonth: '10', ...extra });
const now = day(2026, 10, 15);

// ---------- dueStatus ----------
test('anual automática sem toque não vira atrasada', () => {
  assert.equal(dueStatus(yearly({ autoCharge: true }), now), null); // venceu em 05/10
  assert.equal(dueStatus(yearly(), now).type, 'overdue'); // manual continua como antes
});

test('mensal e semanal automáticas também nunca ficam atrasadas', () => {
  assert.equal(dueStatus({ ...base, dueDate: '3', autoCharge: true }, now), null);
  assert.equal(dueStatus({ ...base, dueDate: '3' }, now).type, 'overdue');
  assert.equal(dueStatus({ ...base, cycle: 'weekly', dueWeekday: '2', autoCharge: true }, now), null);
});

test('automática no dia do vencimento: status informativo "today"', () => {
  const st = dueStatus({ ...base, dueDate: '15', autoCharge: true }, now);
  assert.equal(st.type, 'today');
  assert.equal(st.days, 0);
  assert.equal(st.cycle, '2026-10');
});

test('automática paga ou não, o status do dia é o mesmo (não há "Paguei")', () => {
  assert.equal(dueStatus({ ...base, dueDate: '15', autoCharge: true, paidCycle: '2026-10' }, now).type, 'today');
});

test('automática cadastrada depois do vencimento não tem status', () => {
  assert.equal(dueStatus({ ...base, dueDate: '15', createdAt: '2026-10-16', autoCharge: true }, now), null);
});

// ---------- lastCharge ----------
test('lastCharge: última cobrança desde o cadastro', () => {
  const d = lastCharge(yearly({ autoCharge: true }), now);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getDate(), 5);
  assert.equal(lastCharge({ ...base, dueDate: '3', createdAt: '2026-10-10' }, now), null, 'antes do cadastro');
  assert.equal(lastCharge({ ...base, dueDate: '' }, now), null);
});

// ---------- avisos ----------
test('anual automática sem toque não notifica a cada dia', () => {
  const sub = yearly({ autoCharge: true });
  for (const d of [15, 16, 17, 20]) assert.deepEqual(pendingDue([sub], day(2026, 10, d)), []);
  assert.equal(pendingDue([yearly()], now).length, 1, 'manual notifica');
});

test('automática no dia segue "Avisar no dia"', () => {
  const sub = { ...base, dueDate: '15', autoCharge: true };
  assert.equal(pendingDue([sub], now).length, 1);
  assert.deepEqual(pendingDue([sub], now, { ...DEFAULT_SETTINGS, notifyToday: false }), []);
  assert.deepEqual(pendingDue([sub], now, { ...DEFAULT_SETTINGS, enabled: false }), []);
});

test('automática: aviso de antecedência continua valendo', () => {
  const sub = { ...base, dueDate: '16', createdAt: '2026-10-01', autoCharge: true };
  const out = pendingDue([sub], now, { ...DEFAULT_SETTINGS, advanceDays: 1 });
  assert.equal(out.length, 1);
  assert.equal(out[0].st.type, 'upcoming');
});

test('silenciada não notifica (dia, atraso e antecedência)', () => {
  const settings = { ...DEFAULT_SETTINGS, advanceDays: 7 };
  const muted = (extra) => ({ ...base, createdAt: '2026-10-01', muted: true, ...extra });
  assert.deepEqual(pendingDue([muted({ dueDate: '15' })], now, settings), []);
  assert.deepEqual(pendingDue([muted({ dueDate: '12' })], now, settings), []);
  assert.deepEqual(pendingDue([muted({ dueDate: '17' })], now, settings), []);
  assert.equal(upcomingStatus(muted({ dueDate: '17' }), now, 7), null);
  assert.equal(pendingDue([{ ...muted({ dueDate: '17' }), muted: false }], now, settings).length, 1);
});

test('silenciada continua nos totais', () => {
  assert.equal(monthlyTotal([{ price: 40, muted: true }, { price: 10 }]), 50);
});

test('textos dos avisos de cobrança automática', () => {
  const sub = { ...base, name: 'Netflix', dueDate: '15', autoCharge: true };
  assert.match(describe(sub, { type: 'today', days: 0, cycle: 'k' }).title, /cobrada hoje/);
  assert.match(describe(sub, { type: 'upcoming', days: 1, cycle: 'k' }).title, /será cobrada amanhã/);
  assert.match(describe(sub, { type: 'upcoming', days: 3, cycle: 'k' }).title, /será cobrada em 3 dias/);
  const manual = { ...sub, autoCharge: false };
  assert.match(describe(manual, { type: 'today', days: 0, cycle: 'k' }).title, /vence hoje/);
});

// ---------- modelo ----------
test('assinatura antiga ganha autoCharge e muted falsos', () => {
  const s = normalizeSub({ name: 'A', price: 1, dueDate: '5', createdAt: '2026-01-01' });
  assert.equal(s.autoCharge, false);
  assert.equal(s.muted, false);
});

test('autoCharge e muted só aceitam booleano verdadeiro', () => {
  const s = normalizeSub({ name: 'A', price: 1, dueDate: '5', autoCharge: true, muted: true });
  assert.equal(s.autoCharge, true);
  assert.equal(s.muted, true);
  const t = normalizeSub({ name: 'A', price: 1, dueDate: '5', autoCharge: 'sim', muted: 1 });
  assert.equal(t.autoCharge, false);
  assert.equal(t.muted, false);
});

test('cadastro com Cartão vem com cobrança automática marcada; os demais, não', () => {
  assert.equal(emptyForm({ name: 'A' }).autoCharge, true);
  assert.equal(emptyForm({ name: 'A' }).muted, false);
});

test('form <-> assinatura preserva autoCharge e muted', () => {
  const sub = buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: '5', autoCharge: false, muted: true }, '2026-10-15');
  assert.equal(sub.autoCharge, false);
  assert.equal(sub.muted, true);
  assert.equal(formFromSub(sub).autoCharge, false);
  assert.equal(formFromSub(sub).muted, true);
  assert.equal(formFromSub({ name: 'x', dueDate: '3' }).autoCharge, false, 'dados antigos: manual');
});
