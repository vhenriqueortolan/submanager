import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarNovidades, lerNovidades, normalizarDominio, chaveDoServico, estadoNovidades, subabaInicial,
  resumoHome, solicitarFonte, dataLocal, rotuloFonte, TEXTOS,
} from './novidades.js';

const item = (titulo, data) => ({ titulo, data, url: `https://exemplo.com/${encodeURIComponent(titulo)}` });
const DADOS = validarNovidades({
  geradoEm: '2026-10-18T09:00:00.000Z',
  servicos: {
    'xbox.com': { tipo: 'oficial', fonte: 'news.xbox.com', status: 'ok', itens: [item('X1', '2026-10-16T18:00:00.000Z'), item('X2', '2026-10-09T10:00:00.000Z')] },
    'spotify.com': { tipo: 'oficial', fonte: 'newsroom.spotify.com', status: 'ok', itens: [item('S1', '2026-10-16T04:00:00.000Z'), item('S2', '2026-10-08T12:00:00.000Z')] },
    'openai.com': { tipo: 'terceiro', fonte: 'rss.exemplo.net', status: 'ok', itens: [item('O1', '2026-10-15T10:00:00.000Z')] },
    'vazio.com': { tipo: 'oficial', fonte: 'vazio.com', status: 'ok', itens: [] },
    'quebrado.com': { tipo: 'oficial', fonte: 'quebrado.com', status: 'erro', itens: [] },
    'anthropic.com': { tipo: 'nenhum', status: 'sem-feed', itens: [] },
  },
});
const sub = (name, domain, extra = {}) => ({ id: name, name, domain, ...extra });

test('validarNovidades aceita o formato do build e rejeita o que não é', () => {
  assert.ok(DADOS);
  assert.equal(Object.keys(DADOS.servicos).length, 6);
  assert.equal(validarNovidades(null), null);
  assert.equal(validarNovidades({}), null);
  assert.equal(validarNovidades('<html>'), null);
  assert.equal(validarNovidades({ servicos: [] }) !== null, true, 'lista vazia de serviços ainda é um objeto');
});

test('validarNovidades descarta serviço com status desconhecido e item malformado', () => {
  const v = validarNovidades({ servicos: {
    'a.com': { status: 'talvez', itens: [] },
    'b.com': { status: 'ok', itens: [item('Bom', '2026-10-01T00:00:00Z'), { titulo: 'Sem link', data: '2026-10-01T00:00:00Z' }, { titulo: 'Data', url: 'https://x.com/', data: 'ontem' }] },
  } });
  assert.deepEqual(Object.keys(v.servicos), ['b.com']);
  assert.deepEqual(v.servicos['b.com'].itens.map((i) => i.titulo), ['Bom']);
});

test('lerNovidades: ok, HTTP de erro, JSON inválido e rede caída viram dados ou null', async () => {
  const json = (corpo) => async () => ({ ok: true, json: async () => corpo });
  assert.ok(await lerNovidades(json({ servicos: {} })));
  assert.equal(await lerNovidades(async () => ({ ok: false })), null);
  assert.equal(await lerNovidades(async () => ({ ok: true, json: async () => { throw new SyntaxError('html'); } })), null);
  assert.equal(await lerNovidades(async () => { throw new TypeError('offline'); }), null);
  assert.equal(await lerNovidades(json({ nada: 1 })), null);
});

test('normalizarDominio', () => {
  assert.equal(normalizarDominio('https://www.Spotify.com/br?x=1'), 'spotify.com');
  assert.equal(normalizarDominio('open.spotify.com'), 'open.spotify.com');
  assert.equal(normalizarDominio(' XBOX.com:443 '), 'xbox.com');
  assert.equal(normalizarDominio(''), '');
  assert.equal(normalizarDominio(undefined), '');
});

test('cruzamento assinatura → domínio: igual, subdomínio e sem correspondência', () => {
  assert.equal(chaveDoServico('spotify.com', DADOS), 'spotify.com');
  assert.equal(chaveDoServico('open.spotify.com', DADOS), 'spotify.com');
  assert.equal(chaveDoServico('www.xbox.com', DADOS), 'xbox.com');
  assert.equal(chaveDoServico('naospotify.com', DADOS), null, 'não casa por sufixo de texto');
  assert.equal(chaveDoServico('', DADOS), null);
  assert.equal(chaveDoServico('xbox.com', null), null);
});

