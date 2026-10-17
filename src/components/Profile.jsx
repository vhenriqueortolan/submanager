import { useState } from 'react';
import AppBrand from './AppBrand.jsx';
import MeuPerfil from './profile/MeuPerfil.jsx';
import Orcamento from './profile/Orcamento.jsx';
import Notificacoes from './profile/Notificacoes.jsx';
import DadosPrivacidade from './profile/DadosPrivacidade.jsx';
import Sobre from './profile/Sobre.jsx';
import { FEEDBACK_FORM, buildFeedbackUrl, platformOf } from '../lib/feedback.js';
import { aboutSummary, budgetSummary, dataSummary, notificationsSummary, profileSummary } from '../lib/profile-summary.js';
import pkg from '../../package.json';

/** Hub do Perfil: cinco linhas, cada uma abre uma tela de detalhe com uma responsabilidade só. */
export default function Profile({ state, permission, onEnableNotifications, onSaveProfile, onExport, onImport, onAddPerson, onRenamePerson, onRemovePerson, onSettings, onClearData }) {
  const [screen, setScreen] = useState(null);
  const close = () => setScreen(null);
  const feedbackUrl = buildFeedbackUrl(FEEDBACK_FORM, { version: pkg.version, platform: platformOf(navigator.userAgent) });

  const rows = [
    { id: 'meu-perfil', title: 'Meu perfil', summary: profileSummary(state) },
    { id: 'orcamento', title: 'Orçamento', summary: budgetSummary(state) },
    { id: 'notificacoes', title: 'Notificações', summary: notificationsSummary(state.settings) },
    { id: 'dados', title: 'Dados e privacidade', summary: dataSummary(state) },
    { id: 'sobre', title: 'Sobre', summary: aboutSummary(pkg.version, feedbackUrl) },
  ];

  return (
    <main className="container active" id="view-profile">
      <AppBrand title="Perfil" />
      <h1 className="hub-greeting">{state.name ? `Olá, ${state.name}` : 'Olá'}</h1>

      <ul className="hub-list">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className="hub-row" id={`hub-${row.id}`} aria-label={`${row.title}. ${row.summary}`} onClick={() => setScreen(row.id)}>
              <span className="hub-text">
                <span className="hub-title">{row.title}</span>
                <span className="text-muted hub-summary">{row.summary}</span>
              </span>
              <span className="hub-chevron" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>

      {screen === 'meu-perfil' && (
        <MeuPerfil
          state={state}
          onClose={close}
          onSave={({ name, interests }) => onSaveProfile({ name, budget: state.budget, interests })}
        />
      )}
      {screen === 'orcamento' && (
        <Orcamento
          state={state}
          onClose={close}
          onSave={({ budget }) => onSaveProfile({ name: state.name, budget, interests: state.interests })}
          onAddPerson={onAddPerson}
          onRenamePerson={onRenamePerson}
          onRemovePerson={onRemovePerson}
        />
      )}
      {screen === 'notificacoes' && (
        <Notificacoes state={state} permission={permission} onEnableNotifications={onEnableNotifications} onSettings={onSettings} onClose={close} />
      )}
      {screen === 'dados' && <DadosPrivacidade state={state} onExport={onExport} onImport={onImport} onClearData={onClearData} onClose={close} />}
      {screen === 'sobre' && <Sobre feedbackUrl={feedbackUrl} onClose={close} />}
    </main>
  );
}
