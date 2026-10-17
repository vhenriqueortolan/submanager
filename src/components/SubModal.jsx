import { useMemo, useState } from 'react';
import Logo from './Logo.jsx';
import DetailScreen from './DetailScreen.jsx';
import { CATALOG, PAYMENT_METHODS } from '../lib/catalog.js';
import { buildSub, emptyForm, formFromSub } from '../lib/subs.js';
import { CYCLES, annualAmount } from '../lib/cycles.js';
import { paymentsNewestFirst } from '../lib/payments.js';
import { resolvePerson } from '../lib/people.js';
import { MONTHS, WEEKDAYS, brl } from '../lib/format.js';
import { parseMoneyInput, moneyToInput } from '../lib/budget.js';
import { useCompanySearch } from '../hooks/useCompanySearch.js';
import { Button, Chip, EditableHero, SectionTitle, SettingList, SettingRow, StatusBadge } from '../design/index.jsx';
import { statusOf, normalizeStatus } from '../lib/status.js';
import { FieldEditor, OptionEditor } from '../design/Editors.jsx';

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
const dayLabel = (day) => (day ? day.split('-').reverse().slice(0, 2).join('/') : '');

/** Estado atual com Pausar/Cancelar (ou Reativar), logo abaixo do herói. Só na edição. */
function StatusBlock({ sub, onStatus }) {
  const status = statusOf(sub);
  const { pauses, cancelledAt } = normalizeStatus(sub);
  const since = status === 'paused' ? pauses[pauses.length - 1]?.from : cancelledAt;
  const note = {
    active: 'Entra nos totais, nas previsões e nos avisos.',
    paused: `Pausada desde ${dayLabel(since)}. Fica fora dos totais e dos avisos e não gera cobrança automática.`,
    cancelled: `Cancelada em ${dayLabel(since)}. Fica fora dos totais e dos avisos; o histórico continua.`,
  }[status];
  return (
    <section className="status-block" aria-label="Status da assinatura" id="status-block">
      <div className="status-line">
        <StatusBadge status={status} />
        <span className="ds-help status-note">{note}</span>
      </div>
      <div className="ds-actions">
        {status === 'active' && <Button variant="secondary" aria-label="Pausar assinatura" onClick={() => onStatus(sub.id, 'pause')}>Pausar</Button>}
        {status !== 'active' && <Button variant="secondary" aria-label="Reativar assinatura" onClick={() => onStatus(sub.id, 'resume')}>Reativar</Button>}
        {status !== 'cancelled' && <Button variant="secondary" aria-label="Cancelar assinatura" onClick={() => onStatus(sub.id, 'cancel')}>Cancelar</Button>}
      </div>
    </section>
  );
}

