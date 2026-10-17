import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GESTURE_EVENTS, blockGestures } from './gestures.js';

const fire = (target, type) => {
  const e = new Event(type, { cancelable: true });
  target.dispatchEvent(e);
  return e;
};

test('bloqueia os três eventos de gesto do iOS', () => {
  const target = new EventTarget();
  blockGestures(target);
  assert.deepEqual(GESTURE_EVENTS, ['gesturestart', 'gesturechange', 'gestureend']);
  for (const type of GESTURE_EVENTS) assert.equal(fire(target, type).defaultPrevented, true);
});

test('não mexe em outros eventos', () => {
  const target = new EventTarget();
  blockGestures(target);
  assert.equal(fire(target, 'touchstart').defaultPrevented, false);
});

test('o cleanup devolve o comportamento normal', () => {
  const target = new EventTarget();
  blockGestures(target)();
  assert.equal(fire(target, 'gesturestart').defaultPrevented, false);
});

test('registra com passive: false', () => {
  const calls = [];
  const target = { addEventListener: (type, fn, opts) => calls.push([type, opts]), removeEventListener() {} };
  blockGestures(target);
  assert.equal(calls.length, 3);
  for (const [, opts] of calls) assert.deepEqual(opts, { passive: false });
});
