import DetailScreen from '../DetailScreen.jsx';
import { ADVANCE_OPTIONS } from '../../lib/settings.js';
import { installState } from '../../lib/install.js';

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

export default function Notificacoes({ state, permission, onEnableNotifications, onSettings, onClose }) {
  const install = installState({
    userAgent: navigator.userAgent,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true,
    hasPrompt: false,
  });

  return (
    <DetailScreen id="notificacoes" title="Notificações" onClose={onClose}>
      <div id="notif-section">
        <div className="notif-row">
          <span className="text-muted notif-status" id="notif-status">{NOTIF_STATUS[permission] ?? NOTIF_STATUS.default}</span>
          {permission === 'default' && (
            <button type="button" className="btn-sm" id="notif-btn" onClick={onEnableNotifications}>Ativar</button>
          )}
        </div>
        {install === 'ios' && (
          <p className="text-muted" id="notif-ios-hint">
            No iPhone, instale o app na Tela de Início (veja “Instalar o app” em Sobre) para receber avisos.
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
    </DetailScreen>
  );
}
