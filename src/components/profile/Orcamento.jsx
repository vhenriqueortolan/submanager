import { useState } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import Divisao from './Divisao.jsx';
import { moneyToInput, parseMoneyInput } from '../../lib/budget.js';
import { brl } from '../../lib/format.js';
import Historico from '../Historico.jsx';
import { EditableHero, SettingList, SettingRow } from '../../design/index.jsx';
import { FieldEditor } from '../../design/Editors.jsx';

export default function Orcamento({ state, onSave, onAddPerson, onRenamePerson, onRemovePerson, onUnpay, onClose }) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // O valor salva ao confirmar a folha de edição (Pronto ou Enter); não há botão Salvar.
  const value = Number(state.budget) || 0;

  return (
    <DetailScreen id="orcamento" title="Orçamento" onClose={onClose}>
      <EditableHero
        label="Valor máximo"
        value={value > 0 ? brl(value) : ''}
        placeholder="R$ 0,00"
        size="display"
        suffix="por mês"
        data-edit="budget"
        onEdit={() => setEditing(true)}
      />
      <p className="ds-help" id="prof-budget-help">Valor máximo por mês. Conta só a sua parte.</p>

      <div className="orcamento-historico">
        <SettingList>
          <SettingRow key="history" label="Histórico" value="Pagamentos e insights" data-edit="history" onClick={() => setShowHistory(true)} />
        </SettingList>
      </div>

      <Divisao
        people={state.people}
        subs={state.subs}
        onAddPerson={onAddPerson}
        onRenamePerson={onRenamePerson}
        onRemovePerson={onRemovePerson}
      />

      {showHistory && <Historico state={state} origem="orcamento" onUnpay={onUnpay} onClose={() => setShowHistory(false)} />}

      {editing && (
        <FieldEditor
          id="budget"
          title="Valor máximo por mês"
          label="Valor máximo"
          prefix="R$"
          value={moneyToInput(state.budget)}
          placeholder="0,00"
          help="Conta só a sua parte."
          validate={(v) => (parseMoneyInput(v) === null ? 'Informe um valor válido, como 300 ou 300,50.' : '')}
          onSave={(v) => onSave({ budget: parseMoneyInput(v) })}
          onClose={() => setEditing(false)}
        />
      )}
    </DetailScreen>
  );
}
