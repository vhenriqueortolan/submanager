import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, normalize, parseImport, STORAGE_KEY } from './storage.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

test('sem dados -> estado padrão não onboarded', () => {
  const s = loadState(fakeStorage());
  assert.equal(s.onboarded, false);
  assert.deepEqual(s.subs, []);
});

test('JSON corrompido não quebra e fica guardado como backup', () => {
  const st = fakeStorage({ [STORAGE_KEY]: '{quebrado' });
  const s = loadState(st);
  assert.equal(s.onboarded, false);
  assert.equal(st.data[`${STORAGE_KEY}:corrupt-backup`], '{quebrado');
});

test('recupera dados de chave legada', () => {
  const st = fakeStorage({
    subDataV4: JSON.stringify({ name: 'Antigo', budget: '300', subs: [{ name: 'Netflix', price: '39.9', dueDate: '10' }] }),
  });
  const s = loadState(st);
  assert.equal(s.name, 'Antigo');
  assert.equal(s.budget, 300);
  assert.equal(s.subs[0].price, 39.9);
  assert.equal(s.onboarded, true);
});

test('estado parcial é normalizado e recebe ids únicos', () => {
  const s = normalize({ name: 'P', subs: [{ name: 'A', id: 'x' }, { name: 'B', id: 'x' }, { nome: 'sem name' }] });
  assert.equal(s.subs.length, 2);
  assert.notEqual(s.subs[0].id, s.subs[1].id);
  assert.deepEqual(s.interests, []);
  assert.equal(s.onboarded, true);
});

test('normalização é idempotente (evita ping-pong entre abas)', () => {
  const once = normalize({ name: 'V', subs: [{ name: 'A', dueDate: '5' }] });
  const twice = normalize(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice, once);
});

test('save + load fazem round-trip', () => {
  const st = fakeStorage();
  const s = normalize({ onboarded: true, name: 'V', budget: 500, interests: ['IA'], subs: [{ name: 'A', price: 10, dueDate: '3' }] });
  assert.equal(saveState(s, st), true);
  assert.deepEqual(loadState(st), s);
});

test('saveState retorna false quando o storage falha', () => {
  const st = { setItem() { throw new Error('quota'); } };
  assert.equal(saveState({}, st), false);
});

test('parseImport valida o formato', () => {
  assert.throws(() => parseImport('nao é json'), /JSON válido/);
  assert.throws(() => parseImport('[1,2]'), /não reconhecido/);
  assert.throws(() => parseImport('{"foo":1}'), /não reconhecido/);
  const s = parseImport(JSON.stringify({ name: 'V', subs: [{ name: 'A' }] }));
  assert.equal(s.onboarded, true);
  assert.equal(s.subs.length, 1);
});
