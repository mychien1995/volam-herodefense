import {
  conLuan,
  type Ability,
  type AreaEffect,
  type ProjectileEffect,
  type ProgressionDefinition,
  type StatusSpec,
} from '@volam/game-core';
import { skillRankGates } from './progression-data.js';

const stun = (durationTicks: number): StatusSpec => ({
  kind: 'stun',
  durationTicks,
  magnitude: 1,
});
const shot: ProjectileEffect = {
  mode: 'projectile',
  damage: 27,
  speed: 560,
  range: 226,
  radius: 9,
  count: 1,
  spacingTicks: 0,
  splashRadius: 0,
  burnDamage: 0,
  burnTicks: 0,
};
const area: AreaEffect = {
  mode: 'area',
  damage: 0,
  radius: 68,
  durationTicks: 1,
  tickInterval: 1,
};
const buff = {
  mode: 'buff',
  durationTicks: 1,
  critChance: 0,
  critMultiplier: 0,
} as const;
const basicCooldown = { cooldownTicks: 20, basicPoseTicks: 9, manaCost: 0 };
const chaosTicks = 300;
const chaosTicksPerRank = 60;
const starScale = 1.2;
const detonationDamageMultiplier = 1.3;
const stunTicksPerRank = 3;

export const conLuanBasics: Record<string, Ability> = {
  [conLuan.monk]: {
    ...basicCooldown,
    cooldownTicks: 0,
    id: conLuan.monk,
    nameVi: 'Côn Luân Thiền Sư',
    basicCombo: [
      { stage: 'thrust', damageMultiplier: 1, halfAngle: Math.PI / 5 },
      { stage: 'sweep', damageMultiplier: 1, halfAngle: Math.PI / 2 },
      { stage: 'rising', damageMultiplier: 1.05, halfAngle: Math.PI / 3 },
      { stage: 'overhead', damageMultiplier: 1.2, halfAngle: Math.PI / 4 },
    ],
    effect: {
      mode: 'arc',
      damage: 26,
      range: 105,
      halfAngle: Math.PI / 3,
      cleave: 0.5,
    },
  },
  [conLuan.sword]: {
    ...basicCooldown,
    id: conLuan.sword,
    nameVi: 'Côn Luân Kiếm Tôn',
    basicCombo: Array.from({ length: 7 }, (_, i) => ({
      stage: i === 6 ? 'sword' : 'orb',
      damageMultiplier: i === 6 ? 1.5 : 1,
      splashRadius: i === 6 ? 42 : 0,
    })),
    effect: shot,
  },
};

