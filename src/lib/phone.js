// Telefones: tabela estática de países (sem dependência) e normalização para o formato internacional (E.164).

/** [ISO alpha-2, nome, código de discagem]. Em código compartilhado (+1, +7), o primeiro da lista é a sugestão. */
const TABLE = [
  ['BR', 'Brasil', '55'], ['US', 'Estados Unidos', '1'], ['CA', 'Canadá', '1'], ['PT', 'Portugal', '351'],
  ['AR', 'Argentina', '54'], ['BO', 'Bolívia', '591'], ['CL', 'Chile', '56'], ['CO', 'Colômbia', '57'],
  ['EC', 'Equador', '593'], ['PY', 'Paraguai', '595'], ['PE', 'Peru', '51'], ['UY', 'Uruguai', '598'],
  ['VE', 'Venezuela', '58'], ['MX', 'México', '52'], ['CR', 'Costa Rica', '506'], ['PA', 'Panamá', '507'],
  ['GT', 'Guatemala', '502'], ['DO', 'República Dominicana', '1'], ['CU', 'Cuba', '53'],
  ['ES', 'Espanha', '34'], ['FR', 'França', '33'], ['DE', 'Alemanha', '49'], ['IT', 'Itália', '39'],
  ['GB', 'Reino Unido', '44'], ['IE', 'Irlanda', '353'], ['NL', 'Países Baixos', '31'], ['BE', 'Bélgica', '32'],
  ['CH', 'Suíça', '41'], ['AT', 'Áustria', '43'], ['LU', 'Luxemburgo', '352'], ['SE', 'Suécia', '46'],
  ['NO', 'Noruega', '47'], ['DK', 'Dinamarca', '45'], ['FI', 'Finlândia', '358'], ['PL', 'Polônia', '48'],
  ['CZ', 'Tchéquia', '420'], ['GR', 'Grécia', '30'], ['RO', 'Romênia', '40'], ['HU', 'Hungria', '36'],
  ['UA', 'Ucrânia', '380'], ['RU', 'Rússia', '7'], ['KZ', 'Cazaquistão', '7'], ['TR', 'Turquia', '90'],
  ['IL', 'Israel', '972'], ['AE', 'Emirados Árabes Unidos', '971'], ['SA', 'Arábia Saudita', '966'],
  ['EG', 'Egito', '20'], ['ZA', 'África do Sul', '27'], ['NG', 'Nigéria', '234'], ['KE', 'Quênia', '254'],
  ['MA', 'Marrocos', '212'], ['AO', 'Angola', '244'], ['MZ', 'Moçambique', '258'], ['CV', 'Cabo Verde', '238'],
  ['IN', 'Índia', '91'], ['PK', 'Paquistão', '92'], ['BD', 'Bangladesh', '880'], ['CN', 'China', '86'],
  ['HK', 'Hong Kong', '852'], ['JP', 'Japão', '81'], ['KR', 'Coreia do Sul', '82'], ['TW', 'Taiwan', '886'],
  ['TH', 'Tailândia', '66'], ['VN', 'Vietnã', '84'], ['PH', 'Filipinas', '63'], ['ID', 'Indonésia', '62'],
  ['MY', 'Malásia', '60'], ['SG', 'Singapura', '65'], ['AU', 'Austrália', '61'], ['NZ', 'Nova Zelândia', '64'],
];

export const COUNTRIES = TABLE.map(([iso, name, dial]) => ({ iso, name, dial }));
export const DEFAULT_COUNTRY = 'BR';

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));
const BY_DIAL = new Map();
for (const c of COUNTRIES) if (!BY_DIAL.has(c.dial)) BY_DIAL.set(c.dial, c);

const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export const isCountry = (iso) => BY_ISO.has(iso);
export const countryOf = (iso) => BY_ISO.get(iso) ?? BY_ISO.get(DEFAULT_COUNTRY);

/** Número escrito já em formato internacional: começa com + ou 00. */
const isInternational = (raw) => /^\s*(\+|00)/.test(String(raw ?? ''));
const digitsOf = (raw) => String(raw ?? '').replace(/\D/g, '');
/** Dígitos do número internacional, sem o + nem o 00 de saída. */
const internationalDigits = (raw) => {
  const digits = digitsOf(raw);
  return /^\s*00/.test(String(raw)) ? digits.slice(2) : digits;
};

/**
 * Sugere o país pelo código do número, pelo prefixo mais longo. Só com + (ou 00): número sem + nunca sugere país.
 * `ambiguous`: o código é de mais de um país (ex.: +1); a sugestão é o primeiro da tabela e a pessoa pode trocar.
 * @returns {{iso: string, dial: string, ambiguous: boolean} | null}
 */
export function suggestCountry(raw) {
  if (!isInternational(raw)) return null;
  const digits = internationalDigits(raw);
  for (let len = 3; len >= 1; len -= 1) {
    const found = BY_DIAL.get(digits.slice(0, len));
    if (found) return { iso: found.iso, dial: found.dial, ambiguous: COUNTRIES.filter((c) => c.dial === found.dial).length > 1 };
  }
  return null;
}

/**
 * Normaliza para o formato internacional: `+` e 8 a 15 dígitos. Com + (ou 00) o número já traz o país;
 * sem + vale o país selecionado (o zero de tronco, como em 011..., sai). Devolve '' se o número não serve.
 */
export function normalizePhone(raw, iso = DEFAULT_COUNTRY) {
  let digits = digitsOf(raw);
  if (!digits) return '';
  digits = isInternational(raw) ? internationalDigits(raw) : countryOf(iso).dial + digits.replace(/^0+/, '');
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS ? `+${digits}` : '';
}

/** Mensagem de erro, ou '' quando o campo está vazio (opcional) ou válido. */
export function phoneError(raw, iso = DEFAULT_COUNTRY) {
  if (!digitsOf(raw)) return '';
  return normalizePhone(raw, iso) ? '' : 'Informe um telefone com 8 a 15 dígitos, com DDD';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True quando o e-mail tem formato válido (até 254 caracteres). */
export const isEmail = (raw) => {
  const v = String(raw ?? '').trim();
  return v.length <= 254 && EMAIL_RE.test(v);
};

/** Mensagem de erro, ou '' quando vazio (opcional) ou válido. */
export function emailError(raw) {
  return !String(raw ?? '').trim() || isEmail(raw) ? '' : 'Informe um e-mail válido';
}
