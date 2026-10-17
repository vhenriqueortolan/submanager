import { dueStatus, parseDay } from './dates.js';
import { isActive } from './status.js';

/**
 * Histórico de pagamentos: agrupamento, totais, variação, média, maior peso e mudanças de preço.
 * Só fatos, sem recomendação. Valores em "sua parte" (`share`); registro antigo de assinatura dividida
 * (`share` null) aparece como "total" e fica fora de todos os totais de "sua parte".
 * Mês sempre como "AAAA-MM" (data local do registro).
 */
const cents = (n) => Math.round(n * 100) / 100;

export const monthOf = (day) => String(day || '').slice(0, 7);
const monthIndex = (month) => Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1);
const monthFromIndex = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
const addMonths = (month, n) => monthFromIndex(monthIndex(month) + n);

/** Um item por registro de pagamento de todas as assinaturas, do mais novo para o mais antigo. */
export function historyEntries(subs) {
  const out = [];
  for (const sub of subs) {
    for (const p of sub.payments || []) {
      if (!parseDay(p.paidAt)) continue;
      out.push({
        id: p.id,
        subId: sub.id,
        name: sub.name,
        category: sub.category || 'Outros',
        paidAt: p.paidAt,
        month: monthOf(p.paidAt),
        total: p.amount,
        price: p.price ?? p.amount,
        share: p.share === undefined ? null : p.share,
        kind: p.kind === 'auto' ? 'auto' : 'manual',
        estimated: p.estimated === true,
      });
    }
  }
  return out.sort((a, b) => (a.paidAt === b.paidAt ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : a.paidAt < b.paidAt ? 1 : -1));
}

/** Soma da sua parte. Registros sem parte conhecida ficam de fora. */
export const sumShare = (entries) => cents(entries.reduce((acc, e) => acc + (e.share ?? 0), 0));

/** Agrupa por mês (mais novo primeiro). `unknown`: quantos registros de "total" ficaram fora da soma do mês. */
export function groupByMonth(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.month)) map.set(e.month, []);
    map.get(e.month).push(e);
  }
  return [...map.keys()]
    .sort()
    .reverse()
    .map((month) => {
      const list = map.get(month);
      return { month, entries: list, total: sumShare(list), unknown: list.filter((e) => e.share === null).length };
    });
}

/** Mês de hoje, "AAAA-MM". */
export const currentMonth = (today) => monthOf(today);

/** Período: 'month' (mês atual), '12months' (este mês e os 11 anteriores) ou 'year' (ano civil atual). Devolve [de, até] em meses. */
export function periodRange(period, today) {
  const now = currentMonth(today);
  if (period === 'year') return [`${now.slice(0, 4)}-01`, `${now.slice(0, 4)}-12`];
  if (period === '12months') return [addMonths(now, -11), now];
  return [now, now];
}

/** Filtra por período e por categoria (vazio = todas). */
export function filterEntries(entries, { period = 'month', category = '', today }) {
  const [from, to] = periodRange(period, today);
  return entries.filter((e) => e.month >= from && e.month <= to && (!category || e.category === category));
}

/** Total do mês (sua parte). */
export const monthTotal = (entries, month) => sumShare(entries.filter((e) => e.month === month));

/**
 * Variação do mês atual contra o anterior (sua parte). `percent` é null quando o mês anterior não tem valor.
 * @returns {{current: number, previous: number, diff: number, percent: number | null}}
 */
export function variationVsPreviousMonth(entries, today) {
  const month = currentMonth(today);
  const current = monthTotal(entries, month);
  const previous = monthTotal(entries, addMonths(month, -1));
  return { current, previous, diff: cents(current - previous), percent: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null };
}

/**
 * Média mensal (sua parte) dos últimos 6 meses, contando o mês atual. Quem começou há menos tempo divide só
 * pelos meses desde o primeiro registro. Sem registros no período: null.
 */
