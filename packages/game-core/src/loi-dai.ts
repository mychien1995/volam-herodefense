import { cancelOwnedEffects } from './status.js';
import { createWorld, removeHero, stepWorld } from './simulation.js';
import { refreshCharacter } from './progression.js';
import { emit } from './combat.js';
import type { MatchZone } from './dungeons.js';
import type { Hero, Point, Rect, SimulationConfig } from './types.js';

export const loiDai = {
  id: 'loi_dai',
  minLevel: 6,
  restSeconds: 3,
  width: 836,
  height: 470,
  spawn: { x: 418, y: 431 },
  // Feet-based doorway at the foot of the painted south staircase.
  gate: { x: 368, y: 402, width: 100, height: 15 },
  seats: [
    { x: 310, y: 253 },
    { x: 526, y: 253 },
  ],
  // Stepped collision follows the low rail and stage fascia in the source art.
  stage: [
    { x: 131, y: 152, width: 574, height: 45 },
    { x: 118, y: 197, width: 600, height: 55 },
    { x: 102, y: 252, width: 632, height: 56 },
    { x: 80, y: 308, width: 676, height: 78 },
    { x: 335, y: 386, width: 166, height: 15 },
  ] satisfies Rect[],
} as const;

// Inner edge of the rails, measured at the back and front of the deck.
// Short, contiguous bands keep movement, dashes and projectile occlusion on
// the same geometry used by the rest of the server.
const deckNorth = 169;
const deckSouth = 333;
const deckWalls: Rect[] = [
  { x: 0, y: 0, width: loiDai.width, height: deckNorth },
  {
    x: 0,
    y: deckSouth,
    width: loiDai.width,
    height: loiDai.height - deckSouth,
  },
];
for (let y = deckNorth; y < deckSouth; y += 4) {
  const inset = 144 - ((y - deckNorth) * 41) / (deckSouth - deckNorth);
  const height = Math.min(4, deckSouth - y);
  deckWalls.push(
    { x: 0, y, width: inset, height },
    { x: loiDai.width - inset, y, width: inset, height },
  );
}

const courtyard: Rect[] = [
  { x: 0, y: 0, width: 836, height: 124 },
  { x: 0, y: 132, width: 30, height: 306 },
  { x: 806, y: 132, width: 30, height: 306 },
  { x: 0, y: 445, width: 836, height: 25 },
  { x: 104, y: 136, width: 62, height: 11 },
  { x: 670, y: 136, width: 62, height: 11 },
  { x: 251, y: 132, width: 54, height: 15 },
  { x: 531, y: 132, width: 54, height: 15 },
];

function reset(hero: Hero, config: SimulationConfig, tick: number): void {
  hero.hp = hero.maxHp;
  hero.mana = hero.maxMana;
  hero.statuses = [];
  delete hero.duelBurn;
  hero.cooldown = tick;
  hero.skillCooldowns = hero.skillCooldowns.map(() => tick);
  hero.abilityCooldowns = {};
  hero.chargeCooldowns = {};
  hero.dashCharges = config.mobility?.charges ?? 0;
  delete hero.dashRechargeAt;
  delete hero.basicChainDeadline;
  delete hero.lastBasicTick;
  delete hero.basicStage;
  delete hero.castAbilityId;
  delete hero.actionStartedAt;
  hero.actionUntil = tick;
  hero.hurtUntil = tick;
  hero.pose = 'idle';
}

export class LoiDai {
  readonly zone: MatchZone;
  readonly fighters = new Set<string>();
  readonly respawns = new Map<string, number>();
  readonly saved = new Map<
    string,
    { hero: Hero; tick: number; matchTick: number }
  >();
  gateAt = 0;

  constructor(base: SimulationConfig, seed: number) {
    const config: SimulationConfig = {
      ...base,
      economy: undefined,
      waveArena: undefined,
      creepSpawns: [],
      width: loiDai.width,
      height: loiDai.height,
      spawn: loiDai.spawn,
      collision: deckWalls,
    };
    delete config.campaign;
    const world = createWorld(config, seed);
    world.duel = this.fighters;
    world.duelWalkWalls = [...courtyard, ...loiDai.stage];
    this.zone = {
      id: loiDai.id,
      access: 'duel',
      ownerId: '',
      world,
      config,
      wave: 0,
      spawnPlayerCount: 0,
      nextWaveAt: undefined,
    };
  }

  prepare(hero: Hero): void {
    delete hero.inventory;
    delete hero.dragonBonus;
    delete hero.bossSpectator;
    delete hero.invulnerable;
    refreshCharacter(hero, this.zone.config);
    reset(hero, this.zone.config, this.zone.world.tick);
    this.wait(hero);
  }

  private wait(hero: Hero): void {
    // Keep the stair approach free even with a full party.
    const index = [...this.zone.world.heroes.keys()].indexOf(hero.id);
    hero.x =
      loiDai.spawn.x + (index % 2 ? 1 : -1) * (86 + Math.floor(index / 2) * 36);
    hero.y = loiDai.spawn.y;
    hero.moveX = hero.moveY = 0;
  }

  leave(id: string): void {
    const { world } = this.zone;
    removeHero(world, id);
    this.respawns.delete(id);
    if (!this.fighters.delete(id)) return;
    for (const other of this.fighters) {
      cancelOwnedEffects(world, other);
      const hero = world.heroes.get(other);
      if (hero && hero.hp > 0) {
        hero.statuses = [];
        delete hero.duelBurn;
      }
    }
  }

  step(matchTick: number): void {
    const { world, config } = this.zone;
    if (!world.heroes.size) {
      world.events = [];
      return;
    }
    for (const [id, ready] of this.respawns) {
      if (matchTick < ready) continue;
      const hero = world.heroes.get(id);
      if (hero) {
        reset(hero, config, world.tick);
        this.wait(hero);
      }
      this.respawns.delete(id);
    }
    stepWorld(world, config);
    const defeated = [...this.fighters].filter(
      (id) => (world.heroes.get(id)?.hp ?? 0) <= 0,
    );
    if (defeated.length) {
      this.gateAt = matchTick + config.tickRate * loiDai.restSeconds;
      for (const id of defeated) {
        this.fighters.delete(id);
        this.respawns.set(id, this.gateAt);
        cancelOwnedEffects(world, id);
      }
      for (const id of this.fighters) {
        const winner = world.heroes.get(id)!;
        cancelOwnedEffects(world, id);
        reset(winner, config, world.tick);
        emit(world, {
          kind: 'effect',
          abilityId: 'loi_dai_victory',
          sourceId: id,
          targetId: id,
          x: winner.x,
          y: winner.y,
          damage: 0,
          critical: false,
        });
      }
    }
    if (matchTick < this.gateAt) return;
    for (const hero of world.heroes.values()) {
      if (this.fighters.size >= loiDai.seats.length) break;
      if (this.fighters.has(hero.id) || hero.hp <= 0 || hero.moveY >= 0)
        continue;
      const gate = loiDai.gate;
      if (
        hero.x < gate.x ||
        hero.x > gate.x + gate.width ||
        hero.y < gate.y ||
        hero.y > gate.y + gate.height
      )
        continue;
      const current = [...this.fighters].map((id) => world.heroes.get(id)!)[0];
      const side = current && current.x <= loiDai.spawn.x ? 1 : 0;
      const seat: Point = loiDai.seats[side]!;
      hero.x = seat.x;
      hero.y = seat.y;
      hero.fx = side ? -1 : 1;
      hero.fy = 0;
      hero.moveX = hero.moveY = 0;
      this.fighters.add(hero.id);
    }
  }
}
