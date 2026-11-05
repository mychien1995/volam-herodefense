import { emit } from './combat.js';
import { createSeededRandom } from './random.js';
import type { Creep, SimulationConfig, World } from './types.js';

export interface BossBanterDefinition {
  openingTicks: number;
  intervalTicks: number;
  jitterTicks: number;
  pools: Record<string, string[]>;
  farewells: Record<string, string>;
  farewellTicks: number;
}
/** Called once by the encounter's defeat transition. Returns the corpse's expiry tick. */
export function waveBossFarewell(
  w: World,
  c: SimulationConfig,
  actor: Creep,
): number {
  const d = c.bossBanter;
  if (!d || !Object.hasOwn(d.farewells, actor.id)) return w.tick;
  actor.pose = 'death';
  emit(w, {
    kind: 'effect',
    sourceId: actor.id,
    targetId: '',
    abilityId: actor.id,
    stage: 'boss_farewell',
    x: actor.x,
    y: actor.y,
    damage: 0,
    critical: false,
  });
  return w.tick + d.farewellTicks;
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
  const living = [...w.heroes.values()].some((h) => h.hp > 0);
  for (const [id, pool] of Object.entries(d.pools)) {
    const actor = w.creeps.get(id);
    if (!actor || actor.hp <= 0 || !pool?.length) continue;
    const fighting =
      living &&
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
    // Wave bosses speak between attacks. Dungeon bosses can chain actions for
    // a whole phase, so their dialogue uses its separate lane during combat.
    if (
      (Object.hasOwn(d.farewells, id) &&
        (actor.pose === 'cast' || actor.actionUntil > w.tick)) ||
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
