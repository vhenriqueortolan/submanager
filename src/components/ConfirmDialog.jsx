import { useEffect, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';

/** Substitui window.confirm: acessível, com Esc para cancelar e foco inicial em "Cancelar". */
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
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
        <button type="button" className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-outline btn-ghost" autoFocus onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
