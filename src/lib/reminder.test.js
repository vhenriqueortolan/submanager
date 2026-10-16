import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupDue, snoozeUntil, withBackupStamp } from './reminder.js';

const st = (extra = {}) => ({ subs: [{ id: 'a' }], lastBackupAt: '', backupSnoozeUntil: '', ...extra });
const today = '2026-10-15';

test('sem assinaturas, nunca lembra', () => {
  assert.equal(backupDue(st({ subs: [] }), today), false);
});

test('nunca exportou: lembra', () => {
  assert.equal(backupDue(st(), today), true);
});

test('última exportação há 30 dias não lembra; há 31 lembra', () => {
  assert.equal(backupDue(st({ lastBackupAt: '2026-09-15' }), today), false);
  assert.equal(backupDue(st({ lastBackupAt: '2026-09-14' }), today), true);
});

test('virada de ano na contagem de dias', () => {
  assert.equal(backupDue(st({ lastBackupAt: '2025-12-20' }), '2026-01-15'), false);
  assert.equal(backupDue(st({ lastBackupAt: '2025-12-10' }), '2026-01-15'), true);
});

test('"Agora não" oculta por 7 dias', () => {
  const until = snoozeUntil(today);
  assert.equal(until, '2026-10-22');
  assert.equal(backupDue(st({ backupSnoozeUntil: until }), '2026-10-21'), false);
  assert.equal(backupDue(st({ backupSnoozeUntil: until }), '2026-10-22'), true);
});

test('snooze atravessa o fim do mês', () => {
  assert.equal(snoozeUntil('2026-12-28'), '2027-01-04');
});

test('o arquivo exportado leva a data do backup', () => {
  const out = withBackupStamp({ name: 'V', lastBackupAt: '' }, new Date(2026, 9, 15));
  assert.equal(out.lastBackupAt, '2026-10-15');
  assert.equal(out.name, 'V');
});
