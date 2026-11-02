import {
  tayDocAbilities,
  type TayDocDefinition,
  type TayDocAbility,
} from '@volam/game-core';
import { z } from 'zod';
const seconds = (n: number) => Math.ceil(n * 30);
const attack = (
  nameVi: string,
  windup: number,
  damage: number,
  range: number,
  speed = 0,
  duration = 0,
  interval = 0,
) => ({
  nameVi,
  windup: seconds(windup),
  recovery: seconds(0.5),
  cooldown: seconds(6),
  damage,
  range,
  radius: 8,
  speed,
  duration: seconds(duration),
  interval: interval * 30,
});
/** Trial HP/damage/CC tuning. Approved feedback03 geometry and velocities are retained. */
export const tayDocDefinition: TayDocDefinition = {
  spawn: { x: 80, y: 616 },
  entryEndX: 550,
  bounds: { x: 90, y: 340, width: 1360, height: 640 },
  hp: 2600,
  defense: 12,
  speed: 92,
  phase2Speed: 145,
  phase2Damage: 1.25,
  radius: 24,
  xp: 800,
  gold: 240,
  rest: seconds(0.8),
  transition: seconds(2.28),
  controlScale: 0.2,
  gateRest: seconds(8),
  poisonDamage: 6,
  poisonDuration: seconds(3),
  poisonInterval: 30,
  slow: 0.25,
  slowDuration: seconds(2),
  stunDuration: seconds(1.2),
  cloudCount: 8,
  cloudRadius: 85,
  cloudDuration: seconds(8),
  curseDelay: seconds(4.5),
  curseRadius: 145,
  pillarHp: 100,
  pillarInterval: 1.35 * 30,
  pillarSpeed: 390,
  pillarRange: 663,
  radialCount: 16,
  needleCount: 9,
  needleVolleys: 3,
  needleSpread: Math.PI / 3,
  jumpTicks: seconds(0.65),
  jumpRest: seconds(0.6),
  attacks: {
    tay_doc_staff: attack('Quẹt trượng', 0.65, 20, 160),
    tay_doc_gas: attack('Bắn độc khí', 0.65, 16, 560, 330),
    van_doc_phi_cham: attack('Vạn Độc Phi Châm', 1, 8, 600, 360, 0.36, 0.18),
    doc_vu_me_hon: attack('Độc Vụ Mê Hồn', 1.1, 8, 85),
    co_doc_khoan_tam: attack('Cổ Độc Khoan Tâm', 0.4, 22, 145),
    hon_thien_phuc_long_chan: attack(
      'Hỗn Thiên Phục Long Chấn',
      0.9,
      12,
      663,
      390,
    ),
    doc_chuong: attack('Bắn độc chưởng', 0.45, 20, 600, 310),
    cap_mo_chan_kich: attack('Cáp Mô Chấn Kích', 1.1, 24, 405),
    ngu_doc_than_chuong: attack(
      'Ngũ Độc Thần Chưởng',
      0.9,
      10,
      484.5,
      130.05,
      3.5,
      0.35,
    ),
    van_doc_bao_phat: attack('Vạn Độc Bạo Phát', 0.7, 14, 484.5, 218.025, 3.15),
  },
};
const positive = z.number().finite().positive();
const profile = z.object({
  nameVi: z.string().min(1),
  windup: positive,
  recovery: positive,
  cooldown: positive,
  damage: positive,
  range: positive,
  radius: positive,
  speed: z.number().finite().nonnegative(),
  duration: z.number().finite().nonnegative(),
  interval: z.number().finite().nonnegative(),
});
export function validateTayDocDefinition(d: TayDocDefinition): void {
  for (const key of [
    'hp',
    'defense',
    'speed',
    'phase2Speed',
    'phase2Damage',
    'radius',
    'xp',
    'gold',
    'rest',
    'transition',
    'gateRest',
    'poisonDamage',
    'poisonDuration',
    'poisonInterval',
    'slowDuration',
    'stunDuration',
    'cloudRadius',
    'cloudDuration',
    'curseDelay',
    'curseRadius',
    'pillarHp',
    'pillarInterval',
    'pillarSpeed',
    'pillarRange',
    'radialCount',
    'needleCount',
    'needleVolleys',
    'needleSpread',
    'jumpTicks',
    'jumpRest',
  ] as const)
    positive.parse(d[key]);
  z.number().min(0).max(1).parse(d.slow);
  z.number().min(0).max(1).parse(d.controlScale);
  for (const id of tayDocAbilities) profile.parse(d.attacks[id]);
  for (const n of [
    d.cloudCount,
    d.radialCount,
    d.needleCount,
    d.needleVolleys,
    d.jumpTicks,
    d.jumpRest,
  ])
    z.number().int().positive().parse(n);
  if (
    d.needleCount < 2 ||
    d.phase2Speed <= d.speed ||
    d.phase2Damage <= 1 ||
    !Number.isFinite(d.entryEndX)
  )
    throw Error('Invalid Tay Doc phase/volley configuration');
  for (const id of [
    'tay_doc_gas',
    'van_doc_phi_cham',
    'hon_thien_phuc_long_chan',
    'doc_chuong',
    'ngu_doc_than_chuong',
    'van_doc_bao_phat',
  ] as const)
    positive.parse(d.attacks[id].speed);
  if (d.pillarInterval !== 40.5 || d.pillarSpeed !== 390)
    throw Error('Tay Doc approved pillar firing changed');
  if (d.spawn.y !== 616)
    throw Error('Tay Doc must enter along the west brick-road center');
  if (
    d.cloudCount !== 8 ||
    d.radialCount !== 16 ||
    d.attacks.tay_doc_staff.range !== 160 ||
    d.attacks.cap_mo_chan_kich.range !== 405
  )
    throw Error('Tay Doc approved geometry changed');
  const expected: Partial<Record<TayDocAbility, number>> = {
    ngu_doc_than_chuong: 130.05,
    van_doc_bao_phat: 218.025,
  };
  for (const [id, p] of Object.entries(d.attacks)) {
    profile.parse(p);
    if (
      expected[id as TayDocAbility] &&
      p.speed !== expected[id as TayDocAbility]
    )
      throw Error('Tay Doc approved projectile speed changed');
  }
  for (const id of ['ngu_doc_than_chuong', 'van_doc_bao_phat'] as const)
    if (d.attacks[id].range !== 484.5)
      throw Error('Tay Doc approved projectile range changed');
  if (
    !Number.isFinite(
      d.spawn.x +
        d.spawn.y +
        d.bounds.x +
        d.bounds.y +
        d.bounds.width +
        d.bounds.height,
    ) ||
    d.bounds.width <= 0 ||
    d.bounds.height <= 0
  )
    throw Error('Invalid Tay Doc world geometry');
}
validateTayDocDefinition(tayDocDefinition);
