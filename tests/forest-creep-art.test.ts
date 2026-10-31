import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  forestCreepArt,
  forestArtNotice,
  forestArtStatus,
  forestStrikeEffects,
  forestTypes,
  type ForestCreepManifest,
} from '../apps/game-client/src/forest-creeps.js';
import { CreepPlayback } from '../apps/game-client/src/arena-creeps.js';
const m = JSON.parse(
  readFileSync(
    'apps/game-client/public/assets/forest_creep_review/runtime-manifest.json',
    'utf8',
  ),
) as ForestCreepManifest;
it('labels artwork approval in Vietnamese separately from unmapped placeholders', () => {
  expect(forestArtNotice([''])).toContain('hình tạm');
  const label =
    forestArtStatus('truc_xa') === 'approved'
      ? 'hình ảnh đã duyệt'
      : 'bản thử nghiệm';
  expect(forestArtNotice(['truc_xa'])).toContain(label);
  expect(forestArtNotice(['truc_xa', 'unknown'])).toContain(
    `${label} và hình tạm`,
  );
  expect(forestArtNotice(['truc_xa'])).not.toMatch(
    /Creep|candidate|approved art|placeholder/,
  );
});
it('selects exact server forest types only; preserves unknown/other-zone fallback', () => {
  for (const type of forestTypes) {
    expect(forestCreepArt(m, type, 'forest_shared')?.id).toBe('forest_' + type);
    expect(forestCreepArt(m, type, 'forest_private_player')?.status).toBe(
      forestArtStatus(type),
    );
    for (const zone of [
      'arena',
      'desert_shared',
      'desert_private_player',
      'forest_other',
    ])
      expect(forestCreepArt(m, type, zone)).toBeUndefined();
  }
  for (const type of [undefined, '', 'wave_1', 'forest_truc_xa', 'unknown'])
    expect(forestCreepArt(m, type, 'forest_shared')).toBeUndefined();
});
it('loads exact authored timings and keeps all unsupported phases unbound', () => {
  expect(m.assets).toHaveLength(6);
  expect(m.effects).toHaveLength(28);
  for (const asset of m.assets) {
    expect(asset.animations).toHaveLength(20);
    expect(asset.animations.flatMap((a) => a.frames)).toHaveLength(64);
    for (const a of asset.animations)
      expect(a.durations).toEqual(
        a.frames.map(
          () =>
            ({
              idle: 350,
              walk: 120,
              basic_attack: 100,
              hurt: 140,
              death: 170,
            })[a.state],
        ),
      );
  }
  for (const type of forestTypes) {
    expect(forestStrikeEffects(type, 'hit', 'poison', 'left')).toEqual([]);
    expect(forestStrikeEffects(type, 'cast', 'creep_strike', 'left')).toEqual(
      [],
    );
    for (const direction of ['down', 'left', 'right', 'up'])
      for (const cue of forestStrikeEffects(
        type,
        'hit',
        'creep_strike',
        direction,
      )) {
        const fx = m.effects.find((f) => f.id === cue.id)!;
        expect(fx).toBeDefined();
        expect(fx.repeat).toBe(0);
        expect(cue.id).not.toMatch(/projectile|web|poison|root_emerge/);
      }
  }
  expect(
    forestStrikeEffects('truc_yeu', 'hit', 'creep_strike', undefined),
  ).toHaveLength(1);
});
it('keeps independent one-shots across short poses without repeated snapshot restarts', () => {
  const a = new CreepPlayback(),
    b = new CreepPlayback();
  expect(a.resolve('basic_attack', 'left', 0, () => 400).state).toBe(
    'basic_attack',
  );
  expect(a.resolve('idle', 'up', 100, () => 400)).toEqual({
    state: 'basic_attack',
    direction: 'left',
  });
  expect(b.resolve('walk', 'right', 100, () => 400).state).toBe('walk');
  expect(a.begin('basic_attack', 'up', 150, 400)).toBe(false);
  a.begin('hurt', 'left', 200, 280);
  expect(a.resolve('idle', 'up', 300, () => 400).state).toBe('hurt');
  a.begin('death', 'down', 310, 680);
  expect(a.retain(900, false)).toBe(true);
  expect(a.retain(991, false)).toBe(false);
});
