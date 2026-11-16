import { nguDoc } from '@volam/game-core';
import type {
  Ability,
  AreaEffect,
  DefaultBranch,
  ProgressionDefinition,
  ProjectileEffect,
} from '@volam/game-core';
import { skillRankGates } from './progression-data.js';

function bolt(
  damage: number,
  range: number,
  speed: number,
  radius: number,
  extras: Partial<ProjectileEffect> = {},
): ProjectileEffect {
  return {
    mode: 'projectile',
    damage,
    range,
    speed,
    radius,
    count: 1,
    spacingTicks: 0,
    splashRadius: 0,
    burnDamage: 0,
    burnTicks: 0,
    ...extras,
  };
}
const special = {
  mode: 'buff',
  durationTicks: 1,
  critChance: 0,
  critMultiplier: 0,
} as const;
function field(
  radius: number,
  damage: number,
  durationTicks: number,
  tickInterval: number,
  extras: Partial<AreaEffect> = {},
): AreaEffect {
  return {
    mode: 'area',
    radius,
    damage,
    durationTicks,
    tickInterval,
    ...extras,
  };
}
function skill(
  id: string,
  nameVi: string,
  manaCost: number,
  cooldownTicks: number,
  effect: Ability['effect'] = special,
): Ability {
  return { id, nameVi, manaCost, cooldownTicks, effect };
}

export const nguDocBasics = {
  [nguDoc.taiHiep]: {
    ...skill(nguDoc.taiHiep, 'Chưởng Ngũ Độc', 0, 18, bolt(23, 365, 520, 11)),
    basicPoseTicks: 9,
  },
  [nguDoc.coSu]: {
    ...skill(nguDoc.coSu, 'Đạn đầu lâu', 0, 19, bolt(20, 385, 575, 7)),
    basicPoseTicks: 9,
  },
};
export const nguDocSkills = [
  skill(nguDoc.palm, 'Ngũ Độc Chưởng', 0, 5),
  skill(
    nguDoc.pool,
    'Độc Sa Chưởng',
    16,
    190,
    field(85, 13, 120, 24, { nearestRange: 300, forwardOffset: 125 }),
  ),
  skill(
    nguDoc.aura,
    'Âm Tà Hấp Hồn Khí',
    0,
    6,
    field(102, 8, 30, 24, {
      followOwner: true,
      statuses: [{ kind: 'slow', durationTicks: 28, magnitude: 0.16 }],
    }),
  ),
  skill(nguDoc.counter, 'Vô Hình Độc', 0, 0),
  skill(
    nguDoc.hands,
    'Âm Phong Thực Cốt',
    31,
    420,
    field(180, 58, 150, 18, {
      oncePerTarget: true,
      nearestRange: 290,
      forwardOffset: 120,
      windupTicks: 9,
    }),
  ),
  skill(
    nguDoc.worms,
    'Vạn Cổ Thực Thiên',
    14,
    128,
    bolt(20, 365, 450, 9, {
      count: 4,
      spreadAngle: 0.48,
      splashRadius: 37,
      oncePerCast: true,
      attackPowerScale: 0.43,
    }),
  ),
  skill(nguDoc.jiangshi, 'Yêu Cổ', 21, 270),
  skill(
    nguDoc.mark,
    'Tâm Hình Cổ',
    18,
    230,
    bolt(1, 375, 490, 9, { attackPowerScale: 0 }),
  ),
  skill(nguDoc.zombie, 'Vô Hình Ma Cổ', 0, 0),
  skill(nguDoc.reaper, 'Thi Quỷ Phong Tận', 36, 620),
] as const;

export const nguDocBranches: Record<string, DefaultBranch> = {
  [nguDoc.taiHiep]: {
    schoolId: nguDoc.school,
    style: 'Tà Hiệp',
    skillIds: nguDocSkills.slice(0, 4).map((a) => a.id),
  },
  [nguDoc.coSu]: {
    schoolId: nguDoc.school,
    style: 'Cổ Sư',
    skillIds: nguDocSkills.slice(5, 9).map((a) => a.id),
  },
};
const descriptions = [
  'Bật hoặc tắt độc trên đòn chưởng thường. Khi bật, đòn trúng làm chậm nhẹ và gây độc theo thời gian.',
  'Đặt một bãi khói độc cố định vào địch trong tầm, ưu tiên boss. Khi trống, đặt về trước mặt.',
  'Bật hoặc tắt vòng độc đi theo bản thân, gây độc và làm chậm địch trong vùng.',
  'Nội tại. Tăng nhẹ phòng thủ. Đòn trực tiếp nhận từ địch khiến kẻ đánh bị độc và làm chậm.',
  'Bàn tay độc trồi lên trong vùng khói 5 giây, gây sát thương một lần mỗi mục tiêu rồi để lại độc.',
  'Bắn một loạt sâu cổ về trước, ưu tiên hướng boss. Sâu nổ lan khi chạm.',
  'Gọi 1–4 cương thi theo bậc. Máu và sát thương tăng theo bậc, ưu tiên địch chủ đang đánh.',
  'Trùng huyết bám khi trúng. Sau 3 giây nổ lan, gây choáng, hồi máu và bay về. Trùng cũng bay về khi mục tiêu chết hoặc đạn đi hết tầm.',
  'Nội tại của A. Có xác suất gọi zombie. Máu và sát thương zombie tăng theo bậc.',
  'Chạm đất gọi Thần Chết. Đòn quét làm chậm, có sóng độc và bổ hái gây choáng. Thần Chết còn sống theo chủ qua phó bản và về đấu trường.',
];

export function addNguDocProgression(progression: ProgressionDefinition): void {
  progression.schools[nguDoc.school] = {
    passiveId: nguDoc.innate,
    basicIds: [nguDoc.taiHiep, nguDoc.coSu],
    base: {
      maxHp: 164,
      maxMana: 108,
      attackPower: 25,
      defense: 3,
      attackSpeed: 1,
      movementSpeed: 154,
      critChance: 0.06,
      critMultiplier: 1.5,
      manaRegen: 5.8,
      cooldownReduction: 0,
      hpRegen: 1.2,
    },
    growth: { maxHp: 8, maxMana: 3, attackPower: 2.1, defense: 0.15 },
    innate: { maxHp: 2, hpRegen: 0.13, manaRegen: 0.19 },
    surplus: {},
  };
  nguDocSkills.forEach((ability, i) => {
    const ultimate = i % 5 === 4;
    const levelGates = ultimate
      ? skillRankGates.ultimate
      : skillRankGates.standard;
    progression.skills[ability.id] = {
      id: ability.id,
      schoolId: nguDoc.school,
      style: i < 5 ? 'Tà Hiệp' : 'Cổ Sư',
      ultimate,
      levelGates,
      descriptionVi: descriptions[i]!,
      ranks: levelGates.map((_, rank) => {
        const effect = ability.effect;
        if (effect.mode === 'area')
          return {
            ...ability,
            effect: {
              ...effect,
              damage: effect.damage + rank * (ultimate ? 13 : 3),
            },
          };
        if (effect.mode === 'projectile' && ability.id === nguDoc.worms)
          return {
            ...ability,
            effect: { ...effect, damage: effect.damage + rank * 4 },
          };
        return ability;
      }),
    };
  });
}
