import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortByUrgency } from './sort.js';
import { dueStatus } from './dates.js';
import { brl, priceLabel, dueLabel } from './format.js';

const NOW = new Date(2026, 9, 15); // quinta-feira, 15/10/2026
const mk = (name, extra = {}) => ({ name, price: 10, createdAt: '2026-10-10', paidCycle: '', ...extra });
const withStatus = (subs) => subs.map((sub) => ({ sub, status: dueStatus(sub, NOW) }));
const names = (items) => items.map((i) => i.sub.name);

test('ordena: atrasadas (mais dias primeiro) → hoje → próximas → sem vencimento', () => {
  const subs = [
    mk('Sem', { dueDate: '' }),
    mk('Futura20', { dueDate: '20' }),
    mk('Hoje', { dueDate: '15' }),
    mk('Atrasada2', { dueDate: '13' }),
    mk('Futura17', { dueDate: '17' }),
    mk('Atrasada10', { dueDate: '11' }),
  ];
  assert.deepEqual(names(sortByUrgency(withStatus(subs), NOW)), ['Atrasada10', 'Atrasada2', 'Hoje', 'Futura17', 'Futura20', 'Sem']);
});

test('paga hoje vai para depois das próximas do mês; vencimento já passado no mês fica para o mês seguinte', () => {
  const subs = [
    mk('PagaHoje', { dueDate: '15', paidCycle: '2026-10' }),
    mk('PagaDia5', { dueDate: '5', paidCycle: '2026-10' }),
    mk('Futura16', { dueDate: '16' }),
  ];
  assert.deepEqual(names(sortByUrgency(withStatus(subs), NOW)), ['Futura16', 'PagaDia5', 'PagaHoje']);
});

test('mistura ciclos: anual e semanal entram pela data do próximo vencimento', () => {
  const subs = [
    mk('Anual', { cycle: 'yearly', dueDate: '20', dueMonth: '10' }),
    mk('Semanal', { cycle: 'weekly', dueWeekday: '5' }), // sexta 16/10
    mk('Mensal', { dueDate: '18' }),
  ];
  assert.deepEqual(names(sortByUrgency(withStatus(subs), NOW)), ['Semanal', 'Mensal', 'Anual']);
});

test('sem vencimento: por nome; estável nos empates; não altera a lista original', () => {
  const subs = [mk('beta'), mk('Álamo'), mk('Zeta'), mk('Igual1', { dueDate: '20' }), mk('Igual2', { dueDate: '20' })];
  const items = withStatus(subs);
  const before = names(items);
  assert.deepEqual(names(sortByUrgency(items, NOW)), ['Igual1', 'Igual2', 'Álamo', 'beta', 'Zeta']);
  assert.deepEqual(names(items), before);
});

test('priceLabel: sufixo só nos ciclos não mensais', () => {
  assert.equal(priceLabel({ price: 50 }), brl(50));
  assert.equal(priceLabel({ price: 120, cycle: 'yearly' }), `${brl(120)}/ano`);
  assert.equal(priceLabel({ price: 10, cycle: 'weekly' }), `${brl(10)}/semana`);
});

test('dueLabel por ciclo', () => {
  assert.equal(dueLabel({ dueDate: '10' }, NOW), 'Dia 10');
  assert.equal(dueLabel({ dueDate: '' }, NOW), '');
  assert.equal(dueLabel({ cycle: 'weekly', dueWeekday: '1' }, NOW), 'Toda segunda');
  assert.equal(dueLabel({ cycle: 'weekly', dueWeekday: '0' }, NOW), 'Todo domingo');
  assert.equal(dueLabel({ cycle: 'weekly', dueWeekday: '' }, NOW), '');
  assert.equal(dueLabel({ cycle: 'yearly', dueDate: '5', dueMonth: '3' }, NOW), 'Vence 05/03');
  assert.equal(dueLabel({ cycle: 'yearly', dueDate: '20', dueMonth: '10' }, NOW), 'Vence 20/10');
  assert.equal(dueLabel({ cycle: 'yearly', dueDate: '', dueMonth: '' }, NOW), '');
});
