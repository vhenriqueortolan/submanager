import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  historyEntries, groupByMonth, filterEntries, periodRange, monthTotal, variationVsPreviousMonth, monthlyAverage,
  heaviest, spendByCategory, priceChanges, unmarkedManual, monthLabel, sumShare,
} from './history.js';
import { applyAutoCharges } from './auto-charges.js';
import { pauseSub, resumeSub, cancelSub } from './status.js';
import { normalizeSub } from './storage.js';

const sub = (extra = {}) => ({
  id: 's', name: 'Netflix', category: 'Streaming', price: 40, cycle: 'monthly', dueDate: '10', createdAt: '2026-01-01',
  paidCycle: '', payments: [], autoCharge: true, ...extra,
});
const rec = (id, paidAt, share, extra = {}) => ({
  id, cycle: paidAt.slice(0, 7), paidAt, amount: extra.price ?? share ?? 0, price: extra.price ?? share ?? 0, share, kind: 'manual', estimated: false, ...extra,
});
const today = '2026-10-14';
const day = (d) => new Date(2026, 9, d);

test('zero registros: tudo vazio e sem divisão por zero', () => {
  const entries = historyEntries([sub()]);
  assert.deepEqual(entries, []);
  assert.deepEqual(groupByMonth(entries), []);
  assert.equal(monthTotal(entries, '2026-10'), 0);
  assert.equal(monthlyAverage(entries, today), null);
  assert.equal(heaviest(entries), null);
  assert.deepEqual(spendByCategory(entries), []);
  assert.deepEqual(variationVsPreviousMonth(entries, today), { current: 0, previous: 0, diff: 0, percent: null });
  assert.deepEqual(priceChanges([sub()]), []);
});

test('lista do mais novo para o mais antigo e agrupada por mês, com total de cada mês', () => {
  const s = sub({ payments: [rec('a', '2026-08-10', 40), rec('b', '2026-10-10', 40), rec('c', '2026-10-02', 15)] });
  const months = groupByMonth(historyEntries([s]));
  assert.deepEqual(months.map((m) => m.month), ['2026-10', '2026-08']);
  assert.equal(months[0].total, 55);
  assert.deepEqual(months[0].entries.map((e) => e.id), ['b', 'c']);
});

test('virada de mês e de ano ficam no mês do registro', () => {
  const s = sub({ payments: [rec('a', '2025-12-31', 10), rec('b', '2026-01-01', 20)] });
  const months = groupByMonth(historyEntries([s]));
  assert.deepEqual(months.map((m) => [m.month, m.total]), [['2026-01', 20], ['2025-12', 10]]);
  assert.equal(variationVsPreviousMonth(historyEntries([s]), '2026-01-15').previous, 10);
});

test('períodos: mês, 12 meses (inclui o atual) e ano civil', () => {
  assert.deepEqual(periodRange('month', '2026-10-14'), ['2026-10', '2026-10']);
  assert.deepEqual(periodRange('12months', '2026-10-14'), ['2025-11', '2026-10']);
  assert.deepEqual(periodRange('12months', '2026-02-01'), ['2025-03', '2026-02']);
  assert.deepEqual(periodRange('year', '2026-10-14'), ['2026-01', '2026-12']);
  const entries = historyEntries([sub({ payments: [rec('a', '2025-10-10', 1), rec('b', '2025-11-10', 2), rec('c', '2026-10-10', 4), rec('d', '2026-01-10', 8)] })]);
  assert.equal(sumShare(filterEntries(entries, { period: '12months', today })), 14);
  assert.equal(sumShare(filterEntries(entries, { period: 'year', today })), 12);
  assert.equal(sumShare(filterEntries(entries, { period: 'month', today })), 4);
});

test('filtro por categoria', () => {
  const a = sub({ id: 'a', category: 'Games', payments: [rec('1', '2026-10-01', 10)] });
  const b = sub({ id: 'b', category: 'IA', payments: [rec('2', '2026-10-02', 30)] });
  const entries = historyEntries([a, b]);
  assert.equal(sumShare(filterEntries(entries, { period: 'month', category: 'IA', today })), 30);
  assert.equal(sumShare(filterEntries(entries, { period: 'month', today })), 40);
});