export function monthlyAverage(entries, today, months = 6) {
  const now = currentMonth(today);
  const from = addMonths(now, -(months - 1));
  const inWindow = entries.filter((e) => e.month >= from && e.month <= now);
  if (!inWindow.length) return null;
  const first = inWindow.reduce((m, e) => (e.month < m ? e.month : m), now);
  const span = monthIndex(now) - monthIndex(first) + 1;
  return cents(sumShare(inWindow) / span);
}

/**
 * A assinatura que mais pesa no período, com o percentual do total (sua parte). Empate: ordem alfabética.
 * @returns {null | {subId: string, name: string, total: number, percent: number}}
 */
export function heaviest(entries) {
  const totals = new Map();
  for (const e of entries) {
    if (e.share === null) continue;
    const cur = totals.get(e.subId) ?? { subId: e.subId, name: e.name, total: 0 };
    cur.total += e.share;
    totals.set(e.subId, cur);
  }
  const all = [...totals.values()].map((t) => ({ ...t, total: cents(t.total) }));
  if (!all.length) return null;
  const sum = all.reduce((acc, t) => acc + t.total, 0);
  all.sort((a, b) => b.total - a.total || (a.name < b.name ? -1 : 1));
  const top = all[0];
  return { ...top, percent: sum > 0 ? Math.round((top.total / sum) * 1000) / 10 : 0 };
}

/** Gasto por categoria (sua parte), do maior para o menor. */
export function spendByCategory(entries) {
  const map = new Map();
  for (const e of entries) {
    if (e.share === null) continue;
    map.set(e.category, (map.get(e.category) ?? 0) + e.share);
  }
  const list = [...map.entries()].map(([category, total]) => ({ category, total: cents(total) }));
  const sum = list.reduce((acc, c) => acc + c.total, 0);
  return list
    .map((c) => ({ ...c, percent: sum > 0 ? Math.round((c.total / sum) * 1000) / 10 : 0 }))
    .sort((a, b) => b.total - a.total || (a.category < b.category ? -1 : 1));
}

/**
 * Mudanças de preço entre registros consecutivos da mesma assinatura ("subiu de R$ 39,90 para R$ 44,90 em 03/2026").
 * Registros estimados não entram: o preço deles é o de hoje, não o da época.
 * @returns {{subId: string, name: string, from: number, to: number, month: string, direction: 'up' | 'down'}[]} mais recentes primeiro
 */
export function priceChanges(subs) {
  const out = [];
  for (const sub of subs) {
    const real = (sub.payments || [])
      .filter((p) => p.estimated !== true && parseDay(p.paidAt))
      .map((p) => ({ paidAt: p.paidAt, price: p.price ?? p.amount }))
      .sort((a, b) => (a.paidAt < b.paidAt ? -1 : a.paidAt > b.paidAt ? 1 : 0));
    for (let i = 1; i < real.length; i += 1) {
      const from = real[i - 1].price;
      const to = real[i].price;
      if (Math.abs(to - from) >= 0.005) {
        out.push({ subId: sub.id, name: sub.name, from, to, month: monthOf(real[i].paidAt), direction: to > from ? 'up' : 'down' });
      }
    }
  }
  return out.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
}

/**
 * Cobranças manuais sem marcação: assinaturas ativas, sem cobrança automática, com o ciclo mais recente vencido e sem "Paguei".
 * @returns {{subId: string, name: string, days: number}[]} mais atrasadas primeiro
 */
export function unmarkedManual(subs, now = new Date()) {
  const out = [];
  for (const sub of subs) {
    if (!isActive(sub) || sub.autoCharge === true) continue;
    const st = dueStatus(sub, now);
    if (st?.type === 'overdue') out.push({ subId: sub.id, name: sub.name, days: st.days });
  }
  return out.sort((a, b) => b.days - a.days);
}

/** "AAAA-MM" → "MM/AAAA". */
export const monthLabel = (month) => `${month.slice(5, 7)}/${month.slice(0, 4)}`;
