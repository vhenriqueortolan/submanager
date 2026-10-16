// Fuso do browser nos testes. O "hoje" das fixtures precisa ser calculado neste fuso,
// e não no do processo Node (o runner do CI roda em UTC e pode já estar no dia seguinte).
export const TIMEZONE = 'America/Sao_Paulo';

/** Data de hoje no fuso do browser, como Date local à meia-noite. */
export function browserToday(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return new Date(+parts.year, +parts.month - 1, +parts.day);
}
