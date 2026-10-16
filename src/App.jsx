import { useCallback, useEffect, useState } from 'react';
import Onboarding from './components/Onboarding.jsx';
import Home from './components/Home.jsx';
import Discover from './components/Discover.jsx';
import Profile from './components/Profile.jsx';
import SubModal from './components/SubModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import { useStore } from './hooks/useStore.js';
import { useToday } from './hooks/useToday.js';
import { useNotificationPermission } from './hooks/useNotificationPermission.js';
import { useDueNotifications } from './hooks/useDueNotifications.js';
import { todayStr } from './lib/dates.js';
import { newId, parseImport, requestPersistence } from './lib/storage.js';
import { downloadBackup } from './lib/backup.js';
import { snoozeUntil } from './lib/reminder.js';
import { trackEvent } from './lib/analytics.js';

export default function App() {
  const { state, dispatch, saveFailed } = useStore();
  const today = useToday();
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState(null); // null | { mode: 'new', preset? } | { mode: 'edit', sub }
  const [confirm, setConfirm] = useState(null); // null | { title, message, confirmLabel, danger, onConfirm }
  const [toast, setToast] = useState(null);
  const [permission, requestPermission] = useNotificationPermission();

  const notify = useCallback((message, action) => setToast({ message, action, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), toast.action ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (saveFailed) notify('Não foi possível salvar os dados neste navegador (armazenamento indisponível ou cheio).');
  }, [saveFailed, notify]);

  const onNotified = useCallback((ids) => dispatch({ type: 'markNotified', ids, day: todayStr() }), [dispatch]);
  useDueNotifications(state.onboarded ? state.subs : [], onNotified, permission);

  const closeModal = useCallback(() => setModal(null), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const enableNotifications = async () => {
    const result = await requestPermission();
    trackEvent('notification_permission', { result });
  };

  const handleSaveSub = (sub, meta = {}) => {
    if (modal?.mode === 'new') {
      trackEvent('subscription_added', { source: meta.source || 'manual', first: state.subs.length === 0 });
    }
    dispatch({ type: 'upsertSub', sub });
    if (modal?.mode === 'new' && state.subs.length === 0) requestPersistence();
    setModal(null);
  };

  const handlePay = (id, cycle) => {
    const paymentId = newId();
    dispatch({ type: 'markPaid', id, cycle, day: todayStr(), paymentId });
    notify('Pago.', {
      label: 'Desfazer',
      onClick: () => {
        dispatch({ type: 'unmarkPaid', id, paymentId });
        notify('Pagamento desfeito.');
      },
    });
  };

  const handleUnpay = (id, paymentId) => {
    dispatch({ type: 'unmarkPaid', id, paymentId });
    notify('Pagamento removido.');
  };

  const handleExport = () => {
    downloadBackup(state);
    dispatch({ type: 'backupDone', day: todayStr() });
    trackEvent('backup_exported');
    notify('Backup exportado.');
  };

  const handleDeleteSub = (id) => {
    const sub = state.subs.find((s) => s.id === id);
    setConfirm({
      title: 'Remover assinatura?',
      message: `“${sub?.name ?? 'Esta assinatura'}” será removida do seu portfólio.`,
      confirmLabel: 'Remover',
      danger: true,
      onConfirm: () => {
        dispatch({ type: 'deleteSub', id });
        trackEvent('subscription_removed');
        setConfirm(null);
        setModal(null);
      },
    });
  };

  const handleImport = async (file) => {
    let next;
    try {
      next = parseImport(await file.text());
    } catch (err) {
      notify(err.message || 'Não foi possível importar o backup.');
      return;
    }
    setConfirm({
      title: 'Substituir os dados atuais?',
      message: `Este backup tem ${next.subs.length} ${next.subs.length === 1 ? 'assinatura' : 'assinaturas'} e vai substituir o que está salvo neste navegador. Se tiver dúvida, exporte um backup antes.`,
      confirmLabel: 'Substituir',
      danger: true,
      onConfirm: () => {
        dispatch({ type: 'replace', state: next });
        trackEvent('backup_imported');
        setConfirm(null);
        notify('Backup importado.');
      },
    });
  };

  if (!state.onboarded) {
    return (
      <Onboarding
        onFinish={({ name, budget, interests, skipped }) => {
          dispatch({ type: 'completeOnboarding', name, budget, interests });
          trackEvent('onboarding_completed', { skipped: !!skipped });
          requestPersistence();
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
          onEnableNotifications={enableNotifications}
          onAdd={() => setModal({ mode: 'new' })}
          onEdit={(id) => setModal({ mode: 'edit', sub: state.subs.find((s) => s.id === id) })}
          onPay={handlePay}
          onExportBackup={handleExport}
          onSnoozeBackup={() => dispatch({ type: 'snoozeBackup', until: snoozeUntil(today) })}
        />
      )}

      {tab === 'discover' && <Discover onPick={(app) => setModal({ mode: 'new', preset: app })} />}

      {tab === 'profile' && (
        <Profile
          key={JSON.stringify([state.name, state.budget, state.interests])}
          state={state}
          permission={permission}
          onEnableNotifications={enableNotifications}
          onSave={({ name, budget, interests }) => {
            dispatch({ type: 'saveProfile', name, budget, interests });
            notify('Perfil salvo com sucesso!');
          }}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}

      <BottomNav tab={tab} onChange={setTab} />

      {modal && (
        <SubModal
          mode={modal.mode}
          sub={modal.mode === 'edit' ? state.subs.find((s) => s.id === modal.sub.id) ?? modal.sub : undefined}
          preset={modal.preset}
          interests={state.interests}
          onSave={handleSaveSub}
          onDelete={handleDeleteSub}
          onUnpay={handleUnpay}
          onClose={closeModal}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
