import { useMemo } from 'react';
import AppBrand from './AppBrand.jsx';
import Logo from './Logo.jsx';
import { brl, dueLabel, priceLabel } from '../lib/format.js';
import { dueStatus, lastCharge, parseDay } from '../lib/dates.js';
import { annualProjection, monthlyTotal, totalServiceMonthly } from '../lib/totals.js';
import { myShare, sharers } from '../lib/people.js';
import { cycleOf } from '../lib/cycles.js';
import { sortByUrgency } from '../lib/sort.js';
import { backupDue } from '../lib/reminder.js';
import { isActive, statusOf } from '../lib/status.js';
import { StatusBadge } from '../design/index.jsx';

function Hero({ greeting, subs }) {
  // Só as ativas contam: pausadas e canceladas saem do número e dos logos.
  subs = subs.filter(isActive);
  return (
    <div className="hero-card" id="hero-card">
      <div className="hero-title">{greeting}</div>
      <div className="hero-count" id="hero-count">{subs.length}</div>
      <div className="hero-logos-flex">
        {subs.slice(0, 5).map((s) => (
          <Logo key={s.id} domain={s.domain} name={s.name} className="hero-logo-item" />
        ))}
        {subs.length > 5 && <div className="hero-logo-more">+{subs.length - 5}</div>}
      </div>
    </div>
  );
}

function EmptyHero({ greeting, onAdd }) {
  return (
    <div className="empty-card" id="hero-empty">
      <div className="hero-title">{greeting}</div>
      <div className="empty-icon" aria-hidden="true">📭</div>
      <h2>Nenhuma assinatura ainda</h2>
      <p className="text-muted">
        Cadastre os serviços que você paga para acompanhar gastos, vencimentos e o seu orçamento mensal.
      </p>
      <button type="button" className="btn btn-primary" onClick={onAdd}>+ Cadastrar assinatura</button>
    </div>
  );
}

function BudgetCard({ total, annual, budget, converted, serviceTotal, onOpen }) {
  const percent = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  let alert = null;
  if (budget > 0) {
    if (percent >= 100) alert = { text: 'Orçamento excedido!', color: 'var(--danger)' };
    else if (percent > 80) alert = { text: 'Próximo ao limite.', color: 'var(--warning)' };
  }
  return (
    <button type="button" className="budget-card budget-card-btn" id="budget-card" aria-label={`Orçamento. Gasto mensal ${brl(total)}`} onClick={onOpen}>
      <div className="flex space-between">
        <div>
          <div className="stat-label">Seu gasto mensal</div>
          <div className="stat-value" id="total-month">{brl(total)}</div>
          {serviceTotal !== null && (
            <div className="text-muted budget-note" id="total-services">Total dos serviços: {brl(serviceTotal)}</div>
          )}
          {converted && (
            <div className="text-muted budget-note" id="budget-note">Anuais e semanais convertidas para mensal</div>
          )}
        </div>
        <div className="text-right">
          <div className="stat-label">Orçamento</div>
          <div className="stat-value" id="budget-status">{brl(budget)}</div>
        </div>
      </div>
      <div className="budget-bar-bg">
        <div className="budget-bar-fill" id="budget-bar" style={{ width: `${percent}%` }} />
      </div>
      {alert && (
        <div className="budget-alert" id="budget-alert" style={{ color: alert.color }}>{alert.text}</div>
      )}
      {total > 0 && (
        <div className="budget-annual" id="annual-projection">
          <span className="stat-label">Projeção anual</span>
          <span className="annual-value">{brl(annual)}</span>
        </div>
      )}
    </button>
  );
}

