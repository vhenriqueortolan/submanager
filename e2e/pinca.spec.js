import { test, expect, seed, withSubs, sampleSubs } from './fixtures.js';

test('eventos de gesto (pinça no iOS) chegam com defaultPrevented', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const results = await page.evaluate(() =>
    ['gesturestart', 'gesturechange', 'gestureend'].map((type) => {
      const e = new Event(type, { cancelable: true, bubbles: true });
      document.body.dispatchEvent(e);
      return e.defaultPrevented;
    }));
  expect(results).toEqual([true, true, true]);
});

test('touch-action só permite rolar (sem pinça nem toque duplo)', async ({ page }) => {
  await seed(page, withSubs(sampleSubs()));
  const values = await page.evaluate(() => [document.documentElement, document.body].map((el) => getComputedStyle(el).touchAction));
  expect(values).toEqual(['pan-x pan-y', 'pan-x pan-y']);
});
