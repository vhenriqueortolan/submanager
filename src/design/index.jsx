import { useId } from 'react';

/*
 * Componentes base do Design System. Estilo em ./components.css (só variáveis de ./tokens.css).
 * Diálogo de confirmação, toast com ação e tela de detalhe são os componentes do app, reexportados aqui.
 */
export { default as ConfirmDialog } from '../components/ConfirmDialog.jsx';
export { default as Toast } from '../components/Toast.jsx';
export { default as DetailScreen } from '../components/DetailScreen.jsx';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/** Botão. `variant`: primary | secondary | ghost | danger. `size`: md | sm. Com `href` vira link em bloco. */
export function Button({ variant = 'primary', size = 'md', href, className, children, ...rest }) {
  const classes = cx('ds-btn', `ds-btn-${variant}`, size === 'sm' && 'ds-btn-sm', className);
  if (href) return <a className={classes} href={href} {...rest}>{children}</a>;
  return <button type="button" className={classes} {...rest}>{children}</button>;
}

/**
 * Herói editável: o valor em texto grande com lápis; tocar abre o editor (`onEdit`). `size`: title-lg | display.
 * `logo`: imagem à esquerda do texto. `suffix`: unidade pequena depois do valor (ex.: "por mês").
 */
export function EditableHero({ label, value, placeholder = 'Toque para editar', size = 'title-lg', logo, suffix, onEdit, ...rest }) {
  const empty = !value;
  return (
    <button
      type="button"
      className={cx('ds-hero', `ds-hero-${size}`, logo && 'ds-hero-has-logo')}
      aria-label={`${label}: ${empty ? 'vazio' : value}${suffix ? ` ${suffix}` : ''}. Editar`}
      onClick={onEdit}
      {...rest}
    >
      {logo}
      <span className={cx('ds-hero-value', empty && 'ds-hero-empty')}>{empty ? placeholder : value}</span>
      {suffix && <span className="ds-hero-suffix">{suffix}</span>}
      <span className="ds-hero-pencil" aria-hidden="true">✎</span>
    </button>
  );
}

/** Interruptor sim/não. Precisa de nome acessível (`aria-label` ou um <label> em volta). */
export function Switch({ checked, onChange, ...rest }) {
  return <input type="checkbox" role="switch" className="ds-switch" checked={checked} onChange={(e) => onChange(e.target.checked)} {...rest} />;
}

/** Linha de configuração: rótulo, valor e chevron (abre o editor). Com `switchChecked`, vira a variante com switch. */
export function SettingRow({ label, hint, value, onClick, switchChecked, onSwitch, switchId, ...rest }) {
  if (switchChecked !== undefined) {
    return (
      <label className="ds-row ds-row-switch" htmlFor={switchId}>
        <span className="ds-row-label">
          {label}
          {hint && <span className="ds-row-hint">{hint}</span>}
        </span>
        <Switch id={switchId} checked={switchChecked} onChange={onSwitch} {...rest} />
      </label>
    );
  }
  return (
    <button type="button" className="ds-row" onClick={onClick} {...rest}>
      <span className="ds-row-label">{label}</span>
      <span className="ds-row-value">{value}</span>
      <span className="ds-row-chevron" aria-hidden="true">›</span>
    </button>
  );
}

/** Agrupa linhas de configuração num cartão: cada filho vira um item da lista. */
export function SettingList({ children }) {
  const items = Array.isArray(children) ? children : [children];
  return <ul className="ds-row-list">{items.map((child, i) => <li key={child?.key ?? i}>{child}</li>)}</ul>;
}

/** Campo com rótulo e uma ajuda. `prefix="R$"` para valores; `type="search"` para busca. */
export function Field({ label, prefix, help, id, inputMode, ...rest }) {
  const auto = useId();
  const fieldId = id ?? auto;
  const helpId = help ? `${fieldId}-help` : undefined;
  return (
    <div className="ds-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className={cx('ds-input-wrap', prefix && 'has-prefix')}>
        {prefix && <span className="ds-input-prefix" aria-hidden="true">{prefix}</span>}
        <input id={fieldId} inputMode={inputMode ?? (prefix ? 'decimal' : undefined)} aria-describedby={helpId} {...rest} />
      </div>
      {help && <p className="ds-help" id={helpId}>{help}</p>}
    </div>
  );
}

