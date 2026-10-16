import { annualAmount } from './cycles.js';

const cents = (n) => Math.round(n * 100) / 100;
const annualSum = (subs) => subs.reduce((acc, s) => acc + annualAmount(s), 0);

/** Gasto mensal equivalente: assinaturas anuais e semanais convertidas para mês. */
export function monthlyTotal(subs) {
  return cents(annualSum(subs) / 12);
}

export function annualProjection(subs) {
  return cents(annualSum(subs));
}
