import { useCallback, useEffect, useState } from 'react';
import { getPermission, requestPermission } from '../lib/notifications.js';

/** @returns {['default'|'granted'|'denied'|'unsupported', () => Promise<string>]} */
export function useNotificationPermission() {
  const [permission, setPermission] = useState(getPermission);

  useEffect(() => {
    const sync = () => setPermission(getPermission());
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  const request = useCallback(async () => {
    const p = await requestPermission();
    setPermission(p);
    return p;
  }, []);

  return [permission, request];
}
