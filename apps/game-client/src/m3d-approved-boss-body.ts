import type Phaser from 'phaser';
import { renovationRevisionEnabled } from './renovation-policy.js';

type Beat = 0 | 1 | 2;
type Poses = readonly [number, number, number];
type Body = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
const sweep: Poses = [0, 1, 0];
const raise: Poses = [0, 3, 0];
const thrust: Poses = [0, 1, 3];
const palm: Poses = [0, 2, 0];

// The reviewed rows select preparation, contact, and recovery from the
// retained four-facing V3 atlases. Ability effects keep their own renderers.
const poses: Readonly<Record<string, Readonly<Record<string, Poses>>>> = {
  dong_ta: {
    dan_chi_than_cong: sweep,
    lac_anh_kiem_phap: thrust,
    lac_anh_normal: thrust,
    ngoc_tieu_hoi_phong: [0, 2, 2],
    trieu_hon_dong_hai: raise,
    ta_kiem_lien_kich: thrust,
  },
  tay_doc: {
    doc_vu_me_hon: palm,
    co_doc_khoan_tam: palm,
    hon_thien_phuc_long_chan: [0, 3, 3],
    tay_doc_gas: palm,
  },
  tay_doc_cap_mo: {
    cap_mo_chan_kich: raise,
    ngu_doc_than_chuong: [0, 2, 1],
    van_doc_bao_phat: [0, 3, 2],
  },
  nam_de: {
    nhat_duong_chi: [2, 0, 2],
    lien_hoan_nhat_duong_chi: [2, 0, 0],
    nam_de_small_finger: [2, 0, 0],
    dai_ly_phong_huyet: [2, 0, 2],
    nhat_duong_quy_tong: [2, 3, 2],
    nam_de_palm: [2, 1, 2],
  },
  bac_cai: {
    spiral: palm,
    palms: palm,
    field: palm,
    vortex: [0, 3, 3],
    tether: raise,
  },
  vuong_trung_duong_p1: {
    slash: [0, 2, 1],
    crescent: [0, 2, 1],
    thrust: sweep,
    elements: [0, 3, 3],
    counter: [0, 3, 2],
  },
  vuong_trung_duong_p2: {
    swords: [0, 2, 1],
    rain: [0, 2, 3],
    notes: [0, 2, 3],
    stars: [0, 2, 3],
    pulse: [0, 2, 0],
    finger: [0, 2, 0],
  },
  chu_ba_thong: {
    hands: [0, 1, 2],
    trap: [0, 2, 2],
    reflect: [0, 2, 2],
    ultimate: [0, 2, 2],
    drink: [0, 3, 3],
  },
  hoan_nhan_hong_liet: {
    hong_liet_a1: sweep,
    hong_liet_a2: sweep,
    liet_diem_phong_toa: sweep,
  },
  kim_luan: {
    long_tuong_chan_thien: raise,
    ngu_luan_ho_the: [0, 2, 2],
    ngu_luan_phong_toa: [0, 2, 2],
    long_tuong_bat_nha_cong: [0, 3, 2],
    long_tuong_bat_nha_thap_tang: [0, 3, 2],
  },
  ly_mac_sau: {
    xich_luyen_chuong: palm,
    co_mo_kiem_phap: [0, 2, 2],
    ngu_doc_chuong: palm,
  },
};
const alreadyRenovated = new Set([
  'van_doc_phi_cham',
  'nam_de_aura',
  'phat_quang_pho_chieu',
  'bang_phach_ngan_cham',
  'kim_hand_chop',
]);

export function approvedM3dPresentation(search = location.search): boolean {
  return (
    renovationRevisionEnabled(search) &&
    !new URLSearchParams(search).has('renovationSkills')
  );
}

export function approvedBossBody(id: string): boolean {
  return Object.hasOwn(poses, id) && approvedM3dPresentation();
}

export function releaseBeat(
  now: number,
  release: number,
  contactTicks = 5,
): Beat {
  return now < release ? 0 : now < release + contactTicks ? 1 : 2;
}

export function clipBeat(progress: number): Beat {
  return progress < 0.3 ? 0 : progress < 0.72 ? 1 : 2;
}

export function presentApprovedBossAction(
  scene: Phaser.Scene,
  body: Body,
  id: string,
  direction: string,
  ability: string,
  beat: Beat,
): boolean {
  if (!approvedBossBody(id) || alreadyRenovated.has(ability)) return false;
  const texture = 'renovated-action-' + id + '_actions';
  const previous = body.data?.get('renovation-action') as
    { ability?: string; phase?: string } | undefined;
  // A skipped render during a short release must still show the contact cel.
  if (
    beat === 2 &&
    previous?.ability === ability &&
    previous.phase === 'windup'
  )
    beat = 1;
  const table = poses[id]!;
  const frame =
    direction +
    '_' +
    (Object.hasOwn(table, ability)
      ? table[ability]!
      : id === 'hoan_nhan_hong_liet'
        ? raise
        : sweep)[beat];
  if (
    !scene.textures.exists(texture) ||
    !scene.textures.get(texture).has(frame)
  )
    return false;
  if ('anims' in body) body.anims.stop();
  body
    .setTexture(texture, frame)
    .setOrigin(0.5, 0.8)
    .setScale(0.5)
    .setFlip(false, false)
    .setRotation(0);
  body.setData('renovation-action', {
    ability,
    phase: ['windup', 'release', 'recovery'][beat],
    sourceTexture: texture,
    sourceFrame: frame,
  });
  return true;
}
