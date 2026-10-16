const cents = (n) => Math.round(n * 100) / 100;

/** Soma mensal das assinaturas. (Na Fase 1 passa a normalizar ciclos anuais/semanais.) */
export function monthlyTotal(subs) {
  return cents(subs.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0));
}

export function annualProjection(subs) {
  return cents(monthlyTotal(subs) * 12);
}
