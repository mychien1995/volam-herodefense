import Phaser from 'phaser';
import { arena } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import type { CombatEvent } from '@volam/game-core';
import { facing, preloadArt, registerArt } from './art.js';
interface EntityView {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  bar: Phaser.GameObjects.Graphics;
}
export class ArenaScene extends Phaser.Scene {
  onNpc: (menu: 'merchant' | 'dungeons' | 'pvp') => void = () => {};
  private snapshot: LobbyState | undefined;
  private sessionId = '';
  private actors = new Map<string, EntityView>();
  private shots = new Map<string, Phaser.GameObjects.Sprite>();
  private trees: Phaser.GameObjects.Image[] = [];
  private ready = false;
  private followed = '';
  private lastEvent = 0;
  constructor() {
    super('Arena');
  }
  preload(): void {
    preloadArt(this);
  }
  create(): void {
    registerArt(this);
    const map = this.make.tilemap({ key: 'arena' });
    const tiles = map.addTilesetImage('terrain', 'terrain', 32, 32, 0, 0);
    if (!tiles) throw new Error('Missing terrain tileset.');
    map.createLayer('ground', tiles)?.setDepth(-10000);
    this.add.image(800, 680, 'courtyard_seal').setDepth(-9000).setAlpha(0.45);
    // Decorative presentation only: retain M1 server collision/spawn geometry.
    this.add.image(800, 576, 'statue_study').setOrigin(0.5, 1).setDepth(576);
    for (const [x, y] of [
      [720, 600],
      [882, 600],
      [720, 798],
      [882, 798],
    ] as const)
      this.add.image(x, y, 'lantern').setOrigin(0.5, 1).setDepth(y);
    for (const [x, y] of [
      [520, 560],
      [535, 810],
      [1090, 840],
      [1170, 600],
      [620, 470],
      [1000, 440],
    ] as const)
      this.add.image(x, y, 'bamboo').setOrigin(0.5, 1).setDepth(y);
    this.npc(560, 710, 'merchant_stall', 'Thương Gia', 'merchant');
    this.npc(1040, 620, 'dungeon_gate', 'Phó Bản', 'dungeons');
    this.add
      .text(800, 585, 'Statue · inactive', {
        fontFamily: 'Georgia',
        fontSize: '9px',
        color: '#ead8ad',
        backgroundColor: '#293f31',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setDepth(586);
    for (const tree of arena.scenery)
      this.trees.push(
        this.add
          .image(tree.x, tree.y, 'tree')
          .setOrigin(0.5, 1)
          .setDepth(tree.y),
      );
    for (const wall of arena.collision.filter((item) => item.width > 100)) {
      this.add
        .tileSprite(
          wall.x + wall.width / 2,
          wall.y + wall.height / 2,
          wall.width,
          wall.height,
          'terrain',
          2,
        )
        .setDepth(wall.y + wall.height);
      this.add
        .rectangle(
          wall.x + wall.width / 2,
          wall.y + wall.height,
          wall.width,
          6,
          0x626957,
        )
        .setDepth(wall.y + wall.height + 1);
    }
    this.cameras.main
      .setBounds(0, 0, arena.width, arena.height)
      .setZoom(1)
      .setRotation(0);
    this.cameras.main.roundPixels = true;
    this.cameras.main.centerOn(arena.spawn.x, arena.spawn.y);
    this.ready = true;
    document.querySelector('#scene-status')?.setAttribute('data-ready', 'true');
  }
  private npc(
    x: number,
    y: number,
    texture: string,
    label: string,
    menu: 'merchant' | 'dungeons',
  ): void {
    const open = (pointer: Phaser.Input.Pointer): void => {
      // Phaser listens at the document level: DOM HUD clicks must not reach NPCs.
      if (pointer.event.target instanceof HTMLCanvasElement) this.onNpc(menu);
    };
    this.add
      .image(x, y, texture)
      .setOrigin(0.5, 1)
      .setDepth(y)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', open);
    this.add
      .text(x, y + 3, label + ' · Preview', {
        fontFamily: 'Georgia',
        fontSize: '10px',
        color: '#f3dc9d',
        backgroundColor: '#20372b',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setDepth(y + 0.3)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', open);
  }
  setSnapshot(snapshot: LobbyState | undefined, sessionId = ''): void {
    if (this.sessionId !== sessionId) this.lastEvent = 0;
    this.snapshot = snapshot;
    this.sessionId = sessionId;
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
      .setOrigin(0.5, 1);
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
      const key = `${enemy ? 'creep_outlaw' : 'hero_cai_bang'}:${actor.pose}:${facing(actor.fx, actor.fy)}`;
      if (view.sprite.anims.currentAnim?.key !== key) view.sprite.play(key);
      view.label
        .setText(name)
        .setPosition(view.sprite.x, view.sprite.y + 5)
        .setDepth(view.sprite.y + 0.2);
      view.shadow.setPosition(view.sprite.x, view.sprite.y - 3);
      view.bar.clear().setDepth(view.sprite.y + 0.1);
      view.bar
        .fillStyle(0x293c37)
        .fillRect(view.sprite.x - 14, view.sprite.y - 43, 28, 3);
      view.bar
        .fillStyle(enemy ? 0xcc6e55 : 0x92c589)
        .fillRect(
          view.sprite.x - 14,
          view.sprite.y - 43,
          Math.round((28 * actor.hp) / actor.maxHp),
          3,
        );
      if (id === this.sessionId && this.followed !== id) {
        this.cameras.main.startFollow(view.sprite, true, 1, 1, 0, 48);
        this.followed = id;
      }
    };
    state?.players?.forEach((hero, id) =>
      render(id, hero, false, hero.nickname),
    );
    state?.creeps?.forEach((enemy, id) => render(id, enemy, true, 'Sơn tặc'));
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
      const text = this.add
        .text(
          Math.round(event.x),
          Math.round(event.y - 50),
          `${event.critical ? '✦' : ''}${event.damage}`,
          {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: event.critical ? '#ffe58a' : '#fff0d0',
            stroke: '#393b36',
            strokeThickness: 2,
          },
        )
        .setDepth(5000);
      this.tweens.add({
        targets: text,
        y: text.y - 18,
        alpha: 0,
        duration: 650,
        onComplete: () => text.destroy(),
      });
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
      })),
      trees: this.trees.map((tree) => ({
        x: tree.x,
        y: tree.y,
        depth: tree.depth,
      })),
      animations: this.anims.getAnimsFromTexture('hero_cai_bang'),
    };
  }
}
