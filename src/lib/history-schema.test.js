import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPayment, normalizePayments, makePayment } from './payments.js';
import { normalizeSub, normalize, parseImport } from './storage.js';

const base = { id: 's1', name: 'Netflix', price: 60, dueDate: '10', createdAt: '2026-01-01', paidCycle: '', lastNotified: '', payments: [] };
const people = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bruno' }];
const legacyRecord = { id: 'r1', cycle: '2026-08', paidAt: '2026-08-10', amount: 60 };

test('pagar uma assinatura dividida grava a sua parte, não o preço cheio (bug do histórico)', () => {
  const dividida = { ...base, sharedWith: ['p1', 'p2'] };
  const paid = addPayment(dividida, '2026-10', '2026-10-10', 'x', { people });
  assert.equal(paid.payments[0].share, 20);
  assert.equal(paid.payments[0].price, 60);
  assert.equal(paid.payments[0].amount, 60);
});

test('sem divisão, a sua parte é o preço cheio; o registro nasce manual e não estimado', () => {
  const rec = makePayment(base, '2026-10', '2026-10-10', { id: 'x' });
  assert.deepEqual(rec, { id: 'x', cycle: '2026-10', paidAt: '2026-10-10', amount: 60, price: 60, share: 60, kind: 'manual', estimated: false });
});

test('cobrança automática e estimada ficam registradas no registro', () => {
  const rec = makePayment(base, '2026-09', '2026-09-10', { id: 'y', kind: 'auto', estimated: true });
  assert.equal(rec.kind, 'auto');
  assert.equal(rec.estimated, true);
});

test('registro antigo de assinatura não dividida: manual, preço = valor gravado, sua parte = valor', () => {
  const [r] = normalizePayments([legacyRecord], { divided: false });
  assert.deepEqual(r, { ...legacyRecord, price: 60, share: 60, kind: 'manual', estimated: false });
});

test('registro antigo de assinatura dividida hoje: sua parte desconhecida (share null), vira "total"', () => {
  const [r] = normalizePayments([legacyRecord], { divided: true });
  assert.equal(r.share, null);
  assert.equal(r.amount, 60);
  assert.equal(r.kind, 'manual');
});

test('normalizeSub usa a divisão atual para decidir o destino dos registros antigos', () => {
  assert.equal(normalizeSub({ ...base, payments: [legacyRecord] }).payments[0].share, 60);
  assert.equal(normalizeSub({ ...base, sharedWith: ['p1'], payments: [legacyRecord] }).payments[0].share, null);
});

test('normalizar duas vezes dá o mesmo resultado (migração idempotente)', () => {
  const once = normalizeSub({ ...base, sharedWith: ['p1'], payments: [legacyRecord, { id: 'r2', cycle: '2026-09', paidAt: '2026-09-10', amount: 60 }] });
  const twice = normalizeSub(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice.payments, once.payments);
  // Registro novo-formato com share null não vira "sua parte = valor" na segunda passada.
  assert.equal(twice.payments[0].share, null);
});

test('registros novos sobrevivem a exportar e importar o backup', () => {
  const sub = addPayment({ ...base, sharedWith: ['p1'] }, '2026-10', '2026-10-10', 'x', { people, kind: 'auto', estimated: true });
  const state = parseImport(JSON.stringify({ name: 'V', people, subs: [sub] }));
  assert.deepEqual(state.subs[0].payments[0], { id: 'x', cycle: '2026-10', paidAt: '2026-10-10', amount: 60, price: 60, share: 30, kind: 'auto', estimated: true });
});

test('valores inválidos nos campos novos caem em padrões seguros', () => {
  const [r] = normalizePayments([{ ...legacyRecord, kind: 'banana', share: 'abc', price: -5, estimated: 'sim' }], { divided: false });
  assert.equal(r.kind, 'manual');
  assert.equal(r.share, 60);
  assert.equal(r.price, 60);
  assert.equal(r.estimated, false);
});

test('backup do schema 9 (sem os campos novos) carrega inteiro', () => {
  const old = { name: 'V', budget: 100, subs: [{ ...base, payments: [legacyRecord], paidCycle: '2026-08' }] };
  const st = normalize(old);
  assert.equal(st.schema, 10);
  assert.equal(st.subs[0].paidCycle, '2026-08');
  assert.equal(st.subs[0].payments.length, 1);
});
