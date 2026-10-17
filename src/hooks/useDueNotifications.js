import { useCallback, useEffect, useRef } from 'react';
import { notifyDue } from '../lib/notifications.js';
import { todayStr } from '../lib/dates.js';

/**
 * Dispara avisos de vencimento (no dia, atrasada e antecedência) conforme as preferências, enquanto o app está aberto
 * (ao abrir, ao voltar para a aba, a cada minuto e quando a lista muda).
 * Notificações com o app fechado exigem Web Push (backend) — ver README.
 */
export function useDueNotifications(subs, onNotified, permission, people = [], settings) {
  const subsRef = useRef(subs);
  const peopleRef = useRef(people);
  const settingsRef = useRef(settings);
  const cbRef = useRef(onNotified);
  const running = useRef(false);
  // Quem já foi avisado hoje: o `lastNotified` do estado chega só no render seguinte, e outra checagem (ex.: a lista mudou
  // por causa das cobranças automáticas) pode começar antes disso e avisar duas vezes.
  const notifiedToday = useRef({ day: '', ids: new Set() });

  useEffect(() => {
    subsRef.current = subs;
    peopleRef.current = people;
    settingsRef.current = settings;
    cbRef.current = onNotified;
  });

  const check = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const day = todayStr();
      if (notifiedToday.current.day !== day) notifiedToday.current = { day, ids: new Set() };
      const already = notifiedToday.current.ids;
      const subs = subsRef.current.map((s) => (already.has(s.id) ? { ...s, lastNotified: day } : s));
      const ids = await notifyDue(subs, new Date(), peopleRef.current, settingsRef.current);
      ids.forEach((id) => already.add(id));
      if (ids.length) cbRef.current(ids);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    check();
  }, [subs, permission, settings, check]);

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
