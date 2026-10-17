import { useState } from 'react';
import { NAME_ERRORS, renamePerson, resolvePerson, sharedCount } from '../../lib/people.js';

const countLabel = (n) => (n === 0 ? 'Nenhuma assinatura dividida' : `Divide ${n} ${n === 1 ? 'assinatura' : 'assinaturas'}`);

/** Seção Divisão: adicionar, renomear e remover aplicam na hora (sem Salvar). */
export default function Divisao({ people, subs, onAddPerson, onRenamePerson, onRemovePerson }) {
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');

  const add = () => {
    const found = resolvePerson(people, newName);
    if (!found) return;
    if (!found.isNew) {
      setAddError(NAME_ERRORS.duplicate);
      return;
    }
    onAddPerson(found.person);
    setNewName('');
    setAddError('');
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditError('');
  };

  const confirmEdit = () => {
    const result = renamePerson(people, editingId, editName);
    if (result.error) {
      setEditError(NAME_ERRORS[result.error]);
      return;
    }
    onRenamePerson(editingId, editName);
    setEditingId(null);
  };

  return (
    <section id="people-section" aria-labelledby="divisao-title">
      <h2 className="section-heading" id="divisao-title">Divisão</h2>
      <p className="text-muted mb-2">Quem divide assinaturas com você. Os nomes ficam só neste aparelho.</p>

      {people.length === 0 ? (
        <p className="text-muted">Ninguém ainda.</p>
      ) : (
        <ul className="payment-list">
          {people.map((p) => (
            <li key={p.id} className="person-item">
              {editingId === p.id ? (
                <div className="person-edit">
                  <div className="person-add">
                    <input
                      type="text"
                      maxLength={40}
                      autoFocus
                      aria-label={`Novo nome de ${p.name}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          confirmEdit();
                        }
                      }}
                    />
                    <button type="button" className="btn-sm" onClick={confirmEdit}>OK</button>
                    <button type="button" className="pay-btn" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                  {editError && <p className="error-text person-error" role="alert">{editError}</p>}
                </div>
              ) : (
                <div className="payment-row">
                  <span className="person-info">
                    <span>{p.name}</span>
                    <span className="text-muted person-count">{countLabel(sharedCount(subs, p.id))}</span>
                  </span>
                  <span className="person-actions">
                    <button type="button" className="pay-btn" aria-label={`Renomear ${p.name}`} onClick={() => startEdit(p)}>Renomear</button>
                    <button type="button" className="pay-btn" aria-label={`Remover ${p.name}`} onClick={() => onRemovePerson(p.id)}>Remover</button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="person-add mt-2">
        <input
          type="text"
          id="divisao-add"
          maxLength={40}
          placeholder="Nome da pessoa"
          aria-label="Adicionar pessoa"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setAddError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-sm" onClick={add}>Adicionar</button>
      </div>
      {addError && <p className="error-text person-error" role="alert">{addError}</p>}
    </section>
  );
}
