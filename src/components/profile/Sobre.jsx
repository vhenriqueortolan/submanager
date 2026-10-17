import DetailScreen from '../DetailScreen.jsx';
import { installState } from '../../lib/install.js';
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js';
import pkg from '../../../package.json';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export default function Sobre({ feedbackUrl, onClose }) {
  const { hasPrompt, promptInstall } = useInstallPrompt();
  const install = installState({ userAgent: navigator.userAgent, standalone: isStandalone(), hasPrompt });

  return (
    <DetailScreen id="sobre" title="Sobre" onClose={onClose}>
      {install !== 'unavailable' && (
        <div className="form-group" id="install-section">
          <h2 className="section-heading">Instalar o app</h2>
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
        <h2 className="section-heading">Versão</h2>
        <p className="text-muted">Versão <span id="app-version">{pkg.version}</span></p>
        {feedbackUrl && (
          <a className="btn btn-outline btn-link" href={feedbackUrl} target="_blank" rel="noopener">Enviar feedback</a>
        )}
      </div>
    </DetailScreen>
  );
}