test('variação contra o mês anterior, em valor e percentual', () => {
  const entries = historyEntries([sub({ payments: [rec('a', '2026-09-10', 100), rec('b', '2026-10-10', 125)] })]);
  assert.deepEqual(variationVsPreviousMonth(entries, today), { current: 125, previous: 100, diff: 25, percent: 25 });
  const novo = historyEntries([sub({ payments: [rec('b', '2026-10-10', 125)] })]);
  assert.equal(variationVsPreviousMonth(novo, today).percent, null); // mês anterior sem valor
});

test('média dos últimos 6 meses divide pelos meses desde o primeiro registro quando é recente', () => {
  const antigo = historyEntries([sub({ payments: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((m, i) => rec(`r${i}`, `${m}-10`, 60)) })]);
  assert.equal(monthlyAverage(antigo, today), 60);
  const recente = historyEntries([sub({ payments: [rec('a', '2026-09-10', 50), rec('b', '2026-10-10', 50)] })]);
  assert.equal(monthlyAverage(recente, today), 50); // 100 ÷ 2 meses, não ÷ 6
  const fora = historyEntries([sub({ payments: [rec('a', '2026-01-10', 999)] })]);
  assert.equal(monthlyAverage(fora, today), null); // fora da janela
});

test('maior peso: soma por assinatura, com percentual do total; empate vai por nome', () => {
  const a = sub({ id: 'a', name: 'Alfa', payments: [rec('1', '2026-10-01', 30)] });
  const b = sub({ id: 'b', name: 'Beta', payments: [rec('2', '2026-10-02', 90)] });
  assert.deepEqual(heaviest(historyEntries([a, b])), { subId: 'b', name: 'Beta', total: 90, percent: 75 });
  const empate = sub({ id: 'c', name: 'Gama', payments: [rec('3', '2026-10-03', 30)] });
  assert.equal(heaviest(historyEntries([empate, a])).name, 'Alfa');
});

test('gasto por categoria, do maior para o menor, com percentual', () => {
  const a = sub({ id: 'a', category: 'Games', payments: [rec('1', '2026-10-01', 25)] });
  const b = sub({ id: 'b', category: 'IA', payments: [rec('2', '2026-10-02', 75)] });
  assert.deepEqual(spendByCategory(historyEntries([a, b])), [
    { category: 'IA', total: 75, percent: 75 },
    { category: 'Games', total: 25, percent: 25 },
  ]);
});

test('registros antigos de dividida (share null) aparecem na lista mas ficam fora de todos os totais', () => {
  const s = sub({ payments: [rec('a', '2026-10-01', null, { amount: 60, price: 60 }), rec('b', '2026-10-05', 20)] });
  const entries = historyEntries([s]);
  assert.equal(entries.length, 2);
  const [mes] = groupByMonth(entries);
  assert.equal(mes.total, 20);
  assert.equal(mes.unknown, 1);
  assert.equal(heaviest(entries).total, 20);
  assert.deepEqual(spendByCategory(entries), [{ category: 'Streaming', total: 20, percent: 100 }]);
  assert.equal(entries.find((e) => e.id === 'a').total, 60); // o valor cheio continua disponível para mostrar como "total"
});

test('semanal: quatro ou cinco cobranças no mesmo mês entram no total do mês', () => {
  const s = sub({ cycle: 'weekly', dueDate: '', dueWeekday: '1', price: 10, createdAt: '2026-10-01' }); // segundas
  const out = applyAutoCharges(s, [], new Date(2026, 10, 30)); // até 30/11
  const entries = historyEntries([out]);
  assert.equal(monthTotal(entries, '2026-10'), 40); // 5, 12, 19 e 26
  assert.equal(monthTotal(entries, '2026-11'), 50); // 2, 9, 16, 23 e 30
});

test('anual: um único registro por ano, no mês da cobrança', () => {
  const s = sub({ cycle: 'yearly', dueDate: '15', dueMonth: '3', price: 120, createdAt: '2025-01-01' });
  const out = applyAutoCharges(s, [], day(14));
  assert.deepEqual(groupByMonth(historyEntries([out])).map((m) => [m.month, m.total]), [['2026-03', 120], ['2025-03', 120]]);
});

test('cadastro no meio do ciclo: o mês do cadastro só tem cobrança se o vencimento ainda não passou', () => {
  const depois = applyAutoCharges(sub({ createdAt: '2026-10-12' }), [], day(14)); // venceu dia 10, antes do cadastro
  assert.equal(historyEntries([depois]).length, 0);
  const antes = applyAutoCharges(sub({ createdAt: '2026-10-05' }), [], day(14));
  assert.equal(historyEntries([antes]).length, 1);
});

