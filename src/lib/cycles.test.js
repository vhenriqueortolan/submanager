import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CYCLES, DEFAULT_CYCLE, cycleOf, annualAmount, normalizeDue, paidCycleValid } from './cycles.js';
import { dueStatus, lastDue, nextDue, cycleKey, todayStr } from './dates.js';
import { monthlyTotal, annualProjection } from './totals.js';
import { buildSub, emptyForm, formFromSub } from './subs.js';
import { normalizeSub, parseImport, loadState, SCHEMA } from './storage.js';

const D = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (s) => (s ? `${s.type}/${s.days}/${s.cycle}` : 'null');
const day = (d) => (d ? todayStr(d) : null);
const yearly = (dueDate, dueMonth, createdAt, paidCycle = '') => ({ cycle: 'yearly', dueDate: String(dueDate), dueMonth: String(dueMonth), createdAt, paidCycle });
const weekly = (dueWeekday, createdAt, paidCycle = '') => ({ cycle: 'weekly', dueWeekday: String(dueWeekday), dueDate: '', createdAt, paidCycle });

test('tabela de ciclos e default', () => {
  assert.deepEqual(Object.keys(CYCLES), ['weekly', 'monthly', 'yearly']);
  assert.equal(DEFAULT_CYCLE, 'monthly');
  assert.equal(cycleOf({}), 'monthly');
  assert.equal(cycleOf({ cycle: 'yearly' }), 'yearly');
  assert.equal(cycleOf({ cycle: 'quinzenal' }), 'monthly');
});

test('cycleKey por ciclo', () => {
  assert.equal(cycleKey(D('2026-10-15')), '2026-10');
  assert.equal(cycleKey(D('2026-10-15'), 'monthly'), '2026-10');
  assert.equal(cycleKey(D('2026-10-15'), 'yearly'), '2026');
  assert.equal(cycleKey(D('2026-10-15'), 'weekly'), '2026-10-15');
});

test('anual: 29/02 em ano não bissexto vence 28/02', () => {
  const s = yearly(29, 2, '2020-01-01');
  assert.equal(day(lastDue(s, D('2026-03-01'))), '2026-02-28');
  assert.equal(day(lastDue(s, D('2028-03-01'))), '2028-02-29');
  assert.equal(day(nextDue(s, D('2026-01-10'))), '2026-02-28');
});

test('anual: ainda neste ano vs já passado', () => {
  const s = yearly(15, 3, '2020-01-01');
  assert.equal(day(lastDue(s, D('2026-10-15'))), '2026-03-15');
  assert.equal(day(nextDue(s, D('2026-10-15'))), '2027-03-15');
  assert.equal(day(lastDue(s, D('2026-02-01'))), '2025-03-15');
  assert.equal(day(nextDue(s, D('2026-02-01'))), '2026-03-15');
  assert.equal(day(nextDue(s, D('2026-03-15'))), '2026-03-15');
});

test('anual: status, virada de ano e pagamento', () => {
  const s = yearly(15, 3, '2020-01-01');
  assert.equal(fmt(dueStatus(s, D('2026-03-15'))), 'today/0/2026');
  assert.equal(fmt(dueStatus(s, D('2026-03-17'))), 'overdue/2/2026');
  assert.equal(fmt(dueStatus({ ...s, paidCycle: '2026' }, D('2026-03-17'))), 'null');
  assert.equal(fmt(dueStatus({ ...s, paidCycle: '2025' }, D('2026-01-02'))), 'null');
  const nye = yearly(31, 12, '2020-01-01');
  assert.equal(fmt(dueStatus(nye, D('2027-01-01'))), 'overdue/1/2026');
});

test('anual: cadastro depois do último vencimento não gera atraso falso', () => {
  const s = yearly(15, 3, '2026-06-01');
  assert.equal(fmt(dueStatus(s, D('2026-10-15'))), 'null');
  assert.equal(fmt(dueStatus(s, D('2027-03-15'))), 'today/0/2027');
});

