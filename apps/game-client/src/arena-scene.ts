import Phaser from 'phaser';
import { arena, creepDungeon } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import type { CombatEvent } from '@volam/game-core';
import { createArenaArt } from './arena-art01.js';
import { FloatingDamage } from './floating-damage.js';
import { createCreepDungeonArt } from './dungeon-presentation.js';
import {
  actorFootPivot,
  facing,
  heroTexture,
  preloadArt,
  registerArt,
} from './art.js';
interface EntityView {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  bar: Phaser.GameObjects.Graphics;
}
export class ArenaScene extends Phaser.Scene {
  onNpc: (menu: 'merchant' | 'pvp') => void = () => {};
  onDungeonExit: () => void = () => {};
  private zoneId = 'arena';
  private snapshot: LobbyState | undefined;
  private sessionId = '';
  private actors = new Map<string, EntityView>();
  private shots = new Map<string, Phaser.GameObjects.Sprite>();
  private trees: Phaser.GameObjects.Image[] = [];
  private ready = false;
  private followed = '';
  private lastEvent = 0;
  private damage: FloatingDamage | undefined;
  constructor() {
    super('Arena');
  }
  preload(): void {
    preloadArt(this);
  }
  create(): void {
    registerArt(this);
    this.damage = new FloatingDamage(this);
    this.drawZone('arena');
    this.cameras.main
      .setBounds(0, 0, arena.width, arena.height)
      .setZoom(1)
      .setRotation(0);
    this.cameras.main.roundPixels = true;
    this.cameras.main.centerOn(arena.spawn.x, arena.spawn.y);
    this.ready = true;
    document.querySelector('#scene-status')?.setAttribute('data-ready', 'true');
  }
  setSnapshot(snapshot: LobbyState | undefined, sessionId = ''): void {
    if (this.sessionId !== sessionId) this.lastEvent = 0;
    this.snapshot = snapshot;
    this.sessionId = sessionId;
    const zoneId = snapshot?.players.get(sessionId)?.zoneId ?? 'arena';
    if (this.ready && zoneId !== this.zoneId) this.drawZone(zoneId);
  }
  private drawZone(zoneId: string): void {
    this.cameras.main.stopFollow();
    this.tweens.killAll();
    this.damage?.clear();
    this.time.removeAllEvents();
    for (const object of [...this.children.list]) object.destroy();
    this.actors.clear();
    this.shots.clear();
    this.followed = '';
    this.zoneId = zoneId;
    if (zoneId === 'arena') {
      this.trees = createArenaArt(this);
      this.cameras.main
        .setBounds(0, 0, arena.width, arena.height)
        .centerOn(arena.spawn.x, arena.spawn.y);
    } else {
      this.trees = createCreepDungeonArt(this, () => this.onDungeonExit());
      this.cameras.main
        .setBounds(0, 0, creepDungeon.width, creepDungeon.height)
        .centerOn(creepDungeon.spawn.x, creepDungeon.spawn.y);
    }
  }
  private createActor(
    id: string,
    x: number,
    y: number,
    enemy: boolean,
  ): EntityView {
    const shadow = this.add
      .ellipse(x, y - 3, 22, 8, 0x233e34, 0.35)
      .setDepth(-5);
    const sprite = this.add
      .sprite(x, y, enemy ? 'creep_outlaw' : 'hero_cai_bang', 'idle_down_0')
      .setOrigin(
        ...actorFootPivot(this, enemy ? 'creep_outlaw' : 'hero_cai_bang'),
      );
    const label = this.add
      .text(x, y + 5, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: enemy ? '#ffce9f' : '#f5e8b9',
        backgroundColor: '#283e3c',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 0);
    const view = { sprite, label, shadow, bar: this.add.graphics() };
    this.actors.set(id, view);
    return view;
  }
  override update(_time: number, delta: number): void {
    if (!this.ready) return;
    const state = this.snapshot;
    const active = new Set<string>();
    const render = (
      id: string,
      actor: {
        x: number;
        y: number;
        fx: number;
        fy: number;
        hp: number;
        maxHp: number;
        pose: string;
        basicId?: string;
      },
      enemy: boolean,
      name: string,
    ): void => {
      active.add(id);
      const view =
        this.actors.get(id) ?? this.createActor(id, actor.x, actor.y, enemy);
      const weight = Math.min(1, delta / 45);
      view.sprite
        .setPosition(
          Math.round(Phaser.Math.Linear(view.sprite.x, actor.x, weight)),
          Math.round(Phaser.Math.Linear(view.sprite.y, actor.y, weight)),
        )
        .setDepth(view.sprite.y);
      const texture = enemy ? 'creep_outlaw' : heroTexture(actor.basicId);
      if (view.sprite.texture.key !== texture)
        view.sprite
          .setTexture(texture, 'idle_down_0')
          .setOrigin(...actorFootPivot(this, texture));
      const key = `${texture}:${actor.pose}:${facing(actor.fx, actor.fy)}`;
      if (view.sprite.anims.currentAnim?.key !== key) view.sprite.play(key);
      view.label
        .setText(name)
        .setPosition(view.sprite.x, view.sprite.y + 5)
        .setDepth(view.sprite.y + 0.2);
      view.shadow.setPosition(view.sprite.x, view.sprite.y - 3);
      view.bar.clear().setDepth(view.sprite.y + 0.1);
      view.bar
        .fillStyle(0x293c37)
        .fillRect(view.sprite.x - 14, view.sprite.y - (enemy ? 43 : 48), 28, 3);
      view.bar
        .fillStyle(enemy ? 0xcc6e55 : 0x92c589)
        .fillRect(
          view.sprite.x - 14,
          view.sprite.y - (enemy ? 43 : 48),
          Math.round((28 * actor.hp) / actor.maxHp),
          3,
        );
      if (id === this.sessionId && this.followed !== id) {
        this.cameras.main.startFollow(view.sprite, true, 1, 1, 0, 48);
        this.followed = id;
      }
    };
    state?.players?.forEach((hero, id) => {
      if (hero.confirmed && hero.zoneId === this.zoneId)
        render(id, hero, false, hero.nickname);
    });
    state?.creeps?.forEach((enemy, id) => {
      if (enemy.zoneId === this.zoneId) render(id, enemy, true, 'Sơn tặc');
    });
    for (const [id, view] of this.actors)
      if (!active.has(id)) {
        view.sprite.destroy();
        view.label.destroy();
        view.shadow.destroy();
        view.bar.destroy();
        this.actors.delete(id);
        if (id === this.followed) {
          this.cameras.main.stopFollow();
          this.followed = '';
        }
      }
    const shotIds = new Set<string>();
    state?.projectiles?.forEach((shot, id) => {
      if (shot.zoneId !== this.zoneId) return;
      shotIds.add(id);
      let sprite = this.shots.get(id);
      if (!sprite) {
        sprite = this.add.sprite(shot.x, shot.y - 18, 'fire').play('fire_orb');
        this.shots.set(id, sprite);
      }
      sprite
        .setPosition(Math.round(shot.x), Math.round(shot.y - 18))
        .setDepth(shot.y + 0.3)
        .setFlipX(shot.vx < 0);
    });
    for (const [id, sprite] of this.shots)
      if (!shotIds.has(id)) {
        sprite.destroy();
        this.shots.delete(id);
      }
  }
  combat(event: CombatEvent): void {
    if (!this.ready || event.id <= this.lastEvent) return;
    this.lastEvent = event.id;
    if (event.kind === 'hit') {
      const effect = this.add
        .sprite(Math.round(event.x), Math.round(event.y - 18), 'fire')
        .setDepth(event.y + 0.5)
        .play('fire_impact');
      if (event.abilityId === 'cuong_long_loan_vu') effect.setScale(2);
      effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
        effect.destroy(),
      );
      this.damage?.hit(
        event,
        !!this.snapshot?.players.has(event.targetId),
        event.targetId === 'statue' ? 160 : undefined,
      );
      if (event.targetId === 'statue') {
        const statue = this.children.getByName(
          'art01:statue_male',
        ) as Phaser.GameObjects.Image | null;
        statue?.setTint(0xffd083);
        this.time.delayedCall(140, () => statue?.clearTint());
      }
    }
    if (event.kind === 'attack' && event.abilityId === 'cai_bang_bong') {
      const hero = this.snapshot?.players.get(event.sourceId);
      if (hero) {
        const arc = this.add.graphics().setDepth(event.y + 0.4);
        const angle = Math.atan2(hero.fy, hero.fx);
        arc
          .lineStyle(2, 0xf1d39b, 0.8)
          .beginPath()
          .arc(event.x, event.y - 16, 35, angle - 1, angle + 1)
          .strokePath();
        this.time.delayedCall(160, () => arc.destroy());
      }
    }
  }
  inspect() {
    const origin = this.cameras.main.getWorldPoint(0, 0);
    const unit = this.cameras.main.getWorldPoint(1, 0);
    return {
      ready: this.ready,
      zoneId: this.zoneId,
      damage: this.damage?.inspect(),
      interactions: this.children.list
        .filter((o) => o.name === 'dungeon-exit')
        .map((o) => {
          const image = o as Phaser.GameObjects.Image;
          return { id: image.name, x: image.x, y: image.y };
        }),
      rotation: Math.atan2(unit.y - origin.y, unit.x - origin.x),
      zoom: this.cameras.main.zoom,
      roundPixels: this.cameras.main.roundPixels,
      camera: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
      actors: [...this.actors].map(([id, view]) => ({
        id,
        x: view.sprite.x,
        y: view.sprite.y,
        depth: view.sprite.depth,
        animation: view.sprite.anims.currentAnim?.key,
        frame: view.sprite.frame.name,
        texture: view.sprite.texture.key,
      })),
      trees: this.trees.map((tree) => ({
        x: tree.x,
        y: tree.y,
        depth: tree.depth,
      })),
      animations: this.anims.getAnimsFromTexture('hero_cai_bang'),
      art01: {
        textures: [
          'arena_ground_art01',
          'arena_world_art01',
          'arena_garden_art01',
          'arena_ambient_art01',
        ].map((key) => ({
          key,
          exists: this.textures.exists(key),
          frames: this.textures.get(key).getFrameNames(),
        })),
        objects: this.children.list
          .filter((object) => object.name.startsWith('art01:'))
          .map((object) => {
            const view = object as Phaser.GameObjects.Sprite;
            return {
              name: view.name,
              x: view.x,
              y: view.y,
              depth: view.depth,
              frame: view.frame?.name,
              animation: view.anims?.currentAnim?.key,
            };
          }),
        statueCollision: this.snapshot?.defense.enabled
          ? 'Authoritative pedestal footprint: x760,y548,w80,h28'
          : 'M1 marker only; no authoritative solid statue collider',
      },
    };
  }
}
