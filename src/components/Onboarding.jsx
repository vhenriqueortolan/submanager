import { useState } from 'react';
import { BrandMark } from './AppBrand.jsx';
import { CATEGORIES } from '../lib/catalog.js';

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [interests, setInterests] = useState([]);

  const toggle = (value) =>
    setInterests((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  // Pular encerra o onboarding mantendo o que já foi preenchido até aqui.
  const skip = (
    <button
      type="button"
      className="btn btn-outline btn-ghost skip-btn"
      onClick={() => onFinish({ name, budget, interests, skipped: true })}
    >
      Pular por enquanto
    </button>
  );

  return (
    <div id="onboarding-fs">
      {step === 1 && (
        <form className="obs-step" id="step-1" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
          <div className="obs-logo"><BrandMark /></div>
          <h1 className="obs-title">Bem-vindo.</h1>
          <p className="text-muted mb-2">Como prefere ser chamado?</p>
          <input
            type="text"
            id="setup-name"
            className="obs-input"
            placeholder="O seu nome"
            aria-label="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Continuar</button>
          {skip}
        </form>
      )}

      {step === 2 && (
        <form className="obs-step" id="step-2" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
          <h1 className="obs-title">Orçamento.</h1>
          <p className="text-muted mb-2">Quanto você quer gastar, no máximo, por mês? Conte só a sua parte, se dividir alguma assinatura.</p>
          <input
            type="number"
            inputMode="decimal"
            id="setup-budget"
            className="obs-input"
            placeholder="0,00"
            aria-label="Valor máximo por mês (só a sua parte)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Continuar</button>
          {skip}
        </form>
      )}

      {step === 3 && (
        <div className="obs-step" id="step-3">
          <h1 className="obs-title">Interesses.</h1>
          <p className="text-muted mb-2">Quais categorias de apps você costuma assinar?</p>
          <div className="obs-pills">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`category-pill${interests.includes(c.value) ? ' active' : ''}`}
                aria-pressed={interests.includes(c.value)}
                onClick={() => toggle(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => onFinish({ name, budget, interests })}>
            Ir para o App
          </button>
          {skip}
        </div>
      )}
    </div>
  );
}
