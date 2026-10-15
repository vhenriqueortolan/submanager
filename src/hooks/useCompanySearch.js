import { useEffect, useState } from 'react';
import { searchCompanies } from '../lib/search.js';

const IDLE = { status: 'idle', items: [] };

/** Busca com debounce e cancelamento de requisições antigas. status: idle | loading | done | error */
export function useCompanySearch(query, delay = 500) {
  const q = query.trim();
  const [result, setResult] = useState({ status: 'idle', items: [], query: '' });

  useEffect(() => {
    if (q.length < 2) return undefined;
    setResult({ status: 'loading', items: [], query: q });
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const items = await searchCompanies(q, ctrl.signal);
        setResult({ status: 'done', items, query: q });
      } catch (err) {
        if (err.name !== 'AbortError') setResult({ status: 'error', items: [], query: q });
      }
    }, delay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, delay]);

  if (q.length < 2) return IDLE;
  if (result.query !== q) return { status: 'loading', items: [] };
  return result;
}
