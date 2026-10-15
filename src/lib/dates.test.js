import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueStatus, dueOn, todayStr, parseDay } from './dates.js';

const mk = (due, created, paid = '') => ({ dueDate: String(due), createdAt: created, paidCycle: paid });
const fmt = (s) => (s ? `${s.type}/${s.days}/${s.cycle}` : 'null');

test('todayStr / parseDay são inversos', () => {
  assert.equal(todayStr(new Date(2026, 9, 14)), '2026-10-14');
  assert.equal(parseDay('2026-10-14').getTime(), new Date(2026, 9, 14).getTime());
  assert.equal(parseDay('14/10/2026'), null);
});

test('dia 31 em fevereiro vence no último dia do mês', () => {
  assert.equal(dueOn(2026, 1, 31).getDate(), 28);
  assert.equal(dueOn(2028, 1, 31).getDate(), 29);
});

test('vence hoje', () => {
  assert.equal(fmt(dueStatus(mk(14, '2026-01-01'), new Date(2026, 9, 14))), 'today/0/2026-10');
  assert.equal(fmt(dueStatus(mk(31, '2026-01-01'), new Date(2026, 1, 28))), 'today/0/2026-02');
});

test('atrasada: venceu neste mês ou no mês anterior e não foi paga', () => {
  assert.equal(fmt(dueStatus(mk(11, '2026-01-01'), new Date(2026, 9, 14))), 'overdue/3/2026-10');
  assert.equal(fmt(dueStatus(mk(31, '2026-01-01'), new Date(2026, 2, 1))), 'overdue/1/2026-02');
  assert.equal(fmt(dueStatus(mk(20, '2025-11-01'), new Date(2026, 0, 5))), 'overdue/16/2025-12'); // virada de ano
});

test('ciclo pago não aparece como pendente', () => {
  assert.equal(dueStatus(mk(20, '2025-11-01', '2025-12'), new Date(2026, 0, 5)), null);
  assert.equal(dueStatus(mk(14, '2026-01-01', '2026-10'), new Date(2026, 9, 14)), null);
});

test('futuro, sem vencimento e ciclos anteriores ao cadastro não geram status', () => {
  assert.equal(dueStatus(mk(20, '2026-10-14'), new Date(2026, 9, 14)), null); // próximo vencimento é futuro e o ciclo anterior é anterior ao cadastro
  assert.equal(dueStatus(mk('', '2026-01-01'), new Date(2026, 9, 14)), null);
  assert.equal(dueStatus(mk(5, '2026-10-14'), new Date(2026, 9, 14)), null); // venceu antes do cadastro
});

test('cadastrada hoje com vencimento hoje avisa', () => {
  assert.equal(fmt(dueStatus(mk(14, '2026-10-14'), new Date(2026, 9, 14))), 'today/0/2026-10');
});
