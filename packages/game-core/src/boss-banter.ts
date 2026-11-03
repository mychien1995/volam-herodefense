import { emit } from './combat.js';
import { createSeededRandom } from './random.js';
import type { Creep, SimulationConfig, World } from './types.js';

export interface BossBanterDefinition {
  openingTicks: number;
  intervalTicks: number;
  jitterTicks: number;
  pools: Record<string, string[]>;
}
export interface BossBanterClock {
  actor: Creep;
  nextAt: number;
  remaining: number[];
  last: number;
  random: () => number;
}
/** Separate seeded deck: exhaust a pool before repeating, never repeat across decks. */
export function stepBossBanter(w: World, c: SimulationConfig): void {
  const d = c.bossBanter;
  if (!d) return;
  const clocks = (w.bossBanter ??= new Map());
  for (const id of clocks.keys())
    if (!w.creeps.has(id) || w.creeps.get(id)!.hp <= 0) clocks.delete(id);
  for (const id of ['dong_ta', 'tay_doc_boss', 'boss_nam_de']) {
    const actor = w.creeps.get(id),
      pool = d.pools[id];
    if (!actor || actor.hp <= 0 || !pool?.length) continue;
    const fighting =
      [...w.heroes.values()].some((h) => h.hp > 0) &&
      !actor.invulnerable &&
      (id !== 'boss_nam_de' ||
        !['enter', 'waiting', 'rest', 'defeated'].includes(
          w.namDe?.phase ?? 'waiting',
        ));
    let clock = clocks.get(id);
    if (!clock || clock.actor !== actor) {
      const identity = [...id].reduce(
        (n, ch) => Math.imul(n, 31) + ch.charCodeAt(0),
        7,
      );
      clock = {
        actor,
        nextAt: w.tick + d.openingTicks,
        remaining: [],
        last: -1,
        random: createSeededRandom(
          ((w.banterSeed ?? 42) ^ identity ^ w.tick) >>> 0 || 1,
        ),
      };
      clocks.set(id, clock);
    }
    if (!fighting) {
      clock.nextAt = w.tick + d.openingTicks;
      continue;
    }
    if (w.tick < clock.nextAt) continue;
    // Give each skill name its full readable lifetime before emitting a chat line.
    if (
      actor.pose === 'cast' ||
      actor.actionUntil > w.tick ||
      w.events.some((e) => e.sourceId === id && e.stage === 'boss_shout')
    )
      continue;
    if (!clock.remaining.length) {
      clock.remaining = pool.map((_, i) => i);
      for (let i = clock.remaining.length - 1; i > 0; i--) {
        const j = Math.floor(clock.random() * (i + 1));
        [clock.remaining[i], clock.remaining[j]] = [
          clock.remaining[j]!,
          clock.remaining[i]!,
        ];
      }
      if (clock.remaining.at(-1) === clock.last && pool.length > 1)
        [clock.remaining[0], clock.remaining[pool.length - 1]] = [
          clock.remaining[pool.length - 1]!,
          clock.remaining[0]!,
        ];
    }
    const index = clock.remaining.pop()!;
    clock.last = index;
    clock.nextAt =
      w.tick +
      d.intervalTicks +
      Math.floor(clock.random() * (d.jitterTicks + 1));
    emit(w, {
      kind: 'effect',
      sourceId: id,
      targetId: '',
      abilityId: `banter_${id}_${index}`,
      stage: 'boss_banter',
      x: actor.x,
      y: actor.y,
      damage: 0,
      critical: false,
    });
  }
}
