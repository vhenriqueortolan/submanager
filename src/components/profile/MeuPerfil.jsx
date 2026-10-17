import { useState } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import { CATEGORIES } from '../../lib/catalog.js';
import { Button, EditableHero } from '../../design/index.jsx';
import { FieldEditor } from '../../design/Editors.jsx';

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export default function MeuPerfil({ state, onSave, onClose }) {
  const [name, setName] = useState(state.name || '');
  const [interests, setInterests] = useState(state.interests);
  const [editingName, setEditingName] = useState(false);
  const dirty = name.trim() !== (state.name || '') || !sameSet(interests, state.interests);

  const toggle = (value) =>
    setInterests((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const save = () => {
    onSave({ name, interests });
    setName(name.trim() || state.name || '');
  };

  return (
    <DetailScreen id="meu-perfil" title="Meu perfil" dirty={dirty} onClose={onClose}>
      <EditableHero label="Nome" value={name.trim()} placeholder="Seu nome" data-edit="profile-name" onEdit={() => setEditingName(true)} />

      <h2 className="section-heading" id="interests-label">Interesses</h2>
      <p className="text-muted mb-2">Usados para sugerir serviços ao cadastrar</p>
      <div className="profile-pills" id="prof-interests" role="group" aria-labelledby="interests-label">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            data-val={c.value}
            className={`category-pill${interests.includes(c.value) ? ' active' : ''}`}
            aria-pressed={interests.includes(c.value)}
            onClick={() => toggle(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Button className="mt-20" onClick={save}>Salvar</Button>

      {editingName && (
        <FieldEditor id="profile-name" title="Seu nome" label="Nome" value={name} maxLength={40} onSave={setName} onClose={() => setEditingName(false)} />
      )}
    </DetailScreen>
  );
}
