import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVCards } from './vcard.js';

const ana = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:Ana Souza', 'N:Souza;Ana;;;', 'TEL;TYPE=CELL:+55 11 91234-5678', 'EMAIL;TYPE=INTERNET:ana@exemplo.com', 'END:VCARD'].join('\r\n');

test('lê um vCard com nome, telefone e e-mail', () => {
  assert.deepEqual(parseVCards(ana), [{ name: 'Ana Souza', phone: '+55 11 91234-5678', email: 'ana@exemplo.com' }]);
});

test('lê vários vCards no mesmo arquivo', () => {
  const bruno = 'BEGIN:VCARD\nFN:Bruno\nTEL:11 98888-7777\nEND:VCARD';
  const list = parseVCards(`${ana}\n${bruno}\n`);
  assert.deepEqual(list.map((c) => c.name), ['Ana Souza', 'Bruno']);
  assert.equal(list[1].email, '');
});

test('sem FN, monta o nome a partir de N', () => {
  assert.equal(parseVCards('BEGIN:VCARD\nN:Lima;Carla;Maria;;\nEND:VCARD')[0].name, 'Carla Maria Lima');
});

test('desdobra linhas continuadas e ignora PHOTO', () => {
  const text = 'BEGIN:VCARD\nFN:Nome Muito\n  Comprido\nPHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQ\n AAAQABAAD/2wBDAAEBAQEBAQ\nTEL:+351912345678\nEND:VCARD';
  const [c] = parseVCards(text);
  assert.equal(c.name, 'Nome Muito Comprido');
  assert.equal(c.phone, '+351912345678');
});

test('usa o primeiro telefone e o primeiro e-mail; aceita grupo e minúsculas', () => {
  const [c] = parseVCards('begin:vcard\nfn:Dora\nitem1.TEL:111\ntel:222\nemail:a@a.com\nemail:b@b.com\nend:vcard');
  assert.deepEqual(c, { name: 'Dora', phone: '111', email: 'a@a.com' });
});

test('desfaz o escape de vírgula e ponto e vírgula', () => {
  assert.equal(parseVCards('BEGIN:VCARD\nFN:Silva\\, João\nEND:VCARD')[0].name, 'Silva, João');
});

test('texto sem vCard ou vazio devolve lista vazia', () => {
  assert.deepEqual(parseVCards(''), []);
  assert.deepEqual(parseVCards('qualquer coisa'), []);
  assert.deepEqual(parseVCards(null), []);
});
