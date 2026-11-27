import { addCreep } from './simulation.js';
import type { Point, Rect, SimulationConfig, World } from './types.js';

export interface InvasionDefinition {
  intervalTicks: number;
  /** Count the interval from stream completion; legacy accelerated fixtures keep start-to-start timing. */
  restAfterStream?: boolean | undefined;
  streamTicks?: number | undefined;
  spawnEveryTicks?: number | undefined;
  portalCount?: 1 | 2 | 3 | 4 | undefined;
  rowsPerGate?: 1 | 2 | undefined;
  maxWaves?: number | undefined;
  warningTicks: number[];
  noticeTicks: number;
  statue: { position: Point; radius: number; maxHp: number; collision: Rect };
  lanes: {
    west: Point;
    east: Point;
    north?: Point | undefined;
    south?: Point | undefined;
  };
  chaseRange: number;
  aggroRestTicks: number;
  countPerAdditionalPlayer: number;
  hpPerAdditionalPlayer: number;
  damagePerAdditionalPlayer: number;
  waves: Array<{
    id: string;
    perLane: number;
    hp: number;
    damage: number;
    speed: number;
  }>;
}
export interface InvasionNotice {
  id: number;
  kind: 'warning' | 'wave' | 'defeat';
  wave: number;
  leadTicks: number;
  atTick: number;
  untilTick: number;
}
/** Pure server-owned schedule. It appends enemies and never clears surviving waves. */
export class InvasionDirector {
  wave = 0;
  nextWaveTick: number;
  spawnPlayerCount = 0;
  defeated = false;
  defeatTick = 0;
  notice: InvasionNotice | undefined;
  events: InvasionNotice[] = [];
  private sequence = 0;
  private streams: Array<{
    wave: number;
    until: number;
    next: number;
    every: number;
    index: number;
    stats: SimulationConfig['creep'];
  }> = [];
  get streaming(): boolean {
    return this.streams.length > 0;
  }
  get streamUntilTick(): number {
    return Math.max(0, ...this.streams.map((s) => s.until));
  }
  constructor(
    readonly definition: InvasionDefinition,
    world: World,
  ) {
    this.nextWaveTick = definition.intervalTicks;
    world.statue = {
      id: 'statue',
      ...definition.statue.position,
      radius: definition.statue.radius,
      collision: definition.statue.collision,
      hp: definition.statue.maxHp,
      maxHp: definition.statue.maxHp,
      fx: 0,
      fy: 1,
      pose: 'idle',
      actionUntil: 0,
      hurtUntil: 0,
      cooldown: 0,
    };
  }
  beforeStep(
    world: World,
    config: SimulationConfig,
    tick: number,
    players: number,
  ): void {
    this.events = [];
    if (this.defeated) return;
    const remaining = this.nextWaveTick - tick;
    if (
      this.wave < (this.definition.maxWaves ?? Infinity) &&
      this.definition.warningTicks.includes(remaining)
    )
      this.publish('warning', this.wave + 1, remaining, tick);
    if (
      tick >= this.nextWaveTick &&
      this.wave < (this.definition.maxWaves ?? Infinity)
    ) {
      this.wave++;
      this.spawnPlayerCount = players;
      const recipe =
        this.definition.waves[
          Math.min(this.wave - 1, this.definition.waves.length - 1)
        ]!;
      const count = Math.ceil(
        recipe.perLane *
          (1 + this.definition.countPerAdditionalPlayer * (players - 1)),
      );
      const stats = {
        ...config.creep,
        hp: Math.round(
          recipe.hp *
            (1 + this.definition.hpPerAdditionalPlayer * (players - 1)),
        ),
        damage: Math.round(
          recipe.damage *
            (1 + this.definition.damagePerAdditionalPlayer * (players - 1)),
        ),
        speed: recipe.speed,
      };
      if (config.campaign) {
        const chapter = Math.min(4, Math.floor((this.wave - 1) / 5));
        stats.hp = Math.round(
          recipe.hp *
            config.campaign.invasionHpMultiplier *
            (1 + config.campaign.creepHpPerPlayer * (players - 1)),
        );
        stats.damage = Math.round(
          recipe.damage *
            config.campaign.invasionDamageMultiplier *
            (1 + config.campaign.damagePerPlayer * (players - 1)),
        );
        const gates = this.definition.portalCount ?? 2;
        const every = Math.max(
          1,
          Math.round(
            ((this.definition.spawnEveryTicks ?? config.tickRate * 2) *
              config.campaign.invasionBaseCount) /
              (config.campaign.invasionBaseCount +
                chapter * config.campaign.invasionChapterCount) /
              (1 + this.definition.countPerAdditionalPlayer * (players - 1)),
          ),
        );
        const total =
          Math.ceil(
            (this.definition.streamTicks ?? config.tickRate * 60) / every,
          ) *
          gates *
          (this.definition.rowsPerGate ?? 1);
        stats.xp = (config.campaign.invasionXp[chapter]! * players) / total;
        stats.gold = (config.campaign.invasionGold[chapter]! * players) / total;
      }
      if (this.definition.streamTicks) {
        const every = Math.max(
          1,
          Math.round(
            ((this.definition.spawnEveryTicks ?? config.tickRate * 2) *
              (config.campaign
                ? config.campaign.invasionBaseCount /
                  (config.campaign.invasionBaseCount +
                    Math.min(3, Math.floor((this.wave - 1) / 5)) *
                      config.campaign.invasionChapterCount)
                : 1)) /
              (1 + this.definition.countPerAdditionalPlayer * (players - 1)),
          ),
        );
        this.streams.push({
          wave: this.wave,
          until: tick + this.definition.streamTicks,
          next: tick,
          every,
          index: 0,
          stats,
        });
        (world.invasionPending ??= new Set()).add(this.wave);
      } else
        for (const lane of this.definition.portalCount === 1
          ? (['east'] as const)
          : (['west', 'east'] as const))
          for (let i = 0; i < count; i++) {
            const start = this.definition.lanes[lane];
            const spawn = {
              x: start.x + (lane === 'west' ? 1 : -1) * Math.floor(i / 3) * 28,
              y: start.y + ((i % 3) - 1) * 24,
            };
            const enemy = addCreep(
              world,
              `invasion_${this.wave}_${lane}_${i}`,
              spawn,
              { ...config, creep: stats },
            );
            enemy.stats = { ...stats };
            enemy.invasion = {
              wave: this.wave,
              lane,
              targetId: '',
              chaseOrigin: { ...spawn },
              reacquireAt: 0,
              chaseRange: this.definition.chaseRange,
              aggroRestTicks: this.definition.aggroRestTicks,
            };
          }
      this.publish('wave', this.wave, 0, tick);
      this.nextWaveTick = this.definition.restAfterStream
        ? tick +
          (this.definition.streamTicks ?? 0) +
          this.definition.intervalTicks
        : this.nextWaveTick + this.definition.intervalTicks;
    }
    const count = this.definition.portalCount ?? 2;
    const lanes =
      count === 1
        ? (['east'] as const)
        : (['west', 'east', 'north', 'south'] as const).slice(0, count);
    for (const stream of this.streams) {
      while (stream.next <= tick && stream.next < stream.until) {
        for (const lane of lanes) {
          for (let row = 0; row < (this.definition.rowsPerGate ?? 1); row++) {
            const start = this.definition.lanes[lane];
            if (!start) throw Error(`Missing invasion gate ${lane}`);
            const offset =
              this.definition.rowsPerGate === 2
                ? row === 0
                  ? -18
                  : 18
                : ((stream.index % 3) - 1) * 20;
            const spawn = {
              x: start.x + (lane === 'north' || lane === 'south' ? offset : 0),
              y: start.y + (lane === 'west' || lane === 'east' ? offset : 0),
            };
            const enemy = addCreep(
              world,
              `invasion_${stream.wave}_${lane}_${stream.index}${row ? '_r2' : ''}`,
              spawn,
              { ...config, creep: stream.stats },
            );
            enemy.stats = { ...stream.stats };
            const archetype = config.creepCombat?.waveIds[stream.wave - 1];
            if (archetype) enemy.archetypeId = archetype;
            enemy.invasion = {
              wave: stream.wave,
              lane,
              approach: {
                x:
                  lane === 'west'
                    ? this.definition.statue.position.x - 285
                    : lane === 'east'
                      ? this.definition.statue.position.x + 285
                      : spawn.x,
                y:
                  lane === 'north'
                    ? this.definition.statue.position.y - 235
                    : lane === 'south'
                      ? this.definition.statue.position.y + 235
                      : spawn.y,
              },
              targetId: '',
              chaseOrigin: { ...spawn },
              reacquireAt: 0,
              chaseRange: this.definition.chaseRange,
              aggroRestTicks: this.definition.aggroRestTicks,
            };
          }
        }
        stream.index++;
        stream.next += stream.every;
      }
      if (tick >= stream.until) world.invasionPending?.delete(stream.wave);
    }
    this.streams = this.streams.filter((s) => tick < s.until);
  }
  afterStep(world: World, tick: number): void {
    if (!this.defeated && world.statue?.hp === 0) {
      this.defeated = true;
      this.defeatTick = tick;
      this.publish('defeat', this.wave, 0, tick);
    }
  }
  private publish(
    kind: InvasionNotice['kind'],
    wave: number,
    leadTicks: number,
    tick: number,
  ): void {
    this.notice = {
      id: ++this.sequence,
      kind,
      wave,
      leadTicks,
      atTick: tick,
      untilTick: tick + this.definition.noticeTicks,
    };
    this.events.push(this.notice);
  }
}
