import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VISTAS_KEY, lerVistas, comBase, comVista, ehNova, naoLidasDoServico, contarNaoLidas } from './novidades-vistas.js';
import { validarNovidades } from './novidades.js';
import { EXTRA_KEYS, STORAGE_KEY, clearAllData } from './storage.js';

const item = (titulo, data) => ({ titulo, data, url: `https://exemplo.com/${titulo}` });
const dados = () => validarNovidades({
  servicos: {
    'xbox.com': { tipo: 'oficial', fonte: 'x', status: 'ok', itens: [item('X1', '2026-10-16T18:00:00.000Z'), item('X2', '2026-10-15T10:00:00.000Z'), item('X3', '2026-10-10T10:00:00.000Z')] },
    'spotify.com': { tipo: 'oficial', fonte: 's', status: 'ok', itens: [item('S1', '2026-10-16T04:00:00.000Z'), item('S2', '2026-10-08T10:00:00.000Z')] },
    'netflix.com': { tipo: 'oficial', fonte: 'n', status: 'ok', itens: [] },
    'openai.com': { tipo: 'oficial', fonte: 'o', status: 'erro', itens: [] },
  },
});
const sub = (name, domain, extra = {}) => ({ id: name, name, domain, ...extra });

test('a chave de novidades vistas é apagada junto com os dados do app', () => {
  assert.deepEqual(EXTRA_KEYS, [VISTAS_KEY]);
  const guardado = new Map([[STORAGE_KEY, '{}'], [VISTAS_KEY, '{}'], ['outra', 'fica']]);
  const storage = { get length() { return guardado.size; }, key: (i) => [...guardado.keys()][i], removeItem: (k) => guardado.delete(k) };
  assert.equal(clearAllData(storage), true);
  assert.deepEqual([...guardado.keys()], ['outra']);
});

test('lerVistas aceita só objeto de datas válidas', () => {
  assert.deepEqual(lerVistas('{"xbox.com":"2026-10-16T18:00:00.000Z"}'), { 'xbox.com': '2026-10-16T18:00:00.000Z' });
  assert.deepEqual(lerVistas('{"a":"ontem","b":3,"c":"2026-01-01T00:00:00Z"}'), { c: '2026-01-01T00:00:00Z' });
  for (const ruim of [null, '', '{quebrado', '[]', '"texto"', '7']) assert.deepEqual(lerVistas(ruim), {});
});

test('primeira vez: a base é a novidade mais recente e nada conta como novo', () => {
  const d = dados();
  const vistas = comBase({}, d);
  assert.deepEqual(vistas, { 'xbox.com': '2026-10-16T18:00:00.000Z', 'spotify.com': '2026-10-16T04:00:00.000Z' });
  assert.equal(comBase(vistas, d), vistas, 'sem mudança devolve o mesmo objeto');
  assert.equal(contarNaoLidas([sub('X', 'xbox.com'), sub('S', 'spotify.com')], d, vistas), 0);
});

test('chegam itens mais novos depois da base: contam como não lidos', () => {
  const vistas = { 'xbox.com': '2026-10-14T00:00:00.000Z', 'spotify.com': '2026-10-16T04:00:00.000Z' };
  const d = dados();
  assert.equal(naoLidasDoServico('xbox.com', d, vistas), 2); // X1 e X2
  assert.equal(naoLidasDoServico('open.spotify.com', d, vistas), 0);
  assert.equal(contarNaoLidas([sub('X', 'xbox.com'), sub('S', 'spotify.com')], d, vistas), 2);
  assert.equal(ehNova(item('X1', '2026-10-16T18:00:00.000Z'), vistas['xbox.com']), true);
  assert.equal(ehNova(item('X3', '2026-10-10T10:00:00.000Z'), vistas['xbox.com']), false);
  assert.equal(ehNova(item('X1', '2026-10-16T18:00:00.000Z'), undefined), false, 'sem registro, nunca é novo');
});

test('marcar como visto só avança e reduz a contagem', () => {
  const d = dados();
  let vistas = { 'xbox.com': '2026-10-01T00:00:00.000Z' };
  assert.equal(naoLidasDoServico('xbox.com', d, vistas), 3);
  vistas = comVista(vistas, 'xbox.com', '2026-10-15T10:00:00.000Z');
  assert.equal(naoLidasDoServico('xbox.com', d, vistas), 1);
  assert.equal(comVista(vistas, 'xbox.com', '2026-10-05T00:00:00.000Z'), vistas, 'não volta no tempo');
  assert.equal(comVista(vistas, 'xbox.com', 'lixo'), vistas);
  assert.equal(comVista(vistas, '', '2026-10-16T00:00:00.000Z'), vistas);
  vistas = comVista(vistas, 'xbox.com', '2026-10-16T18:00:00.000Z');
  assert.equal(naoLidasDoServico('xbox.com', d, vistas), 0);
});

test('conta só serviços com feed ok, assinaturas ativas e cada serviço uma vez', () => {
  const d = dados();
  const vistas = { 'xbox.com': '2026-10-01T00:00:00.000Z', 'spotify.com': '2026-10-01T00:00:00.000Z', 'netflix.com': '2026-10-01T00:00:00.000Z', 'openai.com': '2026-10-01T00:00:00.000Z' };
  const subs = [
    sub('X', 'xbox.com'), sub('X2', 'xbox.com'),
    sub('S pausada', 'spotify.com', { status: 'paused', pauses: [{ from: '2026-10-01', to: '' }] }),
    sub('N', 'netflix.com'), sub('O', 'openai.com'), sub('Manual', ''),
  ];
  assert.equal(contarNaoLidas(subs, d, vistas), 3);
  assert.equal(contarNaoLidas(subs, null, vistas), 0);
  assert.equal(contarNaoLidas([], d, vistas), 0);
});
