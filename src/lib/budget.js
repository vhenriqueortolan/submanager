/**
 * Interpreta o valor digitado no campo de orçamento (pt-BR): aceita vírgula ou ponto como separador decimal.
 * Vazio vale 0 (sem valor). Devolve null quando o texto não é um valor válido.
 * Com os dois separadores ("1.234,50"), o último é o decimal.
 */
export function parseMoneyInput(text) {
  const raw = String(text ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  if (raw === '') return 0;
  if (!/^[0-9.,]+$/.test(raw) || !/\d/.test(raw)) return null;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  const decimalAt = Math.max(lastComma, lastDot);
  let normalized;
  if (decimalAt === -1) {
    normalized = raw;
  } else {
    const decimalChar = raw[decimalAt];
    const rawInt = raw.slice(0, decimalAt);
    if (rawInt.includes(decimalChar)) return null; // "1,2,3": só o outro separador pode marcar milhares
    const intPart = rawInt.replace(/[.,]/g, '');
    normalized = `${intPart || '0'}.${raw.slice(decimalAt + 1)}`;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** Valor salvo → texto do campo ("300" ou "300,5"); 0 vira campo vazio. */
export function moneyToInput(value) {
  const n = Number(value);
  return n > 0 ? String(n).replace('.', ',') : '';
}
