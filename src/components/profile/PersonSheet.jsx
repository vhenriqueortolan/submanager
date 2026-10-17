import { useId, useRef, useState } from 'react';
import { EditorSheet } from '../../design/Editors.jsx';
import { Button, Field } from '../../design/index.jsx';
import { COUNTRIES, DEFAULT_COUNTRY, countryOf, emailError, normalizePhone, phoneError, suggestCountry } from '../../lib/phone.js';
import { NAME_ERRORS, cleanName } from '../../lib/people.js';
import { parseVCards } from '../../lib/vcard.js';
import { pickContacts, supportsContactPicker } from '../../lib/contacts.js';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Folha de pessoa: nome (obrigatório), país, telefone e e-mail (opcionais).
 * Ao adicionar, também importa da agenda do aparelho (quando existe) ou de arquivos .vcf.
 * `onSave({ name, phone, phoneCountry, email })`; `onCandidates(lista)` leva à tela de revisão.
 */
export default function PersonSheet({ person, people, onSave, onCandidates, onClose }) {
  const [name, setName] = useState(person?.name ?? '');
  const [country, setCountry] = useState(person?.phoneCountry ?? DEFAULT_COUNTRY);
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [importError, setImportError] = useState('');
  const fileRef = useRef(null);
  const countryId = useId();
  const isEdit = !!person;
  const picker = supportsContactPicker();

  const cleaned = cleanName(name);
  const duplicate = people.some((p) => p.id !== person?.id && p.name.toLowerCase() === cleaned.toLowerCase());
  const nameError = !name.trim() ? NAME_ERRORS.empty : duplicate ? NAME_ERRORS.duplicate : '';
  const phoneProblem = phoneError(phone, country);
  const emailProblem = emailError(email);
  const suggestion = suggestCountry(phone);

  // Número com + traz o país: o seletor acompanha. Número sem + usa o país escolhido.
  const changePhone = (value) => {
    setPhone(value);
    const s = suggestCountry(value);
    if (s && countryOf(country).dial !== s.dial) setCountry(s.iso);
  };

  const done = () => {
    const normalized = normalizePhone(phone, country);
    // O + do número manda; se o país escolhido já usa esse código (ex.: Canadá no +1), vale o escolhido.
    const phoneCountry = suggestion && countryOf(country).dial !== suggestion.dial ? suggestion.iso : country;
    onSave({ name, phone: normalized, phoneCountry: normalized ? phoneCountry : '', email: email.trim() });
  };

  const readFiles = async (files) => {
    setImportError('');
    const found = [];
    for (const file of Array.from(files ?? [])) {
      if (file.size > MAX_FILE_BYTES) {
        setImportError('Arquivo grande demais. Exporte menos contatos por vez.');
        return;
      }
      found.push(...parseVCards(await file.text()));
    }
    if (!found.length) {
      setImportError('Não encontrei contatos nesse arquivo. Use um arquivo .vcf exportado da agenda.');
      return;
    }
    onCandidates(found);
  };

  const pickFromAgenda = async () => {
    setImportError('');
    try {
      const picked = await pickContacts();
      if (picked.length) onCandidates(picked);
    } catch {
      setImportError('Não consegui abrir a agenda. Importe um arquivo .vcf ou digite.');
    }
  };

  return (
    <EditorSheet id="person-edit" title={isEdit ? 'Editar pessoa' : 'Adicionar pessoa'} canDone={!nameError && !phoneProblem && !emailProblem} onClose={onClose} onDone={done}>
      {!isEdit && (
        <div className="person-import">
          {picker && <Button variant="secondary" onClick={pickFromAgenda}>Escolher da agenda</Button>}
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Importar .vcf</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".vcf,text/vcard"
            multiple
            hidden
            aria-label="Arquivo de contatos (.vcf)"
            onChange={(e) => {
              readFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {!picker && <p className="ds-help">Neste aparelho a agenda não abre direto. Importe um arquivo .vcf ou digite.</p>}
          {importError && <p className="error-text" role="alert">{importError}</p>}
        </div>
      )}
      <Field
        label="Nome"
        id="person-name"
        maxLength={40}
        placeholder="Ex: Ana"
        autoComplete="off"
        help={nameError || undefined}
        aria-invalid={!!nameError}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="ds-field">
        <label htmlFor={countryId}>País do telefone</label>
        <select id={countryId} className="ds-select" value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>{c.name} (+{c.dial})</option>
          ))}
        </select>
      </div>
      <Field
        label="Telefone (opcional)"
        id="person-phone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        placeholder="(11) 91234-5678"
        help={phoneProblem || (suggestion?.ambiguous ? 'O código +1 é de vários países (EUA, Canadá e outros). Confira o país.' : undefined)}
        aria-invalid={!!phoneProblem}
        value={phone}
        onChange={(e) => changePhone(e.target.value)}
      />
      <Field
        label="E-mail (opcional)"
        id="person-email"
        type="email"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        placeholder="ana@exemplo.com"
        help={emailProblem || undefined}
        aria-invalid={!!emailProblem}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </EditorSheet>
  );
}
