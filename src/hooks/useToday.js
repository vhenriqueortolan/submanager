import { useCallback, useEffect, useState } from 'react';
import { todayStr } from '../lib/dates.js';

/** Data de hoje (YYYY-MM-DD) que se atualiza sozinha na virada do dia ou ao voltar para o app. */
export function useToday() {
  return useTodayState()[0];
}

/** Como `useToday`, e também devolve `refresh`, que relê a data na hora (puxar para atualizar). */
export function useTodayState() {
  const [today, setToday] = useState(() => todayStr());
  useEffect(() => {
    const tick = () => setToday(todayStr());
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);
  return [today, useCallback(() => setToday(todayStr()), [])];
}
