import { DungeonMatch, type CreepDungeonDefinition } from './dungeons.js';
import { addHero, createWorld, stepWorld, submitInput } from './simulation.js';
import {
  changeBuild,
  initializeProgression,
  refreshCharacter,
} from './progression.js';
import { experienceAtLevel } from './campaign.js';
import { dashCapacity } from './mobility.js';
import { hurt } from './combat.js';
import { segmentCircle } from './geometry.js';
import { findNguDocSummon } from './ngu-doc-summons.js';
import { createPvp1v1Config, pvpControlPolicy } from './pvp-balance.js';
import type { BuildChange } from './progression-types.js';
import type { Command, Hero, Point, Rect, SimulationConfig } from './types.js';
import {
  pvpMapIds,
  type PvpDefinition,
  type PvpHazard,
  type PvpKill,
  type PvpMapId,
  type PvpMember,
  type PvpPhase,
  type PvpResult,
  type PvpSnapshot,
  type PvpTeam,
} from './pvp-types.js';

export function validatePvpDefinition(d: PvpDefinition): void {
  for (const key of [
    'countdownTicks',
    'roundTicks',
    'intermissionTicks',
    'resultTicks',
    'historyLimit',
  ] as const)
    if (!Number.isSafeInteger(d[key]) || d[key] <= 0)
      throw Error('Invalid PvP ' + key);
  if (
    d.maxPlayers !== 8 ||
    d.teamCapacity !== 4 ||
    d.wins !== 3 ||
    d.historyLimit !== 30
  )
    throw Error('Invalid canonical PvP room limits');
  if (d.hazards.minimumSafeScale <= 0 || d.hazards.minimumSafeScale > 1)
    throw Error('Invalid safe scale');
  for (const [key, value] of Object.entries(d.hazards))
    if (!Number.isFinite(value) || value <= 0)
      throw Error('Invalid hazard ' + key);
  for (const id of pvpMapIds) {
    const m = d.maps[id];
    if (
      !m ||
      m.id !== id ||
      m.width <= 0 ||
      m.height <= 0 ||
      m.floor.length < 3 ||
      m.spawns.chinh.length !== 4 ||
      m.spawns.ta.length !== 4
    )
      throw Error('Invalid PvP map ' + id);
    for (const p of [...m.floor, ...m.spawns.chinh, ...m.spawns.ta])
      if (
        !Number.isFinite(p.x + p.y) ||
        p.x < 0 ||
        p.y < 0 ||
        p.x > m.width ||
        p.y > m.height
      )
        throw Error('Invalid map point ' + id);
  }
}

