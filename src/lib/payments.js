import { parseDay } from './dates.js';
import { PAID_FORMAT, cycleOf, paidCycleValid } from './cycles.js';
import { newId } from './storage.js';
import { myShare } from './people.js';

const cents = (n) => Math.round(n * 100) / 100;
export const PAYMENT_KINDS = ['manual', 'auto'];

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

/**
 * Registro de pagamento (schema 10): `amount` e `price` são o preço cheio do dia (`amount` fica por compatibilidade),
 * `share` é a sua parte naquele momento (null quando não dá para saber: registro antigo de assinatura dividida),
 * `kind` é `manual` (Paguei) ou `auto` (cobrança automática) e `estimated` marca ciclos preenchidos ao abrir o app.
 */
export function makePayment(sub, cycle, paidAt, { id = newId(), people = [], kind = 'manual', estimated = false } = {}) {
  const price = parseFloat(sub.price) || 0;
  return { id, cycle, paidAt, amount: price, price, share: myShare(sub, people), kind, estimated };
}

/**
 * Registra o pagamento do ciclo e espelha em `paidCycle`. Ciclo já pago: devolve a mesma assinatura.
 * `opts.people` calcula a sua parte (sem ele, vale o preço cheio); `opts.kind` e `opts.estimated` vêm da cobrança automática.
 */
export function addPayment(sub, cycle, today, id = newId(), opts = {}) {
  const payments = sub.payments || [];
  if (payments.some((p) => p.cycle === cycle)) return sub;
  const next = { ...sub, payments: [...payments, makePayment(sub, cycle, today, { ...opts, id })] };
  return { ...next, paidCycle: lastPaidCycle(next) || cycle };
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

/**
 * Limpa o que veio do disco: descarta registros inválidos e refaz ids repetidos.
 * Registros antigos (sem `kind`) viram manuais, com `price` = valor gravado. Se a assinatura é dividida hoje, a sua parte
 * daquela época é desconhecida (`share` null): o registro aparece como "total" e fica fora dos totais de "sua parte".
 * @param {{divided?: boolean}} opts `divided`: a assinatura está dividida hoje
 */
export function normalizePayments(list, { divided = false } = {}) {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x !== 'object') continue;
    const cycle = typeof x.cycle === 'string' ? x.cycle : '';
    if (!Object.values(PAID_FORMAT).some((re) => re.test(cycle))) continue;
    let id = typeof x.id === 'string' && x.id ? x.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    const amount = parseFloat(x.amount) || 0;
    const legacy = !PAYMENT_KINDS.includes(x.kind);
    const shareRaw = x.share === null || x.share === undefined || x.share === '' ? NaN : Number(x.share);
    let share = Number.isFinite(shareRaw) && shareRaw >= 0 ? cents(shareRaw) : null;
    if (legacy && share === null && !divided) share = amount;
    out.push({
      id,
      cycle,
      paidAt: parseDay(x.paidAt) ? x.paidAt : '',
      amount,
      price: Number.isFinite(parseFloat(x.price)) && parseFloat(x.price) >= 0 ? parseFloat(x.price) : amount,
      share,
      kind: legacy ? 'manual' : x.kind,
      estimated: x.estimated === true,
    });
  }
  return out;
}