test('semanal: hoje, ontem, pago, semana seguinte', () => {
  // 2026-10-15 é quinta-feira (4)
  assert.equal(fmt(dueStatus(weekly(4, '2026-01-01'), D('2026-10-15'))), 'today/0/2026-10-15');
  assert.equal(fmt(dueStatus(weekly(3, '2026-01-01'), D('2026-10-15'))), 'overdue/1/2026-10-14');
  assert.equal(fmt(dueStatus(weekly(5, '2026-01-01'), D('2026-10-15'))), 'overdue/6/2026-10-09');
  assert.equal(fmt(dueStatus(weekly(3, '2026-01-01', '2026-10-14'), D('2026-10-15'))), 'null');
  assert.equal(fmt(dueStatus(weekly(3, '2026-01-01', '2026-10-07'), D('2026-10-15'))), 'overdue/1/2026-10-14');
  assert.equal(day(lastDue(weekly(3, '2026-01-01'), D('2026-10-15'))), '2026-10-14');
  assert.equal(day(nextDue(weekly(3, '2026-01-01'), D('2026-10-15'))), '2026-10-21');
  assert.equal(day(nextDue(weekly(4, '2026-01-01'), D('2026-10-15'))), '2026-10-15');
  assert.equal(day(nextDue(weekly(0, '2026-01-01'), D('2026-10-15'))), '2026-10-18');
});

test('semanal: domingo (0) é válido e cadastro recente não gera atraso falso', () => {
  assert.equal(day(lastDue(weekly(0, '2026-01-01'), D('2026-10-15'))), '2026-10-11');
  assert.equal(fmt(dueStatus(weekly(3, '2026-10-15'), D('2026-10-15'))), 'null');
});

test('sem vencimento válido: null', () => {
  assert.equal(lastDue({ cycle: 'weekly', dueWeekday: '' }, D('2026-10-15')), null);
  assert.equal(lastDue({ cycle: 'yearly', dueDate: '10', dueMonth: '' }, D('2026-10-15')), null);
  assert.equal(nextDue({ dueDate: '' }, D('2026-10-15')), null);
  assert.equal(fmt(dueStatus({ cycle: 'yearly', dueDate: '', dueMonth: '3', createdAt: '2020-01-01' }, D('2026-10-15'))), 'null');
});

test('mensal sem campo cycle segue como mensal', () => {
  const s = { dueDate: '10', createdAt: '2026-01-01', paidCycle: '' };
  assert.equal(fmt(dueStatus(s, D('2026-10-15'))), 'overdue/5/2026-10');
  assert.equal(day(nextDue(s, D('2026-10-15'))), '2026-11-10');
  assert.equal(day(nextDue({ dueDate: '31' }, D('2026-02-10'))), '2026-02-28');
});

test('totais por ciclo', () => {
  assert.equal(annualAmount({ price: 120, cycle: 'yearly' }), 120);
  assert.equal(annualAmount({ price: 10, cycle: 'weekly' }), 520);
  assert.equal(annualAmount({ price: 10 }), 120);
  assert.equal(monthlyTotal([{ price: 120, cycle: 'yearly' }]), 10);
  assert.equal(monthlyTotal([{ price: 10, cycle: 'weekly' }]), 43.33);
  assert.equal(annualProjection([{ price: 10, cycle: 'weekly' }]), 520);
  const mixed = [{ price: 39.9 }, { price: 120, cycle: 'yearly' }, { price: 10, cycle: 'weekly' }];
  assert.equal(monthlyTotal(mixed), 93.23);
  assert.equal(annualProjection(mixed), 1118.8);
  assert.equal(monthlyTotal([{ price: 0.1 }, { price: 0.2 }]), 0.3);
});

test('normalizeDue limpa campos conforme o ciclo', () => {
  assert.deepEqual(normalizeDue({ cycle: 'monthly', dueDate: '10', dueMonth: '3', dueWeekday: '2' }), { cycle: 'monthly', dueDate: '10', dueMonth: '', dueWeekday: '' });
  assert.deepEqual(normalizeDue({ cycle: 'yearly', dueDate: '15', dueMonth: '3', dueWeekday: '2' }), { cycle: 'yearly', dueDate: '15', dueMonth: '3', dueWeekday: '' });
  assert.deepEqual(normalizeDue({ cycle: 'weekly', dueDate: '15', dueMonth: '3', dueWeekday: '0' }), { cycle: 'weekly', dueDate: '', dueMonth: '', dueWeekday: '0' });
  assert.deepEqual(normalizeDue({ cycle: 'yearly', dueDate: '15', dueMonth: '13' }), { cycle: 'yearly', dueDate: '15', dueMonth: '', dueWeekday: '' });
  assert.deepEqual(normalizeDue({ cycle: 'weekly', dueWeekday: '7' }), { cycle: 'weekly', dueDate: '', dueMonth: '', dueWeekday: '' });
  assert.equal(normalizeDue({ cycle: 'x' }).cycle, 'monthly');
});

