import { annualAmount } from './cycles.js';
import { sharers } from './people.js';
import { isActive, statusOf } from './status.js';

const cents = (n) => Math.round(n * 100) / 100;
// Pausadas e canceladas saem de todos os totais e previsões.
const annualSum = (subs) => subs.filter(isActive).reduce((acc, s) => acc + annualAmount(s), 0);
const annualShareSum = (subs, people) =>
  subs.filter(isActive).reduce((acc, s) => acc + annualAmount(s) / (sharers(s, people).length + 1), 0);

/** Seu gasto mensal (sua parte): anuais e semanais convertidas para mês. Sem `people`, o preço cheio. */
export function monthlyTotal(subs, people = []) {
  return cents(annualShareSum(subs, people) / 12);
}

/** Sua projeção anual (sua parte). */
export function annualProjection(subs, people = []) {
  return cents(annualShareSum(subs, people));
}

/** Total dos serviços por mês, a preço cheio (sem dividir). */
export function totalServiceMonthly(subs) {
  return cents(annualSum(subs) / 12);
}

/** Economia mensal (sua parte) das assinaturas canceladas. Pausadas não entram: voltam a cobrar. */
export function cancelledMonthlySavings(subs, people = []) {
  const cancelled = subs.filter((s) => statusOf(s) === 'cancelled');
  return cents(cancelled.reduce((acc, s) => acc + annualAmount(s) / (sharers(s, people).length + 1), 0) / 12);
}
