import { CYCLES, cycleOf } from './cycles.js';
import { nextDue } from './dates.js';

export const brl = (n) =>
  (parseFloat(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=111&color=fff`;
}

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const pad2 = (n) => String(n).padStart(2, '0');
export const WEEKLY_LABEL = ['Todo domingo', 'Toda segunda', 'Toda terça', 'Toda quarta', 'Toda quinta', 'Toda sexta', 'Todo sábado'];

/** Preço com sufixo do ciclo nos ciclos não mensais: "R$ 120,00/ano". */
export function priceLabel(sub) {
  const cycle = cycleOf(sub);
  return cycle === 'monthly' ? brl(sub.price) : `${brl(sub.price)}/${CYCLES[cycle].unit}`;
}

/**
 * Texto do vencimento no card: mensal "Dia 10"; semanal "Toda segunda";
 * anual "Vence 15/03" (próxima data). Vazio quando não há vencimento válido.
 */
export function dueLabel(sub, now = new Date()) {
  const cycle = cycleOf(sub);
  if (cycle === 'monthly') return sub.dueDate ? `Dia ${sub.dueDate}` : '';
  if (cycle === 'weekly') return WEEKLY_LABEL[parseInt(sub.dueWeekday, 10)] || '';
  const next = nextDue(sub, now);
  return next ? `Vence ${pad2(next.getDate())}/${pad2(next.getMonth() + 1)}` : '';
}
