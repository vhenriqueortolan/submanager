import { useCallback, useEffect, useState } from 'react';

/** Guarda o evento `beforeinstallprompt` (Chrome/Android) para disparar a instalação por um botão. */
export function useInstallPrompt() {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setEvent(e);
    };
    const onInstalled = () => setEvent(null); // o rastreio de 'appinstalled' fica em analytics.js
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!event) return;
    event.prompt();
    await event.userChoice.catch(() => {});
    setEvent(null); // o evento só pode ser usado uma vez
  }, [event]);

  return { hasPrompt: !!event, promptInstall };
}
