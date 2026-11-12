import type {
  Ability,
  ArcEffect,
  ComboSpec,
  ProgressionDefinition,
  StatusSpec,
  ProjectileEffect,
} from '@volam/game-core';
import { abilitySchema } from './ability-schema.js';
import { caiBangChuongBasicTuning } from './cai-bang.js';
import { skillRankGates } from './progression-data.js';
import { m3dFeedbackTuning } from './m3d-feedback-tuning.js';
const tuning = m3dFeedbackTuning.shaolin;
const projectile = (p: {
  damage: number;
  range: number;
  radius: number;
  speed: number;
}): ProjectileEffect => ({
  mode: 'projectile',
  damage: p.damage,
  range: p.range,
  radius: p.radius,
  speed: p.speed,
  count: 1,
  spacingTicks: 0,
  splashRadius: 0,
  burnDamage: 0,
  burnTicks: 0,
  piercing: true,
});

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
    cooldownTicks: 0,
    manualChain: {
      idleTicks: tuning.chainIdleTicks,
      cooldownTicks: tuning.chainCooldownTicks,
      finisherProjectile: projectile(tuning.finisher),
    },
    basicCombo: [
      { stage: 'left_fist', damageMultiplier: 1 },
      { stage: 'right_fist', damageMultiplier: 1 },
      { stage: 'front_kick', damageMultiplier: 1 },
      {
        stage: 'roundhouse_kick',
        damageMultiplier: 1,
        halfAngle: Math.PI * 0.75,
      },
    ],
    effect: arc(38, 70, 0.25, Math.PI / 4),
  },
  thieu_lam_dao: {
    id: 'thieu_lam_dao',
    nameVi: 'Thiếu Lâm Đao',
    manaCost: 0,
    cooldownTicks: caiBangChuongBasicTuning.cooldownTicks,
    minIntervalTicks: caiBangChuongBasicTuning.minIntervalTicks,
    effect: {
      ...projectile({
        damage: 38,
        range: caiBangChuongBasicTuning.range,
        radius: 10,
        speed: 310,
      }),
      piercing: false,
    },
  },
};
export const thieuLamSkills: Ability[] = [
  {
    id: 'la_han_quyen',
    nameVi: 'La Hán Quyền',
    manaCost: 10,
    cooldownTicks: 75,
    effect: arc(40, tuning.laHanRange),
    selfStatuses: [guard(0.15, 45)],
    combo: chain('phat_dong_a', 1),
  },
  {
    id: 'vi_da_quyen',
    nameVi: 'Vi Đà Quyền',
    manaCost: 12,
    cooldownTicks: 90,
    effect: {
      ...arc(51, 68),
      originStartOffset: tuning.viDaStartOffset,
      originOffset: 189,
      statuses: [
        { kind: 'defense_break', magnitude: 12, durationTicks: 120 },
        { kind: 'stun', magnitude: 1, durationTicks: 60 },
      ],
    },
    combo: chain('phat_dong_a', 2),
  },
  {
    id: 'dai_luc_kim_cuong_chuong',
    nameVi: 'Đại Lực Kim Cương Chưởng',
    manaCost: 20,
    cooldownTicks: 150,
    effect: {
      ...projectile(tuning.diamondPalm),
      count: 3,
      spacingTicks: tuning.diamondPalm.laneDelayTicks,
      laneOffsets: [...tuning.diamondPalm.lanes],
      windupTicks: tuning.diamondPalm.windupTicks,
      comboEmpoweredRadius: tuning.diamondPalm.empoweredRadius,
      forwardOnly: true,
      oncePerCast: true,
    },
    combo: chain('phat_dong_a', 3),
  },
  {
    id: 'toan_phong_thoai',
    nameVi: 'Toàn Phong Thoái',
    manaCost: 12,
    cooldownTicks: 90,
    effect: projectile(tuning.tornado),
    combo: chain('phat_dong_b', 1, 2),
  },
  {
    id: 'hoanh_tao_cuoc',
    nameVi: 'Ca Diệp Thoái',
    manaCost: 14,
    cooldownTicks: 105,
    effect: {
      ...projectile(tuning.earthSpike),
      windupTicks: tuning.earthSpike.windupTicks,
      recoveryTicks: tuning.earthSpike.recoveryTicks,
      statuses: [
        {
          kind: 'stun',
          magnitude: 1,
          durationTicks: tuning.earthSpike.stunTicks,
        },
      ],
    },
    combo: chain('phat_dong_b', 2, 2),
  },
  {
    id: 'vo_anh_cuoc',
    nameVi: 'Vô Ảnh Cước',
    manaCost: 24,
    cooldownTicks: 180,
    effect: {
      ...projectile(tuning.footForce),
      count: 3,
      spacingTicks: tuning.footForce.laneDelayTicks,
      laneOffsets: [...tuning.footForce.lanes],
      useFacing: true,
      forwardOnly: true,
      oncePerCast: true,
      comboDash: { mode: 'dash', ...tuning.footForce.dash, stunTicks: 0 },
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
    effect: {
      ...arc(120, tuning.skyPalm.range, 1, Math.PI),
      windupTicks: 15,
      residualArea: {
        mode: 'area',
        radius: tuning.skyPalm.fieldRadius,
        damage: tuning.skyPalm.fieldDamage,
        durationTicks: tuning.skyPalm.fieldDurationTicks,
        tickInterval: 1,
        oncePerTarget: true,
      },
    },
    selfStatuses: [guard(0.25, 150)],
  },
  {
    id: 'tru_ta',
    nameVi: 'Tru Tà',
    manaCost: 12,
    cooldownTicks: 90,
    effect: {
      ...arc(42, tuning.exorcismRange, 0.85, Math.PI * 0.65),
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
    nameVi: 'Sư Tử Hống',
    manaCost: 18,
    cooldownTicks: 135,
    effect: {
      ...arc(62, tuning.roar.range, 1, Math.PI),
      windupTicks: 6,
      durationTicks: 30,
      statuses: [
        { kind: 'defense_break', magnitude: 20, durationTicks: 180 },
        { kind: 'slow', magnitude: tuning.roar.slow, durationTicks: 90 },
      ],
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
      mode: 'area',
      damage: 100,
      durationTicks: 450,
      tickInterval: 30,
      radius: 360,
      followOwner: true,
      volley: { speed: 300, projectileRadius: 12 },
    },
    allies: { radius: 170, statuses: [armor(30, 180)] },
  },
];
const descriptions = [
  'Đấm xa về phía trước, thủ thế ngắn. Phát Động A bước 1 trên từng địch trúng đòn, kể cả đòn lan.',
  'Đấm phá thủ và gây choáng 2 giây. Phát Động A bước 2 chỉ tiếp nối La Hán Quyền trên cùng địch.',
  'Phóng ba bàn tay khí lần lượt trên, giữa, dưới. Phát Động A: La Hán → Vi Đà → Đại Lực trên cùng địch trong 6s để phóng một bàn tay lớn.',
  'Lốc vàng bay thẳng xuyên địch, mỗi địch một lần. Phát Động B bước 1.',
  'Dậm chân tại chỗ, ụ đất chạy thẳng gây sát thương và choáng mọi địch trên đường. Phát Động B bước 2.',
  'Thường phóng ba bàn chân lần lượt trên, giữa, dưới. Phát Động B: Toàn Phong → Ca Diệp → Vô Ảnh trên cùng mục tiêu trong 6s để lướt đá bay.',
  'Tạm giảm sát thương, kháng choáng và cưỡng bức di chuyển; vẫn nhận sát thương.',
  'Tuyệt kỹ: Phật sau lưng, thiên chưởng diện rộng, lưu chữ Phạn gây sát thương một lần mỗi địch bước vào. Bản thân giữ thủ thế.',
  'La Hán quét trường đao trong cung trước mặt và làm chậm địch trúng đòn.',
  'Hào quang đi theo người thi triển, tăng phòng thủ cho đồng đội sống trong tầm; không cộng dồn.',
  'Sư tử hống quanh người gây sát thương, giảm giáp và làm chậm diện rộng.',
  'Một nhịp hồi sinh lực cho bản thân và đồng đội sống trong tầm. Không hồi tượng, không hồi sinh.',
  'Tuyệt kỹ: hiện Phật quang sau lưng trong 15 giây, liên tục phóng đao khí về phía mọi kẻ địch trong tầm. Tăng phòng thủ cho đồng đội gần lúc thi triển.',
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
        if (e.mode === 'projectile' && e.comboDash) {
          e.damage += r * 3;
          e.comboDash.damage += r * 18;
        } else e.damage += r * (ultimate ? 20 : e.mode === 'multi_hit' ? 3 : 8);
        e.range += r * (ultimate ? 10 : 4);
      }
      if (e.mode === 'arc' || e.mode === 'projectile')
        for (const s of e.statuses ?? []) {
          if (a.id !== 'vi_da_quyen' || s.kind !== 'stun')
            s.durationTicks += r * 15;
          if (s.kind !== 'stun')
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
      if (e.mode === 'area' && e.volley) {
        e.damage += r * 20;
        e.radius += r * 10;
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
