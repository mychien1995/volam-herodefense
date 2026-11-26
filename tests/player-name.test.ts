import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test('remembers normalized Vietnamese names, rejects invalid replacements and reloads', async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  let names = await import('../apps/game-client/src/player-name.js');
  expect(names.readPlayerName()).toBe('');
  names.rememberPlayerName('  Võ Lâm  ');
  names.rememberPlayerName('<invalid>');
  names.rememberPlayerName('');
  vi.resetModules();
  names = await import('../apps/game-client/src/player-name.js');
  expect(names.readPlayerName()).toBe('Võ Lâm');
});

test('blocked storage retains the latest name for switching modes in this session', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('quota');
    },
  });
  const names = await import('../apps/game-client/src/player-name.js');
  names.rememberPlayerName('Thiếu Lâm');
  expect(names.readPlayerName()).toBe('Thiếu Lâm');
});
