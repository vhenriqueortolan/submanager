import { useState } from 'react';
import AppBrand from './AppBrand.jsx';
import ProfileScreens, { feedbackUrlFor } from './profile/ProfileScreens.jsx';
import { aboutSummary, budgetSummary, dataSummary, notificationsSummary, profileSummary } from '../lib/profile-summary.js';
import pkg from '../../package.json';

/** Hub do Perfil: cinco linhas, cada uma abre uma tela de detalhe com uma responsabilidade só. */
export default function Profile({ state, permission, handlers }) {
  const [screen, setScreen] = useState(null);

  const rows = [
    { id: 'meu-perfil', title: 'Meu perfil', summary: profileSummary(state) },
    { id: 'orcamento', title: 'Orçamento', summary: budgetSummary(state) },
    { id: 'notificacoes', title: 'Notificações', summary: notificationsSummary(state.settings) },
    { id: 'dados', title: 'Dados e privacidade', summary: dataSummary(state) },
    { id: 'sobre', title: 'Sobre', summary: aboutSummary(pkg.version, feedbackUrlFor()) },
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

      <ProfileScreens screen={screen} onClose={() => setScreen(null)} state={state} permission={permission} handlers={handlers} />
    </main>
  );
}
