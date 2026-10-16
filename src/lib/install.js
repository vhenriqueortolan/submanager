/** 'installed' | 'ios' | 'prompt' | 'unavailable' */
export function installState({ userAgent, standalone, hasPrompt }) {
  if (standalone) return 'installed';
  if (hasPrompt) return 'prompt';
  if (/iPhone|iPad/i.test(userAgent || '')) return 'ios';
  return 'unavailable';
}
