import { z } from 'zod';
import type { Ability, ProgressionDefinition } from '@volam/game-core';
import { abilitySchema } from './ability-schema.js';
export const skillRankGates = { standard: [1, 3, 5, 7], ultimate: [6, 10, 14] };
const n = z.number().finite().nonnegative();
const statShape = {
  maxHp: n,
  maxMana: n,
  attackPower: n,
  defense: n,
  attackSpeed: n,
  movementSpeed: n,
  critChance: n,
  critMultiplier: n,
  manaRegen: n,
  cooldownReduction: n,
  hpRegen: n,
};
const bonuses = z.strictObject(statShape).partial();
export const progressionSchema = z
  .strictObject({
    defaultBranches: z
      .record(
        z.string(),
        z.strictObject({
          schoolId: z.string(),
          style: z.string(),
          skillIds: z.array(z.string()).length(4),
        }),
      )
      .optional(),
    skills: z.record(
      z.string(),
      z.strictObject({
        id: z.string(),
        schoolId: z.string(),
        style: z.string(),
        ultimate: z.boolean(),
        descriptionVi: z.string(),
        levelGates: z.array(z.number().int().min(1).max(30)).min(1).max(4),
        ranks: z.array(abilitySchema).min(1).max(4),
      }),
    ),
    schools: z.record(
      z.string(),
      z.strictObject({
        passiveId: z.string(),
        base: z.strictObject(statShape),
        growth: bonuses,
        innate: bonuses,
        surplus: bonuses,
        basicIds: z.array(z.string()).length(2),
      }),
    ),
    maxUltimates: z.literal(1),
    maxCritChance: n.max(1),
    maxCooldownReduction: n.max(0.8),
  })
  .superRefine((d, c) => {
    for (const [basicId, branch] of Object.entries(d.defaultBranches ?? {})) {
      if (
        !d.schools[branch.schoolId]?.basicIds.includes(basicId) ||
        new Set(branch.skillIds).size !== 4 ||
        branch.skillIds.some(
          (id) =>
            d.skills[id]?.schoolId !== branch.schoolId ||
            d.skills[id]?.style !== branch.style ||
            d.skills[id]?.ultimate,
        )
      )
        c.addIssue({
          code: 'custom',
          message: `Invalid default branch ${basicId}`,
        });
    }
    for (const [id, s] of Object.entries(d.skills)) {
      if (
        s.id !== id ||
        s.ranks.some((a) => a.id !== id) ||
        s.ranks.length !== s.levelGates.length ||
        s.levelGates.some((v, i) => i > 0 && v <= s.levelGates[i - 1]!)
      )
        c.addIssue({
          code: 'custom',
          message: `Invalid rank definition ${id}`,
        });
    }
  });
