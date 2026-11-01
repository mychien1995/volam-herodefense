import { spawnChu } from './chu-ba-thong.js';
import { validateChuDefinition, type ChuDefinition } from './chu-types.js';
import { HongLietEncounter } from './hong-liet.js';
import type { HongLietDefinition } from './hong-liet-types.js';
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
  boss?: HongLietDefinition;
  id: string;
  chuBoss?: ChuDefinition;
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
  /** Optional visual identities; all use the existing common creep mechanics. */
  creepRoster?: string[] | undefined;
}
export interface MatchZone {
  encounter?: HongLietEncounter;
  id: string;
  access: 'arena' | DungeonAccess;
  ownerId: string;
  world: World;
  config: SimulationConfig;
  wave: number;
  spawnPlayerCount: number;
  nextWaveAt: number | undefined;
  /** Forest visual roster continues through actual spawn counts, per instance. */
  forestRosterCursor?: number;
  emptySince?: number;
  bossDiedMatchTick?: number;
  dungeon?: CreepDungeonDefinition;
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
  readonly definitions = new Map<string, CreepDungeonDefinition>();
  constructor(
    readonly base: SimulationConfig,
    readonly dungeon: CreepDungeonDefinition,
    private readonly seed = 42,
    invasion?: InvasionDefinition,
    additionalDungeons: CreepDungeonDefinition[] = [],
  ) {
    for (const definition of [dungeon, ...additionalDungeons]) {
      if (this.definitions.has(definition.id))
        throw new Error(`Duplicate dungeon definition: ${definition.id}`);
      if (definition.chuBoss) validateChuDefinition(definition.chuBoss, base);
      this.definitions.set(definition.id, definition);
    }
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
    if (zone?.encounter && !zone.world.heroes.size)
      zone.encounter.clear(zone.world);
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
  enter(
    id: string,
    access: DungeonAccess,
    destination = this.dungeon.id,
  ): string | undefined {
    const dungeon = this.definitions.get(destination);
    if (!dungeon || !['private', 'shared'].includes(access))
      return 'Phó bản này chưa mở.';
    if (!this.canEnterDungeon(id))
      return 'Chỉ vào phó bản khi còn sống tại đấu trường.';
    const key =
      access === 'shared'
        ? `${dungeon.id}_shared`
        : `${dungeon.id}_private_${id}`;
    let zone = this.zones.get(key);
    if (
      zone &&
      ((zone.ownerId && zone.ownerId !== id) ||
        zone.world.heroes.size >= (access === 'private' ? 1 : dungeon.capacity))
    )
      return 'Phó bản đã đầy hoặc thuộc về người chơi khác.';
    if (!zone) {
      // Hash instance identity so private RNG streams do not consume arena RNG.
      let seed = this.seed;
      for (const c of key)
        seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
      const config = this.waveConfig(1, 1, dungeon);
      zone = {
        id: key,
        access,
        ownerId: access === 'private' ? id : '',
        world: createWorld(config, seed),
        config,
        wave: 1,
        spawnPlayerCount: 1,
        nextWaveAt: undefined,
        dungeon,
      };
      if (dungeon.boss) {
        zone.encounter = new HongLietEncounter(dungeon.boss);
        zone.encounter.initialize(zone.world, config);
      } else if (dungeon.chuBoss) {
        zone.world.creeps.clear();
        spawnChu(zone.world, config, dungeon.chuBoss);
      } else spawnCreeps(zone.world, config, 'wave_1');
      if (!zone.encounter && !zone.world.chu) this.assignRoster(zone);
      this.zones.set(key, zone);
    }
    const occupant = zone.world.heroes.size;
    this.transfer(
      id,
      zone,
      dungeon.boss || dungeon.chuBoss
        ? {
            x: dungeon.spawn.x + ((occupant % 3) - 1) * 28,
            y:
              dungeon.spawn.y +
              Math.floor(occupant / 3) * 28 * (dungeon.chuBoss ? -1 : 1),
          }
        : { x: dungeon.spawn.x, y: dungeon.spawn.y + occupant * 24 },
    );
    return undefined;
  }
  exit(id: string): string | undefined {
    if (this.invasion?.defeated) return 'Trận đấu đã kết thúc.';
    const zone = this.zoneOf(id),
      hero = this.hero(id);
    if (
      !zone ||
      zone.access === 'arena' ||
      !hero ||
      hero.hp <= 0 ||
      !zone.dungeon ||
      distance(hero, zone.dungeon.exit) > zone.dungeon.exitRange
    )
      return 'Hãy đến gần cửa và nhấn Space để rời phó bản.';
    this.transfer(id, this.arena, zone.dungeon.arenaReturn);
    return undefined;
  }
  input(id: string, sequence: number, command: Command): string | undefined {
    if (this.invasion?.defeated) return 'Trận đấu đã kết thúc.';
    const zone = this.zoneOf(id);
    if (!zone) return 'Người chơi chưa ở trong khu vực hoạt động.';
    if (
      this.hero(id)?.progression &&
      ['select-basic', 'dev-loadout'].includes(command.kind)
    )
      return 'Dùng yêu cầu võ học để đổi kỹ năng.';
    if (
      (command.kind === 'select-basic' || command.kind === 'dev-loadout') &&
      zone.access !== 'arena'
    )
      return 'Chỉ được đổi đòn đánh thường tại đấu trường.';
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
      if (zone.dungeon?.chuBoss && zone.world.chu?.deadAt !== undefined) {
        zone.bossDiedMatchTick ??= this.tick;
        if (
          this.tick - zone.bossDiedMatchTick >=
          zone.dungeon.chuBoss.bossRespawnTicks
        ) {
          spawnChu(
            zone.world,
            zone.config,
            zone.dungeon.chuBoss,
            zone.world.chu,
          );
          delete zone.bossDiedMatchTick;
        }
      }
      if (zone.access !== 'arena' && !zone.world.heroes.size) {
        zone.world.events = [];
        if (zone.dungeon?.chuBoss) {
          zone.emptySince ??= this.tick;
          const previous = zone.world.chu;
          if (previous)
            for (const loot of previous.loot)
              if (loot.state === 'rolling') loot.state = 'ground';
          if (
            previous?.deadAt === undefined &&
            this.tick - zone.emptySince >= zone.dungeon.chuBoss.emptyResetTicks
          ) {
            spawnChu(zone.world, zone.config, zone.dungeon.chuBoss, previous);
            zone.world.projectiles.clear();
            zone.world.actions = [];
            zone.world.areas = [];
            zone.emptySince = this.tick;
          }
        }
        zone.encounter?.emptyStep(zone.world, zone.config, this.tick);
        continue;
      }
      delete zone.emptySince;
      const wasDead = zone.world.chu?.deadAt;
      stepWorld(zone.world, zone.config);
      if (wasDead === undefined && zone.world.chu?.deadAt !== undefined)
        zone.bossDiedMatchTick = this.tick;
      zone.encounter?.step(zone.world, zone.config);
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
        !zone.dungeon?.boss &&
        !zone.dungeon?.chuBoss &&
        [...zone.world.creeps.values()].every((c) => c.hp <= 0)
      ) {
        const dungeon = zone.dungeon!;
        zone.nextWaveAt ??= zone.world.tick + dungeon.restTicks;
        if (zone.world.tick >= zone.nextWaveAt) {
          zone.wave++;
          zone.spawnPlayerCount = zone.world.heroes.size;
          zone.config = this.waveConfig(
            zone.wave,
            zone.spawnPlayerCount,
            dungeon,
          );
          spawnCreeps(zone.world, zone.config, `wave_${zone.wave}`);
          this.assignRoster(zone);
          zone.nextWaveAt = undefined;
        }
      }
    }
    // Existing design dependency: a short arena respawn, never a client recall.
    for (const id of this.membership.keys()) {
      const hero = this.hero(id);
      if (!hero || hero.hp > 0) continue;
      const dungeon = this.zoneOf(id)?.dungeon ?? this.dungeon;
      if (!this.respawns.has(id))
        this.respawns.set(id, this.tick + dungeon.respawnTicks);
      if (this.tick >= this.respawns.get(id)!) {
        this.transfer(id, this.arena, this.base.spawn);
        hero.hp = hero.maxHp;
        hero.mana = hero.maxMana;
        hero.pose = 'idle';
        this.respawns.delete(id);
      }
    }
  }
  private assignRoster(zone: MatchZone): void {
    const roster = zone.dungeon?.creepRoster;
    if (!roster?.length) return;
    const forest = zone.dungeon?.id === 'forest';
    let i = forest
      ? (zone.forestRosterCursor ?? 0)
      : (zone.wave - 1) * zone.config.creepSpawns.length;
    for (const creep of zone.world.creeps.values())
      creep.archetypeId = roster[i++ % roster.length]!;
    if (forest) zone.forestRosterCursor = i % roster.length;
  }
  private waveConfig(
    wave: number,
    players: number,
    d: CreepDungeonDefinition,
  ): SimulationConfig {
    const count = Math.ceil(
      d.baseCount * (1 + d.countPerAdditionalPlayer * (players - 1)),
    );
    return {
      ...this.base,
      width: d.width,
      height: d.height,
      collision: d.collision,
      spawn: d.spawn,
      creepSpawns: Array.from(
        { length: d.boss || d.chuBoss ? 0 : count },
        (_, i) => ({
          ...d.creepSpawns[i % d.creepSpawns.length]!,
        }),
      ),
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
    removeHero(source.world, id);
    if (source.encounter && !source.world.heroes.size)
      source.encounter.clear(source.world); // cancels queued inputs, future shots and owned missiles
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
