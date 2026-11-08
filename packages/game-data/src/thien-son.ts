import type { Ability, ProgressionDefinition } from '@volam/game-core';
import { abilitySchema } from './ability-schema.js';
import { skillRankGates } from './progression-data.js';

/** M3C3 feedback trial at 30 ticks/s. Phiến is now a two-leg non-tracking fan. */
export const thienSonBasics: Record<string, Ability> = {
  thien_son_phien: {
    id: 'thien_son_phien',
    nameVi: 'Thiên Sơn Phiến',
    manaCost: 0,
    cooldownTicks: 9,
    minIntervalTicks: 5,
    effect: {
      mode: 'projectile',
      damage: 12,
      range: 220,
      speed: 400,
      radius: 10,
      count: 1,
      spacingTicks: 0,
      splashRadius: 0,
      burnDamage: 0,
      burnTicks: 0,
      boomerang: true,
      piercing: true,
      attackPowerScale: 0.5,
    },
  },
  thien_son_dao: {
    id: 'thien_son_dao',
    nameVi: 'Thiên Sơn Đao',
    manaCost: 0,
    cooldownTicks: 9,
    minIntervalTicks: 5,
    effect: {
      mode: 'arc',
      damage: 30,
      range: 86,
      halfAngle: Math.PI / 4,
      cleave: 0.3,
    },
  },
};
const multi = (
  range: number,
  damage: number,
  hits: number,
  spacingTicks: number,
  halfAngle?: number,
): Ability['effect'] => ({
  mode: 'multi_hit',
  range,
  damage,
  hits,
  spacingTicks,
  finisherDamage: 0,
  finisherRange: range,
  ...(halfAngle === undefined ? {} : { halfAngle }),
});
const daoDashDistance = 150;