/** Scan-line walls share the same painted floor geometry for walking, dashes and shots. */
function walls(width: number, height: number, polygon: Point[]): Rect[] {
  const result: Rect[] = [];
  for (let y = 0; y < height; y += 4) {
    const scan = y + 2;
    const xs: number[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!,
        b = polygon[(i + 1) % polygon.length]!;
      if ((a.y <= scan && b.y > scan) || (b.y <= scan && a.y > scan))
        xs.push(a.x + ((scan - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    xs.sort((a, b) => a - b);
    if (xs.length < 2)
      result.push({ x: 0, y, width, height: Math.min(4, height - y) });
    else
      result.push(
        { x: 0, y, width: xs[0]!, height: 4 },
        { x: xs.at(-1)!, y, width: width - xs.at(-1)!, height: 4 },
      );
  }
  return result;
}

export class StandaloneLoiDai extends DungeonMatch {
  readonly members = new Map<string, PvpMember>();
  hostId = '';
  mapId: PvpMapId = 'hong_moc';
  hazardsEnabled = true;
  phase: PvpPhase = 'lobby';
  until = 0;
  roundUntil = 0;
  roundNumber = 0;
  score = { chinh: 0, ta: 0 };
  result: PvpResult | null = null;
  history: PvpKill[] = [];
  hazards: PvpHazard[] = [];
  closed = false;
  private nextHazard = 1;
  private npcNext = 0;
  private npcBag: Array<'sword' | 'lightning'> = [];
  private seriesNumber = 0;
  private nextKill = 1;
  private roundStarted = 0;
  private readonly hitHazards = new Map<number, Set<string>>();
  private readonly roomSeed: number;
  private readonly sequences = new Map<string, number>();
  private readonly lastInputs = new Map<string, number>();
  constructor(
    base: SimulationConfig,
    dungeon: CreepDungeonDefinition,
    readonly definition: PvpDefinition,
    seed = 42,
  ) {
    validatePvpDefinition(definition);
    const config: SimulationConfig = {
      ...base,
      creepSpawns: [],
      collision: [],
      width: 836,
      height: 470,
    };
    delete config.economy;
    delete config.campaign;
    delete config.waveArena;
    delete config.creepCombat;
    super(config, dungeon, seed);
    this.roomSeed = seed;
    this.configureWorld();
  }
  private configureWorld(): void {
    const m = this.definition.maps[this.mapId];
    this.arena.config = {
      ...this.base,
      width: m.width,
      height: m.height,
      spawn: m.spawns.chinh[0]!,
      collision: walls(m.width, m.height, m.floor),
    };
    this.arena.world.duel = new Set();
    this.arena.world.duelTeams = new Map();
    this.arena.world.duelWalkWalls = this.arena.config.collision;
  }
  join(id: string, nickname: string): string | undefined {
    if (this.closed) return 'Phòng đã đóng.';
    if (this.members.size >= this.definition.maxPlayers) return 'Phòng đã đầy.';
    if (this.members.has(id)) return 'Đã ở trong phòng.';
    this.members.set(id, {
      id,
      nickname,
      schoolId: '',
      branchId: '',
      team: 'spectator',
      ready: false,
    });
    this.membership.set(id, 'arena');
    if (!this.hostId) this.hostId = id;
    return;
  }
  acceptSequence(id: string, sequence: number): boolean {
    if (
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      sequence <= (this.sequences.get(id) ?? 0)
    )
      return false;
    this.sequences.set(id, sequence);
    return true;
  }
  choose(id: string, schoolId: string, branchId: string): string | undefined {
    if (this.phase !== 'lobby')
      return 'Chỉ đổi phái/hệ khi ở màn hình chia phe.';
    const member = this.members.get(id),
      school = this.base.progression?.schools[schoolId];
    if (
      !member ||
      !school?.basicIds.includes(branchId) ||
      !this.base.progression?.fixedBranches?.[branchId]
    )
      return 'Phái hoặc hệ phái không hợp lệ.';
    member.schoolId = schoolId;
    member.branchId = branchId;
    member.ready = true;
    return;
  }
  assign(host: string, id: string, team: PvpTeam): string | undefined {
    if (host !== this.hostId) return 'Chỉ chủ phòng được chia phe.';
    if (this.phase !== 'lobby') return 'Đội hình đã khóa trong ván.';
    const member = this.members.get(id);
    if (!member) return 'Người chơi không còn trong phòng.';
    if (team !== 'spectator' && !member.ready)
      return 'Người chơi chưa chọn phái và hệ phái.';
    if (
      team !== 'spectator' &&
      [...this.members.values()].filter((m) => m.id !== id && m.team === team)
        .length >= 4
    )
      return 'Mỗi phe tối đa 4 người.';
    member.team = team;
    return;
  }
  configure(
    host: string,
    mapId: PvpMapId,
    hazards: boolean,
  ): string | undefined {
    if (host !== this.hostId) return 'Chỉ chủ phòng được cài đặt.';
    if (this.phase !== 'lobby') return 'Chỉ đổi cài đặt ở màn hình chia phe.';
    if (!this.definition.maps[mapId]) return 'Map không hợp lệ.';
    this.mapId = mapId;
    this.hazardsEnabled = hazards;
    this.configureWorld();
    return;
  }
  start(host: string): string | undefined {
    if (host !== this.hostId) return 'Chỉ chủ phòng được bắt đầu.';
    if (this.phase !== 'lobby') return 'Ván đang diễn ra.';
    for (const team of ['chinh', 'ta'] as const)
      if (![...this.members.values()].some((m) => m.team === team && m.ready))
        return 'Mỗi phe cần ít nhất một người sẵn sàng.';
    this.seriesNumber++;
    this.score = { chinh: 0, ta: 0 };
    this.roundNumber = 0;
    this.beginRound();
    return;
  }
  private makeFighter(member: PvpMember, lastSequence = 0): Hero {
    const world = this.arena.world,
      config = this.arena.config;
    const h = addHero(world, member.id, member.nickname, config);
    if (world.pvp1v1)
      h.statusDurationPolicy = pvpControlPolicy(world.pvp1v1, config.tickRate);
    h.schoolId = member.schoolId;
    h.level = 30;
    h.xp = experienceAtLevel(30, config);
    initializeProgression(h, config, 'fixed', member.branchId);
    h.skillIds = [
      ...config.progression!.fixedBranches![member.branchId]!.skillIds,
    ];
    h.progression!.ranks = Object.fromEntries(
      h.skillIds.map((id) => [
        id,
        config.progression!.skills[id]!.ranks.length,
      ]),
    );
    refreshCharacter(h, config, world.tick);
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    h.skillPoints = 0;
    h.gold = 0;
    h.lastSequence = lastSequence;
    h.moveX = h.moveY = 0;
    h.skillCooldowns = h.skillIds.map(() => 0);
    h.abilityCooldowns = {};
    h.chargeCooldowns = {};
    h.dashCharges = dashCapacity(h, config);
    delete h.inventory;
    delete h.dragonBonus;
    delete h.bossItems;
    delete h.bossLoot;
    const peers = [...this.members.values()].filter(
      (m) => m.team === member.team,
    );
    const spawn =
      this.definition.maps[this.mapId].spawns[member.team as 'chinh' | 'ta'][
        peers.findIndex((m) => m.id === member.id)
      ]!;
    h.x = spawn.x;
    h.y = spawn.y;
    h.fx = member.team === 'chinh' ? 1 : -1;
    h.fy = 0;
    return h;
  }
  private clearWorld(): void {
    const world = this.arena.world;
    for (const [id, h] of world.heroes)
      this.lastInputs.set(
        id,
        Math.max(h.lastSequence, this.lastInputs.get(id) ?? 0),
      );
    for (const key of Object.keys(world)) Reflect.deleteProperty(world, key);
    Object.assign(
      world,
      createWorld(
        this.arena.config,
        this.roomSeed +
          Math.max(0, this.seriesNumber - 1) * 65537 +
          this.roundNumber,
      ),
    );
    world.tick = this.tick;
    this.configureWorld();
  }
  private beginRound(): void {
    const world = this.arena.world;
    this.clearWorld();
    const lineup = [...this.members.values()].filter(
      (m) => m.ready && m.team !== 'spectator',
    );
    if (
      this.definition.oneVOne &&
      lineup.filter((m) => m.team === 'chinh').length === 1 &&
      lineup.filter((m) => m.team === 'ta').length === 1
    ) {
      this.arena.config = createPvp1v1Config(
        this.arena.config,
        this.definition.oneVOne,
      );
      world.pvp1v1 = this.arena.config.pvp1v1!;
    }
    const fighters = new Set<string>(),
      teams = new Map<string, string>();
    for (const m of this.members.values())
      if (m.team !== 'spectator' && m.ready) {
        this.makeFighter(m, this.lastInputs.get(m.id) ?? 0);
        fighters.add(m.id);
        teams.set(m.id, m.team);
      }
    world.duel = fighters;
    world.duelTeams = teams;
    this.hazards = [];
    this.hitHazards.clear();
    this.result = null;
    this.phase = 'countdown';
    this.until = this.tick + this.definition.countdownTicks;
    this.roundUntil = 0;
    this.roundNumber++;
    this.npcBag = [];
    this.npcNext = Math.floor(
      Math.min(
        this.definition.hazards.swordInterval,
        this.definition.hazards.lightningInterval,
      ) / 2,
    );
  }
  override input(
    id: string,
    sequence: number,
    command: Command,
  ): string | undefined {
    const h = this.hero(id),
      m = this.members.get(id);
    if (this.phase !== 'fighting')
      return 'Đang chờ hiệp đấu; điều khiển đã khóa.';
    if (!m || m.team === 'spectator' || !h || h.hp <= 0)
      return 'Đang quan chiến.';
    if (['gear-skill', 'select-basic', 'dev-loadout'].includes(command.kind))
      return 'Lôi Đài không dùng vật phẩm hoặc đổi võ học trong ván.';
    if (command.kind === 'move-to' && command.zoneId !== 'arena')
      return 'Khu vực không hợp lệ.';
    submitInput(this.arena.world, id, sequence, command);
    return;
  }
  override modifyBuild(
    id: string,
    sequence: number,
    revision: number,
    change: BuildChange,
  ): string | undefined {
    const h = this.hero(id);
    if (
      change.action !== 'stance' ||
      this.phase !== 'fighting' ||
      !h ||
      h.hp <= 0
    )
      return 'Võ học đã tối đa và khóa trong ván.';
    if (!Number.isSafeInteger(sequence) || sequence <= h.lastSequence)
      return 'Yêu cầu đã xử lý.';
    h.lastSequence = sequence;
    return changeBuild(
      this.arena.world,
      h,
      this.arena.config,
      revision,
      change,
    );
  }
  override remove(id: string): void {
    const member = this.members.get(id);
    if (!member) return;
    if (id === this.hostId) this.closed = true;
    else if (
      member.team !== 'spectator' &&
      ['countdown', 'fighting', 'intermission'].includes(this.phase)
    ) {
      const winner = member.team === 'chinh' ? 'ta' : 'chinh';
      this.score[winner] = this.definition.wins;
      this.finish({ winner, reason: 'disconnect' }, true);
    }
    super.remove(id);
    this.members.delete(id);
    this.sequences.delete(id);
    this.lastInputs.delete(id);
  }
  override disconnect(id: string): void {
    this.remove(id);
  }
  private alive() {
    const counts = { chinh: 0, ta: 0 };
    for (const [id, h] of this.arena.world.heroes) {
      const team = this.members.get(id)?.team;
      if (h.hp > 0 && (team === 'chinh' || team === 'ta')) counts[team]++;
    }
    return counts;
  }
  private finish(result: PvpResult, series = false): void {
    this.result = result;
    if (!series && result.winner !== 'draw') this.score[result.winner]++;
    const done = series || this.score.chinh >= 3 || this.score.ta >= 3;
    this.phase = done ? 'series_over' : 'intermission';
    this.until =
      this.tick +
      (done ? this.definition.resultTicks : this.definition.intermissionTicks);
    this.arena.world.pending = [];
    for (const h of this.arena.world.heroes.values()) {
      h.moveX = h.moveY = 0;
      delete h.moveDestination;
      h.autoBasic = false;
    }
  }
  override step(_nowMs?: number): void {
    if (this.closed) return;
    this.tick++;
    this.arenaTick = this.tick;
    this.nowMs = (this.tick * 1000) / this.base.tickRate;
    const w = this.arena.world;
    w.events = [];
    this.events = [];
    if (this.phase === 'countdown' && this.tick >= this.until) {
      this.phase = 'fighting';
      this.roundStarted = this.tick;
      this.roundUntil = this.tick + this.definition.roundTicks;
    } else if (this.phase === 'intermission' && this.tick >= this.until)
      this.beginRound();
    else if (this.phase === 'series_over' && this.tick >= this.until) {
      this.phase = 'lobby';
      this.result = null;
      this.hazards = [];
      this.hitHazards.clear();
      this.clearWorld();
    }
    if (this.phase === 'fighting') {
      stepWorld(w, this.arena.config);
      // Room time is authoritative, including countdown and intermission.
      w.tick = this.tick;
      if (this.hazardsEnabled) this.stepHazards();
      for (const e of w.events)
        if (e.kind === 'death' && this.members.has(e.targetId)) {
          const owner = findNguDocSummon(w, e.sourceId)?.ownerId ?? e.sourceId;
          const source = this.members.get(owner),
            target = this.members.get(e.targetId)!;
          const environment = !source;
          this.history.push({
            id: this.nextKill++,
            tick: this.tick,
            sourceId: environment ? 'environment' : owner,
            targetId: e.targetId,
            killer: source?.nickname ?? 'Môi trường',
            victim: target.nickname,
            environment,
          });
          if (this.history.length > 30) this.history.shift();
        }
      const alive = this.alive();
      if (!alive.chinh || !alive.ta)
        this.finish({
          winner:
            !alive.chinh && !alive.ta ? 'draw' : alive.chinh ? 'chinh' : 'ta',
          reason: 'elimination',
        });
      else if (this.tick >= this.roundUntil)
        this.finish({ winner: 'draw', reason: 'timeout' });
      this.events = w.events.map((event) => ({ zoneId: 'arena', event }));
    } else w.tick = this.tick;
  }
  private damage(
    id: string,
    fraction: number,
    abilityId: string,
    periodic = false,
  ): void {
    const h = this.hero(id);
    if (h && h.hp > 0)
      hurt(
        this.arena.world,
        h,
        'pvp_environment',
        abilityId,
        h.maxHp * fraction,
        this.arena.config,
        { critChance: 0, critMultiplier: 1, directHp: true, periodic },
      );
  }
  private newHazard(h: Omit<PvpHazard, 'id'>): void {
    this.hazards.push({ id: this.nextHazard++, ...h });
  }
  private stepHazards(): void {
    const w = this.arena.world,
      m = this.definition.maps[this.mapId],
      d = this.definition.hazards;
    const elapsed = this.tick - this.roundStarted;
    if (
      (this.mapId === 'rung_truc' && elapsed % d.dartInterval === 0) ||
      (this.mapId === 'tuong_duong' && elapsed % d.arrowInterval === 0)
    ) {
      const horizontal = w.random() < 0.5,
        edge = w.random() < 0.5;
      const x = horizontal
        ? edge
          ? 65
          : m.width - 65
        : 90 + w.random() * (m.width - 180);
      const y = horizontal
        ? 160 + w.random() * (m.height - 300)
        : edge
          ? 100
          : m.height - 70;
      const tx = m.width * (0.25 + w.random() * 0.5),
        ty = m.height * (0.35 + w.random() * 0.4);
      const length = Math.hypot(tx - x, ty - y) || 1;
      this.newHazard({
        kind: this.mapId === 'rung_truc' ? 'dart' : 'arrow',
        x,
        y,
        vx: (((tx - x) / length) * d.projectileSpeed) / this.base.tickRate,
        vy: (((ty - y) / length) * d.projectileSpeed) / this.base.tickRate,
        radius: 10,
        armedAt: this.tick,
        until: this.tick + this.base.tickRate * 4,
        nx: 0,
        ny: 0,
      });
    }
    if (this.mapId === 'kiem_ho' && elapsed >= this.npcNext) {
      // Shuffle each pair so both skills appear, in a seeded random order.
      if (!this.npcBag.length)
        this.npcBag =
          w.random() < 0.5 ? ['sword', 'lightning'] : ['lightning', 'sword'];
      const skill = this.npcBag.pop()!;
      this.npcNext =
        elapsed + (skill === 'sword' ? d.swordInterval : d.lightningInterval);
      if (skill === 'sword') {
        const a = (Math.floor(w.random() * 4) * Math.PI) / 2;
        this.newHazard({
          kind: 'sword',
          x: m.width / 2,
          y: m.height / 2,
          vx: 0,
          vy: 0,
          radius: m.width,
          armedAt: this.tick + d.warningTicks,
          until: this.tick + d.warningTicks + 12,
          nx: Math.cos(a),
          ny: Math.sin(a),
        });
      } else
        for (let i = 0; i < 6; i++)
          this.newHazard({
            kind: 'lightning',
            x: m.width * (0.23 + w.random() * 0.54),
            y: m.height * (0.28 + w.random() * 0.48),
            vx: 0,
            vy: 0,
            radius: 40,
            armedAt: this.tick + d.warningTicks,
            until: this.tick + d.warningTicks + 12,
            nx: 0,
            ny: 0,
          });
    }
    for (const h of this.hazards) {
      const from = { x: h.x, y: h.y };
      h.x += h.vx;
      h.y += h.vy;
      if (this.tick < h.armedAt) continue;
      let hit = this.hitHazards.get(h.id);
      if (!hit) {
        hit = new Set();
        this.hitHazards.set(h.id, hit);
      }
      for (const [id, hero] of w.heroes) {
        if (hero.hp <= 0 || hit.has(id)) continue;
        const touches =
          h.kind === 'sword'
            ? (hero.x - h.x) * h.nx + (hero.y - h.y) * h.ny >= 0
            : h.kind === 'lightning'
              ? Math.hypot(hero.x - h.x, hero.y - h.y) <= h.radius
              : segmentCircle(
                  from,
                  h,
                  hero,
                  this.arena.config.radius + h.radius,
                ) !== undefined;
        if (touches) {
          hit.add(id);
          this.damage(
            id,
            h.kind === 'dart'
              ? d.dartFraction
              : h.kind === 'arrow'
                ? d.arrowFraction
                : h.kind === 'sword'
                  ? d.swordFraction
                  : d.lightningFraction,
            'pvp_' + h.kind,
          );
          if (h.kind === 'dart' || h.kind === 'arrow') {
            h.until = this.tick;
            break;
          }
        }
      }
    }
    this.hazards = this.hazards.filter((h) => h.until > this.tick);
    for (const id of this.hitHazards.keys())
      if (!this.hazards.some((h) => h.id === id)) this.hitHazards.delete(id);
    if (this.mapId === 'dia_nguc') {
      const safe = this.safe()!;
      for (const [id, h] of w.heroes)
        if (
          ((h.x - safe.x) / safe.rx) ** 2 + ((h.y - safe.y) / safe.ry) ** 2 >
          1
        )
          this.damage(
            id,
            d.lavaFractionPerSecond / this.base.tickRate,
            'pvp_lava',
            true,
          );
    }
  }
  private safe(): PvpSnapshot['safe'] {
    if (this.mapId !== 'dia_nguc') return null;
    const d = this.definition.hazards,
      m = this.definition.maps[this.mapId];
    const elapsed =
      this.phase === 'lobby' || this.phase === 'countdown'
        ? 0
        : Math.max(0, this.tick - this.roundStarted);
    const scale = this.hazardsEnabled
      ? Math.max(d.minimumSafeScale, 1 - elapsed / d.shrinkTicks)
      : 1;
    return {
      x: m.width / 2,
      y: m.height / 2,
      rx: m.width * 0.42 * scale,
      ry: m.height * 0.39 * scale,
    };
  }
  snapshot(): PvpSnapshot {
    return {
      combatProfile: this.arena.world.pvp1v1 ? 'pvp_1v1' : 'standard',
      mapId: this.mapId,
      hazardsEnabled: this.hazardsEnabled,
      phase: this.phase,
      tick: this.tick,
      until: this.until,
      roundUntil: this.roundUntil,
      roundNumber: this.roundNumber,
      score: { ...this.score },
      alive: this.alive(),
      hostId: this.hostId,
      members: [...this.members.values()].map((m) => ({ ...m })),
      hazards: this.hazards.map((h) => ({ ...h })),
      history: this.history.map((h) => ({ ...h })),
      result: this.result ? { ...this.result } : null,
      safe: this.safe(),
    };
  }
}
