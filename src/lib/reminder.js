import { parseDay, todayStr } from './dates.js';

const REMIND_AFTER_DAYS = 30;
const SNOOZE_DAYS = 7;

const daysBetween = (from, to) => Math.round((parseDay(to) - parseDay(from)) / 86400000);

/** "Agora não": data (YYYY-MM-DD) a partir da qual o lembrete pode voltar. */
export function snoozeUntil(today, days = SNOOZE_DAYS) {
  const d = parseDay(today);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

/** Lembrar de exportar backup: há assinaturas, e nunca exportou ou a última foi há mais de 30 dias. */
export function backupDue(state, today) {
  if (!state.subs.length) return false;
  if (state.backupSnoozeUntil && today < state.backupSnoozeUntil) return false;
  if (!state.lastBackupAt) return true;
  return daysBetween(state.lastBackupAt, today) > REMIND_AFTER_DAYS;
}

/** O arquivo exportado já leva a data do próprio backup. */
export function withBackupStamp(state, now = new Date()) {
  return { ...state, lastBackupAt: todayStr(now) };
}
