import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, ehFeed, MAX_ITENS } from './feed.js';

const rss = (itens) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Canal</title><link>https://exemplo.com/</link>${itens}</channel></rss>`;
const item = (titulo, link, data) =>
  `<item><title>${titulo}</title>${link === null ? '' : `<link>${link}</link>`}<pubDate>${data}</pubDate></item>`;

test('RSS 2.0: título, data em ISO e link', () => {
  const xml = rss(item('Primeira novidade', 'https://exemplo.com/a', 'Fri, 16 Oct 2026 18:13:02 +0000'));
  assert.deepEqual(parseFeed(xml), [
    { titulo: 'Primeira novidade', data: '2026-10-16T18:13:02.000Z', url: 'https://exemplo.com/a' },
  ]);
});

test('Atom: usa o link alternate e a data de publicação', () => {
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Changelog</title>
    <entry><title type="html">Nova opção</title><link rel="alternate" href="https://exemplo.com/changelog/1"/><link rel="edit" href="https://exemplo.com/edit/1"/>
    <published>2026-10-10T09:00:00Z</published><updated>2026-10-12T09:00:00Z</updated><content type="html">&lt;p&gt;texto&lt;/p&gt;</content></entry></feed>`;
  assert.deepEqual(parseFeed(xml), [{ titulo: 'Nova opção', data: '2026-10-10T09:00:00.000Z', url: 'https://exemplo.com/changelog/1' }]);
});

test('Atom sem published usa updated; link sem rel vale como alternate', () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>X</title><link href="https://exemplo.com/x"/><updated>2026-01-02T03:04:05Z</updated></entry></feed>`;
  assert.deepEqual(parseFeed(xml), [{ titulo: 'X', data: '2026-01-02T03:04:05.000Z', url: 'https://exemplo.com/x' }]);
});

test('ignora item sem link, sem título e com link que não é http(s)', () => {
  const xml = rss(
    item('Sem link', null, 'Fri, 16 Oct 2026 10:00:00 +0000') +
      item('', 'https://exemplo.com/b', 'Fri, 16 Oct 2026 10:00:00 +0000') +
      item('Link estranho', 'javascript:alert(1)', 'Fri, 16 Oct 2026 10:00:00 +0000') +
      item('Bom', 'https://exemplo.com/ok', 'Fri, 16 Oct 2026 10:00:00 +0000'),
  );
  assert.deepEqual(parseFeed(xml).map((i) => i.titulo), ['Bom']);
});

test('ignora item com data inválida ou ausente', () => {
  const xml = rss(
    item('Data ruim', 'https://exemplo.com/1', 'ontem à tarde') +
      '<item><title>Sem data</title><link>https://exemplo.com/2</link></item>' +
      item('Data boa', 'https://exemplo.com/3', 'Thu, 15 Oct 2026 08:00:00 +0000'),
  );
  assert.deepEqual(parseFeed(xml).map((i) => i.titulo), ['Data boa']);
});

test('ordena do mais novo para o mais antigo e limita a 10 itens', () => {
  const itens = Array.from({ length: 14 }, (_, n) =>
    item(`Novidade ${n + 1}`, `https://exemplo.com/${n + 1}`, new Date(Date.UTC(2026, 9, n + 1)).toUTCString()),
  ).join('');
  const lista = parseFeed(rss(itens));
  assert.equal(MAX_ITENS, 10);
  assert.equal(lista.length, 10);
  assert.equal(lista[0].titulo, 'Novidade 14');
  assert.equal(lista[9].titulo, 'Novidade 5');
  for (let i = 1; i < lista.length; i++) assert.ok(lista[i - 1].data > lista[i].data);
});

test('CDATA, entidades e espaços no título', () => {
  const xml = rss(
    '<item><title><![CDATA[Preço & plano <novo>]]></title><link>https://exemplo.com/c</link><pubDate>Fri, 16 Oct 2026 10:00:00 +0000</pubDate></item>' +
      '<item><title>  Tom &amp; Jerry&#8217;s &#x41;\n  show </title><link>https://exemplo.com/d</link><pubDate>Thu, 15 Oct 2026 10:00:00 +0000</pubDate></item>',
  );
  assert.deepEqual(parseFeed(xml).map((i) => i.titulo), ['Preço & plano <novo>', 'Tom & Jerry’s A show']);
});

test('o corpo do artigo não vira título nem link', () => {
  const xml = rss(
    `<item><title>Título certo</title><link>https://exemplo.com/e</link><pubDate>Fri, 16 Oct 2026 10:00:00 +0000</pubDate>
    <content:encoded><![CDATA[<h1>Outro título</h1><a href="https://errado.com">link</a><title>falso</title>]]></content:encoded>
    <description><![CDATA[<link>https://errado.com/x</link>]]></description></item>`,
  );
  assert.deepEqual(parseFeed(xml), [{ titulo: 'Título certo', data: '2026-10-16T10:00:00.000Z', url: 'https://exemplo.com/e' }]);
});

test('dc:date serve de data quando não há pubDate', () => {
  const xml = rss('<item><title>Y</title><link>https://exemplo.com/y</link><dc:date>2026-10-01T12:00:00Z</dc:date></item>');
  assert.equal(parseFeed(xml)[0].data, '2026-10-01T12:00:00.000Z');
});

test('texto que não é feed devolve lista vazia; ehFeed distingue feed de HTML', () => {
  assert.deepEqual(parseFeed('<!DOCTYPE html><html><body><item><title>x</title></item></body></html>'), []);
  assert.deepEqual(parseFeed(''), []);
  assert.deepEqual(parseFeed(undefined), []);
  assert.equal(ehFeed(rss('')), true);
  assert.equal(ehFeed('<feed xmlns="http://www.w3.org/2005/Atom"></feed>'), true);
  assert.equal(ehFeed('<html></html>'), false);
});

test('feed válido sem itens devolve lista vazia', () => {
  assert.deepEqual(parseFeed(rss('')), []);
  assert.equal(ehFeed(rss('')), true);
});
