import { defineConfig, devices } from '@playwright/test';
import { TIMEZONE } from './e2e/timezone.js';

const PORT = process.env.E2E_PORT || 4173;
const externalBase = process.env.E2E_BASE_URL; // para apontar para um preview da Vercel, por exemplo

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: externalBase || `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: TIMEZONE,
    // O service worker do app intercepta as requisições da página, e o page.route() do Playwright não enxerga o que passa por ele.
    // Sem isso, o stub de /_vercel/* (fixtures.js) é ignorado depois do primeiro load e o servidor devolve index.html no lugar do script.
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }, // também Chromium: não exige outro browser
  ],
  webServer: externalBase
    ? undefined
    : {
        command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        // Habilita a tela de teste do contrato de navegação (src/components/TestScreen.jsx) só neste build.
        env: { VITE_E2E: '1' },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
