// Leitura de vCard (.vcf): um ou vários contatos, só nome, telefone e e-mail. PHOTO e o resto são ignorados.

/** Desdobra linhas continuadas (a linha seguinte começa com espaço ou tab). */
const unfold = (text) => String(text ?? '').replace(/\r\n|\r/g, '\n').replace(/\n[ \t]/g, '');

const unescape = (v) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/** `N`: sobrenome;nome;adicionais;prefixo;sufixo vira "nome adicionais sobrenome". */
function nameFromN(value) {
  const [family = '', given = '', additional = ''] = value.split(';').map(unescape);
  return [given, additional, family].filter(Boolean).join(' ');
}

/**
 * @param {string} text conteúdo do arquivo
 * @returns {{name: string, phone: string, email: string}[]} um item por vCard (campos ausentes ficam '')
 */
export function parseVCards(text) {
  const out = [];
  let card = null;
  for (const line of unfold(text).split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    const head = line.slice(0, colon).toUpperCase();
    const value = line.slice(colon + 1);
    const prop = head.split(';')[0].split('.').pop(); // tira parâmetros e grupo (item1.TEL)
    if (prop === 'BEGIN' && value.trim().toUpperCase() === 'VCARD') {
      card = { fn: '', n: '', phone: '', email: '' };
    } else if (prop === 'END' && value.trim().toUpperCase() === 'VCARD') {
      if (card) out.push({ name: card.fn || card.n, phone: card.phone, email: card.email });
      card = null;
    } else if (card) {
      if (prop === 'FN' && !card.fn) card.fn = unescape(value);
      else if (prop === 'N' && !card.n) card.n = nameFromN(value);
      else if (prop === 'TEL' && !card.phone) card.phone = unescape(value);
      else if (prop === 'EMAIL' && !card.email) card.email = unescape(value);
    }
  }
  return out;
}
// medição
