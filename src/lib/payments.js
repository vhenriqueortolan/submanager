import { parseDay } from './dates.js';
import { PAID_FORMAT, cycleOf, paidCycleValid } from './cycles.js';
import { newId } from './storage.js';

/**
 * Último ciclo pago segundo o histórico. Só conta pagamento do formato do ciclo atual e feito
 * desde o cadastro/reinício da assinatura (mudar o vencimento reinicia o controle, mas o histórico fica).
 */
export function lastPaidCycle(sub) {
  const cycles = (sub.payments || [])
    .filter((p) => paidCycleValid(p.cycle, cycleOf(sub)) && (!sub.createdAt || p.paidAt >= sub.createdAt))
    .map((p) => p.cycle)
    .sort();
  return cycles.length ? cycles[cycles.length - 1] : '';
}

/** Registra o pagamento do ciclo e espelha em `paidCycle`. Ciclo já pago: devolve a mesma assinatura. */
export function addPayment(sub, cycle, today, id = newId()) {
  const payments = sub.payments || [];
  if (payments.some((p) => p.cycle === cycle)) return sub;
  const next = { ...sub, payments: [...payments, { id, cycle, paidAt: today, amount: parseFloat(sub.price) || 0 }] };
  return { ...next, paidCycle: cycle };
}

/** Remove só o registro indicado e recalcula `paidCycle` a partir do último que restar. */
export function removePayment(sub, paymentId) {
  const payments = sub.payments || [];
  if (!payments.some((p) => p.id === paymentId)) return sub;
  const next = { ...sub, payments: payments.filter((p) => p.id !== paymentId) };
  return { ...next, paidCycle: lastPaidCycle(next) };
}

/** Mais recentes primeiro (por data do registro; empate: o inserido por último). */
export function paymentsNewestFirst(sub) {
  return (sub.payments || [])
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.paidAt === b.p.paidAt ? b.i - a.i : a.p.paidAt < b.p.paidAt ? 1 : -1))
    .map(({ p }) => p);
}

/** Limpa o que veio do disco: descarta registros inválidos e refaz ids repetidos. */
export function normalizePayments(list) {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x !== 'object') continue;
    const cycle = typeof x.cycle === 'string' ? x.cycle : '';
    if (!Object.values(PAID_FORMAT).some((re) => re.test(cycle))) continue;
    let id = typeof x.id === 'string' && x.id ? x.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    out.push({ id, cycle, paidAt: parseDay(x.paidAt) ? x.paidAt : '', amount: parseFloat(x.amount) || 0 });
  }
  return out;
}
