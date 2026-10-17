import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyTotal, annualProjection, totalServiceMonthly } from './totals.js';
import { pendingDue } from './notifications.js';
import { sortByUrgency } from './sort.js';
import { dueStatus } from './dates.js';
import { pauseSub, cancelSub } from './status.js';

const NOW = new Date(2026, 9, 14); // 14/10/2026
const sub = (name, price, extra = {}) => ({
  id: name, name, price, dueDate: '14', createdAt: '2026-01-01', paidCycle: '', lastNotified: '', paymentMethod: 'Pix', ...extra,
});

test('totais e previsões ignoram pausadas e canceladas', () => {
  const ativa = sub('Ativa', 40);
  const pausada = pauseSub(sub('Pausada', 100), '2026-10-01');
  const cancelada = cancelSub(sub('Cancelada', 200), '2026-10-01');
  const subs = [ativa, pausada, cancelada];
  assert.equal(monthlyTotal(subs), 40);
  assert.equal(annualProjection(subs), 480);
  assert.equal(totalServiceMonthly(subs), 40);
});

test('a parte dividida também respeita o status', () => {
  const people = [{ id: 'p1', name: 'Ana' }];
  const dividida = sub('Dividida', 60, { sharedWith: ['p1'] });
  const pausada = pauseSub(sub('Pausada', 60, { sharedWith: ['p1'] }), '2026-10-01');
  assert.equal(monthlyTotal([dividida, pausada], people), 30);
});

test('reativar volta a contar nos totais', () => {
  const pausada = pauseSub(sub('A', 40), '2026-10-01');
  assert.equal(monthlyTotal([pausada]), 0);
  assert.equal(monthlyTotal([{ ...pausada, status: 'active', pauses: [{ from: '2026-10-01', to: '2026-10-10' }] }]), 40);
});

test('pausada e cancelada não geram avisos; a ativa continua avisando', () => {
  const subs = [sub('Ativa', 10), pauseSub(sub('Pausada', 10), '2026-10-01'), cancelSub(sub('Cancelada', 10), '2026-10-01')];
  assert.deepEqual(pendingDue(subs, NOW).map((p) => p.sub.name), ['Ativa']);
});

test('na lista, pausadas e canceladas vão para o fim, por nome', () => {
  const items = [
    cancelSub(sub('Zeta', 10), '2026-10-01'),
    sub('Futura', 10, { dueDate: '20', createdAt: '2026-10-10' }),
    pauseSub(sub('Alfa', 10), '2026-10-01'),
    sub('Hoje', 10),
  ].map((s) => ({ sub: s, status: dueStatus(s, NOW) }));
  assert.deepEqual(sortByUrgency(items, NOW).map((i) => i.sub.name), ['Hoje', 'Futura', 'Alfa', 'Zeta']);
});
