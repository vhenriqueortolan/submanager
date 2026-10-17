import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PULL_MAX, PULL_THRESHOLD, canStartPull, isVerticalPull, pullDistance, pullProgress, shouldTrigger } from './pull.js';

const ok = { scrollY: 0, openScreens: 0, locked: false, touches: 1, refreshing: false };

test('o limiar é 70 px de descida do indicador', () => {
  assert.equal(PULL_THRESHOLD, 70);
});

test('a resistência faz o indicador andar metade do dedo', () => {
  assert.equal(pullDistance(100), 50);
  assert.equal(pullDistance(140), 70);
});

test('movimento para cima ou parado não desce nada; o teto vale', () => {
  assert.equal(pullDistance(-30), 0);
  assert.equal(pullDistance(0), 0);
  assert.equal(pullDistance(NaN), 0);
  assert.equal(pullDistance(1000), PULL_MAX);
});

test('só dispara ao soltar no limiar ou além', () => {
  assert.equal(shouldTrigger(pullDistance(139)), false); // 69,5
  assert.equal(shouldTrigger(pullDistance(140)), true); // 70
  assert.equal(shouldTrigger(pullDistance(400)), true);
  assert.equal(shouldTrigger(0), false);
});

test('progresso vai de 0 a 1', () => {
  assert.equal(pullProgress(0), 0);
  assert.equal(pullProgress(35), 0.5);
  assert.equal(pullProgress(500), 1);
});

test('começa só no topo, sem telas abertas, sem trava, com um dedo e sem atualização em curso', () => {
  assert.equal(canStartPull(ok), true);
  assert.equal(canStartPull({ ...ok, scrollY: 1 }), false);
  assert.equal(canStartPull({ ...ok, openScreens: 1 }), false);
  assert.equal(canStartPull({ ...ok, locked: true }), false);
  assert.equal(canStartPull({ ...ok, touches: 2 }), false);
  assert.equal(canStartPull({ ...ok, refreshing: true }), false);
});

test('gesto mais horizontal que vertical não é puxão', () => {
  assert.equal(isVerticalPull(5, 30), true);
  assert.equal(isVerticalPull(40, 30), false);
  assert.equal(isVerticalPull(0, -10), false);
});
