export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return; // em dev não registra (evita cache atrapalhando)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker não registrado:', err));
  });
}

const UPDATE_WAIT_MS = 8000;

/**
 * Pede ao service worker que procure uma versão nova (puxar para atualizar).
 * - 'offline': sem conexão (ou a busca falhou);
 * - 'reloading': havia versão nova; o app recarrega quando ela assume (`controllerchange`);
 * - 'current': já estava na versão mais recente (ou não há service worker, como em dev).
 * @returns {Promise<'offline' | 'reloading' | 'current'>}
 */
export async function checkForUpdate() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (!('serviceWorker' in navigator)) return 'current';
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return 'current';
  try {
    await registration.update();
  } catch {
    return 'offline';
  }
  if (!registration.installing && !registration.waiting) return 'current';
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('current'), UPDATE_WAIT_MS);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        clearTimeout(timer);
        window.location.reload();
        resolve('reloading');
      },
      { once: true },
    );
  });
}
