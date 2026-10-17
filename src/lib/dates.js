import { cycleOf } from './cycles.js';

const pad = (n) => String(n).padStart(2, '0');

/** Data local no formato YYYY-MM-DD. */
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Converte YYYY-MM-DD em Date local (ou null se inválido). */
export function parseDay(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

/** Vencimento no mês informado; dia 31 em fevereiro vence no último dia do mês. */
export function dueOn(year, month, day) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const validIn = (v, min, max) => {
  const n = parseInt(v, 10);
  return n >= min && n <= max ? n : -1;
};

/** Chave do ciclo: mensal "2026-10", anual "2026", semanal "2026-10-15" (data do vencimento). */
export function cycleKey(d, cycle = 'monthly') {
  if (cycle === 'yearly') return String(d.getFullYear());
  if (cycle === 'weekly') return todayStr(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Vencimento mais recente <= hoje (null se a assinatura não tem vencimento válido). */
export function lastDue(sub, now = new Date()) {
  const today = startOfDay(now);
  const cycle = cycleOf(sub);
  if (cycle === 'weekly') {
    const wd = validIn(sub.dueWeekday, 0, 6);
    if (wd < 0) return null;
    const back = (today.getDay() - wd + 7) % 7;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
  }
  const day = validIn(sub.dueDate, 1, 31);
  if (day < 0) return null;
  if (cycle === 'yearly') {
    const month = validIn(sub.dueMonth, 1, 12);
    if (month < 0) return null;
    let due = dueOn(today.getFullYear(), month - 1, day);
    if (due > today) due = dueOn(today.getFullYear() - 1, month - 1, day);
    return due;
  }
  let due = dueOn(today.getFullYear(), today.getMonth(), day);
  if (due > today) due = dueOn(today.getFullYear(), today.getMonth() - 1, day);
  return due;
}

/** Próximo vencimento >= hoje (null se a assinatura não tem vencimento válido). */
export function nextDue(sub, now = new Date()) {
  const today = startOfDay(now);
  const cycle = cycleOf(sub);
  if (cycle === 'weekly') {
    const wd = validIn(sub.dueWeekday, 0, 6);
    if (wd < 0) return null;
    const ahead = (wd - today.getDay() + 7) % 7;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + ahead);
  }
  const day = validIn(sub.dueDate, 1, 31);
  if (day < 0) return null;
  if (cycle === 'yearly') {
    const month = validIn(sub.dueMonth, 1, 12);
    if (month < 0) return null;
    let due = dueOn(today.getFullYear(), month - 1, day);
    if (due < today) due = dueOn(today.getFullYear() + 1, month - 1, day);
    return due;
  }
  let due = dueOn(today.getFullYear(), today.getMonth(), day);
  if (due < today) due = dueOn(today.getFullYear(), today.getMonth() + 1, day);
  return due;
}

/**
 * Status de vencimento de uma assinatura.
 * Só o ciclo mais recente conta: está "pendente" quando o último vencimento (<= hoje)
 * é posterior ao cadastro e seu ciclo ainda não foi pago.
 * @returns {null | {type: 'today'|'overdue', days: number, cycle: string}}
 */
export function dueStatus(sub, now = new Date()) {
  const due = lastDue(sub, now);
  if (!due) return null;

  const created = parseDay(sub.createdAt);
  if (created && due < created) return null; // ciclo anterior ao cadastro

  const key = cycleKey(due, cycleOf(sub));
  const days = Math.round((startOfDay(now) - due) / 86400000);

  // Cobrança automática: nunca fica atrasada nem precisa de "Paguei"; o dia da cobrança é só informativo.
  if (sub.autoCharge) return days === 0 ? { type: 'today', days, cycle: key } : null;

  if (sub.paidCycle && sub.paidCycle >= key) return null; // ciclo já pago
  return { type: days === 0 ? 'today' : 'overdue', days, cycle: key };
}

/** Data da última cobrança (vencimento mais recente <= hoje) desde o cadastro; null se não houver. */
export function lastCharge(sub, now = new Date()) {
  const due = lastDue(sub, now);
  if (!due) return null;
  const created = parseDay(sub.createdAt);
  return created && due < created ? null : due;
}
