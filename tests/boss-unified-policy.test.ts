import { expect, test } from 'vitest';
import {
  bossBodyPose,
  bossNativePose,
  bossContactBeat,
  tayDocBodyForm,
} from '../apps/game-client/src/boss-unified-policy.js';
test('Cổ Mộ native skill clips are actions, while reactions remain reactions', () => {
  for (const p of ['needle_cast', 'palm_channel', 'fast_sweep', 'summon_cast'])
    expect(bossNativePose('ly_mac_sau', p)).toBe('action');
  for (const p of ['idle', 'walk', 'hurt', 'death'])
    expect(bossNativePose('ly_mac_sau', p)).toBe(p);
  expect(bossNativePose('other', 'needle_cast')).toBe('needle_cast');
});

test('frog form starts after staff release and survives the death phase', () => {
  expect(tayDocBodyForm('transition', 100, 117)).toBe('tay_doc');
  expect(tayDocBodyForm('transition', 100, 118)).toBe('tay_doc_cap_mo');
  expect(tayDocBodyForm('dead', 100, 300)).toBe('tay_doc_cap_mo');
  expect(tayDocBodyForm('dead', 0, 300)).toBe('tay_doc');
});
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

test('sustained beams and whirlwind keep the authored contact body while active', () => {
  expect(
    new Set(
      [0, 110, 220, 330].map((t) =>
        bossBodyPose('chu_ba_thong', 'action', t, 0, 'spin', { beat: 2 }),
      ),
    ).size,
  ).toBe(4);
  expect(
    bossBodyPose('nam_de', 'action', 900, 0, 'nhat_duong_chi', { beat: 2 }),
  ).toBe('attack_1');
  expect(bossBodyPose('bac_cai', 'action', 900, 0, 'beam', { beat: 2 })).toBe(
    'attack_1',
  );
  expect(
    new Set(
      [0, 110, 220, 330].map((t) =>
        bossBodyPose('bac_cai', 'action', t, 0, 'vortex', {
          beat: 2,
          phase: 'sustain',
        }),
      ),
    ).size,
  ).toBe(4);
  expect(bossBodyPose('bac_cai', 'action', 800, 0, 'drink_down')).toBe(
    'drink_2',
  );
  expect(bossBodyPose('bac_cai', 'action', 1800, 0, 'sleep_down')).toBe(
    'sleep_3',
  );
  expect(bossBodyPose('bac_cai', 'death', 300, 0, 'drink_down')).toBe(
    'death_1',
  );
});
