import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileSummary, budgetSummary, notificationsSummary, dataSummary, aboutSummary } from './profile-summary.js';

test('Meu perfil: nome e quantidade de interesses', () => {
  assert.equal(profileSummary({ name: 'Victor', interests: ['IA', 'Games'] }), 'Victor · 2 interesses');
  assert.equal(profileSummary({ name: 'Victor', interests: ['IA'] }), 'Victor · 1 interesse');
  assert.equal(profileSummary({ name: 'Victor', interests: [] }), 'Victor · Sem interesses');
  assert.equal(profileSummary({ name: '', interests: [] }), 'Sem interesses');
});

test('Orçamento: valor e pessoas', () => {
  assert.equal(budgetSummary({ budget: 300, people: [{}, {}] }), 'R$ 300 por mês · dividindo com 2');
  assert.equal(budgetSummary({ budget: 300.5, people: [] }), 'R$ 300,50 por mês');
  assert.equal(budgetSummary({ budget: 0, people: [] }), 'Sem valor definido');
  assert.equal(budgetSummary({ budget: 0, people: [{}] }), 'Sem valor definido · dividindo com 1');
});

test('Notificações: ativas com antecedência ou desligadas', () => {
  assert.equal(notificationsSummary({ enabled: true, advanceDays: 1 }), 'Ativas · 1 dia antes');
  assert.equal(notificationsSummary({ enabled: true, advanceDays: 7 }), 'Ativas · 7 dias antes');
  assert.equal(notificationsSummary({ enabled: true, advanceDays: 0 }), 'Ativas');
  assert.equal(notificationsSummary({ enabled: false, advanceDays: 3 }), 'Desligadas');
});

test('Dados e privacidade: data do último backup', () => {
  assert.equal(dataSummary({ lastBackupAt: '2026-10-03' }), 'Último backup em 03/10');
  assert.equal(dataSummary({ lastBackupAt: '' }), 'Nenhum backup ainda');
  assert.equal(dataSummary({}), 'Nenhum backup ainda');
});

test('Sobre: versão e feedback', () => {
  assert.equal(aboutSummary('2.3.0', 'https://x'), 'v2.3.0 · Enviar feedback');
  assert.equal(aboutSummary('2.3.0', ''), 'v2.3.0');
});
