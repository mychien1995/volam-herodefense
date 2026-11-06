import { z } from 'zod';
import type { InvasionDefinition } from '@volam/game-core';
import { mapObjects, arena } from './arena.js';
import { blocked, segmentRect } from '@volam/game-core';
import { m1Config } from './m1.js';
const point = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
});
export const invasionDefinitionSchema = z
  .strictObject({
    intervalTicks: z.number().int().min(90),
    streamTicks: z.number().int().positive().optional(),
    spawnEveryTicks: z.number().int().positive().optional(),
    portalCount: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    maxWaves: z.number().int().min(1).max(20).optional(),
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
    lanes: z.strictObject({
      west: point,
      east: point,
      north: point.optional(),
      south: point.optional(),
    }),
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
      .max(20),
  })
  .superRefine((d, ctx) => {
    if (
      ((d.portalCount ?? 2) >= 3 && !d.lanes.north) ||
      ((d.portalCount ?? 2) >= 4 && !d.lanes.south)
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Every selected invasion gate needs an authoritative spawn point.',
      });
    if (!!d.streamTicks !== !!d.spawnEveryTicks)
      ctx.addIssue({
        code: 'custom',
        message: 'Streaming duration and cadence must be supplied together.',
      });
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
  stream?: {
    portalCount: 2 | 3 | 4;
    durationSeconds?: number;
    spawnEverySeconds?: number;
  },
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
  const extraGate = (south: boolean) => {
    for (let depth = 96; depth < arena.height / 2; depth += 32)
      for (const dx of [0, -96, 96, -192, 192]) {
        const p = {
          x: position.x + dx,
          y: south ? arena.height - depth : depth,
        };
        if (
          ![-20, 0, 20].some(
            (o) =>
              blocked(
                { x: p.x + o, y: p.y },
                m1Config.creep.radius,
                arena.width,
                arena.height,
                arena.collision,
              ) ||
              arena.collision.some(
                (w) =>
                  segmentRect(
                    { x: p.x + o, y: p.y },
                    position,
                    w,
                    m1Config.creep.radius,
                  ) !== undefined,
              ),
          )
        )
          return p;
      }
    throw Error('No walkable north/south invasion gate');
  };
  return invasionDefinitionSchema.parse({
    intervalTicks: seconds * rate,
    ...(stream
      ? {
          portalCount: stream.portalCount,
          streamTicks: Math.round((stream.durationSeconds ?? 60) * rate),
          spawnEveryTicks: Math.round((stream.spawnEverySeconds ?? 2) * rate),
          maxWaves: 20,
        }
      : {}),
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
    lanes: {
      west: marker('spawn_west'),
      east: marker('spawn_east'),
      ...(stream ? { north: extraGate(false), south: extraGate(true) } : {}),
    },
    chaseRange: 240,
    aggroRestTicks: rate * 3,
    countPerAdditionalPlayer: 0.6,
    hpPerAdditionalPlayer: 0.16,
    damagePerAdditionalPlayer: 0.08,
    waves: stream
      ? Array.from({ length: 20 }, (_, i) => ({
          id: `raid_${i + 1}`,
          perLane: 1,
          hp: Math.round(120 * (1 + i * 0.09)),
          damage: 8 + Math.floor(i * 0.45),
          speed: 46 + Math.min(i, 14),
        }))
      : [
          { id: 'raid_1', perLane: 2, hp: 120, damage: 8, speed: 46 },
          { id: 'raid_2', perLane: 3, hp: 150, damage: 9, speed: 48 },
          { id: 'raid_3', perLane: 4, hp: 180, damage: 10, speed: 50 },
        ],
  });
}
