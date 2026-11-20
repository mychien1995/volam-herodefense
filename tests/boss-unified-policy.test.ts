import { expect, test } from 'vitest';
import {
  bossBodyPose,
  bossContactBeat,
} from '../apps/game-client/src/boss-unified-policy.js';
test('idle and walk sample actual four-cel cycles', () => {
  expect(
    new Set(
      [0, 700, 1400, 2150].map((t) =>
        bossBodyPose('dong_ta', 'idle', 0, t, ''),
      ),
    ).size,
  ).toBe(4);
  expect(
    new Set(
      [0, 110, 220, 330].map((t) => bossBodyPose('dong_ta', 'walk', 0, t, '')),
    ).size,
  ).toBe(4);
});
test('encounter beats retain separate finger, sword, flute and summon roles', () => {
  for (const [ability, poses] of Object.entries({
    dan_chi_than_cong: ['finger_prepare', 'finger_release', 'recover'],
    ta_kiem_lien_kich: ['windup', 'thrust', 'recover'],
    lac_anh_kiem_phap: ['windup', 'flurry', 'recover'],
    ngoc_tieu_hoi_phong: ['flute_raise', 'flute_play', 'flute_turn'],
    trieu_hon_dong_hai: ['summon_raise', 'summon_release', 'channel'],
  }))
    for (const beat of [0, 1, 2] as const)
      expect(bossBodyPose('dong_ta', 'action', 0, 0, ability, { beat })).toBe(
        poses[beat],
      );
});
test('reaction and death override a stale active ability', () => {
  expect(
    bossBodyPose('dong_ta', 'hurt', 0, 0, 'ngoc_tieu_hoi_phong', { beat: 1 }),
  ).toBe('hurt_0');
  expect(
    bossBodyPose('dong_ta', 'death', 300, 0, 'ngoc_tieu_hoi_phong', {
      beat: 1,
    }),
  ).toBe('death_1');
  expect(bossBodyPose('other_boss', 'idle', 0, 0, '')).toBeUndefined();
});

test('a skipped short release is shown once without changing the encounter clock', () => {
  expect(bossContactBeat({ beat: 2 }, 0)).toBe(1);
  expect(bossContactBeat({ beat: 2 }, 1)).toBe(2);
  expect(bossContactBeat({ beat: 0 }, 2)).toBe(0);
});

test('other boss roles retain form and skill-specific contact poses', () => {
  expect(
    bossBodyPose('tay_doc', 'action', 0, 0, 'tay_doc_staff', { beat: 1 }),
  ).toBe('attack_2');
  expect(
    bossBodyPose('tay_doc_cap_mo', 'action', 0, 0, 'cap_mo_chan_kich', {
      beat: 2,
    }),
  ).toBe('attack_2');
  expect(
    bossBodyPose('nam_de', 'action', 0, 0, 'nhat_duong_chi', { beat: 1 }),
  ).toBe('attack_1');
  expect(bossBodyPose('bac_cai', 'action', 0, 0, 'palms', { beat: 1 })).toBe(
    'cast_1',
  );
});
