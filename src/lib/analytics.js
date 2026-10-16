// Analytics sem cookies (Vercel Web Analytics).
// - Visualizações de página: todos os planos.
// - Eventos customizados (track): apenas planos Pro/Enterprise da Vercel, com no máx. 2 propriedades.
//   No Hobby as chamadas são inofensivas (não aparecem no painel).
// Regra de privacidade: NUNCA enviar nomes de serviços, valores, datas ou qualquer dado financeiro.
import { inject, track } from '@vercel/analytics';

export function initAnalytics() {
  if (!import.meta.env.PROD) return;
  try {
    inject();
  } catch (err) {
    console.warn('Analytics indisponível:', err);
  }
  window.addEventListener('appinstalled', () => trackEvent('pwa_installed'));
}

export function trackEvent(name, props) {
  if (!import.meta.env.PROD) return;
  try {
    track(name, props);
  } catch {
    /* analytics nunca pode quebrar o app */
  }
}
