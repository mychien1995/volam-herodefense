import type {
  Ability,
  ArcEffect,
  ComboSpec,
  ProgressionDefinition,
  StatusSpec,
} from '@volam/game-core';
import { abilitySchema } from './ability-schema.js';
import { skillRankGates } from './progression-data.js';

/** M3C3 proposals at 30Hz. These are explicit tuning inputs, not final M3D balance. */
export const thieuLamComboWindowTicks = 180;
const chain = (
  id: ComboSpec['id'],
  step: ComboSpec['step'],
  multiplier = 2.4,
): ComboSpec => ({
  id,
  step,
  windowTicks: thieuLamComboWindowTicks,
  multiplier,
});
const arc = (
  damage: number,
  range: number,
  cleave = 0.5,
  halfAngle = Math.PI / 3,
): ArcEffect => ({ mode: 'arc', damage, range, cleave, halfAngle });
const guard = (magnitude: number, durationTicks: number): StatusSpec => ({
  kind: 'damage_reduction',
  magnitude,
  durationTicks,
});
const armor = (magnitude: number, durationTicks: number): StatusSpec => ({
  kind: 'defense_buff',
  magnitude,
  durationTicks,
});
export const thieuLamBasics: Record<string, Ability> = {
  thieu_lam_quyen: {
    id: 'thieu_lam_quyen',
    nameVi: 'Thiếu Lâm Quyền',
    manaCost: 0,
    cooldownTicks: 28,
    effect: arc(38, 48, 0.25, Math.PI / 4),
  },
  thieu_lam_dao: {
    id: 'thieu_lam_dao',
    nameVi: 'Thiếu Lâm Đao',
    manaCost: 0,
    cooldownTicks: 23,
    effect: arc(32, 62, 0.55, Math.PI / 2.5),
  },
};
export const thieuLamSkills: Ability[] = [
  {
    id: 'la_han_quyen',
    nameVi: 'La Hán Quyền',
    manaCost: 10,
    cooldownTicks: 75,
    effect: arc(40, 58),
    selfStatuses: [guard(0.15, 45)],
    combo: chain('phat_dong_a', 1),
  },
  {
    id: 'vi_da_quyen',
    nameVi: 'Vi Đà Quyền',
    manaCost: 12,
    cooldownTicks: 90,
    effect: {
      ...arc(44, 62),
      statuses: [{ kind: 'defense_break', magnitude: 12, durationTicks: 120 }],
    },
    combo: chain('phat_dong_a', 2),
  },
  {
    id: 'dai_luc_kim_cuong_chuong',
    nameVi: 'Đại Lực Kim Cương Chưởng',
    manaCost: 20,
    cooldownTicks: 150,
    effect: { ...arc(65, 78, 0.6), windupTicks: 12 },
    combo: chain('phat_dong_a', 3),
  },
  {
    id: 'toan_phong_thoai',
    nameVi: 'Toàn Phong Thoái',
    manaCost: 12,
    cooldownTicks: 90,
    effect: arc(34, 70, 1, Math.PI),
    combo: chain('phat_dong_b', 1, 2),
  },
  {
    id: 'hoanh_tao_cuoc',
    nameVi: 'Hoành Tảo Cước',
    manaCost: 14,
    cooldownTicks: 105,
    effect: arc(42, 80, 0.8, Math.PI / 2),
    combo: chain('phat_dong_b', 2, 2),
  },
  {
    id: 'vo_anh_cuoc',
    nameVi: 'Vô Ảnh Cước',
    manaCost: 24,
    cooldownTicks: 180,
    effect: {
      mode: 'multi_hit',
      damage: 17,
      range: 76,
      hits: 6,
      spacingTicks: 4,
      finisherDamage: 0,
      finisherRange: 76,
      halfAngle: Math.PI / 2.5,
    },
    combo: chain('phat_dong_b', 3, 2),
  },
  {
    id: 'kim_cang_bat_hoai',
    nameVi: 'Kim Cang Bất Hoại',
    manaCost: 20,
    cooldownTicks: 300,
    effect: {
      mode: 'buff',
      durationTicks: 120,
      critChance: 0,
      critMultiplier: 0,
    },
    selfStatuses: [
      guard(0.4, 120),
      { kind: 'interrupt_resist', magnitude: 1, durationTicks: 120 },
    ],
  },
  {
    id: 'nhu_lai_niet_ban',
    nameVi: 'Như Lai Niết Bàn',
    manaCost: 40,
    cooldownTicks: 540,
    effect: { ...arc(120, 140, 1, Math.PI), windupTicks: 15 },
    selfStatuses: [guard(0.25, 150)],
  },
  {
    id: 'tru_ta',
    nameVi: 'Tru Tà',
    manaCost: 12,
    cooldownTicks: 90,
    effect: {
      ...arc(42, 84, 0.7, Math.PI / 2),
      statuses: [{ kind: 'slow', magnitude: 0.3, durationTicks: 90 }],
    },
  },
  {
    id: 'kim_quang_ho_tran',
    nameVi: 'Kim Quang Hộ Trận',
    manaCost: 24,
    cooldownTicks: 330,
    effect: {
      mode: 'support',
      radius: 145,
      durationTicks: 180,
      tickInterval: 15,
      statuses: [armor(22, 16)],
    },
  },
  {
    id: 'tam_gioi_quy_thien',
    nameVi: 'Tam Giới Quy Thiền',
    manaCost: 18,
    cooldownTicks: 135,
    effect: {
      ...arc(62, 88, 0.65),
      statuses: [{ kind: 'defense_break', magnitude: 20, durationTicks: 135 }],
    },
  },
  {
    id: 'bat_dong_minh_vuong',
    nameVi: 'Bất Động Minh Vương',
    manaCost: 26,
    cooldownTicks: 300,
    effect: {
      mode: 'support',
      radius: 140,
      durationTicks: 1,
      tickInterval: 1,
      heal: 42,
    },
  },
  {
    id: 'nhu_lai_thien_diep',
    nameVi: 'Như Lai Thiên Diệp',
    manaCost: 42,
    cooldownTicks: 540,
    effect: {
      mode: 'projectile',
      damage: 100,
      speed: 300,
      range: 360,
      radius: 48,
      count: 1,
      spacingTicks: 0,
      splashRadius: 0,
      burnDamage: 0,
      burnTicks: 0,
      piercing: true,
      useFacing: true,
    },
    allies: { radius: 170, statuses: [armor(30, 180)] },
  },
];
const descriptions = [
  'Đấm mạnh, thủ thế ngắn. Phát Động A bước 1 trên từng địch trúng đòn, kể cả đòn lan.',
  'Đấm phá thủ. Phát Động A bước 2 chỉ tiếp nối La Hán Quyền trên cùng địch.',
  'Chưởng chậm mạnh. Phát Động A: La Hán → Vi Đà → Đại Lực trên cùng địch trong 6s để cường hóa.',
  'Xoay cước quanh người. Phát Động B bước 1, theo dõi riêng từng địch.',
  'Quét cước rộng. Phát Động B bước 2 sau Toàn Phong trên cùng địch.',
  'Sáu cước liên tiếp. Phát Động B: Toàn Phong → Hoành Tảo → Vô Ảnh trong 6s. Tiêu thụ chuỗi một lần mỗi địch.',
  'Tạm giảm sát thương, kháng choáng và cưỡng bức di chuyển; vẫn nhận sát thương.',
  'Tuyệt kỹ: giáng đất ánh kim diện rộng, lưu lại thủ thế cho bản thân.',
  'Chém rộng phía trước và làm chậm địch trúng đòn.',
  'Hào quang đi theo người thi triển, tăng phòng thủ cho đồng đội sống trong tầm; không cộng dồn.',
  'Chém mạnh, tạm giảm phòng thủ địch trúng đòn.',
  'Một nhịp hồi sinh lực cho bản thân và đồng đội sống trong tầm. Không hồi tượng, không hồi sinh.',
  'Tuyệt kỹ: sóng kim sắc rộng bay thẳng, tăng phòng thủ cho đồng đội gần lúc thi triển.',
];
export function addThieuLamProgression(d: ProgressionDefinition): void {
  d.schools['thieu_lam'] = {
    passiveId: 'dich_can_kinh',
    basicIds: ['thieu_lam_quyen', 'thieu_lam_dao'],
    base: {
      maxHp: 220,
      maxMana: 110,
      attackPower: 30,
      defense: 14,
      attackSpeed: 1,
      movementSpeed: 148,
      critChance: 0.06,
      critMultiplier: 1.5,
      manaRegen: 6,
      cooldownReduction: 0,
      hpRegen: 1.2,
    },
    growth: { maxHp: 10, maxMana: 2, attackPower: 1.6, defense: 0.4 },
    innate: { maxHp: 4, defense: 0.5, hpRegen: 0.12 },
    surplus: { maxHp: 6, defense: 0.6, hpRegen: 0.08 },
  };
  thieuLamSkills.forEach((base, i) => {
    const ultimate = i === 7 || i === 12;
    const gates = ultimate ? skillRankGates.ultimate : skillRankGates.standard;
    const ranks = gates.map((_, r) => {
      const a = abilitySchema.parse(base),
        e = a.effect;
      a.manaCost += r * (ultimate ? 3 : 1);
      a.cooldownTicks -= r * (ultimate ? 12 : 3);
      if (
        e.mode === 'arc' ||
        e.mode === 'projectile' ||
        e.mode === 'multi_hit'
      ) {
        e.damage += r * (ultimate ? 20 : e.mode === 'multi_hit' ? 3 : 8);
        e.range += r * (ultimate ? 10 : 4);
      }
      if (e.mode === 'arc')
        for (const s of e.statuses ?? []) {
          s.durationTicks += r * 15;
          s.magnitude += r * (s.kind === 'slow' ? 0.04 : 4);
        }
      if (a.combo?.step === 3) a.combo.multiplier += r * 0.15;
      for (const s of a.selfStatuses ?? []) {
        s.durationTicks += r * 15;
        if (s.kind === 'damage_reduction') s.magnitude += r * 0.04;
      }
      if (e.mode === 'support') {
        e.radius += r * 10;
        if (e.heal) e.heal += r * 12;
        else e.durationTicks += r * 30;
        for (const s of e.statuses ?? []) s.magnitude += r * 5;
      }
      if (a.allies) {
        a.allies.radius += r * 10;
        for (const s of a.allies.statuses ?? []) {
          s.durationTicks += r * 30;
          s.magnitude += r * 6;
        }
      }
      return a;
    });
    d.skills[base.id] = {
      id: base.id,
      schoolId: 'thieu_lam',
      style: i < 8 ? 'Quyền' : 'Đao',
      ultimate,
      descriptionVi: descriptions[i]!,
      levelGates: [...gates],
      ranks,
    };
  });
}
