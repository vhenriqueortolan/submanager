import { useEffect, useState } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Telas empilhadas (cadastro: busca + detalhes) travam a rolagem juntas; só a última a sair destrava.
let scrollLocks = 0;
let savedOverflow = '';
// Diálogos abertos, do mais antigo ao mais novo: só o de cima prende o Tab.
const openRoots = [];

const focusables = (root) => Array.from(root.querySelectorAll(FOCUSABLE));

/**
 * Acessibilidade de diálogos: Tab/Shift+Tab presos no diálogo, foco devolvido a quem abriu
 * e sem rolagem do body enquanto aberto.
 * `refocusOn`: quando muda (ex.: passo do modal), o foco volta ao primeiro campo do novo conteúdo.
 * `initialFocus`: `first` (folhas de edição) foca o primeiro item; `none` (telas) não foca nada;
 * `cancel` (confirmação) deixa o foco com quem já o tomou (o `autoFocus` do Cancelar).
 * @param {{current: HTMLElement | null}} ref contêiner do diálogo
 * @param {unknown} [refocusOn]
 * @param {'first' | 'none' | 'cancel'} [initialFocus]
 */
export default function useFocusTrap(ref, refocusOn, initialFocus = 'first') {
  // Lido na renderização, antes de o diálogo (ou seu autoFocus) tomar o foco.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    if (scrollLocks === 0) savedOverflow = document.body.style.overflow;
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
    openRoots.push(root);
    // Sem foco inicial, quem tinha o foco (ex.: o botão da tela de baixo) o solta, para nada ficar focado fora da tela nova.
    if (initialFocus === 'none' && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();

    // No documento (e não no contêiner): sem foco inicial o Tab nasce fora do diálogo e precisa entrar nele.
    const onKey = (e) => {
      if (e.key !== 'Tab' || openRoots[openRoots.length - 1] !== root) return;
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
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      openRoots.splice(openRoots.indexOf(root), 1);
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
      if (opener && opener !== document.body && document.contains(opener)) opener.focus();
    };
  }, [ref, opener, initialFocus]);

  useEffect(() => {
    const root = ref.current;
    if (!root || initialFocus !== 'first' || root.contains(document.activeElement)) return;
    (focusables(root)[0] ?? root).focus();
  }, [ref, refocusOn, initialFocus]);
}
