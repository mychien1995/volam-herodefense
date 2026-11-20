import { DungeonMatch, type CreepDungeonDefinition } from './dungeons.js';
import { addCreep, stepWorld, submitInput } from './simulation.js';
import {
  initializeProgression,
  refreshCharacter,
  changeBuild,
} from './progression.js';
import { experienceAtLevel } from './campaign.js';
import { dashCapacity } from './mobility.js';
import type { Command, Hero, Point, Rect, SimulationConfig } from './types.js';
import type { BuildChange } from './progression-types.js';

export interface PracticeDefinition {
  width: number;
  height: number;
  spawn: Point;
  collision: Rect[];
  targets: Point[];
  targetHp: number;
}
export function validatePracticeDefinition(d: PracticeDefinition): void {
  if (d.targets.length !== 3 || d.targetHp < 2 || !Number.isFinite(d.targetHp))
    throw Error('Invalid practice targets');
  for (const p of [d.spawn, ...d.targets])
    if (
      !Number.isFinite(p.x + p.y) ||
      p.x < 0 ||
      p.y < 0 ||
      p.x > d.width ||
      p.y > d.height
    )
      throw Error('Invalid practice position');
}
/** Private sandbox. Normal casts/hits/statuses run, without Defense or PvP loops. */
export class PracticeMatch extends DungeonMatch {
  readonly targets = new Set<string>();
  constructor(
    base: SimulationConfig,
    dungeon: CreepDungeonDefinition,
    readonly definition: PracticeDefinition,
    seed = 42,
  ) {
    validatePracticeDefinition(definition);
    const c: SimulationConfig = { ...base, creep: { ...base.creep } };
    Object.assign(c, {
      width: definition.width,
      height: definition.height,
      spawn: definition.spawn,
      collision: definition.collision,
      creepSpawns: [],
      creepRespawn: false,
    });
    delete c.campaign;
    delete c.economy;
    delete c.waveArena;
    delete c.creepCombat;
    super(c, dungeon, seed);
    this.arena.world.practiceTargets = this.targets;
    for (const [i, position] of definition.targets.entries()) {
      const dog = addCreep(
        this.arena.world,
        'practice_dog_' + (i + 1),
        position,
        c,
      );
      dog.archetypeId = 'practice_dog';
      dog.controlled = true;
      dog.neverRespawn = true;
      dog.hp = dog.maxHp = definition.targetHp;
      dog.stats = {
        ...c.creep,
        hp: definition.targetHp,
        speed: 0,
        damage: 0,
        detectionRange: 0,
        xp: 0,
        gold: 0,
      };
      this.targets.add(dog.id);
    }
  }
  validChoice(schoolId: string, branchId: string): boolean {
    return (
      !!this.base.progression?.schools[schoolId]?.basicIds.includes(branchId) &&
      !!this.base.progression.fixedBranches?.[branchId]
    );
  }
  addSelected(
    id: string,
    nickname: string,
    schoolId: string,
    branchId: string,
  ): Hero {
    if (this.membership.size || !this.validChoice(schoolId, branchId))
      throw Error('Invalid practice hero or occupied room');
    const h = super.add(id, nickname),
      c = this.arena.config;
    h.schoolId = schoolId;
    h.level = 30;
    h.xp = experienceAtLevel(30, c);
    initializeProgression(h, c, 'fixed', branchId);
    h.skillIds = [...c.progression!.fixedBranches![branchId]!.skillIds];
    h.progression!.ranks = Object.fromEntries(
      h.skillIds.map((s) => [s, c.progression!.skills[s]!.ranks.length]),
    );
    refreshCharacter(h, c);
    h.skillPoints = 0;
    h.gold = 0;
    h.invulnerable = true;
    delete h.inventory;
    delete h.bossItems;
    delete h.bossLoot;
    delete h.dragonBonus;
    this.refill(h);
    return h;
  }
  /** Replace only the private hero; keep connection, world, position and three targets. */
  switchHero(
    id: string,
    sequence: number,
    schoolId: string,
    branchId: string,
  ): string | undefined {
    const previous = this.hero(id);
    if (!previous) return 'Nhân vật không có trong phòng test.';
    if (sequence <= previous.lastSequence) return 'Yêu cầu đã xử lý.';
    if (!this.validChoice(schoolId, branchId))
      return 'Phái và hệ phái không hợp lệ.';
    const { nickname, x, y, fx, fy, autoBasic } = previous;
    super.remove(id);
    const next = this.addSelected(id, nickname, schoolId, branchId);
    Object.assign(next, { x, y, fx, fy, autoBasic, lastSequence: sequence });
    const world = this.arena.world;
    for (const dog of world.creeps.values()) {
      dog.statuses =
        dog.statuses?.filter((status) => status.sourceId !== id) ?? [];
      if (dog.burnSource === id) {
        dog.burnSource = '';
        dog.burnUntil = dog.burnNext = dog.burnDamage = 0;
      }
    }
    world.events = [];
    this.events = [];
  }
  private refill(h: Hero): void {
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    h.cooldown = this.arena.world.tick;
    h.skillCooldowns = h.skillIds!.map(() => 0);
    h.abilityCooldowns = {};
    h.chargeCooldowns = {};
    h.dashCharges = dashCapacity(h, this.arena.config);
    delete h.dashRechargeAt;
  }
  override input(
    id: string,
    sequence: number,
    command: Command,
  ): string | undefined {
    const h = this.hero(id);
    if (!h) return 'Nhân vật không có trong phòng test.';
    if (['dev-loadout', 'select-basic', 'gear-skill'].includes(command.kind))
      return 'Bộ kỹ năng đã khóa theo hệ phái.';
    if (command.kind === 'move-to' && command.zoneId !== 'arena')
      return 'Khu vực không hợp lệ.';
    this.refill(h);
    submitInput(this.arena.world, id, sequence, command);
  }
  override modifyBuild(
    id: string,
    sequence: number,
    revision: number,
    change: BuildChange,
  ): string | undefined {
    const h = this.hero(id);
    if (!h || change.action !== 'stance')
      return 'Kỹ năng trong phòng test đã tối đa.';
    if (sequence <= h.lastSequence) return 'Yêu cầu đã xử lý.';
    h.lastSequence = sequence;
    return changeBuild(
      this.arena.world,
      h,
      this.arena.config,
      revision,
      change,
    );
  }
  override canEnterDungeon(): boolean {
    return false;
  }
  override enterLoiDai(): string | undefined {
    return 'Hãy thoát phòng test để vào Lôi Đài.';
  }
  override step(): void {
    const w = this.arena.world;
    for (const h of w.heroes.values()) this.refill(h);
    stepWorld(w, this.arena.config);
    this.tick = w.tick;
    for (const h of w.heroes.values()) this.refill(h);
    this.events = w.events.map((event) => ({ zoneId: 'arena', event }));
  }
}
