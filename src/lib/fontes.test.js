import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOG } from './catalog.js';

const fontes = JSON.parse(readFileSync(new URL('../../scripts/feeds/fontes.json', import.meta.url), 'utf8'));
const CAMPOS = ['dominio', 'nome', 'categoria', 'tipo', 'feed', 'paginaNovidades', 'verificadoEm'];
const ehUrl = (u) => { try { return new URL(u).protocol === 'https:'; } catch { return false; } };

test('registro tem as cinco fontes previstas', () => {
  assert.deepEqual(fontes.map((f) => f.dominio).sort(), ['anthropic.com', 'netflix.com', 'openai.com', 'spotify.com', 'xbox.com']);
  assert.equal(new Set(fontes.map((f) => f.dominio)).size, fontes.length);
});

test('cada fonte tem exatamente os campos e valores permitidos', () => {
  for (const f of fontes) {
    assert.deepEqual(Object.keys(f).sort(), [...CAMPOS].sort(), f.dominio);
    assert.ok(['oficial', 'terceiro', 'nenhum'].includes(f.tipo), `${f.dominio}: tipo`);
    assert.ok(f.feed === null || ehUrl(f.feed), `${f.dominio}: feed`);
    assert.ok(f.paginaNovidades === null || ehUrl(f.paginaNovidades), `${f.dominio}: paginaNovidades`);
    assert.match(f.verificadoEm, /^\d{4}-\d{2}-\d{2}$/, `${f.dominio}: verificadoEm`);
    assert.ok(!Number.isNaN(new Date(f.verificadoEm).getTime()), `${f.dominio}: data válida`);
    assert.ok(f.nome && f.categoria && f.dominio, `${f.dominio}: textos`);
  }
});

test('tipo "nenhum" não tem feed; os outros têm', () => {
  for (const f of fontes) assert.equal(f.tipo === 'nenhum', f.feed === null, f.dominio);
});

test('domínio, nome e categoria batem com o catálogo do app', () => {
  for (const f of fontes) {
    const c = CATALOG.find((s) => s.domain === f.dominio);
    assert.ok(c, `${f.dominio} está no catálogo`);
    assert.equal(c.name, f.nome);
    assert.equal(c.category, f.categoria);
  }
});
