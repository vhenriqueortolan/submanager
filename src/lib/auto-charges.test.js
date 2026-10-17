import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingAutoCharges, applyAutoCharges, applyAllAutoCharges } from './auto-charges.js';
import { pauseSub, resumeSub, cancelSub } from './status.js';
import { addPayment } from './payments.js';

const sub = (extra = {}) => ({
  id: 's', name: 'Netflix', price: 40, cycle: 'monthly', dueDate: '10', createdAt: '2026-01-15',
  paidCycle: '', payments: [], autoCharge: true, ...extra,
});
const cycles = (list) => list.map((p) => p.cycle);

test('só assinaturas com cobrança automática geram registros', () => {
  assert.deepEqual(pendingAutoCharges(sub({ autoCharge: false }), [], new Date(2026, 9, 14)), []);
});

test('uma cobrança por mês desde o cadastro; o mês do cadastro só conta se o vencimento veio depois dele', () => {
  const list = pendingAutoCharges(sub(), [], new Date(2026, 3, 20)); // 20/04/2026, cadastro em 15/01
  assert.deepEqual(cycles(list), ['2026-02', '2026-03', '2026-04']); // 10/01 é anterior ao cadastro
  assert.deepEqual(list.map((p) => p.paidAt), ['2026-02-10', '2026-03-10', '2026-04-10']);
});

test('ciclos passados são estimados, com o preço e a parte de hoje; a cobrança de hoje não é estimada', () => {
  const people = [{ id: 'p1', name: 'Ana' }];
  const list = pendingAutoCharges(sub({ sharedWith: ['p1'], createdAt: '2026-08-01' }), people, new Date(2026, 9, 10));
  assert.deepEqual(cycles(list), ['2026-08', '2026-09', '2026-10']);
  assert.deepEqual(list.map((p) => p.estimated), [true, true, false]);
  assert.ok(list.every((p) => p.kind === 'auto' && p.price === 40 && p.amount === 40 && p.share === 20));
});

test('vencimento de hoje conta; vencimento de amanhã ainda não', () => {
  assert.deepEqual(cycles(pendingAutoCharges(sub({ createdAt: '2026-10-01' }), [], new Date(2026, 9, 10))), ['2026-10']);
  assert.deepEqual(cycles(pendingAutoCharges(sub({ createdAt: '2026-10-01' }), [], new Date(2026, 9, 9))), []);
});

test('virada de mês e de ano', () => {
  const list = pendingAutoCharges(sub({ dueDate: '31', createdAt: '2025-11-01' }), [], new Date(2026, 1, 28));
  assert.deepEqual(cycles(list), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.equal(list[3].paidAt, '2026-02-28'); // dia 31 em fevereiro vence no último dia
  assert.equal(list[0].paidAt, '2025-11-30');
});

test('semanal: uma cobrança por semana, com a data como ciclo', () => {
  const s = sub({ cycle: 'weekly', dueDate: '', dueWeekday: '1', createdAt: '2026-10-01' }); // segundas
  const list = pendingAutoCharges(s, [], new Date(2026, 9, 14)); // quarta 14/10
  assert.deepEqual(cycles(list), ['2026-10-05', '2026-10-12']);
});

test('anual: uma cobrança por ano', () => {
  const s = sub({ cycle: 'yearly', dueDate: '15', dueMonth: '3', createdAt: '2024-01-01' });
  const list = pendingAutoCharges(s, [], new Date(2026, 9, 14));
  assert.deepEqual(cycles(list), ['2024', '2025', '2026']);
});

test('cadastrada hoje, depois do vencimento do mês: nada a registrar', () => {
  assert.deepEqual(pendingAutoCharges(sub({ createdAt: '2026-10-14' }), [], new Date(2026, 9, 14)), []);
});

test('idempotente: aplicar duas vezes não duplica', () => {
  const now = new Date(2026, 5, 20);
  const once = applyAutoCharges(sub(), [], now);
  const twice = applyAutoCharges(once, [], now);
  assert.equal(twice, once);
  assert.equal(once.payments.length, 5);
  assert.equal(once.paidCycle, '2026-06');
});

test('não sobrescreve o que a pessoa já marcou como pago', () => {
  const s = addPayment(sub(), '2026-03', '2026-03-12', 'manual-1');
  const out = applyAutoCharges(s, [], new Date(2026, 4, 20));
  assert.equal(out.payments.filter((p) => p.cycle === '2026-03').length, 1);
  assert.equal(out.payments.find((p) => p.cycle === '2026-03').kind, 'manual');
});

test('meses pausados não viram cobrança; reativar volta a cobrar a partir da reativação', () => {
  let s = sub({ createdAt: '2026-01-01' });
  s = resumeSub(pauseSub(s, '2026-03-05'), '2026-06-10'); // pausada de 05/03 até 10/06 (exclusive)
  const list = pendingAutoCharges(s, [], new Date(2026, 6, 20));
  assert.deepEqual(cycles(list), ['2026-01', '2026-02', '2026-06', '2026-07']); // sem mar, abr, mai; 10/06 volta a cobrar
});

test('pausada agora: nada novo a partir da pausa', () => {
  const s = pauseSub(sub({ createdAt: '2026-01-01' }), '2026-03-05');
  assert.deepEqual(cycles(pendingAutoCharges(s, [], new Date(2026, 6, 20))), ['2026-01', '2026-02']);
});

test('cancelada: sem cobrança depois da data; reativada depois, o intervalo cancelado continua vazio', () => {
  let s = cancelSub(sub({ createdAt: '2026-01-01' }), '2026-04-01');
  assert.deepEqual(cycles(pendingAutoCharges(s, [], new Date(2026, 8, 20))), ['2026-01', '2026-02', '2026-03']);
  s = resumeSub(s, '2026-07-01');
  assert.deepEqual(cycles(pendingAutoCharges(s, [], new Date(2026, 8, 20))), ['2026-01', '2026-02', '2026-03', '2026-07', '2026-08', '2026-09']);
});

test('assinatura sem vencimento válido ou sem cadastro válido não gera nada', () => {
  assert.deepEqual(pendingAutoCharges(sub({ dueDate: '' }), [], new Date(2026, 9, 14)), []);
  assert.deepEqual(pendingAutoCharges(sub({ createdAt: '' }), [], new Date(2026, 9, 14)), []);
});

test('applyAllAutoCharges devolve o mesmo estado quando não há o que fazer', () => {
  const state = { people: [], subs: [sub({ autoCharge: false })] };
  assert.equal(applyAllAutoCharges(state, new Date(2026, 9, 14)), state);
  const changed = applyAllAutoCharges({ people: [], subs: [sub()] }, new Date(2026, 9, 14));
  assert.equal(changed.subs[0].payments.length, 9);
});

test('volume: 50 assinaturas com três anos de cobranças mensais (~1.800 registros) calculam rápido', () => {
  const subs = Array.from({ length: 50 }, (_, i) => sub({ id: `s${i}`, createdAt: '2023-10-01' }));
  const t0 = performance.now();
  const out = applyAllAutoCharges({ people: [], subs }, new Date(2026, 9, 14));
  const total = out.subs.reduce((n, s) => n + s.payments.length, 0);
  assert.ok(total >= 1800, `esperava ~1.800, veio ${total}`);
  assert.ok(performance.now() - t0 < 1000);
  assert.equal(applyAllAutoCharges(out, new Date(2026, 9, 14)), out);
});
