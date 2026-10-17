import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearAllData, matchesConfirmation, STORAGE_KEY, LEGACY_KEYS, loadState } from './storage.js';

/** Storage falso com a API de enumeração do localStorage (length/key/removeItem). */
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    get length() {
      return Object.keys(data).length;
    },
    key: (i) => Object.keys(data)[i] ?? null,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

test('remove a chave atual, as legadas e os backups de JSON corrompido', () => {
  const st = fakeStorage({
    [STORAGE_KEY]: '{"name":"V"}',
    ...Object.fromEntries(LEGACY_KEYS.map((k) => [k, '{}'])),
    [`${STORAGE_KEY}:corrupt-backup`]: '{quebrado',
    'subDataV3:corrupt-backup': '{x',
  });
  assert.equal(clearAllData(st), true);
  assert.deepEqual(Object.keys(st.data), []);
});

test('preserva chaves que não são do app', () => {
  const st = fakeStorage({
    [STORAGE_KEY]: '{}',
    outraCoisa: '1',
    'tema:corrupt': 'x',
    'corrupt-backup': 'y',
  });
  clearAllData(st);
  assert.deepEqual(Object.keys(st.data).sort(), ['corrupt-backup', 'outraCoisa', 'tema:corrupt']);
});

test('depois de apagar, o estado carregado é o padrão (volta ao onboarding)', () => {
  const st = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ onboarded: true, name: 'V', subs: [{ name: 'A', price: 1, dueDate: '5' }] }) });
  clearAllData(st);
  const s = loadState(st);
  assert.equal(s.onboarded, false);
  assert.deepEqual(s.subs, []);
  assert.deepEqual(s.people, []);
});

test('storage vazio ou sem as chaves: não falha', () => {
  assert.equal(clearAllData(fakeStorage()), true);
});

test('storage indisponível devolve false sem lançar', () => {
  const broken = {
    get length() {
      throw new Error('bloqueado');
    },
  };
  assert.equal(clearAllData(broken), false);
});

test('falha ao remover uma chave devolve false', () => {
  const st = fakeStorage({ [STORAGE_KEY]: '{}' });
  st.removeItem = () => {
    throw new Error('negado');
  };
  assert.equal(clearAllData(st), false);
});

test('confirmação exige a palavra exata (ignora só espaços nas pontas)', () => {
  assert.equal(matchesConfirmation('APAGAR', 'APAGAR'), true);
  assert.equal(matchesConfirmation('  APAGAR ', 'APAGAR'), true);
  assert.equal(matchesConfirmation('apagar', 'APAGAR'), false);
  assert.equal(matchesConfirmation('APAGA', 'APAGAR'), false);
  assert.equal(matchesConfirmation('', 'APAGAR'), false);
  assert.equal(matchesConfirmation(undefined, 'APAGAR'), false);
});
