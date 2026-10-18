// Leitor de feeds RSS 2.0 e Atom. Função pura, sem dependências: recebe o texto XML e devolve as novidades.

export const MAX_ITENS = 10;

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…',
};

function decodificar(texto) {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteiro, nome) => {
    if (nome[0] === '#') {
      const codigo = nome[1].toLowerCase() === 'x' ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
      return Number.isFinite(codigo) && codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : inteiro;
    }
    return ENTIDADES[nome.toLowerCase()] ?? inteiro;
  });
}

// CDATA vale como texto literal; fora dele valem as entidades.
function textoDe(bruto) {
  const partes = bruto.split(/(<!\[CDATA\[[\s\S]*?\]\]>)/);
  return partes
    .map((p) => (p.startsWith('<![CDATA[') ? p.slice(9, -3) : decodificar(p)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tira os blocos grandes de conteúdo (corpo do artigo), que podem trazer tags com o mesmo nome (<title>, <link>).
function semCorpo(bloco) {
  return bloco.replace(/<(content:encoded|description|content|summary)(\s[^>]*)?>[\s\S]*?<\/\1>/gi, '');
}

function tag(bloco, nome) {
  const m = bloco.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, 'i'));
  return m ? textoDe(m[1]) : '';
}

function linkDe(bloco) {
  // RSS: <link>url</link>
  const texto = tag(bloco, 'link');
  if (texto) return texto;
  // Atom: <link href="..." rel="alternate"/>; sem rel também vale como alternate.
  const links = [...bloco.matchAll(/<link\s([^>]*?)\/?>/gi)].map((m) => m[1]);
  const attr = (a, nome) => {
    const m = a.match(new RegExp(`${nome}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
    return m ? decodificar(m[2] ?? m[3]) : '';
  };
  const alvo = links.find((a) => !attr(a, 'rel') || attr(a, 'rel') === 'alternate') ?? '';
  return attr(alvo, 'href').trim();
}

function dataDe(bloco) {
  const bruta = tag(bloco, 'pubDate') || tag(bloco, 'dc:date') || tag(bloco, 'published') || tag(bloco, 'updated');
  if (!bruta) return '';
  const d = new Date(bruta);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

const ehHttp = (url) => /^https?:\/\/\S+$/i.test(url);

/** O texto parece um feed RSS ou Atom (e não uma página HTML ou um erro)? */
export function ehFeed(xml) {
  return typeof xml === 'string' && /<(rss|feed)[\s>]/i.test(xml.slice(0, 4000));
}

/**
 * Lê um feed RSS 2.0 ou Atom e devolve `[{ titulo, data (ISO), url }]`, do mais novo para o mais antigo,
 * no máximo 10. Ignora item sem título, sem link http(s) ou com data inválida.
 */
export function parseFeed(xml) {
  if (!ehFeed(xml)) return [];
  const blocos = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((m) => semCorpo(m[2]));
  const itens = [];
  for (const bloco of blocos) {
    const titulo = tag(bloco, 'title');
    const url = linkDe(bloco);
    const data = dataDe(bloco);
    if (!titulo || !ehHttp(url) || !data) continue;
    itens.push({ titulo, data, url });
  }
  return itens.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)).slice(0, MAX_ITENS);
}
