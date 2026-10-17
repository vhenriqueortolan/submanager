import { cycleKey, lastDue, parseDay, todayStr } from './dates.js';
import { cycleOf } from './cycles.js';
import { isInactiveOn } from './status.js';
import { lastPaidCycle, makePayment } from './payments.js';

// Teto de segurança: 12 anos de cobranças semanais. Cadastros mais antigos que isso perdem só os ciclos mais velhos.
const MAX_CYCLES = 650;

const dayBefore = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);

/**
 * Registros de cobrança automática que faltam: um por ciclo, do cadastro até hoje (inclusive), para quem tem
 * cobrança automática. Ciclos passados recebem o preço e a divisão de hoje e saem marcados como `estimated`
 * (reajustes que o app não registrou não aparecem). Ciclos já registrados (manual ou automático) e dias em que a
 * assinatura estava pausada ou cancelada ficam de fora. Rodar de novo não acrescenta nada.
 */
export function pendingAutoCharges(sub, people = [], now = new Date()) {
  if (sub.autoCharge !== true) return [];
  const created = parseDay(sub.createdAt);
  if (!created) return [];
  const today = todayStr(now);
  const cycle = cycleOf(sub);
  const known = new Set((sub.payments || []).map((p) => p.cycle));
  const out = [];
  let due = lastDue(sub, now);
  for (let i = 0; due && due >= created && i < MAX_CYCLES; i += 1) {
    const day = todayStr(due);
    const key = cycleKey(due, cycle);
    if (!known.has(key) && !isInactiveOn(sub, day)) {
      out.push(makePayment(sub, key, day, { people, kind: 'auto', estimated: day < today }));
      known.add(key);
    }
    due = lastDue(sub, dayBefore(due));
  }
  return out.reverse(); // do mais antigo para o mais novo
}

/** A assinatura com as cobranças automáticas que faltavam. Sem nada a registrar, devolve a mesma assinatura. */
export function applyAutoCharges(sub, people = [], now = new Date()) {
  const added = pendingAutoCharges(sub, people, now);
  if (!added.length) return sub;
  const next = { ...sub, payments: [...(sub.payments || []), ...added] };
  return { ...next, paidCycle: lastPaidCycle(next) || next.paidCycle };
}

/** Aplica a todas as assinaturas. Sem nada a registrar, devolve o mesmo estado (não regrava o armazenamento). */
export function applyAllAutoCharges(state, now = new Date()) {
  let changed = false;
  const subs = state.subs.map((s) => {
    const next = applyAutoCharges(s, state.people, now);
    if (next !== s) changed = true;
    return next;
  });
  return changed ? { ...state, subs } : state;
}
