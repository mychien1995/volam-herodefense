import { TayDocEncounter, TayDocGate } from './tay-doc.js';
import type { TayDocDefinition } from './tay-doc-types.js';
import {
  clearNamDe,
  gateNamDe,
  initializeNamDe,
  spawnNamDeIfReady,
} from './nam-de.js';
import type { NamDeDefinition } from './nam-de-types.js';
import { KimLuanEncounter } from './kim-luan.js';
import { DongTaEncounter } from './dong-ta.js';
import type { DongDefinition } from './dong-ta-types.js';

import { BossPartyState, isBossDungeon } from './boss-party.js';
import type { KimDefinition } from './kim-types.js';
import { spawnChu, drinkChuWine } from './chu-ba-thong.js';
import { validateChuDefinition, type ChuDefinition } from './chu-types.js';
import { HongLietEncounter } from './hong-liet.js';
import type { HongLietDefinition } from './hong-liet-types.js';
import { distance, blocked } from './geometry.js';
import { spawnBossEncounter } from './boss-encounter.js';
import type { BossEncounterDefinition } from './boss-types.js';
import { cancelOwnedEffects } from './status.js';
import {
  changeBuild,
  refreshCharacter,
  characterStats,
} from './progression.js';
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
  kimBoss?: KimDefinition;
  boss?: HongLietDefinition;
  bossEncounter?: BossEncounterDefinition | undefined;
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
  kim?: KimLuanEncounter;
  encounter?: HongLietEncounter;
  emptyBossResetAt?: number | undefined;
  bossRespawnAt?: number | undefined;
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
  creepSpeed?: number;
}
export interface ZoneCombatEvent {
  zoneId: string;
  event: CombatEvent;
}

