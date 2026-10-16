import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestPersistence } from './storage.js';

test('pede persistência quando suportado e ainda não concedida', async () => {
  let calls = 0;
  const manager = { persisted: async () => false, persist: async () => { calls += 1; return true; } };
  assert.equal(await requestPersistence(manager), true);
  assert.equal(calls, 1);
});

test('já persistente: não pede de novo', async () => {
  let calls = 0;
  const manager = { persisted: async () => true, persist: async () => { calls += 1; return true; } };
  assert.equal(await requestPersistence(manager), true);
  assert.equal(calls, 0);
});

test('navegador nega, não suporta ou lança: retorna false sem quebrar', async () => {
  assert.equal(await requestPersistence({ persist: async () => false }), false);
  assert.equal(await requestPersistence(undefined), false);
  assert.equal(await requestPersistence({}), false);
  assert.equal(await requestPersistence({ persist: async () => { throw new Error('x'); } }), false);
});
