import { parseDay, todayStr } from './dates.js';
import { normalizeDue, paidCycleValid } from './cycles.js';
import { lastPaidCycle, normalizePayments } from './payments.js';
import { normalizePeople, normalizeSharedWith } from './people.js';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings.js';
import { normalizeStatus } from './status.js';

// Mantém a mesma chave das versões anteriores para não perder dados existentes.
export const STORAGE_KEY = 'subDataV5';
export const LEGACY_KEYS = ['subDataV4', 'subDataV3', 'subDataV2', 'subDataV1'];
export const SCHEMA = 10;

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
    payments: normalizePayments(x.payments, { divided: normalizeSharedWith(x.sharedWith).length > 0 }),
    sharedWith: normalizeSharedWith(x.sharedWith),
    autoCharge: x.autoCharge === true,
    muted: x.muted === true,
    ...normalizeStatus(x),
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

const CORRUPT_SUFFIX = ':corrupt-backup';

/**
 * Apaga tudo o que o app guardou neste navegador: a chave atual, as legadas e as cópias de
 * JSON corrompido (`*:corrupt-backup`). Não mexe em nenhuma outra chave.
 * @returns {boolean} true se removeu tudo
 */
export function clearAllData(storage = globalThis.localStorage) {
  try {
    const owned = new Set([STORAGE_KEY, ...LEGACY_KEYS]);
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k !== null && (owned.has(k) || k.endsWith(CORRUPT_SUFFIX))) keys.push(k);
    }
    // Coletadas antes de remover: remover durante a varredura muda os índices.
    for (const k of keys) storage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** Confirmação por digitação (ex.: "APAGAR"): palavra exata, ignorando só espaços nas pontas. */
export function matchesConfirmation(input, word) {
  return typeof input === 'string' && input.trim() === word;
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