const monkSkills: Ability[] = [
  {
    id: conLuan.stance,
    nameVi: 'Ngũ Lôi Chính Pháp',
    cooldownTicks: 6,
    manaCost: 0,
    basicDamageBonus: 4,
    effect: buff,
  },
  {
    id: conLuan.slam,
    nameVi: 'Cuồng Lôi Chấn Địa',
    cooldownTicks: 135,
    manaCost: 19,
    effect: {
      ...area,
      radius: 65,
      damage: 42,
      windupTicks: 4,
      forwardOffset: 35,
      statuses: [stun(60)],
    },
  },
  {
    id: conLuan.ring,
    nameVi: 'Ngũ Lôi Chính Pháp',
    cooldownTicks: 180,
    manaCost: 24,
    effect: {
      ...area,
      radius: 150,
      radiusY: 83,
      damage: 31,
      durationTicks: 15,
      expandTicks: 14,
      oncePerTarget: true,
      statuses: [{ kind: 'slow', durationTicks: 45, magnitude: 0.35 }],
    },
  },
  {
    id: conLuan.hammer,
    nameVi: 'Thiên Lôi Trấn Nhạc',
    cooldownTicks: 225,
    manaCost: 28,
    effect: {
      ...shot,
      useFacing: true,
      explodeAtEnd: true,
      damage: 44,
      range: 180,
      splashRadius: 54,
      statuses: [stun(60)],
    },
  },
  {
    id: conLuan.chaos,
    nameVi: 'Vô Cực Phong Lôi Quyết',
    cooldownTicks: 1350,
    manaCost: 40,
    selfStatuses: [
      { kind: 'con_luan_chaos', durationTicks: chaosTicks, magnitude: 1 },
    ],
    effect: { ...buff, durationTicks: chaosTicks },
  },
];
const swordSkills: Ability[] = [
  {
    id: conLuan.detonate,
    nameVi: 'Lôi Động Thiên Địa',
    cooldownTicks: 135,
    manaCost: 18,
    effect: {
      ...area,
      radius: 53,
      damage: 34 * detonationDamageMultiplier,
      statuses: [stun(60)],
    },
  },
  {
    id: conLuan.dash,
    nameVi: 'Điện Quang Lôi Ảnh',
    cooldownTicks: 150,
    manaCost: 9,
    effect: {
      mode: 'dash',
      distance: 132,
      speed: 550,
      radius: 24,
      damage: 24,
      stunTicks: 0,
    },
  },
  {
    id: conLuan.fan,
    nameVi: 'Bạo Lôi Kiếm Canh',
    cooldownTicks: 180,
    manaCost: 24,
    effect: {
      mode: 'multi_hit',
      range: 115,
      finisherRange: 115,
      damage: 10,
      finisherDamage: 0,
      hits: 5,
      spacingTicks: 2,
      halfAngle: Math.PI / 4,
      attackPowerScale: 0.25,
      statuses: [stun(30)],
    },
  },
  {
    id: conLuan.dragon,
    nameVi: 'Lôi Long Thiên Tường',
    cooldownTicks: 225,
    manaCost: 27,
    effect: { ...shot, damage: 48, radius: 13, statuses: [stun(60)] },
  },
  {
    id: conLuan.star,
    nameVi: 'Trận Pháp Năm Kiếm',
    cooldownTicks: 1200,
    manaCost: 45,
    effect: {
      ...area,
      radius: 69 * starScale,
      radiusY: 44 * starScale,
      pentagon: true,
      durationTicks: 225,
      tickInterval: 30,
      windupTicks: 15,
      damage: 26,
      stunOnOpenTicks: 24,
      occupantStatuses: [
        { kind: 'slow', magnitude: 0.6, durationTicks: 2 },
        {
          kind: 'dash_lock',
          magnitude: 1,
          durationTicks: 2,
          blocksMovementSkills: true,
        },
      ],
    },
  },
];

export const conLuanAuxiliary: Ability[] = [
  {
    id: conLuan.plant,
    nameVi: 'Kinh Lôi',
    cooldownTicks: 120,
    manaCost: 0,
    charges: 3,
    effect: {
      ...area,
      radius: 52,
      radiusY: 23,
      durationTicks: 1800,
      tickInterval: 1800,
      passiveField: true,
    },
  },
  {
    id: conLuan.bolt,
    nameVi: 'Thiên Lôi',
    cooldownTicks: 30,
    basicPoseTicks: 8,
    manaCost: 0,
    effect: {
      ...area,
      nearestRange: 225,
      radius: 29,
      damage: 29,
      windupTicks: 3,
    },
  },
];

