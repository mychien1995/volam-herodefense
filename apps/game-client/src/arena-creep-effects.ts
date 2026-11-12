import Phaser from 'phaser';
import { isBeachZone } from './beach-art.js';
import { isHellZone } from './hell-art.js';
import type { LobbyState } from '@volam/game-protocol';
import { forestCombatEffect } from './m3d-native-art.js';
import { arenaCreepArt, type ArenaCreepManifest } from './arena-creeps.js';
import {
  forestCreepArt,
  isForestZone,
  type ForestCreepManifest,
} from './forest-creeps.js';

/** Authored visual assets only. Positions/lifetimes of projectiles come from server state. */
export class ArenaCreepEffects {
  private contacts = new Set<Phaser.GameObjects.Sprite>();
  private contactOwners = new Map<Phaser.GameObjects.Sprite, string>();
  private ambient = new Map<string, Phaser.GameObjects.Sprite>();
  private shots = new Map<string, Phaser.GameObjects.Sprite>();
  private observed = new Set<string>();
  private played = new Set<string>();
  private completed: string[] = [];
  private repeats = new Map<string, number>();
  private spawned = 0;
  constructor(
    private scene: Phaser.Scene,
    private manifest: ArenaCreepManifest,
    private forest?: ForestCreepManifest,
  ) {
    if (forest)
      this.manifest = {
        assets: manifest.assets,
        effects: [...manifest.effects, ...forest.effects],
      };
  }

  private make(id: string, x: number, y: number) {
    const effect = this.manifest.effects.find((v) => v.id === id);
    if (!effect) throw new Error('Missing creep effect: ' + id);
    const native = forestCombatEffect(this.scene, id);
    const texture = native ?? effect.texture ?? 'arena_creep_impacts';
    const sprite = this.scene.add.sprite(
      Math.round(x),
      Math.round(y),
      texture,
      effect.frames[0]!,
    );
    if (effect.origin) sprite.setOrigin(...effect.origin);
    const observe = () => this.observed.add(`${texture}:${sprite.frame.name}`);
    sprite.on(Phaser.Animations.Events.ANIMATION_START, observe);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, observe);
    if (native) sprite.setScale(0.5);
    sprite.play(native ? 'native:' + id : id);
    sprite.setName(id);
    this.spawned++;
    sprite.on(Phaser.Animations.Events.ANIMATION_REPEAT, () =>
      this.repeats.set(id, (this.repeats.get(id) ?? 0) + 1),
    );
    this.played.add(id);
    return sprite;
  }

  contact(
    id: string,
    x: number,
    y: number,
    ownerId?: string,
  ): Phaser.GameObjects.Sprite {
    const definition = this.manifest.effects.find((v) => v.id === id);
    const sprite = this.make(
      id,
      x + (definition?.offset?.[0] ?? 0),
      y + (definition?.offset?.[1] ?? definition?.offsetY ?? -18),
    ).setDepth(definition?.placement === 'ground' ? y - 1 : y + 0.5);
    this.contacts.add(sprite);
    sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.contacts.delete(sprite);
      this.contactOwners.delete(sprite);
    });
    if (ownerId) this.contactOwners.set(sprite, ownerId);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.completed.push(id);
      if (this.completed.length > 120) this.completed.shift();
      this.contacts.delete(sprite);
      this.contactOwners.delete(sprite);
      sprite.destroy();
    });
    return sprite;
  }

  sync(
    state: LobbyState | undefined,
    zone: string,
    position: (id: string) => { x: number; y: number } | undefined,
  ): void {
    if (
      !state ||
      state.phase === 'DEFEAT' ||
      (zone !== 'arena' &&
        !isForestZone(zone) &&
        !isBeachZone(zone) &&
        !isHellZone(zone))
    ) {
      this.clear();
      return;
    }
    for (const [sprite, id] of this.contactOwners) {
      const owner = state.creeps.get(id);
      if (!owner || owner.hp <= 0 || owner.zoneId !== zone) {
        this.contacts.delete(sprite);
        this.contactOwners.delete(sprite);
        sprite.destroy();
      }
    }
    const active = new Set<string>();
    state.creeps.forEach((actor, id) => {
      const art = arenaCreepArt(
        this.manifest,
        actor.invasionWave,
        actor.zoneId,
      );
      if (
        !art?.ambient ||
        actor.zoneId !== zone ||
        actor.hp <= 0 ||
        actor.pose !== 'walk'
      )
        return;
      active.add(id);
      const point = position(id) ?? actor;
      let sprite = this.ambient.get(id);
      if (!sprite) {
        sprite = this.make(art.ambient, point.x, point.y);
        this.ambient.set(id, sprite);
      }
      sprite
        .setPosition(
          Math.round(point.x - actor.fx * 10),
          Math.round(point.y - actor.fy * 6 - 2),
        )
        .setDepth(point.y - 0.1);
    });
    for (const [id, sprite] of this.ambient)
      if (!active.has(id)) {
        sprite.destroy();
        this.ambient.delete(id);
      }
    const shots = new Set<string>();
    state.projectiles.forEach((projectile, id) => {
      if (projectile.zoneId !== zone) return;
      const owner = state.creeps.get(projectile.ownerId);
      const art =
        owner &&
        (forestCreepArt(this.forest, owner.archetypeId, owner.zoneId) ??
          arenaCreepArt(this.manifest, owner.invasionWave, owner.zoneId));
      if (!art?.projectile) return;
      shots.add(id);
      let sprite = this.shots.get(id);
      if (!sprite) {
        sprite = this.make(art.projectile, projectile.x, projectile.y);
        this.shots.set(id, sprite);
      }
      sprite
        .setPosition(Math.round(projectile.x), Math.round(projectile.y - 16))
        .setRotation(Math.atan2(projectile.vy, projectile.vx))
        .setDepth(projectile.y + 0.2);
    });
    for (const [id, sprite] of this.shots)
      if (!shots.has(id)) {
        sprite.destroy();
        this.shots.delete(id);
      }
  }

  clear(): void {
    for (const sprite of [
      ...this.contacts,
      ...this.ambient.values(),
      ...this.shots.values(),
    ])
      sprite.destroy();
    this.contacts.clear();
    this.contactOwners.clear();
    this.ambient.clear();
    this.shots.clear();
  }

  inspect() {
    const record = ([id, sprite]: [string, Phaser.GameObjects.Sprite]) => ({
      id,
      texture: sprite.texture.key,
      frame: sprite.frame.name,
      x: sprite.x,
      y: sprite.y,
      depth: sprite.depth,
      rotation: sprite.rotation,
    });
    return {
      spawned: this.spawned,
      completed: [...this.completed],
      repeats: Object.fromEntries(this.repeats),
      played: [...this.played],
      observedFrames: [...this.observed],
      contacts: this.contacts.size,
      contactSprites: [...this.contacts].map((sprite) => ({
        texture: sprite.texture.key,
        frame: String(sprite.frame.name),
        x: sprite.x,
        y: sprite.y,
        depth: sprite.depth,
        origin: [sprite.originX, sprite.originY],
      })),
      ambient: [...this.ambient].map(record),
      projectiles: [...this.shots].map(record),
    };
  }
}
