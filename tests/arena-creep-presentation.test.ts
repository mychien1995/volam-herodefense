import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  arenaCreepArt,
  CreepPlayback,
  type ArenaCreepManifest,
} from '../apps/game-client/src/arena-creeps.js';
const manifest = JSON.parse(
  readFileSync('assets/arena_creeps.manifest.json', 'utf8'),
) as ArenaCreepManifest;
describe('arena creep presentation bindings', () => {
  it('maps existing server wave numbers to exact art IDs without styling practice/dungeon/future creeps', () => {
    expect([9, 10, 11, 12].map((w) => arenaCreepArt(manifest, w)?.id)).toEqual([
      'creep_jiangshi_zombie',
      'creep_vengeful_spirit',
      'creep_armored_skeleton',
      'creep_stone_golem',
    ]);
    expect(manifest.assets).toHaveLength(20);
    expect([13, 14, 15, 16].map((w) => arenaCreepArt(manifest, w)?.id)).toEqual(
      [
        'creep_demon_hound',
        'creep_fire_imp',
        'creep_fire_cultist',
        'creep_horned_demon_brute',
      ],
    );
    expect([17, 18, 19, 20].map((w) => arenaCreepArt(manifest, w)?.id)).toEqual(
      [
        'creep_shadow_assassin',
        'creep_armored_demon_general',
        'creep_blood_demon_warlock',
        'creep_demon_vanguard',
      ],
    );
    expect(arenaCreepArt(manifest, 17)?.ambient).toBe('shadow_trail');
    expect(arenaCreepArt(manifest, 19)?.projectile).toBe('blood_projectile');
    expect(arenaCreepArt(manifest, 20)?.ambient).toBe('vanguard_aura');
    for (const wave of [0, 21, 30, 1.5])
      expect(arenaCreepArt(manifest, wave)).toBeUndefined();
    expect(arenaCreepArt(manifest, 9, 'private:player')).toBeUndefined();
    expect(new Set(manifest.assets.map((a) => a.id)).size).toBe(20);
  });
  it('retains complete hit reactions across shorter network poses and keeps instances independent', () => {
    const a = new CreepPlayback(),
      b = new CreepPlayback(),
      duration = () => 280;
    a.resolve('hurt', 'left', 0, duration);
    expect(a.resolve('walk', 'right', 210, duration)).toEqual({
      state: 'hurt',
      direction: 'left',
    });
    expect(b.resolve('walk', 'right', 210, duration)).toEqual({
      state: 'walk',
      direction: 'right',
    });
    expect(a.resolve('walk', 'right', 281, duration)).toEqual({
      state: 'walk',
      direction: 'right',
    });
  });
  it('lets death interrupt a strike and retains the full death even after network removal', () => {
    const p = new CreepPlayback();
    p.begin('basic_attack', 'up', 0, 300);
    p.begin('death', 'left', 60, 560);
    expect(p.begin('hurt', 'down', 100, 280)).toBe(false);
    expect(p.resolve('idle', 'right', 200, () => 0)).toEqual({
      state: 'death',
      direction: 'left',
    });
    expect(p.retain(619, false)).toBe(true);
    expect(p.retain(621, false)).toBe(false);
  });
  it('dissolves the spirit only after its authored collapse completes', () => {
    const p = new CreepPlayback();
    p.begin('death', 'down', 0, 560);
    expect(p.alpha(559, true)).toBe(1);
    expect(p.alpha(730, true)).toBe(0.5);
    expect(p.retain(899, true)).toBe(true);
    expect(p.retain(901, true)).toBe(false);
    expect(p.alpha(901, true)).toBe(0);
    expect(p.alpha(901, false)).toBe(1);
  });
  it('registers all five authored states/four facings and genuine contact-only effect tags', () => {
    for (const a of manifest.assets) {
      expect(a.animations).toHaveLength(20);
      expect(a.sourceConcept).toContain('assets/concepts/arena-creeps/');
      expect(a.sourceConceptSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(manifest.effects.map((e) => e.id)).toEqual([
      'undead_contact',
      'spectral_contact',
      'metal_contact',
      'stone_contact',
      'demon_hound_contact',
      'fire_imp_contact',
      'fire_cultist_contact',
      'horned_brute_contact',
      'fire_imp_projectile',
      'fire_cultist_projectile',
      'demon_hound_embers',
      'shadow_contact',
      'general_contact',
      'blood_contact',
      'vanguard_contact',
      'blood_projectile',
      'shadow_trail',
      'vanguard_aura',
    ]);
    expect(manifest.effects.every((e) => e.frames.length === 4)).toBe(true);
  });
});