export const thienSonSkills: Ability[] = [
  {
    id: 'lien_hoa_phien',
    nameVi: 'Liên Hoa Phiến',
    manaCost: 18,
    cooldownTicks: 450,
    effect: {
      mode: 'area',
      durationTicks: 180,
      tickInterval: 30,
      radius: 85,
      damage: 0,
      protectOwner: true,
      ownerRegenFraction: 0.08,
    },
  },
  {
    id: 'luc_duong_chuong',
    nameVi: 'Lục Dương Chưởng',
    manaCost: 24,
    cooldownTicks: 180,
    effect: { ...multi(100, 15, 6, 8), guard: 0.65 } as Ability['effect'],
  },
  {
    id: 'luu_phong_bo',
    nameVi: 'Lưu Phong Bộ',
    manaCost: 12,
    cooldownTicks: 120,
    effect: {
      mode: 'dash',
      distance: 140,
      speed: 700,
      radius: 18,
      damage: 30,
      stunTicks: 0,
    },
  },
  {
    id: 'chiet_mai_thu',
    nameVi: 'Chiết Mai Thủ',
    manaCost: 20,
    cooldownTicks: 360,
    effect: {
      mode: 'buff',
      durationTicks: 180,
      critChance: 0,
      critMultiplier: 0,
      movementSpeed: 0.3,
      attackSpeed: 0.35,
      cooldownReduction: 0.2,
    },
  },
  {
    id: 'bach_phien_phong_bao',
    nameVi: 'Bách Phiến Phong Bạo',
    manaCost: 42,
    cooldownTicks: 540,
    effect: {
      ...multi(150, 22, 12, 8),
      projectileBurstEvery: 3,
      projectileBurst: {
        mode: 'projectile',
        damage: 6,
        speed: 340,
        range: 210,
        radius: 8,
        count: 8,
        spacingTicks: 0,
        splashRadius: 0,
        burnDamage: 0,
        burnTicks: 0,
        piercing: true,
        useFacing: true,
        radial: true,
        attackPowerScale: 0.2,
      },
    } as Ability['effect'],
  },
  {
    id: 'phi_anh_tram',
    nameVi: 'Phi Ảnh Trảm',
    manaCost: 22,
    cooldownTicks: 180,
    effect: {
      mode: 'dash',
      distance: daoDashDistance,
      speed: 750,
      radius: 24,
      damage: 58,
      stunTicks: 0,
      invulnerable: true,
    },
  },
  {
    id: 'truy_hon_dao',
    nameVi: 'Truy Hồn Đao',
    manaCost: 18,
    cooldownTicks: 120,
    effect: {
      mode: 'projectile',
      damage: 30,
      speed: 420,
      range: 240,
      radius: 14,
      count: 2,
      spacingTicks: 3,
      splashRadius: 0,
      burnDamage: 0,
      burnTicks: 0,
      piercing: true,
      useFacing: true,
      statuses: [{ kind: 'slow', magnitude: 0.25, durationTicks: 75 }],
      slowedBonus: 0.4,
    } as Ability['effect'],
  },
  {
    id: 'phong_anh_hoan_vi',
    nameVi: 'Phong Ảnh Hoán Vị',
    manaCost: 20,
    cooldownTicks: 240,
    effect: {
      mode: 'dash',
      distance: daoDashDistance,
      speed: 650,
      radius: 18,
      damage: 0,
      stunTicks: 0,
      invulnerable: true,
      backward: true,
      counter: { durationTicks: 30, damage: 60, range: 90 },
    },
  },
  {
    id: 'liet_phong_dao',
    nameVi: 'Liệt Phong Đao',
    manaCost: 25,
    cooldownTicks: 180,
    effect: {
      mode: 'arc',
      damage: 75,
      range: 125,
      windupTicks: 18,
      durationTicks: 30,
      halfAngle: Math.PI / 3,
      cleave: 0.5,
      armorPenetration: 0.5,
    },
  },
  {
    id: 'bach_liet_thien_kich',
    nameVi: 'Bách Liệt Thiên Kích',
    manaCost: 45,
    cooldownTicks: 540,
    effect: {
      ...multi(145, 13, 10, 4, Math.PI / 4),
      finisherDamage: 45,
      finisherRange: 165,
    } as Ability['effect'],
  },
];
const descriptions = [
  'Hoa cố định tại chỗ thi triển: người tạo hoa đứng trong vùng được miễn sát thương và hồi sinh lực nhanh; ra ngoài mất bảo hộ.',
  'Xoay sáu nhịp quanh bản thân, giảm mạnh sát thương nhận trong lúc xoay.',
  'Lướt theo hướng nhìn, gây sát thương một lần mỗi địch đi qua; dừng trước địa hình.',
  'Tạm tăng tốc di chuyển, tốc đánh và giảm hồi chiêu có giới hạn; không cộng dồn.',
  'Tuyệt kỹ: mười hai nhịp phong bạo theo người, bốn đợt quạt bay tám hướng.',
  'Lướt chém một lần mỗi địch; miễn sát thương trực tiếp trên các tick đang lướt, không chặn DOT.',
  'Hai luồng đao khí bay thẳng, làm chậm; tăng sát thương lên địch đang chậm.',
  'Lướt lùi, giữ hướng nhìn và để lại quang ảnh; tầm lướt bằng Phi Ảnh Trảm cùng bậc. Miễn sát thương trực tiếp khi lướt; cửa sổ phản kích không miễn thương.',
  'Tụ đại đao trên đầu rồi chém xuống phía trước, xuyên một phần phòng thủ riêng cho đòn này.',
  'Tuyệt kỹ: mười nhát chém cực nhanh phía trước và một nhát kết thúc.',
];
export function addThienSonProgression(d: ProgressionDefinition): void {
  d.schools['thien_son'] = {
    passiveId: 'bac_minh_than_cong',
    basicIds: ['thien_son_phien', 'thien_son_dao'],
    base: {
      maxHp: 135,
      maxMana: 100,
      attackPower: 24,
      defense: 0,
      attackSpeed: 1.1,
      movementSpeed: 180,
      critChance: 0.14,
      critMultiplier: 1.5,
      manaRegen: 6,
      cooldownReduction: 0,
      hpRegen: 0,
    },
    growth: { maxHp: 6, maxMana: 2, attackPower: 1.6, defense: 0.1 },
    innate: { movementSpeed: 1.1, attackSpeed: 0.012, critChance: 0.003 },
    surplus: { movementSpeed: 1.3, attackSpeed: 0.012, critChance: 0.003 },
  };
  thienSonSkills.forEach((base, i) => {
    const ultimate = i === 4 || i === 9;
    const gates = ultimate ? skillRankGates.ultimate : skillRankGates.standard;
    const ranks = gates.map((_, r) => {
      const a = abilitySchema.parse(base),
        e = a.effect;
      a.manaCost += (ultimate ? 3 : 1) * r;
      a.cooldownTicks -= (ultimate ? 15 : 3) * r;
      if (e.mode === 'multi_hit') {
        e.damage += (ultimate ? 4 : 3) * r;
        e.range += 4 * r;
        e.finisherRange += 4 * r;
        if (e.finisherDamage) e.finisherDamage += 12 * r;
        if (e.slowedBonus) e.slowedBonus += 0.05 * r;
        if (e.projectileBurst) e.projectileBurst.damage += r;
      } else if (e.mode === 'area' && e.protectOwner) {
        e.radius += 5 * r;
        e.ownerRegenFraction = (e.ownerRegenFraction ?? 0) + 0.02 * r;
      } else if (e.mode === 'dash') {
        e.distance += 8 * r;
        if (e.damage) e.damage += 9 * r;
        if (e.counter) {
          e.counter.damage += 10 * r;
          e.counter.durationTicks += 3 * r;
        }
      } else if (e.mode === 'buff') {
        e.movementSpeed = (e.movementSpeed ?? 0) + 0.04 * r;
        e.attackSpeed = (e.attackSpeed ?? 0) + 0.05 * r;
        e.durationTicks += 15 * r;
        e.cooldownReduction = Math.min(
          0.3,
          (e.cooldownReduction ?? 0) + 0.03 * r,
        );
      } else if (e.mode === 'projectile') {
        e.damage += 5 * r;
        e.range += 10 * r;
        if (e.slowedBonus) e.slowedBonus += 0.05 * r;
      } else if (e.mode === 'arc') {
        e.damage += 10 * r;
        e.armorPenetration = (e.armorPenetration ?? 0) + 0.05 * r;
      }
      return a;
    });
    d.skills[base.id] = {
      id: base.id,
      schoolId: 'thien_son',
      style: i < 5 ? 'Phiến' : 'Đao',
      ultimate,
      descriptionVi: descriptions[i]!,
      levelGates: [...gates],
      ranks,
    };
  });
}
