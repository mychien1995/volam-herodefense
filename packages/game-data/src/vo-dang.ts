import type {
  Ability,
  ProjectileEffect,
  ProgressionDefinition,
} from '@volam/game-core';
import { abilitySchema } from './ability-schema.js';
import { skillRankGates } from './progression-data.js';
import { m3dFeedbackTuning } from './m3d-feedback-tuning.js';

/** M3C2 provisional tuning at 30Hz; all targeting uses facing/self/nearest at release. */
const swordQi: ProjectileEffect = {
  mode: 'projectile',
  damage: 20,
  speed: 390,
  range: 320,
  radius: 7,
  count: 1,
  spacingTicks: 0,
  splashRadius: 0,
  burnDamage: 0,
  burnTicks: 0,
};
export const voDangBasics: Record<string, Ability> = {
  vo_dang_quyen: {
    id: 'vo_dang_quyen',
    nameVi: 'Võ Đang Quyền',
    manaCost: 0,
    cooldownTicks: 0,
    basicPoseTicks: 8,
    basicCombo: [
      { stage: 'left_palm', damageMultiplier: 1 },
      { stage: 'right_palm', damageMultiplier: 1 },
    ],
    effect: {
      mode: 'arc',
      damage: 19,
      range: 80,
      halfAngle: Math.PI / 3,
      cleave: 0.2,
      knockback: 10,
      knockbackChance: m3dFeedbackTuning.basicKnockbackChance,
    },
  },
  vo_dang_kiem: {
    id: 'vo_dang_kiem',
    nameVi: 'Võ Đang Kiếm',
    manaCost: 0,
    cooldownTicks: 0,
    basicVariants: ['thrust', 'cut_left', 'cut_right', 'cut_down', 'cut_up'],
    basicPoseTicks: 6,
    effect: {
      mode: 'arc',
      damage: 27,
      range: 94,
      halfAngle: Math.PI / 3,
      cleave: 0.35,
      projectileProc: {
        chance: 0.25,
        effect: {
          ...swordQi,
          knockback: 10,
          knockbackChance: m3dFeedbackTuning.basicKnockbackChance,
        },
      },
    },
  },
};
export const voDangSkills: Ability[] = [
  {
    id: 'luong_nghi_thu',
    nameVi: 'Lưỡng Nghi Thủ',
    manaCost: 8,
    cooldownTicks: 42,
    effect: {
      ...swordQi,
      damage: 28,
      range: 240,
      radius: 14,
      useFacing: true,
      piercing: true,
      windupTicks: 5,
      recoveryTicks: 6,
      statuses: [
        { kind: 'slow', durationTicks: 90, magnitude: 0.25 },
        { kind: 'attack_break', durationTicks: 90, magnitude: 0.2 },
      ],
    },
  },
  {
    id: 'huyen_am_chuong',
    nameVi: 'Huyền Âm Chưởng',
    manaCost: 12,
    cooldownTicks: 105,
    effect: {
      ...swordQi,
      damage: 10,
      attackPowerScale: 0.3,
      range: 260,
      speed: 650,
      radius: 30,
      count: 2,
      spacingTicks: 5,
      windupTicks: 4,
      recoveryTicks: 11,
      useFacing: true,
      forwardOnly: true,
      piercing: true,
      knockback: 22,
      scatter: {
        count: 5,
        appearanceTicks: 12,
        delayTicks: 30,
        innerRadius: 63,
        outerRadius: 100,
        radius: 28,
        damage: 18,
        attackPowerScale: 0.4,
      },
    },
  },
  {
    id: 'duong_khi_kich',
    nameVi: 'Bói Toán Thiên Cơ',
    manaCost: 10,
    cooldownTicks: 240,
    effect: {
      mode: 'fortune',
      durationTicks: 150,
      cycleTicks: 5,
      buffTicks: 90,
      stunTicks: 60,
      healFraction: 0.12,
      manaFraction: 0.16,
      hpRegen: 6,
      manaRegen: 8,
      damageMultiplier: 0.15,
      critMultiplier: 0.25,
      movementSpeed: 0.12,
      lossFraction: 0.08,
      blastDamage: 30,
      blastRadius: 88,
    },
  },
  {
    id: 'thai_cuc_than_cong',
    nameVi: 'Thái Cực Thần Công',
    manaCost: 0,
    cooldownTicks: 1,
    effect: {
      mode: 'mana_shield',
      durationTicks: 180,
      absorbFraction: 1,
      manaPerDamage: 1.25,
      toggle: true,
    },
  },
  {
    id: 'thai_cuc_tran',
    nameVi: 'Thái Cực Trận',
    manaCost: 38,
    cooldownTicks: 480,
    effect: {
      mode: 'area',
      windupTicks: 24,
      durationTicks: 180,
      tickInterval: 30,
      radius: 192,
      damage: 24,
      confines: true,
      statuses: [
        { kind: 'slow', durationTicks: 35, magnitude: 0.35 },
        { kind: 'attack_slow', durationTicks: 35, magnitude: 0.2 },
      ],
    },
  },
  {
    id: 'that_tinh_kiem',
    nameVi: 'Thất Tinh Kiếm',
    manaCost: 18,
    cooldownTicks: 90,
    effect: {
      mode: 'multi_hit',
      range: 80,
      damage: 100 / 7,
      attackPowerScale: 4 / 7,
      hits: 7,
      spacingTicks: 6,
      finisherDamage: 0,
      finisherRange: 80,
      halfAngle: Math.PI / 3,
    },
  },
  {
    id: 'nhan_kiem_hop_nhat',
    nameVi: 'Nhân Kiếm Hợp Nhất',
    manaCost: 18,
    cooldownTicks: 120,
    effect: {
      ...swordQi,
      damage: 55,
      range: 540,
      speed: 180,
      blinkWindowTicks: 45,
      radius: 12,
      piercing: true,
      useFacing: true,
    },
  },
  {
    id: 'bat_quai_kiem_tran',
    nameVi: 'Bát Quái Kiếm Trận',
    manaCost: 26,
    cooldownTicks: 300,
    effect: {
      mode: 'area',
      durationTicks: 150,
      tickInterval: 25,
      radius: 105,
      damage: 22,
    },
  },
  {
    id: 'toa_sat_bac_do',
    nameVi: 'Tọa Sát Bác Đồ',
    manaCost: 14,
    cooldownTicks: 180,
    effect: {
      mode: 'guard_counter',
      durationTicks: 150,
      reduction: 0.7,
      thresholdFraction: 0.2,
      range: 110,
    },
  },
  {
    id: 'van_kiem_quy_tong',
    nameVi: 'Vạn Kiếm Quy Tông',
    manaCost: 42,
    cooldownTicks: 510,
    charges: 2,
    effect: {
      mode: 'area',
      damage: 108,
      radius: 76,
      durationTicks: 120,
      tickInterval: 120,
      skyfall: {
        range: 480,
        fallbackDistance: 210,
        halfAngle: Math.PI / 3,
        blades: 48,
        aimTicks: 24,
        riseTicks: 30,
        quietTicks: 15,
        firstFallTicks: 14,
        fallTicks: 45,
      },
    },
  },
];
const descriptions = [
  'Chưởng âm khí bay thẳng, làm chậm và giảm sát thương của địch trúng đòn.',
  'Hai đợt sóng đẩy lùi. Sau khi bắn, năm ấn âm dương phun mực sau 1 giây.',
  'Xoay tám quẻ trong 5 giây. Bấm lại để chốt quẻ đang hiện hoặc để hệ thống tự chốt khi hết giờ.',
  'Bật/tắt khiên dùng nội lực chịu sát thương; không phí bật và không hồi chiêu phụ. Thiếu nội lực nhận phần còn lại.',
  'Vận Thái Cực Quyền rồi mở trận Bát Quái tại chân. Quái và boss bị giữ trong trận, đồng đội đi xuyên.',
  'Bảy nhát kiếm liên tiếp trong cung phía trước; tổng sát thương gốc và hệ số lực công giữ ngân sách cũ.',
  'Kiếm bay chậm và xuyên địch, mỗi địch trúng một lần. Bấm lại cùng ô để hiện thân tại kiếm; kiếm lưu cuối tầm 1,5 giây.',
  'Kiếm trận cố định tại chỗ thi triển, gây sát thương theo nhịp lên địch trong trận.',
  'Thủ tối đa 5 giây, giảm 70% sát thương; tích lũy thực nhận sau giảm. Hết 5 giây hoặc vượt 20% máu tối đa thì phản tổng thực nhận ra xung quanh một lần khi còn sống.',
  'Chỉ kiếm về phía trước. Kiếm vút lên sau lưng, khuất một nhịp rồi đâm xuống tâm đã chốt, ưu tiên boss. Tích 2–5 lượt theo bậc.',
];
export function addVoDangProgression(d: ProgressionDefinition): void {
  d.schools['vo_dang'] = {
    passiveId: 'thai_cuc_tam_phap',
    basicIds: ['vo_dang_quyen', 'vo_dang_kiem'],
    base: {
      maxHp: 150,
      maxMana: 180,
      attackPower: 25,
      defense: 4,
      attackSpeed: 1,
      movementSpeed: 160,
      critChance: 0.08,
      critMultiplier: 1.5,
      manaRegen: 9,
      cooldownReduction: 0.08,
      hpRegen: 0,
    },
    growth: { maxHp: 7, maxMana: 3, attackPower: 1.7, defense: 0.2 },
    innate: { maxMana: 3, manaRegen: 0.15, cooldownReduction: 0.004 },
    surplus: { maxMana: 4, manaRegen: 0.25, cooldownReduction: 0.003 },
  };
  voDangSkills.forEach((base, i) => {
    const ultimate = i === 4 || i === 9;
    const gates = ultimate ? skillRankGates.ultimate : skillRankGates.standard;
    const ranks = gates.map((_, r) => {
      const a = abilitySchema.parse(base),
        e = a.effect;
      if (e.mode !== 'mana_shield' || !e.toggle) {
        a.manaCost += r * (ultimate ? 2 : 1);
        a.cooldownTicks -= r * (ultimate ? 12 : 3);
      }
      if (e.mode === 'arc' || e.mode === 'projectile') {
        e.damage +=
          r * (e.mode === 'projectile' && e.scatter ? 2 : ultimate ? 9 : 6);
        e.range += r * 5;
        for (const s of e.statuses ?? []) {
          s.magnitude += 0.03 * r;
          s.durationTicks += 10 * r;
        }
        if (e.manaRefund) e.manaRefund += 2 * r;
        if (e.mode === 'projectile' && e.scatter) e.scatter.damage += 4 * r;
      } else if (e.mode === 'fortune') {
        e.healFraction += 0.02 * r;
        e.manaFraction += 0.02 * r;
        e.blastDamage += 6 * r;
      } else if (e.mode === 'mana_shield') {
        e.durationTicks += 15 * r;
        e.absorbFraction = Math.min(1, e.absorbFraction + 0.05 * r);
        e.manaPerDamage -= 0.1 * r;
      } else if (e.mode === 'area') {
        e.damage += r * 5;
        e.radius += r * 8;
        if (e.skyfall) {
          a.charges = (base.charges ?? 2) + r;
          e.skyfall.range += r * 8;
        } else e.durationTicks += r * 30;
        for (const s of e.statuses ?? []) s.magnitude += r * 0.03;
      } else if (e.mode === 'guard_counter') {
        e.range += r * 5;
      } else if (e.mode === 'multi_hit') {
        e.damage += r * 5 * (base.id === 'that_tinh_kiem' ? 4 / 7 : 1);
        e.range += r * 4;
      }
      return a;
    });
    d.skills[base.id] = {
      id: base.id,
      schoolId: 'vo_dang',
      style: i < 5 ? 'Quyền' : 'Kiếm',
      ultimate,
      descriptionVi: descriptions[i]!,
      levelGates: [...gates],
      ranks,
    };
  });
}