test('pausada e reativada: os meses pausados não têm registro; cancelada para de acumular', () => {
  const pausada = resumeSub(pauseSub(sub({ createdAt: '2026-06-01' }), '2026-07-05'), '2026-09-20');
  const meses = historyEntries([applyAutoCharges(pausada, [], day(14))]).map((e) => e.month).sort();
  assert.deepEqual(meses, ['2026-06', '2026-10']); // jul, ago e set pausados (a cobrança de set, dia 10, caiu na pausa)
  const cancelada = cancelSub(sub({ createdAt: '2026-06-01' }), '2026-08-01');
  const m2 = historyEntries([applyAutoCharges(cancelada, [], day(14))]).map((e) => e.month).sort();
  assert.deepEqual(m2, ['2026-06', '2026-07']);
});

test('assinatura removida some do histórico (os registros vão com ela)', () => {
  const a = sub({ id: 'a', payments: [rec('1', '2026-10-01', 10)] });
  const b = sub({ id: 'b', payments: [rec('2', '2026-10-02', 20)] });
  assert.equal(monthTotal(historyEntries([a, b]), '2026-10'), 30);
  assert.equal(monthTotal(historyEntries([b]), '2026-10'), 20);
});

test('mudanças de preço: só entre registros reais, estimados não entram', () => {
  const s = sub({ payments: [
    rec('1', '2026-01-10', 39.9, { price: 39.9 }),
    rec('2', '2026-02-10', 39.9, { price: 39.9 }),
    rec('3', '2026-03-10', 44.9, { price: 44.9 }),
    rec('4', '2026-04-10', 44.9, { price: 44.9, estimated: true, kind: 'auto' }),
    rec('5', '2026-05-10', 34.9, { price: 34.9 }),
  ] });
  assert.deepEqual(priceChanges([s]), [
    { subId: 's', name: 'Netflix', from: 44.9, to: 34.9, month: '2026-05', direction: 'down' },
    { subId: 's', name: 'Netflix', from: 39.9, to: 44.9, month: '2026-03', direction: 'up' },
  ]);
  assert.equal(monthLabel('2026-03'), '03/2026');
  const soEstimado = sub({ payments: [rec('1', '2026-01-10', 10, { estimated: true, kind: 'auto' }), rec('2', '2026-02-10', 50, { estimated: true, kind: 'auto' })] });
  assert.deepEqual(priceChanges([soEstimado]), []);
});

test('mudança de preço usa o preço cheio, mesmo em assinatura dividida', () => {
  const s = sub({ payments: [rec('1', '2026-01-10', 20, { price: 40 }), rec('2', '2026-02-10', 25, { price: 50 })] });
  assert.deepEqual(priceChanges([s]).map((c) => [c.from, c.to]), [[40, 50]]);
});

test('manuais sem marcação: ativas, não automáticas, com ciclo vencido sem Paguei', () => {
  const manual = (extra) => sub({ autoCharge: false, createdAt: '2026-01-01', ...extra });
  const subs = [
    manual({ id: 'atrasada', name: 'Atrasada', dueDate: '5' }),
    manual({ id: 'paga', name: 'Paga', dueDate: '5', paidCycle: '2026-10' }),
    sub({ id: 'auto', name: 'Auto', dueDate: '5' }),
    pauseSub(manual({ id: 'pausada', name: 'Pausada', dueDate: '5' }), '2026-09-01'),
    manual({ id: 'hoje', name: 'Hoje', dueDate: '14' }),
  ];
  assert.deepEqual(unmarkedManual(subs, day(14)).map((x) => x.subId), ['atrasada']);
});

test('dados do schema 9 migrados: registros antigos entram no histórico como manuais com sua parte', () => {
  const antigo = normalizeSub({ id: 'x', name: 'Velho', price: 30, dueDate: '5', createdAt: '2026-01-01', payments: [{ id: 'p', cycle: '2026-09', paidAt: '2026-09-05', amount: 30 }] });
  const [e] = historyEntries([antigo]);
  assert.deepEqual([e.kind, e.share, e.total, e.estimated], ['manual', 30, 30, false]);
});
