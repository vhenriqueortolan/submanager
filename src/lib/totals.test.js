import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyTotal, annualProjection } from './totals.js';

test('soma mensal sem ruído de ponto flutuante', () => {
  assert.equal(monthlyTotal([{ price: 39.9 }, { price: 21.9 }, { price: 19.9 }]), 81.7);
  assert.equal(monthlyTotal([]), 0);
});

test('ignora preços inválidos', () => {
  assert.equal(monthlyTotal([{ price: 'abc' }, { price: undefined }, { price: '10.5' }]), 10.5);
});

test('projeção anual = 12 × total mensal', () => {
  assert.equal(annualProjection([{ price: 50 }, { price: 50 }, { price: 50 }]), 1800);
  assert.equal(annualProjection([{ price: 39.9 }]), 478.8);
});
