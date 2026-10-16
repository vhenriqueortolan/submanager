import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackUrl, platformOf } from './feedback.js';

const form = {
  url: 'https://docs.google.com/forms/d/e/ABC/viewform',
  fields: { version: 'entry.111', platform: 'entry.222', comment: 'entry.333' },
};

test('sem URL, não gera link', () => {
  assert.equal(buildFeedbackUrl({ url: '', fields: form.fields }, { version: '2.3.0', platform: 'iPhone' }), '');
});

test('codifica versão e plataforma (espaços e acentos)', () => {
  const url = new URL(buildFeedbackUrl(form, { version: '2.3.0 beta', platform: 'Computação' }));
  assert.equal(url.origin + url.pathname, form.url);
  assert.equal(url.searchParams.get('usp'), 'pp_url');
  assert.equal(url.searchParams.get('entry.111'), '2.3.0 beta');
  assert.equal(url.searchParams.get('entry.222'), 'Computação');
  assert.equal(url.searchParams.has('entry.333'), false);
});

test('campo sem código entry não vai na URL', () => {
  const url = new URL(buildFeedbackUrl({ ...form, fields: { ...form.fields, platform: '' } }, { version: '1', platform: 'Android' }));
  assert.equal(url.searchParams.get('entry.111'), '1');
  assert.equal([...url.searchParams.keys()].includes(''), false);
});

test('platformOf identifica o aparelho', () => {
  assert.equal(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit'), 'iPhone');
  assert.equal(platformOf('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit'), 'iPad');
  assert.equal(platformOf('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit Chrome/120 Mobile'), 'Android');
  assert.equal(platformOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'), 'Computador');
  assert.equal(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari'), 'Computador');
  assert.equal(platformOf(''), 'Outro');
  assert.equal(platformOf(undefined), 'Outro');
});
