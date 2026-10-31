import { distance } from './geometry.js';
import { cancelOwnedEffects } from './status.js';
import { changeBuild, refreshCharacter } from './progression.js';
import type { BuildChange } from './progression-types.js';
import { InvasionDirector, type InvasionDefinition } from './invasions.js';
import {
  addHero,
  createWorld,
  removeHero,
  spawnCreeps,
  stepWorld,
  submitInput,
} from './simulation.js';
import type {
  Command,
  CombatEvent,
  Hero,
  Point,
  Rect,
  SimulationConfig,
  World,
} from './types.js';

export type DungeonAccess = 'private' | 'shared';
export interface CreepDungeonDefinition {
  id: string;
  width: number;
  height: number;
  collision: Rect[];
  spawn: Point;
  creepSpawns: Point[];
  exit: Point;
  arenaReturn: Point;
  exitRange: number;
  capacity: number;
  restTicks: number;
  respawnTicks: number;
  baseCount: number;
  countPerAdditionalPlayer: number;
  hpPerWave: number;
  damagePerWave: number;
  hpPerAdditionalPlayer: number;
  damagePerAdditionalPlayer: number;
}
export interface MatchZone {
  id: string;
  access: 'arena' | DungeonAccess;
  ownerId: string;
  world: World;
  config: SimulationConfig;
  wave: number;
  spawnPlayerCount: number;
  nextWaveAt: number | undefined;
}
export interface ZoneCombatEvent {
  zoneId: string;
  event: CombatEvent;
}

