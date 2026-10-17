import { useState } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import Divisao from './Divisao.jsx';
import { moneyToInput, parseMoneyInput } from '../../lib/budget.js';

export default function Orcamento({ state, onSave, onAddPerson, onRenamePerson, onRemovePerson, onClose }) {
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

      <Divisao
        people={state.people}
        subs={state.subs}
        onAddPerson={onAddPerson}
        onRenamePerson={onRenamePerson}
        onRemovePerson={onRemovePerson}
      />
    </DetailScreen>
  );
}
