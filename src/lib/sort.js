import { nextDue } from './dates.js';
import { isActive } from './status.js';

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Próximo vencimento "em aberto": se o de hoje já foi pago, vale o seguinte. */
function upcoming(sub, status, now) {
  const today = startOfDay(now);
  const next = nextDue(sub, today);
  if (next && !status && next.getTime() === today.getTime()) {
    return nextDue(sub, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  }
  return next;
}

/**
 * Ordena por urgência: atrasadas (mais dias primeiro) → vence hoje → próximas por
 * vencimento crescente → sem vencimento (por nome) → pausadas e canceladas (por nome). Estável: empates mantêm a ordem original.
 * @param {{sub: object, status: null | {type: string, days: number}}[]} items
 * @returns {typeof items} nova lista
 */
export function sortByUrgency(items, now = new Date()) {
  const keyed = items.map((item, index) => {
    const { sub, status } = item;
    let group;
    let order = 0;
    if (!isActive(sub)) {
      group = 4;
    } else if (status?.type === 'overdue') {
      group = 0;
      order = -status.days;
    } else if (status?.type === 'today') {
      group = 1;
    } else {
      const next = upcoming(sub, status, now);
      group = next ? 2 : 3;
      order = next ? next.getTime() : 0;
    }
    return { item, index, group, order };
  });
  keyed.sort((a, b) => {
    if (a.group !== b.group) return a.group - b.group;
    if (a.order !== b.order) return a.order - b.order;
    if (a.group >= 3) {
      const byName = (a.item.sub.name || '').localeCompare(b.item.sub.name || '', 'pt-BR', { sensitivity: 'base' });
      if (byName) return byName;
    }
    return a.index - b.index;
  });
  return keyed.map((k) => k.item);
}