/** Combat availability is independent of the retained artwork inventory. */
export const schoolProgressionMetadata = {
  cai_bang: {
    passiveId: 'tieu_dieu_cong',
    basicIds: ['cai_bang_bong', 'cai_bang_chuong'],
    implemented: true,
  },
  thien_son: {
    passiveId: 'bac_minh_than_cong',
    basicIds: ['thien_son_phien', 'thien_son_dao'],
    implemented: true,
  },
  vo_dang: {
    passiveId: 'thai_cuc_tam_phap',
    basicIds: ['vo_dang_quyen', 'vo_dang_kiem'],
    implemented: true,
  },
  thieu_lam: {
    passiveId: 'dich_can_kinh',
    basicIds: ['thieu_lam_quyen', 'thieu_lam_dao'],
    implemented: true,
  },
} as const;
const descriptions: Record<string, string> = {
  hoa_van_chuong:
    'Ba chưởng lửa bay thẳng về hướng địch gần nhất; không truy đuổi.',
  cuong_long_loan_vu: 'Cầu lửa phát nổ, gây sát thương diện rộng và thiêu đốt.',
  phi_long_tai_thien: 'Sóng lửa xuyên thấu phía trước, đẩy lùi đối thủ.',
  khang_long_huu_hoi:
    'Tăng bạo kích trong thời gian dài hơn; cấp 4 có vùng lửa nhỏ theo người gây sát thương mỗi giây.',
  hang_long_hoa_vu: 'Tuyệt kỹ: hỏa long lớn xuyên qua đội hình phía trước.',
  hoanh_tao_bong: 'Quét bổng diện rộng, gây sát thương và làm chậm di chuyển.',
  pha_giap_bong: 'Đánh mạnh một mục tiêu phía trước và giảm phòng thủ.',
  cam_long_cong:
    'Kéo địch phía trước, câm lặng và tước vũ khí. Địch vẫn di chuyển; không choáng, không sát thương.',
  truy_phong_bong:
    'Lướt theo hướng nhìn, gây sát thương một lần mỗi mục tiêu và làm choáng.',
  thien_ha_vo_cau: 'Tuyệt kỹ: bốn nhịp xoay bổng, kết thúc bằng cú đập mạnh.',
};
/** All numbers are M3B balance proposals. Rank1 preserves the exact M3A ability. */
export function createProgression(
  catalogue: Record<string, Ability>,
): ProgressionDefinition {
  const skills: ProgressionDefinition['skills'] = {};
  for (const [id, base] of Object.entries(catalogue)) {
    const ultimate = ['hang_long_hoa_vu', 'thien_ha_vo_cau'].includes(id);
    const gates = ultimate ? skillRankGates.ultimate : skillRankGates.standard;
    const ranks = Array.from({ length: gates.length }, (_, r) => {
      const a: Ability = abilitySchema.parse(base),
        e = a.effect;
      if (id === 'hoa_van_chuong' && e.mode === 'projectile') {
        e.damage += 4 * r;
        a.cooldownTicks -= 3 * r;
        a.manaCost += 2 * r;
      }
      if (id === 'cuong_long_loan_vu' && e.mode === 'projectile') {
        e.damage += 8 * r;
        e.burnDamage += r;
        e.burnTicks += 15 * r;
        e.splashRadius += 4 * r;
        a.manaCost += 2 * r;
      }
      if (id === 'phi_long_tai_thien' && e.mode === 'projectile') {
        e.damage += 7 * r;
        e.knockback = (e.knockback ?? 0) + 8 * r;
        e.range += 12 * r;
      }
      if (id === 'khang_long_huu_hoi' && e.mode === 'buff') {
        e.critChance += 0.04 * r;
        e.critMultiplier += 0.1 * r;
        e.durationTicks += 15 * r;
        if (r === 3)
          e.burnAura = {
            radius: 62,
            damage: 6,
            tickInterval: 30,
            attackPowerScale: 0.15,
          };
      }
      if (id === 'hang_long_hoa_vu' && e.mode === 'projectile') {
        e.damage += 25 * r;
        e.range += 30 * r;
        e.radius += 4 * r;
        a.manaCost += 5 * r;
        a.cooldownTicks -= 15 * r;
      }
      if (id === 'hoanh_tao_bong' && e.mode === 'arc') {
        e.damage += 6 * r;
        e.statuses![0]!.magnitude += 0.03 * r;
        e.statuses![0]!.durationTicks += 15 * r;
      }
      if (id === 'pha_giap_bong' && e.mode === 'arc') {
        e.damage += 8 * r;
        e.statuses![0]!.magnitude += 5 * r;
        e.statuses![0]!.durationTicks += 15 * r;
      }
      if (id === 'cam_long_cong' && e.mode === 'arc') {
        e.pull = (e.pull ?? 0) + 10 * r;
        e.range += 12 * r;
        for (const s of e.statuses ?? []) s.durationTicks += 6 * r;
        a.manaCost += 2 * r;
      }
      if (id === 'truy_phong_bong' && e.mode === 'dash') {
        e.distance += 10 * r;
        e.stunTicks += 3 * r;
        e.damage += 6 * r;
      }
      if (id === 'thien_ha_vo_cau' && e.mode === 'multi_hit') {
        e.damage += 4 * r;
        e.finisherDamage += 20 * r;
        e.range += 6 * r;
        e.finisherRange += 6 * r;
      }
      return a;
    });
    skills[id] = {
      id,
      schoolId: 'cai_bang',
      style: [
        'hoanh_tao_bong',
        'pha_giap_bong',
        'cam_long_cong',
        'truy_phong_bong',
        'thien_ha_vo_cau',
      ].includes(id)
        ? 'Bổng'
        : 'Chưởng',
      ultimate,
      descriptionVi: descriptions[id]!,
      levelGates: [...gates],
      ranks,
    };
  }
  return progressionSchema.parse({
    skills,
    maxUltimates: 1,
    maxCritChance: 0.75,
    maxCooldownReduction: 0.4,
    schools: {
      cai_bang: {
        passiveId: 'tieu_dieu_cong',
        basicIds: ['cai_bang_bong', 'cai_bang_chuong'],
        base: {
          maxHp: 160,
          maxMana: 100,
          attackPower: 28,
          defense: 0,
          attackSpeed: 1,
          movementSpeed: 160,
          critChance: 0.1,
          critMultiplier: 1.5,
          manaRegen: 6,
          cooldownReduction: 0,
          hpRegen: 0,
        },
        growth: { maxHp: 8, maxMana: 2, attackPower: 2, defense: 0.15 },
        innate: { attackPower: 0.3, critChance: 0.002, critMultiplier: 0.005 },
        surplus: { attackPower: 1.2, critChance: 0.003, critMultiplier: 0.01 },
      },
    },
  });
}
