import type {
  Ability,
  ProjectileEffect,
  ProgressionDefinition,
} from '@volam/game-core';
import { abilitySchema } from './ability-schema.js';
import { skillRankGates } from './progression-data.js';

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
    cooldownTicks: 9,
    minIntervalTicks: 5,
    basicCombo: [
      { stage: 'left_palm', damageMultiplier: 1 },
      { stage: 'right_palm', damageMultiplier: 1 },
    ],
    effect: {
      mode: 'arc',
      damage: 19,
      range: 65,
      halfAngle: Math.PI / 3,
      cleave: 0.2,
      knockback: 10,
    },
  },
  vo_dang_kiem: {
    id: 'vo_dang_kiem',
    nameVi: 'Võ Đang Kiếm',
    manaCost: 0,
    cooldownTicks: 12,
    minIntervalTicks: 5,
    effect: {
      mode: 'arc',
      damage: 27,
      range: 78,
      halfAngle: Math.PI / 3,
      cleave: 0.35,
      projectileProc: { chance: 0.25, effect: swordQi },
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
      statuses: [{ kind: 'attack_break', durationTicks: 90, magnitude: 0.2 }],
    },
  },
  {
    id: 'huyen_am_chuong',
    nameVi: 'Huyền Âm Chưởng',
    manaCost: 12,
    cooldownTicks: 105,
    effect: {
      ...swordQi,
      damage: 30,
      range: 260,
      speed: 300,
      radius: 30,
      useFacing: true,
      piercing: true,
      statuses: [
        { kind: 'slow', durationTicks: 90, magnitude: 0.3 },
        { kind: 'attack_slow', durationTicks: 90, magnitude: 0.25 },
      ],
    },
  },
  {
    id: 'duong_khi_kich',
    nameVi: 'Dương Khí Kích',
    manaCost: 10,
    cooldownTicks: 48,
    effect: {
      ...swordQi,
      damage: 34,
      range: 220,
      radius: 16,
      useFacing: true,
      piercing: true,
      manaRefund: 7,
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
      durationTicks: 180,
      tickInterval: 30,
      radius: 125,
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
    cooldownTicks: 135,
    effect: {
      mode: 'multi_hit',
      range: 80,
      damage: 25,
      hits: 4,
      spacingTicks: 5,
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
      range: 420,
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
    effect: {
      mode: 'multi_hit',
      damage: 0,
      range: 1,
      hits: 13,
      spacingTicks: 12,
      durationTicks: 150,
      finisherDamage: 0,
      finisherRange: 1,
      projectileBurst: {
        ...swordQi,
        damage: 54,
        range: 460,
        radius: 20,
        count: 8,
        spacingTicks: 0,
        radial: true,
        useFacing: true,
        piercing: true,
      },
    },
  },
];
const descriptions = [
  'Âm dương bay thẳng, tạm giảm lực công kích của địch trúng đòn.',
  'Sóng âm lớn bay thẳng; giảm riêng tốc độ di chuyển và tốc độ đánh.',
  'Khí chưởng bay thẳng; hoàn nội lực một lần khi trúng, không hoàn khi hụt.',
  'Bật/tắt khiên dùng nội lực chịu sát thương; không phí bật và không hồi chiêu phụ. Thiếu nội lực nhận phần còn lại.',
  'Tuyệt kỹ: trận âm dương cố định, sát thương theo nhịp; địch không vượt biên, vẫn di chuyển và đánh bên trong; địch miễn cưỡng chế được thoát.',
  'Bốn nhát kiếm mạnh liên tiếp trong cung phía trước.',
  'Kiếm khí bay thẳng theo hướng nhìn, xuyên nhiều địch nhưng mỗi địch chỉ trúng một lần.',
  'Kiếm trận cố định tại chỗ thi triển, gây sát thương theo nhịp lên địch trong trận.',
  'Thủ tối đa 5 giây, giảm 70% sát thương; tích lũy thực nhận sau giảm. Hết 5 giây hoặc vượt 20% máu tối đa thì phản tổng thực nhận ra xung quanh một lần khi còn sống.',
  'Tuyệt kỹ: liên tục phóng kiếm thẳng tám hướng quanh người trong 5 giây, không truy đuổi.',
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
        e.damage += r * (ultimate ? 9 : 6);
        e.range += r * 5;
        for (const s of e.statuses ?? []) {
          s.magnitude += 0.03 * r;
          s.durationTicks += 10 * r;
        }
        if (e.manaRefund) e.manaRefund += 2 * r;
      } else if (e.mode === 'mana_shield') {
        e.durationTicks += 15 * r;
        e.absorbFraction = Math.min(1, e.absorbFraction + 0.05 * r);
        e.manaPerDamage -= 0.1 * r;
      } else if (e.mode === 'area') {
        e.damage += r * 5;
        e.radius += r * 8;
        e.durationTicks += r * 30;
        for (const s of e.statuses ?? []) s.magnitude += r * 0.03;
      } else if (e.mode === 'guard_counter') {
        e.range += r * 5;
      } else if (e.mode === 'multi_hit') {
        if (base.id === 'van_kiem_quy_tong' && e.projectileBurst) {
          e.projectileBurst.damage += r * 9;
          e.projectileBurst.range += r * 5;
        } else {
          e.damage += r * 5;
          e.range += r * 4;
        }
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
