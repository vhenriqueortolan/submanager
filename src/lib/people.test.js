import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharers, myShare, cleanName, resolvePerson, removePersonFromState } from './people.js';
import { monthlyTotal, annualProjection, totalServiceMonthly } from './totals.js';
import { normalizeSub, normalize, parseImport } from './storage.js';
import { buildSub, emptyForm, formFromSub } from './subs.js';
import { describe } from './notifications.js';

const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bruno' }];

test('sem divisão, a sua parte é o preço cheio', () => {
  assert.equal(myShare({ price: 39.9 }, people), 39.9);
  assert.equal(myShare({ price: 39.9, sharedWith: [] }, people), 39.9);
  assert.deepEqual(sharers({ sharedWith: undefined }, people), []);
});

test('R$ 39,90 mensal dividida com 2 pessoas = R$ 13,30', () => {
  assert.equal(myShare({ price: 39.9, sharedWith: ['a', 'b'] }, people), 13.3);
});

test('ids inexistentes e repetidos são ignorados', () => {
  const sub = { price: 30, sharedWith: ['a', 'fantasma', 'a'] };
  assert.deepEqual(sharers(sub, people), ['a']);
  assert.equal(myShare(sub, people), 15);
});

test('R$ 120 anual dividida com 2 pessoas = R$ 40 por ano', () => {
  const sub = { price: 120, cycle: 'yearly', sharedWith: ['a', 'b'] };
  assert.equal(annualProjection([sub], people), 40);
  assert.equal(monthlyTotal([sub], people), 3.33);
});

test('totais: sua parte x total dos serviços', () => {
  const subs = [{ price: 39.9, sharedWith: ['a', 'b'] }, { price: 20 }];
  assert.equal(monthlyTotal(subs, people), 33.3);
  assert.equal(totalServiceMonthly(subs), 59.9);
});

test('totais sem o argumento people mantêm os números atuais', () => {
  const subs = [{ price: 50, sharedWith: ['a'] }];
  assert.equal(monthlyTotal(subs), 50);
  assert.equal(annualProjection(subs), 600);
});

test('semanal dividida: parte anual proporcional', () => {
  const sub = { price: 10, cycle: 'weekly', sharedWith: ['a'] };
  assert.equal(annualProjection([sub], people), 260);
});

test('cleanName: espaços extras e limite de 40 caracteres', () => {
  assert.equal(cleanName('  Ana   Maria  '), 'Ana Maria');
  assert.equal(cleanName('x'.repeat(60)).length, 40);
  assert.equal(cleanName('   '), '');
  assert.equal(cleanName(undefined), '');
});

test('resolvePerson reutiliza o id ignorando maiúsculas e minúsculas', () => {
  const r = resolvePerson(people, '  ana ');
  assert.equal(r.isNew, false);
  assert.equal(r.person.id, 'a');
  const n = resolvePerson(people, 'Carla');
  assert.equal(n.isNew, true);
  assert.equal(n.person.name, 'Carla');
  assert.ok(n.person.id);
  assert.equal(resolvePerson(people, '   '), null);
});

test('remover pessoa tira o id de todas as assinaturas', () => {
  const st = {
    people,
    subs: [{ id: '1', sharedWith: ['a', 'b'] }, { id: '2', sharedWith: ['b'] }, { id: '3', sharedWith: [] }],
  };
  const next = removePersonFromState(st, 'b');
  assert.deepEqual(next.people.map((p) => p.id), ['a']);
  assert.deepEqual(next.subs.map((s) => s.sharedWith), [['a'], [], []]);
});

test('normalização: assinatura antiga ganha sharedWith [] e estado ganha people []', () => {
  const s = normalizeSub({ name: 'A', price: 1, dueDate: '5', createdAt: '2026-01-01' });
  assert.deepEqual(s.sharedWith, []);
  const st = parseImport(JSON.stringify({ name: 'V', subs: [{ name: 'A', price: 1, dueDate: '5' }] }));
  assert.deepEqual(st.people, []);
});

test('normalização de people: nomes limpos, ids únicos, inválidos descartados', () => {
  const st = normalize({
    people: [
      { id: 'a', name: '  Ana  ' },
      { id: 'a', name: 'Outra' },
      { id: 'c', name: '   ' },
      null,
      'x',
    ],
  });
  assert.equal(st.people.length, 2);
  assert.equal(st.people[0].name, 'Ana');
  assert.notEqual(st.people[0].id, st.people[1].id);
});

test('form: sharedWith vai e volta da assinatura', () => {
  assert.deepEqual(emptyForm().sharedWith, []);
  const sub = buildSub(null, { ...emptyForm({ name: 'A' }), dueDate: '5', sharedWith: ['a', 'a', 'b'] }, '2026-10-15');
  assert.deepEqual(sub.sharedWith, ['a', 'b']);
  assert.deepEqual(formFromSub(sub).sharedWith, ['a', 'b']);
  assert.deepEqual(formFromSub({ name: 'x' }).sharedWith, []);
});

test('aviso de vencimento mostra a sua parte quando dividido', () => {
  const sub = { name: 'Netflix', price: 39.9, paymentMethod: 'Cartão', sharedWith: ['a', 'b'] };
  const body = describe(sub, { type: 'today' }, people).body;
  assert.match(body, /39,90/);
  assert.match(body, /sua parte/i);
  assert.match(body, /13,30/);
  const solo = describe({ ...sub, sharedWith: [] }, { type: 'today' }, people).body;
  assert.doesNotMatch(solo, /sua parte/i);
});
