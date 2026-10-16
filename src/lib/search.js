// Busca global de serviços. Isolada neste módulo: se o provedor mudar, só este arquivo muda.
// Atualmente usa o endpoint de autocomplete da Clearbit (nome + domínio; os logos vêm do icon.horse).
const ENDPOINT = 'https://autocomplete.clearbit.com/v1/companies/suggest';

export async function searchCompanies(query, signal) {
  const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`Busca falhou (HTTP ${res.status})`);
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .filter((c) => c && c.name)
    .map((c) => ({ name: String(c.name), domain: String(c.domain || ''), category: 'Outros', price: '', source: 'search' }));
}
