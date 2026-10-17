import { newId } from './storage.js';
import { isCountry, isEmail } from './phone.js';

const MAX_NAME = 40;
const cents = (n) => Math.round(n * 100) / 100;

/** Nome sem espaços extras, com no máximo 40 caracteres. */
export function cleanName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_NAME).trim();
}

/** Ids de `sharedWith` que ainda existem em `people` (sem repetição). */
export function sharers(sub, people = []) {
  const valid = new Set(people.map((p) => p.id));
  const list = Array.isArray(sub.sharedWith) ? sub.sharedWith : [];
  return [...new Set(list.filter((id) => valid.has(id)))];
}

/** Sua parte do preço: preço ÷ (pessoas + você). Sem divisão, o preço cheio. */
export function myShare(sub, people = []) {
  const price = parseFloat(sub.price) || 0;
  return cents(price / (sharers(sub, people).length + 1));
}

/** Pessoa já cadastrada (sem diferenciar maiúsculas) ou uma nova; null se o nome ficar vazio. */
export function resolvePerson(people, rawName) {
  const name = cleanName(rawName);
  if (!name) return null;
  const found = people.find((p) => p.name.toLowerCase() === name.toLowerCase());
  return found ? { person: found, isNew: false } : { person: { id: newId(), name }, isNew: true };
}

/** Tira a pessoa da lista e de todas as assinaturas. */
export function removePersonFromState(state, personId) {
  return {
    ...state,
    people: state.people.filter((p) => p.id !== personId),
    subs: state.subs.map((s) => ({ ...s, sharedWith: (s.sharedWith || []).filter((id) => id !== personId) })),
  };
}

/** Limpa o que veio do disco: nomes limpos, ids únicos, inválidos descartados. */
export function normalizePeople(list) {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x !== 'object') continue;
    const name = cleanName(x.name);
    if (!name) continue;
    let id = typeof x.id === 'string' && x.id ? x.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    out.push({ id, name, ...optionalContact(x) });
  }
  return out;
}

/** Telefone (já internacional), país e e-mail são opcionais: só entram na pessoa quando válidos. */
function optionalContact(x) {
  const extra = {};
  const phone = typeof x.phone === 'string' ? x.phone.trim() : '';
  if (/^\+\d{8,15}$/.test(phone)) {
    extra.phone = phone;
    if (isCountry(x.phoneCountry)) extra.phoneCountry = x.phoneCountry;
  }
  if (typeof x.email === 'string' && isEmail(x.email)) extra.email = x.email.trim();
  return extra;
}

export function normalizeSharedWith(list) {
  return [...new Set((Array.isArray(list) ? list : []).filter((id) => typeof id === 'string' && id))];
}

/** Quantas assinaturas estão divididas com a pessoa. */
export function sharedCount(subs, personId) {
  return subs.filter((s) => Array.isArray(s.sharedWith) && s.sharedWith.includes(personId)).length;
}

export const NAME_ERRORS = {
  empty: 'Informe um nome',
  'too-long': `O nome pode ter até ${MAX_NAME} caracteres`,
  duplicate: 'Já existe uma pessoa com esse nome',
};

/**
 * Renomeia uma pessoa. Devolve `{ people }` com a lista nova, ou `{ error }` ('empty' | 'too-long' | 'duplicate').
 * Outra pessoa com o mesmo nome (sem diferenciar maiúsculas) bloqueia; mudar só as maiúsculas do próprio nome vale.
 */
export function renamePerson(people, id, rawName) {
  const squeezed = String(rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!squeezed) return { error: 'empty' };
  if (squeezed.length > MAX_NAME) return { error: 'too-long' };
  if (people.some((p) => p.id !== id && p.name.toLowerCase() === squeezed.toLowerCase())) return { error: 'duplicate' };
  return { people: people.map((p) => (p.id === id ? { ...p, name: squeezed } : p)) };
}

/**
 * Pessoa nova com contato opcional. Devolve `{ person }`, ou `{ error }` ('empty' | 'too-long' | 'duplicate').
 * `input`: { name, phone?, phoneCountry?, email? }, com o telefone já em formato internacional.
 */
export function newPerson(people, input) {
  const squeezed = String(input?.name ?? '').trim().replace(/\s+/g, ' ');
  if (!squeezed) return { error: 'empty' };
  if (squeezed.length > MAX_NAME) return { error: 'too-long' };
  if (people.some((p) => p.name.toLowerCase() === squeezed.toLowerCase())) return { error: 'duplicate' };
  return { person: { id: newId(), name: squeezed, ...optionalContact(input) } };
}

/** Atualiza nome e contato de uma pessoa (mesmas regras de `renamePerson`). Devolve `{ people }` ou `{ error }`. */
export function updatePerson(people, id, input) {
  const renamed = renamePerson(people, id, input?.name);
  if (renamed.error) return renamed;
  return {
    people: renamed.people.map((p) => {
      if (p.id !== id) return p;
      return { id: p.id, name: p.name, ...optionalContact(input) }; // contato antigo sai: o que vale é o novo
    }),
  };
}
