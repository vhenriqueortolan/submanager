import { useEffect, useMemo, useState } from 'react';
import Logo from './Logo.jsx';
import { CATALOG, PAYMENT_METHODS } from '../lib/catalog.js';
import { buildSub, emptyForm, formFromSub } from '../lib/subs.js';
import { useCompanySearch } from '../hooks/useCompanySearch.js';

function QuickItem({ app, onPick }) {
  return (
    <button type="button" className="quick-item" onClick={() => onPick(app)}>
      <Logo domain={app.domain} name={app.name} className="quick-logo" />
      <div className="quick-name">{app.name}</div>
    </button>
  );
}

/**
 * Modal de cadastro/edição. É montado apenas quando aberto, então cada abertura começa
 * com formulário limpo (sem herdar vencimento/índice da edição anterior).
 */
export default function SubModal({ mode, sub, preset, interests, onSave, onDelete, onClose }) {
  const isEdit = mode === 'edit';
  const [step, setStep] = useState(isEdit || preset ? 2 : 1);
  const [form, setForm] = useState(() => (isEdit ? formFromSub(sub) : emptyForm(preset)));
  const [query, setQuery] = useState('');
  const [source, setSource] = useState(preset?.source || 'manual');
  const search = useCompanySearch(step === 1 ? query : '');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const recommended = useMemo(() => {
    const byInterest = interests.length ? CATALOG.filter((a) => interests.includes(a.category)) : CATALOG;
    return (byInterest.length ? byInterest : CATALOG).slice(0, 8);
  }, [interests]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const pick = (app) => {
    setForm(emptyForm(app));
    setSource(app.source || 'manual');
    setStep(2);
  };
  const searching = query.trim().length >= 2;

  return (
    <div className="modal-overlay" id="add-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal active" role="dialog" aria-modal="true" aria-label={isEdit ? 'Editar assinatura' : 'Nova assinatura'}>
        {step === 1 && (
          <div id="modal-step-1">
            <h2 className="mb-2">Buscar Serviço</h2>
            <input
              type="search"
              className="search-input modal-search"
              id="modal-search-input"
              placeholder="Digite o nome do app..."
              aria-label="Buscar serviço"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <h3 className="section-title grid-title" id="modal-grid-title">
              {searching ? 'Resultados' : 'Recomendados para Você'}
            </h3>

            {searching && search.status === 'loading' && <div className="spinner" role="progressbar" aria-label="Buscando" />}
            {searching && search.status === 'error' && (
              <p className="text-muted error-text">Busca indisponível. Use “Inserir dados manualmente”.</p>
            )}
            {searching && search.status === 'done' && search.items.length === 0 && (
              <p className="text-muted">Nenhum app encontrado.</p>
            )}

            <div className="quick-grid" id="modal-quick-grid">
              {(searching ? search.items : recommended).map((app) => (
                <QuickItem key={`${app.name}-${app.domain}`} app={app} onPick={pick} />
              ))}
            </div>

            <button type="button" className="btn btn-outline mt-20" onClick={() => pick({ name: query.trim() })}>
              + Inserir Dados Manualmente
            </button>
            <button type="button" className="btn btn-outline btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        )}

        {step === 2 && (
          <div id="modal-step-2">
            <h2 className="mb-2">Detalhes Financeiros</h2>

            <div className="form-group">
              <label htmlFor="add-name">Serviço</label>
              <input type="text" id="add-name" value={form.name} onChange={set('name')} />
            </div>

            <div className="form-group">
              <label htmlFor="add-price">Preço Mensal (R$)</label>
              <input
                type="number"
                inputMode="decimal"
                id="add-price"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={set('price')}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="add-due-date">Vencimento (Dia)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  id="add-due-date"
                  min="1"
                  max="31"
                  placeholder="Ex: 10"
                  value={form.dueDate}
                  onChange={set('dueDate')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="add-payment">Pagamento</label>
                <select id="add-payment" value={form.paymentMethod} onChange={set('paymentMethod')}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={!form.name.trim()}
              onClick={() => onSave(buildSub(isEdit ? sub : null, form), { source })}
            >
              Salvar Assinatura
            </button>
            {!isEdit && (
              <button type="button" className="btn btn-outline btn-ghost" onClick={() => setStep(1)}>← Voltar</button>
            )}
            {isEdit && (
              <button type="button" className="btn btn-outline btn-danger" onClick={() => onDelete(sub.id)}>
                Remover Assinatura
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
