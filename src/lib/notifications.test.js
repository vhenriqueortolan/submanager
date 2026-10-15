import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingDue, describe } from './notifications.js';

const now = new Date(2026, 9, 14); // 14/10/2026
const sub = (name, due, extra = {}) => ({ id: name, name, dueDate: String(due), createdAt: '2026-01-01', paidCycle: '', lastNotified: '', price: 40, paymentMethod: 'Pix', ...extra });

test('inclui vence-hoje e atrasadas; ignora pagas, futuras e já notificadas hoje', () => {
  const subs = [
    sub('Hoje', 14),
    sub('Atrasada', 11),
    sub('Paga', 14, { paidCycle: '2026-10' }),
    sub('Futura', 20, { createdAt: '2026-10-14' }),
    sub('JaAvisada', 14, { lastNotified: '2026-10-14' }),
    sub('SemDia', ''),
  ];
  assert.deepEqual(pendingDue(subs, now).map((p) => p.sub.name), ['Hoje', 'Atrasada']);
});

test('avisa de novo no dia seguinte', () => {
  const s = sub('Atrasada', 11, { lastNotified: '2026-10-13' });
  assert.equal(pendingDue([s], now).length, 1);
});

test('textos das notificações', () => {
  const [hoje, atrasada] = pendingDue([sub('Hoje', 14), sub('Atrasada', 11)], now);
  assert.match(describe(hoje.sub, hoje.st).title, /vence hoje/);
  const d = describe(atrasada.sub, atrasada.st);
  assert.match(d.title, /atrasada/);
  assert.match(d.body, /3 dias/);
});
