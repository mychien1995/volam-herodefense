import { describe, it, expect } from 'vitest';
import {
  revisedBasics,
  revisedBasicBody,
  characterFolder,
} from '../apps/game-client/src/character-revision.js';

describe('versioned character bodies', () => {
  const cache = new Set<string>();
  const scene = {
    anims: {
      exists: (k: string) => cache.has(k),
      create: (a: { key: string }) => cache.add(a.key),
    },
  } as any;
  const body = {
    texture: 'old',
    animation: 'old:attack',
    origin: [0.5, 0.8] as [number, number],
    firstFrame: 'basic_attack_right_0',
    scale: 1,
    token: 'event:1',
    durationMs: 200,
    timeScale: 1,
    startFrame: 0,
    progress: 0.5,
    phase: 'right_fist',
    abilityId: '',
  };
  it('routes all six basic bodies without changing their event clock', () => {
    for (const [abilityId, texture] of Object.entries(revisedBasics)) {
      const result = revisedBasicBody(scene, { ...body, abilityId })!;
      expect(result.texture).toBe(texture);
      expect(result.durationMs).toBe(200);
      expect(result.origin).toEqual([0.5, 0.8]);
      expect(result.firstFrame).toContain('_right_');
      expect(characterFolder(texture)).toBe(
        'characters/visual_improvement_v02',
      );
    }
  });
  it('preserves the four monk combo contact poses and recovery', () => {
    for (const [phase, index] of [
      'left_fist',
      'right_palm',
      'front_kick',
      'roundhouse_kick',
    ].map((p, i) => [p, i] as const)) {
      expect(
        revisedBasicBody(scene, {
          ...body,
          abilityId: 'thieu_lam_quyen',
          phase,
        })!.firstFrame,
      ).toBe(`basic_attack_right_${index}`);
    }
    expect(
      revisedBasicBody(scene, {
        ...body,
        abilityId: 'thieu_lam_quyen',
        progress: 0.95,
      })!.firstFrame,
    ).toBe('idle_right_0');
  });
  it('retains skill bodies and Cai Bang, and bounds animation cache across events', () => {
    const skill = { ...body, abilityId: 'luong_nghi_thu' };
    expect(revisedBasicBody(scene, skill)).toBe(skill);
    expect(characterFolder('hero_cai_bang')).toBe('characters');
    revisedBasicBody(scene, { ...body, abilityId: 'vo_dang_kiem' });
    const size = cache.size;
    for (let i = 0; i < 100; i++)
      revisedBasicBody(scene, {
        ...body,
        abilityId: 'vo_dang_kiem',
        token: 'event:' + i,
      });
    expect(cache.size).toBe(size);
  });
});
