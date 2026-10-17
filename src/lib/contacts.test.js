import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPickerResult, pickContacts, prepareCandidates, supportsContactPicker } from './contacts.js';
import { NAME_ERRORS, newPerson, updatePerson } from './people.js';

test('o seletor só vale com a API e contexto seguro', () => {
  const nav = { contacts: { select() {} } };
  assert.equal(supportsContactPicker(nav, true), true);
  assert.equal(supportsContactPicker(nav, false), false);
  assert.equal(supportsContactPicker({}, true), false);
  assert.equal(supportsContactPicker(undefined, true), false);
});

test('resultado do seletor vira nome, telefone e e-mail (primeiro de cada)', () => {
  assert.deepEqual(fromPickerResult({ name: ['Ana'], tel: ['+5511912345678', '1'], email: [] }), { name: 'Ana', phone: '+5511912345678', email: '' });
  assert.deepEqual(fromPickerResult({}), { name: '', phone: '', email: '' });
});

test('pickContacts pede nome, telefone e e-mail, uma pessoa só; cancelar devolve vazio', async () => {
  let args;
  const nav = { contacts: { select: async (...a) => { args = a; return [{ name: ['Bia'], tel: ['11 98888-7777'], email: ['b@b.com'] }]; } } };
  assert.deepEqual(await pickContacts(nav), [{ name: 'Bia', phone: '11 98888-7777', email: 'b@b.com' }]);
  assert.deepEqual(args, [['name', 'tel', 'email'], { multiple: false }]);
  const abort = { contacts: { select: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } } };
  assert.deepEqual(await pickContacts(abort), []);
  const boom = { contacts: { select: async () => { throw new Error('falha'); } } };
  await assert.rejects(() => pickContacts(boom), /falha/);
});

test('revisão: normaliza telefone, sugere país e marca nome vazio e repetido', () => {
  const list = prepareCandidates(
    [
      { name: 'Ana', phone: '(11) 91234-5678', email: 'ana@exemplo.com' },
      { name: 'Rui', phone: '+351 912 345 678', email: 'ruim' },
      { name: '', phone: '123' },
      { name: 'ana' }, // repetida dentro do lote
      { name: 'Bruno' }, // já cadastrada
    ],
    [{ id: 'b', name: 'BRUNO' }],
  );
  assert.deepEqual(list.map((c) => c.error), ['', '', NAME_ERRORS.empty, NAME_ERRORS.duplicate, NAME_ERRORS.duplicate]);
  assert.deepEqual(list.map((c) => c.selected), [true, true, false, false, false]);
  assert.deepEqual([list[0].phone, list[0].phoneCountry, list[0].email], ['+5511912345678', 'BR', 'ana@exemplo.com']);
  assert.deepEqual([list[1].phone, list[1].phoneCountry, list[1].email], ['+351912345678', 'PT', '']);
  assert.deepEqual([list[2].phone, list[2].phoneCountry], ['', '']);
});

test('newPerson e updatePerson aplicam nome e contato', () => {
  const people = [{ id: 'a', name: 'Ana', phone: '+5511912345678', phoneCountry: 'BR' }, { id: 'b', name: 'Bruno' }];
  assert.equal(newPerson(people, { name: ' ana ' }).error, 'duplicate');
  assert.equal(newPerson(people, { name: '  ' }).error, 'empty');
  const { person } = newPerson(people, { name: 'Carla', phone: '+351912345678', phoneCountry: 'PT', email: 'c@c.com' });
  assert.deepEqual({ ...person, id: 'x' }, { id: 'x', name: 'Carla', phone: '+351912345678', phoneCountry: 'PT', email: 'c@c.com' });

  const upd = updatePerson(people, 'a', { name: 'Ana Paula', email: 'ana@exemplo.com' });
  assert.deepEqual(upd.people[0], { id: 'a', name: 'Ana Paula', email: 'ana@exemplo.com' }); // telefone apagado de propósito
  assert.equal(updatePerson(people, 'a', { name: 'bruno' }).error, 'duplicate');
  assert.equal(updatePerson(people, 'a', { name: 'ANA' }).people[0].name, 'ANA'); // mudar só maiúsculas vale
});
