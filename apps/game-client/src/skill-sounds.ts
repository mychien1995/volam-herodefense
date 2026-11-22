import type Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import { preferences } from './preferences.js';
import { playConLuanSound, preloadConLuanSounds } from './con-luan-sounds.js';
import {
  playAdditionalSchoolSound,
  preloadAdditionalSchoolSounds,
} from './additional-school-sounds.js';
import caiBangPalm from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-chuong-A.ogg?url';
import caiBangDragon from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-chuong-A-special.ogg?url';
import hoaVanChuong from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-chuong-Q.ogg?url';
import cuongLongLoanVu from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-chuong-W.ogg?url';
import phiLongTaiThien from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-chuong-E.ogg?url';
import hangLongHoaVu from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-chuong-T.ogg?url';
import caiBangStaff from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-bong-A.ogg?url';
import caiBangStaffSmash from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-bong-A-end.ogg?url';
import hoanhTaoBong from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-bong-Q.ogg?url';
import phaGiapBong from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-bong-W.ogg?url';
import camLongCong from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-bong-E.ogg?url';
import truyPhongBong from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-bong-R.ogg?url';
import thienHaVoCau from '../../../assets/sounds/skills/original-four-schools-ogg/cai-bang-bong-T.ogg?url';
import thienSonFan from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-phien-A.ogg?url';
import lucDuongChuong from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-phien-W.ogg?url';
import luuPhongBo from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-phien-E.ogg?url';
import bachPhienPhongBao from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-phien-T.ogg?url';
import thienSonBlade from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-dao-A.ogg?url';
import phiAnhTram from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-dao-Q-and-E.ogg?url';
import truyHonDao from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-dao-W.ogg?url';
import lietPhongDao from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-dao-R.ogg?url';
import bachLietThienKich from '../../../assets/sounds/skills/original-four-schools-ogg/thien-son-dao-T.ogg?url';

import voDangPalm from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-quyen-A.ogg?url';
import luongNghiThu from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-quyen-Q.ogg?url';
import huyenAmChuong from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-quyen-W.ogg?url';
import thaiCucThanCong from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-quyen-R.ogg?url';
import thaiCucTran from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-quyen-T.ogg?url';

import voDangSword from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-kiem-A.ogg?url';
import thatTinhKiem from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-kiem-Q.ogg?url';
import nhanKiemHopNhat from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-kiem-W.ogg?url';
import vanKiemQuyTong from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-kiem-T.ogg?url';
import batQuaiKiemTran from '../../../assets/sounds/skills/original-four-schools-ogg/vo-dang-kiem-E.ogg?url';

import shaolinBasic from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-A.ogg?url';
import laHanQuyen from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-dam-Q.ogg?url';
import viDaQuyen from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-dam-W.ogg?url';
import daiLucKimCuongChuong from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-dam-E.ogg?url';
import toanPhongThoai from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-da-Q.ogg?url';
import caDiepThoai from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-da-W.ogg?url';
import voAnhCuoc from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-da-E.ogg?url';
import nhuLaiNietBan from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-quyen-T.ogg?url';

import shaolinBlade from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-dao-A.ogg?url';
import truTa from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-dao-Q.ogg?url';
import nhuLaiThienDiep from '../../../assets/sounds/skills/original-four-schools-ogg/thieu-lam-dao-T.ogg?url';

const attackSounds = new Map([
  ['cai_bang_chuong', caiBangPalm],
  ['cai_bang_chuong:dragon', caiBangDragon],
  ['cai_bang_bong', caiBangStaff],
  ['cai_bang_bong:smash', caiBangStaffSmash],
  ['thien_son_phien', thienSonFan],
  ['thien_son_dao', thienSonBlade],
  ['vo_dang_quyen', voDangPalm],
  ['vo_dang_kiem', voDangSword],
  ['thieu_lam_quyen', shaolinBasic],
  ['thieu_lam_dao', shaolinBlade],
]);

