import { NAME_ERRORS, cleanName } from './people.js';
import { DEFAULT_COUNTRY, isEmail, normalizePhone, suggestCountry } from './phone.js';

// Contatos só via PWA: seletor da agenda (Chrome no Android), arquivo .vcf e digitação. Nada sai do aparelho.

/** O seletor de contatos existe (Chrome no Android) e a página é segura (HTTPS). */
export function supportsContactPicker(nav = globalThis.navigator, secure = globalThis.isSecureContext) {
  return !!secure && !!nav && typeof nav.contacts?.select === 'function';
}

const first = (list) => (Array.isArray(list) && typeof list[0] === 'string' ? list[0] : '');

/** Resultado do seletor ({name: [], tel: [], email: []}) para o formato do vCard: {name, phone, email}. */
export const fromPickerResult = (c) => ({ name: first(c?.name), phone: first(c?.tel), email: first(c?.email) });

/**
 * Abre o seletor do sistema (uma pessoa por vez). Cancelar devolve lista vazia.
 * @returns {Promise<{name: string, phone: string, email: string}[]>}
 */
export async function pickContacts(nav = globalThis.navigator) {
  try {
    const picked = await nav.contacts.select(['name', 'tel', 'email'], { multiple: false });
    return (Array.isArray(picked) ? picked : []).map(fromPickerResult);
  } catch (err) {
    if (err?.name === 'AbortError') return [];
    throw err;
  }
}

/**
 * Prepara a tela de revisão: telefone normalizado (sem + vale o Brasil), país sugerido pelo código,
 * nome obrigatório e nome repetido (na lista atual ou no próprio lote) marcado com o erro de duplicidade.
 * Cada item vem marcado (`selected`) se não tem erro.
 * @param {{name: string, phone?: string, email?: string}[]} raws
 * @param {{name: string}[]} people pessoas já cadastradas
 */
export function prepareCandidates(raws, people = []) {
  const taken = new Set(people.map((p) => p.name.toLowerCase()));
  return (Array.isArray(raws) ? raws : []).map((raw, i) => {
    const name = cleanName(raw?.name);
    let error = '';
    if (!name) error = NAME_ERRORS.empty;
    else if (taken.has(name.toLowerCase())) error = NAME_ERRORS.duplicate;
    else taken.add(name.toLowerCase());
    const phone = normalizePhone(raw?.phone, DEFAULT_COUNTRY);
    const email = isEmail(raw?.email) ? String(raw.email).trim() : '';
    return {
      key: `c${i}`,
      name,
      phone,
      phoneCountry: phone ? suggestCountry(raw.phone)?.iso ?? DEFAULT_COUNTRY : '',
      email,
      error,
      selected: !error,
    };
  });
}
