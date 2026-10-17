import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Guardrail do Design System: cor hexadecimal e tamanho de fonte só em src/design/tokens.css.
// Arquivos com valores fixos ainda por migrar ficam em EXCECOES; a lista só encolhe e chega a zero em D5.
// Limite conhecido: enquanto um arquivo estiver na lista, uma cor nova nele passa sem falhar.
const EXCECOES = []; // zerada em D5 (Sprint 5)
const TOKENS = 'src/design/tokens.css';

const root = join(import.meta.dirname, '..', '..');

function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });
}

const rel = (path) => relative(root, path).split(sep).join('/');

/** Corpos de declaração ({...}) sem comentários, para não confundir seletor `#id` com cor. */
function declarations(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(clean.matchAll(/\{([^{}]*)\}/g), (m) => m[1]).join('\n');
}

function violations(css) {
  const body = declarations(css);
  const found = [];
  for (const m of body.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) found.push(`cor ${m[0]}`);
  for (const m of body.matchAll(/font-size\s*:\s*(?!\s|var\()[^;]+/g)) found.push(m[0].trim());
  for (const m of body.matchAll(/\b(?:rgba?|hsla?)\(/g)) found.push('função de cor ' + m[0]);
  // Atalho `font` com tamanho literal (font-family e var(--text-*) não contam).
  for (const m of body.matchAll(/(?<![-\w])font\s*:[^;]*\d(px|rem|em)\b[^;]*/g)) found.push(m[0].trim());
  return found;
}

const files = cssFiles(join(root, 'src')).map(rel);

test('guardrail: valores visuais fixos só em tokens.css (fora da lista de exceções)', () => {
  for (const file of files) {
    if (file === TOKENS || EXCECOES.includes(file)) continue;
    const found = violations(readFileSync(join(root, file), 'utf8'));
    assert.deepEqual(found, [], `${file} tem valores fora de ${TOKENS}`);
  }
});

test('guardrail: toda exceção ainda existe e ainda tem valor fixo (lista não envelhece)', () => {
  for (const file of EXCECOES) {
    assert.ok(files.includes(file), `${file} não existe mais: tire da lista de exceções`);
    assert.ok(violations(readFileSync(join(root, file), 'utf8')).length > 0, `${file} já está limpo: tire da lista de exceções`);
  }
});

test('detecção: pega cor e font-size em declaração, ignora seletor com #id', () => {
  assert.deepEqual(violations('#add-modal { color: #fff; font-size: 14px }'), ['cor #fff', 'font-size: 14px']);
  assert.deepEqual(violations('.a { font-size: var(--font-size-body) }'), []);
  assert.deepEqual(violations('.a { background: rgba(0,0,0,0.5); color: hsl(10 20% 30%) }'), ['função de cor rgba(', 'função de cor hsl(']);
  assert.deepEqual(violations('.a { font: 600 14px/1 sans-serif }'), ['font: 600 14px/1 sans-serif']);
  assert.deepEqual(violations('.a { font: var(--text-body); font-family: var(--font) }'), []);
  assert.deepEqual(violations('/* #fff */ #abc .x { color: var(--text); }'), []);
});

test('tokens.css define os tokens de cor, tipografia, espaço, forma e camadas do plano', () => {
  const tokens = readFileSync(join(root, TOKENS), 'utf8');
  const exigidos = [
    '--color-bg', '--color-surface', '--color-surface-raised', '--color-border', '--color-focus', '--color-text',
    '--color-text-muted', '--color-action', '--color-danger', '--color-warning', '--color-success',
    '--font-size-display', '--font-size-title-lg', '--font-size-title', '--font-size-body', '--font-size-label', '--font-size-caption',
    '--space-1', '--space-8', '--radius-control', '--radius-card', '--radius-screen',
    '--touch-min', '--field-height', '--motion-screen', '--z-detail', '--z-confirm', '--z-toast',
  ];
  for (const nome of exigidos) assert.match(tokens, new RegExp(`${nome} *:`), `falta ${nome}`);
});
