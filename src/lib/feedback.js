/**
 * Formulário de feedback (Google Forms). Com `url` vazia o botão não aparece.
 * `fields` guarda os códigos `entry.NNN` de cada pergunta.
 */
export const FEEDBACK_FORM = { url: '', fields: { version: '', platform: '', comment: '' } };

export function platformOf(userAgent) {
  const ua = userAgent || '';
  if (!ua) return 'Outro';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'Computador';
  return 'Outro';
}

/** Só versão e plataforma vão na URL; o comentário é o que o tester escreve no formulário. */
export function buildFeedbackUrl(form, { version, platform }) {
  if (!form.url) return '';
  const params = new URLSearchParams({ usp: 'pp_url' });
  if (form.fields.version) params.set(form.fields.version, version);
  if (form.fields.platform) params.set(form.fields.platform, platform);
  return `${form.url}?${params}`;
}
