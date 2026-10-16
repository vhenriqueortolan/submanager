import { useMemo } from 'react';
import AppBrand from './AppBrand.jsx';
import Logo from './Logo.jsx';
import { brl } from '../lib/format.js';
import { dueStatus, parseDay } from '../lib/dates.js';
import { annualProjection, monthlyTotal } from '../lib/totals.js';

function Hero({ greeting, subs }) {
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
        Cadastre os serviços que você paga para acompanhar gastos, vencimentos e o seu teto mensal.
      </p>
      <button type="button" className="btn btn-primary" onClick={onAdd}>+ Cadastrar assinatura</button>
    </div>
  );
}

function BudgetCard({ total, annual, budget }) {
  const percent = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  let alert = null;
  if (budget > 0) {
    if (percent >= 100) alert = { text: 'Teto excedido!', color: 'var(--danger)' };
    else if (percent > 80) alert = { text: 'Próximo ao limite.', color: 'var(--warning)' };
  }
  return (
    <div className="budget-card">
      <div className="flex space-between">
        <div>
          <div className="stat-label">Gasto Mensal</div>
          <div className="stat-value" id="total-month">{brl(total)}</div>
        </div>
        <div className="text-right">
          <div className="stat-label">Teto</div>
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
    </div>
  );
}

function SubCard({ sub, status, onEdit, onPay }) {
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
            {sub.dueDate && <span className="badge">Dia {sub.dueDate}</span>}
            {status?.type === 'today' && <span className="badge badge-warn">Vence hoje</span>}
            {status?.type === 'overdue' && <span className="badge badge-danger">Atrasada · {status.days}d</span>}
          </div>
        </div>
      </div>
      <div className="sub-right">
        <div className="sub-price">{brl(sub.price)}</div>
        {status && (
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

export default function Home({ state, today, permission, onEnableNotifications, onAdd, onEdit, onPay }) {
  const { name, budget, subs } = state;
  const hasSubs = subs.length > 0;
  const greeting = name ? `Olá, ${name}.` : 'Olá.';

  // `today` na dependência: os status são recalculados na virada do dia.
  const items = useMemo(() => {
    const now = parseDay(today) ?? new Date();
    return subs.map((sub) => ({ sub, status: dueStatus(sub, now) }));
  }, [subs, today]);

  const total = monthlyTotal(subs);
  const annual = annualProjection(subs);

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
          <button type="button" className="btn-sm" onClick={onEnableNotifications}>Ativar</button>
        </div>
      )}

      <BudgetCard total={total} annual={annual} budget={budget} />

      {hasSubs && (
        <section id="subs-section">
          <div className="flex space-between mb-2">
            <h3 className="section-title section-title-plain">Assinaturas Ativas</h3>
            <button type="button" className="icon-btn" aria-label="Adicionar assinatura" onClick={onAdd}>+</button>
          </div>
          <div id="subs-list">
            {items.map(({ sub, status }) => (
              <SubCard key={sub.id} sub={sub} status={status} onEdit={onEdit} onPay={onPay} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
