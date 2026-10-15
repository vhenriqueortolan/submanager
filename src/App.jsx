import { useCallback, useEffect, useState } from 'react';
import Onboarding from './components/Onboarding.jsx';
import Home from './components/Home.jsx';
import Discover from './components/Discover.jsx';
import Profile from './components/Profile.jsx';
import SubModal from './components/SubModal.jsx';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import { useStore } from './hooks/useStore.js';
import { useToday } from './hooks/useToday.js';
import { useNotificationPermission } from './hooks/useNotificationPermission.js';
import { useDueNotifications } from './hooks/useDueNotifications.js';
import { todayStr } from './lib/dates.js';
import { parseImport } from './lib/storage.js';
import { downloadBackup } from './lib/backup.js';

export default function App() {
  const { state, dispatch, saveFailed } = useStore();
  const today = useToday();
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState(null); // null | { mode: 'new', preset? } | { mode: 'edit', sub }
  const [toast, setToast] = useState(null);
  const [permission, requestNotifications] = useNotificationPermission();

  const notify = useCallback((message) => setToast({ message, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (saveFailed) notify('Não foi possível salvar os dados neste navegador (armazenamento indisponível ou cheio).');
  }, [saveFailed, notify]);

  const onNotified = useCallback((ids) => dispatch({ type: 'markNotified', ids, day: todayStr() }), [dispatch]);
  useDueNotifications(state.onboarded ? state.subs : [], onNotified, permission);

  const closeModal = useCallback(() => setModal(null), []);

  const handleSaveSub = (sub) => {
    dispatch({ type: 'upsertSub', sub });
    setModal(null);
  };

  const handleDeleteSub = (id) => {
    if (!window.confirm('Remover assinatura?')) return;
    dispatch({ type: 'deleteSub', id });
    setModal(null);
  };

  const handleImport = async (file) => {
    try {
      const next = parseImport(await file.text());
      if (!window.confirm(`Substituir os dados atuais por este backup (${next.subs.length} assinaturas)?`)) return;
      dispatch({ type: 'replace', state: next });
      notify('Backup importado.');
    } catch (err) {
      notify(err.message || 'Não foi possível importar o backup.');
    }
  };

  if (!state.onboarded) {
    return (
      <Onboarding
        onFinish={({ name, budget, interests }) => {
          dispatch({ type: 'completeOnboarding', name, budget, interests });
          setTab('home');
        }}
      />
    );
  }

  return (
    <>
      {tab === 'home' && (
        <Home
          state={state}
          today={today}
          permission={permission}
          onEnableNotifications={requestNotifications}
          onAdd={() => setModal({ mode: 'new' })}
          onEdit={(id) => setModal({ mode: 'edit', sub: state.subs.find((s) => s.id === id) })}
          onPay={(id, cycle) => dispatch({ type: 'markPaid', id, cycle })}
        />
      )}

      {tab === 'discover' && <Discover onPick={(app) => setModal({ mode: 'new', preset: app })} />}

      {tab === 'profile' && (
        <Profile
          key={JSON.stringify([state.name, state.budget, state.interests])}
          state={state}
          permission={permission}
          onEnableNotifications={requestNotifications}
          onSave={({ name, budget, interests }) => {
            dispatch({ type: 'saveProfile', name, budget, interests });
            notify('Perfil salvo com sucesso!');
          }}
          onExport={() => {
            downloadBackup(state);
            notify('Backup exportado.');
          }}
          onImport={handleImport}
        />
      )}

      <BottomNav tab={tab} onChange={setTab} />

      {modal && (
        <SubModal
          mode={modal.mode}
          sub={modal.sub}
          preset={modal.preset}
          interests={state.interests}
          onSave={handleSaveSub}
          onDelete={handleDeleteSub}
          onClose={closeModal}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
