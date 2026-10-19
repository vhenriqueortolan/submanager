// Novidades já vistas: por serviço, o instante da novidade mais recente que a pessoa já abriu.
// Fica numa chave própria do localStorage (`subNovidadesVistasV1`), separada de `subDataV5`: não entra em backup nem em schema.
// Regras: na primeira vez que um serviço aparece, nada conta como novo (a base é a novidade mais recente do momento);
// depois, "nova" é a novidade com data posterior à última vista.
import { chaveDoServico } from './novidades.js';
import { isActive } from './status.js';

export const VISTAS_KEY = 'subNovidadesVistasV1';

const instante = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

/** Lê as vistas do texto salvo. Qualquer coisa que não seja um objeto de datas válidas vira "nada visto". */
export function lerVistas(bruto) {
  try {
    const obj = JSON.parse(bruto);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v === 'string' && instante(v) !== null));
  } catch {
    return {};
  }
}

const maisNovo = (itens) => itens.reduce((max, i) => (max === null || instante(i.data) > instante(max) ? i.data : max), null);

/** Inclui, para cada serviço com itens e sem registro, a base: a novidade mais recente de agora. Devolve o mesmo objeto se nada mudou. */
export function comBase(vistas, dados) {
  let novo = vistas;
  for (const [chave, s] of Object.entries(dados?.servicos ?? {})) {
    if (s.status !== 'ok' || vistas[chave] !== undefined) continue;
    const base = maisNovo(s.itens);
    if (base) novo = { ...novo, [chave]: base };
  }
  return novo;
}

/** Marca como vistas as novidades do serviço até `iso`. Só avança; devolve o mesmo objeto se não mudou. */
export function comVista(vistas, chave, iso) {
  if (!chave || instante(iso) === null) return vistas;
  const atual = vistas[chave];
  if (atual !== undefined && instante(atual) >= instante(iso)) return vistas;
  return { ...vistas, [chave]: iso };
}

/** O item é novo? Sem registro do serviço, nunca (primeira vez). */
export const ehNova = (item, vista) => vista !== undefined && instante(item.data) > instante(vista);

/** Quantas novidades não vistas há num serviço (dentro dos itens que o feed traz). */
export function naoLidasDoServico(dominio, dados, vistas) {
  const chave = chaveDoServico(dominio, dados);
  const s = chave && dados.servicos[chave];
  if (!s || s.status !== 'ok') return 0;
  return s.itens.filter((i) => ehNova(i, vistas[chave])).length;
}

/** Total de novidades não vistas nas assinaturas ativas; cada serviço conta uma vez. */
export function contarNaoLidas(subs, dados, vistas) {
  if (!dados) return 0;
  const vistos = new Set();
  let total = 0;
  for (const sub of subs) {
    if (!isActive(sub)) continue;
    const chave = chaveDoServico(sub.domain, dados);
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    total += naoLidasDoServico(sub.domain, dados, vistas);
  }
  return total;
}
