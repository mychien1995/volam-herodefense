import type Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import { preferences } from './preferences.js';
import caiBangPalm from '../../../assets/sounds/skills/cai-bang-chuong-A.mp3?url';
import caiBangDragon from '../../../assets/sounds/skills/cai-bang-chuong-A-special.mp3?url';
import hoaVanChuong from '../../../assets/sounds/skills/cai-bang-chuong-Q.mp3?url';
import cuongLongLoanVu from '../../../assets/sounds/skills/cai-bang-chuong-W.mp3?url';
import phiLongTaiThien from '../../../assets/sounds/skills/cai-bang-chuong-E.mp3?url';
import hangLongHoaVu from '../../../assets/sounds/skills/cai-bang-chuong-T.mp3?url';
import caiBangStaff from '../../../assets/sounds/skills/cai-bang-bong-A.mp3?url';
import caiBangStaffSmash from '../../../assets/sounds/skills/cai-bang-bong-A-end.mp3?url';
import hoanhTaoBong from '../../../assets/sounds/skills/cai-bang-bong-Q.mp3?url';
import phaGiapBong from '../../../assets/sounds/skills/cai-bang-bong-W.mp3?url';
import camLongCong from '../../../assets/sounds/skills/cai-bang-bong-E.mp3?url';
import truyPhongBong from '../../../assets/sounds/skills/cai-bang-bong-R.mp3?url';
import thienHaVoCau from '../../../assets/sounds/skills/cai-bang-bong-T.mp3?url';
import thienSonFan from '../../../assets/sounds/skills/thien-son-phien-A.mp3?url';
import lucDuongChuong from '../../../assets/sounds/skills/thien-son-phien-W.mp3?url';
import luuPhongBo from '../../../assets/sounds/skills/thien-son-phien-E.mp3?url';
import bachPhienPhongBao from '../../../assets/sounds/skills/thien-son-phien-T.mp3?url';
import thienSonBlade from '../../../assets/sounds/skills/thien-son-dao-A.mp3?url';
import phiAnhTram from '../../../assets/sounds/skills/thien-son-dao-Q-and-E.mp3?url';
import truyHonDao from '../../../assets/sounds/skills/thien-son-dao-W.mp3?url';
import lietPhongDao from '../../../assets/sounds/skills/thien-son-dao-R.mp3?url';
import bachLietThienKich from '../../../assets/sounds/skills/thien-son-dao-T.mp3?url';

import voDangPalm from '../../../assets/sounds/skills/vo-dang-quyen-A.mp3?url';
import luongNghiThu from '../../../assets/sounds/skills/vo-dang-quyen-Q.mp3?url';
import huyenAmChuong from '../../../assets/sounds/skills/vo-dang-quyen-W.mp3?url';
import thaiCucThanCong from '../../../assets/sounds/skills/vo-dang-quyen-R.mp3?url';
import thaiCucTran from '../../../assets/sounds/skills/vo-dang-quyen-T.mp3?url';

import voDangSword from '../../../assets/sounds/skills/vo-dang-kiem-A.mp3?url';
import thatTinhKiem from '../../../assets/sounds/skills/vo-dang-kiem-Q.mp3?url';
import nhanKiemHopNhat from '../../../assets/sounds/skills/vo-dang-kiem-W.mp3?url';
import vanKiemQuyTong from '../../../assets/sounds/skills/vo-dang-kiem-T.mp3?url';
import batQuaiKiemTran from '../../../assets/sounds/skills/vo-dang-kiem-E.mp3?url';

import shaolinBasic from '../../../assets/sounds/skills/thieu-lam-quyen-A.mp3?url';
import laHanQuyen from '../../../assets/sounds/skills/thieu-lam-quyen-dam-Q.mp3?url';
import viDaQuyen from '../../../assets/sounds/skills/thieu-lam-quyen-dam-W.mp3?url';
import daiLucKimCuongChuong from '../../../assets/sounds/skills/thieu-lam-quyen-dam-E.mp3?url';
import toanPhongThoai from '../../../assets/sounds/skills/thieu-lam-quyen-da-Q.mp3?url';
import caDiepThoai from '../../../assets/sounds/skills/thieu-lam-quyen-da-W.mp3?url';
import voAnhCuoc from '../../../assets/sounds/skills/thieu-lam-quyen-da-E.mp3?url';
import nhuLaiNietBan from '../../../assets/sounds/skills/thieu-lam-quyen-T.mp3?url';

import shaolinBlade from '../../../assets/sounds/skills/thieu-lam-dao-A.mp3?url';
import truTa from '../../../assets/sounds/skills/thieu-lam-dao-Q.mp3?url';
import nhuLaiThienDiep from '../../../assets/sounds/skills/thieu-lam-dao-T.mp3?url';

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
  scene.load.audio('van_kiem_quy_tong', vanKiemQuyTong);
  for (const [key, url] of [...attackSounds, ...castSounds])
    scene.load.audio(key, url);
}

export function playSkillSound(
  scene: Phaser.Scene,
  event: CombatEvent,
  sessionId: string,
): void {
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
