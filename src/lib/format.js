export const brl = (n) =>
  (parseFloat(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=111&color=fff`;
}
