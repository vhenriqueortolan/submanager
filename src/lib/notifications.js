import { cycleKey, dueStatus, nextDue, todayStr } from './dates.js';
import { DEFAULT_SETTINGS } from './settings.js';
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

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Antecedência: o próximo vencimento está entre 1 e `advanceDays` dias à frente.
 * Não altera `dueStatus`; "hoje" não conta como antecedência.
 * @returns {null | {type: 'upcoming', days: number, cycle: string}}
 */
export function upcomingStatus(sub, now = new Date(), advanceDays = 0) {
  if (!(advanceDays > 0) || sub.muted) return null;
  const next = nextDue(sub, now);
  if (!next) return null;
  const days = Math.round((next - startOfDay(now)) / 86400000);
  if (days < 1 || days > advanceDays) return null;
  const key = cycleKey(next, cycleOf(sub));
  if (sub.paidCycle && sub.paidCycle >= key) return null;
  return { type: 'upcoming', days, cycle: key };
}

/**
 * Avisos pendentes (hoje, atrasada ou antecedência) de assinaturas ainda não avisadas hoje,
 * respeitando as preferências. Cada assinatura tem no máximo um aviso por dia.
 */
export function pendingDue(subs, now = new Date(), settings = DEFAULT_SETTINGS) {
  if (!settings.enabled) return [];
  const today = todayStr(now);
  const out = [];
  for (const sub of subs) {
    if (sub.muted || sub.lastNotified === today) continue;
    let st = dueStatus(sub, now);
    if (st) {
      if (st.type === 'today' && !settings.notifyToday) continue;
      if (st.type === 'overdue' && !settings.notifyOverdue) continue;
    } else {
      st = upcomingStatus(sub, now, settings.advanceDays);
    }
    if (st) out.push({ sub, st });
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
  if (st.type === 'upcoming') {
    const when = st.days === 1 ? 'amanhã' : `em ${st.days} dias`;
    const verb = sub.autoCharge ? 'será cobrada' : 'vence';
    return { title: `${sub.name} ${verb} ${when}`, body: `${amountText(sub, people)} · ${sub.paymentMethod}` };
  }
  if (st.type === 'today') {
    return { title: `${sub.name} ${sub.autoCharge ? 'é cobrada' : 'vence'} hoje`, body: `${amountText(sub, people)} · ${sub.paymentMethod}` };
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
export async function notifyDue(subs, now = new Date(), people = [], settings = DEFAULT_SETTINGS) {
  if (getPermission() !== 'granted') return [];
  const pending = pendingDue(subs, now, settings);
  if (!pending.length) return [];

  const done = [];
  if (pending.length <= 3) {
    for (const { sub, st } of pending) {
      const { title, body } = describe(sub, st, people);
      if (await showNotif(title, { body, tag: `sub-${sub.id}-${st.cycle}-${st.type}` })) done.push(sub.id);
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
