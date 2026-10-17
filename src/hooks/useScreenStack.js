import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Histórico das telas de detalhe: cada tela aberta é uma entrada do histórico do navegador (sem mudar a URL),
 * então o Voltar do sistema fecha só a tela do topo. Um único listener de `popstate` entrega o evento à tela do topo.
 */
const stack = [];
let ignorePops = 0; // popstates que nós mesmos causamos ao desmontar uma tela
let pendingBack = null; // desmontagem adiada: se outra tela montar logo em seguida, reaproveita a entrada

function onPopState() {
  if (ignorePops > 0) {
    ignorePops -= 1;
    return;
  }
  stack[stack.length - 1]?.onPop();
}

if (typeof window !== 'undefined') window.addEventListener('popstate', onPopState);

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
export const SCREEN_ANIMATION_MS = 250;

/**
 * @param {{ id: string, dirty?: boolean, onClose: () => void }} opts
 * `onClose` é chamado ao fim da animação de saída, quando a tela já pode ser desmontada.
 */
export function useScreenHistory({ id, dirty = false, onClose }) {
  const [closing, setClosing] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const dirtyRef = useRef(dirty);
  const onCloseRef = useRef(onClose);
  const forceRef = useRef(false);
  const entryRef = useRef(null);

  useEffect(() => {
    dirtyRef.current = dirty;
    onCloseRef.current = onClose;
  });

  const finish = useCallback(() => {
    setAskDiscard(false);
    setClosing(true);
    const ms = prefersReducedMotion() ? 0 : SCREEN_ANIMATION_MS;
    setTimeout(() => onCloseRef.current(), ms);
  }, []);

  useEffect(() => {
    const entry = {
      popped: false,
      onPop() {
        entry.popped = true; // o navegador já removeu a entrada
        if (dirtyRef.current && !forceRef.current) {
          // Cancelar a saída exige recolocar a entrada que o Voltar acabou de tirar.
          window.history.pushState({ screen: id }, '');
          entry.popped = false;
          setAskDiscard(true);
          return;
        }
        finish();
      },
    };
    entryRef.current = entry;
    if (pendingBack) {
      clearTimeout(pendingBack);
      pendingBack = null;
    } else {
      window.history.pushState({ screen: id }, '');
    }
    stack.push(entry);

    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (!entry.popped) {
        pendingBack = setTimeout(() => {
          pendingBack = null;
          ignorePops += 1;
          window.history.back();
        }, 0);
      }
    };
  }, [id, finish]);

  /** ← e Esc. */
  const back = useCallback(() => {
    if (dirtyRef.current) setAskDiscard(true);
    else window.history.back();
  }, []);

  const discard = useCallback(() => {
    forceRef.current = true;
    window.history.back();
  }, []);

  const keepEditing = useCallback(() => setAskDiscard(false), []);

  // Esc só age na tela do topo.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (stack[stack.length - 1] !== entryRef.current) return;
      back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [back]);

  return { closing, askDiscard, back, discard, keepEditing };
}
