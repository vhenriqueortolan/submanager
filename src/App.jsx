import { useCallback, useEffect, useState } from 'react';
import Onboarding from './components/Onboarding.jsx';
import Home from './components/Home.jsx';
import Discover from './components/Discover.jsx';
import Profile from './components/Profile.jsx';
import SubModal from './components/SubModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ProfileScreens from './components/profile/ProfileScreens.jsx';
import TestScreen from './components/TestScreen.jsx';
import Catalog from './design/Catalog.jsx';
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

const SAVE_FAILED_MESSAGE = 'Não foi possível salvar os dados neste navegador (armazenamento indisponível ou cheio).';

export default function App() {
  const { state, dispatch, saveFailed, resetAll } = useStore();
  const today = useToday();
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState(null); // null | { mode: 'new', preset? } | { mode: 'edit', sub }
  const [confirm, setConfirm] = useState(null); // null | { title, message, confirmLabel, danger, onConfirm }
  const [homeScreen, setHomeScreen] = useState(null); // tela do Perfil aberta a partir do Início
  const [testScreen, setTestScreen] = useState(false); // só no build de e2e
  const [catalog, setCatalog] = useState(false); // só no build de e2e
  const [toast, setToast] = useState(null);
  const [permission, requestPermission] = useNotificationPermission();

  const notify = useCallback((message, action) => setToast({ message, action, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), toast.action ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const [seenSaveFailed, setSeenSaveFailed] = useState(false);
  if (saveFailed !== seenSaveFailed) {
    setSeenSaveFailed(saveFailed);
    if (saveFailed) setToast({ message: SAVE_FAILED_MESSAGE, id: 'save-failed' });
  }

  const onNotified = useCallback((ids) => dispatch({ type: 'markNotified', ids, day: todayStr() }), [dispatch]);
  useDueNotifications(state.onboarded ? state.subs : [], onNotified, permission, state.people, state.settings);

  const closeModal = useCallback(() => setModal(null), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const enableNotifications = async () => {
    const result = await requestPermission();
    trackEvent('notification_permission', { result });
  };

  // Cobranças automáticas dos ciclos que faltam, uma passada depois que a tela inicial já apareceu (e na virada do dia).
  useEffect(() => {
    if (!state.onboarded) return undefined;
    const id = setTimeout(() => dispatch({ type: 'autoCharges', day: today }), 0);
    return () => clearTimeout(id);
  }, [state.subs, state.onboarded, today, dispatch]);

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

  // Pausar, cancelar e reativar são reversíveis: o aviso traz Desfazer, que devolve a assinatura como estava.
  const handleStatus = (id, op) => {
    const before = state.subs.find((s) => s.id === id);
    if (!before) return;
    dispatch({ type: 'setStatus', id, op, day: todayStr() });
    const message = { pause: 'Assinatura pausada.', cancel: 'Assinatura cancelada.', resume: 'Assinatura reativada.' }[op];
    notify(message, {
      label: 'Desfazer',
      onClick: () => {
        dispatch({ type: 'upsertSub', sub: before });
        notify('Alteração desfeita.');
      },
    });
  };

  const handleUnpay = (id, paymentId) => {
    dispatch({ type: 'unmarkPaid', id, paymentId });
    notify('Pagamento removido.');
  };

  const handleRemovePerson = (id) => {
    const person = state.people.find((p) => p.id === id);
    const count = state.subs.filter((s) => s.sharedWith.includes(id)).length;
    setConfirm({
      title: 'Remover pessoa?',
      message: `“${person?.name ?? 'Esta pessoa'}” será removida${count ? ` de ${count} ${count === 1 ? 'assinatura' : 'assinaturas'}` : ''} e as divisões serão recalculadas.`,
      confirmLabel: 'Remover',
      danger: true,
      onConfirm: () => {
        dispatch({ type: 'removePerson', id });
        setConfirm(null);
        notify('Pessoa removida.');
      },
    });
  };

  const handleClearData = () => {
    setConfirm({
      title: 'Apagar todos os dados?',
      message:
        'Isto apaga neste aparelho todas as assinaturas, pessoas, pagamentos e preferências, e você volta ao início do app. ' +
        'Não dá para desfazer. Os backups que você já baixou continuam nos seus arquivos, e a permissão de notificação só pode ' +
        'ser revogada nas configurações do navegador.',
      confirmLabel: 'Apagar tudo',
      danger: true,
      requireText: 'APAGAR',
      extraAction: { label: 'Exportar backup antes', onClick: handleExport },
      onConfirm: () => {
        const ok = resetAll();
        setConfirm(null);
        setModal(null);
        setTab('home');
        notify(ok ? 'Todos os dados foram apagados.' : 'Não foi possível apagar tudo neste navegador. Limpe os dados do site nas configurações.');
      },
    });
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

  const profileHandlers = {
    onEnableNotifications: enableNotifications,
    onSaveProfile: ({ name, budget, interests }) => {
      dispatch({ type: 'saveProfile', name, budget, interests });
      notify('Perfil salvo com sucesso!');
    },
    onExport: handleExport,
    onImport: handleImport,
    onAddPerson: (person) => dispatch({ type: 'addPerson', person }),
    onRenamePerson: (id, name) => dispatch({ type: 'renamePerson', id, name }),
    onRemovePerson: handleRemovePerson,
    onSettings: (patch) => dispatch({ type: 'updateSettings', patch }),
    onClearData: handleClearData,
    onUnpay: handleUnpay,
  };

  if (!state.onboarded) {
    return (
      <>
        <Onboarding
          onFinish={({ name, budget, interests, skipped }) => {
            dispatch({ type: 'completeOnboarding', name, budget, interests });
            trackEvent('onboarding_completed', { skipped: !!skipped });
            requestPersistence();
            setTab('home');
          }}
        />
        <Toast toast={toast} />
      </>
    );
  }

  return (
    <>
      {tab === 'home' && (
        <Home
          state={state}
          today={today}
          permission={permission}
          onOpenNotifications={() => setHomeScreen('notificacoes')}
          onOpenBudget={() => setHomeScreen('orcamento')}
          onOpenHistory={() => setHomeScreen('historico')}
          onAdd={() => setModal({ mode: 'new' })}
          onEdit={(id) => setModal({ mode: 'edit', sub: state.subs.find((s) => s.id === id) })}
          onPay={handlePay}
          onExportBackup={handleExport}
          onSnoozeBackup={() => dispatch({ type: 'snoozeBackup', until: snoozeUntil(today) })}
        />
      )}

      {tab === 'discover' && <Discover onPick={(app) => setModal({ mode: 'new', preset: app })} />}

      {tab === 'profile' && (
        <Profile state={state} permission={permission} handlers={profileHandlers} />
      )}

      <BottomNav tab={tab} onChange={setTab} />

      <ProfileScreens screen={homeScreen} onClose={() => setHomeScreen(null)} state={state} permission={permission} handlers={profileHandlers} />

      {import.meta.env.VITE_E2E && (
        <button type="button" className="e2e-open" onClick={() => setTestScreen(true)}>Abrir tela de teste</button>
      )}
      {import.meta.env.VITE_E2E && (
        <button type="button" className="e2e-open e2e-open-catalog" onClick={() => setCatalog(true)}>Abrir catálogo</button>
      )}
      {import.meta.env.VITE_E2E && catalog && <Catalog onClose={() => setCatalog(false)} />}
      {import.meta.env.VITE_E2E && testScreen && <TestScreen onClose={() => setTestScreen(false)} />}

      {modal && (
        <SubModal
          mode={modal.mode}
          sub={modal.mode === 'edit' ? state.subs.find((s) => s.id === modal.sub.id) ?? modal.sub : undefined}
          preset={modal.preset}
          interests={state.interests}
          people={state.people}
          onAddPerson={(person) => dispatch({ type: 'addPerson', person })}
          onSave={handleSaveSub}
          onDelete={handleDeleteSub}
          onUnpay={handleUnpay}
          onStatus={handleStatus}
          onClose={closeModal}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          requireText={confirm.requireText}
          extraAction={confirm.extraAction}
          onConfirm={confirm.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
