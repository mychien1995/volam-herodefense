import { LoiDai, loiDai } from './loi-dai.js';
import { canDuel } from './opponents.js';
import { TayDocEncounter, TayDocGate } from './tay-doc.js';
import { enforceConfinement } from './confinement.js';
import { resetQuicksand } from './creep-abilities.js';
import {
  stepWaveBossTest,
  validateWaveBossTest,
  type WaveBossTestOptions,
} from './wave-boss-test.js';
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
import { BacCaiEncounter } from './bac-cai.js';
import {
  VuongEncounter,
  validateVuong,
  VUONG_ID,
  type VuongDefinition,
} from './vuong-trung-duong.js';
import type { WaveArenaView, WaveArenaBoss } from './wave-arena-types.js';
import { NAM_DE_ID } from './nam-de-types.js';
import type { DongDefinition } from './dong-ta-types.js';

import { BossPartyState, isBossDungeon } from './boss-party.js';
import { BossRetries } from './boss-retry.js';
import { MainBossDirector } from './main-bosses.js';
import { validateBacCai, type BacCaiDefinition } from './bac-cai-types.js';
import type { KimDefinition } from './kim-types.js';
import { spawnChu, drinkChuWine } from './chu-ba-thong.js';
import { validateChuDefinition, type ChuDefinition } from './chu-types.js';
import { HongLietEncounter } from './hong-liet.js';
import type { HongLietDefinition } from './hong-liet-types.js';
import { distance, blocked, clampEllipse } from './geometry.js';
import { spawnBossEncounter } from './boss-encounter.js';
import type { BossEncounterDefinition } from './boss-types.js';
import { cancelOwnedEffects } from './status.js';
import { emptyInventory } from './economy.js';
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
  /** Preserve the previous per-wave reward budget after increasing density. */
  rewardBaseCount?: number;
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
  access: 'arena' | 'duel' | DungeonAccess;
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
  readonly bossRetries = new BossRetries(this);
  readonly tayDoc: TayDocEncounter | undefined;
  readonly tayDocGate = new TayDocGate();
  readonly zones = new Map<string, MatchZone>();
  readonly membership = new Map<string, string>();
  readonly respawns = new Map<string, number>();
  readonly party = new BossPartyState();
  private readonly offline = new Map<string, Hero>();
  readonly arena: MatchZone;
  readonly duel: LoiDai;
  private readonly reconnectFromDuel = new Set<string>();
  readonly invasion: InvasionDirector | undefined;
  readonly dongTa: DongTaEncounter | undefined;
  readonly mainBosses: MainBossDirector | undefined;
  waveArena: WaveArenaView | undefined;
  private readonly waveField: SimulationConfig['waveArena'];
  victory = false;
  get waveBossLocked(): boolean {
    if (this.base.campaign && this.bossRetries.isWaitingWave()) return false;
    return !!this.dongTa?.locked || !!this.waveArena?.locked;
  }
  get waveBossRetry(): boolean {
    if (this.base.campaign && this.bossRetries.isWaitingWave()) return false;
    return this.dongTa?.phase === 'retry' || this.waveArena?.phase === 'retry';
  }
  waveArenaView(): WaveArenaView | undefined {
    if (
      this.dongTa &&
      this.dongTa.phase !== 'cleared' &&
      this.dongTa.phase !== 'waiting' &&
      this.dongTa.phase !== 'rest'
    ) {
      const v = this.dongTa.view(this.arena.world);
      return {
        bossId: 'dong_ta',
        phase: v.phase as WaveArenaView['phase'],
        locked: v.locked && !this.bossRetries.isWaitingWave(),
        attempt: v.attempt,
        phaseUntil: v.phaseUntil,
        tick: v.tick,
        bossHp: v.bossHp,
        bossMaxHp: v.bossMaxHp,
        bounds: v.bounds,
      };
    }
    if (!this.waveArena) return;
    const b = this.arena.world.creeps.get(
      this.waveActorId(this.waveArena.bossId),
    );
    return {
      ...this.waveArena,
      tick: this.arena.world.tick,
      bossHp: b?.hp ?? 0,
      bossMaxHp: b?.maxHp ?? 0,
    };
  }
  tick = 0;
  arenaTick = 0;
  nowMs = 0;
  get duelPausesArena(): boolean {
    const players = [...this.membership.keys()].filter(
      (id) => !this.party.disconnected.has(id),
    );
    return (
      players.length > 0 &&
      players.every((id) => this.zoneOf(id) === this.duel.zone)
    );
  }
  get arenaPaused(): boolean {
    if (this.duelPausesArena) return true;
    if (this.base.campaign && this.bossRetries.voting) return true;
    if (
      this.waveArena ||
      (this.mainBosses?.final && this.mainBosses.defeatedBosses.length >= 4) ||
      (this.tayDoc && !['waiting', 'dead'].includes(this.tayDoc.phase)) ||
      (this.arena.world.namDe &&
        !['waiting', 'defeated'].includes(this.arena.world.namDe.phase)) ||
      (this.arena.world.bacCai &&
        !['cleared', 'defeated'].includes(this.arena.world.bacCai.phase))
    )
      return false;
    const wave = this.invasion?.wave ?? 0;
    const next =
      this.dongTa && this.dongTa.phase !== 'cleared'
        ? 5
        : this.tayDoc && this.tayDoc.phase !== 'dead'
          ? 10
          : this.arena.world.namDe?.phase !== 'defeated'
            ? 15
            : 20;
    if (
      this.waveField &&
      wave >= next &&
      ![...(this.arena.world.invasionPending ?? [])].some((w) => w <= next) &&
      ![...this.arena.world.creeps.values()].some(
        (c) => c.hp > 0 && c.invasion && c.invasion.wave <= next,
      )
    )
      return false;
    // The approved wave encounter must reach the court and recall the party even
    // when everyone has entered a dungeon. Its own wave clock never pauses.
    const dong = this.dongTa;
    if (
      dong &&
      dong.phase !== 'cleared' &&
      (dong.phase !== 'waiting' ||
        ((this.invasion?.wave ?? 0) >= dong.definition.gateWave &&
          !this.arena.world.invasionPending?.has(dong.definition.gateWave) &&
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
    bacCai?: BacCaiDefinition,
    waveBossTest?: WaveBossTestOptions,
    vuong?: VuongDefinition,
  ) {
    this.waveField = dongTa ?? base.waveArena;
    if (waveBossTest) {
      validateWaveBossTest(waveBossTest);
      if (!invasion || !dongTa || !tayDoc || !namDe || !bacCai)
        throw Error(
          'Wave boss test requires all four real encounter definitions',
        );
      dongTa = { ...dongTa, restTicks: waveBossTest.firstRestTicks };
      tayDoc = { ...tayDoc, gateRest: waveBossTest.restTicks };
      namDe = { ...namDe, restTicks: waveBossTest.restTicks };
      bacCai = {
        ...bacCai,
        restMs: (waveBossTest.restTicks * 1000) / base.tickRate,
      };
      if (vuong)
        vuong = {
          ...vuong,
          restMs: (waveBossTest.restTicks * 1000) / base.tickRate,
        };
    }
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
      world: createWorld(
        waveBossTest ? { ...base, creepSpawns: [] } : base,
        seed,
      ),
      config: base,
      wave: 0,
      spawnPlayerCount: 0,
      nextWaveAt: undefined,
    };
    this.zones.set('arena', this.arena);
    this.duel = new LoiDai(base, seed);
    if (base.campaign)
      this.arena.world.campaign = {
        chapter: 0,
        players: 1,
        elapsedTicks: 0,
        cleared: new Set(),
      };
    if (waveBossTest)
      this.arena.world.waveBossTest = { ...waveBossTest, stage: 'dong_ta' };
    if (tayDoc) this.tayDoc = new TayDocEncounter(tayDoc);
    if (bacCai) {
      validateBacCai(bacCai, base);
      if (vuong) validateVuong(vuong, base);
      this.mainBosses = new MainBossDirector(bacCai, vuong);
    }
    if (invasion) {
      if (base.campaign)
        invasion.countPerAdditionalPlayer = base.campaign.creepCountPerPlayer;
      this.arena.config = {
        ...base,
        collision: [...base.collision, invasion.statue.collision],
      };
      this.invasion = new InvasionDirector(invasion, this.arena.world);
    }
    if (dongTa && invasion)
      this.dongTa = new DongTaEncounter(dongTa, {
        lock: (locked) => this.lockWaveArena(locked),
        recall: () => {
          this.party.invitations.clear();
          for (const id of [...this.membership.keys()]) this.recallForBoss(id);
        },
      });
    if (namDe) initializeNamDe(this.arena.world, this.arena.config, namDe);
  }
  add(id: string, nickname: string): Hero {
    const hero = addHero(this.arena.world, id, nickname, this.base);
    const startingPotions = this.base.campaign?.startingPotions;
    if (this.base.economy && startingPotions)
      hero.inventory = { ...emptyInventory(), potions: { ...startingPotions } };
    this.membership.set(id, 'arena');
    if (this.waveBossLocked) this.recallForBoss(id);
    return hero;
  }
  zoneOf(id: string): MatchZone | undefined {
    return this.zones.get(this.membership.get(id) ?? '');
  }
  hero(id: string): Hero | undefined {
    return this.zoneOf(id)?.world.heroes.get(id);
  }
  /** Only encounter recovery/refunds may access a temporarily offline character. */
  campaignCharacter(id: string): Hero | undefined {
    return (
      this.duel.saved.get(id)?.hero ?? this.hero(id) ?? this.offline.get(id)
    );
  }
  remove(id: string): void {
    const zone = this.zoneOf(id);
    if (zone?.access === 'arena')
      this.tayDoc?.depart(zone.world, zone.config, id, false);
    zone?.world.bacCai?.participantLeft(id);
    if (zone === this.duel.zone) {
      this.duel.leave(id);
      this.duel.saved.delete(id);
      if (!zone.world.heroes.size) this.zones.delete(loiDai.id);
    } else if (zone) removeHero(zone.world, id);
    this.reconnectFromDuel.delete(id);
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
    if (this.base.campaign) {
      this.party.disconnected.add(id);
      this.bossRetries.disconnect(id);
    }
    if (this.zoneOf(id) === this.duel.zone) this.reconnectFromDuel.add(id);
    // Settle an observed lethal hit before leaving the instance.
    this.observeDeath(id);
    this.transfer(id, this.arena, this.base.spawn);
    const returned = this.hero(id)!;
    removeHero(this.arena.world, id);
    this.offline.set(id, returned);
    this.party.disconnected.add(id);
    this.respawns.delete(id);
  }
  reconnect(id: string): void {
    const hero = this.offline.get(id);
    if (!hero) return;
    if (!this.reconnectFromDuel.delete(id)) {
      hero.hp = hero.maxHp;
      hero.mana = hero.maxMana;
    }
    hero.bossSpectator = false;
    hero.pose = 'idle';
    this.arena.world.heroes.set(id, hero);
    this.membership.set(id, 'arena');
    this.party.disconnected.delete(id);
    this.offline.delete(id);
    if (this.waveBossLocked) this.recallForBoss(id);
    if (this.base.campaign) this.bossRetries.reconnect(id);
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
    if (this.zoneOf(id) === this.duel.zone)
      return 'Hãy rời Lôi Đài trước khi vào phó bản.';
    const hero = this.hero(id),
      source = this.zoneOf(id);
    if (!hero || hero.hp <= 0 || !source || this.party.disconnected.has(id))
      return 'Không thể vào phó bản lúc này.';
    if (source.access !== 'arena')
      this.transfer(id, this.arena, this.base.spawn);
    return this.enter(id, 'shared', invitation.destination);
  }
  enterLoiDai(id: string): string | undefined {
    const hero = this.hero(id);
    if (
      this.victory ||
      this.invasion?.defeated ||
      this.bossRetries.voting ||
      !hero ||
      hero.hp <= 0 ||
      hero.bossSpectator ||
      this.zoneOf(id) !== this.arena ||
      this.party.disconnected.has(id)
    )
      return 'Chỉ vào Lôi Đài khi còn sống ở đấu trường.';
    if (hero.level < loiDai.minLevel) return 'Cần cấp 6 để vào Lôi Đài.';
    this.tayDoc?.depart(this.arena.world, this.arena.config, id, true);
    if (hero.hp <= 0) return 'Hãy hồi sinh trước khi vào Lôi Đài.';
    const tick = this.arena.world.tick;
    const saved: Hero = {
      ...hero,
      skillCooldowns: [...hero.skillCooldowns],
      ...(hero.abilityCooldowns
        ? { abilityCooldowns: { ...hero.abilityCooldowns } }
        : {}),
      ...(hero.chargeCooldowns
        ? { chargeCooldowns: { ...hero.chargeCooldowns } }
        : {}),
      ...(hero.inventory ? { inventory: { ...hero.inventory } } : {}),
      ...(hero.basicChainDeadline
        ? { basicChainDeadline: { ...hero.basicChainDeadline } }
        : {}),
    };
    if (hero.progression)
      hero.progression = {
        ...hero.progression,
        ranks: { ...hero.progression.ranks },
        defaultSkills: [...hero.progression.defaultSkills],
      };
    this.duel.saved.set(id, { hero: saved, tick, matchTick: this.tick });
    this.zones.set(loiDai.id, this.duel.zone);
    this.transfer(id, this.duel.zone, loiDai.spawn);
    this.duel.prepare(hero);
    this.party.invitations.delete(id);
    return undefined;
  }
  exitLoiDai(id: string): string | undefined {
    const saved = this.duel.saved.get(id);
    if (!saved || this.zoneOf(id) !== this.duel.zone)
      return 'Bạn chưa ở Lôi Đài.';
    let position = saved.hero;
    if (
      blocked(
        position,
        this.base.radius,
        this.base.width,
        this.base.height,
        this.arena.config.collision,
      )
    )
      position = { ...position, ...this.base.spawn };
    this.restoreFromLoiDai(id, position);
    return undefined;
  }
  private restoreFromLoiDai(id: string, position: Point): void {
    const { hero, tick, matchTick } = this.duel.saved.get(id)!;
    hero.lastSequence = this.hero(id)!.lastSequence;
    this.duel.leave(id);
    this.duel.saved.delete(id);
    if (!this.duel.zone.world.heroes.size) this.zones.delete(loiDai.id);
    const now = this.arena.world.tick;
    const deadline = (until: number) => now + Math.max(0, until - tick);
    hero.cooldown = deadline(hero.cooldown);
    hero.skillCooldowns = hero.skillCooldowns.map(deadline);
    for (const [id, until] of Object.entries(hero.abilityCooldowns ?? {}))
      hero.abilityCooldowns![id] = deadline(until);
    for (const [id, charges] of Object.entries(hero.chargeCooldowns ?? {}))
      hero.chargeCooldowns![id] = charges
        .filter((until) => until > tick)
        .map(deadline);
    if (hero.dashRechargeAt !== undefined)
      hero.dashRechargeAt = deadline(hero.dashRechargeAt);
    if (hero.basicChainDeadline)
      hero.basicChainDeadline.until = deadline(hero.basicChainDeadline.until);
    if (hero.inventory) {
      if (hero.inventory.auxiliaryReadyAt !== undefined)
        hero.inventory.auxiliaryReadyAt = deadline(
          hero.inventory.auxiliaryReadyAt,
        );
      hero.inventory.potionReadyAt =
        this.tick + Math.max(0, hero.inventory.potionReadyAt - matchTick);
    }
    hero.x = position.x;
    hero.y = position.y;
    hero.lastMoveTick = now;
    hero.moveX = hero.moveY = 0;
    hero.actionUntil = hero.hurtUntil = now;
    hero.pose = 'idle';
    hero.statuses = [];
    delete hero.actionStartedAt;
    delete hero.castAbilityId;
    delete hero.fortune;
    delete hero.comboFinisher;
    delete hero.tamLien;
    this.arena.world.heroes.set(id, hero);
    this.membership.set(id, this.arena.id);
  }
  canEnterDungeon(id: string): boolean {
    const hero = this.hero(id);
    return (
      !this.invasion?.defeated &&
      !this.waveBossLocked &&
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
    const trial = this.base.campaign && this.bossRetries.trials.get(key);
    if (trial && trial.phase === 'vote')
      return 'Hãy đợi biểu quyết đánh lại kết thúc.';
    if (trial && trial.phase === 'waiting')
      return this.bossRetries.call(id, trial.id);
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
      if (this.arena.world.campaign)
        zone.world.campaign = this.arena.world.campaign;
      if (this.arena.world.waveBossTest)
        zone.world.waveBossTest = this.arena.world.waveBossTest;
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
      !this.base.campaign &&
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
    resetQuicksand(zone.world, zone.config);
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
    if (this.base.campaign && isBossDungeon(dungeon)) {
      this.prepareCampaignZone(zone);
      this.bossRetries.observe(zone, this.campaignBossId(zone));
      this.bossRetries.reconnect(id);
    }
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
    if (command.kind === 'move-to' && command.zoneId !== zone.id) return;
    if (
      zone === this.duel.zone &&
      command.kind !== 'move' &&
      command.kind !== 'move-to' &&
      command.kind !== 'auto-basic' &&
      !canDuel(zone.world, id)
    )
      return 'Chỉ dùng võ công khi có hai đấu thủ trên sàn Lôi Đài.';
    if (
      this.party.disconnected.has(id) ||
      (this.hero(id)?.bossSpectator && command.kind !== 'auto-basic')
    )
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
    if (this.party.disconnected.has(id) || hero.bossSpectator)
      return 'Đang quan chiến.';
    if (
      zone === this.duel.zone &&
      (change.action !== 'stance' || !canDuel(zone.world, id))
    )
      return 'Không thể đổi hoặc học võ công trong Lôi Đài.';
    if (
      hero.progression?.mode !== 'fixed' &&
      (zone.id !== 'arena' || zone.access !== 'arena')
    )
      return 'Chỉ được đổi võ học tại đấu trường. Trong phó bản hoặc PvP chỉ có thể xem.';
    return changeBuild(zone.world, hero, zone.config, revision, change);
  }
  step(nowMs = ((this.tick + 1) * 1000) / this.base.tickRate): void {
    if (this.victory) {
      this.events = [];
      return;
    }
    if (this.invasion?.defeated) {
      this.events = [];
      this.invasion.events = [];
      return;
    }
    this.tick++;
    this.nowMs = nowMs;
    if (this.base.campaign) this.bossRetries.advance();
    this.party.expire(nowMs);
    this.events = [];
    const paused = this.arenaPaused;
    if (!paused) this.arenaTick++;
    if (this.arena.world.campaign) {
      const state = this.arena.world.campaign;
      state.players = Math.max(
        1,
        this.membership.size - this.party.disconnected.size,
      );
      state.elapsedTicks = this.arenaTick;
      state.chapter = [
        'dong_ta',
        'tay_doc_boss',
        'boss_nam_de',
        'bac_cai',
      ].filter((id) => state.cleared.has(id)).length;
    }
    if (!paused && this.arena.world.waveBossTest && this.invasion) {
      stepWaveBossTest(this.arena.world, this.invasion, {
        dongTa: this.dongTa?.phase === 'cleared',
        tayDoc: this.tayDoc?.phase === 'dead',
        namDe: this.arena.world.namDe?.phase === 'defeated',
        bacCai:
          this.arena.world.bacCai?.phase === 'defeated' ||
          !!this.mainBosses?.defeatedBosses.includes('bac_cai'),
        ...(this.mainBosses?.final ? { final: this.victory } : {}),
      });
    }
    if (!paused && !this.arena.world.waveBossTest)
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
    if (!paused) this.restartWaveArena();
    for (const zone of this.zones.values()) {
      if (zone === this.duel.zone) continue;
      if (this.base.campaign && this.bossRetries.frozen(zone)) {
        zone.world.events = [];
        continue;
      }
      if (zone === this.arena && paused) {
        zone.world.events = [];
        if (this.invasion) this.invasion.events = [];
        continue;
      }
      if (
        zone.access === 'arena' &&
        !(
          this.waveArena?.phase === 'retry' &&
          this.waveArena.bossId === 'nam_de'
        )
      )
        spawnNamDeIfReady(zone.world, zone.config, zone.world.tick + 1);
      if (zone.access === 'arena') this.syncWaveArena();
      if (this.base.campaign) {
        this.prepareCampaignZone(zone);
        this.bossRetries.observe(zone, this.campaignBossId(zone));
        if (this.bossRetries.frozen(zone)) continue;
      }
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
      const confinementStarts = new Map(
        [...zone.world.creeps].map(([id, e]) => [id, { x: e.x, y: e.y }]),
      );
      stepWorld(zone.world, zone.config);
      if (zone.access === 'arena')
        this.dongTa?.afterStep(zone.world, zone.config);
      if (wasDead === undefined && zone.world.chu?.deadAt !== undefined)
        zone.bossDiedMatchTick = this.tick;
      zone.kim?.step(zone.world, zone.config);
      zone.encounter?.step(zone.world, zone.config);
      if (
        zone.access === 'arena' &&
        this.tayDoc &&
        !(this.base.campaign && this.bossRetries.isWaitingWave())
      ) {
        for (const event of zone.world.events)
          if (event.abilityId === 'gear_cleanse')
            this.tayDoc.poisons.delete(event.sourceId);
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
      enforceConfinement(zone.world, zone.config, confinementStarts);
      this.observeAttempt(zone);
      if (this.base.campaign)
        this.bossRetries.observe(
          zone,
          this.campaignBossId(zone),
          zone.world.vuong?.wipeRequested,
        );
      if (encounter && zone.world.creeps.get(zone.world.boss!.actorId)!.hp <= 0)
        zone.bossRespawnAt ??= this.tick + encounter.respawnTicks;
      for (const event of zone.world.events)
        this.events.push({ zoneId: zone.id, event });
      if (zone.access === 'arena') {
        this.invasion?.afterStep(zone.world, this.arenaTick);
        if (
          (!this.tayDoc || this.tayDoc.phase === 'dead') &&
          !(
            this.waveArena?.phase === 'retry' &&
            this.waveArena.bossId === 'nam_de'
          )
        )
          gateNamDe(zone.world, this.invasion?.wave ?? 0, zone.world.tick);
        if (this.dongTa?.phase === 'cleared')
          this.mainBosses?.recordDefeat('dong_ta');
        if (this.tayDoc?.phase === 'dead')
          this.mainBosses?.recordDefeat('tay_doc');
        if (zone.world.namDe?.phase === 'defeated')
          this.mainBosses?.recordDefeat('nam_de');
        this.mainBosses?.step(zone.world, zone.config, this.invasion);
        this.syncWaveArena();
        if (zone.world.vuong?.state === 'defeated') {
          this.victory = true;
          if (zone.world.waveBossTest)
            zone.world.waveBossTest.stage = 'complete';
          for (const active of this.zones.values()) {
            active.world.projectiles.clear();
            active.world.pending = [];
            for (const id of active.world.heroes.keys())
              cancelOwnedEffects(active.world, id);
          }
          return;
        }
        if (this.invasion?.defeated) {
          this.tayDoc?.dispose(this.arena.world);
          for (const active of this.zones.values()) {
            clearNamDe(active.world);
            active.world.bacCai?.clear(active.world);
            active.world.vuong?.clear(active.world);
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
    this.duel.step(this.tick);
    for (const event of this.duel.zone.world.events)
      this.events.push({ zoneId: loiDai.id, event });
    // Existing design dependency: a short arena respawn, never a client recall.
    for (const id of this.membership.keys()) {
      const hero = this.hero(id);
      if (!hero || hero.hp > 0 || this.zoneOf(id) === this.duel.zone) continue;
      if (this.waveBossRetry) continue;
      if (this.party.disconnected.has(id) || hero.bossSpectator) continue;
      const zone = this.zoneOf(id)!;
      const dungeon = zone.dungeon ?? this.dungeon;
      if (
        this.base.campaign &&
        (isBossDungeon(zone.dungeon) || this.waveBossLocked)
      )
        continue;
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
            this.waveBossLocked ? this.bossFormation(id) : this.base.spawn,
          );
        hero.hp = hero.maxHp;
        hero.mana = hero.maxMana;
        hero.pose = 'idle';
        this.respawns.delete(id);
      }
    }
  }
  private observeAttempt(zone: MatchZone): void {
    if (this.base.campaign) return;
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
    if (this.base.campaign) return;
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
  private waveActorId(id: WaveArenaBoss): string {
    if (id === VUONG_ID) return VUONG_ID;
    return id === 'nam_de'
      ? NAM_DE_ID
      : id === 'tay_doc'
        ? this.tayDoc!.bossId
        : id === 'bac_cai'
          ? this.arena.world.bacCai!.bossId
          : 'dong_ta';
  }
  private lockWaveArena(locked: boolean): void {
    const d = this.waveField;
    if (!d || !this.invasion) return;
    this.arena.config = {
      ...this.base,
      collision: locked
        ? [...this.base.collision]
        : [...this.base.collision, this.invasion.definition.statue.collision],
      heroBounds: locked ? d.bounds : undefined,
    };
    if (this.arena.world.statue) this.arena.world.statue.invulnerable = locked;
    if (!locked) this.releaseStatueOccupants();
  }
  private recallWaveParty(): void {
    this.party.invitations.clear();
    for (const id of this.membership.keys())
      if (!this.party.disconnected.has(id)) this.recallForBoss(id);
  }
  /** Shared field policy; encounter-specific AI/rewards remain owned by their engines. */
  private syncWaveArena(): void {
    if (!this.waveField || !this.invasion) return;
    const w = this.arena.world;
    if (!this.waveArena) {
      const id: WaveArenaBoss | undefined =
        this.tayDoc && !['waiting', 'dead'].includes(this.tayDoc.phase)
          ? 'tay_doc'
          : w.namDe && !['waiting', 'rest', 'defeated'].includes(w.namDe.phase)
            ? 'nam_de'
            : w.bacCai && !['cleared', 'defeated'].includes(w.bacCai.phase)
              ? 'bac_cai'
              : w.vuong?.state === 'fighting'
                ? VUONG_ID
                : undefined;
      if (!id) return;
      this.waveArena = {
        bossId: id,
        phase: 'entry',
        locked: true,
        attempt: 1,
        phaseUntil: 0,
        tick: w.tick,
        bossHp: 0,
        bossMaxHp: 0,
        bounds: this.waveField.bounds,
      };
      this.lockWaveArena(true);
      this.recallWaveParty();
      if (id === VUONG_ID) w.vuong!.scaleParty(w);
      if (id === 'bac_cai') {
        const b = w.creeps.get(w.bacCai!.bossId)!;
        const d = w.bacCai!.definition;
        b.hp = b.maxHp = Math.round(
          d.hp * (1 + d.hpPerAdditionalPlayer * Math.max(0, w.heroes.size - 1)),
        );
        if (b.stats) b.stats.hp = b.maxHp;
      }
    }
    const a = this.waveArena;
    if (a.phase === 'retry') return;
    const b = w.creeps.get(this.waveActorId(a.bossId));
    const defeated =
      a.bossId === 'tay_doc'
        ? this.tayDoc!.phase === 'dead'
        : a.bossId === 'nam_de'
          ? w.namDe!.phase === 'defeated'
          : a.bossId === VUONG_ID
            ? w.vuong!.state === 'defeated'
            : w.bacCai!.phase === 'defeated';
    if (defeated || (b && b.hp <= 0)) {
      this.waveArena = undefined;
      this.lockWaveArena(false);
      return;
    }
    const entering =
      a.bossId === 'tay_doc'
        ? this.tayDoc!.phase === 'enter'
        : a.bossId === 'nam_de'
          ? w.namDe!.phase === 'enter'
          : a.bossId !== VUONG_ID && w.bacCai!.phase === 'entering';
    if (b) {
      b.invulnerable = entering;
      if (!entering) {
        a.phase = 'fighting';
        clampEllipse(b, a.bounds, b.stats?.radius ?? 20);
      }
    }
    const notesWipe = a.bossId === VUONG_ID && w.vuong!.wipeRequested;
    if (this.base.campaign) return;
    if (
      notesWipe ||
      (w.heroes.size && [...w.heroes.values()].every((h) => h.hp <= 0))
    ) {
      if (a.bossId === 'tay_doc') this.tayDoc!.reset(w);
      else if (a.bossId === 'nam_de') {
        const d = w.namDe!.definition;
        clearNamDe(w);
        w.creeps.delete(NAM_DE_ID);
        initializeNamDe(w, this.arena.config, d);
      } else if (a.bossId === VUONG_ID) {
        w.vuong!.clear(w);
      } else {
        w.bacCai!.clear(w);
        w.creeps.delete(w.bacCai!.bossId);
      }
      for (const h of w.heroes.values()) {
        if (notesWipe) {
          h.hp = 0;
          h.pose = 'death';
        }
        cancelOwnedEffects(w, h.id);
        h.moveX = h.moveY = 0;
        this.respawns.delete(h.id);
      }
      w.pending = [];
      a.phase = 'retry';
      a.phaseUntil = w.tick + this.waveField.retryTicks;
    }
  }
  private restartWaveArena(): void {
    if (this.base.campaign) return;
    const a = this.waveArena,
      w = this.arena.world;
    if (
      !a ||
      a.phase !== 'retry' ||
      w.tick + 1 < a.phaseUntil ||
      !w.heroes.size
    )
      return;
    this.recallWaveParty();
    if (a.bossId === 'tay_doc') {
      this.tayDoc!.spawn(w, this.arena.config);
      this.tayDoc!.phase = 'phase1';
      this.tayDoc!.nextActionAt = w.tick + this.waveField!.openingTicks;
    } else if (a.bossId === 'nam_de') {
      w.namDe!.phase = 'rest';
      w.namDe!.spawnAt = w.tick;
      spawnNamDeIfReady(w, this.arena.config, w.tick);
      w.namDe!.phase = 'idle';
      w.namDe!.nextActionAt = w.tick + this.waveField!.openingTicks;
    } else if (a.bossId === VUONG_ID) {
      const e = new VuongEncounter(w.vuong!.definition);
      e.initialize(w, this.arena.config);
    } else {
      const e = new BacCaiEncounter(w.bacCai!.definition);
      delete w.bacCai;
      e.initialize(w, this.arena.config);
      e.phase = 'combat';
      if (this.mainBosses) this.mainBosses.encounter = e;
    }
    const b = w.creeps.get(this.waveActorId(a.bossId))!;
    b.x = this.waveField!.center.x;
    b.y = this.waveField!.center.y;
    b.invulnerable = false;
    a.phase = 'fighting';
    a.phaseUntil = 0;
    a.attempt++;
  }
  private bossFormation(id: string): Point {
    const d = this.waveField!,
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
    const previous = this.hero(id);
    if (!previous) return;
    const dead = previous.hp <= 0 && this.zoneOf(id) !== this.duel.zone;
    this.transfer(id, this.arena, this.bossFormation(id));
    const hero = this.hero(id)!;
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
    const campaign = this.base.campaign;
    const state = this.arena.world.campaign;
    const chapter = campaign
      ? Math.min(
          4,
          Math.max(
            state?.chapter ?? 0,
            Math.floor(
              this.arenaTick / (campaign.chapterSeconds * this.base.tickRate),
            ),
          ),
        )
      : 0;
    const roomPlayers = Math.max(
      1,
      this.membership.size - this.party.disconnected.size,
    );
    const count = Math.ceil(
      d.baseCount * (1 + d.countPerAdditionalPlayer * (players - 1)),
    );
    const populationScale = campaign
      ? 1 + campaign.privateCountPerPlayer * (roomPlayers - 1)
      : 1;
    const spawnCount =
      d.boss || d.chuBoss || d.kimBoss
        ? 0
        : campaign && d.rewardBaseCount === undefined
          ? Math.ceil(d.baseCount * populationScale)
          : count;
    const rewardCount =
      d.rewardBaseCount === undefined || isBossDungeon(d)
        ? undefined
        : Math.ceil(d.rewardBaseCount * populationScale);
    const perCreepReward = (amount: number) =>
      rewardCount === undefined ? amount : (amount * rewardCount) / spawnCount;
    return {
      ...this.base,
      bossEncounter: d.bossEncounter,
      width: d.width,
      height: d.height,
      collision: d.collision,
      spawn: d.spawn,
      dungeonExit: d.exit,
      creepSpawns: Array.from({ length: spawnCount }, (_, i) => ({
        ...d.creepSpawns[i % d.creepSpawns.length]!,
      })),
      creepRespawn: false,
      dungeonId: d.id,
      dungeonAggro: !(d.boss || d.chuBoss || d.kimBoss || d.bossEncounter),
      dungeonEnemyDamageMultiplier: campaign?.dungeonEnemyDamageMultiplier,
      creep: {
        ...this.base.creep,
        ...(creepSpeed === undefined ? {} : { speed: creepSpeed }),
        hp: Math.round(
          this.base.creep.hp *
            (1 + d.hpPerWave * (wave - 1)) *
            (campaign
              ? campaign.dungeonHp[chapter]! *
                (1 + campaign.privateHpPerPlayer * (roomPlayers - 1))
              : 1 + d.hpPerAdditionalPlayer * (players - 1)),
        ),
        damage: Math.round(
          this.base.creep.damage *
            (1 + d.damagePerWave * (wave - 1)) *
            (campaign
              ? campaign.dungeonDamage[chapter]! *
                (1 + campaign.privateDamagePerPlayer * (roomPlayers - 1))
              : 1 + d.damagePerAdditionalPlayer * (players - 1)),
        ),
        xp: perCreepReward(campaign?.dungeonXp[chapter] ?? this.base.creep.xp),
        gold: perCreepReward(
          campaign?.dungeonGold[chapter] ?? this.base.creep.gold,
        ),
      },
    };
  }
  campaignBossId(zone: MatchZone): string | undefined {
    if (zone.access === 'arena') {
      if (this.dongTa && ['fighting', 'retry'].includes(this.dongTa.phase))
        return 'dong_ta';
      return this.waveArena
        ? this.waveActorId(this.waveArena.bossId)
        : undefined;
    }
    return zone.kim
      ? 'kim_luan_phap_vuong'
      : (zone.encounter?.bossId ??
          zone.world.boss?.actorId ??
          (zone.world.chu ? 'chu_ba_thong' : undefined));
  }
  private prepareCampaignZone(zone: MatchZone): void {
    const c = this.base.campaign!;
    const key = this.campaignBossId(zone);
    const boss = key && zone.world.creeps.get(key),
      rule = key && c.bosses[key];
    if (!boss || !rule || boss.hp <= 0) return;
    const players =
      zone.access === 'arena'
        ? (this.bossRetries.activeCount(zone) ??
          Math.max(1, this.membership.size - this.party.disconnected.size))
        : Math.max(1, this.membership.size - this.party.disconnected.size);
    if (boss.campaignPlayers !== undefined && boss.campaignPlayers >= players)
      return;
    const fraction = boss.hp / boss.maxHp;
    boss.maxHp = Math.round(rule.hp * (1 + c.bossHpPerPlayer * (players - 1)));
    boss.hp = Math.max(1, Math.round(boss.maxHp * fraction));
    boss.campaignPlayers = players;
    if (boss.stats) boss.stats.hp = boss.maxHp;
  }
  suspendCampaignBoss(zone: MatchZone, bossId: string): void {
    if (zone.access === 'arena') {
      if (bossId === 'dong_ta') this.dongTa!.suspendCampaign(zone.world);
      else if (bossId === this.tayDoc?.bossId) this.tayDoc.reset(zone.world);
      else if (bossId === NAM_DE_ID) {
        clearNamDe(zone.world);
        zone.world.creeps.delete(NAM_DE_ID);
        zone.world.namDe!.phase = 'rest';
        zone.world.namDe!.spawnAt = Infinity;
      } else if (bossId === VUONG_ID) {
        const boss = zone.world.creeps.get(bossId)!;
        zone.world.vuong!.clear(zone.world);
        boss.hp = 0;
        zone.world.creeps.set(bossId, boss);
      } else {
        zone.world.bacCai!.clear(zone.world);
        zone.world.creeps.delete(bossId);
      }
      if (this.waveArena) {
        this.waveArena.phase = 'retry';
        this.waveArena.locked = false;
      }
      this.lockWaveArena(false);
    } else {
      zone.kim?.clear(zone.world);
      zone.encounter?.clear(zone.world);
      for (const creep of zone.world.creeps.values())
        cancelOwnedEffects(zone.world, creep.id);
    }
    for (const h of zone.world.heroes.values())
      cancelOwnedEffects(zone.world, h.id);
    zone.world.projectiles.clear();
    zone.world.pending = [];
    zone.world.actions = [];
    zone.world.areas = [];
  }
  resetCampaignDungeon(zone: MatchZone): void {
    const d = zone.dungeon!;
    zone.world.creeps.clear();
    zone.world.projectiles.clear();
    zone.world.pending = [];
    zone.world.actions = [];
    zone.world.areas = [];
    if (zone.kim) zone.kim.initialize(zone.world, zone.config);
    else if (zone.encounter) zone.encounter.initialize(zone.world, zone.config);
    else if (d.chuBoss) spawnChu(zone.world, zone.config, d.chuBoss);
    else spawnBossEncounter(zone.world, zone.config, zone.id);
    delete zone.bossDiedMatchTick;
    delete zone.bossRespawnAt;
    delete zone.emptyBossResetAt;
  }
  restartCampaignBoss(zone: MatchZone, bossId: string): void {
    const w = zone.world;
    if (zone.access !== 'arena') this.resetCampaignDungeon(zone);
    else {
      if (bossId === 'dong_ta') this.dongTa!.restartCampaign(w, zone.config);
      else if (bossId === this.tayDoc?.bossId) {
        this.tayDoc.spawn(w, zone.config);
        this.tayDoc.phase = 'phase1';
      } else if (bossId === NAM_DE_ID) {
        const d = w.namDe!.definition;
        clearNamDe(w);
        w.creeps.delete(NAM_DE_ID);
        initializeNamDe(w, zone.config, d);
        w.namDe!.phase = 'rest';
        w.namDe!.spawnAt = w.tick;
        spawnNamDeIfReady(w, zone.config, w.tick);
      } else if (bossId === VUONG_ID) {
        w.creeps.delete(VUONG_ID);
        new VuongEncounter(w.vuong!.definition).initialize(w, zone.config);
      } else {
        const e = new BacCaiEncounter(w.bacCai!.definition);
        delete w.bacCai;
        e.initialize(w, zone.config);
        e.phase = 'combat';
        if (this.mainBosses) this.mainBosses.encounter = e;
      }
      if (this.waveArena) {
        this.waveArena.phase = 'fighting';
        this.waveArena.locked = true;
        this.waveArena.attempt++;
      }
      this.lockWaveArena(true);
    }
  }
  leaveCampaignBoss(id: string, zone: MatchZone): void {
    const h = this.hero(id);
    if (!h || this.zoneOf(id) !== zone) return;
    if (zone.access !== 'arena') this.transfer(id, this.arena, this.base.spawn);
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    h.bossSpectator = false;
    h.pose = 'idle';
    h.x = this.base.spawn.x;
    h.y = this.base.spawn.y;
  }
  private transfer(id: string, destination: MatchZone, position: Point): void {
    const source = this.zoneOf(id),
      hero = this.hero(id);
    if (!source || !hero) throw new Error('Cannot transfer an unknown hero.');
    if (source === this.duel.zone && destination === this.arena) {
      this.restoreFromLoiDai(id, position);
      return;
    }
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
    for (const id of Object.keys(hero.chargeCooldowns ?? {}))
      hero.chargeCooldowns![id] = hero
        .chargeCooldowns![id]!.filter((ready) => ready > source.world.tick)
        .map(convert);
    if (hero.inventory?.auxiliaryReadyAt !== undefined)
      hero.inventory.auxiliaryReadyAt = convert(
        hero.inventory.auxiliaryReadyAt,
      );
    if (hero.abilityCooldowns)
      for (const key of Object.keys(hero.abilityCooldowns))
        hero.abilityCooldowns[key] = convert(hero.abilityCooldowns[key]!);
    hero.statuses = [];
    source.world.bacCai?.participantLeft(id);
    refreshCharacter(hero, destination.config);
    const pooledCharge =
      hero.tamLien?.group === 'creeps' ? hero.tamLien : undefined;
    removeHero(source.world, id);
    if (pooledCharge)
      hero.tamLien = {
        ...pooledCharge,
        targetId: '',
        readyUntil: pooledCharge.readyUntil
          ? convert(pooledCharge.readyUntil)
          : 0,
      };
    if (source.kim && !source.world.heroes.size) source.kim.clear(source.world);
    if (source.encounter && !source.world.heroes.size)
      source.encounter.clear(source.world); // cancels queued inputs, future shots and owned missiles
    if (source.dungeon?.bossEncounter && !source.world.heroes.size)
      source.emptyBossResetAt =
        this.tick + source.dungeon.bossEncounter.emptyResetTicks;
    hero.x = position.x;
    hero.y = position.y;
    delete hero.moveDestination;
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
