import { dueStatus, todayStr } from './dates.js';
import { brl, WEEKLY_LABEL } from './format.js';
import { cycleOf } from './cycles.js';
import { myShare, sharers } from './people.js';

export const notificationsSupported = () => typeof Notification !== 'undefined';

export const getPermission = () => (notificationsSupported() ? Notification.permission : 'unsupported');

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  try {
    // Safari antigo usa callback; os demais retornam Promise.
    await new Promise((resolve) => {
      const r = Notification.requestPermission(resolve);
      if (r && typeof r.then === 'function') r.then(resolve);
    });
  } catch {
    /* ignora */
  }
  return getPermission();
}

async function showNotif(title, options) {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options); // exigido no Android/iOS
        return true;
      }
    }
  } catch {
    /* cai no fallback */
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/** Assinaturas que vencem hoje ou estão atrasadas e ainda não avisadas hoje. */
export function pendingDue(subs, now = new Date()) {
  const today = todayStr(now);
  const out = [];
  for (const sub of subs) {
    const st = dueStatus(sub, now);
    if (st && sub.lastNotified !== today) out.push({ sub, st });
  }
  return out;
}

const pad2 = (v) => String(v).padStart(2, '0');

/** Quando a cobrança vence, no texto do aviso atrasado: "dia 10", "dia 15/03" ou "toda segunda". */
function dueHint(sub) {
  const cycle = cycleOf(sub);
  if (cycle === 'weekly') return (WEEKLY_LABEL[parseInt(sub.dueWeekday, 10)] || '').toLowerCase();
  if (cycle === 'yearly') return `dia ${pad2(sub.dueDate)}/${pad2(sub.dueMonth)}`;
  return `dia ${sub.dueDate}`;
}

/** Valor cobrado e, quando dividido, a sua parte. */
function amountText(sub, people) {
  const full = brl(sub.price);
  return sharers(sub, people).length ? `${full} (sua parte ${brl(myShare(sub, people))})` : full;
}

export function describe(sub, st, people = []) {
  if (st.type === 'today') {
    return { title: `${sub.name} vence hoje`, body: `${amountText(sub, people)} · ${sub.paymentMethod}` };
  }
  return {
    title: `${sub.name} está atrasada`,
    body: `Venceu há ${st.days} ${st.days === 1 ? 'dia' : 'dias'} (${dueHint(sub)}) · ${amountText(sub, people)}`,
  };
}

/**
 * Dispara as notificações pendentes (no máximo 1 por assinatura por dia; agrupa se forem > 3).
 * @returns {Promise<string[]>} ids das assinaturas efetivamente notificadas
 */
export async function notifyDue(subs, now = new Date(), people = []) {
  if (getPermission() !== 'granted') return [];
  const pending = pendingDue(subs, now);
  if (!pending.length) return [];

  const done = [];
  if (pending.length <= 3) {
    for (const { sub, st } of pending) {
      const { title, body } = describe(sub, st, people);
      if (await showNotif(title, { body, tag: `sub-${sub.id}-${st.cycle}` })) done.push(sub.id);
    }
  } else {
    const overdue = pending.filter((p) => p.st.type === 'overdue').length;
    const title =
      `${pending.length} assinaturas precisam de atenção` +
      (overdue ? ` (${overdue} atrasada${overdue > 1 ? 's' : ''})` : '');
    const body = pending.map((p) => p.sub.name).join(', ');
    if (await showNotif(title, { body, tag: `sub-grupo-${todayStr(now)}` })) {
      pending.forEach((p) => done.push(p.sub.id));
    }
  }
  return done;
}
