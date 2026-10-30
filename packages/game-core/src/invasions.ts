import { addCreep } from './simulation.js';
import type { Point, Rect, SimulationConfig, World } from './types.js';

export interface InvasionDefinition {
  intervalTicks: number;
  warningTicks: number[];
  noticeTicks: number;
  statue: { position: Point; radius: number; maxHp: number; collision: Rect };
  lanes: { west: Point; east: Point };
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
  constructor(
    readonly definition: InvasionDefinition,
    world: World,
  ) {
    this.nextWaveTick = definition.intervalTicks;
    world.statue = {
      id: 'statue',
      ...definition.statue.position,
      radius: definition.statue.radius,
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
    if (this.definition.warningTicks.includes(remaining))
      this.publish('warning', this.wave + 1, remaining, tick);
    if (tick >= this.nextWaveTick) {
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
      for (const lane of ['west', 'east'] as const)
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
      this.nextWaveTick += this.definition.intervalTicks;
    }
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
