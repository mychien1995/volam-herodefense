import { it, expect } from 'vitest';
import {
  dragonTurnFrame,
  staffSlamCel,
} from '../apps/game-client/src/renovation-followup-model.js';
import {
  followupRestoresBody,
  retainM3dRaster,
  renovationFollowupEnabled,
} from '../apps/game-client/src/renovation-policy.js';
it('uses authored front, back and diagonal dragon views around a full orbit with zero image rotation', () => {
  const names = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      p = dragonTurnFrame(Math.cos(a), Math.sin(a), 0);
    names.push(p.direction);
    expect(p.rotation).toBe(0);
    expect(p.origin.every(Number.isFinite)).toBe(true);
  }
  expect(new Set(names).size).toBe(8);
  expect(dragonTurnFrame(0, 1, 0).frame).toBe('down_0');
  expect(dragonTurnFrame(0, -1, 0).frame).toBe('up_0');
  expect(dragonTurnFrame(-1, 0, 0).flip).toBe(true);
  expect([0, 85, 170, 255].map((t) => dragonTurnFrame(1, 0, t).frame)).toEqual([
    'right_0',
    'right_1',
    'right_2',
    'right_3',
  ]);
});
it('registers the staff raise, extension, actual strike and recovery without invalid clock indices', () => {
  expect(staffSlamCel('raise', 0.1)).toBe(0);
  expect(staffSlamCel('raise', 0.8)).toBe(1);
  expect(staffSlamCel('strike', 0)).toBe(2);
  expect(staffSlamCel('recovery', 0)).toBe(3);
  expect(staffSlamCel('raise', -0.3)).toBe(0);
  expect(staffSlamCel('raise', NaN)).toBe(0);
});
it('restores requested wave-boss casts and preserves only the named exceptions', () => {
  for (const id of [
    'dong_ta',
    'bac_cai',
    'bac_cai_black_dog',
    'vuong_trung_duong_p1',
    'vuong_trung_duong_p2',
  ])
    expect(followupRestoresBody(id, 'anything')).toBe(true);
  expect(followupRestoresBody('mai_sieu_phong', 'doc_cot_bao')).toBe(true);
  expect(followupRestoresBody('mai_sieu_phong', 'bach_cot_trao')).toBe(false);
  expect(followupRestoresBody('hoang_dung', 'thanh_am_ho_tro')).toBe(false);
  expect(followupRestoresBody('tay_doc', 'doc_chuong')).toBe(true);
  expect(followupRestoresBody('tay_doc', 'van_doc_phi_cham')).toBe(false);
  expect(followupRestoresBody('nam_de', 'nhat_duong_chi')).toBe(true);
  for (const id of ['nam_de_aura', 'phat_quang_pho_chieu'])
    expect(followupRestoresBody('nam_de', id)).toBe(false);
});
it('retains exact M3D raster families while shared Mai/Hoang and Phat Quang sheets stay selectable', () => {
  for (const id of [
    'tay:fx1',
    'tay_fx2',
    'nd_rays',
    'bac_cai_staff',
    'vtd-effects',
    'wave_feedback_v02:gold_bolt',
    'wave_snake_bolt',
    'retained_m3d_dt_maifx',
  ])
    expect(retainM3dRaster(id)).toBe(true);
  for (const id of [
    'dt_fx',
    'dt_maifx',
    'wave_feedback_v02:spotlight',
    'wave_nam_de_ring',
  ])
    expect(retainM3dRaster(id)).toBe(false);
  expect(renovationFollowupEnabled('?renovationSkills=v5')).toBe(false);
  expect(renovationFollowupEnabled('?renovationSkills=old')).toBe(false);
  expect(renovationFollowupEnabled('')).toBe(true);
});
