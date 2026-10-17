// Pinça bloqueada no app inteiro (decisão da Sprint 6). Android e navegadores: `touch-action` no CSS.
// iOS Safari ignora o viewport e o touch-action na pinça; lá os eventos `gesture*` precisam de preventDefault.
export const GESTURE_EVENTS = ['gesturestart', 'gesturechange', 'gestureend'];

export const preventGesture = (e) => e.preventDefault();

/**
 * Registra o bloqueio dos eventos de gesto (não passivo, senão o preventDefault é ignorado).
 * @param {EventTarget} target normalmente `document`
 * @returns {() => void} remove os ouvintes
 */
export function blockGestures(target) {
  for (const type of GESTURE_EVENTS) target.addEventListener(type, preventGesture, { passive: false });
  return () => {
    for (const type of GESTURE_EVENTS) target.removeEventListener(type, preventGesture);
  };
}
