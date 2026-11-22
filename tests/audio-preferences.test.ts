import { expect, it } from 'vitest';
import { parsePreferences } from '../apps/game-client/src/preferences.js';
it('migrates the old single volume once, preserves mute and keeps channels independent', () => {
  expect(parsePreferences(null)).toMatchObject({ volume: 52, musicVolume: 45 });
  expect(parsePreferences({ volume: 40 })).toMatchObject({
    volume: 46,
    musicVolume: 40,
  });
  expect(parsePreferences({ volume: 0 })).toMatchObject({
    volume: 0,
    musicVolume: 0,
  });
  expect(parsePreferences({ volume: 46, musicVolume: 40 })).toMatchObject({
    volume: 46,
    musicVolume: 40,
  });
  expect(parsePreferences({ volume: 0, musicVolume: 100 })).toMatchObject({
    volume: 0,
    musicVolume: 100,
  });
  expect(parsePreferences({ volume: 200, musicVolume: 25 })).toMatchObject({
    volume: 52,
    musicVolume: 25,
  });
});
