// Calcula quais testes uma mudança afeta. Sem dependências: só Node.
//
//   node scripts/affected-tests.js --base <sha> [--head <ref>]   arquivos mudados entre dois commits
//   node scripts/affected-tests.js --files a.js,b.js             lista explícita (para testar)
//   node scripts/affected-tests.js --all                         suíte completa (push na main)
//
// Saída: linhas legíveis no log e, se GITHUB_OUTPUT existir, `checks`, `unit` e `e2e`.
// `unit` e `e2e` valem "ALL", "NONE" ou a lista de arquivos separada por espaço.
// Na dúvida (arquivo desconhecido, erro ao calcular) o resultado é ALL.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const posix = (p) => p.split(sep).join('/');

const isDoc = (f) => f.startsWith('docs/') || f.endsWith('.md');
// Mudança aqui afeta o app inteiro (build, configuração, CI, o próprio seletor).
const GLOBAL = [
  /^package(-lock)?\.json$/, /^vite\.config\./, /^playwright\.config\./, /^eslint\.config\./, /^vercel\.json$/,
  /^index\.html$/, /^public\//, /^\.github\//, /^scripts\//, /^src\/(App|main)\.jsx$/, /^e2e\/(fixtures|timezone)\.js$/,
];
const isGlobal = (f) => GLOBAL.some((re) => re.test(f));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Grafo de imports de src/: arquivo -> arquivos que ele importa (só relativos). */
export function importGraph(root = ROOT) {
  const files = walk(join(root, 'src')).map((p) => posix(relative(root, p))).filter((f) => /\.jsx?$/.test(f));
  const known = new Set(files);
  const graph = new Map();
  for (const f of files) {
    const text = readFileSync(join(root, f), 'utf8');
    const deps = new Set();
    for (const m of text.matchAll(/(?:from\s+|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)) {
      const target = posix(join(dirname(f), m[1]));
      if (known.has(target)) deps.add(target);
    }
    graph.set(f, deps);
  }
  return graph;
}

/** f e todos os arquivos que o importam, direta ou indiretamente. */
function closure(graph, f) {
  const importers = new Map();
  for (const [from, deps] of graph) for (const d of deps) importers.set(d, [...(importers.get(d) || []), from]);
  const seen = new Set([f]);
  for (const cur of seen) for (const up of importers.get(cur) || []) seen.add(up);
  return seen;
}

const list = (set) => [...set].sort();

export function select(changed, { root = ROOT, graph = importGraph(root), map = JSON.parse(readFileSync(join(root, 'scripts', 'e2e-map.json'), 'utf8')) } = {}) {
  const code = changed.filter((f) => !isDoc(f));
  const unit = new Set();
  const e2e = new Set();
  let unitAll = false;
  let e2eAll = false;
  const allSpecs = readdirSync(join(root, 'e2e')).filter((f) => f.endsWith('.spec.js'));
  const spec = (name) => `e2e/${name}.spec.js`;
  const fromApp = new Set([...(graph.get('src/App.jsx') || []), ...(graph.get('src/main.jsx') || [])]);

  for (const f of code) {
    if (isGlobal(f)) { unitAll = e2eAll = true; continue; }
    if (/^e2e\/[^/]+\.spec\.js$/.test(f)) { e2e.add(f); continue; }
    if (f.startsWith('e2e/')) { e2eAll = true; continue; }
    if (/^src\/.*\.css$/.test(f)) { unit.add('src/lib/design-tokens.test.js'); e2eAll = true; continue; }
    if (!f.startsWith('src/') || !graph.has(f)) { unitAll = e2eAll = true; continue; } // desconhecido ou apagado

    const up = closure(graph, f);
    for (const g of up) if (g.endsWith('.test.js')) unit.add(g);
    if (f === 'src/lib/storage.js') { e2eAll = true; continue; } // schema e backup: toda tela lê

    // e2e: especs das telas mapeadas que dependem do arquivo.
    let mapped = false;
    for (const g of up) {
      if (g.endsWith('.test.js') || g === 'src/App.jsx' || g === 'src/main.jsx') continue;
      const entry = map[g];
      if (entry === 'ALL') { e2eAll = true; mapped = true; continue; }
      if (entry) { mapped = true; entry.forEach((n) => e2e.add(spec(n))); continue; }
      // Arquivo sem entrada que o App importa direto (hook ou lib de uso global): afeta todas as telas.
      if (fromApp.has(g)) e2eAll = true;
    }
    if (!mapped) e2eAll = true;
  }

  const missing = [...e2e].filter((s) => !allSpecs.includes(s.slice(4)));
  if (missing.length) e2eAll = true; // mapa aponta para spec que não existe: não confie
  return {
    checks: code.length > 0,
    unit: code.length === 0 ? [] : unitAll ? 'ALL' : list(unit),
    e2e: code.length === 0 ? [] : e2eAll ? 'ALL' : list(e2e),
  };
}

const show = (v) => (v === 'ALL' ? 'ALL' : v.length ? v.join(' ') : 'NONE');

function changedFiles(base, head) {
  const out = execFileSync('git', ['diff', '--name-only', base, head], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function main(argv) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  let result;
  let changed = [];
  try {
    if (argv.includes('--all')) result = { checks: true, unit: 'ALL', e2e: 'ALL' };
    else {
      changed = arg('--files') !== undefined ? arg('--files').split(',').filter(Boolean) : changedFiles(arg('--base'), arg('--head') || 'HEAD');
      result = select(changed);
    }
  } catch (e) {
    console.log(`Erro ao calcular a seleção (${e.message}); rodando a suíte completa.`);
    result = { checks: true, unit: 'ALL', e2e: 'ALL' };
  }
  const lines = { checks: String(result.checks), unit: show(result.unit), e2e: show(result.e2e) };
  console.log(`Arquivos mudados (${changed.length}):\n${changed.map((f) => `  ${f}`).join('\n') || '  (todos)'}`);
  console.log(`Lint e build: ${lines.checks}\nTestes unitários: ${lines.unit}\nTestes e2e: ${lines.e2e}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(lines).map(([k, v]) => `${k}=${v}\n`).join(''));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main(process.argv.slice(2));