test('paidCycleValid confere o formato com o ciclo', () => {
  assert.equal(paidCycleValid('2026-10', 'monthly'), true);
  assert.equal(paidCycleValid('2026', 'yearly'), true);
  assert.equal(paidCycleValid('2026-10-14', 'weekly'), true);
  assert.equal(paidCycleValid('2026-10', 'yearly'), false);
  assert.equal(paidCycleValid('2026', 'monthly'), false);
  assert.equal(paidCycleValid('2026-10', 'weekly'), false);
  assert.equal(paidCycleValid('', 'monthly'), false);
});

test('normalizeSub: defaults e descarte de paidCycle incompatível', () => {
  const base = { name: 'A', price: 1, createdAt: '2026-01-01' };
  const old = normalizeSub({ ...base, dueDate: '10', paidCycle: '2026-10' });
  assert.equal(old.cycle, 'monthly');
  assert.equal(old.dueMonth, '');
  assert.equal(old.dueWeekday, '');
  assert.equal(old.paidCycle, '2026-10');
  assert.equal(normalizeSub({ ...base, cycle: 'yearly', dueDate: '10', dueMonth: '3', paidCycle: '2026-10' }).paidCycle, '');
  assert.equal(normalizeSub({ ...base, cycle: 'yearly', dueDate: '10', dueMonth: '3', paidCycle: '2026' }).paidCycle, '2026');
  assert.equal(normalizeSub({ ...base, cycle: 'weekly', dueWeekday: '2', paidCycle: '2026-10-14' }).paidCycle, '2026-10-14');
  assert.equal(normalizeSub({ ...base, cycle: 'inválido', dueDate: '5' }).cycle, 'monthly');
});

test('backup antigo (sem cycle) importa como mensal; schema sobe para 9', () => {
  assert.equal(SCHEMA, 10);
  const text = JSON.stringify({ name: 'V', subs: [{ id: 'a', name: 'Netflix', price: 39.9, dueDate: '10', createdAt: '2026-01-01', paidCycle: '2026-09' }] });
  const st = parseImport(text);
  assert.equal(st.subs[0].cycle, 'monthly');
  assert.equal(st.subs[0].paidCycle, '2026-09');
  assert.equal(st.schema, 10);
});

test('chave legada carrega como mensal', () => {
  const store = new Map([['subDataV3', JSON.stringify({ name: 'V', subs: [{ name: 'Spotify', price: 20, dueDate: '5' }] })]]);
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const st = loadState(storage);
  assert.equal(st.subs[0].cycle, 'monthly');
});

test('subs: form inclui ciclo e campos de vencimento', () => {
  const f = emptyForm({ name: 'A' });
  assert.equal(f.cycle, 'monthly');
  assert.equal(f.dueMonth, '');
  assert.equal(f.dueWeekday, '');
  const s = buildSub(null, { ...f, cycle: 'yearly', dueDate: '15', dueMonth: '3', dueWeekday: '2' }, '2026-10-15');
  assert.equal(s.cycle, 'yearly');
  assert.equal(s.dueMonth, '3');
  assert.equal(s.dueWeekday, '');
  const w = buildSub(null, { ...f, cycle: 'weekly', dueDate: '15', dueWeekday: '0' }, '2026-10-15');
  assert.equal(w.dueDate, '');
  assert.equal(w.dueWeekday, '0');
  assert.equal(formFromSub(w).cycle, 'weekly');
  assert.equal(formFromSub({ name: 'x', dueDate: '3' }).cycle, 'monthly');
});

test('subs: mudar ciclo ou vencimento reinicia o controle', () => {
  const prev = { ...buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: '10' }, '2026-01-01'), paidCycle: '2026-10', lastNotified: '2026-10-10' };
  const toYearly = buildSub(prev, { ...formFromSub(prev), cycle: 'yearly', dueMonth: '3' }, '2026-10-15');
  assert.equal(toYearly.createdAt, '2026-10-15');
  assert.equal(toYearly.lastNotified, '');
  assert.equal(toYearly.paidCycle, '');
  assert.equal(fmt(dueStatus(toYearly, D('2026-10-15'))), 'null');
  const month = buildSub({ ...toYearly, paidCycle: '2026' }, { ...formFromSub(toYearly), dueMonth: '4' }, '2026-10-16');
  assert.equal(month.paidCycle, '');
  const w1 = { ...buildSub(null, { ...emptyForm({ name: 'A' }), cycle: 'weekly', dueWeekday: '1' }, '2026-01-01'), paidCycle: '2026-10-12' };
  const w2 = buildSub(w1, { ...formFromSub(w1), dueWeekday: '2' }, '2026-10-15');
  assert.equal(w2.paidCycle, '');
  const same = buildSub(prev, formFromSub(prev), '2026-10-15');
  assert.equal(same.paidCycle, '2026-10');
  assert.equal(same.createdAt, '2026-01-01');
});
