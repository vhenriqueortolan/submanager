import { useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';
import { useScreenHistory } from '../hooks/useScreenStack.js';
import { Button, Field, OptionList } from './index.jsx';

/**
 * Folha de edição: abre sobre a tela ao tocar num herói ou numa linha de configuração.
 * Fecha com Pronto (salva), Cancelar, Esc, toque fora ou o Voltar do sistema (os três últimos descartam).
 * `onDone` salva e fecha; sem ele (lista de opções) cada escolha salva e fecha por `close`.
 */
export function EditorSheet({ id, title, onClose, onDone, canDone = true, children }) {
  const ref = useRef(null);
  const { closing, back } = useScreenHistory({ id: `editor-${id}`, onClose });
  useFocusTrap(ref);

  const done = (e) => {
    e?.preventDefault();
    if (!canDone) return;
    onDone();
    back();
  };

  return (
    <div className="ds-sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && back()}>
      <form ref={ref} className={`ds-sheet${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby={`editor-${id}-title`} onSubmit={done}>
        <h2 className="ds-sheet-title" id={`editor-${id}-title`}>{title}</h2>
        {typeof children === 'function' ? children({ close: back }) : children}
        {onDone && <button type="submit" className="ds-btn ds-btn-primary" disabled={!canDone}>Pronto</button>}
        <Button variant="ghost" onClick={back}>Cancelar</Button>
      </form>
    </div>
  );
}

/**
 * Editor de um valor: texto, número ou dinheiro (`prefix="R$"`). O rascunho só vira valor com Pronto (ou Enter).
 * `validate(rascunho)` devolve a mensagem de erro, ou vazio quando está válido.
 */
export function FieldEditor({ id, title, label, value, onSave, onClose, prefix, inputMode, maxLength, placeholder, help, validate }) {
  const [draft, setDraft] = useState(value ?? '');
  const error = validate?.(draft) || '';
  return (
    <EditorSheet id={id} title={title} canDone={!error} onClose={onClose} onDone={() => onSave(draft)}>
      <Field
        label={label}
        id={`editor-${id}-field`}
        prefix={prefix}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        help={error || help}
        aria-invalid={!!error}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
      />
    </EditorSheet>
  );
}

/** Editor de escolha única: tocar numa opção salva e fecha. */
export function OptionEditor({ id, title, options, value, onSave, onClose }) {
  return (
    <EditorSheet id={id} title={title} onClose={onClose}>
      {({ close }) => (
        <OptionList
          label={title}
          options={options}
          value={value}
          onChange={(v) => {
            onSave(v);
            close();
          }}
        />
      )}
    </EditorSheet>
  );
}
