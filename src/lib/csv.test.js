import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assinaturasCsv, campo, CSV_FILENAME, CSV_HEADER } from './csv.js';

const sub = (extra = {}) => ({ id: 'a', name: 'Spotify', category: 'Streaming', price: 21.9, cycle: 'monthly', dueDate: '10', paymentMethod: 'Cartão', ...extra });
const linhas = (csv) => csv.replace('﻿', '').split('\r\n').slice(0, -1);

test('nome do arquivo e colunas', () => {
  assert.equal(CSV_FILENAME, 'submanager-assinaturas.csv');
  assert.deepEqual(CSV_HEADER, ['Nome', 'Categoria', 'Valor', 'Ciclo', 'Dia', 'Método', 'Status']);
});

test('UTF-8 com BOM, separador ; e linhas com CRLF', () => {
  const csv = assinaturasCsv([sub()]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.deepEqual(linhas(csv), ['Nome;Categoria;Valor;Ciclo;Dia;Método;Status', 'Spotify;Streaming;21,90;Mensal;10;Cartão;Ativa']);
  assert.ok(csv.endsWith('\r\n'));
  assert.equal(Buffer.from(csv, 'utf8').subarray(0, 3).toString('hex'), 'efbbbf');
});

test('sem assinaturas: só o cabeçalho', () => {
  assert.deepEqual(linhas(assinaturasCsv([])), ['Nome;Categoria;Valor;Ciclo;Dia;Método;Status']);
});

test('valor com vírgula decimal e duas casas', () => {
  const v = (price) => linhas(assinaturasCsv([sub({ price })]))[1].split(';')[2];
  assert.equal(v(50), '50,00');
  assert.equal(v(21.9), '21,90');
  assert.equal(v(0.5), '0,50');
  assert.equal(v(1234.567), '1234,57');
  assert.equal(v(''), '');
  assert.equal(v(0), '0,00');
  assert.equal(v(undefined), '');
  assert.equal(v('abc'), '');
});

test('campos com ponto e vírgula, aspas ou quebra de linha vão entre aspas, com as aspas dobradas', () => {
  assert.equal(campo('simples'), 'simples');
  assert.equal(campo('a;b'), '"a;b"');
  assert.equal(campo('ele disse "oi"'), '"ele disse ""oi"""');
  assert.equal(campo('duas\nlinhas'), '"duas\nlinhas"');
  assert.equal(campo('retorno\rcarro'), '"retorno\rcarro"');
  const csv = assinaturasCsv([sub({ name: 'Nome; com "aspas"\ne quebra' })]);
  assert.equal(csv.replace('﻿', '').split('\r\n')[1].startsWith('"Nome; com ""aspas""\ne quebra";Streaming'), true);
});

test('texto que começa como fórmula ganha apóstrofo (planilha não executa)', () => {
  const [, l] = linhas(assinaturasCsv([sub({ name: '=SOMA(A1)', category: '+1', paymentMethod: '@x' })]));
  assert.equal(l.startsWith("'=SOMA(A1);'+1;21,90;Mensal;10;'@x;Ativa"), true);
});

test('ciclo, dia e status', () => {
  const c = (extra) => linhas(assinaturasCsv([sub(extra)]))[1].split(';');
  assert.deepEqual(c({ cycle: 'weekly', dueWeekday: '1', dueDate: '' }).slice(3, 5), ['Semanal', 'Segunda']);
  assert.deepEqual(c({ cycle: 'yearly', dueDate: '5', dueMonth: '3' }).slice(3, 5), ['Anual', '5 de Março']);
  assert.deepEqual(c({ cycle: undefined }).slice(3, 5), ['Mensal', '10'], 'sem ciclo, vale mensal (dados antigos)');
  assert.equal(c({ dueDate: '' })[4], '');
  assert.equal(c({ status: 'paused', pauses: [{ from: '2026-10-01', to: '' }] })[6], 'Pausada');
  assert.equal(c({ status: 'cancelled', cancelledAt: '2026-10-01' })[6], 'Cancelada');
});

test('uma linha por assinatura, na ordem recebida', () => {
  const csv = assinaturasCsv([sub({ name: 'B' }), sub({ name: 'A' })]);
  assert.deepEqual(linhas(csv).slice(1).map((l) => l.split(';')[0]), ['B', 'A']);
});
