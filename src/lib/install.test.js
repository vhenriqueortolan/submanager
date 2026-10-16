import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installState } from './install.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit Chrome/120 Mobile';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120';

test('já instalado (standalone) vence qualquer outro estado', () => {
  assert.equal(installState({ userAgent: IPHONE, standalone: true, hasPrompt: false }), 'installed');
  assert.equal(installState({ userAgent: ANDROID, standalone: true, hasPrompt: true }), 'installed');
});

test('iPhone no navegador mostra instruções', () => {
  assert.equal(installState({ userAgent: IPHONE, standalone: false, hasPrompt: false }), 'ios');
});

test('Android com evento de instalação oferece o botão', () => {
  assert.equal(installState({ userAgent: ANDROID, standalone: false, hasPrompt: true }), 'prompt');
});

test('sem evento e fora do iOS, indisponível', () => {
  assert.equal(installState({ userAgent: ANDROID, standalone: false, hasPrompt: false }), 'unavailable');
  assert.equal(installState({ userAgent: DESKTOP, standalone: false, hasPrompt: false }), 'unavailable');
});

test('desktop com evento de instalação também oferece o botão', () => {
  assert.equal(installState({ userAgent: DESKTOP, standalone: false, hasPrompt: true }), 'prompt');
});
