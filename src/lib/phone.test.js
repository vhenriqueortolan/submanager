import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, DEFAULT_COUNTRY, emailError, normalizePhone, phoneError, suggestCountry } from './phone.js';

test('a tabela tem Brasil (+55) como padrão e ISO sem repetição', () => {
  assert.equal(DEFAULT_COUNTRY, 'BR');
  assert.equal(COUNTRIES.find((c) => c.iso === 'BR').dial, '55');
  assert.equal(new Set(COUNTRIES.map((c) => c.iso)).size, COUNTRIES.length);
});

test('número com + sugere o país pelo código mais longo', () => {
  assert.deepEqual(suggestCountry('+351 912 345 678'), { iso: 'PT', dial: '351', ambiguous: false });
  assert.equal(suggestCountry('+55 11 91234-5678').iso, 'BR');
  assert.equal(suggestCountry('+598 99 123 456').iso, 'UY'); // 598, não 59 nem 5
  assert.equal(suggestCountry('+5511912345678').iso, 'BR');
  assert.equal(suggestCountry('0044 20 7946 0958').iso, 'GB'); // 00 vale como +
});

test('+1 é ambíguo: sugere EUA e avisa', () => {
  assert.deepEqual(suggestCountry('+1 202 555 0100'), { iso: 'US', dial: '1', ambiguous: true });
});

test('número sem + nunca sugere país', () => {
  assert.equal(suggestCountry('11 91234-5678'), null);
  assert.equal(suggestCountry('5511912345678'), null);
  assert.equal(suggestCountry(''), null);
});

test('normaliza para o formato internacional', () => {
  assert.equal(normalizePhone('(11) 91234-5678'), '+5511912345678'); // sem +: país selecionado (Brasil)
  assert.equal(normalizePhone('011 91234-5678', 'BR'), '+5511912345678'); // zero de tronco sai
  assert.equal(normalizePhone('912 345 678', 'PT'), '+351912345678');
  assert.equal(normalizePhone('+1 202 555 0100', 'BR'), '+12025550100'); // com +, o país selecionado não vale
  assert.equal(normalizePhone('0044 20 7946 0958'), '+442079460958');
});

test('tamanho: 8 a 15 dígitos no total', () => {
  assert.equal(normalizePhone('+1234567'), ''); // 7
  assert.equal(normalizePhone('+12345678'), '+12345678'); // 8
  assert.equal(normalizePhone('+123456789012345'), '+123456789012345'); // 15
  assert.equal(normalizePhone('+1234567890123456'), ''); // 16
  assert.equal(normalizePhone('', 'BR'), '');
  assert.equal(normalizePhone('abc'), '');
});

test('telefone e e-mail são opcionais: vazio não é erro', () => {
  assert.equal(phoneError(''), '');
  assert.equal(phoneError('   '), '');
  assert.equal(phoneError('(11) 91234-5678'), '');
  assert.match(phoneError('123'), /8 a 15 dígitos/);
  assert.equal(emailError(''), '');
  assert.equal(emailError('ana@exemplo.com'), '');
  assert.match(emailError('ana@'), /e-mail válido/);
});
