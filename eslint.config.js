import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist', 'test-results', 'playwright-report', 'node_modules'] },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['src/**/*.test.js', 'e2e/**/*.js', 'scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // 'use' do Playwright (fixtures) não é o hook 'use' do React.
    files: ['e2e/**/*.js'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { sourceType: 'script', globals: globals.serviceworker },
  },
  {
    // Regra nova do react-hooks 7: padrões existentes e intencionais; fica como aviso.
    files: ['src/**/*.{js,jsx}'],
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
];
