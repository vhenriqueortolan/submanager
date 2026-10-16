import { annualAmount } from './cycles.js';
import { sharers } from './people.js';

const cents = (n) => Math.round(n * 100) / 100;
const annualSum = (subs) => subs.reduce((acc, s) => acc + annualAmount(s), 0);
const annualShareSum = (subs, people) =>
  subs.reduce((acc, s) => acc + annualAmount(s) / (sharers(s, people).length + 1), 0);

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
