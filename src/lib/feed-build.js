// Gera o conteúdo de public/feeds/novidades.json a partir do registro de fontes. Sem rede própria:
// quem chama passa o `fetch`, para o teste rodar sem internet. Nunca lança: falha vira status "erro".
import { ehFeed, parseFeed } from './feed.js';

export const TIMEOUT_MS = 15000;
export const USER_AGENT = 'SubManagerBot/1.0 (leitor de novidades; +https://github.com/vhenriqueortolan/submanager)';
const ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8';

const hostDe = (url) => {
  try { return new URL(url).hostname; } catch { return ''; }
};

// Uma segunda tentativa cobre falha passada de rede (ocorreu uma vez em 8 execuções reais do Spotify).
async function lerFeed(url, opcoes) {
  return (await lerUmaVez(url, opcoes)) ?? (await lerUmaVez(url, opcoes));
}

async function lerUmaVez(url, { fetchFn, timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': USER_AGENT, Accept: ACCEPT } });
    if (!res.ok) return null;
    const texto = await res.text();
    return ehFeed(texto) ? parseFeed(texto) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {Array<{dominio:string,tipo:string,feed:string|null}>} fontes
 * @param {{fetchFn?:Function, agora?:Date, offline?:boolean, timeoutMs?:number}} [opcoes]
 */
export async function gerarNovidades(fontes, { fetchFn = globalThis.fetch, agora = new Date(), offline = false, timeoutMs = TIMEOUT_MS } = {}) {
  const servicos = {};
  await Promise.all(
    fontes.map(async (f) => {
      if (f.tipo === 'nenhum' || !f.feed) {
        servicos[f.dominio] = { tipo: f.tipo, status: 'sem-feed', itens: [] };
        return;
      }
      const itens = offline ? null : await lerFeed(f.feed, { fetchFn, timeoutMs });
      servicos[f.dominio] = itens
        ? { tipo: f.tipo, fonte: hostDe(f.feed), status: 'ok', itens }
        : { tipo: f.tipo, fonte: hostDe(f.feed), status: 'erro', itens: [] };
    }),
  );
  // Ordem estável, igual à do registro.
  const ordenado = Object.fromEntries(fontes.map((f) => [f.dominio, servicos[f.dominio]]));
  return { geradoEm: agora.toISOString(), servicos: ordenado };
}
