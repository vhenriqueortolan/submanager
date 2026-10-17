import { useState } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import { CATEGORIES } from '../../lib/catalog.js';

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export default function MeuPerfil({ state, onSave, onClose }) {
  const [name, setName] = useState(state.name || '');
  const [interests, setInterests] = useState(state.interests);
  const dirty = name.trim() !== (state.name || '') || !sameSet(interests, state.interests);

  const toggle = (value) =>
    setInterests((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const save = () => {
    onSave({ name, interests });
    setName(name.trim() || state.name || '');
  };

  return (
    <DetailScreen id="meu-perfil" title="Meu perfil" dirty={dirty} onClose={onClose}>
      <div className="form-group">
        <label htmlFor="prof-name">Nome</label>
        <input type="text" id="prof-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

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

      <button type="button" className="btn btn-primary" onClick={save}>Salvar</button>
    </DetailScreen>
  );
}
