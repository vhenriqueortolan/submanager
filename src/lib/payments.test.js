import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPayment, removePayment, paymentsNewestFirst } from './payments.js';
import { normalizeSub, normalize, parseImport, defaultState, SCHEMA } from './storage.js';
import { buildSub, emptyForm } from './subs.js';
import { dueStatus } from './dates.js';

const base = { id: 's1', name: 'Netflix', price: 39.9, dueDate: '10', createdAt: '2026-01-01', paidCycle: '', lastNotified: '', payments: [] };

test('schema sobe para 10 e o estado novo traz os campos de backup', () => {
  assert.equal(SCHEMA, 10);
  const st = defaultState();
  assert.equal(st.schema, 10);
  assert.equal(st.lastBackupAt, '');
  assert.equal(st.backupSnoozeUntil, '');
});

test('pagar registra o pagamento e espelha em paidCycle', () => {
  const s = addPayment(base, '2026-10', '2026-10-10', 'p1');
  assert.equal(s.payments.length, 1);
  assert.deepEqual({ ...s.payments[0] }, { id: 'p1', cycle: '2026-10', paidAt: '2026-10-10', amount: 39.9, price: 39.9, share: 39.9, kind: 'manual', estimated: false });
  assert.equal(s.paidCycle, '2026-10');
  assert.equal(base.payments.length, 0, 'não altera a assinatura original');
});

test('pagar faz os avisos do ciclo pararem; desfazer os traz de volta', () => {
  const now = new Date(2026, 9, 12);
  assert.equal(dueStatus(base, now).type, 'overdue');
  const paid = addPayment(base, '2026-10', '2026-10-12', 'p1');
  assert.equal(dueStatus(paid, now), null);
  const undone = removePayment(paid, 'p1');
  assert.equal(undone.paidCycle, '');
  assert.equal(dueStatus(undone, now).type, 'overdue');
});

test('pagar o mesmo ciclo duas vezes não duplica o registro', () => {
  const once = addPayment(base, '2026-10', '2026-10-10', 'p1');
  assert.equal(addPayment(once, '2026-10', '2026-10-11', 'p2'), once);
});

test('desfazer um registro antigo não mexe nos mais novos', () => {
  let s = addPayment(base, '2026-09', '2026-09-10', 'p1');
  s = addPayment(s, '2026-10', '2026-10-10', 'p2');
  const r = removePayment(s, 'p1');
  assert.deepEqual(r.payments.map((p) => p.id), ['p2']);
  assert.equal(r.paidCycle, '2026-10');
});

test('desfazer o mais novo volta paidCycle para o anterior', () => {
  let s = addPayment(base, '2026-09', '2026-09-10', 'p1');
  s = addPayment(s, '2026-10', '2026-10-10', 'p2');
  const r = removePayment(s, 'p2');
  assert.equal(r.paidCycle, '2026-09');
});

test('desfazer sem pagamentos, ou com id desconhecido, não faz nada', () => {
  assert.equal(removePayment(base, 'x'), base);
  const s = addPayment(base, '2026-10', '2026-10-10', 'p1');
  assert.equal(removePayment(s, 'outro'), s);
});

test('histórico lista os mais recentes primeiro', () => {
  let s = addPayment(base, '2026-08', '2026-08-10', 'a');
  s = addPayment(s, '2026-10', '2026-10-10', 'c');
  s = addPayment(s, '2026-09', '2026-09-10', 'b');
  assert.deepEqual(paymentsNewestFirst(s).map((p) => p.id), ['c', 'b', 'a']);
});

test('assinatura antiga sem payments vira [] e mantém paidCycle', () => {
  const old = { name: 'A', price: 1, dueDate: '10', createdAt: '2026-01-01', paidCycle: '2026-09' };
  const s = normalizeSub(old);
  assert.deepEqual(s.payments, []);
  assert.equal(s.paidCycle, '2026-09');
});

test('paidCycle inconsistente com o último pagamento é corrigido', () => {
  const s = normalizeSub({
    ...base,
    paidCycle: '2026-08',
    payments: [
      { id: 'p1', cycle: '2026-09', paidAt: '2026-09-10', amount: 10 },
      { id: 'p2', cycle: '2026-10', paidAt: '2026-10-10', amount: 10 },
    ],
  });
  assert.equal(s.paidCycle, '2026-10');
});

test('pagamentos inválidos são descartados e ids repetidos são refeitos', () => {
  const s = normalizeSub({
    ...base,
    payments: [
      { id: 'p1', cycle: '2026-09', paidAt: '2026-09-10', amount: 10 },
      { id: 'p1', cycle: '2026-10', paidAt: '2026-10-10', amount: 10 },
      { id: 'p3', cycle: 'lixo', paidAt: '2026-10-10', amount: 10 },
      null,
    ],
  });
  assert.equal(s.payments.length, 2);
  assert.notEqual(s.payments[0].id, s.payments[1].id);
});

test('mudar o vencimento reinicia o controle sem perder o histórico', () => {
  const prev = addPayment({ ...base, createdAt: '2026-01-01' }, '2026-10', '2026-10-10', 'p1');
  const form = { ...emptyForm({ name: 'Netflix', price: 39.9 }), dueDate: '20' };
  const next = buildSub(prev, form, '2026-10-15');
  assert.equal(next.paidCycle, '');
  assert.equal(next.payments.length, 1);
  assert.equal(normalizeSub(next).paidCycle, '', 'ao recarregar, o histórico anterior não volta a marcar como pago');
});

test('editar sem mudar o vencimento preserva pagamentos', () => {
  const prev = addPayment(base, '2026-10', '2026-10-10', 'p1');
  const form = { ...emptyForm({ name: 'Netflix HD', price: 39.9 }), dueDate: '10' };
  const next = buildSub(prev, form, '2026-10-15');
  assert.deepEqual(next.payments, prev.payments);
  assert.equal(next.paidCycle, '2026-10');
});

test('backup antigo (sem os campos novos) carrega sem perda', () => {
  const text = JSON.stringify({
    name: 'V',
    budget: 500,
    subs: [{ id: 'a', name: 'Netflix', price: 39.9, dueDate: '10', createdAt: '2026-01-01', paidCycle: '2026-09' }],
  });
  const st = parseImport(text);
  assert.equal(st.subs[0].paidCycle, '2026-09');
  assert.deepEqual(st.subs[0].payments, []);
  assert.equal(st.lastBackupAt, '');
  assert.equal(st.backupSnoozeUntil, '');
  assert.equal(st.budget, 500);
});

test('lastBackupAt e backupSnoozeUntil só aceitam datas válidas', () => {
  const ok = normalize({ lastBackupAt: '2026-10-01', backupSnoozeUntil: '2026-10-08' });
  assert.equal(ok.lastBackupAt, '2026-10-01');
  assert.equal(ok.backupSnoozeUntil, '2026-10-08');
  const bad = normalize({ lastBackupAt: 'ontem', backupSnoozeUntil: 5 });
  assert.equal(bad.lastBackupAt, '');
  assert.equal(bad.backupSnoozeUntil, '');
});