const castSounds = new Map([
  ['hoa_van_chuong', hoaVanChuong],
  ['cuong_long_loan_vu', cuongLongLoanVu],
  ['phi_long_tai_thien', phiLongTaiThien],
  ['hang_long_hoa_vu', hangLongHoaVu],
  ['hoanh_tao_bong', hoanhTaoBong],
  ['pha_giap_bong', phaGiapBong],
  ['cam_long_cong', camLongCong],
  ['truy_phong_bong', truyPhongBong],
  ['thien_ha_vo_cau', thienHaVoCau],
  ['luc_duong_chuong', lucDuongChuong],
  ['luu_phong_bo', luuPhongBo],
  ['bach_phien_phong_bao', bachPhienPhongBao],
  ['phi_anh_tram', phiAnhTram],
  ['truy_hon_dao', truyHonDao],
  ['liet_phong_dao', lietPhongDao],
  ['bach_liet_thien_kich', bachLietThienKich],
  ['luong_nghi_thu', luongNghiThu],
  ['huyen_am_chuong', huyenAmChuong],
  ['thai_cuc_than_cong', thaiCucThanCong],
  ['thai_cuc_tran', thaiCucTran],
  ['that_tinh_kiem', thatTinhKiem],
  ['nhan_kiem_hop_nhat', nhanKiemHopNhat],
  ['bat_quai_kiem_tran', batQuaiKiemTran],
  ['la_han_quyen', laHanQuyen],
  ['vi_da_quyen', viDaQuyen],
  ['dai_luc_kim_cuong_chuong', daiLucKimCuongChuong],
  ['toan_phong_thoai', toanPhongThoai],
  ['hoanh_tao_cuoc', caDiepThoai],
  ['vo_anh_cuoc', voAnhCuoc],
  ['nhu_lai_niet_ban', nhuLaiNietBan],
  ['tru_ta', truTa],
  ['nhu_lai_thien_diep', nhuLaiThienDiep],
]);

export function playVanKiemLandingSound(scene: Phaser.Scene): void {
  if (preferences.volume && scene.cache.audio.exists('van_kiem_quy_tong'))
    // The supplied clip has 0.6 seconds of silence before its audible effect.
    scene.sound.play('van_kiem_quy_tong', {
      volume: preferences.volume / 100,
      seek: 0.6,
    });
}

export function preloadSkillSounds(scene: Phaser.Scene): void {
  preloadConLuanSounds(scene);
  preloadAdditionalSchoolSounds(scene);
  scene.load.audio('van_kiem_quy_tong', vanKiemQuyTong);
  for (const [key, url] of [...attackSounds, ...castSounds])
    scene.load.audio(key, url);
}

export function refreshSkillSoundVolumes(scene: Phaser.Scene): void {
  const keys = new Set([
    ...attackSounds.keys(),
    ...castSounds.keys(),
    'van_kiem_quy_tong',
  ]);
  for (const key of keys)
    for (const sound of scene.sound.getAll(key)) {
      if ('volume' in sound) sound.volume = preferences.volume / 100;
    }
}

export function playSkillSound(
  scene: Phaser.Scene,
  event: CombatEvent,
  sessionId: string,
): void {
  playConLuanSound(scene, event, sessionId);
  playAdditionalSchoolSound(scene, event, sessionId);
  if (event.sourceId !== sessionId || !preferences.volume) return;

  let key: string | undefined;
  if (event.kind === 'attack') {
    const stagedKey = `${event.abilityId}:${event.stage}`;
    if (attackSounds.has(stagedKey)) key = stagedKey;
    else if (attackSounds.has(event.abilityId)) key = event.abilityId;
  } else if (event.kind === 'cast') {
    const castKey =
      event.abilityId === 'phong_anh_hoan_vi'
        ? 'phi_anh_tram'
        : event.abilityId;
    if (castSounds.has(castKey)) key = castKey;
  }
  if (key && scene.cache.audio.exists(key))
    scene.sound.play(key, { volume: preferences.volume / 100 });
}