/** Lista de opções de escolha única, no lugar do select nativo. `options`: [{ value, label, description? }]. */
export function OptionList({ label, options, value, onChange }) {
  return (
    <ul className="ds-options" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <li key={o.value}>
          <button type="button" role="radio" aria-checked={o.value === value} className="ds-option" onClick={() => onChange(o.value)}>
            <span>
              {o.label}
              {o.description && <span className="ds-option-desc">{o.description}</span>}
            </span>
            <span className="ds-option-mark" aria-hidden="true">{o.value === value ? '✓' : ''}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Chip de filtro ou escolha múltipla (categorias, pessoas). */
export function Chip({ selected, onClick, children, ...rest }) {
  // Sem `selected` o chip é um botão comum (ex.: "+ Adicionar pessoa"); com ele, vira alternância (aria-pressed).
  return <button type="button" className="ds-chip" aria-pressed={selected} onClick={onClick} {...rest}>{children}</button>;
}

/** Card de item (assinatura): nome, linha de detalhes (`meta`, ex.: badges) e valor à direita. */
export function ItemCard({ name, meta, amount, logo, onClick }) {
  return (
    <button type="button" className="ds-card" onClick={onClick}>
      {logo}
      <span className="ds-card-main">
        <span className="ds-card-name">{name}</span>
        {meta && <span className="ds-card-meta">{meta}</span>}
      </span>
      <span className="ds-card-amount">{amount}</span>
    </button>
  );
}

/** Banner. `variant`: offer (neutro, oferece algo) | alert (cor de aviso, pede atenção). `actions`: botões. */
export function Banner({ variant = 'offer', title, actions, children }) {
  return (
    <section className={cx('ds-banner', variant === 'alert' && 'ds-banner-alert')} role={variant === 'alert' ? 'alert' : 'region'} aria-label={title}>
      <h2 className="ds-banner-title">{title}</h2>
      {children && <p className="ds-banner-body">{children}</p>}
      {actions && <div className="ds-banner-actions">{actions}</div>}
    </section>
  );
}

export const STATUS_LABELS = { paid: 'Paguei', active: 'Ativa', automatic: 'Automática', estimated: 'Estimada', late: 'Atrasada', paused: 'Pausada', cancelled: 'Cancelada' };

/** Badge de status. Sempre tem texto: a cor sozinha não é indicador. */
export function StatusBadge({ status }) {
  return <span className={cx('ds-status', `ds-status-${status}`)}>{STATUS_LABELS[status]}</span>;
}

/** Título de seção (diferente de rótulo de campo). */
export function SectionTitle({ as: Tag = 'h2', children }) {
  return <Tag className="ds-section-title">{children}</Tag>;
}

/**
 * Subabas: troca de seção dentro de uma tela. `tabs`: [{ id, label, count? }]; `count` mostra uma contagem ao lado do nome.
 * Cada aba é um botão (Tab percorre na ordem visual); ← e → também movem a seleção. O painel é do chamador:
 * `role="tabpanel"`, `id={`${idBase}-painel`}` e `aria-labelledby={`${idBase}-aba-${value}`}`.
 */
export function Subabas({ label, idBase, tabs, value, onChange }) {
  const move = (e, i) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!passo) return;
    e.preventDefault();
    const alvo = tabs[(i + passo + tabs.length) % tabs.length];
    onChange(alvo.id);
    document.getElementById(`${idBase}-aba-${alvo.id}`)?.focus();
  };
  return (
    <div className="ds-tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${idBase}-aba-${t.id}`}
          className="ds-tab"
          aria-selected={t.id === value}
          aria-controls={`${idBase}-painel`}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => move(e, i)}
        >
          {t.label}
          {t.count > 0 && <span className="ds-tab-count" aria-label={`${t.count} ${t.count === 1 ? 'novidade' : 'novidades'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Estado vazio: ícone, título, texto e uma ação opcional. */
export function EmptyState({ icon, title, action, children }) {
  return (
    <div className="ds-empty">
      {icon && <div className="ds-empty-icon" aria-hidden="true">{icon}</div>}
      <h2 className="ds-empty-title">{title}</h2>
      {children && <p className="ds-empty-body">{children}</p>}
      {action}
    </div>
  );
}
