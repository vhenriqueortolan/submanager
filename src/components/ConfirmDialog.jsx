import { useEffect, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';
import { matchesConfirmation } from '../lib/storage.js';

/**
 * Substitui window.confirm: acessível, com Esc para cancelar e foco inicial em "Cancelar".
 * `requireText`: só habilita a confirmação depois de digitar a palavra. `extraAction`: botão opcional
 * (ex.: exportar backup antes) que não fecha o diálogo.
 */
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false, requireText, extraAction, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const [typed, setTyped] = useState('');
  const locked = !!requireText && !matchesConfirmation(typed, requireText);
  useFocusTrap(dialogRef);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // fase de captura: o Esc fecha só o diálogo, não o modal por baixo
      onCancel();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div className="modal-overlay confirm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={dialogRef}
        className="modal active confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
      >
        <h2 className="mb-2" id="confirm-title">{title}</h2>
        <p className="text-muted confirm-msg" id="confirm-msg">{message}</p>
        {extraAction && (
          <button type="button" className="btn btn-outline" onClick={extraAction.onClick}>{extraAction.label}</button>
        )}
        {requireText && (
          <div className="form-group">
            <label htmlFor="confirm-text">Digite {requireText} para confirmar</label>
            <input
              type="text"
              id="confirm-text"
              autoComplete="off"
              autoCapitalize="characters"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`}
          disabled={locked}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-outline btn-ghost" autoFocus onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
