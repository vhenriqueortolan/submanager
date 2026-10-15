import { parseDay, todayStr } from './dates.js';

// Mantém a mesma chave das versões anteriores para não perder dados existentes.
export const STORAGE_KEY = 'subDataV5';
export const LEGACY_KEYS = ['subDataV4', 'subDataV3', 'subDataV2', 'subDataV1'];
export const SCHEMA = 7;

export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID(); // só em contexto seguro (https/localhost)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultState() {
  return { schema: SCHEMA, onboarded: false, name: '', budget: 0, interests: [], subs: [] };
}

export function normalizeSub(x, seen = new Set()) {
  const day = parseInt(x.dueDate, 10);
  let id = typeof x.id === 'string' && x.id ? x.id : newId();
  if (seen.has(id)) id = newId();
  seen.add(id);
  return {
    id,
    name: String(x.name),
    domain: x.domain ? String(x.domain) : '',
    category: x.category ? String(x.category) : 'Outros',
    price: parseFloat(x.price) || 0,
    dueDate: day >= 1 && day <= 31 ? String(day) : '',
    paymentMethod: x.paymentMethod ? String(x.paymentMethod) : 'Cartão',
    // Assinaturas sem data de cadastro: os ciclos só contam a partir de hoje (evita "atrasos" falsos).
    createdAt: parseDay(x.createdAt) ? x.createdAt : todayStr(),
    paidCycle: /^\d{4}-\d{2}$/.test(x.paidCycle || '') ? x.paidCycle : '',
    lastNotified: parseDay(x.lastNotified) ? x.lastNotified : '',
  };
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
  // Se há dados do usuário, ele já passou pelo onboarding (mesmo que a flag tenha se perdido).
  s.onboarded = raw.onboarded === true || !!s.name || s.subs.length > 0;
  return s;
}

function readKey(storage, key) {
  let raw = null;
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
