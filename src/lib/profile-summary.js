/** Resumos mostrados nas linhas do hub do Perfil. */

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function money(n) {
  const digits = Number.isInteger(n) ? 0 : 2;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function profileSummary(state) {
  const count = Array.isArray(state.interests) ? state.interests.length : 0;
  const interests = count ? plural(count, 'interesse', 'interesses') : 'Sem interesses';
  return state.name ? `${state.name} · ${interests}` : interests;
}

export function budgetSummary(state) {
  const budget = Number(state.budget) || 0;
  const people = Array.isArray(state.people) ? state.people.length : 0;
  const value = budget > 0 ? `${money(budget)} por mês` : 'Sem valor definido';
  return people > 0 ? `${value} · dividindo com ${people}` : value;
}

export function notificationsSummary(settings) {
  if (!settings.enabled) return 'Desligadas';
  const days = settings.advanceDays;
  return days > 0 ? `Ativas · ${plural(days, 'dia', 'dias')} antes` : 'Ativas';
}

/** `lastBackupAt` vem como AAAA-MM-DD (data local). */
export function dataSummary(state) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(state.lastBackupAt || '');
  return m ? `Último backup em ${m[2]}/${m[1]}` : 'Nenhum backup ainda';
}

export function aboutSummary(version, feedbackUrl) {
  return feedbackUrl ? `v${version} · Enviar feedback` : `v${version}`;
}
