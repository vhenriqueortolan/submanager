import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoneyInput, moneyToInput } from './budget.js';

test('vazio e zero valem 0 (sem teto)', () => {
  assert.equal(parseMoneyInput(''), 0);
  assert.equal(parseMoneyInput('   '), 0);
  assert.equal(parseMoneyInput(undefined), 0);
  assert.equal(parseMoneyInput('0'), 0);
  assert.equal(parseMoneyInput('0,00'), 0);
});

test('aceita vírgula e ponto como decimal', () => {
  assert.equal(parseMoneyInput('300'), 300);
  assert.equal(parseMoneyInput('300,50'), 300.5);
  assert.equal(parseMoneyInput('300.50'), 300.5);
  assert.equal(parseMoneyInput('R$ 12,9'), 12.9);
});

test('com os dois separadores, o último é o decimal', () => {
  assert.equal(parseMoneyInput('1.234,50'), 1234.5);
  assert.equal(parseMoneyInput('1,234.50'), 1234.5);
});

test('texto inválido ou negativo devolve null', () => {
  assert.equal(parseMoneyInput('abc'), null);
  assert.equal(parseMoneyInput('12a'), null);
  assert.equal(parseMoneyInput('-5'), null);
  assert.equal(parseMoneyInput('1,2,3'), null);
  assert.equal(parseMoneyInput(','), null);
});

test('arredonda para centavos', () => {
  assert.equal(parseMoneyInput('10,999'), 11);
});

test('moneyToInput volta ao texto do campo', () => {
  assert.equal(moneyToInput(300), '300');
  assert.equal(moneyToInput(300.5), '300,5');
  assert.equal(moneyToInput(0), '');
  assert.equal(moneyToInput(undefined), '');
});
