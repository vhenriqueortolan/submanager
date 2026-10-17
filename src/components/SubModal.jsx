import { useMemo, useState } from 'react';
import Logo from './Logo.jsx';
import DetailScreen from './DetailScreen.jsx';
import { CATALOG, PAYMENT_METHODS } from '../lib/catalog.js';
import { buildSub, emptyForm, formFromSub } from '../lib/subs.js';
import { CYCLES, annualAmount } from '../lib/cycles.js';
import { paymentsNewestFirst } from '../lib/payments.js';
import { resolvePerson } from '../lib/people.js';
import { MONTHS, WEEKDAYS, brl } from '../lib/format.js';
import { useCompanySearch } from '../hooks/useCompanySearch.js';

const formatDay = (day) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : 'Sem data';
};

function QuickItem({ app, onPick }) {
  return (
    <button type="button" className="quick-item" onClick={() => onPick(app)}>
      <Logo domain={app.domain} name={app.name} className="quick-logo" />
      <div className="quick-name">{app.name}</div>
    </button>
  );
}

/**
 * Cadastro/edição de assinatura como tela de detalhe. É montado apenas quando aberto, então cada abertura começa
 * com formulário limpo. Cadastro novo: o passo 1 (buscar) é a raiz e o passo 2 (detalhes) empilha sobre ele,
 * então ← e o Voltar do sistema no passo 2 voltam ao passo 1. Edição ou serviço já escolhido: o passo 2 é a raiz.
 */
