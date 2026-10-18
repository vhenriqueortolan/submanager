import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { select } from '../../scripts/affected-tests.js';

const root = join(import.meta.dirname, '..', '..');

test('só docs/ ou .md: nada roda, nem lint e build', () => {
  assert.deepEqual(select(['docs/ponte/mapa.md', 'README.md']), { checks: false, unit: [], e2e: [] });
});

test('módulo folha: só o teste que o importa; e2e das telas que o usam', () => {
  const r = select(['src/lib/vcard.js']);
  assert.deepEqual(r.unit, ['src/lib/vcard.test.js']);
  assert.ok(r.e2e.includes('e2e/contatos.spec.js'));
  assert.ok(!r.e2e.includes('e2e/discover.spec.js'));
});

test('módulo importado por vários: seleciona os testes que o importam, direta ou indiretamente', () => {
  const r = select(['src/lib/dates.js']);
  assert.ok(r.unit.includes('src/lib/dates.test.js') && r.unit.includes('src/lib/storage.test.js'));
  assert.ok(!r.unit.includes('src/lib/phone.test.js'));
});

test('tela isolada: só as specs dela', () => {
  const r = select(['src/components/Discover.jsx']);
  assert.deepEqual(r.unit, []);
  assert.ok(r.e2e.includes('e2e/discover.spec.js'));
  assert.ok(!r.e2e.includes('e2e/divisao.spec.js'));
});

test('spec alterada: só ela, sem unitários', () => {
  assert.deepEqual(select(['e2e/pinca.spec.js']), { checks: true, unit: [], e2e: ['e2e/pinca.spec.js'] });
});

test('css em src/ roda o teste dos tokens e todo o e2e', () => {
  const r = select(['src/design/components.css']);
  assert.deepEqual(r.unit, ['src/lib/design-tokens.test.js']);
  assert.equal(r.e2e, 'ALL');
});

test('na dúvida roda tudo: arquivo desconhecido, configuração, CI, storage, hook global', () => {
  for (const f of ['qualquer.bin', 'package.json', '.github/workflows/ci.yml', 'scripts/affected-tests.js', 'e2e/fixtures.js']) {
    assert.equal(select([f]).e2e, 'ALL', f);
  }
  assert.equal(select(['src/lib/storage.js']).e2e, 'ALL');
  assert.equal(select(['src/hooks/useToday.js']).e2e, 'ALL');
  assert.equal(select(['src/App.jsx']).unit, 'ALL');
});

test('o mapa e2e não esconde spec: toda spec está em alguma tela e todo caminho existe', () => {
  const map = JSON.parse(readFileSync(join(root, 'scripts', 'e2e-map.json'), 'utf8'));
  // Específicas de infraestrutura (gestos globais, falha de gravação): só rodam quando a seleção vira ALL.
  const mapped = new Set(Object.values(map).filter(Array.isArray).flat());
  const specs = readdirSync(join(root, 'e2e')).filter((f) => f.endsWith('.spec.js')).map((f) => f.replace('.spec.js', ''));
  assert.deepEqual(specs.filter((s) => !mapped.has(s)), [], 'spec fora do mapa: acrescente em scripts/e2e-map.json');
  assert.deepEqual([...mapped].filter((s) => !specs.includes(s)), [], 'o mapa cita spec que não existe');
  for (const f of Object.keys(map).filter((k) => k.startsWith('src/'))) readFileSync(join(root, f), 'utf8');
});