export default function SubModal({ mode, sub, preset, interests, people, onAddPerson, onSave, onDelete, onUnpay, onStatus, onClose }) {
  const isEdit = mode === 'edit';
  const startsAtDetails = isEdit || !!preset;
  const [step, setStep] = useState(startsAtDetails ? 2 : 1);
  const [form, setForm] = useState(() => (isEdit ? formFromSub(sub) : emptyForm(preset)));
  const [baseline, setBaseline] = useState(form); // o que a pessoa ainda não mexeu: a base do "Descartar alterações?"
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // folha de edição aberta: name | price | cycle | due-date | due-weekday | due-month | payment | person
  const [source, setSource] = useState(preset?.source || 'manual');
  const search = useCompanySearch(step === 1 ? query : '');
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const recommended = useMemo(() => {
    const byInterest = interests.length ? CATALOG.filter((a) => interests.includes(a.category)) : CATALOG;
    return (byInterest.length ? byInterest : CATALOG).slice(0, 8);
  }, [interests]);

  const [autoTouched, setAutoTouched] = useState(isEdit);
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  // Cadastro novo: a cobrança automática acompanha o método (Cartão) até o usuário mexer na opção.
  const setPayment = (paymentMethod) =>
    setForm((f) => ({ ...f, paymentMethod, autoCharge: autoTouched ? f.autoCharge : paymentMethod === 'Cartão' }));
  const setFlag = (field) => (checked) => {
    if (field === 'autoCharge') setAutoTouched(true);
    setForm((f) => ({ ...f, [field]: checked }));
  };
  const setPrice = (text) => {
    const n = parseMoneyInput(text);
    setForm((f) => ({ ...f, price: n > 0 ? String(n) : '' }));
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
  const addPerson = (name) => {
    const found = resolvePerson(people, name);
    if (!found) return;
    if (found.isNew) onAddPerson(found.person);
    setForm((f) => (f.sharedWith.includes(found.person.id) ? f : { ...f, sharedWith: [...f.sharedWith, found.person.id] }));
  };
  const validShared = form.sharedWith.filter((id) => people.some((p) => p.id === id));
  const cycleInfo = CYCLES[form.cycle];
  const priceNumber = parseFloat(form.price) || 0;
  const monthlyHint = form.cycle !== 'monthly' && priceNumber > 0 ? annualAmount(form) / 12 : 0;
  const searching = query.trim().length >= 2;
  const nameMissing = !form.name.trim();

  return (
    <>
      {!startsAtDetails && (
        <DetailScreen id="cadastro-busca" domId="add-modal" title="Buscar serviço" onClose={onClose}>
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
          onClose={startsAtDetails ? onClose : () => setStep(1)}
        >
          <div id="modal-step-2">
            <EditableHero
              label="Serviço"
              value={form.name.trim()}
              placeholder="Nome do serviço"
              logo={<Logo domain={form.domain} name={form.name.trim() || '?'} className="ds-hero-logo" />}
              data-edit="name"
              onEdit={() => setEditing('name')}
            />
            <EditableHero
              label="Valor"
              value={priceNumber > 0 ? brl(priceNumber) : ''}
              placeholder="R$ 0,00"
              size="display"
              suffix={`por ${cycleInfo.unit}`}
              data-edit="price"
              onEdit={() => setEditing('price')}
            />
            {monthlyHint > 0 && <p className="ds-help" id="add-monthly-hint">≈ {brl(monthlyHint)} por mês</p>}

            {isEdit && <StatusBlock sub={sub} onStatus={onStatus} />}

            <SectionTitle>Plano</SectionTitle>
            <SettingList>
              <SettingRow key="cycle" label="Cobrança" value={cycleInfo.label} data-edit="cycle" onClick={() => setEditing('cycle')} />
              {form.cycle === 'weekly' ? (
                <SettingRow
                  key="weekday"
                  label="Dia da semana"
                  value={form.dueWeekday === '' ? 'Escolher' : WEEKDAYS[Number(form.dueWeekday)]}
                  data-edit="due-weekday"
                  onClick={() => setEditing('due-weekday')}
                />
              ) : (
                <SettingRow
                  key="day"
                  label="Dia do vencimento"
                  value={form.dueDate ? `Dia ${form.dueDate}` : 'Informar'}
                  data-edit="due-date"
                  onClick={() => setEditing('due-date')}
                />
              )}
              {form.cycle === 'yearly' && (
                <SettingRow
                  key="month"
                  label="Mês do vencimento"
                  value={form.dueMonth === '' ? 'Escolher' : MONTHS[Number(form.dueMonth) - 1]}
                  data-edit="due-month"
                  onClick={() => setEditing('due-month')}
                />
              )}
              <SettingRow key="payment" label="Pagamento" value={form.paymentMethod} data-edit="payment" onClick={() => setEditing('payment')} />
              <SettingRow
                key="auto"
                label="Cobrança automática"
                hint="Cartão ou débito: não precisa marcar “Paguei”"
                switchId="add-auto"
                switchChecked={form.autoCharge}
                onSwitch={setFlag('autoCharge')}
              />
            </SettingList>

            <SectionTitle>Divisão</SectionTitle>
            <div id="shared-with" role="group" aria-label="Dividido com">
              {people.map((person) => (
                <Chip key={person.id} selected={form.sharedWith.includes(person.id)} onClick={() => toggleShared(person.id)}>
                  {person.name}
                </Chip>
              ))}
              <Chip data-edit="person" onClick={() => setEditing('person')}>+ Adicionar pessoa</Chip>
            </div>
            {validShared.length > 0 && priceNumber > 0 && (
              <p className="ds-help" id="add-share-hint">
                Sua parte: {brl(priceNumber / (validShared.length + 1))} por {cycleInfo.unit}
              </p>
            )}

            <SectionTitle>Avisos</SectionTitle>
            <SettingList>
              <SettingRow key="muted" label="Não avisar desta assinatura" switchId="add-muted" switchChecked={form.muted} onSwitch={setFlag('muted')} />
            </SettingList>

            {isEdit && (
              <div id="payment-history">
                <SectionTitle>Histórico</SectionTitle>
                {paymentsNewestFirst(sub).length === 0 ? (
                  <p className="text-muted">Nenhum pagamento registrado.</p>
                ) : (
                  <ul className="payment-list">
                    {paymentsNewestFirst(sub).map((p) => (
                      <li key={p.id} className="payment-row">
                        <span>
                          {formatDay(p.paidAt)} · {p.share === null ? `${brl(p.amount)} total` : brl(p.share)}{' '}
                          {p.kind === 'auto' && <StatusBadge status={p.estimated ? 'estimated' : 'automatic'} />}
                        </span>
                        {p.kind !== 'auto' && (
                          <button
                            type="button"
                            className="pay-btn"
                            aria-label={`Desmarcar pagamento de ${formatDay(p.paidAt)}`}
                            onClick={() => onUnpay(sub.id, p.id)}
                          >
                            Desmarcar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {nameMissing && <p className="ds-help save-hint" id="save-hint">Informe o nome do serviço</p>}
            <Button
              className="mt-20"
              disabled={nameMissing}
              aria-describedby={nameMissing ? 'save-hint' : undefined}
              onClick={() => onSave(buildSub(isEdit ? sub : null, form), { source })}
            >
              Salvar Assinatura
            </Button>

            {isEdit && (
              <div className="risk-zone">
                <button type="button" className="risk-row" onClick={() => onDelete(sub.id)}>Remover Assinatura</button>
              </div>
            )}
          </div>

          {editing === 'name' && (
            <FieldEditor id="name" title="Nome do serviço" label="Serviço" value={form.name} maxLength={60} onSave={set('name')} onClose={() => setEditing(null)} />
          )}
          {editing === 'price' && (
            <FieldEditor
              id="price"
              title={`Valor por ${cycleInfo.unit}`}
              label="Valor cobrado"
              prefix="R$"
              value={moneyToInput(priceNumber)}
              placeholder="0,00"
              help={`Quanto é cobrado por ${cycleInfo.unit}, em reais.`}
              validate={(v) => (parseMoneyInput(v) === null ? 'Informe um valor válido, como 29,90.' : '')}
              onSave={setPrice}
              onClose={() => setEditing(null)}
            />
          )}
          {editing === 'cycle' && (
            <OptionEditor
              id="cycle"
              title="Cobrança"
              options={Object.entries(CYCLES).map(([value, c]) => ({ value, label: c.label }))}
              value={form.cycle}
              onSave={set('cycle')}
              onClose={() => setEditing(null)}
            />
          )}
          {editing === 'due-date' && (
            <FieldEditor
              id="due-date"
              title="Dia do vencimento"
              label="Dia do mês"
              inputMode="numeric"
              maxLength={2}
              placeholder="Ex: 10"
              value={form.dueDate}
              validate={(v) => (v === '' || (/^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 31) ? '' : 'Informe um dia de 1 a 31.')}
              onSave={set('dueDate')}
              onClose={() => setEditing(null)}
            />
          )}
          {editing === 'due-weekday' && (
            <OptionEditor
              id="due-weekday"
              title="Dia da semana"
              options={WEEKDAYS.map((label, i) => ({ value: String(i), label }))}
              value={form.dueWeekday}
              onSave={set('dueWeekday')}
              onClose={() => setEditing(null)}
            />
          )}
          {editing === 'due-month' && (
            <OptionEditor
              id="due-month"
              title="Mês do vencimento"
              options={MONTHS.map((label, i) => ({ value: String(i + 1), label }))}
              value={form.dueMonth}
              onSave={set('dueMonth')}
              onClose={() => setEditing(null)}
            />
          )}
          {editing === 'payment' && (
            <OptionEditor
              id="payment"
              title="Pagamento"
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
              value={form.paymentMethod}
              onSave={setPayment}
              onClose={() => setEditing(null)}
            />
          )}
          {editing === 'person' && (
            <FieldEditor
              id="person"
              title="Adicionar pessoa"
              label="Nome"
              maxLength={40}
              placeholder="Ex: Ana"
              value=""
              help="A pessoa passa a dividir esta assinatura com você."
              validate={(v) => (v.trim() ? '' : 'Informe um nome.')}
              onSave={addPerson}
              onClose={() => setEditing(null)}
            />
          )}
        </DetailScreen>
      )}
    </>
  );
}
