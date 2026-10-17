import { useRef } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import { PRIVACY_CONTACT } from '../../lib/feedback.js';

export default function DadosPrivacidade({ onExport, onImport, onClearData, onClose }) {
  const fileRef = useRef(null);

  return (
    <DetailScreen id="dados" title="Dados e privacidade" onClose={onClose}>
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

      <div className="form-group" id="data-section">
        <label>Seus dados</label>
        <p className="text-muted">
          Apaga assinaturas, pessoas, pagamentos e preferências deste aparelho. A permissão de notificação só pode ser
          revogada nas configurações do navegador, e os backups que você já baixou não são apagados pelo app.
        </p>
        <button type="button" className="btn btn-outline btn-danger" id="clear-data-btn" onClick={onClearData}>
          Apagar todos os dados
        </button>
      </div>

      <div className="form-group" id="privacy-section">
        <label>Privacidade</label>
        <ul className="privacy-list text-muted">
          <li>
            <strong>Fica no aparelho:</strong> assinaturas, pessoas, pagamentos e preferências. Os nomes das pessoas
            nunca são enviados.
          </li>
          <li>
            <strong>Sai do aparelho:</strong> apenas o que você escrever no formulário de feedback, junto com a versão
            do app e a plataforma. Não envie dados bancários nem números de cartão.
          </li>
          <li>
            <strong>Uso do app:</strong> medimos visitas e eventos de uso sem cookies e sem nomes de serviços, valores
            ou datas.
          </li>
          <li>
            <strong>Excluir respostas do formulário:</strong>{' '}
            {PRIVACY_CONTACT ? <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a> : 'o e-mail de contato será informado em breve.'}
          </li>
        </ul>
      </div>
    </DetailScreen>
  );
}
