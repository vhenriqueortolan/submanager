import { useState } from 'react';
import DetailScreen from '../DetailScreen.jsx';
import { Button } from '../../design/index.jsx';
import { countryOf } from '../../lib/phone.js';

/**
 * Tela de revisão única: o que veio da agenda ou dos arquivos .vcf, com caixa de seleção.
 * Nome obrigatório; nome repetido aparece com o erro e fica desmarcado. Nada é salvo antes de "Adicionar".
 * @param {{candidates: ReturnType<import('../../lib/contacts.js').prepareCandidates>, onConfirm: (chosen: object[]) => void, onClose: () => void}} props
 */
export default function ContactReview({ candidates, onConfirm, onClose }) {
  const [marked, setMarked] = useState(() => new Set(candidates.filter((c) => c.selected).map((c) => c.key)));
  const toggle = (key) =>
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const chosen = candidates.filter((c) => marked.has(c.key) && !c.error);

  return (
    <DetailScreen id="contatos-revisao" title="Revisar contatos" onClose={onClose}>
      <p className="text-muted mb-2">Marque quem você quer adicionar à Divisão. Nomes, telefones e e-mails ficam só neste aparelho.</p>
      <ul className="review-list">
        {candidates.map((c) => {
          const inputId = `review-${c.key}`;
          return (
            <li key={c.key} className="review-item">
              <input type="checkbox" id={inputId} checked={marked.has(c.key)} disabled={!!c.error} onChange={() => toggle(c.key)} />
              <label htmlFor={inputId}>
                <span className="review-name">{c.name || 'Sem nome'}</span>
                {c.phone && <span className="text-muted review-detail">{c.phone} · {countryOf(c.phoneCountry).name}</span>}
                {c.email && <span className="text-muted review-detail">{c.email}</span>}
                {c.error && <span className="error-text review-detail" role="alert">{c.error}</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <Button className="mt-20" disabled={chosen.length === 0} onClick={() => onConfirm(chosen)}>
        {chosen.length === 1 ? 'Adicionar 1 pessoa' : `Adicionar ${chosen.length} pessoas`}
      </Button>
    </DetailScreen>
  );
}
