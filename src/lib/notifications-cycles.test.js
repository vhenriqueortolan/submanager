import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingDue, describe } from './notifications.js';

const now = new Date(2026, 9, 15); // quinta-feira, 15/10/2026
const base = { id: 'x', name: 'Serviço', price: 40, paymentMethod: 'Pix', createdAt: '2026-01-01', paidCycle: '', lastNotified: '' };

test('anual vencendo hoje e semanal atrasada entram nos pendentes', () => {
  const subs = [
    { ...base, id: 'a', cycle: 'yearly', dueDate: '15', dueMonth: '10' },
    { ...base, id: 's', cycle: 'weekly', dueWeekday: '2' },
    { ...base, id: 'f', cycle: 'yearly', dueDate: '16', dueMonth: '10', createdAt: '2026-10-01' },
  ];
  assert.deepEqual(pendingDue(subs, now).map((p) => `${p.sub.id}:${p.st.type}`), ['a:today', 's:overdue']);
});

test('textos de atraso por ciclo', () => {
  const weekly = { ...base, cycle: 'weekly', dueWeekday: '1' };
  const w = describe(weekly, { type: 'overdue', days: 3, cycle: '2026-10-12' });
  assert.match(w.body, /Venceu há 3 dias \(toda segunda\)/);
  const sunday = describe({ ...base, cycle: 'weekly', dueWeekday: '0' }, { type: 'overdue', days: 1, cycle: 'k' });
  assert.match(sunday.body, /Venceu há 1 dia \(todo domingo\)/);
  const yearly = describe({ ...base, cycle: 'yearly', dueDate: '5', dueMonth: '3' }, { type: 'overdue', days: 2, cycle: '2026' });
  assert.match(yearly.body, /Venceu há 2 dias \(dia 05\/03\)/);
  const monthly = describe({ ...base, dueDate: '10' }, { type: 'overdue', days: 3, cycle: '2026-10' });
  assert.match(monthly.body, /Venceu há 3 dias \(dia 10\)/);
  assert.match(describe(weekly, { type: 'today', days: 0, cycle: 'k' }).title, /vence hoje/);
});
