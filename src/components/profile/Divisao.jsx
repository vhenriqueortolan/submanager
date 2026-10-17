import { useState } from 'react';
import { Button } from '../../design/index.jsx';
import { prepareCandidates } from '../../lib/contacts.js';
import { newPerson, sharedCount } from '../../lib/people.js';
import { countryOf } from '../../lib/phone.js';
import ContactReview from './ContactReview.jsx';
import PersonSheet from './PersonSheet.jsx';

const countLabel = (n) => (n === 0 ? 'Nenhuma assinatura dividida' : `Divide ${n} ${n === 1 ? 'assinatura' : 'assinaturas'}`);

const contactLine = (p) =>
  [p.phone && `${p.phone}${p.phoneCountry ? ` · ${countryOf(p.phoneCountry).name}` : ''}`, p.email].filter(Boolean).join(' · ');

/** Seção Divisão: adicionar, editar e remover aplicam na hora (sem Salvar). */
export default function Divisao({ people, subs, onAddPerson, onUpdatePerson, onRemovePerson }) {
  const [sheet, setSheet] = useState(null); // null | { person? }
  const [review, setReview] = useState(null); // null | candidatos da agenda ou do .vcf

  const save = (input) => {
    if (sheet?.person) {
      onUpdatePerson(sheet.person.id, input);
      return;
    }
    const created = newPerson(people, input);
    if (created.person) onAddPerson(created.person);
  };

  const confirmReview = (chosen) => {
    // Recalcula a duplicidade a cada pessoa: o lote já adicionado conta como cadastrado.
    let current = people;
    for (const c of chosen) {
      const created = newPerson(current, c);
      if (!created.person) continue;
      onAddPerson(created.person);
      current = [...current, created.person];
    }
    setReview(null);
  };

  return (
    <section id="people-section" aria-labelledby="divisao-title">
      <h2 className="section-heading" id="divisao-title">Divisão</h2>
      <p className="text-muted mb-2">Quem divide assinaturas com você. Nomes, telefones e e-mails ficam só neste aparelho.</p>

      {people.length === 0 ? (
        <p className="text-muted">Ninguém ainda.</p>
      ) : (
        <ul className="payment-list">
          {people.map((p) => (
            <li key={p.id} className="person-item">
              <div className="payment-row">
                <button type="button" className="person-info person-open" aria-label={`Editar ${p.name}`} onClick={() => setSheet({ person: p })}>
                  <span>{p.name}</span>
                  <span className="text-muted person-count">{countLabel(sharedCount(subs, p.id))}</span>
                  {contactLine(p) && <span className="text-muted person-count">{contactLine(p)}</span>}
                </button>
                <span className="person-actions">
                  <button type="button" className="pay-btn" aria-label={`Remover ${p.name}`} onClick={() => onRemovePerson(p.id)}>Remover</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" className="mt-20" id="divisao-add" onClick={() => setSheet({})}>Adicionar pessoa</Button>

      {sheet && (
        <PersonSheet
          person={sheet.person}
          people={people}
          onSave={save}
          onCandidates={(raws) => {
            setSheet(null);
            setReview(prepareCandidates(raws, people));
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {review && <ContactReview candidates={review} onConfirm={confirmReview} onClose={() => setReview(null)} />}
    </section>
  );
}
