import { useRef } from 'react';
import ConfirmDialog from './ConfirmDialog.jsx';
import useFocusTrap from '../hooks/useFocusTrap.js';
import { useScreenHistory } from '../hooks/useScreenStack.js';

/**
 * Tela de detalhe: entra pela direita, tem ← no topo e fecha com ←, Esc ou o Voltar do sistema.
 * Com `dirty`, sair pergunta "Descartar alterações?".
 */
export default function DetailScreen({ id, title, dirty = false, onClose, children }) {
  const ref = useRef(null);
  const { closing, askDiscard, back, discard, keepEditing } = useScreenHistory({ id, dirty, onClose });
  useFocusTrap(ref);

  return (
    <>
      <div
        ref={ref}
        className={`detail-screen${closing ? ' closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        data-screen={id}
      >
        <header className="detail-header">
          <button type="button" className="icon-btn detail-back" aria-label="Voltar" onClick={back}>←</button>
          <h1 id={`${id}-title`}>{title}</h1>
        </header>
        <div className="detail-body">{children}</div>
      </div>
      {askDiscard && (
        <ConfirmDialog
          title="Descartar alterações?"
          message="O que você mudou nesta tela ainda não foi salvo."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          danger
          onConfirm={discard}
          onCancel={keepEditing}
        />
      )}
    </>
  );
}