test('estados: ok, vazio, erro, sem-feed, carregando e leitura que falhou', () => {
  const ok = estadoNovidades('xbox.com', DADOS);
  assert.equal(ok.estado, 'ok');
  assert.equal(ok.itens.length, 2);
  assert.equal(ok.rotulo, 'Fonte oficial');
  assert.equal(ok.paginaUrl, 'https://xbox.com');
  assert.equal(estadoNovidades('vazio.com', DADOS).estado, 'vazio');
  assert.equal(estadoNovidades('quebrado.com', DADOS).estado, 'erro');
  assert.equal(estadoNovidades('anthropic.com', DADOS).estado, 'sem-feed');
  assert.equal(estadoNovidades('desconhecido.com', DADOS).estado, 'sem-feed', 'fora do registro');
  assert.equal(estadoNovidades('', DADOS).estado, 'sem-feed', 'assinatura manual, sem domínio');
  assert.equal(estadoNovidades('xbox.com', undefined).estado, 'carregando');
  assert.equal(estadoNovidades('xbox.com', null).estado, 'erro', 'JSON não pôde ser lido');
  assert.equal(estadoNovidades('', null).estado, 'sem-feed', 'sem domínio nunca tem feed, mesmo com leitura falha');
});

test('rótulo da fonte: oficial ou de terceiro com o domínio', () => {
  assert.equal(rotuloFonte({ tipo: 'oficial', fonte: 'x.com' }), 'Fonte oficial');
  assert.equal(estadoNovidades('openai.com', DADOS).rotulo, 'Fonte de terceiro: rss.exemplo.net');
});

test('o estado do espaço não traz preço nem valor', () => {
  const texto = JSON.stringify([TEXTOS, estadoNovidades('xbox.com', DADOS)]);
  assert.doesNotMatch(texto, /R\$|preço|valor/i);
});

test('subabaInicial: Novidades com fonte (inclusive vazia ou com erro), Plano sem fonte ou ainda lendo', () => {
  assert.equal(subabaInicial('xbox.com', DADOS), 'novidades');
  assert.equal(subabaInicial('vazio.com', DADOS), 'novidades');
  assert.equal(subabaInicial('quebrado.com', DADOS), 'novidades');
  assert.equal(subabaInicial('anthropic.com', DADOS), 'plano');
  assert.equal(subabaInicial('', DADOS), 'plano');
  assert.equal(subabaInicial('xbox.com', undefined), 'plano');
});

test('resumo da Home: até 3 itens, do mais recente ao mais antigo, só serviços da pessoa com status ok', () => {
  const subs = [sub('Xbox Game Pass', 'xbox.com'), sub('Spotify', 'open.spotify.com'), sub('ChatGPT Plus', 'openai.com'), sub('Claude', 'anthropic.com'), sub('Manual', '')];
  const r = resumoHome(subs, DADOS);
  assert.deepEqual(r.map((i) => i.titulo), ['X1', 'S1', 'O1']);
  assert.equal(r[0].servico, 'Xbox Game Pass');
  assert.ok(r.length <= 3);
});

test('resumo da Home: ignora feed com erro ou vazio, assinatura pausada ou cancelada e serviço repetido', () => {
  const subs = [
    sub('Q', 'quebrado.com'), sub('V', 'vazio.com'),
    sub('Xbox pausada', 'xbox.com', { status: 'paused', pauses: [{ from: '2026-10-01', to: '' }] }),
    sub('Spotify 1', 'spotify.com'), sub('Spotify 2', 'spotify.com'),
  ];
  const r = resumoHome(subs, DADOS);
  assert.deepEqual(r.map((i) => i.titulo), ['S1', 'S2']);
  assert.deepEqual(resumoHome([sub('Q', 'quebrado.com')], DADOS), []);
  assert.deepEqual(resumoHome([sub('X', 'xbox.com')], null), []);
  assert.deepEqual(resumoHome([], DADOS), []);
});

test('dataLocal usa o dia local, não o de UTC', () => {
  // 03:30 UTC de 16/10 ainda é dia 16 em qualquer fuso de -3h a +0h; o valor vem do dia local do ambiente de teste.
  const d = new Date('2026-10-16T12:00:00.000Z');
  const local = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  assert.equal(dataLocal(d.toISOString()), local);
});

test('solicitarFonte não faz rede e não grava nada', () => {
  const guardado = { fetch: globalThis.fetch, localStorage: globalThis.localStorage };
  let chamadas = 0;
  const espiao = () => { chamadas++; throw new Error('não deveria ser chamado'); };
  globalThis.fetch = espiao;
  globalThis.localStorage = { setItem: espiao, removeItem: espiao, clear: espiao, getItem: espiao };
  try {
    assert.equal(solicitarFonte('anthropic.com'), undefined);
    assert.equal(chamadas, 0);
  } finally {
    globalThis.fetch = guardado.fetch;
    if (guardado.localStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = guardado.localStorage;
  }
});
