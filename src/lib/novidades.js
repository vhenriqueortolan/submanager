// Novidades dos serviços: lê public/feeds/novidades.json (gerado no build) e decide o que cada tela mostra.
// Lógica pura: quem usa passa os dados já lidos. O JSON fica fora do localStorage; nada aqui grava dados da pessoa.
import { todayStr } from './dates.js';
import { isActive } from './status.js';

export const URL_NOVIDADES = '/feeds/novidades.json';
export const MAX_RESUMO = 3;
const STATUS_VALIDOS = ['ok', 'sem-feed', 'erro'];

export const TEXTOS = {
  semItens: 'Nenhuma novidade recente nesta fonte.',
  erro: 'Não foi possível ler a fonte de novidades agora.',
  semFeedTitulo: 'Sem feed ainda',
  semFeedTexto: 'Ainda não há uma fonte oficial de novidades para este serviço.',
};

const itemValido = (i) => i && typeof i.titulo === 'string' && typeof i.url === 'string' && typeof i.data === 'string' && !Number.isNaN(new Date(i.data).getTime());

/** Confere o formato do JSON. Devolve os dados limpos, ou null se não servem (página HTML no lugar, JSON quebrado). */
export function validarNovidades(json) {
  if (!json || typeof json !== 'object' || !json.servicos || typeof json.servicos !== 'object') return null;
  const servicos = {};
  for (const [dominio, s] of Object.entries(json.servicos)) {
    if (!s || !STATUS_VALIDOS.includes(s.status)) continue;
    servicos[dominio] = {
      tipo: s.tipo === 'terceiro' ? 'terceiro' : s.tipo === 'nenhum' ? 'nenhum' : 'oficial',
      fonte: typeof s.fonte === 'string' ? s.fonte : '',
      status: s.status,
      itens: Array.isArray(s.itens) ? s.itens.filter(itemValido) : [],
    };
  }
  return { geradoEm: typeof json.geradoEm === 'string' ? json.geradoEm : '', servicos };
}

/** Baixa e valida o JSON. Nunca lança: devolve null em qualquer falha. */
export async function lerNovidades(fetchFn = globalThis.fetch) {
  try {
    const res = await fetchFn(URL_NOVIDADES, { cache: 'no-cache' });
    if (!res.ok) return null;
    return validarNovidades(await res.json());
  } catch {
    return null;
  }
}

/** "https://www.Spotify.com/br" → "spotify.com". */
export function normalizarDominio(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^www\./, '');
}

/** Liga a assinatura ao registro de fontes pelo domínio: igual, ou subdomínio (open.spotify.com → spotify.com). */
export function chaveDoServico(dominio, dados) {
  const host = normalizarDominio(dominio);
  if (!host || !dados) return null;
  return Object.keys(dados.servicos).find((k) => host === k || host.endsWith(`.${k}`)) ?? null;
}

export const rotuloFonte = (servico) => (servico.tipo === 'terceiro' ? `Fonte de terceiro: ${servico.fonte}` : 'Fonte oficial');

/** Dia local (dd/mm/aaaa) de um instante em ISO. */
export function dataLocal(iso) {
  const [a, m, d] = todayStr(new Date(iso)).split('-');
  return `${d}/${m}/${a}`;
}

/**
 * O que mostrar no espaço do serviço.
 * `dados`: resultado de lerNovidades (undefined = ainda lendo; null = não foi possível ler).
 * Estados: carregando | ok | vazio | erro | sem-feed.
 */
export function estadoNovidades(dominio, dados) {
  const host = normalizarDominio(dominio);
  const paginaUrl = host ? `https://${host}` : '';
  if (!host) return { estado: 'sem-feed', itens: [], paginaUrl };
  if (dados === undefined) return { estado: 'carregando', itens: [], paginaUrl };
  if (dados === null) return { estado: 'erro', itens: [], paginaUrl };
  const chave = chaveDoServico(host, dados);
  if (!chave) return { estado: 'sem-feed', itens: [], paginaUrl };
  const s = dados.servicos[chave];
  if (s.status === 'sem-feed') return { estado: 'sem-feed', itens: [], paginaUrl };
  if (s.status === 'erro') return { estado: 'erro', itens: [], paginaUrl, rotulo: rotuloFonte(s) };
  return { estado: s.itens.length ? 'ok' : 'vazio', itens: s.itens, paginaUrl, rotulo: rotuloFonte(s) };
}

/** Subaba aberta por padrão ao editar uma assinatura: Novidades se o serviço tem fonte, senão Plano. */
export function subabaInicial(dominio, dados) {
  const { estado } = estadoNovidades(dominio, dados);
  return estado === 'ok' || estado === 'vazio' || estado === 'erro' ? 'novidades' : 'plano';
}

/**
 * Resumo da Home: até 3 novidades mais recentes entre as assinaturas ativas cujo feed está com status "ok".
 * Cada serviço entra uma vez, mesmo com duas assinaturas dele.
 */
export function resumoHome(subs, dados, max = MAX_RESUMO) {
  if (!dados) return [];
  const vistos = new Set();
  const itens = [];
  for (const sub of subs) {
    if (!isActive(sub)) continue;
    const chave = chaveDoServico(sub.domain, dados);
    if (!chave || vistos.has(chave)) continue;
    const s = dados.servicos[chave];
    if (s.status !== 'ok') continue;
    vistos.add(chave);
    for (const i of s.itens) itens.push({ ...i, servico: sub.name, dominio: sub.domain });
  }
  return itens.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)).slice(0, max);
}

/**
 * Pedido de fonte, por enquanto só simulado (D-017): não faz rede, não grava nada e não muda a tela.
 * O envio real vem com o backend. `dominio` (string) é o serviço escolhido, ainda sem uso.
 */
export const solicitarFonte = () => undefined;
