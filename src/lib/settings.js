/** Preferências de aviso. `advanceDays`: quantos dias antes do vencimento avisar (0 = não avisar antes). */
export const DEFAULT_SETTINGS = { enabled: true, notifyToday: true, notifyOverdue: true, advanceDays: 0 };

export const ADVANCE_OPTIONS = [0, 1, 3, 7];

export function normalizeSettings(raw) {
  const x = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);
  const days = parseInt(x.advanceDays, 10);
  return {
    enabled: bool(x.enabled, DEFAULT_SETTINGS.enabled),
    notifyToday: bool(x.notifyToday, DEFAULT_SETTINGS.notifyToday),
    notifyOverdue: bool(x.notifyOverdue, DEFAULT_SETTINGS.notifyOverdue),
    advanceDays: ADVANCE_OPTIONS.includes(days) ? days : DEFAULT_SETTINGS.advanceDays,
  };
}
