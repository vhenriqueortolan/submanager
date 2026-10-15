import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSub, emptyForm, formFromSub } from './subs.js';

test('nova assinatura recebe id e datas de controle', () => {
  const sub = buildSub(null, { ...emptyForm({ name: ' Netflix ', price: 39.9 }), dueDate: '10' }, '2026-10-14');
  assert.ok(sub.id);
  assert.equal(sub.name, 'Netflix');
  assert.equal(sub.createdAt, '2026-10-14');
  assert.equal(sub.dueDate, '10');
  assert.equal(sub.price, 39.9);
});

test('editar preserva id, cadastro e ciclo pago', () => {
  const prev = buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: '10' }, '2026-01-01');
  prev.paidCycle = '2026-09';
  const next = buildSub(prev, { ...formFromSub(prev), price: '20' }, '2026-10-14');
  assert.equal(next.id, prev.id);
  assert.equal(next.createdAt, '2026-01-01');
  assert.equal(next.paidCycle, '2026-09');
  assert.equal(next.price, 20);
});

test('mudar o dia de vencimento reinicia o ciclo', () => {
  const prev = { ...buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: '10' }, '2026-01-01'), lastNotified: '2026-10-01' };
  const next = buildSub(prev, { ...formFromSub(prev), dueDate: '5' }, '2026-10-14');
  assert.equal(next.createdAt, '2026-10-14');
  assert.equal(next.lastNotified, '');
});

test('vencimento inválido vira vazio', () => {
  assert.equal(buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: '45' }).dueDate, '');
  assert.equal(buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: 'abc' }).dueDate, '');
});
