import { newId } from './storage.js';
import { todayStr } from './dates.js';

export function emptyForm(preset = {}) {
  return {
    name: preset.name || '',
    domain: preset.domain || '',
    category: preset.category || 'Outros',
    price: preset.price === undefined || preset.price === '' ? '' : String(preset.price),
    dueDate: '',
    paymentMethod: 'Cartão',
  };
}

export function formFromSub(sub) {
  return {
    name: sub.name,
    domain: sub.domain || '',
    category: sub.category || 'Outros',
    price: String(sub.price ?? ''),
    dueDate: sub.dueDate || '',
    paymentMethod: sub.paymentMethod || 'Cartão',
  };
}

/** Monta a assinatura a partir do formulário, preservando id/ciclo/notificações da anterior. */
export function buildSub(prev, form, today = todayStr()) {
  const dueRaw = parseInt(form.dueDate, 10);
  const dueDate = dueRaw >= 1 && dueRaw <= 31 ? String(dueRaw) : '';
  const sub = {
    id: prev?.id ?? newId(),
    createdAt: prev?.createdAt ?? today,
    paidCycle: prev?.paidCycle ?? '',
    lastNotified: prev?.lastNotified ?? '',
    name: form.name.trim(),
    domain: (form.domain || '').trim(),
    category: form.category || 'Outros',
    price: parseFloat(form.price) || 0,
    dueDate,
    paymentMethod: form.paymentMethod || 'Cartão',
  };
  // Mudou o dia de vencimento: reinicia o ciclo para não gerar "atraso" retroativo.
  if (prev && prev.dueDate !== dueDate) {
    sub.createdAt = today;
    sub.lastNotified = '';
  }
  return sub;
}
