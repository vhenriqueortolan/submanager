import { useState } from 'react';
import DetailScreen from './DetailScreen.jsx';

/** Tela só para os testes e2e do contrato de navegação (build com VITE_E2E). */
export default function TestScreen({ onClose }) {
  const [text, setText] = useState('');
  return (
    <DetailScreen id="test-screen" title="Tela de teste" dirty={text !== ''} onClose={onClose}>
      <div className="form-group">
        <label htmlFor="test-field">Campo de teste</label>
        <input id="test-field" type="text" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    </DetailScreen>
  );
}