/** Engine/transport independent zone ownership. No client-submitted membership. */
export class DungeonMatch {
  readonly zones = new Map<string, MatchZone>();
  readonly membership = new Map<string, string>();
  readonly respawns = new Map<string, number>();
  readonly arena: MatchZone;
  readonly invasion: InvasionDirector | undefined;
  tick = 0;
  events: ZoneCombatEvent[] = [];
  constructor(
    readonly base: SimulationConfig,
    readonly dungeon: CreepDungeonDefinition,
    private readonly seed = 42,
    invasion?: InvasionDefinition,
  ) {
    this.arena = {
      id: 'arena',
      access: 'arena',
      ownerId: '',
      world: createWorld(base, seed),
      config: base,
      wave: 0,
      spawnPlayerCount: 0,
      nextWaveAt: undefined,
    };
    this.zones.set('arena', this.arena);
    if (invasion) {
      this.arena.config = {
        ...base,
        collision: [...base.collision, invasion.statue.collision],
      };
      this.invasion = new InvasionDirector(invasion, this.arena.world);
    }
  }
  add(id: string, nickname: string): Hero {
    const hero = addHero(this.arena.world, id, nickname, this.base);
    this.membership.set(id, 'arena');
    return hero;
  }
  zoneOf(id: string): MatchZone | undefined {
    return this.zones.get(this.membership.get(id) ?? '');
  }
  hero(id: string): Hero | undefined {
    return this.zoneOf(id)?.world.heroes.get(id);
  }
  remove(id: string): void {
    const zone = this.zoneOf(id);
    if (zone) removeHero(zone.world, id);
    this.membership.delete(id);
    this.respawns.delete(id);
  }
  canEnterDungeon(id: string): boolean {
    const hero = this.hero(id);
    return (
      !this.invasion?.defeated &&
      !!hero &&
      hero.hp > 0 &&
      this.zoneOf(id)?.access === 'arena'
    );
  }
  enter(id: string, access: DungeonAccess): string | undefined {
    if (!this.canEnterDungeon(id))
      return 'Enter dungeons from the arena while alive.';
    const key =
      access === 'shared'
        ? `${this.dungeon.id}_shared`
        : `${this.dungeon.id}_private_${id}`;
    let zone = this.zones.get(key);
    if (
      zone &&
      ((zone.ownerId && zone.ownerId !== id) ||
        zone.world.heroes.size >=
          (access === 'private' ? 1 : this.dungeon.capacity))
    )
      return 'This dungeon instance is full or private.';
    if (!zone) {
      // Hash instance identity so private RNG streams do not consume arena RNG.
      let seed = this.seed;
      for (const c of key)
        seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
      const config = this.waveConfig(1, 1);
      zone = {
        id: key,
        access,
        ownerId: access === 'private' ? id : '',
        world: createWorld(config, seed),
        config,
        wave: 1,
        spawnPlayerCount: 1,
        nextWaveAt: undefined,
      };
      spawnCreeps(zone.world, config, 'wave_1');
      this.zones.set(key, zone);
    }
    this.transfer(id, zone, {
      x: this.dungeon.spawn.x,
      y: this.dungeon.spawn.y + zone.world.heroes.size * 24,
    });
    return undefined;
  }
  exit(id: string): string | undefined {
    if (this.invasion?.defeated) return 'The match has ended.';
    const zone = this.zoneOf(id),
      hero = this.hero(id);
    if (
      !zone ||
      zone.access === 'arena' ||
      !hero ||
      hero.hp <= 0 ||
      distance(hero, this.dungeon.exit) > this.dungeon.exitRange
    )
      return 'Walk to the physical dungeon exit portal to return.';
    this.transfer(id, this.arena, this.dungeon.arenaReturn);
    return undefined;
  }
  input(id: string, sequence: number, command: Command): string | undefined {
    if (this.invasion?.defeated) return 'The match has ended.';
    const zone = this.zoneOf(id);
    if (!zone) return 'Player is not in an active zone.';
    if (
      this.hero(id)?.progression &&
      ['select-basic', 'dev-loadout'].includes(command.kind)
    )
      return 'Dùng yêu cầu võ học để đổi kỹ năng.';
    if (
      (command.kind === 'select-basic' || command.kind === 'dev-loadout') &&
      zone.access !== 'arena'
    )
      return 'Change your normal attack in the arena only.';
    submitInput(zone.world, id, sequence, command);
    return undefined;
  }
  modifyBuild(
    id: string,
    sequence: number,
    revision: number,
    change: BuildChange,
  ): string | undefined {
    const hero = this.hero(id),
      zone = this.zoneOf(id);
    if (!hero || !zone) return 'Chưa tham gia trận đấu.';
    if (!Number.isSafeInteger(sequence) || sequence <= hero.lastSequence)
      return 'Yêu cầu đã được xử lý.';
    hero.lastSequence = sequence;
    if (this.invasion?.defeated) return 'Trận đấu đã kết thúc.';
    if (zone.id !== 'arena' || zone.access !== 'arena')
      return 'Chỉ được đổi võ học tại đấu trường. Trong phó bản hoặc PvP chỉ có thể xem.';
    return changeBuild(zone.world, hero, zone.config, revision, change);
  }
  step(): void {
    if (this.invasion?.defeated) {
      this.events = [];
      this.invasion.events = [];
      return;
    }
    this.tick++;
    this.events = [];
    this.invasion?.beforeStep(
      this.arena.world,
      this.arena.config,
      this.tick,
      this.membership.size,
    );
    for (const zone of this.zones.values()) {
      if (zone.access !== 'arena' && !zone.world.heroes.size) {
        zone.world.events = [];
        continue;
      }
      stepWorld(zone.world, zone.config);
      for (const event of zone.world.events)
        this.events.push({ zoneId: zone.id, event });
      if (zone.access === 'arena') {
        this.invasion?.afterStep(zone.world, this.tick);
        if (this.invasion?.defeated) {
          for (const active of this.zones.values()) {
            for (const id of active.world.heroes.keys())
              cancelOwnedEffects(active.world, id);
            active.world.pending = [];
          }
          return;
        }
      }
      if (
        zone.access !== 'arena' &&
        [...zone.world.creeps.values()].every((c) => c.hp <= 0)
      ) {
        zone.nextWaveAt ??= zone.world.tick + this.dungeon.restTicks;
        if (zone.world.tick >= zone.nextWaveAt) {
          zone.wave++;
          zone.spawnPlayerCount = zone.world.heroes.size;
          zone.config = this.waveConfig(zone.wave, zone.spawnPlayerCount);
          spawnCreeps(zone.world, zone.config, `wave_${zone.wave}`);
          zone.nextWaveAt = undefined;
        }
      }
    }
    // Existing design dependency: a short arena respawn, never a client recall.
    for (const id of this.membership.keys()) {
      const hero = this.hero(id);
      if (!hero || hero.hp > 0) continue;
      if (!this.respawns.has(id))
        this.respawns.set(id, this.tick + this.dungeon.respawnTicks);
      if (this.tick >= this.respawns.get(id)!) {
        this.transfer(id, this.arena, this.dungeon.arenaReturn);
        hero.hp = hero.maxHp;
        hero.mana = hero.maxMana;
        hero.pose = 'idle';
        this.respawns.delete(id);
      }
    }
  }
  private waveConfig(wave: number, players: number): SimulationConfig {
    const d = this.dungeon;
    const count = Math.ceil(
      d.baseCount * (1 + d.countPerAdditionalPlayer * (players - 1)),
    );
    return {
      ...this.base,
      width: d.width,
      height: d.height,
      collision: d.collision,
      spawn: d.spawn,
      creepSpawns: Array.from({ length: count }, (_, i) => ({
        ...d.creepSpawns[i % d.creepSpawns.length]!,
      })),
      creepRespawn: false,
      creep: {
        ...this.base.creep,
        hp: Math.round(
          this.base.creep.hp *
            (1 + d.hpPerWave * (wave - 1)) *
            (1 + d.hpPerAdditionalPlayer * (players - 1)),
        ),
        damage: Math.round(
          this.base.creep.damage *
            (1 + d.damagePerWave * (wave - 1)) *
            (1 + d.damagePerAdditionalPlayer * (players - 1)),
        ),
      },
    };
  }
  private transfer(id: string, destination: MatchZone, position: Point): void {
    const source = this.zoneOf(id),
      hero = this.hero(id);
    if (!source || !hero) throw new Error('Cannot transfer an unknown hero.');
    const convert = (until: number) =>
      destination.world.tick + Math.max(0, until - source.world.tick);
    hero.cooldown = convert(hero.cooldown);
    hero.skillCooldowns = hero.skillCooldowns.map(convert);
    if (hero.abilityCooldowns)
      for (const key of Object.keys(hero.abilityCooldowns))
        hero.abilityCooldowns[key] = convert(hero.abilityCooldowns[key]!);
    hero.statuses = [];
    refreshCharacter(hero, destination.config);
    removeHero(source.world, id); // cancels queued inputs, future shots and owned missiles
    hero.x = position.x;
    hero.y = position.y;
    hero.moveX = 0;
    hero.moveY = 0;
    hero.lastMoveTick = destination.world.tick;
    hero.actionUntil = destination.world.tick;
    hero.hurtUntil = destination.world.tick;
    hero.pose = hero.hp > 0 ? 'idle' : 'death';
    destination.world.heroes.set(id, hero);
    this.membership.set(id, destination.id);
  }
}
