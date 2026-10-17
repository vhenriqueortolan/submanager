import { useState } from 'react';
import {
  Banner, Button, Chip, DetailScreen, EditableHero, EmptyState, Field, ItemCard, OptionList,
  SectionTitle, SettingList, SettingRow, StatusBadge,
} from './index.jsx';

const CYCLES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual', description: 'Cobrada uma vez por ano' },
];

/** Catálogo vivo dos componentes base. Só existe no build de e2e (VITE_E2E); o catálogo para consulta é o artefato do Design System. */
export default function Catalog({ onClose }) {
  const [name, setName] = useState('Netflix');
  const [editing, setEditing] = useState(false);
  const [cycle, setCycle] = useState('monthly');
  const [auto, setAuto] = useState(true);
  const [chip, setChip] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <DetailScreen id="catalogo" title="Catálogo" onClose={onClose}>
      <EditableHero label="Serviço" value={name} onEdit={() => setEditing(true)} />
      <EditableHero label="Valor" value="" placeholder="R$ 0,00" size="display" onEdit={() => setEditing(true)} />
      {editing && <Field label="Nome do serviço" value={name} onChange={(e) => setName(e.target.value)} />}

      <SectionTitle>Plano</SectionTitle>
      <SettingList>
        <SettingRow key="c" label="Cobrança" value={CYCLES.find((c) => c.value === cycle).label} onClick={() => setClicks((n) => n + 1)} />
        <SettingRow key="a" label="Cobrança automática" switchChecked={auto} onSwitch={setAuto} />
      </SettingList>
      <p role="status" id="catalog-clicks">Toques na linha: {clicks}</p>

      <OptionList label="Ciclo de cobrança" options={CYCLES} value={cycle} onChange={setCycle} />
      <Field label="Valor mensal" prefix="R$" help="Por mês, em reais." defaultValue="39,90" />
      <Field label="Buscar" type="search" />
      <Chip selected={chip} onClick={() => setChip(!chip)}>Streaming</Chip>

      <ItemCard name="Spotify" amount="R$ 21,90" meta={<><StatusBadge status="automatic" /><StatusBadge status="late" /></>} onClick={() => setClicks((n) => n + 1)} />
      <p>
        <StatusBadge status="estimated" /> <StatusBadge status="paused" /> <StatusBadge status="cancelled" />
      </p>

      <Banner title="Faça um backup" actions={<Button size="sm">Exportar</Button>}>Seus dados ficam só neste aparelho.</Banner>
      <Banner variant="alert" title="Orçamento excedido">Você passou do teto deste mês.</Banner>

      <div id="catalog-buttons">
        <Button>Primário</Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="ghost">Fantasma</Button>
        <Button variant="danger">Perigo</Button>
        <Button href="#sobre">Link</Button>
      </div>
      <EmptyState icon="📭" title="Nada por aqui" action={<Button variant="secondary">Cadastrar</Button>}>Cadastre sua primeira assinatura.</EmptyState>
    </DetailScreen>
  );
}