function SubCard({ sub, people, status, now, onEdit, onPay }) {
  const due = dueLabel(sub, now);
  const divided = sharers(sub, people).length > 0;
  const stopped = statusOf(sub); // active | paused | cancelled
  const auto = sub.autoCharge === true && stopped === 'active';
  const charged = auto ? lastCharge(sub, now) : null;
  return (
    <div
      className="sub-card"
      role="button"
      tabIndex={0}
      onClick={() => onEdit(sub.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(sub.id);
        }
      }}
    >
      <div className="flex">
        <Logo domain={sub.domain} name={sub.name} className="sub-logo" />
        <div className="sub-info">
          <div className="sub-title">{sub.name}</div>
          <div className="sub-meta">
            <span className="badge">{sub.category}</span>
            {stopped !== 'active' && <StatusBadge status={stopped === 'paused' ? 'paused' : 'cancelled'} />}
            {stopped === 'active' && due && <span className="badge">{due}</span>}
            {status?.type === 'today' && <span className="badge badge-warn">{auto ? 'Cobrado hoje' : 'Vence hoje'}</span>}
            {status?.type === 'overdue' && <span className="badge badge-danger">Atrasada · {status.days}d</span>}
          </div>
        </div>
      </div>
      <div className="sub-right">
        <div className="sub-price">{priceLabel(sub)}</div>
        {divided && <div className="sub-share text-muted">Sua parte {brl(myShare(sub, people))}</div>}
        {auto && charged && (
          <div className="charged-note text-muted">Cobrado em {String(charged.getDate()).padStart(2, '0')}/{String(charged.getMonth() + 1).padStart(2, '0')}</div>
        )}
        {status && !auto && (
          <button
            type="button"
            className="pay-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPay(sub.id, status.cycle);
            }}
          >
            ✓ Paguei
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home({ state, today, permission, onOpenNotifications, onOpenBudget, onAdd, onEdit, onPay, onExportBackup, onSnoozeBackup }) {
  const { name, budget, subs, people } = state;
  const hasSubs = subs.length > 0;
  const greeting = name ? `Olá, ${name}.` : 'Olá.';

  // `today` na dependência: os status são recalculados na virada do dia.
  const items = useMemo(() => {
    const now = parseDay(today) ?? new Date();
    return sortByUrgency(subs.map((sub) => ({ sub, status: isActive(sub) ? dueStatus(sub, now) : null })), now);
  }, [subs, today]);
  const now = useMemo(() => parseDay(today) ?? new Date(), [today]);
  const activeItems = items.filter(({ sub }) => isActive(sub));
  const stoppedItems = items.filter(({ sub }) => !isActive(sub));
  const converted = subs.filter(isActive).some((s) => cycleOf(s) !== 'monthly');

  const total = monthlyTotal(subs, people);
  const annual = annualProjection(subs, people);
  const anyDivided = subs.filter(isActive).some((s) => sharers(s, people).length > 0);
  const serviceTotal = anyDivided ? totalServiceMonthly(subs) : null;

  return (
    <main className="container active" id="view-home">
      <AppBrand title="SubManager" />

      {hasSubs ? <Hero greeting={greeting} subs={subs} /> : <EmptyHero greeting={greeting} onAdd={onAdd} />}

      {permission === 'default' && hasSubs && (
        <div className="notif-card" id="notif-prompt">
          <div>
            <div className="notif-title">Lembretes de vencimento</div>
            <div className="text-muted notif-sub">Avisamos quando uma assinatura vence hoje ou está atrasada.</div>
          </div>
          <button type="button" className="btn-sm" onClick={onOpenNotifications}>Ativar</button>
        </div>
      )}

      {backupDue(state, today) && (
        <div className="notif-card" id="backup-banner">
          <div>
            <div className="notif-title">Faça um backup dos seus dados</div>
            <div className="text-muted notif-sub">Eles ficam só neste aparelho. Um backup evita perdê-los se o navegador limpar o armazenamento.</div>
          </div>
          <div className="banner-actions">
            <button type="button" className="btn-sm" onClick={onExportBackup}>Exportar backup</button>
            <button type="button" className="btn-sm btn-sm-ghost" onClick={onSnoozeBackup}>Agora não</button>
          </div>
        </div>
      )}

      <BudgetCard onOpen={onOpenBudget} total={total} annual={annual} budget={budget} converted={converted} serviceTotal={serviceTotal} />

      {hasSubs && (
        <section id="subs-section">
          <div className="flex space-between mb-2">
            <h3 className="section-title section-title-plain">Assinaturas Ativas</h3>
            <button type="button" className="icon-btn" aria-label="Adicionar assinatura" onClick={onAdd}>+</button>
          </div>
          <div id="subs-list">
            {activeItems.map(({ sub, status }) => (
              <SubCard key={sub.id} sub={sub} people={people} status={status} now={now} onEdit={onEdit} onPay={onPay} />
            ))}
          </div>
          {stoppedItems.length > 0 && (
            <div id="stopped-list">
              <h3 className="section-title section-title-plain stopped-title">Pausadas e canceladas</h3>
              {stoppedItems.map(({ sub, status }) => (
                <SubCard key={sub.id} sub={sub} people={people} status={status} now={now} onEdit={onEdit} onPay={onPay} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
