import { useRef } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import { dataSummary } from '../../lib/profile-summary.js';
import { PRIVACY_CONTACT } from '../../lib/feedback.js';
import { downloadCsv } from '../../lib/csv.js';

export default function DadosPrivacidade({ state, onExport, onImport, onClearData, onClose }) {
  const fileRef = useRef(null);

  return (
    <DetailScreen id="dados" title="Dados e privacidade" onClose={onClose}>
      <section className="form-group" aria-labelledby="backup-title">
        <h2 className="section-heading" id="backup-title">Backup</h2>
        <p className="text-muted mb-2" id="last-backup">{dataSummary(state)}</p>
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
      </section>

      <section className="form-group" aria-labelledby="csv-title">
        <h2 className="section-heading" id="csv-title">Planilha</h2>
        <button type="button" className="btn btn-outline" id="export-csv" onClick={() => downloadCsv(state.subs)}>Exportar assinaturas (CSV)</button>
        <p className="text-muted backup-hint">Gera um arquivo para abrir no Excel ou no Google Planilhas. Não serve para importar de volta: para isso, use o backup.</p>
      </section>

      <section className="form-group" id="privacy-section" aria-labelledby="privacy-title">
        <h2 className="section-heading" id="privacy-title">Privacidade</h2>
        <ul className="privacy-list text-muted">
          <li>
            <strong>Fica no aparelho:</strong> assinaturas, pessoas, pagamentos e preferências. Nomes, telefones e e-mails
            das pessoas nunca são enviados.
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
      </section>

      <section className="risk-zone" id="data-section" aria-labelledby="risk-title">
        <h2 className="risk-title" id="risk-title">Zona de risco</h2>
        <p className="text-muted">
          Apaga assinaturas, pessoas, pagamentos e preferências deste aparelho. A permissão de notificação só pode ser
          revogada nas configurações do navegador, e os backups que você já baixou não são apagados pelo app.
        </p>
        <button type="button" className="risk-row" id="clear-data-btn" onClick={onClearData}>
          Apagar todos os dados
        </button>
      </section>
    </DetailScreen>
  );
}
