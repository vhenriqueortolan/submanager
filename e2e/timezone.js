// Fuso do browser nos testes. O "hoje" das fixtures precisa ser calculado neste fuso,
// e não no do processo Node (o runner do CI roda em UTC e pode já estar no dia seguinte).
export const TIMEZONE = 'America/Sao_Paulo';

// Instante fixo dos testes e2e (quarta-feira, meio-dia em São Paulo). Nenhum teste depende do dia em que roda.
// E2E_NOW (ISO) troca o instante só para verificar outras datas, ex.: E2E_NOW=2026-10-18T15:00:00Z npm run test:e2e.
export const DEFAULT_NOW = '2026-10-21T15:00:00Z';

/** O "agora" dos testes: o mesmo instante no Node (fixtures) e no browser (page.clock). */
export function testNow() {
  return new Date(process.env.E2E_NOW || DEFAULT_NOW);
}

/** Data de hoje no fuso do browser, como Date local à meia-noite. */
export function browserToday(now = testNow()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return new Date(+parts.year, +parts.month - 1, +parts.day);
}
