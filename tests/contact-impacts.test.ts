import { expect, it } from 'vitest';
import type { CombatEvent } from '@volam/game-core';
import { combatEventSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
import { contactClip } from '../apps/game-client/src/contact-impacts.js';

const hit: CombatEvent = {
  id: 1,
  kind: 'hit',
  sourceId: 'hero',
  targetId: 'enemy',
  abilityId: 'huyen_am_chuong',
  damage: 12,
  critical: false,
  x: 100,
  y: 100,
};

it('selects impacts from damaging server phases even when the hit also empowers a combo', () => {
  const ids = [
    ['cai_bang_bong', 'lift', 'staff-point'],
    ['cai_bang_bong', 'smash', 'staff-drop'],
    ['thien_ha_vo_cau', 'sweep', 'staff-whirl-tick'],
    ['burn', 'cuong_long_loan_vu', 'palm-afterburn'],
    ['hang_long_hoa_vu', 'dragon_coil', 'palm-coil-tick'],
    ['phong_anh_hoan_vi', 'counter', 'sabre-counter'],
    ['tam_lien_tram', 'cross_1', 'sabre-peach-cross'],
    ['tam_lien_tram', 'cross_2', 'sabre-peach-last'],
    ['huyen_am_chuong', 'travel_0', 'fist-wave-first'],
    ['huyen_am_chuong', 'travel_1', 'fist-wave-second'],
    ['thieu_lam_quyen', 'front_kick', 'fist-front-kick'],
    ['thieu_lam_quyen', 'roundhouse_kick', 'fist-roundhouse'],
    ['vi_da_quyen', 'near', 'fist-vida-near'],
    ['con_luan_thien_su', 'rising', 'hammer-sweep'],
  ] as const;
  for (const [abilityId, hitPhase, clip] of ids) {
    const wire = combatEventSchema.parse({
      ...hit,
      abilityId,
      hitPhase,
      stage: 'empowered',
      protocolVersion: PROTOCOL_VERSION,
      zoneId: 'arena',
    });
    expect(contactClip(wire)?.id).toBe(clip);
  }
});

it('keeps cast, misses and already-authored area impacts out of the contact layer', () => {
  const sample: CombatEvent = { ...hit, hitPhase: 'travel_0' };
  for (const event of [
    { ...sample, kind: 'cast' } as const,
    { ...sample, kind: 'pulse' } as const,
    { ...sample, damage: 0 },
    { ...sample, targetId: 'statue' },
    { ...sample, hitPhase: undefined },
    { ...sample, abilityId: 'burn', hitPhase: 'unrelated' },
    { ...sample, abilityId: 'hang_long_hoa_vu', hitPhase: 'dragon_impact' },
    { ...sample, abilityId: 'thien_ha_vo_cau', hitPhase: 'finisher' },
    { ...sample, abilityId: 'con_luan_thien_su', hitPhase: 'overhead' },
    { ...sample, abilityId: 'vi_da_quyen', hitPhase: 'far' },
  ]) {
    expect(contactClip(event)).toBeUndefined();
  }
});
