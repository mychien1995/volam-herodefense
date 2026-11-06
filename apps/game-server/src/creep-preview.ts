import {
  addCreep,
  stepCreepHazards,
  type DungeonMatch,
} from '@volam/game-core';
import { creepCombatDefinition, creepProfiles } from '@volam/game-data';
import type {
  CreepPreviewAction,
  CreepPreviewView,
} from '@volam/game-protocol';

/** Isolated development room. All attacks still run through the real simulation. */
export class CreepPreviewSession {
  readonly view: CreepPreviewView = {
    id: 'wave_02',
    basicOnly: false,
    stationary: false,
    autoHeal: true,
  };
  private sequence = 0;
  private spawned = false;
  private heroes = new Set<string>();
  constructor(private match: DungeonMatch) {
    match.invasion!.nextWaveTick = Number.MAX_SAFE_INTEGER;
    match.arena.config.creepRespawn = false;
    match.arena.world.creeps.clear();
  }
  action(input: CreepPreviewAction): string | undefined {
    if (input.sequence <= this.sequence) return;
    this.sequence = input.sequence;
    if (input.action === 'select') {
      if (!creepProfiles[input.id]) return 'Loại creep không hợp lệ.';
      this.view.id = input.id;
      this.reset();
    } else if (input.action === 'reset') this.reset();
    else if (input.action === 'options') {
      Object.assign(this.view, {
        basicOnly: input.basicOnly,
        stationary: input.stationary,
        autoHeal: input.autoHeal,
      });
      this.reset();
    } else if (input.action === 'heal') {
      for (const h of this.match.arena.world.heroes.values()) {
        h.hp = h.maxHp;
        h.mana = h.maxMana;
        h.statuses = [];
      }
    } else {
      const w = this.match.arena.world,
        e = [...w.creeps.values()][0];
      if (!e || e.hp <= 0) return 'Hãy tạo lại creep trước.';
      if (input.action === 'special') {
        if (this.view.basicOnly || !creepProfiles[this.view.id]!.special)
          return 'Creep này không có skill đang bật.';
        stepCreepHazards(w, this.match.arena.config);
        w.creepCombat!.actors.get(e.id)!.nextSpecial = w.tick;
      } else {
        if (!creepProfiles[this.view.id]!.death)
          return 'Creep này không có hiệu ứng khi chết.';
        e.hp = 0;
        e.respawnAt = w.tick + 90;
      }
    }
  }
  beforeStep(): void {
    if (
      this.match.arena.world.heroes.size &&
      (!this.spawned ||
        [...this.match.arena.world.heroes.keys()].some(
          (id) => !this.heroes.has(id),
        ))
    )
      this.reset();
    if (this.view.autoHeal)
      for (const h of this.match.arena.world.heroes.values()) {
        // Refill instead of invulnerability: real hits must still apply slow/root/stun.
        h.hp = h.maxHp;
        h.mana = h.maxMana;
      }
  }
  reset(): void {
    const { world: w, config: c } = this.match.arena;
    w.creeps.clear();
    w.projectiles.clear();
    w.shots = [];
    w.pending = [];
    w.actions = [];
    w.areas = [];
    w.supports = [];
    w.combos = [];
    w.creepCombat = { actors: new Map(), effects: new Map() };
    w.events = [];
    c.creepCombat = structuredClone(creepCombatDefinition);
    if (this.view.basicOnly)
      delete c.creepCombat.profiles[this.view.id]!.special;
    let index = 0;
    for (const h of w.heroes.values()) {
      this.heroes.add(h.id);
      delete h.comboFinisher;
      h.basicChains = {};
      Object.assign(h, {
        x: 840 + index++ * 28,
        y: 740,
        fx: -1,
        fy: 0,
        hp: 10000,
        maxHp: 10000,
        mana: h.maxMana,
        invulnerable: false,
        statuses: [],
        moveX: 0,
        moveY: 0,
      });
      this.match.respawns.delete(h.id);
    }
    const e = addCreep(
      w,
      `creep_preview_${this.view.id}`,
      { x: 740, y: 740 },
      c,
    );
    e.archetypeId = this.view.id;
    e.neverRespawn = true;
    e.stats = {
      ...c.creep,
      speed: this.view.stationary ? 0 : c.creep.speed,
      damage: 20,
      detectionRange: 1000,
      xp: 0,
      gold: 0,
    };
    e.hp = e.maxHp = 10000;
    stepCreepHazards(w, c);
    w.creepCombat!.actors.get(e.id)!.nextSpecial = w.tick + 30;
    this.spawned = true;
  }
}
