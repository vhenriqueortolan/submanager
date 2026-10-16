import { useCallback, useEffect, useRef } from 'react';
import { notifyDue } from '../lib/notifications.js';

/**
 * Dispara avisos de "vence hoje" / "atrasada" enquanto o app está aberto
 * (ao abrir, ao voltar para a aba, a cada minuto e quando a lista muda).
 * Notificações com o app fechado exigem Web Push (backend) — ver README.
 */
export function useDueNotifications(subs, onNotified, permission, people = []) {
  const subsRef = useRef(subs);
  const peopleRef = useRef(people);
  const cbRef = useRef(onNotified);
  const running = useRef(false);

  useEffect(() => {
    subsRef.current = subs;
    peopleRef.current = people;
    cbRef.current = onNotified;
  });

  const check = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const ids = await notifyDue(subsRef.current, new Date(), peopleRef.current);
      if (ids.length) cbRef.current(ids);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    check();
  }, [subs, permission, check]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) check();
    };
    const id = setInterval(check, 60000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [check]);
}
