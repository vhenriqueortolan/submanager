import { useEffect, useMemo, useState } from 'react';
import DetailScreen from './DetailScreen.jsx';
import { Chip, EmptyState, SectionTitle, StatusBadge } from '../design/index.jsx';
import { CATEGORIES } from '../lib/catalog.js';
import { todayStr } from '../lib/dates.js';
import { brl, MONTHS } from '../lib/format.js';
import {
  filterEntries, groupByMonth, heaviest, historyEntries, monthLabel, monthTotal, monthlyAverage, periodRange,
  priceChanges, spendByCategory, sumShare, unmarkedManual, variationVsPreviousMonth,
} from '../lib/history.js';
import { trackEvent } from '../lib/analytics.js';
import './historico.css';

const PERIODS = [
  { value: 'month', label: 'Mês' },
  { value: '12months', label: '12 meses' },
  { value: 'year', label: 'Ano' },
];
const PAGE = 3; // meses mostrados de cada vez (carregar sob demanda)

const dayLabel = (day) => day.split('-').reverse().slice(0, 2).join('/');
const monthTitle = (month) => `${MONTHS[Number(month.slice(5, 7)) - 1]} de ${month.slice(0, 4)}`;
const pct = (n) => `${String(n).replace('.', ',')}%`;

function Variation({ v }) {
  if (v.previous <= 0) return <p className="hist-variation text-muted">Sem pagamentos no mês passado para comparar.</p>;
  if (v.diff === 0) return <p className="hist-variation text-muted">Igual ao mês passado ({brl(v.previous)}).</p>;
  const up = v.diff > 0;
  return (
    <p className="hist-variation text-muted">
      {up ? 'Subiu' : 'Caiu'} {brl(Math.abs(v.diff))} ({pct(Math.abs(v.percent))}) em relação ao mês passado ({brl(v.previous)}).
    </p>
  );
}

