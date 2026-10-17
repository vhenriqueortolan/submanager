import { useEffect, useRef, useState } from 'react';
import { canStartPull, isVerticalPull, pullDistance, shouldTrigger } from '../lib/pull.js';
import { openScreenCount } from './useScreenStack.js';

/**
 * Puxar para atualizar na tela inicial. Devolve `{ distance, refreshing }` para o indicador.
 * O gesto só vale com a página no topo e nenhuma tela, folha ou diálogo aberto.
 * @param {{enabled: boolean, onRefresh: () => Promise<void>}} opts
 */
export default function usePullToRefresh({ enabled, onRefresh }) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(onRefresh);
  const busyRef = useRef(false);

  useEffect(() => {
    refreshRef.current = onRefresh;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let start = null; // { x, y } do dedo quando o gesto pode começar
    let current = 0;

    const reset = () => {
      start = null;
      current = 0;
      setDistance(0);
    };

    const onStart = (e) => {
      const ok = canStartPull({
        scrollY: window.scrollY,
        openScreens: openScreenCount(),
        locked: document.body.style.overflow === 'hidden',
        touches: e.touches.length,
        refreshing: busyRef.current,
      });
      start = ok ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      current = 0;
    };

    const onMove = (e) => {
      if (!start) return;
      if (e.touches.length !== 1 || window.scrollY > 0) {
        reset();
        return;
      }
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!isVerticalPull(dx, dy)) {
        if (current === 0) start = null; // virou rolagem ou deslize: este gesto não é puxão
        return;
      }
      current = pullDistance(dy);
      setDistance(current);
      if (e.cancelable) e.preventDefault(); // sem isso o navegador rola ou atualiza a página por conta própria
    };

    const onEnd = async () => {
      const fire = start && shouldTrigger(current);
      reset();
      if (!fire || busyRef.current) return;
      busyRef.current = true;
      setRefreshing(true);
      try {
        await refreshRef.current();
      } finally {
        busyRef.current = false;
        setRefreshing(false);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', reset);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
      setDistance(0);
    };
  }, [enabled]);

  return { distance, refreshing };
}
