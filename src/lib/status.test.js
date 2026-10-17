import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatus, normalizePauses, pauseSub, resumeSub, cancelSub, isActive, isInactiveOn, statusOf } from './status.js';
import { normalizeSub } from './storage.js';
import { buildSub, emptyForm, formFromSub } from './subs.js';

const base = { id: 'a', name: 'Netflix', price: 40, dueDate: '10', createdAt: '2026-01-01' };

test('sem os campos (dados e backups antigos), a assinatura é ativa', () => {
  assert.deepEqual(normalizeStatus(base), { status: 'active', pauses: [], cancelledAt: '' });
  assert.deepEqual(normalizeStatus(null), { status: 'active', pauses: [], cancelledAt: '' });
  assert.equal(isActive(base), true);
  assert.equal(normalizeSub(base).status, 'active');
});

test('valores inválidos viram ativa e períodos ruins são descartados', () => {
  assert.equal(statusOf({ status: 'banana' }), 'active');
  assert.equal(statusOf({ status: 'cancelled' }), 'active'); // cancelada sem data não vale
  assert.equal(statusOf({ status: 'cancelled', cancelledAt: '2026/05/01' }), 'active');
  assert.deepEqual(normalizePauses([{ from: 'x', to: '' }, { from: '2026-05-10', to: '2026-05-01' }, null, 3]), []);
  assert.deepEqual(normalizePauses('x'), []);
});

test('o status acompanha os períodos: pausa em aberto = pausada', () => {
  const s = normalizeStatus({ status: 'active', pauses: [{ from: '2026-05-01', to: '' }] });
  assert.equal(s.status, 'paused');
  assert.equal(normalizeStatus({ pauses: [{ from: '2026-05-01', to: '2026-06-01' }] }).status, 'active');
});

test('só o último período pode ficar em aberto; ordena por início', () => {
  const list = normalizePauses([{ from: '2026-08-01', to: '' }, { from: '2026-03-01', to: '' }, { from: '2026-05-01', to: '2026-06-01' }]);
  assert.deepEqual(list, [{ from: '2026-05-01', to: '2026-06-01' }, { from: '2026-08-01', to: '' }]);
});

test('pausar e reativar: o período fica registrado e a reativação volta a cobrar', () => {
  const paused = pauseSub(base, '2026-05-10');
  assert.equal(paused.status, 'paused');
  assert.equal(isInactiveOn(paused, '2026-05-09'), false);
  assert.equal(isInactiveOn(paused, '2026-05-10'), true);
  assert.equal(isInactiveOn(paused, '2030-01-01'), true);
  const resumed = resumeSub(paused, '2026-07-10');
  assert.equal(resumed.status, 'active');
  assert.deepEqual(resumed.pauses, [{ from: '2026-05-10', to: '2026-07-10' }]);
  assert.equal(isInactiveOn(resumed, '2026-07-09'), true);
  assert.equal(isInactiveOn(resumed, '2026-07-10'), false); // volta a gerar cobrança na reativação
});

test('pausar duas vezes acumula períodos; pausar quem já está parada não muda nada', () => {
  const once = resumeSub(pauseSub(base, '2026-02-01'), '2026-03-01');
  const twice = resumeSub(pauseSub(once, '2026-06-01'), '2026-06-15');
  assert.deepEqual(twice.pauses, [{ from: '2026-02-01', to: '2026-03-01' }, { from: '2026-06-01', to: '2026-06-15' }]);
  const paused = pauseSub(base, '2026-02-01');
  assert.equal(pauseSub(paused, '2026-04-01'), paused);
  assert.equal(resumeSub(base, '2026-04-01'), base);
});

test('cancelar guarda a data; depois dela a assinatura está parada', () => {
  const c = cancelSub(base, '2026-09-01');
  assert.equal(c.status, 'cancelled');
  assert.equal(c.cancelledAt, '2026-09-01');
  assert.equal(isActive(c), false);
  assert.equal(isInactiveOn(c, '2026-08-31'), false);
  assert.equal(isInactiveOn(c, '2026-09-01'), true);
  assert.equal(cancelSub(c, '2026-10-01'), c);
});

test('cancelar uma pausada termina a pausa no cancelamento', () => {
  const c = cancelSub(pauseSub(base, '2026-05-01'), '2026-06-01');
  assert.equal(c.status, 'cancelled');
  assert.deepEqual(c.pauses, [{ from: '2026-05-01', to: '2026-06-01' }]);
});

test('reativar uma cancelada é reversível: o intervalo cancelado continua sem cobrança', () => {
  const c = cancelSub(base, '2026-03-01');
  const r = resumeSub(c, '2026-06-01');
  assert.equal(r.status, 'active');
  assert.equal(r.cancelledAt, '');
  assert.deepEqual(r.pauses, [{ from: '2026-03-01', to: '2026-06-01' }]);
  assert.equal(isInactiveOn(r, '2026-04-15'), true);
  assert.equal(isInactiveOn(r, '2026-06-01'), false);
});

test('reativar no mesmo dia do cancelamento não cria período vazio', () => {
  const r = resumeSub(cancelSub(base, '2026-03-01'), '2026-03-01');
  assert.deepEqual(r.pauses, []);
  assert.equal(r.status, 'active');
});

test('normalizeSub preserva status, pausas e cancelamento válidos (ida e volta do backup)', () => {
  const sub = cancelSub(resumeSub(pauseSub(base, '2026-02-01'), '2026-03-01'), '2026-09-01');
  const again = normalizeSub(JSON.parse(JSON.stringify(sub)));
  assert.equal(again.status, 'cancelled');
  assert.equal(again.cancelledAt, '2026-09-01');
  assert.deepEqual(again.pauses, [{ from: '2026-02-01', to: '2026-03-01' }]);
});

test('editar a assinatura (buildSub) não perde o status', () => {
  const paused = pauseSub(buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: '10' }, '2026-01-01'), '2026-05-01');
  const edited = buildSub(paused, { ...formFromSub(paused), price: '20' }, '2026-10-14');
  assert.equal(edited.status, 'paused');
  assert.deepEqual(edited.pauses, [{ from: '2026-05-01', to: '' }]);
  const cancelled = cancelSub(paused, '2026-06-01');
  const edited2 = buildSub(cancelled, { ...formFromSub(cancelled), price: '20' }, '2026-10-14');
  assert.equal(edited2.cancelledAt, '2026-06-01');
});
