import { useEffect, useState } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const focusables = (root) => Array.from(root.querySelectorAll(FOCUSABLE));

/**
 * Acessibilidade de diálogos: foco inicial no primeiro campo, Tab/Shift+Tab presos no diálogo,
 * foco devolvido a quem abriu e sem rolagem do body enquanto aberto.
 * `refocusOn`: quando muda (ex.: passo do modal), o foco volta ao primeiro campo do novo conteúdo.
 * @param {{current: HTMLElement | null}} ref contêiner do diálogo
 */
export default function useFocusTrap(ref, refocusOn) {
  // Lido na renderização, antes de o diálogo (ou seu autoFocus) tomar o foco.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables(root);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);

    return () => {
      root.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && opener !== document.body && document.contains(opener)) opener.focus();
    };
  }, [ref, opener]);

  useEffect(() => {
    const root = ref.current;
    if (!root || root.contains(document.activeElement)) return;
    (focusables(root)[0] ?? root).focus();
  }, [ref, refocusOn]);
}
