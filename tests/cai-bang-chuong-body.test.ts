import { describe, it, expect } from 'vitest';
import { chuongBodyPose } from '../apps/game-client/src/cai-bang-chuong-body-policy.js';
describe('coherent Cái Bang Chưởng body selection', () => {
  it('keeps all idle and walking cels in one pose family', () => {
    expect(
      [0, 800, 1500, 2150].map((t) => chuongBodyPose('idle', t, t)),
    ).toEqual(['idle_0', 'idle_1', 'idle_2', 'idle_3']);
    expect([0, 110, 220, 330].map((t) => chuongBodyPose('walk', t, t))).toEqual(
      ['walk_0', 'walk_1', 'walk_2', 'walk_3'],
    );
  });
  it('uses the same action clock for all directions without starting combat', () => {
    const c = {
      startedAt: 100,
      until: 112,
      ability: 'cai_bang_chuong',
      basicStage: 'palm',
    };
    expect(
      [101, 105, 111].map((tick) =>
        chuongBodyPose('basic_attack', 0, 0, { ...c, tick }),
      ),
    ).toEqual(['windup', 'strike', 'recover']);
    for (const ability of [
      'hoa_van_chuong',
      'cuong_long_loan_vu',
      'phi_long_tai_thien',
      'khang_long_huu_hoi',
      'hang_long_hoa_vu',
    ]) {
      expect(chuongBodyPose('cast', 0, 0, { ...c, tick: 101, ability })).toBe(
        'charge',
      );
      expect(chuongBodyPose('cast', 0, 0, { ...c, tick: 111, ability })).toBe(
        'recover',
      );
    }
  });
  it('has real hit, stun, collapse and held corpse poses and resets on revival', () => {
    expect(chuongBodyPose('hurt', 0, 0)).toBe('hurt_0');
    expect(chuongBodyPose('hurt', 100, 100)).toBe('hurt_1');
    expect(chuongBodyPose('stun', 500, 500)).toBe('hurt_1');
    expect(chuongBodyPose('death', 0, 0)).toBe('death_0');
    expect(chuongBodyPose('death', 5000, 5000)).toBe('death_1');
    expect(chuongBodyPose('idle', 0, 0)).toBe('idle_0');
  });
});
