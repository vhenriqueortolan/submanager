import { newId } from './storage.js';
import { todayStr } from './dates.js';
import { normalizeSharedWith } from './people.js';
import { DEFAULT_CYCLE, cycleOf, normalizeDue } from './cycles.js';

const DUE_FIELDS = ['cycle', 'dueDate', 'dueMonth', 'dueWeekday'];

export function emptyForm(preset = {}) {
  return {
    name: preset.name || '',
    domain: preset.domain || '',
    category: preset.category || 'Outros',
    price: preset.price === undefined || preset.price === '' ? '' : String(preset.price),
    cycle: DEFAULT_CYCLE,
    dueDate: '',
    dueMonth: '',
    dueWeekday: '',
    paymentMethod: 'Cartão',
    sharedWith: [],
  };
}

export function formFromSub(sub) {
  return {
    name: sub.name,
    domain: sub.domain || '',
    category: sub.category || 'Outros',
    price: String(sub.price ?? ''),
    cycle: cycleOf(sub),
    dueDate: sub.dueDate || '',
    dueMonth: sub.dueMonth || '',
    dueWeekday: sub.dueWeekday || '',
    paymentMethod: sub.paymentMethod || 'Cartão',
    sharedWith: Array.isArray(sub.sharedWith) ? sub.sharedWith : [],
  };
}

/** Monta a assinatura a partir do formulário, preservando id/ciclo/notificações da anterior. */
export function buildSub(prev, form, today = todayStr()) {
  const due = normalizeDue(form);
  const sub = {
    id: prev?.id ?? newId(),
    createdAt: prev?.createdAt ?? today,
    paidCycle: prev?.paidCycle ?? '',
    lastNotified: prev?.lastNotified ?? '',
    payments: prev?.payments ?? [],
    name: form.name.trim(),
    domain: (form.domain || '').trim(),
    category: form.category || 'Outros',
    price: parseFloat(form.price) || 0,
    ...due,
    paymentMethod: form.paymentMethod || 'Cartão',
    sharedWith: normalizeSharedWith(form.sharedWith),
  };
  // Mudou o ciclo ou o vencimento: reinicia o controle para não gerar "atraso" retroativo.
  const before = prev && { ...normalizeDue(prev) };
  if (prev && DUE_FIELDS.some((k) => before[k] !== due[k])) {
    sub.createdAt = today;
    sub.lastNotified = '';
    sub.paidCycle = '';
  }
  return sub;
}
