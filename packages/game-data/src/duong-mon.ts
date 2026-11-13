import {
  duongMon,
  type Ability,
  type ProgressionDefinition,
  type ProjectileEffect,
  type StatusSpec,
} from '@volam/game-core';
import { skillRankGates } from './progression-data.js';

const slow: StatusSpec = { kind: 'slow', durationTicks: 45, magnitude: 0.3 };
const shot: ProjectileEffect = {
  mode: 'projectile',
  damage: 22,
  speed: 550,
  range: 280,
  radius: 8,
  count: 1,
  spacingTicks: 0,
  splashRadius: 0,
  burnDamage: 0,
  burnTicks: 0,
};
const buff = {
  mode: 'buff',
  durationTicks: 1,
  critChance: 0,
  critMultiplier: 0,
} as const;
export const duongMonBasics: Record<string, Ability> = {
  [duongMon.coQuan]: {
    id: duongMon.coQuan,
    nameVi: 'Cơ Quan',
    cooldownTicks: 18,
    basicPoseTicks: 9,
    manaCost: 0,
    effect: shot,
  },
  [duongMon.amKhi]: {
    id: duongMon.amKhi,
    nameVi: 'Ám Khí',
    cooldownTicks: 18,
    basicPoseTicks: 9,
    manaCost: 0,
    effect: { ...shot, speed: 690, statuses: [slow] },
  },
};
const coQuan: Ability[] = [
  {
    id: duongMon.arrows,
    nameVi: 'Truy Tâm Tụ Tiễn',
    manaCost: 14,
    cooldownTicks: 120,
    effect: {
      ...shot,
      damage: 20,
      count: 3,
      radius: 6,
      laneOffsets: [-18, 0, 18],
      oncePerCast: true,
      statuses: [slow],
    },
  },
  {
    id: duongMon.flight,
    nameVi: 'Thiết Dực Hoành Không',
    manaCost: 0,
    cooldownTicks: 0,
    effect: { ...buff, movementSpeed: 0.55 },
    selfStatuses: [{ kind: 'hp_regen_buff', durationTicks: 1, magnitude: 5 }],
  },
  {
    id: duongMon.laser,
    nameVi: 'Lưu Tinh Trục Nguyệt',
    manaCost: 23,
    cooldownTicks: 195,
    effect: {
      ...shot,
      damage: 54,
      speed: 18000,
      radius: 12,
      range: 430,
      useFacing: true,
      windupTicks: 13,
      recoveryTicks: 6,
      piercing: true,
      statuses: [slow],
    },
  },
  {
    id: duongMon.shell,
    nameVi: 'Thiên Cơ Thiết Dực',
    manaCost: 24,
    cooldownTicks: 300,
    effect: { ...buff, durationTicks: 75 },
    selfStatuses: [
      { kind: 'duong_mon_shell', durationTicks: 75, magnitude: 1 },
      { kind: 'hp_regen_buff', durationTicks: 75, magnitude: 11 },
    ],
  },
  {
    id: duongMon.flowers,
    nameVi: 'Mãn Thiên Hoa Vũ',
    manaCost: 40,
    cooldownTicks: 1050,
    effect: {
      ...shot,
      damage: 15,
      scatter: {
        count: 20,
        appearanceTicks: 9,
        delayTicks: 37,
        innerRadius: 74,
        outerRadius: 245,
        radius: 42,
        damage: 36,
        attackPowerScale: 0.4,
      },
    },
  },
];
const amKhi: Ability[] = [
  {
    id: duongMon.trap,
    nameVi: 'Địa Diệm Hỏa',
    manaCost: 9,
    cooldownTicks: 240,
    charges: 3,
    effect: {
      mode: 'area',
      damage: 34,
      radius: 58,
      durationTicks: 900,
      tickInterval: 900,
      forwardOffset: 36,
      statuses: [{ kind: 'stun', durationTicks: 30, magnitude: 1 }],
    },
  },
  {
    id: duongMon.knives,
    nameVi: 'Cửu Cung Phi Tinh',
    manaCost: 19,
    cooldownTicks: 165,
    effect: {
      ...shot,
      damage: 13,
      attackPowerScale: 0.25,
      count: 6,
      spacingTicks: 3,
      useFacing: true,
    },
  },
  {
    id: duongMon.evade,
    nameVi: 'Nhiếp Hồn Nguyệt Ảnh',
    manaCost: 24,
    cooldownTicks: 270,
    effect: {
      mode: 'dash',
      speed: 560,
      distance: 124,
      damage: 0,
      radius: 12,
      stunTicks: 0,
      invulnerable: true,
    },
  },
  {
    id: duongMon.elements,
    nameVi: 'Ngũ hành cách thể thuật',
    manaCost: 0,
    cooldownTicks: 0,
    effect: buff,
  },
  {
    id: duongMon.storm,
    nameVi: 'Bạo vũ lê hoa châm',
    manaCost: 42,
    cooldownTicks: 1050,
    effect: {
      ...shot,
      damage: 16,
      useFacing: true,
      spreadAngle: Math.PI / 2,
      attackPowerScale: 0.18,
    },
  },
];
export const duongMonSkills = [...coQuan, ...amKhi];
export const duongMonBranches = {
  [duongMon.coQuan]: {
    schoolId: duongMon.school,
    style: 'Cơ Quan',
    skillIds: coQuan.slice(0, 4).map((s) => s.id),
  },
  [duongMon.amKhi]: {
    schoolId: duongMon.school,
    style: 'Ám Khí',
    skillIds: amKhi.slice(0, 4).map((s) => s.id),
  },
};
const descriptions = [
  'Bắn ba mũi tên song song gây chậm.',
  'Bật hoặc tắt cánh. Khi bay, tăng tốc và hồi máu, miễn choáng và làm chậm. Duy trì tốn nội lực.',
  'Tụ lực rồi phóng tia laze thẳng, làm chậm mục tiêu trúng.',
  'Dừng tại chỗ, bọc cánh, hồi máu và miễn sát thương.',
  'Rải 20 hoa thép ở các vị trí thay đổi. Các hoa cùng nổ và văng kim.',
  'Đặt bẫy chỉ mình thấy, gây nổ và choáng khi địch bước vào. Có ba lượt.',
  'Phóng sáu phi đao liên tiếp theo hướng nhìn.',
  'Lướt tới, miễn sát thương khi lướt và trong hai giây sau khi dừng.',
  'Nội tại của A. Băng châm ở giữa. Mỗi bậc thêm một mũi Mộc, Kim, Thổ hoặc Hỏa vào quạt.',
  'Ba pha. Chín phi đao gây chậm, 90 phi đao độc, rồi quạt băng châm.',
];
export function addDuongMonProgression(progression: ProgressionDefinition) {
  progression.schools[duongMon.school] = {
    passiveId: duongMon.passive,
    basicIds: [duongMon.coQuan, duongMon.amKhi],
    base: {
      maxHp: 153,
      maxMana: 112,
      attackPower: 25,
      defense: 2,
      attackSpeed: 1,
      movementSpeed: 160,
      critChance: 0.08,
      critMultiplier: 1.5,
      manaRegen: 6,
      cooldownReduction: 0,
      hpRegen: 1,
    },
    growth: { maxHp: 8, maxMana: 3, attackPower: 2, defense: 0.15 },
    innate: { manaRegen: 0.1, hpRegen: 0.06, critChance: 0.0015 },
    surplus: {},
  };
  duongMonSkills.forEach((ability, index) => {
    const ultimate = index % 5 === 4;
    const levelGates = ultimate
      ? skillRankGates.ultimate
      : skillRankGates.standard;
    progression.skills[ability.id] = {
      id: ability.id,
      schoolId: duongMon.school,
      style: index < 5 ? 'Cơ Quan' : 'Ám Khí',
      ultimate,
      levelGates,
      descriptionVi: descriptions[index]!,
      ranks: levelGates.map((_, rank) => rankDuongMonAbility(ability, rank)),
    };
  });
}

function rankDuongMonAbility(ability: Ability, rank: number): Ability {
  if (rank === 0) return ability;
  const effect = ability.effect;
  if (effect.mode === 'buff') {
    if (ability.id === duongMon.flight)
      return {
        ...ability,
        effect: {
          ...effect,
          movementSpeed: (effect.movementSpeed ?? 0) + rank * 0.03,
        },
      };
    if (ability.id === duongMon.shell)
      return {
        ...ability,
        selfStatuses: ability.selfStatuses?.map((spec) =>
          spec.kind === 'hp_regen_buff'
            ? { ...spec, magnitude: spec.magnitude + rank * 2 }
            : spec,
        ),
      };
  }
  if (effect.mode === 'dash')
    return {
      ...ability,
      effect: { ...effect, distance: effect.distance + rank * 8 },
    };
  if ('damage' in effect && effect.damage > 0) {
    if (effect.mode === 'projectile' && effect.scatter)
      return {
        ...ability,
        effect: {
          ...effect,
          scatter: {
            ...effect.scatter,
            damage: effect.scatter.damage + rank * 6,
          },
        },
      };
    return {
      ...ability,
      effect: { ...effect, damage: effect.damage + rank * 3 },
    };
  }
  return ability;
}