function Entry({ e, onUnpay }) {
  const unknown = e.share === null;
  return (
    <li className="hist-entry">
      <div className="hist-entry-main">
        <span className="hist-entry-name">{e.name}</span>
        <span className="hist-entry-meta text-muted">
          {dayLabel(e.paidAt)}{' '}
          {e.kind === 'manual' && <StatusBadge status="paid" />}
          {e.kind === 'auto' && <StatusBadge status={e.estimated ? 'estimated' : 'automatic'} />}
        </span>
      </div>
      <div className="hist-entry-side">
        <span className="hist-entry-amount">{unknown ? `${brl(e.total)} total` : brl(e.share)}</span>
        {e.kind === 'manual' && (
          <button type="button" className="pay-btn" aria-label={`Desmarcar pagamento de ${e.name} em ${dayLabel(e.paidAt)}`} onClick={() => onUnpay(e.subId, e.id)}>
            Desmarcar
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Histórico e insights: só fatos sobre o que foi pago (sua parte), sem recomendação de corte.
 * `origem`: de onde foi aberto (portfolio | orcamento), a única propriedade do evento de analytics.
 * `embutido`: vira o conteúdo de uma aba (Início), sem tela de detalhe nem ←.
 */
export default function Historico({ state, origem, onUnpay, onClose, embutido = false }) {
  const today = useMemo(() => todayStr(), []);
  const [period, setPeriod] = useState('month');
  const [category, setCategory] = useState('');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    trackEvent('history_opened', { origem });
  }, [origem]);

  const all = useMemo(() => historyEntries(state.subs), [state.subs]);
  const entries = useMemo(() => filterEntries(all, { period, category, today }), [all, period, category, today]);
  const months = useMemo(() => groupByMonth(entries), [entries]);

  const thisMonth = today.slice(0, 7);
  const variation = variationVsPreviousMonth(all, today);
  const average = monthlyAverage(all, today);
  const top = heaviest(entries);
  const categories = spendByCategory(entries);
  const changes = priceChanges(state.subs).slice(0, 3);
  const unmarked = unmarkedManual(state.subs);
  const periodTotal = sumShare(entries);
  const hasUnknown = months.some((m) => m.unknown > 0);
  const inUse = [...new Set(all.map((e) => e.category))];
  const categoryOptions = CATEGORIES.filter((c) => inUse.includes(c.value)).concat(
    inUse.filter((c) => !CATEGORIES.some((x) => x.value === c)).map((c) => ({ value: c, label: c })),
  );
  const [from, to] = periodRange(period, today);

  const choosePeriod = (value) => {
    setPeriod(value);
    setShown(PAGE);
  };

  const conteudo = (
    <>
      <section aria-label="Este mês" className="hist-top">
        <p className="stat-label">Pago em {monthTitle(thisMonth)} (sua parte)</p>
        <p className="hist-month-total" id="hist-month-total">{brl(monthTotal(all, thisMonth))}</p>
        <Variation v={variation} />
      </section>

      <SectionTitle>Em números</SectionTitle>
      <div className="hist-cards" id="hist-cards">
        <div className="hist-card">
          <span className="stat-label">Média mensal (6 meses)</span>
          <strong id="hist-average">{average === null ? 'Sem dados' : brl(average)}</strong>
        </div>
        <div className="hist-card">
          <span className="stat-label">Total no período</span>
          <strong id="hist-period-total">{brl(periodTotal)}</strong>
        </div>
        <div className="hist-card">
          <span className="stat-label">Maior peso no período</span>
          <strong id="hist-top">{top ? `${top.name} · ${pct(top.percent)}` : 'Sem dados'}</strong>
          {top && <span className="text-muted hist-sub">{brl(top.total)}</span>}
        </div>
        <div className="hist-card">
          <span className="stat-label">Manuais sem marcação</span>
          <strong id="hist-unmarked">{unmarked.length === 0 ? 'Nenhuma' : `${unmarked.length} ${unmarked.length === 1 ? 'assinatura' : 'assinaturas'}`}</strong>
          {unmarked.length > 0 && <span className="text-muted hist-sub">{unmarked.map((u) => u.name).join(', ')}</span>}
        </div>
      </div>

      {changes.length > 0 && (
        <ul className="hist-changes" id="hist-changes" aria-label="Mudanças de preço">
          {changes.map((c) => (
            <li key={`${c.subId}-${c.month}`} className="text-muted">
              {c.name} {c.direction === 'up' ? 'subiu' : 'caiu'} de {brl(c.from)} para {brl(c.to)} em {monthLabel(c.month)}.
            </li>
          ))}
        </ul>
      )}

      {categories.length > 0 && (
        <>
          <SectionTitle>Por categoria</SectionTitle>
          <ul className="hist-categories" id="hist-categories">
            {categories.map((c) => (
              <li key={c.category}>
                <span>{c.category}</span>
                <span className="text-muted">{brl(c.total)} · {pct(c.percent)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Pagamentos</SectionTitle>
      <div role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <Chip key={p.value} selected={period === p.value} onClick={() => choosePeriod(p.value)}>{p.label}</Chip>
        ))}
      </div>
      {categoryOptions.length > 1 && (
        <div role="group" aria-label="Categoria">
          <Chip selected={category === ''} onClick={() => setCategory('')}>Todas</Chip>
          {categoryOptions.map((c) => (
            <Chip key={c.value} selected={category === c.value} onClick={() => { setCategory(c.value); setShown(PAGE); }}>{c.label}</Chip>
          ))}
        </div>
      )}
      <p className="ds-help hist-range" id="hist-range">{from === to ? monthTitle(from) : `${monthTitle(from)} a ${monthTitle(to)}`}</p>

      {months.length === 0 ? (
        <EmptyState icon="🧾" title="Nenhum pagamento no período">
          Pagamentos marcados com “Paguei” e cobranças automáticas aparecem aqui.
        </EmptyState>
      ) : (
        <div id="hist-list">
          {months.slice(0, shown).map((m) => (
            <section key={m.month} className="hist-month" aria-label={monthTitle(m.month)}>
              <h3 className="hist-month-head">
                <span>{monthTitle(m.month)}</span>
                <span id={`hist-total-${m.month}`}>{brl(m.total)}</span>
              </h3>
              <ul className="hist-entries">
                {m.entries.map((e) => <Entry key={e.id} e={e} onUnpay={onUnpay} />)}
              </ul>
            </section>
          ))}
          {months.length > shown && (
            <button type="button" className="ds-btn ds-btn-secondary" id="hist-more" onClick={() => setShown((n) => n + PAGE)}>
              Mostrar mais meses
            </button>
          )}
          {hasUnknown && (
            <p className="ds-help" id="hist-total-note">
              Registros antigos de assinaturas divididas mostram o valor cheio (“total”): a sua parte daquela época não foi guardada, então eles não entram nos totais.
            </p>
          )}
        </div>
      )}
    </>
  );

  return embutido ? (
    <div id="historico-aba">{conteudo}</div>
  ) : (
    <DetailScreen id="historico" title="Histórico" onClose={onClose}>
      {conteudo}
    </DetailScreen>
  );
}
