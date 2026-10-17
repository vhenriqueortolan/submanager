import MeuPerfil from './MeuPerfil.jsx';
import Orcamento from './Orcamento.jsx';
import Notificacoes from './Notificacoes.jsx';
import DadosPrivacidade from './DadosPrivacidade.jsx';
import Sobre from './Sobre.jsx';
import Historico from '../Historico.jsx';
import { FEEDBACK_FORM, buildFeedbackUrl, platformOf } from '../../lib/feedback.js';
import pkg from '../../../package.json';

export const feedbackUrlFor = () =>
  buildFeedbackUrl(FEEDBACK_FORM, { version: pkg.version, platform: platformOf(navigator.userAgent) });

/**
 * A tela de detalhe do Perfil pedida por `screen` (ou nada). Usada pelo hub e também pelo Início,
 * que abre Orçamento e Notificações sem trocar de aba.
 */
export default function ProfileScreens({ screen, onClose, state, permission, handlers }) {
  const { onUnpay, onEnableNotifications, onSaveProfile, onExport, onImport, onAddPerson, onRenamePerson, onRemovePerson, onSettings, onClearData } = handlers;
  switch (screen) {
    case 'meu-perfil':
      return (
        <MeuPerfil
          state={state}
          onClose={onClose}
          onSave={({ name, interests }) => onSaveProfile({ name, budget: state.budget, interests })}
        />
      );
    case 'orcamento':
      return (
        <Orcamento
          state={state}
          onClose={onClose}
          onSave={({ budget }) => onSaveProfile({ name: state.name, budget, interests: state.interests })}
          onAddPerson={onAddPerson}
          onRenamePerson={onRenamePerson}
          onRemovePerson={onRemovePerson}
          onUnpay={onUnpay}
        />
      );
    case 'historico':
      return <Historico state={state} origem="portfolio" onUnpay={onUnpay} onClose={onClose} />;
    case 'notificacoes':
      return <Notificacoes state={state} permission={permission} onEnableNotifications={onEnableNotifications} onSettings={onSettings} onClose={onClose} />;
    case 'dados':
      return <DadosPrivacidade state={state} onExport={onExport} onImport={onImport} onClearData={onClearData} onClose={onClose} />;
    case 'sobre':
      return <Sobre feedbackUrl={feedbackUrlFor()} onClose={onClose} />;
    default:
      return null;
  }
}
