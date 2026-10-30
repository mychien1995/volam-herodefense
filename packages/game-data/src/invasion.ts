import { z } from 'zod';
import type { InvasionDefinition } from '@volam/game-core';
import { mapObjects } from './arena.js';
import { m1Config } from './m1.js';
const point = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
});
export const invasionDefinitionSchema = z
  .strictObject({
    intervalTicks: z.number().int().min(90),
    warningTicks: z.array(z.number().int().positive()).length(2),
    noticeTicks: z.number().int().positive(),
    statue: z.strictObject({
      position: point,
      radius: z.number().positive(),
      maxHp: z.number().int().positive(),
      collision: point.extend({
        width: z.number().positive(),
        height: z.number().positive(),
      }),
    }),
    lanes: z.strictObject({ west: point, east: point }),
    chaseRange: z.number().positive(),
    aggroRestTicks: z.number().int().positive(),
    countPerAdditionalPlayer: z.number().nonnegative(),
    hpPerAdditionalPlayer: z.number().nonnegative(),
    damagePerAdditionalPlayer: z.number().nonnegative(),
    waves: z
      .array(
        z.strictObject({
          id: z.string().regex(/^[a-z0-9_]+$/),
          perLane: z.number().int().min(1).max(8),
          hp: z.number().positive(),
          damage: z.number().positive(),
          speed: z.number().positive(),
        }),
      )
      .min(1)
      .max(3),
  })
  .superRefine((d, ctx) => {
    if (!(
      d.warningTicks[0]! > d.warningTicks[1]! &&
      d.warningTicks[0]! < d.intervalTicks
    ))
      ctx.addIssue({
        code: 'custom',
        message:
          'Warning thresholds must be distinct, descending and shorter than the interval.',
      });
    if (d.chaseRange <= m1Config.creep.detectionRange)
      ctx.addIssue({
        code: 'custom',
        message: 'Chase range must exceed detection range.',
      });
  });
const marker = (name: string) => {
  const m = [...mapObjects('spawns'), ...mapObjects('statue')].find(
    (o) => o.name === name,
  );
  if (!m) throw new Error(`Missing invasion marker ${name}`);
  return { x: m.x, y: m.y };
};
/** Three M2B prototype recipes; later waves reuse the third, not a production 20-wave catalogue. */
export function createInvasionDefinition(
  intervalSeconds = 180,
  statueHp = 2000,
): InvasionDefinition {
  const seconds = z.number().int().min(3).max(3600).parse(intervalSeconds),
    rate = m1Config.tickRate;
  const warnings =
    seconds >= 180
      ? [60, 15]
      : [
          Math.max(2, Math.floor(seconds / 3)),
          Math.max(1, Math.floor(seconds / 10)),
        ];
  const position = marker('statue_future');
  return invasionDefinitionSchema.parse({
    intervalTicks: seconds * rate,
    warningTicks: warnings.map((s) => s * rate),
    noticeTicks: rate * 4,
    statue: {
      position,
      radius: 36,
      maxHp: statueHp,
      collision: {
        x: position.x - 40,
        y: position.y - 28,
        width: 80,
        height: 28,
      },
    },
    lanes: { west: marker('spawn_west'), east: marker('spawn_east') },
    chaseRange: 240,
    aggroRestTicks: rate * 3,
    countPerAdditionalPlayer: 0.6,
    hpPerAdditionalPlayer: 0.16,
    damagePerAdditionalPlayer: 0.08,
    waves: [
      { id: 'raid_1', perLane: 2, hp: 120, damage: 8, speed: 46 },
      { id: 'raid_2', perLane: 3, hp: 150, damage: 9, speed: 48 },
      { id: 'raid_3', perLane: 4, hp: 180, damage: 10, speed: 50 },
    ],
  });
}