export default function SubModal({ mode, sub, preset, interests, people, onAddPerson, onSave, onDelete, onUnpay, onClose }) {
  const isEdit = mode === 'edit';
  const startsAtDetails = isEdit || !!preset;
  const [step, setStep] = useState(startsAtDetails ? 2 : 1);
  const [form, setForm] = useState(() => (isEdit ? formFromSub(sub) : emptyForm(preset)));
  const [baseline, setBaseline] = useState(form); // o que a pessoa ainda não mexeu: a base do "Descartar alterações?"
  const [query, setQuery] = useState('');
  const [personName, setPersonName] = useState('');
  const [source, setSource] = useState(preset?.source || 'manual');
  const search = useCompanySearch(step === 1 ? query : '');
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const recommended = useMemo(() => {
    const byInterest = interests.length ? CATALOG.filter((a) => interests.includes(a.category)) : CATALOG;
    return (byInterest.length ? byInterest : CATALOG).slice(0, 8);
  }, [interests]);

  const [autoTouched, setAutoTouched] = useState(isEdit);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  // Cadastro novo: a cobrança automática acompanha o método (Cartão) até o usuário mexer na opção.
  const setPayment = (e) => {
    const paymentMethod = e.target.value;
    setForm((f) => ({ ...f, paymentMethod, autoCharge: autoTouched ? f.autoCharge : paymentMethod === 'Cartão' }));
  };
  const setFlag = (field) => (e) => {
    const { checked } = e.target;
    if (field === 'autoCharge') setAutoTouched(true);
    setForm((f) => ({ ...f, [field]: checked }));
  };
  const pick = (app) => {
    const next = emptyForm(app);
    setForm(next);
    setBaseline(next);
    setSource(app.source || 'manual');
    setStep(2);
  };
  const toggleShared = (id) =>
    setForm((f) => ({ ...f, sharedWith: f.sharedWith.includes(id) ? f.sharedWith.filter((x) => x !== id) : [...f.sharedWith, id] }));
  const addPerson = () => {
    const found = resolvePerson(people, personName);
    if (!found) return;
    if (found.isNew) onAddPerson(found.person);
    setForm((f) => (f.sharedWith.includes(found.person.id) ? f : { ...f, sharedWith: [...f.sharedWith, found.person.id] }));
    setPersonName('');
  };
  const validShared = form.sharedWith.filter((id) => people.some((p) => p.id === id));
  const cycleInfo = CYCLES[form.cycle];
  const monthlyHint = form.cycle !== 'monthly' && parseFloat(form.price) > 0 ? annualAmount(form) / 12 : 0;
  const searching = query.trim().length >= 2;
  const nameMissing = !form.name.trim();

  return (
    <>
      {!startsAtDetails && (
        <DetailScreen id="cadastro-busca" domId="add-modal" title="Buscar serviço" focusFirst onClose={onClose}>
          <div id="modal-step-1">
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
          </div>
        </DetailScreen>
      )}

      {step === 2 && (
        <DetailScreen
          id="cadastro-detalhes"
          domId={startsAtDetails ? 'add-modal' : undefined}
          title={isEdit ? 'Editar assinatura' : 'Nova assinatura'}
          dirty={dirty}
          focusFirst
          onClose={startsAtDetails ? onClose : () => setStep(1)}
        >
          <div id="modal-step-2">
            <h2 className="section-heading first">Serviço</h2>

            <div className="form-group">
              <label htmlFor="add-name">Serviço</label>
              <input type="text" id="add-name" value={form.name} onChange={set('name')} />
            </div>

            <div className="form-group">
              <label htmlFor="add-cycle">Cobrança</label>
              <select id="add-cycle" value={form.cycle} onChange={set('cycle')}>
                {Object.entries(CYCLES).map(([key, c]) => (
                  <option key={key} value={key}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="add-price">Valor cobrado por {cycleInfo.unit} (R$)</label>
              <input
                type="number"
                inputMode="decimal"
                id="add-price"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.price}
                onChange={set('price')}
              />
              {monthlyHint > 0 && <small className="text-muted" id="add-monthly-hint">≈ {brl(monthlyHint)} por mês</small>}
            </div>

            <div className="form-row">
              {form.cycle === 'weekly' ? (
                <div className="form-group">
                  <label htmlFor="add-due-weekday">Dia da semana</label>
                  <select id="add-due-weekday" value={form.dueWeekday} onChange={set('dueWeekday')}>
                    <option value="">Selecione</option>
                    {WEEKDAYS.map((w, i) => (
                      <option key={w} value={String(i)}>{w}</option>
                    ))}
                  </select>
                </div>
              ) : (
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
              )}
              {form.cycle === 'yearly' && (
                <div className="form-group">
                  <label htmlFor="add-due-month">Vencimento (Mês)</label>
                  <select id="add-due-month" value={form.dueMonth} onChange={set('dueMonth')}>
                    <option value="">Selecione</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <h2 className="section-heading">Pagamento</h2>

            <div className="form-group">
              <label htmlFor="add-payment">Método</label>
              <select id="add-payment" value={form.paymentMethod} onChange={setPayment}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group" id="charge-options">
              <label className="check-row" htmlFor="add-auto">
                <input id="add-auto" type="checkbox" checked={form.autoCharge} onChange={setFlag('autoCharge')} />
                <span>Cobrança automática <small className="text-muted">(cartão ou débito: não precisa marcar “Paguei”)</small></span>
              </label>
            </div>

            <h2 className="section-heading">Divisão</h2>

            <div className="form-group" id="shared-with">
              <label htmlFor="add-person">Dividido com</label>
              {people.length > 0 && (
                <div className="profile-pills" role="group" aria-label="Pessoas">
                  {people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`category-pill${form.sharedWith.includes(p.id) ? ' active' : ''}`}
                      aria-pressed={form.sharedWith.includes(p.id)}
                      onClick={() => toggleShared(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="person-add">
                <input
                  type="text"
                  id="add-person"
                  maxLength={40}
                  placeholder="Adicionar pessoa"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPerson();
                    }
                  }}
                />
                <button type="button" className="btn-sm" onClick={addPerson}>Adicionar</button>
              </div>
              {validShared.length > 0 && parseFloat(form.price) > 0 && (
                <small className="text-muted" id="add-share-hint">
                  Sua parte: {brl(parseFloat(form.price) / (validShared.length + 1))} por {cycleInfo.unit}
                </small>
              )}
            </div>

            <h2 className="section-heading">Avisos</h2>

            <div className="form-group">
              <label className="check-row" htmlFor="add-muted">
                <input id="add-muted" type="checkbox" checked={form.muted} onChange={setFlag('muted')} />
                <span>Não avisar desta assinatura</span>
              </label>
            </div>

            {isEdit && (
              <div className="form-group" id="payment-history">
                <h2 className="section-heading">Histórico</h2>
                {paymentsNewestFirst(sub).length === 0 ? (
                  <p className="text-muted">Nenhum pagamento registrado.</p>
                ) : (
                  <ul className="payment-list">
                    {paymentsNewestFirst(sub).map((p) => (
                      <li key={p.id} className="payment-row">
                        <span>{formatDay(p.paidAt)} · {brl(p.amount)}</span>
                        <button
                          type="button"
                          className="pay-btn"
                          aria-label={`Desmarcar pagamento de ${formatDay(p.paidAt)}`}
                          onClick={() => onUnpay(sub.id, p.id)}
                        >
                          Desmarcar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {nameMissing && <p className="text-muted save-hint" id="save-hint">Informe o nome do serviço</p>}
            <button
              type="button"
              className="btn btn-primary"
              disabled={nameMissing}
              aria-describedby={nameMissing ? 'save-hint' : undefined}
              onClick={() => onSave(buildSub(isEdit ? sub : null, form), { source })}
            >
              Salvar Assinatura
            </button>

            {isEdit && (
              <div className="risk-zone">
                <button type="button" className="risk-row" onClick={() => onDelete(sub.id)}>Remover Assinatura</button>
              </div>
            )}
          </div>
        </DetailScreen>
      )}
    </>
  );
}
