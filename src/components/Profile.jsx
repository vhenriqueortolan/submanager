import { useRef, useState } from 'react';
import AppBrand from './AppBrand.jsx';
import { CATEGORIES } from '../lib/catalog.js';
import { FEEDBACK_FORM, buildFeedbackUrl, platformOf } from '../lib/feedback.js';
import { installState } from '../lib/install.js';
import { ADVANCE_OPTIONS } from '../lib/settings.js';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import pkg from '../../package.json';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const NOTIF_STATUS = {
  granted: 'Ativadas no navegador.',
  denied: 'Bloqueadas no navegador. Para reativar, abra as configurações do site (o cadeado ao lado do endereço) e permita Notificações.',
  unsupported: 'Este navegador não suporta notificações.',
  default: 'Ainda não pedidas.',
};

const ADVANCE_LABEL = { 0: 'Não avisar antes', 1: '1 dia antes', 3: '3 dias antes', 7: '7 dias antes' };

function Switch({ id, label, checked, disabled, onChange }) {
  return (
    <label className="switch-row" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/**
 * O formulário inicia sempre a partir do que está salvo (o App remonta este componente
 * quando os valores salvos mudam), então edições não salvas são descartadas ao reabrir a aba.
 */
export default function Profile({ state, permission, onEnableNotifications, onSave, onExport, onImport, onRemovePerson, onSettings }) {
  const [name, setName] = useState(state.name || '');
  const [budget, setBudget] = useState(state.budget > 0 ? String(state.budget) : '');
  const [interests, setInterests] = useState(state.interests);
  const fileRef = useRef(null);
  const { hasPrompt, promptInstall } = useInstallPrompt();
  const install = installState({ userAgent: navigator.userAgent, standalone: isStandalone(), hasPrompt });
  const feedbackUrl = buildFeedbackUrl(FEEDBACK_FORM, { version: pkg.version, platform: platformOf(navigator.userAgent) });

  const toggle = (value) =>
    setInterests((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  return (
    <main className="container active" id="view-profile">
      <AppBrand title="Perfil" />

      <div className="form-group">
        <label htmlFor="prof-name">Nome</label>
        <input type="text" id="prof-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="form-group">
        <label htmlFor="prof-budget">Teto mensal (sua parte) (R$)</label>
        <input
          type="number"
          inputMode="decimal"
          id="prof-budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      <label id="interests-label">Interesses (Afeta as recomendações)</label>
      <div className="profile-pills" id="prof-interests" role="group" aria-labelledby="interests-label">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            data-val={c.value}
            className={`category-pill${interests.includes(c.value) ? ' active' : ''}`}
            aria-pressed={interests.includes(c.value)}
            onClick={() => toggle(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="form-group" id="notif-section">
        <label>Notificações</label>
        <div className="notif-row">
          <span className="text-muted notif-status" id="notif-status">{NOTIF_STATUS[permission] ?? NOTIF_STATUS.default}</span>
          {permission === 'default' && (
            <button type="button" className="btn-sm" id="notif-btn" onClick={onEnableNotifications}>Ativar</button>
          )}
        </div>
        {install === 'ios' && (
          <p className="text-muted" id="notif-ios-hint">
            No iPhone, instale o app na Tela de Início (veja “Instalar o app” abaixo) para receber avisos.
          </p>
        )}
        <div className="switch-list">
          <Switch id="set-enabled" label="Receber avisos" checked={state.settings.enabled} onChange={(v) => onSettings({ enabled: v })} />
          <Switch id="set-today" label="Avisar no dia" checked={state.settings.notifyToday} disabled={!state.settings.enabled} onChange={(v) => onSettings({ notifyToday: v })} />
          <Switch id="set-overdue" label="Avisar atrasadas" checked={state.settings.notifyOverdue} disabled={!state.settings.enabled} onChange={(v) => onSettings({ notifyOverdue: v })} />
          <div className="switch-row">
            <label htmlFor="set-advance">Antecedência</label>
            <select
              id="set-advance"
              value={state.settings.advanceDays}
              disabled={!state.settings.enabled}
              onChange={(e) => onSettings({ advanceDays: parseInt(e.target.value, 10) })}
            >
              {ADVANCE_OPTIONS.map((d) => (
                <option key={d} value={d}>{ADVANCE_LABEL[d]}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-muted">Os avisos chegam quando o app está aberto.</p>
      </div>

      <div className="form-group" id="people-section">
        <label>Pessoas</label>
        {state.people.length === 0 ? (
          <p className="text-muted">Ninguém ainda. Adicione pessoas ao dividir uma assinatura. Os nomes ficam só neste aparelho.</p>
        ) : (
          <ul className="payment-list">
            {state.people.map((p) => (
              <li key={p.id} className="payment-row">
                <span>{p.name}</span>
                <button
                  type="button"
                  className="pay-btn"
                  aria-label={`Remover ${p.name}`}
                  onClick={() => onRemovePerson(p.id)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-group">
        <label>Backup dos dados</label>
        <div className="backup-row">
          <button type="button" className="btn btn-outline btn-half" onClick={onExport}>Exportar</button>
          <button type="button" className="btn btn-outline btn-half" onClick={() => fileRef.current?.click()}>Importar</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onImport(file);
            }}
          />
        </div>
        <p className="text-muted backup-hint">Seus dados ficam salvos só neste navegador. Exporte um backup para guardar ou levar para outro aparelho.</p>
      </div>

      {install !== 'unavailable' && (
        <div className="form-group" id="install-section">
          <label>Instalar o app</label>
          {install === 'installed' && <p className="text-muted">App instalado</p>}
          {install === 'prompt' && (
            <button type="button" className="btn btn-outline" onClick={promptInstall}>Instalar app</button>
          )}
          {install === 'ios' && (
            <>
              <ol className="text-muted install-steps">
                <li>Toque em Compartilhar (o quadrado com uma seta para cima) na barra do Safari.</li>
                <li>Escolha “Adicionar à Tela de Início”.</li>
              </ol>
              <p className="text-muted">No iPhone, os avisos só funcionam com o app instalado.</p>
            </>
          )}
        </div>
      )}

      <div className="form-group" id="about-section">
        <label>Sobre</label>
        <p className="text-muted">Versão <span id="app-version">{pkg.version}</span></p>
        {feedbackUrl && (
          <a className="btn btn-outline" href={feedbackUrl} target="_blank" rel="noopener">Enviar feedback</a>
        )}
      </div>

      <button type="button" className="btn btn-primary" onClick={() => onSave({ name, budget, interests })}>
        Salvar Configurações
      </button>
    </main>
  );
}