/** Engine/transport independent zone ownership. No client-submitted membership. */
export class DungeonMatch {
  readonly tayDoc: TayDocEncounter | undefined;
  readonly tayDocGate = new TayDocGate();
  readonly zones = new Map<string, MatchZone>();
  readonly membership = new Map<string, string>();
  readonly respawns = new Map<string, number>();
  readonly party = new BossPartyState();
  private readonly offline = new Map<string, Hero>();
  readonly arena: MatchZone;
  readonly invasion: InvasionDirector | undefined;
  readonly dongTa: DongTaEncounter | undefined;
  tick = 0;
  arenaTick = 0;
  nowMs = 0;
  get arenaPaused(): boolean {
    // The approved wave encounter must reach the court and recall the party even
    // when everyone has entered a dungeon. Its own wave clock never pauses.
    const dong = this.dongTa;
    if (
      dong &&
      dong.phase !== 'cleared' &&
      (dong.phase !== 'waiting' ||
        ((this.invasion?.wave ?? 0) >= dong.definition.gateWave &&
          ![...this.arena.world.creeps.values()].some(
            (c) => c.invasion?.wave === dong.definition.gateWave && c.hp > 0,
          )))
    )
      return false;
    const connected = [...this.membership.keys()].filter(
      (id) => !this.party.disconnected.has(id),
    );
    if (!connected.length) return false;
    const zone = this.zoneOf(connected[0]!);
    return (
      !!zone &&
      isBossDungeon(zone.dungeon) &&
      connected.every((id) => this.zoneOf(id) === zone)
    );
  }
  events: ZoneCombatEvent[] = [];
  readonly definitions = new Map<string, CreepDungeonDefinition>();
  constructor(
    readonly base: SimulationConfig,
    readonly dungeon: CreepDungeonDefinition,
    private readonly seed = 42,
    invasion?: InvasionDefinition,
    additionalDungeons: CreepDungeonDefinition[] = [],
    dongTa?: DongDefinition,
    tayDoc?: TayDocDefinition,
    namDe?: NamDeDefinition,
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
    if (tayDoc) this.tayDoc = new TayDocEncounter(tayDoc);
    if (invasion) {
      this.arena.config = {
        ...base,
        collision: [...base.collision, invasion.statue.collision],
      };
      this.invasion = new InvasionDirector(invasion, this.arena.world);
    }
    if (dongTa && invasion)
      this.dongTa = new DongTaEncounter(dongTa, {
        lock: (locked) => {
          this.arena.config = {
            ...this.base,
            collision: locked
              ? [...this.base.collision]
              : [...this.base.collision, invasion.statue.collision],
            heroBounds: locked ? dongTa.bounds : undefined,
          };
          if (this.arena.world.statue)
            this.arena.world.statue.invulnerable = locked;
          if (!locked) this.releaseStatueOccupants();
        },
        recall: () => {
          this.party.invitations.clear();
          for (const id of [...this.membership.keys()]) this.recallForBoss(id);
        },
      });
    if (namDe) initializeNamDe(this.arena.world, this.arena.config, namDe);
  }
  add(id: string, nickname: string): Hero {
    const hero = addHero(this.arena.world, id, nickname, this.base);
    this.membership.set(id, 'arena');
    if (this.dongTa?.locked) this.recallForBoss(id);
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
    if (zone?.access === 'arena')
      this.tayDoc?.depart(zone.world, zone.config, id, false);
    if (zone) removeHero(zone.world, id);
    if (zone?.kim && !zone.world.heroes.size) zone.kim.clear(zone.world);
    if (zone?.dungeon?.bossEncounter && !zone.world.heroes.size)
      zone.emptyBossResetAt =
        this.tick + zone.dungeon.bossEncounter.emptyResetTicks;
    this.membership.delete(id);
    this.respawns.delete(id);
    this.offline.delete(id);
    this.party.remove(id);
    if (zone?.encounter && !zone.world.heroes.size)
      zone.encounter.clear(zone.world);
  }
  disconnect(id: string): void {
    const hero = this.hero(id);
    if (!hero) return;
    // Settle an observed lethal hit before leaving the instance.
    this.observeDeath(id);
    this.transfer(id, this.arena, this.base.spawn);
    removeHero(this.arena.world, id);
    this.offline.set(id, hero);
    this.party.disconnected.add(id);
    this.respawns.delete(id);
  }
  reconnect(id: string): void {
    const hero = this.offline.get(id);
    if (!hero) return;
    hero.hp = hero.maxHp;
    hero.mana = hero.maxMana;
    hero.bossSpectator = false;
    hero.pose = 'idle';
    this.arena.world.heroes.set(id, hero);
    this.membership.set(id, 'arena');
    this.party.disconnected.delete(id);
    this.offline.delete(id);
    if (this.dongTa?.locked) this.recallForBoss(id);
  }
  summonHelp(id: string, nowMs = this.nowMs): string | undefined {
    const zone = this.zoneOf(id);
    if (
      !zone ||
      !isBossDungeon(zone.dungeon) ||
      !this.hero(id) ||
      this.party.disconnected.has(id)
    )
      return 'Chưa ở trong phó bản boss.';
    for (const peer of this.membership.keys())
      if (
        peer !== id &&
        !this.party.disconnected.has(peer) &&
        this.zoneOf(peer) !== zone
      )
        this.party.invite(id, peer, zone, nowMs);
    return undefined;
  }
  replyInvitation(
    id: string,
    invitationId: number,
    accept: boolean,
    nowMs = this.nowMs,
  ): string | undefined {
    this.party.expire(nowMs);
    const invitation = this.party.invitations.get(id);
    if (!invitation || invitation.id !== invitationId)
      return 'Lời mời đã hết hạn.';
    this.party.invitations.delete(id);
    if (!accept) return undefined;
    const hero = this.hero(id),
      source = this.zoneOf(id);
    if (!hero || hero.hp <= 0 || !source || this.party.disconnected.has(id))
      return 'Không thể vào phó bản lúc này.';
    if (source.access !== 'arena')
      this.transfer(id, this.arena, this.base.spawn);
    return this.enter(id, 'shared', invitation.destination);
  }
  canEnterDungeon(id: string): boolean {
    const hero = this.hero(id);
    return (
      !this.invasion?.defeated &&
      !this.dongTa?.locked &&
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
    access = isBossDungeon(dungeon) ? 'shared' : 'private';
    if (!this.canEnterDungeon(id))
      return 'Chỉ vào phó bản khi còn sống tại đấu trường.';
    const entrySpeed = isBossDungeon(dungeon)
      ? undefined
      : characterStats(
          this.hero(id)!,
          this.zoneOf(id)!.config,
          this.zoneOf(id)!.world.tick,
        ).total.movementSpeed * 0.648;
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
      const creepSpeed = entrySpeed;
      const config = this.waveConfig(1, 1, dungeon, creepSpeed);
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
        ...(creepSpeed === undefined ? {} : { creepSpeed }),
      };
      if (dungeon.kimBoss) {
        zone.kim = new KimLuanEncounter(dungeon.kimBoss);
        zone.kim.initialize(zone.world, config);
      } else if (dungeon.boss) {
        zone.encounter = new HongLietEncounter(dungeon.boss);
        zone.encounter.initialize(zone.world, config);
      } else if (dungeon.chuBoss) {
        zone.world.creeps.clear();
        spawnChu(zone.world, config, dungeon.chuBoss);
      } else if (dungeon.bossEncounter) {
        spawnBossEncounter(zone.world, config, key);
      } else spawnCreeps(zone.world, config, 'wave_1');
      if (!zone.encounter && !zone.kim && !zone.world.chu && !zone.world.boss)
        this.assignRoster(zone);
      this.zones.set(key, zone);
    }
    this.party.observe(zone);
    if (
      this.membership.size === 1 &&
      isBossDungeon(dungeon) &&
      this.party.life(zone, id).eliminated
    )
      return 'Đã hết lượt hồi sinh. Hãy chờ boss reset.';
    if (entrySpeed !== undefined) {
      zone.creepSpeed = entrySpeed;
      zone.config.creep.speed = entrySpeed;
      for (const creep of zone.world.creeps.values())
        if (creep.stats) creep.stats.speed = entrySpeed;
    }
    this.tayDoc?.depart(this.arena.world, this.arena.config, id, true);
    if ((this.hero(id)?.hp ?? 0) <= 0)
      return 'Độc nổ đã hạ gục bạn trước khi rời đấu trường.';
    zone.emptyBossResetAt = undefined;
    const occupant = zone.world.heroes.size;
    this.transfer(
      id,
      zone,
      dungeon.boss || dungeon.chuBoss || dungeon.kimBoss
        ? {
            x: dungeon.spawn.x + ((occupant % 3) - 1) * 28,
            y:
              dungeon.spawn.y +
              Math.floor(occupant / 3) * 28 * (dungeon.chuBoss ? -1 : 1),
          }
        : { x: dungeon.spawn.x, y: dungeon.spawn.y + occupant * 24 },
    );
    if (isBossDungeon(dungeon) && this.party.life(zone, id).eliminated) {
      const hero = this.hero(id)!;
      hero.hp = 0;
      hero.bossSpectator = true;
      hero.pose = 'death';
    }
    this.party.invitations.delete(id);
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
      (hero.hp <= 0 && !hero.bossSpectator) ||
      !zone.dungeon ||
      (!hero.bossSpectator &&
        distance(hero, zone.dungeon.exit) > zone.dungeon.exitRange)
    )
      return 'Hãy đến gần cửa và nhấn Space để rời phó bản.';
    this.transfer(id, this.arena, zone.dungeon.arenaReturn);
    if (hero.bossSpectator) {
      hero.bossSpectator = false;
      hero.hp = hero.maxHp;
      hero.mana = hero.maxMana;
      hero.pose = 'idle';
    }
    return undefined;
  }
  interact(id: string): string | undefined {
    const zone = this.zoneOf(id);
    if (zone && drinkChuWine(zone.world, id)) return;
    return this.exit(id);
  }
  input(id: string, sequence: number, command: Command): string | undefined {
    if (this.invasion?.defeated) return 'Trận đấu đã kết thúc.';
    const zone = this.zoneOf(id);
    if (!zone) return 'Người chơi chưa ở trong khu vực hoạt động.';
    if (this.party.disconnected.has(id) || this.hero(id)?.bossSpectator)
      return 'Đang quan chiến.';
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
  step(nowMs = ((this.tick + 1) * 1000) / this.base.tickRate): void {
    if (this.invasion?.defeated) {
      this.events = [];
      this.invasion.events = [];
      return;
    }
    this.tick++;
    this.nowMs = nowMs;
    this.party.expire(nowMs);
    this.events = [];
    const paused = this.arenaPaused;
    if (!paused) this.arenaTick++;
    if (!paused)
      this.invasion?.beforeStep(
        this.arena.world,
        this.arena.config,
        this.arenaTick,
        this.membership.size - this.party.disconnected.size,
      );
    if (!paused)
      this.dongTa?.beforeStep(
        this.arena.world,
        this.arena.config,
        this.invasion?.wave ?? 0,
      );
    for (const zone of this.zones.values()) {
      if (zone === this.arena && paused) {
        zone.world.events = [];
        if (this.invasion) this.invasion.events = [];
        continue;
      }
      if (zone.access === 'arena')
        spawnNamDeIfReady(zone.world, zone.config, zone.world.tick + 1);
      if (zone.kim?.phase === 'defeated') {
        zone.bossDiedMatchTick ??= this.tick;
        if (
          this.tick - zone.bossDiedMatchTick >=
          zone.kim.definition.respawnTicks
        ) {
          zone.kim.initialize(zone.world, zone.config);
          delete zone.bossDiedMatchTick;
        }
      }
      const encounter = zone.dungeon?.bossEncounter;
      if (encounter) {
        const boss = zone.world.creeps.get(zone.world.boss!.actorId)!;
        if (boss.hp <= 0)
          zone.bossRespawnAt ??= this.tick + encounter.respawnTicks;
        if (
          zone.bossRespawnAt !== undefined &&
          this.tick >= zone.bossRespawnAt
        ) {
          spawnBossEncounter(zone.world, zone.config, zone.id);
          zone.bossRespawnAt = undefined;
          zone.emptyBossResetAt = undefined;
        }
        if (!zone.world.heroes.size && boss.hp > 0) {
          zone.emptyBossResetAt ??= this.tick + encounter.emptyResetTicks;
          if (this.tick >= zone.emptyBossResetAt) {
            spawnBossEncounter(zone.world, zone.config, zone.id);
            // A reset is done once per empty period, never every tick.
            zone.emptyBossResetAt = Infinity;
          }
        }
      }
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
        zone.kim?.emptyStep(zone.world, zone.config, this.tick);
        zone.encounter?.emptyStep(zone.world, zone.config, this.tick);
        this.observeAttempt(zone);
        continue;
      }
      delete zone.emptySince;
      const wasDead = zone.world.chu?.deadAt;
      stepWorld(zone.world, zone.config);
      if (zone.access === 'arena')
        this.dongTa?.afterStep(zone.world, zone.config);
      if (wasDead === undefined && zone.world.chu?.deadAt !== undefined)
        zone.bossDiedMatchTick = this.tick;
      zone.kim?.step(zone.world, zone.config);
      zone.encounter?.step(zone.world, zone.config);
      if (zone.access === 'arena' && this.tayDoc) {
        if (this.dongTa?.phase === 'cleared')
          this.tayDocGate.completeChapter('dong_ta');
        if (this.invasion)
          this.tayDocGate.step(
            zone.world,
            zone.config,
            this.invasion.wave,
            this.tayDoc,
          );
        this.tayDoc.step(zone.world, zone.config);
      }
      this.observeAttempt(zone);
      if (encounter && zone.world.creeps.get(zone.world.boss!.actorId)!.hp <= 0)
        zone.bossRespawnAt ??= this.tick + encounter.respawnTicks;
      for (const event of zone.world.events)
        this.events.push({ zoneId: zone.id, event });
      if (zone.access === 'arena') {
        this.invasion?.afterStep(zone.world, this.arenaTick);
        if (!this.tayDoc || this.tayDoc.phase === 'dead')
          gateNamDe(zone.world, this.invasion?.wave ?? 0, zone.world.tick);
        if (this.invasion?.defeated) {
          this.tayDoc?.dispose(this.arena.world);
          for (const active of this.zones.values()) {
            clearNamDe(active.world);
            active.kim?.clear(active.world);
            for (const id of active.world.heroes.keys())
              cancelOwnedEffects(active.world, id);
            active.world.pending = [];
            active.world.projectiles.clear();
            if (active.world.boss) active.world.boss.cast = undefined;
          }
          return;
        }
      }
      if (
        zone.access !== 'arena' &&
        !zone.dungeon?.boss &&
        !zone.dungeon?.chuBoss &&
        !zone.dungeon?.kimBoss &&
        !encounter &&
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
            zone.creepSpeed,
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
      if (this.dongTa?.phase === 'retry') continue;
      if (this.party.disconnected.has(id) || hero.bossSpectator) continue;
      const zone = this.zoneOf(id)!;
      const dungeon = zone.dungeon ?? this.dungeon;
      this.observeDeath(id);
      if (hero.hp > 0 || hero.bossSpectator) continue;
      if (!this.respawns.has(id))
        this.respawns.set(id, this.tick + dungeon.respawnTicks);
      if (this.tick >= this.respawns.get(id)!) {
        if (isBossDungeon(zone.dungeon)) {
          hero.x = dungeon.spawn.x;
          hero.y = dungeon.spawn.y;
          hero.moveX = hero.moveY = 0;
        } else
          this.transfer(
            id,
            this.arena,
            this.dongTa?.locked ? this.bossFormation(id) : this.base.spawn,
          );
        hero.hp = hero.maxHp;
        hero.mana = hero.maxMana;
        hero.pose = 'idle';
        this.respawns.delete(id);
      }
    }
  }
  private observeAttempt(zone: MatchZone): void {
    if (!this.party.observe(zone)) return;
    for (const hero of zone.world.heroes.values()) {
      this.respawns.delete(hero.id);
      hero.bossSpectator = false;
      if (hero.hp <= 0) {
        hero.hp = hero.maxHp;
        hero.mana = hero.maxMana;
        hero.x = zone.dungeon!.spawn.x;
        hero.y = zone.dungeon!.spawn.y;
        hero.pose = 'idle';
      }
    }
  }
  private observeDeath(id: string): void {
    const zone = this.zoneOf(id),
      hero = this.hero(id);
    if (
      !zone ||
      !hero ||
      hero.hp > 0 ||
      !isBossDungeon(zone.dungeon) ||
      hero.bossSpectator ||
      this.respawns.has(id)
    )
      return;
    const life = this.party.life(zone, id);
    cancelOwnedEffects(zone.world, id);
    if (life.revivalUsed) {
      life.eliminated = true;
      hero.bossSpectator = true;
      hero.moveX = hero.moveY = 0;
      if (this.membership.size === 1) {
        this.transfer(id, this.arena, this.base.spawn);
        hero.hp = hero.maxHp;
        hero.mana = hero.maxMana;
        hero.pose = 'idle';
        hero.bossSpectator = false;
      }
    } else {
      life.revivalUsed = true;
      this.respawns.set(id, this.tick + this.base.tickRate * 5);
    }
  }
  private assignRoster(zone: MatchZone): void {
    const roster = zone.dungeon?.creepRoster;
    if (!roster?.length) return;
    for (const creep of zone.world.creeps.values())
      creep.archetypeId = roster[(zone.wave - 1) % roster.length]!;
  }
  private bossFormation(id: string): Point {
    const d = this.dongTa!.definition,
      index = [...this.membership.keys()].indexOf(id);
    for (let offset = 0; offset < 24; offset++) {
      const a = (index * Math.PI) / 3 + (offset * Math.PI) / 12;
      const point = {
        x: d.center.x + Math.cos(a) * 190,
        y: d.center.y + Math.sin(a) * 170,
      };
      if (
        !blocked(
          point,
          this.base.radius,
          this.arena.config.width,
          this.arena.config.height,
          this.arena.config.collision,
        )
      )
        return point;
    }
    throw Error('No legal boss recall point');
  }
  /** Restore solid statue scenery without trapping feet that occupied its hidden base. */
  private releaseStatueOccupants(): void {
    const c = this.arena.config;
    const legal = (p: Point) =>
      !blocked(p, c.radius, c.width, c.height, c.collision);
    for (const hero of this.arena.world.heroes.values()) {
      if (legal(hero)) continue;
      const from = { x: hero.x, y: hero.y };
      let destination: Point | undefined;
      for (let radius = 8; radius <= 128 && !destination; radius += 8)
        for (let i = 0; i < 16; i++) {
          const a = Math.PI / 2 + (i * Math.PI) / 8,
            point = {
              x: from.x + Math.cos(a) * radius,
              y: from.y + Math.sin(a) * radius,
            };
          if (legal(point)) {
            destination = point;
            break;
          }
        }
      destination ??= this.base.spawn;
      if (!legal(destination)) throw Error('No legal statue release position');
      hero.x = destination.x;
      hero.y = destination.y;
    }
  }
  private recallForBoss(id: string): void {
    const hero = this.hero(id);
    if (!hero) return;
    const dead = hero.hp <= 0;
    this.transfer(id, this.arena, this.bossFormation(id));
    hero.bossSpectator = false;
    if (dead) {
      hero.hp = hero.maxHp;
      hero.mana = hero.maxMana;
      hero.pose = 'idle';
    }
    this.respawns.delete(id);
  }
  private waveConfig(
    wave: number,
    players: number,
    d: CreepDungeonDefinition,
    creepSpeed?: number,
  ): SimulationConfig {
    const count = Math.ceil(
      d.baseCount * (1 + d.countPerAdditionalPlayer * (players - 1)),
    );
    return {
      ...this.base,
      bossEncounter: d.bossEncounter,
      width: d.width,
      height: d.height,
      collision: d.collision,
      spawn: d.spawn,
      creepSpawns: Array.from(
        { length: d.boss || d.chuBoss || d.kimBoss ? 0 : count },
        (_, i) => ({
          ...d.creepSpawns[i % d.creepSpawns.length]!,
        }),
      ),
      creepRespawn: false,
      dungeonAggro: !(d.boss || d.chuBoss || d.kimBoss || d.bossEncounter),
      creep: {
        ...this.base.creep,
        ...(creepSpeed === undefined ? {} : { speed: creepSpeed }),
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
    if (source.access === 'arena')
      this.tayDoc?.depart(source.world, source.config, id, true);
    const convert = (until: number) =>
      destination.world.tick + Math.max(0, until - source.world.tick);
    hero.cooldown = convert(hero.cooldown);
    if (hero.basicChainDeadline)
      hero.basicChainDeadline.until = convert(hero.basicChainDeadline.until);
    if (hero.dashRechargeAt !== undefined)
      hero.dashRechargeAt = convert(hero.dashRechargeAt);
    hero.skillCooldowns = hero.skillCooldowns.map(convert);
    if (hero.abilityCooldowns)
      for (const key of Object.keys(hero.abilityCooldowns))
        hero.abilityCooldowns[key] = convert(hero.abilityCooldowns[key]!);
    hero.statuses = [];
    refreshCharacter(hero, destination.config);
    removeHero(source.world, id);
    if (source.kim && !source.world.heroes.size) source.kim.clear(source.world);
    if (source.encounter && !source.world.heroes.size)
      source.encounter.clear(source.world); // cancels queued inputs, future shots and owned missiles
    if (source.dungeon?.bossEncounter && !source.world.heroes.size)
      source.emptyBossResetAt =
        this.tick + source.dungeon.bossEncounter.emptyResetTicks;
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
