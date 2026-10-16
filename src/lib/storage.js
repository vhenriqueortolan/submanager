import { parseDay, todayStr } from './dates.js';
import { normalizeDue, paidCycleValid } from './cycles.js';
import { lastPaidCycle, normalizePayments } from './payments.js';
import { normalizePeople, normalizeSharedWith } from './people.js';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings.js';

// Mantém a mesma chave das versões anteriores para não perder dados existentes.
export const STORAGE_KEY = 'subDataV5';
export const LEGACY_KEYS = ['subDataV4', 'subDataV3', 'subDataV2', 'subDataV1'];
export const SCHEMA = 9;

export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID(); // só em contexto seguro (https/localhost)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultState() {
  return { schema: SCHEMA, onboarded: false, name: '', budget: 0, interests: [], subs: [], people: [], settings: { ...DEFAULT_SETTINGS }, lastBackupAt: '', backupSnoozeUntil: '' };
}

export function normalizeSub(x, seen = new Set()) {
  const due = normalizeDue(x);
  let id = typeof x.id === 'string' && x.id ? x.id : newId();
  if (seen.has(id)) id = newId();
  seen.add(id);
  const sub = {
    id,
    name: String(x.name),
    domain: x.domain ? String(x.domain) : '',
    category: x.category ? String(x.category) : 'Outros',
    price: parseFloat(x.price) || 0,
    ...due,
    paymentMethod: x.paymentMethod ? String(x.paymentMethod) : 'Cartão',
    // Assinaturas sem data de cadastro: os ciclos só contam a partir de hoje (evita "atrasos" falsos).
    createdAt: parseDay(x.createdAt) ? x.createdAt : todayStr(),
    paidCycle: paidCycleValid(x.paidCycle, due.cycle) ? x.paidCycle : '',
    lastNotified: parseDay(x.lastNotified) ? x.lastNotified : '',
    payments: normalizePayments(x.payments),
    sharedWith: normalizeSharedWith(x.sharedWith),
  };
  // `paidCycle` espelha o último pagamento do histórico; sem histórico, vale o valor legado.
  const lastPaid = lastPaidCycle(sub);
  if (lastPaid) sub.paidCycle = lastPaid;
  return sub;
}

/** Garante um estado válido a partir de qualquer JSON (corrompido, parcial ou de versões antigas). */
export function normalize(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;
  s.name = typeof raw.name === 'string' ? raw.name : '';
  s.budget = parseFloat(raw.budget) || 0;
  s.interests = Array.isArray(raw.interests) ? raw.interests.filter((i) => typeof i === 'string') : [];
  const seen = new Set();
  s.subs = (Array.isArray(raw.subs) ? raw.subs : [])
    .filter((x) => x && x.name)
    .map((x) => normalizeSub(x, seen));
  s.people = normalizePeople(raw.people);
  s.settings = normalizeSettings(raw.settings);
  s.lastBackupAt = parseDay(raw.lastBackupAt) ? raw.lastBackupAt : '';
  s.backupSnoozeUntil = parseDay(raw.backupSnoozeUntil) ? raw.backupSnoozeUntil : '';
  // Se há dados do usuário, ele já passou pelo onboarding (mesmo que a flag tenha se perdido).
  s.onboarded = raw.onboarded === true || !!s.name || s.subs.length > 0;
  return s;
}

function readKey(storage, key) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // JSON corrompido: guarda cópia para não perder o conteúdo.
    try {
      storage.setItem(`${key}:corrupt-backup`, raw);
    } catch {
      /* ignora */
    }
    return null;
  }
}

export function loadState(storage = globalThis.localStorage) {
  let raw = readKey(storage, STORAGE_KEY);
  if (!raw) {
    for (const k of LEGACY_KEYS) {
      raw = readKey(storage, k);
      if (raw) break;
    }
  }
  return normalize(raw);
}

/**
 * Pede ao navegador que não apague o armazenamento do site (best-effort, sem UI).
 * Reduz o risco de limpeza em Safari/iOS fora da Tela de Início, mas não é garantia:
 * o backup continua sendo a rede de segurança.
 * @returns {Promise<boolean>} true se o armazenamento está (ou ficou) persistente
 */
export async function requestPersistence(manager = globalThis.navigator?.storage) {
  try {
    if (!manager || typeof manager.persist !== 'function') return false;
    if (typeof manager.persisted === 'function' && (await manager.persisted())) return true;
    return (await manager.persist()) === true;
  } catch {
    return false;
  }
}

/** @returns {boolean} true se gravou com sucesso */
export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Lê o texto de um backup exportado (ou o JSON bruto do localStorage de versões antigas). */
export function parseImport(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !(Array.isArray(raw.subs) || typeof raw.name === 'string')) {
    throw new Error('Formato de backup não reconhecido.');
  }
  const state = normalize(raw);
  state.onboarded = true;
  return state;
}
