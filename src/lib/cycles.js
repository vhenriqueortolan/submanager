export const CYCLES = {
  weekly: { label: 'Semanal', unit: 'semana', perYear: 52 },
  monthly: { label: 'Mensal', unit: 'mês', perYear: 12 },
  yearly: { label: 'Anual', unit: 'ano', perYear: 1 },
};
export const DEFAULT_CYCLE = 'monthly';

/** Ciclo da assinatura; ausente ou inválido vale como mensal (dados antigos). */
export function cycleOf(sub) {
  return sub && Object.hasOwn(CYCLES, sub.cycle) ? sub.cycle : DEFAULT_CYCLE;
}

/** Valor da assinatura em um ano. */
export function annualAmount(sub) {
  return (parseFloat(sub.price) || 0) * CYCLES[cycleOf(sub)].perYear;
}

const intIn = (v, min, max) => {
  const n = parseInt(v, 10);
  return n >= min && n <= max ? String(n) : '';
};

/** Normaliza ciclo e campos de vencimento: só os campos do ciclo ficam preenchidos. */
export function normalizeDue(x) {
  const cycle = cycleOf(x);
  return {
    cycle,
    dueDate: cycle === 'weekly' ? '' : intIn(x.dueDate, 1, 31),
    dueMonth: cycle === 'yearly' ? intIn(x.dueMonth, 1, 12) : '',
    dueWeekday: cycle === 'weekly' ? intIn(x.dueWeekday, 0, 6) : '',
  };
}

const PAID_FORMAT = {
  weekly: /^\d{4}-\d{2}-\d{2}$/,
  monthly: /^\d{4}-\d{2}$/,
  yearly: /^\d{4}$/,
};

/** A comparação lexicográfica de paidCycle só vale dentro do mesmo tipo de ciclo. */
export function paidCycleValid(value, cycle) {
  return PAID_FORMAT[cycle].test(value || '');
}