export const conLuanSkills = [...monkSkills, ...swordSkills];
export const conLuanBranches = {
  [conLuan.monk]: {
    schoolId: conLuan.school,
    style: 'Thiền Sư',
    skillIds: monkSkills.slice(0, 4).map((s) => s.id),
  },
  [conLuan.sword]: {
    schoolId: conLuan.school,
    style: 'Kiếm Tôn',
    skillIds: swordSkills.slice(0, 4).map((s) => s.id),
  },
};
const descriptions = [
  'Đổi thế không tốn nội lực. Mỗi bậc tăng 4 sát thương A ở cả hai thế. Thế cận chiến tăng thêm sinh lực, hồi máu và sát thương.',
  'Đập búa xuống đất, gây sát thương sét và choáng 2 giây trong vùng nổ.',
  'Tỏa vòng sét từ bản thân, gây sát thương và làm chậm 35% trong 1,5 giây.',
  'Ném búa sét thẳng phía trước, gây nổ và choáng 2 giây trong vùng nổ.',
  'Hóa Chaos và tăng mạnh chỉ số. Kéo dài 10 giây ở bậc 1, thêm 2 giây mỗi bậc.',
  'Kích nổ tất cả kiếm Kinh Lôi của bản thân. Mỗi vụ nổ gây sát thương và choáng 2 giây, thêm 0,1 giây mỗi bậc.',
  'Lướt gây sát thương. Đi vào vùng một kiếm Kinh Lôi sẽ hồi chiêu này.',
  'Đâm năm nhịp lôi kiếm trong góc 90 độ phía trước. Mỗi mục tiêu choáng 1 giây ở nhịp đầu trúng, thêm 0,1 giây mỗi bậc.',
  'Phóng đầu rồng sét bay thẳng. Mục tiêu trúng choáng 2 giây, thêm 0,1 giây mỗi bậc.',
  'Cắm năm kiếm quanh vị trí thi triển, gây sát thương trong 7,5 giây và choáng ở nhịp đầu. Địch trong vùng bị chậm 60% và bị khóa lướt.',
];

export function addConLuanProgression(
  progression: ProgressionDefinition,
): void {
  progression.schools[conLuan.school] = {
    passiveId: conLuan.passive,
    basicIds: [conLuan.monk, conLuan.sword],
    base: {
      maxHp: 165,
      maxMana: 110,
      attackPower: 26,
      defense: 2,
      attackSpeed: 1,
      movementSpeed: 160,
      critChance: 0.08,
      critMultiplier: 1.5,
      manaRegen: 6,
      cooldownReduction: 0,
      hpRegen: 1,
    },
    growth: { maxHp: 8, maxMana: 3, attackPower: 2, defense: 0.18 },
    innate: { attackPower: 0.3, manaRegen: 0.12 },
    surplus: { attackPower: 1, manaRegen: 0.08 },
  };
  conLuanSkills.forEach((ability, i) => {
    const ultimate = i % 5 === 4;
    const levelGates = ultimate
      ? skillRankGates.ultimate
      : skillRankGates.standard;
    progression.skills[ability.id] = {
      id: ability.id,
      schoolId: conLuan.school,
      style: i < 5 ? 'Thiền Sư' : 'Kiếm Tôn',
      ultimate,
      levelGates,
      descriptionVi: descriptions[i]!,
      ranks: levelGates.map((_, rank) => {
        const effect = { ...ability.effect };
        if (ability.id === conLuan.chaos && effect.mode === 'buff')
          effect.durationTicks += rank * chaosTicksPerRank;
        if ('damage' in effect)
          effect.damage +=
            rank *
            (ability.id === conLuan.detonate
              ? 5 * detonationDamageMultiplier
              : effect.mode === 'multi_hit'
                ? 2
                : 5);
        if (
          (ability.id === conLuan.detonate ||
            ability.id === conLuan.fan ||
            ability.id === conLuan.dragon) &&
          'statuses' in effect
        )
          effect.statuses = effect.statuses?.map((status) =>
            status.kind === 'stun'
              ? stun(status.durationTicks + rank * stunTicksPerRank)
              : status,
          );
        const selfStatuses = ability.selfStatuses?.map((status) => ({
          ...status,
          durationTicks:
            status.durationTicks +
            (status.kind === 'con_luan_chaos' ? rank * chaosTicksPerRank : 0),
          magnitude: 1 + 0.15 * rank,
        }));
        return {
          ...ability,
          effect,
          ...(ability.basicDamageBonus === undefined
            ? {}
            : { basicDamageBonus: ability.basicDamageBonus * (rank + 1) }),
          ...(selfStatuses ? { selfStatuses } : {}),
          cooldownTicks:
            ability.cooldownTicks -
            rank * (ultimate ? 45 : ability.id === conLuan.stance ? 1 : 6),
        };
      }),
    };
  });
}
