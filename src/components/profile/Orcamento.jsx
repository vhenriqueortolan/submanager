import { useState } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import { moneyToInput, parseMoneyInput } from '../../lib/budget.js';

export default function Orcamento({ state, onSave, onRemovePerson, onClose }) {
  const [text, setText] = useState(moneyToInput(state.budget));
  const value = parseMoneyInput(text);
  const dirty = value !== (Number(state.budget) || 0);

  return (
    <DetailScreen id="orcamento" title="Orçamento" dirty={dirty} onClose={onClose}>
      <div className="form-group">
        <label htmlFor="prof-budget">Valor máximo por mês</label>
        <div className="money-field">
          <span className="money-prefix" aria-hidden="true">R$</span>
          <input
            type="text"
            inputMode="decimal"
            id="prof-budget"
            placeholder="0,00"
            value={text}
            aria-invalid={value === null}
            aria-describedby="prof-budget-help"
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <p className="text-muted backup-hint" id="prof-budget-help">
          {value === null ? <span className="error-text">Informe um valor válido, como 300 ou 300,50.</span> : 'Conta só a sua parte.'}
        </p>
      </div>
      <button type="button" className="btn btn-primary" disabled={value === null} onClick={() => onSave({ budget: value })}>
        Salvar
      </button>

      <h2 className="section-heading">Divisão</h2>
      <div id="people-section">
        {state.people.length === 0 ? (
          <p className="text-muted">Ninguém ainda. Adicione pessoas ao dividir uma assinatura. Os nomes ficam só neste aparelho.</p>
        ) : (
          <ul className="payment-list">
            {state.people.map((p) => (
              <li key={p.id} className="payment-row">
                <span>{p.name}</span>
                <button type="button" className="pay-btn" aria-label={`Remover ${p.name}`} onClick={() => onRemovePerson(p.id)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailScreen>
  );
}
