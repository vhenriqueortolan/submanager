import { useState } from 'react';
import AppBrand from './AppBrand.jsx';
import Logo from './Logo.jsx';
import { CATALOG, CATEGORIES } from '../lib/catalog.js';
import { brl } from '../lib/format.js';
import { useCompanySearch } from '../hooks/useCompanySearch.js';

const TODOS = { value: 'Todos', label: 'Todos' };

function AppCard({ app, badge, onPick }) {
  return (
    <div
      className="sub-card"
      role="button"
      tabIndex={0}
      onClick={() => onPick(app)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(app);
        }
      }}
    >
      <div className="flex">
        <Logo domain={app.domain} name={app.name} className="sub-logo" />
        <div className="sub-info">
          <div className="sub-title">{app.name}</div>
          <div className="sub-meta">
            <span className="badge">{badge}</span>
            {app.price !== '' && app.price !== undefined && <span className="badge">{brl(app.price)}</span>}
          </div>
        </div>
      </div>
      <span className="plus" aria-hidden="true">+</span>
    </div>
  );
}

/**
 * Esta aba só existe montada quando está ativa: ao reabrir, o estado volta ao padrão
 * (categoria "Todos", sem busca).
 */
export default function Discover({ onPick }) {
  const [category, setCategory] = useState(TODOS.value);
  const [query, setQuery] = useState('');
  const search = useCompanySearch(query);
  const searching = query.trim().length >= 2;
  const list = category === TODOS.value ? CATALOG : CATALOG.filter((a) => a.category === category);

  return (
    <main className="container active" id="view-discover">
      <AppBrand title="Descobrir" />

      <div className="search-box">
        <input
          type="search"
          className="search-input"
          id="search-api"
          placeholder="🔍 Buscar catálogo global..."
          aria-label="Buscar serviço"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searching ? (
        <div id="search-results" className="search-results">
          <h3 className="section-title">Resultados da Busca</h3>
          {search.status === 'loading' && <div className="spinner" role="progressbar" aria-label="Buscando" />}
          {search.status === 'error' && (
            <p className="text-muted error-text">Busca indisponível no momento. Você pode inserir os dados manualmente.</p>
          )}
          {search.status === 'done' && search.items.length === 0 && (
            <p className="text-muted">Nenhum app encontrado.</p>
          )}
          {search.items.map((app) => (
            <AppCard key={`${app.name}-${app.domain}`} app={app} badge="App Global" onPick={onPick} />
          ))}
          {(search.status === 'done' || search.status === 'error') && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onPick({ name: query.trim(), domain: '', category: 'Outros', price: '', source: 'manual' })}
            >
              + Inserir dados de “{query.trim()}” manualmente
            </button>
          )}
        </div>
      ) : (
        <div id="discover-categories">
          <div className="pill-scroll" role="group" aria-label="Filtrar por categoria">
            {[TODOS, ...CATEGORIES].map((c) => (
              <button
                key={c.value}
                type="button"
                data-cat={c.value}
                className={`category-pill${category === c.value ? ' active' : ''}`}
                aria-pressed={category === c.value}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div id="discover-list">
            {list.map((app) => (
              <AppCard key={app.name} app={app} badge={app.category} onPick={onPick} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
// medição
