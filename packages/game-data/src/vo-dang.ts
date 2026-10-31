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
    cooldownTicks: 13,
    effect: {
      mode: 'arc',
      damage: 19,
      range: 50,
      halfAngle: Math.PI / 3,
      cleave: 0.2,
    },
  },
  vo_dang_kiem: {
    id: 'vo_dang_kiem',
    nameVi: 'Võ Đang Kiếm',
    manaCost: 0,
    cooldownTicks: 18,
    effect: {
      mode: 'arc',
      damage: 27,
      range: 62,
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
    cooldownTicks: 60,
    effect: {
      mode: 'arc',
      damage: 28,
      range: 64,
      halfAngle: Math.PI / 3,
      cleave: 0.5,
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
      range: 170,
      speed: 300,
      radius: 22,
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
    cooldownTicks: 75,
    effect: {
      mode: 'arc',
      damage: 34,
      range: 60,
      halfAngle: Math.PI / 3,
      cleave: 0.4,
      manaRefund: 7,
    },
  },
  {
    id: 'thai_cuc_than_cong',
    nameVi: 'Thái Cực Thần Công',
    manaCost: 12,
    cooldownTicks: 270,
    effect: {
      mode: 'mana_shield',
      durationTicks: 180,
      absorbFraction: 0.8,
      manaPerDamage: 1.25,
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
      mode: 'counter',
      durationTicks: 45,
      damage: 72,
      range: 110,
      evade: false,
    },
  },
  {
    id: 'van_kiem_quy_tong',
    nameVi: 'Vạn Kiếm Quy Tông',
    manaCost: 42,
    cooldownTicks: 510,
    effect: {
      ...swordQi,
      damage: 54,
      range: 460,
      radius: 20,
      count: 5,
      spacingTicks: 3,
      spreadAngle: Math.PI / 3,
      useFacing: true,
      piercing: true,
    },
  },
];
const descriptions = [
  'Chưởng nhanh ít hao nội lực, tạm giảm lực công kích của địch trúng đòn.',
  'Sóng âm bay thẳng tầm ngắn; giảm riêng tốc độ di chuyển và tốc độ đánh.',
  'Chưởng cận chiến; hoàn nội lực một lần khi trúng ít nhất một địch, không hoàn khi hụt.',
  'Khiên có thời hạn: dùng nội lực hấp thụ sát thương; nội lực cạn thì nhận phần còn lại.',
  'Tuyệt kỹ: trận âm dương cố định tại chỗ thi triển, gây sát thương và làm chậm theo nhịp.',
  'Bốn nhát kiếm mạnh liên tiếp trong cung phía trước.',
  'Kiếm khí bay thẳng theo hướng nhìn, xuyên nhiều địch nhưng mỗi địch chỉ trúng một lần.',
  'Kiếm trận cố định tại chỗ thi triển, gây sát thương theo nhịp lên địch trong trận.',
  'Thế phản kích ngắn: nhận đòn rồi phản chém một lần khi còn sống và địch trong tầm.',
  'Tuyệt kỹ: năm luồng kiếm khí xuyên thấu theo hình quạt phía trước, không truy đuổi.',
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
      a.manaCost += r * (ultimate ? 2 : 1);
      a.cooldownTicks -= r * (ultimate ? 12 : 3);
      if (e.mode === 'arc' || e.mode === 'projectile') {
        e.damage += r * (ultimate ? 9 : 6);
        e.range += r * 5;
        for (const s of e.statuses ?? []) {
          s.magnitude += 0.03 * r;
          s.durationTicks += 10 * r;
        }
        if (e.mode === 'arc' && e.manaRefund) e.manaRefund += 2 * r;
      } else if (e.mode === 'mana_shield') {
        e.durationTicks += 15 * r;
        e.absorbFraction += 0.05 * r;
        e.manaPerDamage -= 0.1 * r;
      } else if (e.mode === 'area') {
        e.damage += r * 5;
        e.radius += r * 8;
        e.durationTicks += r * 30;
        for (const s of e.statuses ?? []) s.magnitude += r * 0.03;
      } else if (e.mode === 'counter') {
        e.damage += r * 12;
        e.durationTicks += r * 5;
        e.range += r * 5;
      } else if (e.mode === 'multi_hit') {
        e.damage += r * 5;
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
