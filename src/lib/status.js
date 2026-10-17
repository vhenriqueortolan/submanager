import { parseDay } from './dates.js';

/**
 * Ciclo de vida da assinatura: `active`, `paused` ou `cancelled`.
 * Pausar e cancelar são reversíveis e mantêm o histórico. Os períodos em que a assinatura ficou parada
 * (pausas, e cancelamentos já revertidos) ficam em `pauses` ({ from, to }, `from` inclusive e `to` exclusivo;
 * `to` vazio = ainda parada), para a cobrança automática pular esses dias.
 * Assinaturas sem os campos (dados e backups antigos) valem como ativas.
 */
export const STATUSES = ['active', 'paused', 'cancelled'];

/** Períodos válidos, em ordem. `to` vazio só vale como último (pausa em andamento). */
export function normalizePauses(raw) {
  if (!Array.isArray(raw)) return [];
  const list = [];
  for (const p of raw) {
    if (!p || !parseDay(p.from)) continue;
    const to = parseDay(p.to) ? p.to : '';
    if (to && to < p.from) continue;
    list.push({ from: p.from, to });
  }
  list.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  // Só o último pode estar em aberto; os anteriores em aberto são descartados (dado inconsistente).
  return list.filter((p, i) => p.to || i === list.length - 1);
}

/** Campos de status de qualquer objeto (JSON antigo, parcial ou corrompido). */
export function normalizeStatus(x) {
  let pauses = normalizePauses(x?.pauses);
  const cancelledAt = parseDay(x?.cancelledAt) ? x.cancelledAt : '';
  if (x?.status === 'cancelled' && cancelledAt) {
    // Uma pausa que estava em aberto termina no cancelamento.
    pauses = pauses.map((p) => (p.to ? p : { from: p.from, to: cancelledAt < p.from ? p.from : cancelledAt }));
    return { status: 'cancelled', pauses, cancelledAt };
  }
  const paused = pauses.length > 0 && !pauses[pauses.length - 1].to;
  return { status: paused ? 'paused' : 'active', pauses, cancelledAt: '' };
}

/** Só os campos de status de uma assinatura (para copiar de uma versão anterior). */
export const statusFields = (sub) => normalizeStatus(sub);

export const statusOf = (sub) => normalizeStatus(sub).status;
export const isActive = (sub) => statusOf(sub) === 'active';

/** A assinatura estava parada (pausada ou cancelada) neste dia? */
export function isInactiveOn(sub, day) {
  const { status, pauses, cancelledAt } = normalizeStatus(sub);
  if (status === 'cancelled' && day >= cancelledAt) return true;
  return pauses.some((p) => p.from <= day && (!p.to || day < p.to));
}

const closeOpenPause = (pauses, day) =>
  pauses.map((p) => (p.to ? p : { from: p.from, to: day < p.from ? p.from : day }));

/** Pausa a partir de `day`. Só vale para assinatura ativa. */
export function pauseSub(sub, day) {
  const cur = normalizeStatus(sub);
  if (cur.status !== 'active') return sub;
  return { ...sub, status: 'paused', pauses: [...cur.pauses, { from: day, to: '' }], cancelledAt: '' };
}

/** Cancela a partir de `day`. Se estava pausada, a pausa termina no cancelamento. */
export function cancelSub(sub, day) {
  const cur = normalizeStatus(sub);
  if (cur.status === 'cancelled') return sub;
  return { ...sub, status: 'cancelled', pauses: closeOpenPause(cur.pauses, day), cancelledAt: day };
}

/**
 * Reativa em `day`: volta a gerar cobranças a partir daí. O tempo parado (pausa ou cancelamento) fica registrado
 * em `pauses`, então os dias parados continuam sem cobrança mesmo depois de reativar.
 */
export function resumeSub(sub, day) {
  const cur = normalizeStatus(sub);
  if (cur.status === 'active') return sub;
  if (cur.status === 'paused') return { ...sub, status: 'active', pauses: closeOpenPause(cur.pauses, day), cancelledAt: '' };
  const stopped = cur.cancelledAt < day ? [{ from: cur.cancelledAt, to: day }] : [];
  return { ...sub, status: 'active', pauses: [...cur.pauses, ...stopped], cancelledAt: '' };
}
