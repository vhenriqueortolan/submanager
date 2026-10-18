import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarNovidades, USER_AGENT } from './feed-build.js';

const AGORA = new Date('2026-10-18T09:00:00Z');
const RSS = `<rss version="2.0"><channel><title>C</title>
  <item><title>Velha</title><link>https://exemplo.com/1</link><pubDate>Mon, 05 Oct 2026 10:00:00 +0000</pubDate></item>
  <item><title>Nova</title><link>https://exemplo.com/2</link><pubDate>Fri, 16 Oct 2026 10:00:00 +0000</pubDate></item>
</channel></rss>`;
const resposta = (corpo, ok = true) => ({ ok, text: async () => corpo });
const fontes = [
  { dominio: 'a.com', tipo: 'oficial', feed: 'https://a.com/feed' },
  { dominio: 'b.com', tipo: 'terceiro', feed: 'https://terceiro.exemplo.net/b.xml' },
  { dominio: 'c.com', tipo: 'nenhum', feed: null },
];

test('serviço com feed vira ok, com itens do mais novo ao mais antigo; sem feed vira sem-feed', async () => {
  const chamadas = [];
  const fetchFn = async (url, opts) => { chamadas.push([url, opts]); return resposta(RSS); };
  const r = await gerarNovidades(fontes, { fetchFn, agora: AGORA });
  assert.equal(r.geradoEm, '2026-10-18T09:00:00.000Z');
  assert.deepEqual(Object.keys(r.servicos), ['a.com', 'b.com', 'c.com']);
  assert.equal(r.servicos['a.com'].status, 'ok');
  assert.deepEqual(r.servicos['a.com'].itens.map((i) => i.titulo), ['Nova', 'Velha']);
  assert.equal(r.servicos['b.com'].tipo, 'terceiro');
  assert.equal(r.servicos['b.com'].fonte, 'terceiro.exemplo.net');
  assert.deepEqual(r.servicos['c.com'], { tipo: 'nenhum', status: 'sem-feed', itens: [] });
  assert.equal(chamadas.length, 2, 'serviço sem feed não faz requisição');
  assert.equal(chamadas[0][1].headers['User-Agent'], USER_AGENT);
  assert.match(USER_AGENT, /^SubManagerBot\/1\.0 /);
});

test('falha de rede, HTTP de erro, XML inválido e timeout viram erro sem lançar', async () => {
  const casos = {
    rede: async () => { throw new TypeError('fetch failed'); },
    http: async () => resposta('não achou', false),
    html: async () => resposta('<!DOCTYPE html><html><body>Página</body></html>'),
    timeout: (url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('abortado')))),
  };
  for (const [nome, fetchFn] of Object.entries(casos)) {
    const r = await gerarNovidades([{ dominio: 'x.com', tipo: 'oficial', feed: 'https://x.com/inexistente' }], { fetchFn, agora: AGORA, timeoutMs: 20 });
    assert.equal(r.servicos['x.com'].status, 'erro', nome);
    assert.deepEqual(r.servicos['x.com'].itens, [], nome);
  }
});

test('uma fonte com erro não afeta as outras', async () => {
  const fetchFn = async (url) => (url.includes('a.com') ? resposta(RSS) : Promise.reject(new Error('fora do ar')));
  const r = await gerarNovidades(fontes, { fetchFn, agora: AGORA });
  assert.equal(r.servicos['a.com'].status, 'ok');
  assert.equal(r.servicos['b.com'].status, 'erro');
});

test('falha passageira: a segunda tentativa recupera; duas falhas viram erro', async () => {
  let n = 0;
  const unicaFalha = async () => { n++; if (n === 1) throw new Error('reset'); return resposta(RSS); };
  const r1 = await gerarNovidades([fontes[0]], { fetchFn: unicaFalha, agora: AGORA });
  assert.equal(r1.servicos['a.com'].status, 'ok');
  assert.equal(n, 2);
  n = 0;
  const sempre = async () => { n++; throw new Error('fora'); };
  const r2 = await gerarNovidades([fontes[0]], { fetchFn: sempre, agora: AGORA });
  assert.equal(r2.servicos['a.com'].status, 'erro');
  assert.equal(n, 2);
});

test('feed válido sem itens fica ok com lista vazia', async () => {
  const r = await gerarNovidades([fontes[0]], { fetchFn: async () => resposta('<rss version="2.0"><channel></channel></rss>'), agora: AGORA });
  assert.deepEqual(r.servicos['a.com'].itens, []);
  assert.equal(r.servicos['a.com'].status, 'ok');
});

test('--offline não chama a rede', async () => {
  let chamou = false;
  const r = await gerarNovidades(fontes, { fetchFn: async () => { chamou = true; return resposta(RSS); }, offline: true, agora: AGORA });
  assert.equal(chamou, false);
  assert.equal(r.servicos['a.com'].status, 'erro');
  assert.equal(r.servicos['c.com'].status, 'sem-feed');
});
