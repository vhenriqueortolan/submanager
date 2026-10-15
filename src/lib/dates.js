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

/** Chave do ciclo mensal, ex.: "2026-10". */
export function cycleKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/**
 * Status de vencimento de uma assinatura.
 * Ciclo = mês. Está "pendente" quando o último vencimento (<= hoje) pertence a um
 * ciclo ainda não pago e posterior ao cadastro.
 * @returns {null | {type: 'today'|'overdue', days: number, cycle: string}}
 */
export function dueStatus(sub, now = new Date()) {
  const day = parseInt(sub.dueDate, 10);
  if (!day || day < 1 || day > 31) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let due = dueOn(today.getFullYear(), today.getMonth(), day);
  if (due > today) due = dueOn(today.getFullYear(), today.getMonth() - 1, day);

  const created = parseDay(sub.createdAt);
  if (created && due < created) return null; // ciclo anterior ao cadastro

  const key = cycleKey(due);
  if (sub.paidCycle && sub.paidCycle >= key) return null; // ciclo já pago

  const days = Math.round((today - due) / 86400000);
  return { type: days === 0 ? 'today' : 'overdue', days, cycle: key };
}
