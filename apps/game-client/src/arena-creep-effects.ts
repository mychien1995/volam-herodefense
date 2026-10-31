import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';
import { arenaCreepArt, type ArenaCreepManifest } from './arena-creeps.js';

/** Authored visual assets only. Positions/lifetimes of projectiles come from server state. */
export class ArenaCreepEffects {
  private contacts = new Set<Phaser.GameObjects.Sprite>();
  private ambient = new Map<string, Phaser.GameObjects.Sprite>();
  private shots = new Map<string, Phaser.GameObjects.Sprite>();
  private observed = new Set<string>();
  private played = new Set<string>();
  constructor(
    private scene: Phaser.Scene,
    private manifest: ArenaCreepManifest,
  ) {}

  private make(id: string, x: number, y: number) {
    const effect = this.manifest.effects.find((v) => v.id === id);
    if (!effect) throw new Error('Missing creep effect: ' + id);
    const texture = effect.texture ?? 'arena_creep_impacts';
    const sprite = this.scene.add.sprite(
      Math.round(x),
      Math.round(y),
      texture,
      effect.frames[0]!,
    );
    const observe = () => this.observed.add(`${texture}:${sprite.frame.name}`);
    sprite.on(Phaser.Animations.Events.ANIMATION_START, observe);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, observe);
    sprite.play(id);
    this.played.add(id);
    return sprite;
  }

  contact(id: string, x: number, y: number): void {
    const definition = this.manifest.effects.find((v) => v.id === id);
    const sprite = this.make(id, x, y + (definition?.offsetY ?? -18)).setDepth(
      y + 0.5,
    );
    this.contacts.add(sprite);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.contacts.delete(sprite);
      sprite.destroy();
    });
  }

  sync(
    state: LobbyState | undefined,
    zone: string,
    position: (id: string) => { x: number; y: number } | undefined,
  ): void {
    if (!state || state.phase === 'DEFEAT' || zone !== 'arena') {
      this.clear();
      return;
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
        owner && arenaCreepArt(this.manifest, owner.invasionWave, owner.zoneId);
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
      played: [...this.played],
      observedFrames: [...this.observed],
      contacts: this.contacts.size,
      ambient: [...this.ambient].map(record),
      projectiles: [...this.shots].map(record),
    };
  }
}
